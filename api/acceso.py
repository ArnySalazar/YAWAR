"""Inicio de sesión del panel: usuarios con contraseña (scrypt) y sesiones en cookie HttpOnly."""
import hashlib
import secrets
import time
from collections import defaultdict, deque
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from api import config
from api.db import SesionPanel, Usuario, ahora

COOKIE = "yawar_sesion"
_N, _R, _P = 2**14, 8, 1

# Límite de intentos fallidos (en memoria; basta para una sola API)
MAX_FALLOS = 5
VENTANA_S = 15 * 60
_fallos: dict[str, deque] = defaultdict(deque)


def hash_clave(clave: str) -> str:
    sal = secrets.token_bytes(16)
    h = hashlib.scrypt(clave.encode(), salt=sal, n=_N, r=_R, p=_P, dklen=32)
    return f"scrypt${_N}${_R}${_P}${sal.hex()}${h.hex()}"


def clave_correcta(clave: str, guardado: str) -> bool:
    try:
        _, n, r, p, sal, h = guardado.split("$")
        calc = hashlib.scrypt(clave.encode(), salt=bytes.fromhex(sal), n=int(n), r=int(r), p=int(p),
                              dklen=len(h) // 2)
    except (ValueError, TypeError):
        return False
    return secrets.compare_digest(calc.hex(), h)


# Se compara contra este hash cuando el usuario no existe, para que la respuesta tarde lo mismo
_HASH_FALSO = hash_clave(secrets.token_hex(16))


def bloqueado(llave: str) -> bool:
    q = _fallos[llave]
    limite = time.monotonic() - VENTANA_S
    while q and q[0] < limite:
        q.popleft()
    return len(q) >= MAX_FALLOS


def anotar_fallo(llave: str) -> None:
    _fallos[llave].append(time.monotonic())


def limpiar_fallos(llave: str) -> None:
    _fallos.pop(llave, None)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def autenticar(s: Session, usuario: str, clave: str) -> Usuario | None:
    u = s.get(Usuario, usuario.strip().lower())
    ok = clave_correcta(clave, u.clave_hash if u else _HASH_FALSO)
    return u if (u and u.activo and ok) else None


def abrir_sesion(s: Session, usuario: Usuario) -> str:
    token = secrets.token_urlsafe(32)
    t = ahora()
    s.execute(delete(SesionPanel).where(SesionPanel.expira_en < t))
    s.add(SesionPanel(token_hash=_hash_token(token), usuario=usuario.usuario, creada_en=t,
                      expira_en=t + timedelta(hours=config.SESION_HORAS)))
    s.commit()
    return token


def usuario_de_token(s: Session, token: str | None) -> Usuario | None:
    if not token:
        return None
    ses = s.get(SesionPanel, _hash_token(token))
    if not ses or ses.expira_en < ahora():
        return None
    u = s.get(Usuario, ses.usuario)
    return u if u and u.activo else None


def cerrar_sesion(s: Session, token: str | None) -> None:
    if token:
        s.execute(delete(SesionPanel).where(SesionPanel.token_hash == _hash_token(token)))
        s.commit()


def guardar_usuario(s: Session, usuario: str, nombre: str, clave: str) -> Usuario:
    """Crea el usuario o le cambia la contraseña (y cierra sus sesiones abiertas)."""
    usuario = usuario.strip().lower()
    u = s.get(Usuario, usuario)
    if u is None:
        u = Usuario(usuario=usuario, nombre=nombre, clave_hash=hash_clave(clave), activo=True,
                    creado_en=ahora())
        s.add(u)
    else:
        u.nombre, u.clave_hash, u.activo = nombre or u.nombre, hash_clave(clave), True
        s.execute(delete(SesionPanel).where(SesionPanel.usuario == usuario))
    s.commit()
    return u


def desactivar_usuario(s: Session, usuario: str) -> bool:
    u = s.get(Usuario, usuario.strip().lower())
    if u is None:
        return False
    u.activo = False
    s.execute(delete(SesionPanel).where(SesionPanel.usuario == u.usuario))
    s.commit()
    return True
