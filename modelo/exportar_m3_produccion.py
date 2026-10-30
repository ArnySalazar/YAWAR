"""Reajusta M3 con ENDES 2024+2025 y exporta el artefacto de producción.

El modelo ya fue comparado y evaluado temporalmente en los notebooks de
experimentación. Este script no vuelve a seleccionar el algoritmo: usa la
configuración ganadora fijada y la reajusta con toda la cohorte disponible.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, SplineTransformer, StandardScaler

try:
    from .m3_features import PRESENTACIONES, VARIABLES_MODELO, preparar_predictores
except ImportError:  # Permite ejecutar: python modelo/exportar_m3_produccion.py
    from m3_features import PRESENTACIONES, VARIABLES_MODELO, preparar_predictores


RAIZ = Path(__file__).resolve().parent.parent
RUTA_DATOS = RAIZ / "datos_procesados" / "tabla_modelo_2024_2025_limpia.csv"
RUTA_MODELO = Path(__file__).with_name("m3_produccion.joblib")
RUTA_METADATA = Path(__file__).with_name("m3_produccion_metadata.json")


def sha256(ruta: Path) -> str:
    resumen = hashlib.sha256()
    with ruta.open("rb") as archivo:
        for bloque in iter(lambda: archivo.read(1024 * 1024), b""):
            resumen.update(bloque)
    return resumen.hexdigest()


def crear_pipeline() -> Pipeline:
    edad = Pipeline([
        ("imputar", SimpleImputer(strategy="median")),
        ("spline", SplineTransformer(n_knots=7, degree=3, include_bias=False)),
    ])
    numericas = Pipeline([
        ("imputar", SimpleImputer(strategy="median", add_indicator=True)),
        ("escalar", StandardScaler()),
    ])
    binarias = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent", add_indicator=True)),
    ])
    categorica = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent", add_indicator=True)),
        ("onehot", OneHotEncoder(
            handle_unknown="infrequent_if_exist",
            min_frequency=20,
            sparse_output=False,
        )),
    ])

    preprocesador = ColumnTransformer([
        ("edad", edad, ["edad_meses"]),
        ("numericas", numericas, ["atraso_cred", "n_cred_con_fecha"]),
        ("presentaciones", binarias, PRESENTACIONES),
        ("lugar_cred", categorica, ["lugar_cred_codigo"]),
    ])

    clasificador = LogisticRegression(
        penalty="elasticnet",
        C=0.3,
        l1_ratio=0.5,
        solver="saga",
        max_iter=4000,
        tol=1e-3,
        random_state=2026,
    )
    return Pipeline([("preprocesador", preprocesador), ("modelo", clasificador)])


def main() -> None:
    if not RUTA_DATOS.exists():
        raise FileNotFoundError(f"No se encontró la tabla limpia: {RUTA_DATOS}")

    datos = pd.read_csv(RUTA_DATOS, low_memory=False)
    requeridas = ["en_cohorte_modelo", "tomo_7d", "anio", "controles_cred_acum"]
    faltan = [c for c in requeridas if c not in datos.columns]
    if faltan:
        raise ValueError(f"La tabla de entrenamiento no contiene: {faltan}")

    cohorte = datos.loc[
        datos["en_cohorte_modelo"].eq(True) & datos["tomo_7d"].isin([0, 1])
    ].copy()
    if cohorte.empty:
        raise ValueError("La cohorte de entrenamiento quedó vacía")

    objetivo = (1 - cohorte["tomo_7d"].astype(int)).rename("no_tomo_7d")
    controles = pd.to_numeric(cohorte["controles_cred_acum"], errors="coerce")
    edades = pd.to_numeric(cohorte["edad_meses"], errors="coerce")
    medianas_edad = controles.groupby(edades.round().astype("Int64")).median().dropna().to_dict()
    mediana_global = float(controles.median())

    predictores = preparar_predictores(cohorte, medianas_edad, mediana_global)
    pipeline = crear_pipeline().fit(predictores, objetivo)

    por_anio = cohorte.groupby("anio").size().sort_index()
    prevalencia_anio = objetivo.groupby(cohorte["anio"]).mean().sort_index()
    metadata = {
        "nombre": "YAWAR_M3_no_tomo_7d",
        "version": "1.0.0-provisional",
        "estado": "provisional; pendiente de recalibración y validación en piloto",
        "creado_utc": datetime.now(timezone.utc).isoformat(),
        "objetivo": "no_tomo_7d = 1 si el niño no tomó hierro en los últimos 7 días",
        "probabilidades_calibradas": False,
        "uso_recomendado_actual": "ordenar o priorizar niños por riesgo relativo",
        "anios_entrenamiento": [int(v) for v in sorted(cohorte["anio"].unique())],
        "n_entrenamiento": int(len(cohorte)),
        "n_por_anio": {str(int(k)): int(v) for k, v in por_anio.items()},
        "prevalencia_no_tomo_7d": float(objetivo.mean()),
        "prevalencia_por_anio": {str(int(k)): float(v) for k, v in prevalencia_anio.items()},
        "variables_modelo": VARIABLES_MODELO,
        "entradas_api": [
            "id_nino",
            "edad_meses",
            "controles_cred_acum (o controles_cred)",
            "recibio_jarabe/recibio_gotas/recibio_polvo (o presentacion_hierro)",
            "n_cred_con_fecha",
            "lugar_cred_codigo",
        ],
        "hiperparametros": {
            "splines_edad_n_knots": 7,
            "splines_edad_degree": 3,
            "regresion_penalty": "elasticnet",
            "regresion_C": 0.3,
            "regresion_l1_ratio": 0.5,
            "regresion_solver": "saga",
            "random_state": 2026,
        },
        "mediana_controles_global": mediana_global,
        "mediana_controles_por_edad": {
            str(int(k)): float(v) for k, v in sorted(medianas_edad.items())
        },
        "archivo_entrenamiento": str(RUTA_DATOS.relative_to(RAIZ)),
        "sha256_entrenamiento": sha256(RUTA_DATOS),
        "versiones": {
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
            "joblib": joblib.__version__,
        },
    }

    artefacto = {
        "metadata": metadata,
        "mediana_controles_por_edad": metadata["mediana_controles_por_edad"],
        "mediana_controles_global": mediana_global,
        "pipeline": pipeline,
    }
    joblib.dump(artefacto, RUTA_MODELO, compress=3)
    RUTA_METADATA.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")

    # Prueba de serialización: el modelo recargado debe producir lo mismo.
    recargado = joblib.load(RUTA_MODELO)
    muestra = predictores.sample(min(1000, len(predictores)), random_state=2026)
    antes = pipeline.predict_proba(muestra)[:, 1]
    despues = recargado["pipeline"].predict_proba(muestra)[:, 1]
    if not np.array_equal(antes, despues):
        raise AssertionError("Las predicciones cambiaron al serializar el modelo")

    print(f"Modelo guardado en: {RUTA_MODELO}")
    print(f"Metadatos guardados en: {RUTA_METADATA}")
    print(f"Registros de entrenamiento: {len(cohorte):,}")
    print(f"Prevalencia no_tomo_7d: {objetivo.mean():.2%}")
    print("Prueba de serialización: OK (coincidencia exacta)")
    print("Aviso: las probabilidades aún no están recalibradas con datos del piloto.")


if __name__ == "__main__":
    main()
