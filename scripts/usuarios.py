"""Usuarios del panel. La contraseña se escribe en pantalla (no queda en el historial).

    python -m scripts.usuarios crear  enfermera1 "Lic. de turno"
    python -m scripts.usuarios clave  enfermera1          # cambiar contraseña
    python -m scripts.usuarios quitar enfermera1          # desactivar y cerrar sus sesiones
    python -m scripts.usuarios lista

Usa la base de DATABASE_URL del .env (la misma que la API).
"""
import getpass
import sys

from sqlalchemy import select

from api import acceso
from api.db import Usuario, crear_motor, fabrica_sesiones

MINIMO = 10


def pedir_clave() -> str:
    while True:
        c1 = getpass.getpass(f"Contraseña (mínimo {MINIMO} caracteres): ")
        if len(c1) < MINIMO:
            print("Muy corta.")
            continue
        if getpass.getpass("Repítela: ") != c1:
            print("No coinciden.")
            continue
        return c1


def main(args: list[str]) -> int:
    if not args:
        print(__doc__)
        return 1
    s = fabrica_sesiones(crear_motor())()
    orden = args[0]
    if orden == "lista":
        for u in s.scalars(select(Usuario).order_by(Usuario.usuario)):
            print(f"{u.usuario:20} {'activo' if u.activo else 'inactivo':9} {u.nombre}")
        return 0
    if len(args) < 2:
        print(__doc__)
        return 1
    usuario = args[1]
    if orden in ("crear", "clave"):
        existente = s.get(Usuario, usuario.strip().lower())
        if orden == "crear" and existente:
            print("Ese usuario ya existe; usa 'clave' para cambiar su contraseña.")
            return 1
        if orden == "clave" and not existente:
            print("Ese usuario no existe.")
            return 1
        nombre = args[2] if len(args) > 2 else (existente.nombre if existente else usuario)
        u = acceso.guardar_usuario(s, usuario, nombre, pedir_clave())
        print(f"Listo: {u.usuario} ({u.nombre}).")
        return 0
    if orden == "quitar":
        print("Desactivado." if acceso.desactivar_usuario(s, usuario) else "Ese usuario no existe.")
        return 0
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
