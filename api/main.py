"""API de YAWAR. Ejecutar con:  uvicorn api.main:app --reload
Documentación interactiva en http://localhost:8000/docs
"""
import csv
import io
import logging
import secrets
from typing import Literal

from pydantic import BaseModel, Field

from pathlib import Path

from fastapi import (APIRouter, Depends, FastAPI, File, Header, HTTPException, Query, Request,
                     Response, UploadFile)
from fastapi.responses import FileResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from api import acceso, config, servicios
from api.db import ahora, crear_motor, fabrica_sesiones, semana_iso
from bot import whatsapp

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("yawar")

app = FastAPI(title="YAWAR API", version="0.3.0",
              docs_url="/docs" if config.MOSTRAR_DOCS else None,
              redoc_url=None, openapi_url="/openapi.json" if config.MOSTRAR_DOCS else None)


@app.middleware("http")
async def cabeceras_seguras(request: Request, call_next):
    r = await call_next(request)
    r.headers.setdefault("X-Content-Type-Options", "nosniff")
    r.headers.setdefault("X-Frame-Options", "DENY")
    r.headers.setdefault("Referrer-Policy", "same-origin")
    r.headers.setdefault("X-Robots-Tag", "noindex, nofollow")
    r.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return r

_motor = crear_motor()
_Sesion = fabrica_sesiones(_motor)


def sesion():
    s = _Sesion()
    try:
        yield s
    finally:
        s.close()


def exigir_clave(request: Request, x_api_key: str | None = Header(default=None),
                 s: Session = Depends(sesion)):
    """Acceso a las rutas del panel: sesión iniciada (cookie) o X-API-Key para scripts.

    Sin PANEL_LOGIN ni API_CLAVE (solo en desarrollo) las rutas quedan abiertas.
    """
    if config.API_CLAVE and x_api_key and secrets.compare_digest(x_api_key, config.API_CLAVE):
        return
    if acceso.usuario_de_token(s, request.cookies.get(acceso.COOKIE)):
        return
    if not config.PANEL_LOGIN and not config.API_CLAVE:
        return
    raise HTTPException(401, "Inicia sesión para usar el panel")


# Rutas del panel: protegidas con la clave
panel = APIRouter(dependencies=[Depends(exigir_clave)])


@app.get("/salud")
@app.get("/api/salud", include_in_schema=False)  # el panel publicado llama a /api/salud
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


# ---------- Inicio de sesión ----------
auth = APIRouter(prefix="/auth")


class Credenciales(BaseModel):
    usuario: str = Field(min_length=1, max_length=64)
    clave: str = Field(min_length=1, max_length=256)


def _ip(request: Request) -> str:
    # Detrás del túnel de Cloudflare la IP real llega en CF-Connecting-IP
    return request.headers.get("CF-Connecting-IP") or (request.client.host if request.client else "?")


@auth.post("/login")
def iniciar_sesion(entrada: Credenciales, request: Request, response: Response,
                   s: Session = Depends(sesion)):
    llaves = (f"ip:{_ip(request)}", f"u:{entrada.usuario.strip().lower()}")
    if any(acceso.bloqueado(k) for k in llaves):
        raise HTTPException(429, "Demasiados intentos. Espera 15 minutos y vuelve a intentar.")
    u = acceso.autenticar(s, entrada.usuario, entrada.clave)
    if u is None:
        for k in llaves:
            acceso.anotar_fallo(k)
        raise HTTPException(401, "Usuario o contraseña incorrectos")
    for k in llaves:
        acceso.limpiar_fallos(k)
    token = acceso.abrir_sesion(s, u)
    response.set_cookie(acceso.COOKIE, token, max_age=config.SESION_HORAS * 3600, httponly=True,
                        secure=config.SESION_COOKIE_SEGURA, samesite="strict", path="/")
    log.info("Inicio de sesión: %s", u.usuario)
    return {"usuario": u.usuario, "nombre": u.nombre}


@auth.post("/salir")
def salir(request: Request, response: Response, s: Session = Depends(sesion)):
    acceso.cerrar_sesion(s, request.cookies.get(acceso.COOKIE))
    response.delete_cookie(acceso.COOKIE, path="/", secure=config.SESION_COOKIE_SEGURA,
                           httponly=True, samesite="strict")
    return {"ok": True}


@auth.get("/yo")
def quien_soy(request: Request, s: Session = Depends(sesion)):
    u = acceso.usuario_de_token(s, request.cookies.get(acceso.COOKIE))
    if u:
        return {"usuario": u.usuario, "nombre": u.nombre, "login": True}
    if not config.PANEL_LOGIN and not config.API_CLAVE:
        return {"usuario": None, "nombre": "Desarrollo", "login": False}
    raise HTTPException(401, "Inicia sesión para usar el panel")


# Las rutas del panel se sirven en la raíz (scripts y pruebas) y bajo /api (el panel publicado,
# que vive en el mismo dominio y llama a /api/...)
for _prefijo in ("", "/api"):
    app.include_router(panel, prefix=_prefijo)
    app.include_router(auth, prefix=_prefijo)


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


# ---------- Panel compilado (npm run build), servido desde el mismo dominio ----------
_DIST = Path(config.PANEL_DIST).resolve()

if (_DIST / "index.html").is_file():
    if (_DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/robots.txt", include_in_schema=False, response_class=PlainTextResponse)
    def robots():
        return "User-agent: *\nDisallow: /\n"

    @app.api_route("/{ruta:path}", methods=["GET", "HEAD"], include_in_schema=False)
    def panel_web(ruta: str):
        if ruta.startswith("api/") or ruta == "api":
            raise HTTPException(404, "No existe")
        archivo = (_DIST / ruta).resolve()
        if ruta and archivo.is_file() and _DIST in archivo.parents:
            return FileResponse(archivo)
        # Rutas del panel (/planificacion, /ninos/…): las resuelve React
        return FileResponse(_DIST / "index.html", headers={"Cache-Control": "no-cache"})
