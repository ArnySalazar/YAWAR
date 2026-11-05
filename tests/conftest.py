"""Las pruebas no dependen del .env de quien las corre.

pytest carga este archivo antes que cualquier prueba. Como api/config.py solo completa las
variables que faltan, lo que se fija aquí gana sobre el .env (número de alerta, firma de Meta…).
"""
import os
import tempfile

os.environ.update({
    "MODO_PRUEBA": "1",
    "DATABASE_URL": "sqlite:///" + os.path.join(tempfile.mkdtemp(), "prueba.db"),
    "API_CLAVE": "clave-de-prueba",
    "WA_APP_SECRET": "",
    "CRED_TELEFONOS_ALERTA": "",
    "PANEL_LOGIN": "1",
    "SESION_COOKIE_SEGURA": "0",
})
