"""Función de puntaje (Contrato 2): modelo M2 del protocolo del modelo.

Regresión logística con la edad en splines (5 nodos, grado 3), los controles CRED,
el atraso en controles para la edad y la presentación del hierro, ajustada con
ENDES 2024 y 2025 (cohorte del modelo, n = 14,516, sin ponderar). Se guarda como
tablas y coeficientes para no depender de scikit-learn en el servidor.

Evaluación (ver modelo/RESULTADOS.md): frente a ordenar solo por edad, gana unos
3 puntos en la proporción de aciertos al buscar primero al 20 %; la diferencia no fue
significativa en la prueba apartada y sí en la temporal (2024 -> 2025). Se usa de forma
provisional y se recalibra con datos del establecimiento en el modo silencioso del piloto.

Entrada: DataFrame con id_nino, edad_meses, controles_cred y, opcional, presentacion_hierro
("gotas", "jarabe", "polvo" o varias separadas por "+"; vacío = no se sabe).
Salida: DataFrame con id_nino, prob_no_consumo (0 a 1) y motivos (texto corto).
"""
import math

import pandas as pd

VARIABLES_MODELO = ["edad_meses", "controles_cred"]

# Parte del logit que depende solo de la edad en meses (incluye el intercepto)
BASE_POR_EDAD = {
    6: 0.4715, 7: 0.6088, 8: 0.8397, 9: 1.1395, 10: 1.4835, 11: 1.8471,
    12: 2.2056, 13: 2.5343, 14: 2.8107, 15: 3.0316, 16: 3.2039, 17: 3.3343,
    18: 3.4297, 19: 3.4969, 20: 3.5427, 21: 3.574, 22: 3.5973, 23: 3.6192,
    24: 3.6461, 25: 3.6844, 26: 3.7406, 27: 3.821, 28: 3.9322, 29: 4.0749,
    30: 4.2391, 31: 4.4134, 32: 4.5865, 33: 4.7471, 34: 4.8839, 35: 4.9855,
}
B_CONTROLES = -0.1659
B_ATRASO = 0.092
B_PRESENTACION = {"jarabe": -0.1155, "gotas": -0.0305, "polvo": -0.1424}
# Si no se sabe la presentación, se usa la proporción de la cohorte (imputación por la media)
PRESENTACION_SI_FALTA = {"jarabe": 0.602, "gotas": 0.546, "polvo": 0.196}
# Mediana de controles CRED acumulados por edad en meses (ENDES 2024-2025)
MEDIANA_CONTROLES = {
    6: 9, 7: 10, 8: 11, 9: 11, 10: 12, 11: 13, 12: 14, 13: 14, 14: 14, 15: 15,
    16: 16, 17: 16, 18: 17, 19: 16, 20: 17, 21: 17, 22: 18, 23: 17, 24: 18, 25: 18,
    26: 18, 27: 19, 28: 20, 29: 19, 30: 20, 31: 20, 32: 20, 33: 21, 34: 20, 35: 21,
}


def _presentaciones(valor) -> dict:
    if valor is None or (isinstance(valor, float) and math.isnan(valor)) or not str(valor).strip():
        return PRESENTACION_SI_FALTA
    tiene = {p.strip().lower() for p in str(valor).split("+")}
    return {k: float(k in tiene) for k in B_PRESENTACION}


def _uno(edad: int, controles: int, presentacion) -> tuple[float, str]:
    e = min(max(int(edad), 6), 35)
    atraso = int(controles) - MEDIANA_CONTROLES[e]
    pres = _presentaciones(presentacion)
    z = BASE_POR_EDAD[e] + B_CONTROLES * int(controles) + B_ATRASO * atraso
    z += sum(B_PRESENTACION[k] * pres[k] for k in B_PRESENTACION)
    p = 1 / (1 + math.exp(-z))

    motivos = [f"tiene {e} meses"]
    if atraso <= -2:
        motivos.append(f"tiene {-atraso} controles CRED menos que lo usual a su edad")
    elif atraso >= 2:
        motivos.append("sus controles CRED están al día")
    return round(p, 3), "; ".join(motivos)


def puntuar(df: pd.DataFrame) -> pd.DataFrame:
    faltan = [c for c in ["id_nino", *VARIABLES_MODELO] if c not in df.columns]
    if faltan:
        raise ValueError(f"Faltan columnas para puntuar: {faltan}")
    pres = df["presentacion_hierro"] if "presentacion_hierro" in df.columns else [None] * len(df)
    res = [_uno(e, c, p) for e, c, p in zip(df["edad_meses"], df["controles_cred"], pres)]
    return pd.DataFrame({
        "id_nino": df["id_nino"].values,
        "prob_no_consumo": [r[0] for r in res],
        "motivos": [r[1] for r in res],
    })
