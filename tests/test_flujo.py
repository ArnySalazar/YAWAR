"""Pruebas en MODO_PRUEBA (sin llamar a WhatsApp)."""
import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

os.environ["MODO_PRUEBA"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "prueba.db")
os.environ["API_CLAVE"] = "clave-de-prueba"

import pytest  # noqa: E402
from sqlalchemy import select  # noqa: E402

from api import servicios  # noqa: E402
from api.db import Mensaje, Nino, Registro, crear_motor, fabrica_sesiones, semana_iso  # noqa: E402
from bot import whatsapp  # noqa: E402

PADRON = Path(__file__).resolve().parent.parent / "datos" / "padron_ejemplo.csv"
LUNES = datetime(2026, 10, 19, 9)
SEM = semana_iso(LUNES)


@pytest.fixture
def s():
    whatsapp.BANDEJA_PRUEBA.clear()
    sesion = fabrica_sesiones(crear_motor("sqlite://"))()
    servicios.cargar_padron(sesion, PADRON.read_bytes())
    return sesion


_contador = iter(range(10**6))


def boton(telefono, payload, wa_id=None):
    return {"wa_id": wa_id or f"wamid.{next(_contador)}", "telefono": telefono,
            "tipo": "button", "valor": payload}


def texto(telefono, cuerpo):
    return {"wa_id": f"wamid.{next(_contador)}", "telefono": telefono, "tipo": "text", "valor": cuerpo}


def test_flujo_completo(s):
    lista1 = servicios.generar_lista(s, "EESS01", capacidad=1, hoy=LUNES)
    assert [f["accion"] for f in lista1].count("visita") == 1
    assert servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)["enviados"] == 4
    assert servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)["enviados"] == 0  # no duplica

    # Meta envía el número sin "+": igual debe coincidir con el padrón
    servicios.procesar_entrante(s, boton("51000000001", f"no_le_di|N0001|{SEM}"), LUNES)
    assert whatsapp.BANDEJA_PRUEBA[-1]["type"] == "interactive"  # pidió la razón
    servicios.procesar_entrante(s, {"wa_id": "wamid.r1", "telefono": "51000000001",
                                    "tipo": "interactive", "valor": f"razon:sabor|N0001|{SEM}"}, LUNES)
    reg = s.scalars(select(Registro).where(Registro.id_nino == "N0001", Registro.semana == SEM)).one()
    assert (reg.respuesta, reg.razon) == ("no_le_di", "sabor")

    lista2 = servicios.generar_lista(s, "EESS01", capacidad=1, hoy=LUNES + timedelta(days=7))
    assert lista2[0]["id_nino"] == "N0001" and lista2[0]["accion"] == "visita"


def test_webhook_duplicado_no_se_procesa_dos_veces(s):
    servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)
    msg = boton("51000000001", f"no_le_di|N0001|{SEM}", wa_id="wamid.repetido")
    assert servicios.procesar_entrante(s, msg, LUNES) is True
    n_bandeja = len(whatsapp.BANDEJA_PRUEBA)
    assert servicios.procesar_entrante(s, msg, LUNES) is False  # Meta reintentó
    assert len(whatsapp.BANDEJA_PRUEBA) == n_bandeja  # no se mandó otra lista de razones


def test_telefono_ajeno_se_ignora(s):
    servicios.procesar_entrante(s, boton("51999999999", f"no_le_di|N0001|{SEM}"), LUNES)
    assert s.scalars(select(Registro)).first() is None


def test_baja_y_alta(s):
    servicios.procesar_entrante(s, texto("51000000002", "  BAJA "), LUNES)
    assert s.get(Nino, "N0002").acepta_mensajes is False
    r = servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)
    assert r["omitidos_por_baja"] == 1 and r["enviados"] == 3
    servicios.procesar_entrante(s, texto("51000000002", "alta"), LUNES)
    assert s.get(Nino, "N0002").acepta_mensajes is True


def test_envio_fallido_no_detiene_a_los_demas(s, monkeypatch):
    original = whatsapp.enviar_recordatorio

    def falla_uno(tel, alias, id_nino, semana, **kw):
        if id_nino == "N0002":
            raise RuntimeError("token vencido")
        return original(tel, alias, id_nino, semana, **kw)

    monkeypatch.setattr(whatsapp, "enviar_recordatorio", falla_uno)
    r = servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)
    assert r == {"enviados": 3, "fallidos": 1, "omitidos_por_baja": 0}
    monkeypatch.setattr(whatsapp, "enviar_recordatorio", original)
    assert servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)["enviados"] == 1  # reintenta solo ese


def test_estados_no_retroceden(s):
    servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)
    m = s.scalars(select(Mensaje)).first()
    servicios.actualizar_estado(s, m.wa_message_id, "leido")
    servicios.actualizar_estado(s, m.wa_message_id, "entregado")  # llega tarde y desordenado
    assert s.get(Mensaje, m.id).estado == "leido"


def test_padron_con_errores_no_carga_nada():
    sesion = fabrica_sesiones(crear_motor("sqlite://"))()
    malo = PADRON.read_text().replace("N0003,EESS01,Papá de N0003,+51000000003,22,urbano",
                                      "N0003,EESS01,Papá de N0003,+51000000003,veinte,urbano")
    with pytest.raises(ValueError, match="fila 4"):
        servicios.cargar_padron(sesion, malo.encode())
    assert sesion.scalars(select(Nino)).first() is None


def test_meta_alerta(s):
    inicio = datetime(2026, 9, 28, 9)
    for k in range(3):
        servicios.enviar_recordatorios(s, "EESS01", hoy=inicio + timedelta(days=7 * k))
    ind = servicios.indicadores(s, "EESS01", semana_iso(inicio + timedelta(days=21)))
    assert ind["meta_alerta"] is not None


def test_api_exige_clave_y_webhook_responde_200():
    from fastapi.testclient import TestClient

    from api.main import app
    c = TestClient(app)
    assert c.get("/salud").status_code == 200
    assert c.post("/establecimientos/EESS01/lista").status_code == 401
    ok = c.post("/padron", headers={"X-API-Key": "clave-de-prueba"},
                files={"archivo": ("p.csv", PADRON.read_bytes(), "text/csv")})
    assert ok.json() == {"cargados": 10}
    # Un webhook con contenido raro no debe devolver error (Meta reintentaría)
    assert c.post("/webhook", json={"entry": "basura"}).status_code == 200
