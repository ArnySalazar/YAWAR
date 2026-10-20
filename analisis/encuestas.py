"""Estimador de proporciones para encuestas con estratos y conglomerados (ENDES).

Fuente única del cálculo usado en los cuadernos 04 y 05. Linealización de Taylor,
IC95 en escala logit con t de Student (gl = conglomerados - estratos).
Las pruebas del estimador están en el cuaderno 04 (sección 1).
"""
import math

import numpy as np
import pandas as pd

Z975 = 1.959963984540054


def t_cuantil_975(gl):
    # Cuantil 97,5 % de la t de Student (expansión de Cornish-Fisher; precisa para gl >= 30).
    z = Z975
    g1 = (z**3 + z) / 4
    g2 = (5 * z**5 + 16 * z**3 + 3 * z) / 96
    g3 = (3 * z**7 + 19 * z**5 + 17 * z**3 - 15 * z) / 384
    return z + g1 / gl + g2 / gl**2 + g3 / gl**3


def normal_cdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


class Diseno:
    # Diseño muestral de un año: pesos, estratos y conglomerados (UPM).

    def __init__(self, df, col_peso):
        self.df = df.reset_index(drop=True)
        self.w = pd.to_numeric(self.df[col_peso]).to_numpy(float) / 1_000_000
        estrato = self.df["estrato"].astype(str).to_numpy()
        clave = pd.Series(estrato + "|" + self.df["conglomerado"].astype(str).to_numpy())
        self.psu, psu_unicos = pd.factorize(clave)
        est_de_psu = pd.Series(estrato).groupby(self.psu).first().to_numpy()
        # Un conglomerado debe pertenecer a un solo estrato
        assert pd.Series(estrato).groupby(self.psu).nunique().max() == 1
        self.h, _ = pd.factorize(est_de_psu)
        self.P, self.H = len(psu_unicos), int(self.h.max()) + 1
        self.n_h = np.bincount(self.h, minlength=self.H)
        self.gl = self.P - self.H
        self.estratos_con_1_upm = int((self.n_h == 1).sum())

    def proporcion(self, y, dominio):
        # y: serie 0/1 (puede tener vacíos). dominio: máscara booleana (qué niños forman el grupo).
        yv = pd.to_numeric(pd.Series(y)).to_numpy(float)
        d = np.asarray(dominio, dtype=bool) & ~np.isnan(yv)
        n = int(d.sum())
        W = float(self.w[d].sum())
        if n == 0 or W == 0:
            return dict(estimacion=np.nan, se=np.nan, ic_inf=np.nan, ic_sup=np.nan, deff=np.nan, n=n, n_upm=0)
        y0 = np.where(d, yv, 0.0)
        p = float((self.w * d * y0).sum() / W)
        z = self.w * d * (y0 - p) / W                 # contribución linealizada de cada niño
        t = np.bincount(self.psu, weights=z, minlength=self.P)   # total por conglomerado
        media_h = np.bincount(self.h, weights=t, minlength=self.H) / self.n_h
        desv = t - media_h[self.h]
        ss_h = np.bincount(self.h, weights=desv**2, minlength=self.H)
        usable = self.n_h > 1                          # un estrato con 1 solo conglomerado no aporta varianza
        var = float((self.n_h[usable] / (self.n_h[usable] - 1) * ss_h[usable]).sum())
        se = math.sqrt(var)
        var_srs = p * (1 - p) / n
        deff = var / var_srs if var_srs > 0 else np.nan
        if 0 < p < 1 and se > 0:
            q = t_cuantil_975(self.gl)
            lg = math.log(p / (1 - p))
            s_lg = se / (p * (1 - p))
            lo, hi = 1 / (1 + math.exp(-(lg - q * s_lg))), 1 / (1 + math.exp(-(lg + q * s_lg)))
        else:
            lo = hi = np.nan
        return dict(estimacion=100 * p, se=100 * se, ic_inf=100 * lo, ic_sup=100 * hi, deff=deff,
                    n=n, n_upm=int(np.unique(self.psu[d]).size))


REGIONES = ["Lima Metropolitana", "Resto Costa", "Sierra", "Selva"]


def grupos(d):
    # Lista de (tipo de grupo, etiqueta, máscara). Solo incluye los grupos cuya columna existe en la tabla.
    out = [("Total", "Total", np.ones(len(d), bool))]
    for e in ["6-11", "12-23", "24-35"]:
        out.append(("Edad (meses)", e, (d["banda_edad"] == e).to_numpy()))
    for ar in ["Urbano", "Rural"]:
        out.append(("Área", ar, (d["area"] == ar).to_numpy()))
    if "region_natural" in d:
        for r in REGIONES:
            out.append(("Región natural", r, (d["region_natural"] == r).to_numpy()))
    for dep in sorted(d["departamento"].dropna().unique()):
        out.append(("Departamento", dep, (d["departamento"] == dep).to_numpy()))
    return out


def calcular(indicadores, tabs, disenos):
    filas = []
    for a in (2024, 2025):
        d = tabs[a]
        for ind in indicadores:
            D = disenos[(a, ind["peso"])]
            base = np.asarray(ind["dominio"](d), dtype=bool)
            y = ind["y"](d)
            for tipo, etiqueta, m in grupos(d):
                r = D.proporcion(y, base & m)
                filas.append({"indicador": ind["nombre"], "grupo_tipo": tipo, "grupo": etiqueta, "año": a,
                              "peso": ind["peso"], **r})
    out = pd.DataFrame(filas)
    cv = np.where(out["estimacion"] > 0, out["se"] / out["estimacion"], np.nan)
    out["fiabilidad"] = np.select([out["n"] < 30, cv > 0.30, cv > 0.15],
                                  ["n<30: no usar", "CV>30%: poco fiable", "CV 15-30%: con cautela"], "")
    return out


def ver(out, indicador, tipos, ancho_n=True):
    s = out[(out["indicador"] == indicador) & (out["grupo_tipo"].isin(tipos))].copy()
    s["cifra"] = s.apply(lambda r: f"{r['estimacion']:.1f} ({r['ic_inf']:.1f}–{r['ic_sup']:.1f})" if pd.notna(r["ic_inf"]) else f"{r['estimacion']:.1f}", axis=1)
    t = s.pivot_table(index=["grupo_tipo", "grupo"], columns="año", values=["cifra", "n"], aggfunc="first", sort=False)
    t.columns = [f"{c[0]} {c[1]}" if c[0] == "cifra" else f"n {c[1]}" for c in t.columns]
    t = t[[c for c in t.columns if c.startswith("cifra")] + [c for c in t.columns if c.startswith("n ")]]
    return t.rename(columns={"cifra 2024": "% 2024 (IC95)", "cifra 2025": "% 2025 (IC95)"})


def error_estandar_jackknife(d, y, dominio, col_peso):
    w = pd.to_numeric(d[col_peso]).to_numpy(float) / 1_000_000
    y = pd.to_numeric(y).to_numpy(float)
    ok = np.asarray(dominio, bool) & ~np.isnan(y)
    psu = d["estrato"].astype(str).to_numpy() + "|" + d["conglomerado"].astype(str).to_numpy()
    t = pd.DataFrame({"h": d["estrato"].to_numpy(), "c": psu, "N": w * ok * np.where(ok, y, 0.0), "D": w * ok})
    cc = t.groupby(["h", "c"], as_index=False)[["N", "D"]].sum()
    hh = cc.groupby("h").agg(nh=("c", "size"), Nh=("N", "sum"), Dh=("D", "sum")).reset_index()
    cc = cc.merge(hh, on="h")
    NT, DT = cc["N"].sum(), cc["D"].sum()
    theta = NT / DT
    with np.errstate(divide="ignore", invalid="ignore"):
        f = cc["nh"] / (cc["nh"] - 1)
        th = (NT - cc["Nh"] + f * (cc["Nh"] - cc["N"])) / (DT - cc["Dh"] + f * (cc["Dh"] - cc["D"]))
    usable = cc["nh"] > 1
    var = (((cc["nh"] - 1) / cc["nh"]) * (th - theta) ** 2)[usable].sum()
    return 100 * theta, 100 * math.sqrt(var)



def diferencias(out):
    a = out[out["año"] == 2024].set_index(["indicador", "grupo_tipo", "grupo"])
    b = out[out["año"] == 2025].set_index(["indicador", "grupo_tipo", "grupo"])
    j = a[["estimacion", "se", "n"]].join(b[["estimacion", "se", "n"]], lsuffix="_2024", rsuffix="_2025")
    j["cambio_pp"] = j["estimacion_2025"] - j["estimacion_2024"]
    j["se_cambio"] = np.sqrt(j["se_2024"] ** 2 + j["se_2025"] ** 2)
    j["ic_inf"] = j["cambio_pp"] - Z975 * j["se_cambio"]
    j["ic_sup"] = j["cambio_pp"] + Z975 * j["se_cambio"]
    j["p_valor"] = [2 * (1 - normal_cdf(abs(c / s))) if s > 0 else np.nan for c, s in zip(j["cambio_pp"], j["se_cambio"])]
    j["distinto_de_0"] = np.where((j["ic_inf"] > 0) | (j["ic_sup"] < 0), "sí", "no")
    return j.reset_index()

