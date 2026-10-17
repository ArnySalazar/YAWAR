"""Lógica del sistema: padrón, lista semanal, recordatorios, respuestas e indicadores."""
import io
from datetime import date, datetime, timedelta

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api import config
from api.db import Mensaje, Nino, Registro, semana_iso
from bot import mensajes, whatsapp
from modelo.puntuar import puntuar

COLUMNAS_PADRON = ["id_nino", "establecimiento_id", "alias_cuidador", "telefono", "edad_meses",
                   "area", "region", "altitud_msnm", "controles_cred", "fecha_entrega_hierro"]


# ---------- Padrón ----------

def cargar_padron(sesion: Session, contenido_csv: bytes) -> int:
    df = pd.read_csv(io.BytesIO(contenido_csv), dtype={"telefono": str})
    faltan = [c for c in COLUMNAS_PADRON if c not in df.columns]
    if faltan:
        raise ValueError(f"Al padrón le faltan columnas: {faltan}")
    for fila in df[COLUMNAS_PADRON].itertuples(index=False):
        fecha = pd.to_datetime(fila.fecha_entrega_hierro).date() \
            if pd.notna(fila.fecha_entrega_hierro) else None
        sesion.merge(Nino(
            id_nino=str(fila.id_nino), establecimiento_id=str(fila.establecimiento_id),
            alias_cuidador=str(fila.alias_cuidador), telefono=str(fila.telefono),
            edad_meses=int(fila.edad_meses), area=str(fila.area), region=str(fila.region),
            altitud_msnm=int(fila.altitud_msnm), controles_cred=int(fila.controles_cred),
            fecha_entrega_hierro=fecha))
    sesion.commit()
    return len(df)


# ---------- Lista semanal ----------

def _necesita_seguimiento(sesion: Session, id_nino: str, hoy: datetime) -> tuple[int, str] | None:
    """Escalamiento: devuelve (nivel, motivo) si el niño debe subir en la lista.
    Nivel 0 = reportó un problema o que no le dio; nivel 1 = no respondió a tiempo."""
    ultimo = sesion.scalars(
        select(Registro).where(Registro.id_nino == id_nino,
                               Registro.semana < semana_iso(hoy))
        .order_by(Registro.semana.desc())).first()
    if ultimo is None:
        return None
    if ultimo.respuesta in ("no_le_di", "problema"):
        return 0, f"la semana pasada respondió: {mensajes.RESPUESTAS[ultimo.respuesta]}"
    if ultimo.respuesta == "sin_respuesta":
        envio = sesion.scalars(
            select(Mensaje).where(Mensaje.id_nino == id_nino, Mensaje.semana == ultimo.semana,
                                  Mensaje.tipo == "recordatorio")).first()
        if envio and (hoy - envio.enviado_en) >= timedelta(days=config.DIAS_SIN_RESPUESTA):
            return 1, f"sin respuesta hace {config.DIAS_SIN_RESPUESTA} días o más"
    return None


def generar_lista(sesion: Session, establecimiento_id: str, capacidad: int,
                  hoy: datetime | None = None) -> list[dict]:
    hoy = hoy or datetime.now()
    semana = semana_iso(hoy)
    ninos = sesion.scalars(select(Nino).where(Nino.establecimiento_id == establecimiento_id)).all()
    if not ninos:
        return []
    df = pd.DataFrame([{c: getattr(n, c) for c in COLUMNAS_PADRON} for n in ninos])
    puntos = puntuar(df).set_index("id_nino")

    filas = []
    for n in ninos:
        seg = _necesita_seguimiento(sesion, n.id_nino, hoy)
        filas.append({"id_nino": n.id_nino, "alias_cuidador": n.alias_cuidador,
                      "edad_meses": n.edad_meses,
                      "puntaje": float(puntos.loc[n.id_nino, "prob_no_consumo"]),
                      "motivos": puntos.loc[n.id_nino, "motivos"],
                      "nivel": seg[0] if seg else 2,
                      "seguimiento": seg[1] if seg else None})
    # Primero quienes reportaron un problema, luego quienes no respondieron, luego el resto;
    # dentro de cada grupo, mayor puntaje primero
    filas.sort(key=lambda f: (f["nivel"], -f["puntaje"]))

    for orden, f in enumerate(filas, start=1):
        f["orden"] = orden
        f["accion"] = "visita" if orden <= capacidad else "whatsapp"
        if f["seguimiento"]:
            f["regla"] = f"seguimiento: {f['seguimiento']}"
        else:
            f["regla"] = f"puntaje, capacidad de {capacidad} visitas"
        reg = sesion.scalars(select(Registro).where(Registro.semana == semana,
                                                    Registro.id_nino == f["id_nino"])).first()
        if reg is None:
            reg = Registro(semana=semana, id_nino=f["id_nino"])
            sesion.add(reg)
        reg.puntaje, reg.accion, reg.regla = f["puntaje"], f["accion"], f["regla"]
        reg.prob_asignacion = 1.0  # asignación determinista; cambia si un piloto sortea
    sesion.commit()
    return filas


# ---------- WhatsApp ----------

def enviar_recordatorios(sesion: Session, establecimiento_id: str,
                         hoy: datetime | None = None) -> int:
    hoy = hoy or datetime.now()
    semana = semana_iso(hoy)
    enviados = 0
    for n in sesion.scalars(select(Nino).where(Nino.establecimiento_id == establecimiento_id)):
        ya = sesion.scalars(select(Mensaje).where(
            Mensaje.id_nino == n.id_nino, Mensaje.semana == semana,
            Mensaje.tipo == "recordatorio")).first()
        if ya:
            continue
        wa_id = whatsapp.enviar_recordatorio(n.telefono, n.alias_cuidador, n.id_nino, semana)
        sesion.add(Mensaje(id_nino=n.id_nino, semana=semana, tipo="recordatorio",
                           enviado_en=hoy, wa_message_id=wa_id))
        if not sesion.scalars(select(Registro).where(Registro.semana == semana,
                                                     Registro.id_nino == n.id_nino)).first():
            sesion.add(Registro(semana=semana, id_nino=n.id_nino))
        enviados += 1
    sesion.commit()
    return enviados


def registrar_respuesta(sesion: Session, resp: dict, ahora: datetime | None = None) -> None:
    """resp = {telefono, opcion, id_nino, semana} (salida de whatsapp.extraer_respuestas)."""
    ahora = ahora or datetime.now()
    nino = sesion.get(Nino, resp["id_nino"])
    if nino is None or nino.telefono != resp["telefono"]:
        return  # respuesta que no corresponde a nadie del padrón: se ignora
    reg = sesion.scalars(select(Registro).where(Registro.semana == resp["semana"],
                                                Registro.id_nino == resp["id_nino"])).first()
    if reg is None:
        reg = Registro(semana=resp["semana"], id_nino=resp["id_nino"])
        sesion.add(reg)

    opcion = resp["opcion"]
    if opcion in mensajes.RESPUESTAS:
        reg.respuesta, reg.fecha_respuesta = opcion, ahora
        if opcion == "si_le_di":
            whatsapp.enviar_texto(nino.telefono, mensajes.TEXTO_GRACIAS_SI)
        else:
            whatsapp.enviar_pregunta_razon(nino.telefono, nino.id_nino, resp["semana"])
            sesion.add(Mensaje(id_nino=nino.id_nino, semana=resp["semana"], tipo="razones",
                               enviado_en=ahora))
    elif opcion.startswith("razon:"):
        razon = opcion.removeprefix("razon:")
        if razon in mensajes.RAZONES:
            reg.razon = razon
            whatsapp.enviar_texto(nino.telefono, mensajes.TEXTO_GRACIAS_RAZON)
    sesion.commit()


# ---------- Indicadores y meta-alerta ----------

def indicadores(sesion: Session, establecimiento_id: str, semana: str,
                semanas_previas: int = 4) -> dict:
    """Conteos por semana y meta-alerta: avisa si la semana evaluada cae muy por debajo
    de su promedio reciente (como la regla que dejó de disparar por años en S21)."""
    ids = select(Nino.id_nino).where(Nino.establecimiento_id == establecimiento_id)
    semanas = sesion.scalars(
        select(Mensaje.semana).where(Mensaje.id_nino.in_(ids), Mensaje.semana <= semana)
        .distinct().order_by(Mensaje.semana.desc()).limit(semanas_previas + 1)).all()
    if semana not in semanas:
        semanas = [semana, *semanas][: semanas_previas + 1]

    def conteos(s: str) -> dict:
        env = sesion.scalar(select(func.count()).select_from(Mensaje).where(
            Mensaje.id_nino.in_(ids), Mensaje.semana == s, Mensaje.tipo == "recordatorio"))
        resp = sesion.scalar(select(func.count()).select_from(Registro).where(
            Registro.id_nino.in_(ids), Registro.semana == s,
            Registro.respuesta != "sin_respuesta"))
        si = sesion.scalar(select(func.count()).select_from(Registro).where(
            Registro.id_nino.in_(ids), Registro.semana == s, Registro.respuesta == "si_le_di"))
        return {"semana": s, "enviados": env, "respondidos": resp, "si_le_di": si}

    serie = [conteos(s) for s in sorted(semanas)]
    actual = next(c for c in serie if c["semana"] == semana)
    previas = [c for c in serie if c["semana"] < semana]
    alerta = None
    if len(previas) >= 2:
        prom_env = sum(c["enviados"] for c in previas) / len(previas)
        prom_resp = sum(c["respondidos"] for c in previas) / len(previas)
        if prom_env and actual["enviados"] < config.UMBRAL_META_ALERTA * prom_env:
            alerta = "Se enviaron muchos menos recordatorios que en semanas anteriores."
        elif prom_resp and actual["respondidos"] < config.UMBRAL_META_ALERTA * prom_resp:
            alerta = "Llegaron muchas menos respuestas que en semanas anteriores."
    return {"establecimiento_id": establecimiento_id, "serie": serie, "meta_alerta": alerta}
