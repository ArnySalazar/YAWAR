"""Prueba de punta a punta en MODO_PRUEBA: padrón -> lista -> recordatorio -> respuesta -> lista."""
import os
from datetime import datetime, timedelta
from pathlib import Path

os.environ["MODO_PRUEBA"] = "1"

from api import servicios  # noqa: E402
from api.db import crear_motor, fabrica_sesiones, semana_iso  # noqa: E402
from bot import whatsapp  # noqa: E402

PADRON = Path(__file__).resolve().parent.parent / "datos" / "padron_ejemplo.csv"


def nueva_sesion():
    return fabrica_sesiones(crear_motor("sqlite://"))()


def evento_boton(telefono, payload):
    return {"entry": [{"changes": [{"value": {"messages": [
        {"from": telefono, "type": "button", "button": {"payload": payload, "text": "x"}}]}}]}]}


def evento_lista(telefono, fila_id):
    return {"entry": [{"changes": [{"value": {"messages": [
        {"from": telefono, "type": "interactive",
         "interactive": {"type": "list_reply", "list_reply": {"id": fila_id, "title": "x"}}}]}}]}]}


def test_flujo_completo():
    s = nueva_sesion()
    whatsapp.BANDEJA_PRUEBA.clear()
    assert servicios.cargar_padron(s, PADRON.read_bytes()) == 10

    lunes1 = datetime(2026, 10, 19, 9)
    lista1 = servicios.generar_lista(s, "EESS01", capacidad=1, hoy=lunes1)
    assert [f["accion"] for f in lista1].count("visita") == 1
    assert lista1[0]["puntaje"] >= lista1[-1]["puntaje"]

    assert servicios.enviar_recordatorios(s, "EESS01", hoy=lunes1) == 4
    assert servicios.enviar_recordatorios(s, "EESS01", hoy=lunes1) == 0  # no duplica

    # El cuidador de N0001 (el de menor riesgo) responde "No le di" y luego "No le gusta"
    sem = semana_iso(lunes1)
    for r in whatsapp.extraer_respuestas(evento_boton("+51000000001", f"no_le_di|N0001|{sem}")):
        servicios.registrar_respuesta(s, r, ahora=lunes1 + timedelta(hours=2))
    assert whatsapp.BANDEJA_PRUEBA[-1]["type"] == "interactive"  # se envió la lista de razones
    for r in whatsapp.extraer_respuestas(evento_lista("+51000000001", f"razon:sabor|N0001|{sem}")):
        servicios.registrar_respuesta(s, r, ahora=lunes1 + timedelta(hours=3))

    # La semana siguiente N0001 sube al primer lugar por seguimiento
    lunes2 = lunes1 + timedelta(days=7)
    lista2 = servicios.generar_lista(s, "EESS01", capacidad=1, hoy=lunes2)
    assert lista2[0]["id_nino"] == "N0001"
    assert lista2[0]["accion"] == "visita"
    assert "No le di" in lista2[0]["regla"]
    # Los que no respondieron en 7 días también quedan marcados para seguimiento
    assert all(f["seguimiento"] for f in lista2)


def test_respuesta_de_telefono_ajeno_se_ignora():
    from sqlalchemy import select
    from api.db import Registro
    s = nueva_sesion()
    servicios.cargar_padron(s, PADRON.read_bytes())
    sem = semana_iso(datetime(2026, 10, 19))
    for r in whatsapp.extraer_respuestas(evento_boton("+51999999999", f"no_le_di|N0001|{sem}")):
        servicios.registrar_respuesta(s, r)
    assert s.scalars(select(Registro)).first() is None


def test_meta_alerta():
    s = nueva_sesion()
    servicios.cargar_padron(s, PADRON.read_bytes())
    inicio = datetime(2026, 9, 28, 9)
    for k in range(3):  # tres semanas normales
        servicios.enviar_recordatorios(s, "EESS01", hoy=inicio + timedelta(days=7 * k))
    semana_vacia = semana_iso(inicio + timedelta(days=21))  # cuarta semana: no se envió nada
    ind = servicios.indicadores(s, "EESS01", semana_vacia)
    assert ind["meta_alerta"] is not None
