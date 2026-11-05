"""Configuración leída de variables de entorno (.env)."""
import os
from pathlib import Path


def _cargar_env(ruta: Path = Path(__file__).resolve().parent.parent / ".env") -> None:
    """Carga un archivo .env simple (CLAVE=valor) sin dependencias externas."""
    if not ruta.exists():
        return
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        os.environ.setdefault(clave.strip(), valor.strip())


_cargar_env()

MODO_PRUEBA = os.getenv("MODO_PRUEBA", "1") == "1"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./yawar.db")

WA_TOKEN = os.getenv("WA_TOKEN", "")
WA_PHONE_NUMBER_ID = os.getenv("WA_PHONE_NUMBER_ID", "")
WA_API_VERSION = os.getenv("WA_API_VERSION", "v21.0")
WA_VERIFY_TOKEN = os.getenv("WA_VERIFY_TOKEN", "")
WA_APP_SECRET = os.getenv("WA_APP_SECRET", "")
WA_PLANTILLA_RECORDATORIO = os.getenv("WA_PLANTILLA_RECORDATORIO", "recordatorio_hierro")
WA_PLANTILLA_IDIOMA = os.getenv("WA_PLANTILLA_IDIOMA", "es")

API_CLAVE = os.getenv("API_CLAVE", "")  # si se define, el panel debe enviar el encabezado X-API-Key
ZONA_HORARIA = os.getenv("ZONA_HORARIA", "America/Lima")

DIAS_SIN_RESPUESTA = int(os.getenv("DIAS_SIN_RESPUESTA", "7"))

# Aviso inmediato al personal de CRED cuando hay una posible señal de peligro.
# Teléfonos separados por coma; si está vacío, no se envía nada (solo se ve en el panel).
CRED_TELEFONOS_ALERTA = [t.strip() for t in os.getenv("CRED_TELEFONOS_ALERTA", "").split(",") if t.strip()]
WA_PLANTILLA_ALERTA = os.getenv("WA_PLANTILLA_ALERTA", "alerta_personal_cred")
UMBRAL_META_ALERTA = float(os.getenv("UMBRAL_META_ALERTA", "0.3"))

# ---------- Acceso al panel ----------
# 1 = el panel pide usuario y contraseña (obligatorio si el panel se publica en internet).
# API_CLAVE sigue sirviendo para scripts y pruebas que llaman a la API sin navegador.
PANEL_LOGIN = os.getenv("PANEL_LOGIN", "1") == "1"
SESION_HORAS = int(os.getenv("SESION_HORAS", "12"))
# 1 = la cookie de sesión solo viaja por HTTPS. Poner 0 solo para probar por http en la red local.
SESION_COOKIE_SEGURA = os.getenv("SESION_COOKIE_SEGURA", "1") == "1"
# Carpeta del panel ya compilado (npm run build). Si existe, la API también sirve el panel.
PANEL_DIST = os.getenv("PANEL_DIST", str(Path(__file__).resolve().parent.parent / "panel" / "dist"))
# 0 = oculta /docs y /openapi.json (recomendado cuando la API está publicada)
MOSTRAR_DOCS = os.getenv("MOSTRAR_DOCS", "1") == "1"
