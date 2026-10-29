"""Lógica del sistema: padrón, lista semanal, recordatorios, respuestas e indicadores."""
import io
import logging
import re
from datetime import datetime, timedelta

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api import config
from api.db import Mensaje, MensajeEntrante, Nino, Registro, ahora, semana_iso
from bot import mensajes, whatsapp
from clasificador.decidir import decidir
from modelo.puntuar import puntuar

COLUMNAS_PADRON = ["id_nino", "establecimiento_id", "alias_cuidador", "telefono", "edad_meses",
                   "area", "region", "altitud_msnm", "controles_cred", "fecha_entrega_hierro"]

log = logging.getLogger("yawar")


def normalizar_telefono(tel: str) -> str:
    """Solo dígitos. Meta envía "51987654321" (sin +) y el padrón puede traer "+51 987 654 321";
    sin normalizar, ninguna respuesta coincidiría con el padrón."""
    return re.sub(r"\D", "", str(tel))


# ---------- Padrón ----------

def cargar_padron(sesion: Session, contenido_csv: bytes) -> int:
    """Valida TODO el archivo antes de guardar: si hay un error, no se carga nada
    y se devuelve la lista de filas con problemas."""
    try:
        df = pd.read_csv(io.BytesIO(contenido_csv), dtype={"telefono": str})
    except Exception as e:  # archivo vacío, mal separado, etc.
        raise ValueError(f"No se pudo leer el CSV: {e}")
    faltan = [c for c in COLUMNAS_PADRON if c not in df.columns]
    if faltan:
        raise ValueError(f"Al padrón le faltan columnas: {faltan}")
    duplicados = df["id_nino"][df["id_nino"].duplicated()].tolist()
    if duplicados:
        raise ValueError(f"id_nino repetidos: {duplicados}")

    errores, ninos = [], []
    for i, fila in enumerate(df.to_dict("records"), start=2):  # fila 1 = encabezado
        try:
            edad = int(fila["edad_meses"])
            if not 0 <= edad <= 59:
                raise ValueError("edad_meses fuera de rango")
            area = str(fila["area"]).strip().lower()
            if area not in ("urbano", "rural"):
                raise ValueError("area debe ser urbano o rural")
            tel = normalizar_telefono(fila["telefono"])
            if len(tel) < 9:
                raise ValueError("telefono inválido")
            fecha = pd.to_datetime(fila["fecha_entrega_hierro"]).date() \
                if pd.notna(fila["fecha_entrega_hierro"]) else None
            acepta = str(fila.get("acepta_mensajes", "1")).strip().lower() not in ("0", "no", "false")
            nombre = fila.get("nombre_nino")
            nombre = str(nombre).strip() if pd.notna(nombre) and str(nombre).strip() else None
            ninos.append(Nino(
                id_nino=str(fila["id_nino"]), establecimiento_id=str(fila["establecimiento_id"]),
                alias_cuidador=str(fila["alias_cuidador"]), nombre_nino=nombre,
                telefono=tel, edad_meses=edad,
                area=area, region=str(fila["region"]), altitud_msnm=int(fila["altitud_msnm"]),
                controles_cred=int(fila["controles_cred"]), fecha_entrega_hierro=fecha,
                acepta_mensajes=acepta))
        except (ValueError, TypeError) as e:
            errores.append(f"fila {i}: {e}")
    if errores:
        raise ValueError("El padrón tiene errores y no se cargó: " + "; ".join(errores[:10]))
    for n in ninos:
        sesion.merge(n)
    sesion.commit()
    return len(ninos)


# ---------- Lista semanal ----------

def _necesita_seguimiento(sesion: Session, id_nino: str, hoy: datetime) -> tuple[int, str] | None:
    """Escalamiento: devuelve (nivel, motivo) si el niño debe subir en la lista.
    Nivel 0 = posible señal de peligro, reportó un problema o que no le dio;
    nivel 1 = no respondió a tiempo."""
    alarma = sesion.scalars(
        select(Registro).where(Registro.id_nino == id_nino, Registro.alarma.is_(True),
                               Registro.semana >= semana_iso(hoy - timedelta(days=7)))
        .order_by(Registro.semana.desc())).first()
    if alarma is not None:
        return 0, f"POSIBLE SEÑAL DE PELIGRO, revisar hoy: \"{(alarma.detalle or '')[:120]}\""
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
                                  Mensaje.tipo == "recordatorio",
                                  Mensaje.estado != "fallido")).first()
        if envio and (hoy - envio.enviado_en) >= timedelta(days=config.DIAS_SIN_RESPUESTA):
            return 1, f"sin respuesta hace {config.DIAS_SIN_RESPUESTA} días o más"
    return None


def generar_lista(sesion: Session, establecimiento_id: str, capacidad: int,
                  hoy: datetime | None = None) -> list[dict]:
    hoy = hoy or ahora()
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
    filas.sort(key=lambda f: (f["nivel"], not str(f["seguimiento"]).startswith("POSIBLE SEÑAL"),
                              -f["puntaje"]))

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
                         hoy: datetime | None = None) -> dict:
    """Envía el recordatorio de la semana a cada cuidador que aceptó mensajes.
    Si un envío falla, sigue con los demás y lo cuenta como fallido."""
    hoy = hoy or ahora()
    semana = semana_iso(hoy)
    resultado = {"enviados": 0, "fallidos": 0, "omitidos_por_baja": 0}
    for n in sesion.scalars(select(Nino).where(Nino.establecimiento_id == establecimiento_id)):
        if not n.acepta_mensajes:
            resultado["omitidos_por_baja"] += 1
            continue
        ya = sesion.scalars(select(Mensaje).where(
            Mensaje.id_nino == n.id_nino, Mensaje.semana == semana,
            Mensaje.tipo == "recordatorio", Mensaje.estado != "fallido")).first()
        if ya:
            continue
        try:
            wa_id = whatsapp.enviar_recordatorio(n.telefono, n.alias_cuidador, n.id_nino, semana,
                                                 nombre_nino=n.nombre_nino)
            estado = "enviado"
            resultado["enviados"] += 1
        except Exception as e:  # sin internet, token vencido, número no registrado...
            log.error("No se pudo enviar a %s: %s", n.id_nino, e)
            wa_id, estado = None, "fallido"
            resultado["fallidos"] += 1
        sesion.add(Mensaje(id_nino=n.id_nino, semana=semana, tipo="recordatorio",
                           enviado_en=hoy, wa_message_id=wa_id, estado=estado))
        if not sesion.scalars(select(Registro).where(Registro.semana == semana,
                                                     Registro.id_nino == n.id_nino)).first():
            sesion.add(Registro(semana=semana, id_nino=n.id_nino))
        sesion.commit()
    return resultado


def procesar_entrante(sesion: Session, msg: dict, momento: datetime | None = None) -> bool:
    """Guarda y procesa un mensaje entrante. Devuelve False si ya se había procesado
    (Meta reintenta el webhook y el mismo mensaje puede llegar dos veces)."""
    momento = momento or ahora()
    if not msg.get("wa_id"):
        return False
    if sesion.scalars(select(MensajeEntrante).where(MensajeEntrante.wa_id == msg["wa_id"])).first():
        return False
    tel = normalizar_telefono(msg["telefono"])
    sesion.add(MensajeEntrante(wa_id=msg["wa_id"], telefono=tel, tipo=msg["tipo"],
                               contenido=msg["valor"][:1000], recibido_en=momento))
    sesion.commit()

    if msg["tipo"] in ("button", "interactive"):
        leido = mensajes.leer_id_boton(msg["valor"])
        if leido:
            opcion, id_nino, semana = leido
            registrar_respuesta(sesion, {"telefono": tel, "opcion": opcion,
                                         "id_nino": id_nino, "semana": semana}, momento)
    elif msg["tipo"] == "text":
        texto = msg["valor"].strip().lower()
        ninos = sesion.scalars(select(Nino).where(Nino.telefono == tel)).all()
        if not ninos:
            return True  # número que no está en el padrón: se guarda y no se responde
        if texto in mensajes.PALABRAS_BAJA:
            for n in ninos:
                n.acepta_mensajes = False
            sesion.commit()
            whatsapp.enviar_texto(tel, mensajes.TEXTO_BAJA)
        elif texto in mensajes.PALABRAS_ALTA:
            for n in ninos:
                n.acepta_mensajes = True
            sesion.commit()
            whatsapp.enviar_texto(tel, mensajes.TEXTO_ALTA)
        else:
            pendiente = _otro_motivo_pendiente(sesion, ninos)
            if pendiente is None:
                whatsapp.enviar_texto(tel, mensajes.TEXTO_AYUDA)
            else:
                d = decidir(msg["valor"])
                pendiente.detalle = msg["valor"].strip()[:1000]
                pendiente.razon_decisor, pendiente.prob_razon_decisor = d["razon"], d["prob_razon"]
                pendiente.alarma, pendiente.derivar = d["alarma"], d["derivar"]
                sesion.commit()
                whatsapp.enviar_texto(tel, mensajes.TEXTO_ALARMA if d["alarma"]
                                      else mensajes.TEXTO_GRACIAS_DETALLE)
    return True


def _otro_motivo_pendiente(sesion: Session, ninos: list) -> "Registro | None":
    """El registro más reciente de este teléfono que eligió "Otro motivo" y aún no lo explicó."""
    return sesion.scalars(
        select(Registro).where(Registro.id_nino.in_([n.id_nino for n in ninos]),
                               Registro.razon == "otro", Registro.detalle.is_(None))
        .order_by(Registro.semana.desc())).first()


def actualizar_estado(sesion: Session, wa_id: str, estado: str) -> None:
    """Meta avisa si el mensaje se entregó, se leyó o falló."""
    m = sesion.scalars(select(Mensaje).where(Mensaje.wa_message_id == wa_id)).first()
    orden = ["enviado", "entregado", "leido"]
    if m is None:
        return
    if estado == "fallido" or (m.estado in orden and estado in orden
                               and orden.index(estado) > orden.index(m.estado)):
        m.estado = estado  # los avisos pueden llegar desordenados: nunca retroceder
        sesion.commit()


def registrar_respuesta(sesion: Session, resp: dict, momento: datetime | None = None) -> None:
    """resp = {telefono, opcion, id_nino, semana}."""
    momento = momento or ahora()
    nino = sesion.get(Nino, resp["id_nino"])
    if nino is None or nino.telefono != normalizar_telefono(resp["telefono"]):
        return  # respuesta que no corresponde a nadie del padrón: se ignora
    reg = sesion.scalars(select(Registro).where(Registro.semana == resp["semana"],
                                                Registro.id_nino == resp["id_nino"])).first()
    if reg is None:
        reg = Registro(semana=resp["semana"], id_nino=resp["id_nino"])
        sesion.add(reg)

    opcion = resp["opcion"]
    if opcion in mensajes.RESPUESTAS:
        reg.respuesta, reg.fecha_respuesta = opcion, momento
        sesion.commit()  # primero se guarda; si WhatsApp falla, la respuesta no se pierde
        try:
            if opcion == "si_le_di":
                whatsapp.enviar_texto(nino.telefono, mensajes.TEXTO_GRACIAS_SI)
            else:
                wa_id = whatsapp.enviar_pregunta_razon(nino.telefono, nino.id_nino, resp["semana"])
                sesion.add(Mensaje(id_nino=nino.id_nino, semana=resp["semana"], tipo="razones",
                                   enviado_en=momento, wa_message_id=wa_id))
        except Exception as e:
            log.error("No se pudo responder a %s: %s", nino.id_nino, e)
    elif opcion.startswith("razon:"):
        razon = opcion.removeprefix("razon:")
        if razon in mensajes.RAZONES:
            reg.razon = razon
            sesion.commit()
            texto = mensajes.TEXTO_PIDE_DETALLE if razon == "otro" else mensajes.TEXTO_GRACIAS_RAZON
            try:
                whatsapp.enviar_texto(nino.telefono, texto)
            except Exception as e:
                log.error("No se pudo responder a %s: %s", nino.id_nino, e)
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
            Mensaje.id_nino.in_(ids), Mensaje.semana == s, Mensaje.tipo == "recordatorio",
            Mensaje.estado != "fallido"))
        fall = sesion.scalar(select(func.count()).select_from(Mensaje).where(
            Mensaje.id_nino.in_(ids), Mensaje.semana == s, Mensaje.tipo == "recordatorio",
            Mensaje.estado == "fallido"))
        resp = sesion.scalar(select(func.count()).select_from(Registro).where(
            Registro.id_nino.in_(ids), Registro.semana == s,
            Registro.respuesta != "sin_respuesta"))
        si = sesion.scalar(select(func.count()).select_from(Registro).where(
            Registro.id_nino.in_(ids), Registro.semana == s, Registro.respuesta == "si_le_di"))
        return {"semana": s, "enviados": env, "fallidos": fall, "respondidos": resp, "si_le_di": si}

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
