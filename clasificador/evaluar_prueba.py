"""Evaluación del decisor con el conjunto de PRUEBA (PROTOCOLO.md, secciones 6 a 8).

Entrada: clasificador/prueba.csv con columnas
  texto, autor, razon_a, alarma_a, razon_b, alarma_b, razon, alarma
  (a y b = las dos personas que etiquetaron por separado; razon/alarma = etiqueta final
  acordada; alarma en 1 o 0). Este archivo no se sube al repositorio si tiene datos reales.
Salida: clasificador/resultados_prueba.csv (una fila por mensaje) y el resumen en pantalla.
El conjunto se usa una sola vez: si ya existe el archivo de resultados, el script se detiene.
"""
import csv
import sys
from pathlib import Path

from clasificador.decidir import RAZONES, decidir

CARPETA = Path(__file__).resolve().parent
ENTRADA, SALIDA = CARPETA / "prueba.csv", CARPETA / "resultados_prueba.csv"
CODIGOS = {v[0] for v in RAZONES.values()}


def kappa(a: list, b: list) -> float:
    """Kappa de Cohen: acuerdo entre las dos personas, corregido por el azar."""
    n = len(a)
    po = sum(x == y for x, y in zip(a, b)) / n
    cats = set(a) | set(b)
    pe = sum((a.count(c) / n) * (b.count(c) / n) for c in cats)
    return 1.0 if pe == 1 else (po - pe) / (1 - pe)


def main() -> None:
    if SALIDA.exists() and "--forzar" not in sys.argv:
        sys.exit("La prueba ya se corrió (existe resultados_prueba.csv). El protocolo permite usarla una sola vez.")
    prueba_vida = decidir("hola")
    if "no disponible" in (prueba_vida["motivo_derivar"] or ""):
        sys.exit("Ollama no responde: enciéndelo antes. No se usó el conjunto de prueba.")
    filas = list(csv.DictReader(ENTRADA.open(encoding="utf-8")))
    for i, f in enumerate(filas, start=2):
        for col in ("razon_a", "razon_b", "razon"):
            if f[col] not in CODIGOS:
                sys.exit(f"Fila {i}: {col} = {f[col]!r} no es una de {sorted(CODIGOS)}")
        for col in ("alarma_a", "alarma_b", "alarma"):
            f[col] = int(f[col])

    # 1. Acuerdo entre las dos personas que etiquetaron (antes de mirar al decisor)
    print(f"Mensajes: {len(filas)}  (con alarma: {sum(f['alarma'] for f in filas)})")
    for nombre, a, b in [("razón", "razon_a", "razon_b"), ("alarma", "alarma_a", "alarma_b")]:
        xa, xb = [f[a] for f in filas], [f[b] for f in filas]
        acuerdo = sum(x == y for x, y in zip(xa, xb)) / len(filas)
        print(f"Acuerdo entre etiquetadores en {nombre}: {acuerdo:.0%} (kappa {kappa(xa, xb):.2f})")

    # 2. Decisor, una sola pasada
    for f in filas:
        d = decidir(f["texto"])
        f.update({"pred_razon": d["razon"], "pred_prob_razon": d["prob_razon"],
                  "pred_alarma": int(d["alarma"]), "pred_prob_alarma": d["prob_alarma"],
                  "pred_derivar": int(d["derivar"]), "motivo_derivar": d["motivo_derivar"] or ""})
    with SALIDA.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)

    # 3. Métricas del protocolo
    con = [f for f in filas if f["alarma"] == 1]
    sin = [f for f in filas if f["alarma"] == 0]
    perdidas = sum(1 for f in con if not f["pred_alarma"])
    falsas = sum(1 for f in sin if f["pred_alarma"])
    razon_ok = sum(f["pred_razon"] == f["razon"] for f in sin)
    derivados = sum(f["pred_derivar"] for f in filas)
    no_deriv = [f for f in sin if not f["pred_derivar"]]
    print(f"\nAlarmas perdidas: {perdidas} de {len(con)}"
          f"  (sensibilidad {1 - perdidas / len(con):.0%})" if con else "\nNo hay mensajes con alarma")
    print(f"Falsas alarmas: {falsas} de {len(sin)}")
    print(f"Razón correcta en mensajes sin alarma: {razon_ok} de {len(sin)} ({razon_ok / len(sin):.0%})")
    print(f"Derivados a una persona: {derivados} de {len(filas)} ({derivados / len(filas):.0%})")
    if no_deriv:
        ok = sum(f["pred_razon"] == f["razon"] for f in no_deriv)
        print(f"Razón correcta entre los no derivados: {ok} de {len(no_deriv)} ({ok / len(no_deriv):.0%})")

    # 4. Regla de decisión (sección 8)
    cumple = perdidas == 0 and len(sin) > 0 and razon_ok / len(sin) >= 0.80
    print("\nRegla del protocolo:", "SE CUMPLE: el decisor se usa." if cumple else
          "NO se cumple: todo 'Otro motivo' lo lee una persona y el decisor solo sugiere la razón.")


if __name__ == "__main__":
    main()
