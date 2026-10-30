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
