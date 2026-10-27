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
    "Por ahora solo puedo leer los botones. Si no quieres recibir más mensajes, escribe BAJA."
)
PALABRAS_BAJA = {"baja", "stop", "no quiero", "no quiero mensajes", "cancelar"}
PALABRAS_ALTA = {"alta"}

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
