"""Funciones de apoyo para leer los datos de ENDES de forma ordenada.

Todos los cuadernos usan estas funciones, así la lectura se hace igual en todos lados.

Convenciones:
- Los CSV se leen como TEXTO (dtype=str). Así no se pierden ceros ni se mezclan códigos
  como "8" (no sabe) con números reales. Convertimos a número solo cuando hace falta.
- Se quitan los espacios sobrantes y los campos vacíos quedan como NA.
- Los datos viven en endes_raw/<año>/extraido/<módulo>/ (los crea datos/preparar_csv.py).
"""
from pathlib import Path
import csv
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / "endes_raw"


def carpeta_modulo(anio, modulo):
    return RAW / str(anio) / "extraido" / str(modulo)


def ruta_tabla(anio, modulo, tabla):
    return carpeta_modulo(anio, modulo) / f"{tabla}_{anio}.csv"


def listar_tablas():
    """Lista (año, módulo, tabla, ruta) de todos los CSV disponibles."""
    salida = []
    for ruta in sorted(RAW.glob("*/extraido/*/*.csv")):
        anio = int(ruta.parents[2].name)
        modulo = ruta.parent.name
        tabla = ruta.stem.rsplit("_", 1)[0]
        salida.append((anio, modulo, tabla, ruta))
    return salida


def encabezado(anio, modulo, tabla):
    """Nombres de columnas, sin leer el resto del archivo (rápido)."""
    with open(ruta_tabla(anio, modulo, tabla), encoding="utf-8-sig", newline="") as f:
        return [c.strip() for c in next(csv.reader(f))]


def contar_filas(ruta):
    """Número de registros (sin contar el encabezado)."""
    with open(ruta, encoding="utf-8-sig", newline="") as f:
        return sum(1 for _ in csv.reader(f)) - 1


def leer(anio, modulo, tabla, columnas=None):
    """Lee una tabla como texto. Si se indican `columnas`, lee solo esas (más rápido)."""
    ruta = ruta_tabla(anio, modulo, tabla)
    pedidas = set(columnas) if columnas else None
    df = pd.read_csv(
        ruta, dtype=str, encoding="utf-8-sig", low_memory=False,
        usecols=(lambda c: c.strip() in pedidas) if pedidas else None,
    )
    df.columns = [c.strip() for c in df.columns]
    for c in df.columns:
        df[c] = df[c].str.strip().replace("", pd.NA)
    return df
