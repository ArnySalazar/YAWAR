"""Ajusta M2 con ENDES 2024 + 2025 y exporta las tablas y coeficientes que usa puntuar.py.

El modelo ya se evaluó (RESULTADOS.md); aquí solo se reajusta con todos los datos.
Salida: modelo/m2_produccion.json. Los valores se copian a puntuar.py.
"""
import json
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import SplineTransformer, StandardScaler

DATOS = Path(__file__).resolve().parent.parent / "datos_procesados"
PRES = ["recibio_jarabe", "recibio_gotas", "recibio_polvo"]
X = ["edad_meses", "controles", "atraso", *PRES]


def prep(ruta):
    d = pd.read_csv(ruta, low_memory=False)
    c = d[d.en_cohorte_modelo == True].copy()
    c["y"] = (1 - c.tomo_7d).astype(int)
    c["controles"] = c.controles_cred_acum.fillna(c.controles_cred_acum.median())
    c[PRES] = c[PRES].fillna(0)
    return c


c = pd.concat([prep(DATOS / "tabla_nino_2024.csv"), prep(DATOS / "tabla_modelo_2025.csv")],
              ignore_index=True)
med = c.groupby("edad_meses").controles.median()
c["atraso"] = c.controles - c.edad_meses.map(med)
m = Pipeline([
    ("pre", ColumnTransformer([("e", SplineTransformer(n_knots=5, degree=3), ["edad_meses"]),
                               ("n", StandardScaler(), ["controles", "atraso"]),
                               ("p", "passthrough", PRES)])),
    ("lr", LogisticRegression(max_iter=2000)),
]).fit(c[X], c.y)

pre, lr = m.named_steps["pre"], m.named_steps["lr"]
coef, b0 = lr.coef_[0], lr.intercept_[0]
spl, sc = pre.named_transformers_["e"], pre.named_transformers_["n"]
nb = spl.n_features_out_
edades = pd.DataFrame({"edad_meses": range(6, 36)})
# Se pasa la escala estándar a coeficientes por unidad y se junta todo lo constante en la base
base = b0 + spl.transform(edades) @ coef[:nb] \
    - coef[nb] * sc.mean_[0] / sc.scale_[0] - coef[nb + 1] * sc.mean_[1] / sc.scale_[1]
salida = {
    "n": len(c),
    "base_logit": {int(e): round(float(v), 4) for e, v in zip(range(6, 36), base)},
    "b_controles": round(float(coef[nb] / sc.scale_[0]), 4),
    "b_atraso": round(float(coef[nb + 1] / sc.scale_[1]), 4),
    "b_presentacion": {k.removeprefix("recibio_"): round(float(v), 4)
                       for k, v in zip(PRES, coef[nb + 2:nb + 5])},
    "mediana_controles": {int(k): int(v) for k, v in med.loc[6:35].items()},
    "presentacion_media": {k.removeprefix("recibio_"): round(float(c[k].mean()), 3) for k in PRES},
}
Path(__file__).with_name("m2_produccion.json").write_text(json.dumps(salida, indent=1))
print(json.dumps({k: v for k, v in salida.items() if k != "base_logit"}, indent=1))
