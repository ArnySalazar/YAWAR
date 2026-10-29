"""Evaluación temporal 2024 -> 2025 (PROTOCOLO.md v1, sección 6). Mismos modelos M1 y M2."""
from pathlib import Path
import json
import numpy as np, pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import SplineTransformer, StandardScaler

DATOS = Path(__file__).resolve().parent.parent / "datos_procesados"

rng = np.random.default_rng(2026)

def prep(path):
    d = pd.read_csv(path, low_memory=False)
    c = d[d.en_cohorte_modelo == True].copy()
    c["y"] = (1 - c.tomo_7d).astype(int)
    c["controles"] = c.controles_cred_acum.fillna(c.controles_cred_acum.median())
    for k in ["recibio_jarabe", "recibio_gotas", "recibio_polvo"]:
        c[k] = c[k].fillna(0)
    return c.reset_index(drop=True)

tr, te = prep(DATOS / "tabla_nino_2024.csv"), prep(DATOS / "tabla_modelo_2025.csv")
med = tr.groupby("edad_meses").controles.median()
for df in (tr, te):
    df["atraso"] = df.controles - df.edad_meses.map(med).fillna(tr.controles.median())

def modelo(n):
    spl = SplineTransformer(n_knots=5, degree=3)
    if n == "M1":
        return Pipeline([("pre", ColumnTransformer([("e", spl, ["edad_meses"])])), ("lr", LogisticRegression(max_iter=2000))])
    return Pipeline([("pre", ColumnTransformer([("e", spl, ["edad_meses"]),
        ("n", StandardScaler(), ["controles", "atraso"]),
        ("p", "passthrough", ["recibio_jarabe", "recibio_gotas", "recibio_polvo"])])),
        ("lr", LogisticRegression(max_iter=2000))])

X = ["edad_meses", "controles", "atraso", "recibio_jarabe", "recibio_gotas", "recibio_polvo"]
p = {}
for n in ("M1", "M2"):
    m = modelo(n).fit(tr[X], tr.y)
    p[n] = m.predict_proba(te[X])[:, 1]
y = te.y.values

def ppv(y, s, q):
    k = int(round(q * len(y)))
    return y[np.argsort(-s, kind="stable")[:k]].mean()

def calib(y, s):
    lo = np.log(s / (1 - s))
    lr = LogisticRegression(C=1e6, max_iter=2000).fit(lo.reshape(-1, 1), y)
    return float(lr.intercept_[0]), float(lr.coef_[0][0])

res = {"n_entreno_2024": len(tr), "n_prueba_2025": len(te), "prev_2024": tr.y.mean(), "prev_2025": y.mean()}
for n in ("M1", "M2"):
    res[n] = {f"ppv{int(q*100)}": ppv(y, p[n], q) for q in (.1, .2, .3)}
    res[n]["auc"] = roc_auc_score(y, p[n])
    res[n]["calib_int_pend"] = calib(y, p[n])
    res[n]["pred_media"] = p[n].mean()

cong = te.conglomerado.values
uc = np.unique(cong); idx = {c: np.where(cong == c)[0] for c in uc}
dpp, dau = [], []
for _ in range(1000):
    ii = np.concatenate([idx[c] for c in rng.choice(uc, len(uc), replace=True)])
    dpp.append(ppv(y[ii], p["M2"][ii], .2) - ppv(y[ii], p["M1"][ii], .2))
    dau.append(roc_auc_score(y[ii], p["M2"][ii]) - roc_auc_score(y[ii], p["M1"][ii]))
res["dif_ppv20"] = [res["M2"]["ppv20"] - res["M1"]["ppv20"], *np.percentile(dpp, [2.5, 97.5])]
res["dif_auc"] = [res["M2"]["auc"] - res["M1"]["auc"], *np.percentile(dau, [2.5, 97.5])]

te["educ"] = pd.cut(te.nivel_educativo_madre, [-1, 2, 4, 5], labels=["hasta primaria", "secundaria", "superior"]).astype(str)
te["pM2"] = p["M2"]
eq = {}
for v in ("educ", "area"):
    for g, s in te.groupby(v):
        eq[f"{v}={g}"] = {"n": len(s), "obs": s.y.mean(), "pred": s.pM2.mean(),
                         "ppv20": ppv(s.y.values, s.pM2.values, .2), "auc": roc_auc_score(s.y, s.pM2)}
res["equidad"] = eq
print(json.dumps(res, indent=1, default=float, ensure_ascii=False))
json.dump(res, open(Path(__file__).with_name("resultados_temporal.json"), "w"), indent=1, default=float, ensure_ascii=False)
