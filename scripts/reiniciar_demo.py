"""Deja la base de datos lista para una demo: la borra, la crea de nuevo y carga un padrón.

Uso:  python -m scripts.reiniciar_demo [ruta_del_padron.csv]
(por defecto usa datos/padron_ejemplo.csv)
"""
import sys
from pathlib import Path

from sqlalchemy import func, select

from api import config
from api.db import Nino, crear_motor, fabrica_sesiones
from api.servicios import cargar_padron


def main() -> None:
    padron = Path(sys.argv[1] if len(sys.argv) > 1 else "datos/padron_ejemplo.csv")
    if not config.DATABASE_URL.startswith("sqlite:///"):
        sys.exit("Este script solo reinicia bases SQLite locales.")
    ruta_db = Path(config.DATABASE_URL.removeprefix("sqlite:///"))
    if ruta_db.exists():
        ruta_db.unlink()
        print(f"Base anterior borrada: {ruta_db}")
    sesion = fabrica_sesiones(crear_motor())()
    n = cargar_padron(sesion, padron.read_bytes())
    por_est = sesion.execute(select(Nino.establecimiento_id, func.count())
                             .group_by(Nino.establecimiento_id)).all()
    print(f"Padrón cargado: {n} niños desde {padron}")
    for est, cant in por_est:
        print(f"  {est}: {cant}")
    print(f"MODO_PRUEBA={'1' if config.MODO_PRUEBA else '0'}")


if __name__ == "__main__":
    main()
