"""Cliente mínimo de WhatsApp Cloud API.

En MODO_PRUEBA=1 no se llama a Meta: los mensajes se guardan en BANDEJA_PRUEBA,
lo que permite probar todo el flujo sin credenciales.

Importante: un mensaje que inicia la conversación (el recordatorio semanal) debe ser una
PLANTILLA aprobada por Meta. Los mensajes interactivos libres (la lista de razones) solo
se pueden enviar dentro de las 24 horas después de que la persona respondió.
"""
import hashlib
import hmac

import httpx

from api import config
from bot import mensajes

BANDEJA_PRUEBA: list[dict] = []


def _enviar(payload: dict) -> str | None:
    if config.MODO_PRUEBA:
        BANDEJA_PRUEBA.append(payload)
        return f"prueba-{len(BANDEJA_PRUEBA)}"
    url = (f"https://graph.facebook.com/{config.WA_API_VERSION}/"
           f"{config.WA_PHONE_NUMBER_ID}/messages")
    r = httpx.post(url, json=payload,
                   headers={"Authorization": f"Bearer {config.WA_TOKEN}"}, timeout=20)
    r.raise_for_status()
    datos = r.json()
    return datos.get("messages", [{}])[0].get("id")


def enviar_recordatorio(telefono: str, alias: str, id_nino: str, semana: str,
                        nombre_nino: str | None = None) -> str | None:
    """Plantilla con 3 botones de respuesta rápida. La plantilla en Meta debe tener:
    cuerpo con una variable {{1}} (el alias) y 3 botones quick reply en este orden:
    Sí le di / No le di / Tuve un problema."""
    botones = [
        {"type": "button", "sub_type": "quick_reply", "index": str(i),
         "parameters": [{"type": "payload",
                         "payload": mensajes.id_boton(op, id_nino, semana)}]}
        for i, op in enumerate(mensajes.RESPUESTAS)
    ]
    payload = {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "template",
        "template": {
            "name": config.WA_PLANTILLA_RECORDATORIO,
            "language": {"code": config.WA_PLANTILLA_IDIOMA},
            "components": [
                    {"type": "body", "parameters": [
                    {"type": "text", "text": alias},
                    {"type": "text", "text": nombre_nino or "tu niño o niña"}]},
                *botones,
            ],
        },
    }
    return _enviar(payload)


def enviar_alerta_personal(telefono: str, id_nino: str, edad_meses: int, motivo: str) -> str | None:
    """Plantilla de utilidad para el personal: código del niño, edad y motivo, sin copiar
    lo que escribió el cuidador (eso se ve en el panel)."""
    payload = {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "template",
        "template": {
            "name": config.WA_PLANTILLA_ALERTA,
            "language": {"code": config.WA_PLANTILLA_IDIOMA},
            "components": [{"type": "body", "parameters": [
                {"type": "text", "text": id_nino},
                {"type": "text", "text": str(edad_meses)},
                {"type": "text", "text": motivo}]}],
        },
    }
    return _enviar(payload)


def enviar_pregunta_razon(telefono: str, id_nino: str, semana: str) -> str | None:
    """Mensaje de lista (permitido porque la persona acaba de responder)."""
    filas = [{"id": mensajes.id_boton(f"razon:{k}", id_nino, semana), "title": v}
             for k, v in mensajes.RAZONES.items()]
    payload = {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "interactive",
        "interactive": {
            "type": "list",
            "body": {"text": mensajes.TEXTO_PREGUNTA_RAZON},
            "action": {"button": "Elegir motivo",
                       "sections": [{"title": "Motivos", "rows": filas}]},
        },
    }
    return _enviar(payload)


def enviar_texto(telefono: str, texto: str) -> str | None:
    """Si el remitente llegó sin teléfono (usuario con nombre de usuario de WhatsApp),
    se responde a su identificador con el campo "recipient", como pide Meta."""
    if telefono.startswith("usuario:"):
        destino = {"recipient": telefono.removeprefix("usuario:")}
    else:
        destino = {"to": telefono}
    return _enviar({"messaging_product": "whatsapp", **destino,
                    "type": "text", "text": {"body": texto}})


def firma_valida(cuerpo: bytes, firma: str | None) -> bool:
    """Verifica X-Hub-Signature-256 si se configuró WA_APP_SECRET."""
    if not config.WA_APP_SECRET:
        return True
    if not firma or not firma.startswith("sha256="):
        return False
    esperado = hmac.new(config.WA_APP_SECRET.encode(), cuerpo, hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, firma.removeprefix("sha256="))


def extraer_mensajes(evento: dict) -> list[dict]:
    """Saca de un webhook de Meta los mensajes entrantes.
    Devuelve [{wa_id, telefono, tipo, valor}], donde valor es el id del botón o de la fila
    de la lista elegida, o el texto escrito."""
    salida = []
    for entrada in evento.get("entry", []):
        for cambio in entrada.get("changes", []):
            for msg in cambio.get("value", {}).get("messages", []):
                tipo = msg.get("type", "otro")
                if tipo == "button":  # respuesta a botón de plantilla
                    valor = msg.get("button", {}).get("payload", "")
                elif tipo == "interactive":
                    inter = msg.get("interactive", {})
                    valor = (inter.get("button_reply") or inter.get("list_reply") or {}).get("id", "")
                elif tipo == "text":
                    valor = msg.get("text", {}).get("body", "")
                else:
                    valor = ""
                # Con nombre de usuario activado, Meta puede omitir el teléfono y mandar
                # solo from_user_id: se guarda como "usuario:<id>" para no perder al remitente.
                remitente = msg.get("from") or (
                    "usuario:" + msg["from_user_id"] if msg.get("from_user_id") else "")
                salida.append({"wa_id": msg.get("id", ""), "telefono": remitente,
                               "tipo": tipo, "valor": valor})
    return salida


def extraer_estados(evento: dict) -> list[dict]:
    """Avisos de Meta sobre mensajes que enviamos: sent, delivered, read o failed."""
    traduccion = {"sent": "enviado", "delivered": "entregado", "read": "leido", "failed": "fallido"}
    salida = []
    for entrada in evento.get("entry", []):
        for cambio in entrada.get("changes", []):
            for st in cambio.get("value", {}).get("statuses", []):
                if st.get("status") in traduccion:
                    salida.append({"wa_id": st.get("id", ""), "estado": traduccion[st["status"]]})
    return salida
