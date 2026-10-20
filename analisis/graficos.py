"""Estilo y utilidades de gráficos del equipo YAWAR (cuadernos 01-05).

Reglas (método dataviz): un color por entidad y siempre el mismo; marcas finas;
rejilla de línea fina; texto en tinta (nunca en el color de la serie); leyenda cuando
hay 2 o más series; un solo eje; cada gráfico dice si es ponderado, año y edades.
Paleta categórica validada con validate_palette.js (azul/naranja y violeta/aqua).
"""
from pathlib import Path

import matplotlib
import matplotlib.pyplot as plt
import numpy as np

CARPETA = Path(__file__).resolve().parent / "graficos"

# Superficie y tintas
SUPERFICIE, TINTA, TINTA2, APAGADO = "#fcfcfb", "#0b0b0b", "#52514e", "#898781"
REJILLA, EJE = "#e1e0d9", "#c3c2b7"
# Entidades -> color fijo
AZUL, NARANJA, VIOLETA, AQUA = "#2a78d6", "#eb6834", "#6250d6", "#1baf7a"
COLOR_ANIO = {2024: AZUL, 2025: NARANJA}      # comparaciones entre años
COLOR_RECIBIO, COLOR_TOMO = VIOLETA, AQUA     # recibió hierro / tomó hierro
BANDAS = ["6-11", "12-23", "24-35"]


def estilo():
    matplotlib.rcParams.update({
        "font.family": ["Carlito", "DejaVu Sans"], "font.size": 11,
        "figure.facecolor": SUPERFICIE, "axes.facecolor": SUPERFICIE, "savefig.facecolor": SUPERFICIE,
        "axes.edgecolor": EJE, "axes.labelcolor": TINTA2, "axes.titlecolor": TINTA,
        "axes.titlesize": 13, "axes.titleweight": "semibold", "axes.titlelocation": "left",
        "axes.spines.top": False, "axes.spines.right": False, "axes.spines.left": False,
        "xtick.color": TINTA2, "ytick.color": TINTA2, "xtick.major.size": 0, "ytick.major.size": 0,
        "text.color": TINTA, "legend.frameon": False, "legend.fontsize": 10,
        "figure.dpi": 100, "savefig.dpi": 110,
    })


estilo()


def rejilla(ax, eje="y"):
    # Rejilla de línea fina, sólida y apagada, solo en el eje de las magnitudes.
    ax.set_axisbelow(True)
    ax.grid(axis=eje, color=REJILLA, linewidth=0.8, linestyle="-")
    ax.spines["bottom"].set_color(EJE)
    if eje == "x":
        ax.spines["bottom"].set_visible(False)


def pie(fig, texto, y=0.005):
    fig.text(0.01, y, texto, fontsize=8.5, color=APAGADO, ha="left", va="bottom")


def guardar(fig, nombre, dpi=200):
    # Guarda el PNG en analisis/graficos/ (para el pitch y la ficha).
    CARPETA.mkdir(exist_ok=True)
    ruta = CARPETA / f"{nombre}.png"
    fig.savefig(ruta, dpi=dpi, bbox_inches="tight")
    return ruta


def punto_ic(ax, x, y, lo, hi, color, horizontal=True, tam=7):
    # Punto con anillo de superficie e intervalo de confianza como línea fina.
    if horizontal:
        ax.plot([lo, hi], [y, y], color=color, linewidth=1.6, solid_capstyle="round", zorder=2)
        ax.plot([x], [y], "o", color=color, markersize=tam, markeredgecolor=SUPERFICIE, markeredgewidth=1.5, zorder=3)
    else:
        ax.plot([x, x], [lo, hi], color=color, linewidth=1.6, solid_capstyle="round", zorder=2)
        ax.plot([x], [y], "o", color=color, markersize=tam, markeredgecolor=SUPERFICIE, markeredgewidth=1.5, zorder=3)


def barra_v(ax, x, valor, lo, hi, color, ancho=0.32):
    # Columna fina desde la base con su intervalo de confianza.
    ax.bar(x, valor, width=ancho, color=color, zorder=2)
    ax.plot([x, x], [lo, hi], color=TINTA2, linewidth=1.1, zorder=3)


def etiqueta(ax, x, y, texto, **kw):
    kw.setdefault("fontsize", 9.5)
    kw.setdefault("color", TINTA)
    ax.text(x, y, texto, **kw)


def leyenda(ax, entradas, **kw):
    # entradas: lista de (texto, color). Cuadrado de color + texto en tinta.
    from matplotlib.patches import Patch
    h = [Patch(facecolor=c, label=t) for t, c in entradas]
    kw.setdefault("loc", "upper right")
    return ax.legend(handles=h, **kw)


def fila(out, indicador, tipo, grupo, anio):
    # Una fila de la tabla de resultados (cifras_ponderadas / razones) por indicador, grupo y año.
    s = out[(out["indicador"] == indicador) & (out["grupo_tipo"] == tipo) & (out["grupo"] == grupo) & (out["año"] == anio)]
    assert len(s) == 1, (indicador, tipo, grupo, anio, len(s))
    return s.iloc[0]


def titulos(fig, titulo, subtitulo=None, y=0.985):
    # Título-conclusión y subtítulo (qué se mide, dónde, cuándo) para los gráficos del pitch.
    fig.text(0.012, y, titulo, fontsize=17, fontweight="semibold", va="top", ha="left", color=TINTA)
    if subtitulo:
        fig.text(0.012, y - 0.42 / fig.get_figheight(), subtitulo, fontsize=11.5, va="top", ha="left", color=TINTA2)
