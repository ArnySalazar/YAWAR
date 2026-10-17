"""Función de puntaje (Contrato 2).

ESTA ES UNA VERSIÓN DE PRUEBA. Jose la reemplaza por el modelo real entrenado con ENDES,
manteniendo exactamente la misma firma y el mismo formato de salida.

Entrada: DataFrame con al menos las columnas del padrón marcadas como variables del modelo
(edad_meses, area, region, altitud_msnm, controles_cred) más id_nino.
Salida: DataFrame con id_nino, prob_no_consumo (0 a 1) y motivos (texto corto en palabras simples).
"""
import pandas as pd

VARIABLES_MODELO = ["edad_meses", "area", "region", "altitud_msnm", "controles_cred"]


def puntuar(df: pd.DataFrame) -> pd.DataFrame:
    faltan = [c for c in ["id_nino", *VARIABLES_MODELO] if c not in df.columns]
    if faltan:
        raise ValueError(f"Faltan columnas para puntuar: {faltan}")

    # Regla provisional, NO es el modelo: solo sirve para que la API y el panel avancen.
    # Toma la dirección de lo visto en ENDES 2025 (el consumo cae con la edad).
    edad = df["edad_meses"].clip(6, 35)
    p = 0.25 + 0.4 * (edad - 6) / 29
    p = p + 0.10 * (df["area"].str.lower() == "rural")
    p = p + 0.10 * (df["controles_cred"] == 0)
    p = p.clip(0.01, 0.99).round(3)

    def motivos(fila) -> str:
        m = []
        if fila.edad_meses >= 18:
            m.append("tiene 18 meses o más")
        if str(fila.area).lower() == "rural":
            m.append("vive en zona rural")
        if fila.controles_cred == 0:
            m.append("sin controles recientes")
        return "; ".join(m[:3]) or "sin factores destacados"

    return pd.DataFrame({
        "id_nino": df["id_nino"].values,
        "prob_no_consumo": p.values,
        "motivos": df.apply(motivos, axis=1).values,
    })
