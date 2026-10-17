"""API de HierroEnCasa. Ejecutar con:  uvicorn api.main:app --reload
Documentación interactiva en http://localhost:8000/docs
"""
import csv
import io
from datetime import datetime

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import config, servicios
from api.db import Registro, crear_motor, fabrica_sesiones, semana_iso
from bot import whatsapp

app = FastAPI(title="HierroEnCasa API", version="0.1.0")
_motor = crear_motor()
_Sesion = fabrica_sesiones(_motor)


def sesion():
    s = _Sesion()
    try:
        yield s
    finally:
        s.close()


@app.get("/salud")
def salud():
    return {"ok": True, "modo_prueba": config.MODO_PRUEBA}


@app.post("/padron")
async def cargar_padron(archivo: UploadFile = File(...), s: Session = Depends(sesion)):
    try:
        n = servicios.cargar_padron(s, await archivo.read())
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"cargados": n}


@app.post("/establecimientos/{est}/lista")
def generar_lista(est: str, capacidad: int = Query(10, ge=0), s: Session = Depends(sesion)):
    """Genera (o regenera) la lista de esta semana según la capacidad de visitas."""
    return servicios.generar_lista(s, est, capacidad)


@app.get("/establecimientos/{est}/lista.csv")
def exportar_lista(est: str, capacidad: int = Query(10, ge=0), s: Session = Depends(sesion)):
    """Plan B: la lista en CSV para imprimir si el sistema falla."""
    filas = servicios.generar_lista(s, est, capacidad)
    buf = io.StringIO()
    campos = ["orden", "id_nino", "alias_cuidador", "edad_meses", "accion", "motivos", "regla"]
    w = csv.DictWriter(buf, fieldnames=campos, extrasaction="ignore")
    w.writeheader()
    w.writerows(filas)
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename=lista_{est}.csv"})


@app.post("/establecimientos/{est}/recordatorios")
def enviar_recordatorios(est: str, s: Session = Depends(sesion)):
    return {"enviados": servicios.enviar_recordatorios(s, est)}


@app.get("/ninos/{id_nino}/historial")
def historial(id_nino: str, s: Session = Depends(sesion)):
    regs = s.scalars(select(Registro).where(Registro.id_nino == id_nino)
                     .order_by(Registro.semana.desc())).all()
    return [{"semana": r.semana, "accion": r.accion, "puntaje": r.puntaje,
             "respuesta": r.respuesta, "razon": r.razon} for r in regs]


@app.get("/establecimientos/{est}/indicadores")
def indicadores(est: str, semana: str | None = None, s: Session = Depends(sesion)):
    return servicios.indicadores(s, est, semana or semana_iso(datetime.now()))


# ---------- Webhook de WhatsApp ----------

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
    for resp in whatsapp.extraer_respuestas(await request.json()):
        servicios.registrar_respuesta(s, resp)
    return {"ok": True}  # Meta exige responder 200 rápido
