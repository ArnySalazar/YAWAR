"""Preparación compartida de las variables del modelo M3.

Este módulo es usado tanto al reajustar el modelo como al puntuar en producción.
Mantener una única transformación evita diferencias entre entrenamiento e inferencia.
"""

from __future__ import annotations

import re
from collections.abc import Mapping

import numpy as np
import pandas as pd


PRESENTACIONES = ["recibio_jarabe", "recibio_gotas", "recibio_polvo"]
VARIABLES_MODELO = [
    "edad_meses",
    "atraso_cred",
    *PRESENTACIONES,
    "n_cred_con_fecha",
    "lugar_cred_codigo",
]


def _a_numerico(serie: pd.Series, nombre: str) -> pd.Series:
    """Convierte a número sin ocultar valores de texto inválidos."""
    convertido = pd.to_numeric(serie, errors="coerce")
    invalidos = serie.notna() & serie.astype("string").str.strip().ne("") & convertido.isna()
    if invalidos.any():
        ejemplos = serie.loc[invalidos].astype(str).drop_duplicates().head(5).tolist()
        raise ValueError(f"{nombre} contiene valores no numéricos: {ejemplos}")
    return convertido


def _banderas_desde_texto(serie: pd.Series) -> pd.DataFrame:
    """Convierte 'jarabe+gotas', etc. en las tres banderas del modelo."""
    resultado = pd.DataFrame(index=serie.index)
    limpio = serie.astype("string").str.lower().str.strip()

    patrones = {
        "recibio_jarabe": r"\bjarabe\b",
        "recibio_gotas": r"\bgotas?\b",
        "recibio_polvo": r"\b(?:polvo|polvos|micronutrientes?|sprinkles?)\b",
    }
    for columna, patron in patrones.items():
        resultado[columna] = limpio.str.contains(patron, regex=True, na=False).astype(float)

    # Una presentación vacía significa desconocida, no ausencia confirmada.
    faltante = limpio.isna() | limpio.eq("")
    resultado.loc[faltante, PRESENTACIONES] = np.nan

    separadores = re.compile(r"\s*(?:\+|,|;|/)\s*")
    conocidos = {"jarabe", "gota", "gotas", "polvo", "polvos", "micronutriente",
                 "micronutrientes", "sprinkle", "sprinkles"}
    desconocidos = []
    for indice, valor in limpio.loc[~faltante].items():
        partes = {p for p in separadores.split(valor) if p}
        if partes and not partes.issubset(conocidos):
            desconocidos.append((indice, valor))
    if desconocidos:
        ejemplos = list(dict.fromkeys(v for _, v in desconocidos))[:5]
        raise ValueError(f"presentacion_hierro contiene categorías no reconocidas: {ejemplos}")

    return resultado


def preparar_predictores(
    datos: pd.DataFrame,
    mediana_controles_por_edad: Mapping[int | str, float],
    mediana_controles_global: float,
) -> pd.DataFrame:
    """Valida entradas y devuelve exactamente los predictores de M3.

    Se acepta ``controles_cred`` como alias de ``controles_cred_acum`` y la
    presentación puede venir como tres banderas o como ``presentacion_hierro``.
    Los faltantes legítimos se conservan para que los trate el pipeline.
    """
    d = datos.copy()

    if "controles_cred_acum" not in d and "controles_cred" in d:
        d["controles_cred_acum"] = d["controles_cred"]

    requeridas = ["edad_meses", "controles_cred_acum", "n_cred_con_fecha", "lugar_cred_codigo"]
    faltan = [c for c in requeridas if c not in d.columns]
    if faltan:
        raise ValueError(f"Faltan columnas para puntuar: {faltan}")

    tiene_banderas = all(c in d.columns for c in PRESENTACIONES)
    if not tiene_banderas:
        if "presentacion_hierro" not in d.columns:
            raise ValueError(
                "Faltan las tres banderas de presentación o la columna presentacion_hierro"
            )
        d[PRESENTACIONES] = _banderas_desde_texto(d["presentacion_hierro"])

    numericas = [
        "edad_meses",
        "controles_cred_acum",
        "n_cred_con_fecha",
        "lugar_cred_codigo",
        *PRESENTACIONES,
    ]
    for columna in numericas:
        d[columna] = _a_numerico(d[columna], columna)

    if d["edad_meses"].isna().any():
        raise ValueError("edad_meses no puede estar vacía")
    fuera_rango = ~d["edad_meses"].between(6, 35)
    if fuera_rango.any():
        valores = sorted(d.loc[fuera_rango, "edad_meses"].drop_duplicates().tolist())[:10]
        raise ValueError(f"edad_meses debe estar entre 6 y 35; se encontraron: {valores}")

    for columna in ["controles_cred_acum", "n_cred_con_fecha"]:
        negativos = d[columna].notna() & d[columna].lt(0)
        if negativos.any():
            raise ValueError(f"{columna} no puede contener valores negativos")

    for columna in PRESENTACIONES:
        invalidas = d[columna].notna() & ~d[columna].isin([0, 1])
        if invalidas.any():
            valores = d.loc[invalidas, columna].drop_duplicates().tolist()[:5]
            raise ValueError(f"{columna} debe ser 0, 1 o faltante; se encontraron: {valores}")

    medianas = {int(k): float(v) for k, v in mediana_controles_por_edad.items()}
    esperado = d["edad_meses"].round().astype(int).map(medianas).fillna(float(mediana_controles_global))
    d["atraso_cred"] = d["controles_cred_acum"] - esperado

    return d[VARIABLES_MODELO].copy()
