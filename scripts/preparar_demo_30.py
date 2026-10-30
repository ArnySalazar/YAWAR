"""Crea una SQLite separada con el padrón de 30 niños y estados de seguimiento ficticios.

Uso desde la raíz: python -m scripts.preparar_demo_30
Nunca envía mensajes ni llama al clasificador. No reemplaza bases existentes.
"""
import argparse
import csv
from datetime import timedelta
from pathlib import Path
import sqlite3

from sqlalchemy import func, select
from sqlalchemy.engine import make_url

from api import config, servicios
from api.db import (AtencionAlarma, Mensaje, MensajeEntrante, Nino, Registro, ahora,
                    crear_motor, fabrica_sesiones, semana_iso)

RAIZ = Path(__file__).resolve().parents[1]
PADRON = RAIZ / "datos" / "padron_demo_30.csv"


def codigo(numero):
    return f"DEMO30-{numero:03d}"


def poblar(sesion, momento):
    """Inserta estados posteriores al bot, no pruebas de su transporte o clasificación."""
    contenido = PADRON.read_bytes()
    filas = list(csv.DictReader(contenido.decode("utf-8").splitlines()))
    if len(filas) != 30 or {f["id_nino"] for f in filas} != {codigo(i) for i in range(1, 31)}:
        raise ValueError("El padrón debe contener exactamente DEMO30-001 a DEMO30-030.")
    servicios.cargar_padron(sesion, contenido)
    semana = semana_iso(momento)

    def registro(numero, cuando=momento):
        sem = semana_iso(cuando)
        reg = sesion.scalar(select(Registro).where(Registro.id_nino == codigo(numero), Registro.semana == sem))
        if reg is None:
            reg = Registro(id_nino=codigo(numero), semana=sem)
            sesion.add(reg)
            sesion.flush()
        return reg

    def enviado(numero, cuando=momento, estado="enviado"):
        sesion.add(Mensaje(id_nino=codigo(numero), semana=semana_iso(cuando), tipo="recordatorio",
                           enviado_en=cuando, estado=estado,
                           wa_message_id=f"demo30-salida-{numero}-{semana_iso(cuando)}"))

    def entrante(numero, valor, tipo="text", cuando=momento, sufijo="respuesta"):
        sesion.add(MensajeEntrante(wa_id=f"demo30-entrada-{numero}-{sufijo}",
                                  telefono=sesion.get(Nino, codigo(numero)).telefono,
                                  tipo=tipo, contenido=valor, recibido_en=cuando))

    # Cuatro semanas de referencia para gráficos y meta-alertas.
    for k in range(1, 5):
        pasado = momento - timedelta(days=7 * k)
        for numero in range(1, 31):
            if numero == 9:  # Su único recordatorio antiguo se prepara aparte.
                continue
            reg = registro(numero, pasado)
            reg.respuesta, reg.fecha_respuesta = "si_le_di", pasado
            enviado(numero, pasado, "leido")

    # No respuesta vencida frente a un envío reciente que todavía no debe escalar.
    antiguo = momento - timedelta(days=max(config.DIAS_SIN_RESPUESTA, 7) + 1)
    registro(9, antiguo)
    enviado(9, antiguo)
    for numero in range(1, 27):
        registro(numero)
        if numero in (9, 16, 19):
            continue
        estado = {24: "fallido", 25: "entregado", 26: "leido"}.get(numero, "enviado")
        enviado(numero, estado=estado)

    # Respuestas y todas las razones admitidas por el bot.
    for numero, respuesta, razon in [
        (3, "si_le_di", None), (4, "no_le_di", "sabor"),
        (5, "problema", "estrenimiento"), (6, "no_le_di", "se_acabo"),
        (7, "no_le_di", "olvido"), (8, "problema", "otro"),
    ]:
        reg = registro(numero)
        reg.respuesta, reg.razon, reg.fecha_respuesta = respuesta, razon, momento
        entrante(numero, f"{respuesta}|{codigo(numero)}|{semana}", "button")
        if razon:
            entrante(numero, f"razon:{razon}|{codigo(numero)}|{semana}", "interactive", sufijo="razon")
    reg = registro(8)
    reg.detalle = "SIMULACION: se derramó el frasco."
    reg.razon_decisor, reg.prob_razon_decisor = "otro", 0.9
    entrante(8, reg.detalle, sufijo="detalle")

    # Cinco alarmas actuales: dos pendientes, dos atendidas y una reabierta.
    for numero in (11, 12, 13, 14, 15):
        reg = registro(numero)
        reg.respuesta, reg.razon, reg.fecha_respuesta = "problema", "otro", momento
        reg.detalle = f"SIMULACION {numero}: posible señal de peligro en un mensaje ficticio."
        reg.alarma, reg.derivar, reg.alarma_version = True, True, 1
        reg.motivo_derivar = "SIMULACION: clasificación de peligro predefinida"
        entrante(numero, reg.detalle)
    sesion.commit()
    for numero, medio in ((13, "llamada"), (14, "visita_presencial"), (15, "llamada")):
        reg = registro(numero)
        servicios.atender_alarma(sesion, codigo(numero), reg.id, 1, medio, momento)
    reg = registro(15)
    reg.alarma_version = 2
    reg.detalle += " Nueva señal después de la atención previa."
    entrante(15, reg.detalle, sufijo="segunda-alarma")

    # Alarma antigua: sigue pendiente aunque pasen varias semanas y tenga BAJA.
    reg = registro(16, momento - timedelta(days=21))
    reg.respuesta, reg.razon = "problema", "otro"
    reg.detalle = "SIMULACION: aviso de peligro antiguo aún no atendido."
    reg.alarma, reg.derivar, reg.alarma_version = True, True, 1
    entrante(16, reg.detalle, cuando=momento - timedelta(days=21))

    reg = registro(17)
    reg.detalle = "(envió un audio que el sistema no puede leer)"
    reg.derivar, reg.motivo_derivar = True, "mensaje que no es texto"
    entrante(17, "", "audio")
    reg = registro(18)
    reg.respuesta, reg.razon, reg.fecha_respuesta = "problema", "otro", momento
    reg.detalle = "SIMULACION: mensaje que debe revisar una persona."
    reg.derivar, reg.motivo_derivar = True, "clasificador no disponible (SIMULACION)"
    entrante(18, reg.detalle)

    entrante(19, "BAJA")
    entrante(20, "BAJA", cuando=momento - timedelta(minutes=2), sufijo="baja")
    entrante(20, "ALTA", cuando=momento - timedelta(minutes=1), sufijo="alta")
    sesion.commit()

    planes = {}
    for est, capacidad in (("EESS01", 5), ("EESS02", 3), ("EESS03", 1)):
        planes[est] = servicios.generar_lista(sesion, est, capacidad, momento)

    # Verifica los escenarios, no solo que el CSV pueda leerse.
    lista = {fila["id_nino"]: fila for filas in planes.values() for fila in filas}
    assert len(lista) == 30
    assert lista[codigo(9)]["nivel"] == 1 and lista[codigo(10)]["nivel"] == 2
    assert all(lista[codigo(i)]["alarmas_pendientes"] for i in (11, 12, 15, 16))
    assert all(not lista[codigo(i)]["alarmas_pendientes"] for i in (13, 14))
    assert lista[codigo(15)]["alarmas_pendientes"][0]["version_alarma"] == 2
    assert lista[codigo(15)]["atenciones_alarma"][0]["version_alarma"] == 1
    assert servicios.indicadores(sesion, "EESS01", semana)["alarmas_pendientes"] == 4
    assert "Ollama" in servicios.indicadores(sesion, "EESS01", semana)["meta_alerta"]
    assert "recordatorios" in servicios.indicadores(sesion, "EESS03", semana)["meta_alerta"]
    assert sesion.scalar(select(func.count()).select_from(AtencionAlarma)) == 3
    assert sesion.get(Nino, codigo(22)).telefono == sesion.get(Nino, codigo(23)).telefono
    assert sesion.scalar(select(func.count()).select_from(Nino).where(Nino.en_tratamiento_anemia.is_(True))) == 10
    return planes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--salida", default="yawar_demo_30.db", help="Archivo nuevo dentro del proyecto")
    args = parser.parse_args()
    destino = (RAIZ / args.salida).resolve()
    if not destino.is_relative_to(RAIZ) or destino.suffix != ".db":
        parser.error("La salida debe ser un archivo .db dentro del proyecto.")
    url_actual = make_url(config.DATABASE_URL)
    if url_actual.get_backend_name() == "sqlite" and url_actual.database:
        actual = (RAIZ / url_actual.database).resolve()
        if actual == destino:
            parser.error("La salida no puede ser la base activa configurada en DATABASE_URL.")
    if destino.exists():
        parser.error("La salida ya existe. Conservamos sus datos; elige otro nombre con --salida.")

    # Se construye y verifica todo en memoria antes de crear el archivo de destino.
    motor = crear_motor("sqlite://")
    with fabrica_sesiones(motor)() as sesion:
        planes = poblar(sesion, ahora())
    with destino.open("xb"):
        pass
    conexion = motor.raw_connection()
    try:
        with sqlite3.connect(destino) as archivo:
            conexion.driver_connection.backup(archivo)
    finally:
        conexion.close()
        motor.dispose()
    print(f"Base de demo creada: {destino.name}")
    print("30 niños; 10 en tratamiento; 4 con alarma pendiente; 3 atenciones históricas.")
    for est, filas in planes.items():
        print(f"  {est}: {len(filas)} niños, {sum(f['accion'] == 'visita' for f in filas)} visitas asignadas")
    print("Datos y mensajes sintéticos. Sin llamadas a WhatsApp ni al clasificador.")
    print("La base activa y el .env no se modificaron. Ver docs/escenarios_demo_30.md.")


if __name__ == "__main__":
    main()
