"""Inicio de sesión del panel."""
import os
import tempfile

os.environ["MODO_PRUEBA"] = "1"
os.environ.setdefault("DATABASE_URL", "sqlite:///" + os.path.join(tempfile.mkdtemp(), "prueba.db"))
os.environ.setdefault("API_CLAVE", "clave-de-prueba")
os.environ["SESION_COOKIE_SEGURA"] = "0"  # TestClient usa http

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from api import acceso, config  # noqa: E402

config.SESION_COOKIE_SEGURA = False


@pytest.fixture
def c():
    from api import main
    s = main._Sesion()
    acceso.guardar_usuario(s, "Enfermera1", "Lic. de turno", "una-clave-larga")
    s.close()
    acceso._fallos.clear()
    return TestClient(main.app)


def test_sin_sesion_no_entra(c):
    assert c.get("/api/establecimientos/EESS01/lista").status_code == 401
    assert c.get("/auth/yo").status_code == 401


def test_clave_incorrecta(c):
    r = c.post("/api/auth/login", json={"usuario": "enfermera1", "clave": "otra"})
    assert r.status_code == 401
    assert acceso.COOKIE not in r.cookies


def test_login_cookie_y_salir(c):
    r = c.post("/api/auth/login", json={"usuario": " ENFERMERA1 ", "clave": "una-clave-larga"})
    assert r.status_code == 200 and r.json()["nombre"] == "Lic. de turno"
    galleta = r.headers["set-cookie"].lower()
    assert "httponly" in galleta and "samesite=strict" in galleta
    assert c.get("/api/auth/yo").json()["usuario"] == "enfermera1"
    assert c.get("/api/establecimientos/EESS01/lista").status_code == 200
    c.post("/api/auth/salir")
    c.cookies.clear()
    assert c.get("/api/establecimientos/EESS01/lista").status_code == 401


def test_token_no_se_guarda_en_claro(c):
    from api import main
    from api.db import SesionPanel
    c.post("/api/auth/login", json={"usuario": "enfermera1", "clave": "una-clave-larga"})
    token = c.cookies.get(acceso.COOKIE)
    s = main._Sesion()
    assert all(fila.token_hash != token for fila in s.query(SesionPanel))
    s.close()


def test_bloqueo_tras_cinco_fallos(c):
    for _ in range(acceso.MAX_FALLOS):
        c.post("/api/auth/login", json={"usuario": "enfermera1", "clave": "mal"})
    r = c.post("/api/auth/login", json={"usuario": "enfermera1", "clave": "una-clave-larga"})
    assert r.status_code == 429


def test_clave_de_api_sigue_sirviendo(c):
    r = c.get("/establecimientos/EESS01/lista", headers={"X-API-Key": config.API_CLAVE})
    assert r.status_code == 200


def test_usuario_desactivado(c):
    from api import main
    c.post("/api/auth/login", json={"usuario": "enfermera1", "clave": "una-clave-larga"})
    s = main._Sesion()
    acceso.desactivar_usuario(s, "enfermera1")
    s.close()
    assert c.get("/api/auth/yo").status_code == 401


def test_webhook_y_salud_siguen_publicos(c):
    assert c.get("/salud").status_code == 200
    assert c.get("/api/salud").status_code == 200
    assert c.get("/webhook", params={"hub.mode": "subscribe", "hub.verify_token": "x"}).status_code == 403
