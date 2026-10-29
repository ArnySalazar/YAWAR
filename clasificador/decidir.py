"""Decisor local para los mensajes de "Otro motivo".

Devuelve una decisión tipada (razón, alarma y su probabilidad) con un modelo
de lenguaje que corre en la misma computadora (Ollama). El texto del
cuidador no sale de esa máquina. El decisor nunca responde al cuidador:
solo clasifica y marca qué casos debe leer una persona.

Uso de prueba:  python3 -m clasificador.decidir "lo vomita cada vez que se lo doy"
"""
import json
import math
import os
import sys
import urllib.request

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODELO = os.getenv("DECISOR_MODELO", "qwen2.5:7b")

# Umbrales provisionales; se fijan en el protocolo antes de la prueba.
UMBRAL_ALARMA = 0.20      # si P(alarma) >= este valor, se marca alarma
UMBRAL_CONFIANZA = 0.70   # si P(razón elegida) < este valor, lo lee una persona

RAZONES = {
    "1": ("sabor", "no le gusta, lo escupe o lo rechaza por el sabor"),
    "2": ("estrenimiento", "no hace deposiciones o las heces están duras"),
    "3": ("estomago", "vómito, náuseas o dolor de barriga"),
    "4": ("diarrea", "diarrea o deposiciones líquidas"),
    "5": ("dientes", "le mancha los dientes"),
    "6": ("se_acabo", "se terminó el frasco o los sobres, o no le entregaron"),
    "7": ("olvido", "se olvidó, no tuvo tiempo, o estuvo de viaje o fuera de casa y no lo llevó"),
    "8": ("otro", "no explica ningún motivo (por ejemplo, solo saluda o agradece), o es otra cosa"),
}

ALARMAS = (
    "no puede beber ni lactar; vomita todo lo que toma; tuvo convulsiones; "
    "está muy decaído, no reacciona o no despierta; hay sangre en las heces; "
    "tomó más hierro del indicado o se tomó el frasco"
)


def _prob_opciones(prompt: str, opciones: list[str]) -> dict[str, float]:
    """Probabilidad de cada opción (un dígito) en el primer token de la respuesta."""
    cuerpo = json.dumps({
        "model": MODELO, "prompt": prompt, "stream": False,
        "logprobs": True, "top_logprobs": 20,
        "options": {"temperature": 0, "num_predict": 1},
    }).encode()
    pedido = urllib.request.Request(OLLAMA_URL, data=cuerpo,
                                    headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(pedido, timeout=20) as r:
        resp = json.load(r)
    tops = resp["logprobs"][0]["top_logprobs"]
    p = {o: 0.0 for o in opciones}
    for t in tops:
        tok = t["token"].strip()
        if tok in p:
            p[tok] += math.exp(t["logprob"])
    total = sum(p.values())
    return {o: v / total for o, v in p.items()} if total > 0 else p


def _prompt_razon(texto: str) -> str:
    lista = "\n".join(f"{k}. {v[1]}" for k, v in RAZONES.items())
    return (
        "Eres un clasificador. Una madre o cuidador explica por qué su hijo no tomó "
        "el suplemento de hierro esta semana. Elige la opción que mejor describe el motivo.\n"
        f"{lista}\n\n"
        f"Mensaje: \"{texto}\"\n"
        "Responde solo con el número de la opción.\nOpción:"
    )


def _prompt_alarma(texto: str) -> str:
    return (
        "Eres un clasificador de seguridad. Lee el mensaje de una madre o cuidador sobre su hijo "
        f"pequeño. Señales de peligro: {ALARMAS}.\n"
        "Las náuseas, el estreñimiento o las heces oscuras por el hierro NO son señales de peligro.\n\n"
        f"Mensaje: \"{texto}\"\n"
        "¿El mensaje describe alguna señal de peligro? Responde 1 si sí, 0 si no.\nRespuesta:"
    )


def decidir(texto: str) -> dict:
    texto = (texto or "").strip()[:500]
    if not texto:
        return {"razon": "otro", "prob_razon": 0.0, "alarma": False, "prob_alarma": 0.0,
                "derivar": True, "motivo_derivar": "mensaje vacío"}
    try:
        pr = _prob_opciones(_prompt_razon(texto), list(RAZONES))
        pa = _prob_opciones(_prompt_alarma(texto), ["0", "1"])
    except Exception as e:  # el decisor nunca bloquea: si falla, lo lee una persona
        return {"razon": "otro", "prob_razon": 0.0, "alarma": False, "prob_alarma": 0.0,
                "derivar": True, "motivo_derivar": f"clasificador no disponible ({type(e).__name__})"}

    codigo = max(pr, key=pr.get)
    razon, prob_razon = RAZONES[codigo][0], pr[codigo]
    prob_alarma = pa["1"]
    alarma = prob_alarma >= UMBRAL_ALARMA

    motivos = []
    if alarma:
        motivos.append("posible señal de peligro")
    if prob_razon < UMBRAL_CONFIANZA:
        motivos.append("baja confianza")
    if razon == "otro":
        motivos.append("motivo no clasificado")
    return {"razon": razon, "prob_razon": round(prob_razon, 3), "alarma": alarma,
            "prob_alarma": round(prob_alarma, 3), "derivar": bool(motivos),
            "motivo_derivar": "; ".join(motivos) or None}


if __name__ == "__main__":
    print(json.dumps(decidir(" ".join(sys.argv[1:])), ensure_ascii=False, indent=1))
