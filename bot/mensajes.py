"""Textos y opciones del asistente.

Los textos informativos deben revisarlos el asesor de salud antes de usarse con personas.
El asistente NO da indicaciones clínicas.
"""

# Respuestas a la pregunta semanal (botones de respuesta rápida; máx. 20 caracteres por título)
RESPUESTAS = {
    "si_le_di": "Sí le di",
    "no_le_di": "No le di",
    "problema": "Tuve un problema",
}

# Razones (mensaje de lista; máx. 24 caracteres por título)
RAZONES = {
    "sabor": "No le gusta",
    "estrenimiento": "Estreñimiento",
    "se_acabo": "Se acabó el hierro",
    "olvido": "Se me olvidó",
    "otro": "Otro motivo",
}

TEXTO_RECORDATORIO = (
    "Hola, {alias}. Te escribimos de tu establecimiento de salud. "
    "¿Le diste el hierro a tu niño o niña esta semana?"
)
TEXTO_PREGUNTA_RAZON = "Gracias por contarnos. ¿Qué pasó? Elige una opción:"
TEXTO_GRACIAS_SI = "¡Gracias! Sigue así. Si tienes dudas, consulta en tu establecimiento."
TEXTO_BAJA = (
    "Listo, ya no te enviaremos mensajes. Si cambias de opinión, escribe ALTA."
)
TEXTO_ALTA = "Gracias, volverás a recibir los recordatorios semanales."
TEXTO_AYUDA = (
    "Gracias por escribirnos. Para contarnos algo del hierro, toca \"Tuve un problema\" y luego "
    "\"Otro motivo\" en el mensaje de la semana. Si no quieres recibir más mensajes, escribe BAJA."
)
TEXTO_NO_LEE_AUDIO = (
    "Por ahora no podemos escuchar audios ni ver fotos. ¿Nos lo escribes en un mensaje? "
    "Si tu niño o niña no puede tomar ni lactar, vomita todo, convulsiona o no despierta, "
    "llévalo de inmediato al establecimiento de salud o llama al 106 (SAMU)."
)
PALABRAS_BAJA = {"baja", "stop", "no quiero", "no quiero mensajes", "cancelar"}
PALABRAS_ALTA = {"alta"}

TEXTO_PIDE_DETALLE = (
    "Gracias. ¿Nos cuentas en un mensaje qué pasó? Así tu establecimiento sabrá cómo ayudarte."
)
TEXTO_GRACIAS_DETALLE = "Gracias por contarnos. Una persona de tu establecimiento lo revisará."
# Texto fijo de seguridad (no es consejo clínico): debe revisarlo el asesor de salud.
TEXTO_ALARMA = (
    "Gracias por contarnos. Una persona de tu establecimiento lo revisará. "
    "Si tu niño o niña no puede tomar ni lactar, vomita todo, convulsiona o no despierta, "
    "llévalo de inmediato al establecimiento de salud o llama al 106 (SAMU)."
)

TEXTO_GRACIAS_RAZON = (
    "Gracias por contarnos. Tu respuesta nos ayuda a mejorar este seguimiento."
)


def id_boton(opcion: str, id_nino: str, semana: str) -> str:
    """El id viaja en el botón y vuelve en la respuesta: así sabemos a quién y qué semana."""
    return f"{opcion}|{id_nino}|{semana}"


def leer_id_boton(valor: str) -> tuple[str, str, str] | None:
    partes = valor.split("|")
    if len(partes) != 3:
        return None
    return partes[0], partes[1], partes[2]


TEXTO_NO_INSCRITO = (
    "Hola, este es un mensaje automático de YAWAR, el seguimiento del hierro de los "
    "establecimientos de salud. No pudimos reconocer este chat, así que nadie lo va a revisar. "
    "Si tu niño o niña no puede tomar ni lactar, vomita todo, convulsiona o no despierta, "
    "llévalo de inmediato al establecimiento de salud o llama al 106 (SAMU)."
)
