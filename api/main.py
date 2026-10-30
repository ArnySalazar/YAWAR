"""API de YAWAR. Ejecutar con:  uvicorn api.main:app --reload
Documentación interactiva en http://localhost:8000/docs
"""
import csv
import io
import logging
import secrets
from typing import Literal

from pydantic import BaseModel, Field

from fastapi import (APIRouter, Depends, FastAPI, File, Header, HTTPException, Query, Request,
                     UploadFile)
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session

from api import config, servicios
from api.db import ahora, crear_motor, fabrica_sesiones, semana_iso
from bot import whatsapp

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("yawar")

app = FastAPI(title="YAWAR API", version="0.2.0")
_motor = crear_motor()
_Sesion = fabrica_sesiones(_motor)


def sesion():
    s = _Sesion()
    try:
        yield s
    finally:
        s.close()


def exigir_clave(x_api_key: str | None = Header(default=None)):
    """Si API_CLAVE está definida en el .env, el panel debe enviarla en X-API-Key."""
    if config.API_CLAVE and not (x_api_key and secrets.compare_digest(x_api_key, config.API_CLAVE)):
        raise HTTPException(401, "Falta la clave de acceso o es incorrecta")


# Rutas del panel: protegidas con la clave
panel = APIRouter(dependencies=[Depends(exigir_clave)])


@app.get("/salud")
def salud():
    return {"ok": True, "modo_prueba": config.MODO_PRUEBA, "hora_local": ahora().isoformat()}


@panel.post("/padron")
async def cargar_padron(archivo: UploadFile = File(...), s: Session = Depends(sesion)):
    try:
        n = servicios.cargar_padron(s, await archivo.read())
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"cargados": n}


@panel.post("/establecimientos/{est}/lista")
def generar_lista(est: str, capacidad: int = Query(10, ge=0), s: Session = Depends(sesion)):
    """Genera (o regenera) la lista de esta semana según la capacidad de visitas."""
    return servicios.generar_lista(s, est, capacidad)


@panel.get("/establecimientos/{est}/lista.csv")
def exportar_lista(est: str, capacidad: int = Query(10, ge=0), s: Session = Depends(sesion)):
    """Plan B: la lista en CSV para imprimir si el sistema falla."""
    filas = servicios.generar_lista(s, est, capacidad)
    buf = io.StringIO()
    campos = ["orden", "id_nino", "alias_cuidador", "edad_meses", "accion", "motivos", "regla"]
    w = csv.DictWriter(buf, fieldnames=campos, extrasaction="ignore")
    w.writeheader()
    w.writerows(filas)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename=lista_{est}.csv"})


@panel.get("/establecimientos/{est}/lista")
def consultar_lista(est: str, s: Session = Depends(sesion)):
    """Lectura del plan y del estado actual; conserva los canales asignados y no escribe."""
    return servicios.generar_lista(s, est, capacidad=0, guardar=False)


@panel.post("/establecimientos/{est}/recordatorios")
def enviar_recordatorios(est: str, s: Session = Depends(sesion)):
    return servicios.enviar_recordatorios(s, est)


@panel.get("/ninos/{id_nino}/historial")
def historial(id_nino: str, s: Session = Depends(sesion)):
    return servicios.historial_nino(s, id_nino)


class AtencionEntrada(BaseModel):
    medio: Literal["llamada", "visita_presencial"]
    version_alarma: int = Field(ge=0, strict=True)


@panel.post("/ninos/{id_nino}/alarmas/{registro_id}/atencion")
def atender_alarma(id_nino: str, registro_id: int, entrada: AtencionEntrada,
                   s: Session = Depends(sesion)):
    """Registra una atención humana. No implica recuperación ni modifica la asignación de canal.

    Repetir el mismo medio y versión devuelve la atención existente; una versión
    desactualizada u otro medio para la misma atención responde 409.
    """
    try:
        return servicios.atender_alarma(s, id_nino, registro_id, entrada.version_alarma, entrada.medio)
    except servicios.ErrorAtencion as e:
        raise HTTPException(e.codigo, str(e))


@panel.get("/establecimientos/{est}/indicadores")
def indicadores(est: str, semana: str | None = None, s: Session = Depends(sesion)):
    return servicios.indicadores(s, est, semana or semana_iso(ahora()))


app.include_router(panel)


# ---------- Webhook de WhatsApp (sin clave: lo protege la firma de Meta) ----------

@app.get("/webhook", response_class=PlainTextResponse)
def verificar_webhook(request: Request):
    p = request.query_params
    if p.get("hub.mode") == "subscribe" and p.get("hub.verify_token") == config.WA_VERIFY_TOKEN:
        return p.get("hub.challenge", "")
    raise HTTPException(403, "token de verificación inválido")


@app.post("/webhook")
async def recibir_webhook(request: Request, s: Session = Depends(sesion)):
    cuerpo = await request.body()
    if not whatsapp.firma_valida(cuerpo, request.headers.get("X-Hub-Signature-256")):
        raise HTTPException(403, "firma inválida")
    # Siempre responder 200: si devolvemos error, Meta reintenta una y otra vez.
    # Los errores se registran en el log y el mensaje queda guardado para revisarlo.
    try:
        evento = await request.json()
        for msg in whatsapp.extraer_mensajes(evento):
            servicios.procesar_entrante(s, msg)
        for st in whatsapp.extraer_estados(evento):
            servicios.actualizar_estado(s, st["wa_id"], st["estado"])
    except Exception:
        log.exception("Error procesando el webhook")
        s.rollback()
    return {"ok": True}
