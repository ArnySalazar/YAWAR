"""Modelo de riesgo de no consumo de hierro (YAWAR). Sigue PROTOCOLO.md v1."""
from pathlib import Path
import json
import sys

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, SplineTransformer, StandardScaler

DATOS = Path(__file__).resolve().parent.parent / "datos_procesados"

SEMILLA = 2026
rng = np.random.default_rng(SEMILLA)

# ---------- datos ----------
d = pd.read_csv(DATOS / "tabla_modelo_2025.csv", low_memory=False)
c = d[d.en_cohorte_modelo == True].copy()
c["y"] = (1 - c.tomo_7d).astype(int)
c["controles"] = c.controles_cred_acum.fillna(c.controles_cred_acum.median())
for k in ["recibio_jarabe", "recibio_gotas", "recibio_polvo"]:
    c[k] = c[k].fillna(0)
c["w"] = c.factor_expansion_crudo / 1e6
c["lengua_grupo"] = np.where(c.lengua_materna == 10, "castellano", "originaria")
c["quintil_grupo"] = pd.cut(c.quintil_riqueza, [0, 2, 3, 5], labels=["Q1-2", "Q3", "Q4-5"]).astype(str)
c["educ_grupo"] = pd.cut(c.nivel_educativo_madre, [-1, 2, 4, 5], labels=["hasta primaria", "secundaria", "superior"]).astype(str)
c = c.reset_index(drop=True)

# ---------- particion por conglomerado ----------
congl = c.conglomerado.unique()
prueba_cong = set(rng.choice(congl, size=int(round(0.25 * len(congl))), replace=False))
c["prueba"] = c.conglomerado.isin(prueba_cong)
dev, test = c[~c.prueba].copy(), c[c.prueba].copy()


def agregar_atraso(entreno, otros):
    """Controles del niño menos la mediana de su edad en meses, calculada solo con el entrenamiento."""
    med = entreno.groupby("edad_meses").controles.median()
    for df in [entreno, *otros]:
        df["atraso"] = df.controles - df.edad_meses.map(med).fillna(entreno.controles.median())


EDAD = ["edad_meses"]
PRINC = ["edad_meses", "controles", "atraso", "recibio_jarabe", "recibio_gotas", "recibio_polvo"]
GEO_NUM, GEO_CAT = ["altitud_msnm"], ["area", "region_natural"]


def modelo(nombre):
    spl = SplineTransformer(n_knots=5, degree=3)
    if nombre == "M1":
        pre = ColumnTransformer([("edad", spl, EDAD)])
        return Pipeline([("pre", pre), ("lr", LogisticRegression(max_iter=2000))]), EDAD
    if nombre == "M2":
        pre = ColumnTransformer([
            ("edad", spl, EDAD),
            ("num", StandardScaler(), ["controles", "atraso"]),
            ("pres", "passthrough", ["recibio_jarabe", "recibio_gotas", "recibio_polvo"]),
        ])
        return Pipeline([("pre", pre), ("lr", LogisticRegression(max_iter=2000))]), PRINC
    if nombre == "M3":
        pre = ColumnTransformer([
            ("edad", spl, EDAD),
            ("num", StandardScaler(), ["controles", "atraso"] + GEO_NUM),
            ("pres", "passthrough", ["recibio_jarabe", "recibio_gotas", "recibio_polvo"]),
            ("geo", OneHotEncoder(drop="first"), GEO_CAT),
        ])
        return Pipeline([("pre", pre), ("lr", LogisticRegression(max_iter=2000))]), PRINC + GEO_NUM + GEO_CAT
    if nombre == "M4":
        return HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=300,
                                              random_state=SEMILLA), PRINC
    raise ValueError(nombre)


def ppv_at(y, p, frac, w=None):
    n = int(np.ceil(frac * len(y)))
    orden = np.argsort(-p, kind="stable")[:n]
    if w is None:
        return float(np.mean(y[orden]))
    return float(np.average(y[orden], weights=w[orden]))


def calibracion(y, p):
    """Intercepto y pendiente de calibración (logística de y sobre logit(p))."""
    lp = np.log(np.clip(p, 1e-6, 1 - 1e-6) / (1 - np.clip(p, 1e-6, 1 - 1e-6)))
    m = LogisticRegression(C=1e6, max_iter=1000).fit(lp.reshape(-1, 1), y)
    m0 = LogisticRegression(C=1e6, max_iter=1000, fit_intercept=True)
    # calibración en el conjunto: intercepto con pendiente fija en 1 (aproximado por diferencia de logits medios)
    citl = np.log(y.mean() / (1 - y.mean())) - np.log(p.mean() / (1 - p.mean()))
    return float(citl), float(m.coef_[0][0])


def metricas(y, p, w=None):
    return {
        "PPV10": ppv_at(y, p, 0.10, w), "PPV20": ppv_at(y, p, 0.20, w), "PPV30": ppv_at(y, p, 0.30, w),
        "AUC": float(roc_auc_score(y, p, sample_weight=w)),
        "Brier": float(brier_score_loss(y, p, sample_weight=w)),
    }


def ajustar_predecir(nombre, entreno, evalua):
    entreno, evalua = entreno.copy(), evalua.copy()
    agregar_atraso(entreno, [evalua])
    m, cols = modelo(nombre)
    m.fit(entreno[cols], entreno.y)
    return m.predict_proba(evalua[cols])[:, 1], m, entreno, evalua


if __name__ == "__main__":
    fase = sys.argv[1] if len(sys.argv) > 1 else "desarrollo"
    MODELOS = ["M1", "M2", "M3", "M4"]

    if fase == "desarrollo":
        print(f"desarrollo n={len(dev)} ({dev.conglomerado.nunique()} congl.)  prueba n={len(test)} "
              f"({test.conglomerado.nunique()} congl.)  prevalencia dev={dev.y.mean():.3f} prueba={test.y.mean():.3f}")
        gkf = GroupKFold(n_splits=5)
        oof = {k: np.zeros(len(dev)) for k in MODELOS}
        for tr, va in gkf.split(dev, dev.y, dev.conglomerado):
            for k in MODELOS:
                p, *_ = ajustar_predecir(k, dev.iloc[tr], dev.iloc[va])
                oof[k][va] = p
        y = dev.y.values
        filas = {"M0 azar": {"PPV10": y.mean(), "PPV20": y.mean(), "PPV30": y.mean(), "AUC": 0.5,
                             "Brier": float(np.mean((y - y.mean()) ** 2))}}
        for k in MODELOS:
            filas[k] = metricas(y, oof[k])
            filas[k]["calib_intercepto"], filas[k]["calib_pendiente"] = calibracion(y, oof[k])
        print(pd.DataFrame(filas).T.round(3))

    if fase == "prueba":
        # ÚNICO uso de la prueba apartada (protocolo, sección 6)
        res, preds = {}, {}
        for k in MODELOS:
            p, m, ent, ev = ajustar_predecir(k, dev, test)
            preds[k] = p
            if k == "M2":
                m2, ev2 = m, ev
        y, w = test.y.values, test.w.values
        g = test.conglomerado.values
        filas = {"M0 azar": {"PPV10": y.mean(), "PPV20": y.mean(), "PPV30": y.mean(), "AUC": 0.5}}
        for k in MODELOS:
            filas[k] = metricas(y, preds[k])
            filas[k]["calib_intercepto"], filas[k]["calib_pendiente"] = calibracion(y, preds[k])
        print("PRUEBA APARTADA, sin ponderar (n=%d)" % len(y))
        print(pd.DataFrame(filas).T.round(3))
        print("\nSensibilidad ponderada por factor de expansión")
        print(pd.DataFrame({k: metricas(y, preds[k], w) for k in ["M1", "M2"]}).T.round(3),
              "\nprevalencia ponderada %.3f" % np.average(y, weights=w))

        # bootstrap por conglomerados
        uc = np.unique(g); idx_por_c = {cc: np.where(g == cc)[0] for cc in uc}
        bs = {"PPV20_M1": [], "PPV20_M2": [], "dif_PPV20": [], "AUC_M1": [], "AUC_M2": [], "dif_AUC": []}
        brng = np.random.default_rng(SEMILLA)
        for _ in range(1000):
            s = brng.choice(uc, size=len(uc), replace=True)
            ii = np.concatenate([idx_por_c[cc] for cc in s])
            a1, a2 = ppv_at(y[ii], preds["M1"][ii], .2), ppv_at(y[ii], preds["M2"][ii], .2)
            u1, u2 = roc_auc_score(y[ii], preds["M1"][ii]), roc_auc_score(y[ii], preds["M2"][ii])
            for kk, v in zip(bs, [a1, a2, a2 - a1, u1, u2, u2 - u1]):
                bs[kk].append(v)
        print("\nIC 95 % bootstrap (1.000 remuestreos de conglomerados)")
        ic = {k: (float(np.mean(v)), float(np.percentile(v, 2.5)), float(np.percentile(v, 97.5))) for k, v in bs.items()}
        for k, (mu, lo, hi) in ic.items():
            print(f"  {k:10s} {mu:.3f}  [{lo:.3f}, {hi:.3f}]")

        # equidad
        print("\nSubgrupos (M2 y M1 en la prueba)")
        filas = []
        for var in ["lengua_grupo", "quintil_grupo", "educ_grupo", "area"]:
            for nivel, sub in test.groupby(var):
                ii = test.index.get_indexer(sub.index)
                yy = y[ii]
                fila = {"variable": var, "grupo": nivel, "n": len(ii), "no_tomo_obs": yy.mean(),
                        "pred_M2": preds["M2"][ii].mean()}
                for k in ["M1", "M2"]:
                    fila[f"AUC_{k}"] = roc_auc_score(yy, preds[k][ii]) if len(set(yy)) > 1 else np.nan
                    fila[f"PPV20_{k}"] = ppv_at(yy, preds[k][ii], .2)
                filas.append(fila)
        sg = pd.DataFrame(filas)
        print(sg.round(3).to_string(index=False))

        # coeficientes del modelo final (M2 ajustado con todo el desarrollo)
        nombres = m2.named_steps["pre"].get_feature_names_out()
        coef = pd.Series(m2.named_steps["lr"].coef_[0], index=nombres)
        print("\nCoeficientes M2 (no spline):")
        print(coef[[n for n in nombres if "edad" not in n]].round(3))

        # calibración por deciles
        q = pd.qcut(preds["M2"], 10, labels=False, duplicates="drop")
        cal = pd.DataFrame({"pred": preds["M2"], "obs": y, "q": q}).groupby("q").mean()
        print("\nCalibración M2 por deciles\n", cal.round(3).to_string())
        json.dump({"ic": ic, "subgrupos": sg.to_dict("records"), "calib": cal.reset_index().to_dict("records"),
                   "tabla": {k: metricas(y, preds[k]) for k in MODELOS}},
                  open(Path(__file__).with_name("resultados_prueba.json"), "w"), indent=1, default=float)
