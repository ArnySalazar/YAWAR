"""Contrato de atención humana, sin tráfico a WhatsApp ni al clasificador."""
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, inspect, select

from tests.test_flujo import LUNES, SEM, _decisor_fijo, s, texto  # noqa: F401
from api import servicios
from api.db import AtencionAlarma, Registro, crear_motor


def activar(sesion, monkeypatch):
    monkeypatch.setattr(servicios, "decidir", _decisor_fijo(True))
    servicios.procesar_entrante(sesion, texto("51000000003", "mensaje sintético de peligro"), LUNES)
    return sesion.scalar(select(Registro).where(Registro.id_nino == "N0003", Registro.semana == SEM))


@pytest.mark.parametrize("medio", ["llamada", "visita_presencial"])
def test_atender_preserva_historia_cierra_pendiente_y_es_idempotente(s, monkeypatch, medio):
    reg = activar(s, monkeypatch)
    antes = servicios.generar_lista(s, "EESS01", 1, LUNES)
    accion = reg.accion
    assert antes[0]["alarmas_pendientes"][0]["version_alarma"] == 1
    assert servicios.indicadores(s, "EESS01", SEM)["alarmas_pendientes"] == 1
    atencion = servicios.atender_alarma(s, "N0003", reg.id, 1, medio, LUNES)
    repetida = servicios.atender_alarma(s, "N0003", reg.id, 1, medio, LUNES + timedelta(minutes=1))
    assert atencion == repetida
    assert s.scalar(select(func.count()).select_from(AtencionAlarma)) == 1
    assert reg.alarma and reg.accion == accion
    leida = servicios.generar_lista(s, "EESS01", 0, LUNES, guardar=False)
    assert next(f for f in leida if f["id_nino"] == "N0003")["accion"] == accion
    assert reg.accion == accion
    ind = servicios.indicadores(s, "EESS01", SEM)
    assert ind["alarmas_pendientes"] == 0
    assert ind["serie"][-1]["alarmas"] == 1
    assert ind["serie"][-1]["alarmas_atendidas"] == 1
    fila = next(f for f in servicios.generar_lista(s, "EESS01", 1, LUNES) if f["id_nino"] == "N0003")
    assert fila["alarmas_pendientes"] == []
    assert not (fila["seguimiento"] or "").startswith(("POSIBLE SEÑAL", "mensaje para leer"))
    assert fila["atenciones_alarma"][0]["medio"] == medio
    historia = servicios.historial_nino(s, "N0003")[0]
    assert historia["alarma"] and not historia["alarma_pendiente"]
    assert historia["atenciones"][0]["detalle_alarma"] == "mensaje sintético de peligro"


def test_nuevo_mensaje_reabre_sin_borrar_atencion_y_rechaza_version_vieja(s, monkeypatch):
    reg = activar(s, monkeypatch)
    servicios.atender_alarma(s, "N0003", reg.id, 1, "llamada", LUNES)
    nuevo = texto("51000000003", "segunda señal sintética")
    servicios.procesar_entrante(s, nuevo, LUNES + timedelta(minutes=2))
    assert reg.alarma_version == 2
    assert servicios.procesar_entrante(s, nuevo, LUNES + timedelta(minutes=3)) is False
    assert reg.alarma_version == 2
    with pytest.raises(servicios.ErrorAtencion) as error:
        servicios.atender_alarma(s, "N0003", reg.id, 1, "llamada")
    assert error.value.codigo == 409
    historia = servicios.historial_nino(s, "N0003")[0]
    assert historia["alarma_pendiente"] and len(historia["atenciones"]) == 1
    servicios.atender_alarma(s, "N0003", reg.id, 2, "visita_presencial", LUNES + timedelta(minutes=5))
    assert s.scalar(select(func.count()).select_from(AtencionAlarma)) == 2
    assert servicios.indicadores(s, "EESS01", SEM)["alarmas_pendientes"] == 0


def test_alarma_antigua_sigue_pendiente_y_se_cuenta_una_vez_por_nino(s, monkeypatch):
    activar(s, monkeypatch)
    semanas_despues = LUNES + timedelta(days=21)
    assert servicios.indicadores(s, "EESS01", semanas_despues.strftime("%G-W%V"))["alarmas_pendientes"] == 1
    assert servicios.generar_lista(s, "EESS01", 1, semanas_despues)[0]["id_nino"] == "N0003"
    servicios.procesar_entrante(s, texto("51000000003", "otro aviso"), semanas_despues)
    assert servicios.indicadores(s, "EESS01", semanas_despues.strftime("%G-W%V"))["alarmas_pendientes"] == 1


def test_ruta_exige_clave_valida_medio_pertenencia_y_conflicto(tmp_path, monkeypatch):
    from api.main import app, sesion
    from api.db import fabrica_sesiones
    from tests.test_flujo import PADRON
    motor = crear_motor(f"sqlite:///{tmp_path / 'ruta.db'}")
    s = fabrica_sesiones(motor)()
    servicios.cargar_padron(s, PADRON.read_bytes())
    reg = activar(s, monkeypatch)
    app.dependency_overrides[sesion] = lambda: s
    headers = {"X-API-Key": "clave-de-prueba"}
    ruta = f"/ninos/N0003/alarmas/{reg.id}/atencion"
    try:
        with TestClient(app) as cliente:
            assert cliente.post(ruta, json={"medio": "llamada", "version_alarma": 1}).status_code == 401
            for cuerpo in ({"medio": "sms", "version_alarma": 1}, {"version_alarma": 1},
                           {"medio": "llamada"}, {"medio": "llamada", "version_alarma": -1}):
                assert cliente.post(ruta, headers=headers, json=cuerpo).status_code == 422
            assert cliente.post(ruta.replace("N0003", "N0001"), headers=headers,
                                json={"medio": "llamada", "version_alarma": 1}).status_code == 404
            assert cliente.post(ruta, headers=headers, json={"medio": "llamada", "version_alarma": 0}).status_code == 409
            ok = cliente.post(ruta, headers=headers, json={"medio": "llamada", "version_alarma": 1})
            assert ok.status_code == 200 and ok.json()["medio"] == "llamada"
            assert cliente.post(ruta, headers=headers, json={"medio": "visita_presencial", "version_alarma": 1}).status_code == 409
            assert cliente.get("/ninos/N0003/historial", headers=headers).json()[0]["atenciones"][0]["id"] == ok.json()["id"]
    finally:
        app.dependency_overrides.pop(sesion, None)
        s.close()
        motor.dispose()


def test_migracion_conserva_alarmas_legacy_y_se_puede_repetir(tmp_path):
    import sqlite3
    ruta = tmp_path / "anterior.db"
    with sqlite3.connect(ruta) as con:
        con.execute("CREATE TABLE ninos (id_nino VARCHAR PRIMARY KEY)")
        con.execute("CREATE TABLE registro_semanal (id INTEGER PRIMARY KEY, alarma BOOLEAN)")
        con.execute("INSERT INTO registro_semanal VALUES (1, 1)")
    for _ in range(2):
        motor = crear_motor(f"sqlite:///{ruta}")
        assert "atenciones_alarma" in inspect(motor).get_table_names()
        with motor.connect() as con:
            assert tuple(con.exec_driver_sql("SELECT alarma, alarma_version FROM registro_semanal").one()) == (1, 0)
        motor.dispose()


def test_dos_atenciones_simultaneas_no_duplican_el_registro(tmp_path):
    from concurrent.futures import ThreadPoolExecutor
    from api.db import fabrica_sesiones
    from tests.test_flujo import PADRON
    motor = crear_motor(f"sqlite:///{tmp_path / 'concurrente.db'}")
    fabrica = fabrica_sesiones(motor)
    with fabrica() as sesion:
        servicios.cargar_padron(sesion, PADRON.read_bytes())
        reg = Registro(id_nino="N0003", semana=SEM, alarma=True, alarma_version=1)
        sesion.add(reg)
        sesion.commit()
        registro_id = reg.id

    def atender(_):
        with fabrica() as sesion:
            return servicios.atender_alarma(sesion, "N0003", registro_id, 1, "llamada")["id"]

    with ThreadPoolExecutor(max_workers=2) as pool:
        ids = list(pool.map(atender, range(2)))
    assert ids[0] == ids[1]
    with fabrica() as sesion:
        assert sesion.scalar(select(func.count()).select_from(AtencionAlarma)) == 1
    motor.dispose()
