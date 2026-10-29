"""Pruebas en MODO_PRUEBA (sin llamar a WhatsApp)."""
import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

os.environ["MODO_PRUEBA"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "prueba.db")
os.environ["API_CLAVE"] = "clave-de-prueba"
os.environ["WA_APP_SECRET"] = ""  # las pruebas no firman el webhook

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


def test_otro_motivo_con_alarma_sube_primero(s, monkeypatch):
    monkeypatch.setattr(servicios, "decidir", lambda t: {
        "razon": "otro", "prob_razon": 0.9, "alarma": True, "prob_alarma": 0.99,
        "derivar": True, "motivo_derivar": "posible señal de peligro"})
    servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)
    servicios.procesar_entrante(s, boton("51000000002", f"problema|N0002|{SEM}"), LUNES)
    servicios.procesar_entrante(s, {"wa_id": "wamid.o1", "telefono": "51000000002",
                                    "tipo": "interactive", "valor": f"razon:otro|N0002|{SEM}"}, LUNES)
    assert "cuentas" in whatsapp.BANDEJA_PRUEBA[-1]["text"]["body"]  # pidió el detalle
    servicios.procesar_entrante(s, texto("51000000002", "no quiere lactar y está muy decaído"), LUNES)
    reg = s.scalars(select(Registro).where(Registro.id_nino == "N0002", Registro.semana == SEM)).one()
    assert reg.detalle.startswith("no quiere lactar") and reg.alarma and reg.derivar
    assert "106" in whatsapp.BANDEJA_PRUEBA[-1]["text"]["body"]  # mensaje fijo de seguridad
    lista = servicios.generar_lista(s, "EESS01", capacidad=1, hoy=LUNES)
    assert lista[0]["id_nino"] == "N0002" and lista[0]["seguimiento"].startswith("POSIBLE SEÑAL")


def test_otro_motivo_sin_ollama_deriva_a_persona(s):
    from clasificador import decidir as mod
    mod_url = mod.OLLAMA_URL
    mod.OLLAMA_URL = "http://127.0.0.1:9/api/generate"  # puerto cerrado: simula Ollama apagado
    try:
        d = mod.decidir("se me cayó el frasco")
    finally:
        mod.OLLAMA_URL = mod_url
    assert d["derivar"] and not d["alarma"] and "no disponible" in d["motivo_derivar"]


def test_tratamiento_de_anemia_va_antes_dentro_del_grupo(s):
    from api.db import Nino
    n = s.get(Nino, "N0001")  # 8 meses: el modelo lo pone abajo
    n.en_tratamiento_anemia = True
    s.commit()
    lista = servicios.generar_lista(s, "EESS01", capacidad=1, hoy=LUNES)
    assert lista[0]["id_nino"] == "N0001" and lista[0]["motivos"].startswith("en tratamiento")


def test_padron_rechaza_edad_fuera_de_6_a_35(s):
    malo = PADRON.read_text().replace(",8,urbano", ",4,urbano", 1).encode()
    with pytest.raises(ValueError, match="entre 6 y 35"):
        servicios.cargar_padron(s, malo)


def _decisor_fijo(alarma, motivo=None):
    return lambda t: {"razon": "otro", "prob_razon": 0.9, "alarma": alarma,
                      "prob_alarma": 0.99 if alarma else 0.0, "derivar": alarma or bool(motivo),
                      "motivo_derivar": motivo or ("posible señal de peligro" if alarma else None)}


def test_problema_de_esta_semana_sube_sin_esperar_al_lunes(s):
    servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)
    servicios.procesar_entrante(s, boton("51000000004", f"problema|N0004|{SEM}"), LUNES)
    lista = servicios.generar_lista(s, "EESS01", capacidad=1, hoy=LUNES + timedelta(days=2))
    assert lista[0]["id_nino"] == "N0004" and lista[0]["seguimiento"].startswith("esta semana")


def test_texto_sin_preguntar_con_peligro_no_se_ignora(s, monkeypatch):
    monkeypatch.setattr(servicios, "decidir", _decisor_fijo(True))
    servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)
    servicios.procesar_entrante(s, texto("51000000003", "mi bebe convulsiono anoche"), LUNES)
    assert "106" in whatsapp.BANDEJA_PRUEBA[-1]["text"]["body"]
    lista = servicios.generar_lista(s, "EESS01", capacidad=1, hoy=LUNES)
    assert lista[0]["id_nino"] == "N0003" and lista[0]["seguimiento"].startswith("POSIBLE SEÑAL")


def test_texto_sin_preguntar_sin_peligro_recibe_ayuda(s, monkeypatch):
    monkeypatch.setattr(servicios, "decidir", _decisor_fijo(False))
    servicios.procesar_entrante(s, texto("51000000003", "hola buenas"), LUNES)
    assert "Otro motivo" in whatsapp.BANDEJA_PRUEBA[-1]["text"]["body"]


def test_audio_se_deriva_y_pide_texto(s):
    servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)
    servicios.procesar_entrante(s, {"wa_id": "wamid.a1", "telefono": "51000000002",
                                    "tipo": "audio", "valor": ""}, LUNES)
    assert "audios" in whatsapp.BANDEJA_PRUEBA[-1]["text"]["body"]
    lista = servicios.generar_lista(s, "EESS01", capacidad=1, hoy=LUNES)
    assert lista[0]["id_nino"] == "N0002" and lista[0]["seguimiento"].startswith("mensaje para leer")


def test_clasificador_apagado_dispara_meta_alerta(s, monkeypatch):
    monkeypatch.setattr(servicios, "decidir", _decisor_fijo(False, "clasificador no disponible (URLError)"))
    servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)
    servicios.procesar_entrante(s, boton("51000000001", f"problema|N0001|{SEM}"), LUNES)
    servicios.procesar_entrante(s, {"wa_id": "wamid.o2", "telefono": "51000000001",
                                    "tipo": "interactive", "valor": f"razon:otro|N0001|{SEM}"}, LUNES)
    servicios.procesar_entrante(s, texto("51000000001", "pasó algo raro"), LUNES)
    ind = servicios.indicadores(s, "EESS01", SEM)
    assert "Ollama" in ind["meta_alerta"]


def test_padron_sin_geografia_se_carga():
    sesion = fabrica_sesiones(crear_motor("sqlite://"))()
    csv = ("id_nino,establecimiento_id,alias_cuidador,telefono,edad_meses,controles_cred,fecha_entrega_hierro\n"
           "X1,EESS09,Mamá de X1,+51000000099,20,17,\n").encode()
    assert servicios.cargar_padron(sesion, csv) == 1
    assert servicios.generar_lista(sesion, "EESS09", capacidad=1, hoy=LUNES)[0]["id_nino"] == "X1"


def test_alarma_avisa_al_personal_una_sola_vez(s, monkeypatch):
    from api import config
    monkeypatch.setattr(config, "CRED_TELEFONOS_ALERTA", ["51000000777"])
    monkeypatch.setattr(servicios, "decidir", _decisor_fijo(True))
    servicios.enviar_recordatorios(s, "EESS01", hoy=LUNES)
    servicios.procesar_entrante(s, texto("51000000003", "convulsionó"), LUNES)
    servicios.procesar_entrante(s, texto("51000000003", "sigue mal"), LUNES)
    avisos = [m for m in whatsapp.BANDEJA_PRUEBA
              if m.get("type") == "template" and m["to"] == "51000000777"]
    assert len(avisos) == 1  # no se repite en la misma semana
    params = [p["text"] for p in avisos[0]["template"]["components"][0]["parameters"]]
    assert params == ["N0003", "22", "posible señal de peligro"]  # sin el texto de la madre


def test_sin_telefono_del_personal_no_se_envia_aviso(s, monkeypatch):
    from api import config
    monkeypatch.setattr(config, "CRED_TELEFONOS_ALERTA", [])
    monkeypatch.setattr(servicios, "decidir", _decisor_fijo(True))
    servicios.procesar_entrante(s, texto("51000000003", "convulsionó"), LUNES)
    assert not [m for m in whatsapp.BANDEJA_PRUEBA if m.get("type") == "template"]
