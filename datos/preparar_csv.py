"""Descomprime los zips de ENDES descargados del INEI.

Qué hace: toma cada zip de endes_raw/<año>/ y deja sus archivos (CSV y diccionarios PDF)
en endes_raw/<año>/extraido/<módulo>/, sin las carpetas anidadas que trae el zip.

Cómo se usa (desde la carpeta que contiene endes_raw/):
    python datos/preparar_csv.py

Es seguro repetirlo: los archivos que ya existen con el mismo tamaño se saltan.
La carpeta endes_raw/ NO se sube al repositorio.
"""
import re
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / "endes_raw"


def main():
    zips = sorted(RAW.glob("*/*.zip"))
    if not zips:
        raise SystemExit(f"No encontré zips en {RAW}/<año>/")
    for z in zips:
        anio = z.parent.name
        modulo = re.search(r"Modulo(\d+)", z.name).group(1)
        destino = RAW / anio / "extraido" / modulo
        destino.mkdir(parents=True, exist_ok=True)
        n = 0
        with zipfile.ZipFile(z) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                nombre = Path(info.filename).name  # aplana carpetas anidadas
                salida = destino / nombre
                if salida.exists() and salida.stat().st_size == info.file_size:
                    n += 1  # ya estaba completo: no se vuelve a escribir
                    continue
                salida.write_bytes(zf.read(info))
                n += 1
        print(f"{anio}  módulo {modulo}: {n} archivos -> {destino.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
