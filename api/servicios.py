"""Lógica del sistema: padrón, lista semanal, recordatorios, respuestas e indicadores."""
import io
import logging
import re
from datetime import datetime, timedelta

import pandas as pd
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from api import config
from api.db import AtencionAlarma, Mensaje, MensajeEntrante, Nino, Registro, ahora, semana_iso
from bot import mensajes, whatsapp
from clasificador.decidir import decidir
from modelo.puntuar import puntuar

COLUMNAS_PADRON = ["id_nino", "establecimiento_id", "alias_cuidador", "telefono", "edad_meses",
                   "controles_cred", "fecha_entrega_hierro"]
# Opcionales: geografía (no la usa el modelo), presentación del hierro, tratamiento de anemia,
# apodo del niño y consentimiento
COLUMNAS_OPCIONALES = ["area", "region", "altitud_msnm", "presentacion_hierro",
                       "en_tratamiento_anemia", "nombre_nino", "acepta_mensajes"]

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
            if not 6 <= edad <= 35:
                raise ValueError("edad_meses debe estar entre 6 y 35")
            area = fila.get("area")
            area = str(area).strip().lower() if pd.notna(area) and str(area).strip() else None
            if area is not None and area not in ("urbano", "rural"):
                raise ValueError("area debe ser urbano o rural")
            region = fila.get("region")
            region = str(region).strip() if pd.notna(region) and str(region).strip() else None
            alt = fila.get("altitud_msnm")
            alt = int(alt) if pd.notna(alt) and str(alt).strip() else None
            tel = normalizar_telefono(fila["telefono"])
            if len(tel) < 9:
                raise ValueError("telefono inválido")
            fecha = pd.to_datetime(fila["fecha_entrega_hierro"]).date() \
                if pd.notna(fila["fecha_entrega_hierro"]) else None
            acepta = str(fila.get("acepta_mensajes", "1")).strip().lower() not in ("0", "no", "false")
            nombre = fila.get("nombre_nino")
            nombre = str(nombre).strip() if pd.notna(nombre) and str(nombre).strip() else None
            pres = fila.get("presentacion_hierro")
            pres = str(pres).strip().lower() if pd.notna(pres) and str(pres).strip() else None
            if pres and not set(pres.split("+")) <= {"gotas", "jarabe", "polvo"}:
                raise ValueError("presentacion_hierro debe ser gotas, jarabe o polvo (o varias con +)")
            trat = str(fila.get("en_tratamiento_anemia", "0")).strip().lower() in ("1", "si", "sí", "true")
            ninos.append(Nino(
                id_nino=str(fila["id_nino"]), establecimiento_id=str(fila["establecimiento_id"]),
                alias_cuidador=str(fila["alias_cuidador"]), nombre_nino=nombre,
                telefono=tel, edad_meses=edad,
                area=area, region=region, altitud_msnm=alt,
                controles_cred=int(fila["controles_cred"]), fecha_entrega_hierro=fecha,
                acepta_mensajes=acepta, presentacion_hierro=pres, en_tratamiento_anemia=trat))
        except (ValueError, TypeError) as e:
            errores.append(f"fila {i}: {e}")
    if errores:
        raise ValueError("El padrón tiene errores y no se cargó: " + "; ".join(errores[:10]))
    for n in ninos:
        sesion.merge(n)
    sesion.commit()
    return len(ninos)


# ---------- Lista semanal ----------

def alarma_pendiente():
    """Predicado compartido: una atención solo cierra la versión vista por el personal."""
    atendida = select(AtencionAlarma.id).where(
        AtencionAlarma.registro_id == Registro.id,
        AtencionAlarma.version_alarma == Registro.alarma_version).exists()
    return Registro.alarma.is_(True) & ~atendida


def datos_atencion(atencion: AtencionAlarma) -> dict:
    return {"id": atencion.id, "registro_id": atencion.registro_id,
            "version_alarma": atencion.version_alarma, "medio": atencion.medio,
            "atendido_en": atencion.atendido_en.isoformat(), "detalle_alarma": atencion.detalle_alarma}


def _nueva_alarma(sesion: Session, registro: Registro) -> None:
    # El incremento en SQL evita perder versiones cuando llegan dos mensajes a la vez.
    registro.alarma = True
    sesion.flush()
    sesion.execute(update(Registro).where(Registro.id == registro.id).values(
        alarma_version=Registro.alarma_version + 1))
    sesion.refresh(registro)


class ErrorAtencion(ValueError):
    def __init__(self, codigo: int, mensaje: str):
        super().__init__(mensaje)
        self.codigo = codigo


def atender_alarma(sesion: Session, id_nino: str, registro_id: int, version: int,
                   medio: str, momento: datetime | None = None) -> dict:
    if medio not in ("llamada", "visita_presencial"):
        raise ErrorAtencion(422, "El medio debe ser llamada o visita_presencial")
    reg = sesion.get(Registro, registro_id)
    if reg is None or reg.id_nino != id_nino:
        raise ErrorAtencion(404, "No existe esa alarma para el niño")
    # Bloqueo de escritura antes de comprobar la versión y la atención: evita cerrar
    # una alarma distinta si llega un mensaje o una segunda petición simultánea.
    resultado = sesion.execute(update(Registro).where(
        Registro.id == registro_id, Registro.alarma.is_(True),
        Registro.alarma_version == version).values(alarma_version=version))
    if resultado.rowcount != 1:
        sesion.rollback()
        raise ErrorAtencion(409, "La alarma cambió o ya no está disponible. Actualiza el caso.")
    sesion.refresh(reg)
    previa = sesion.scalar(select(AtencionAlarma).where(
        AtencionAlarma.registro_id == registro_id, AtencionAlarma.version_alarma == version))
    if previa:
        if previa.medio != medio:
            sesion.rollback()
            raise ErrorAtencion(409, "Esta alarma ya fue atendida por otro medio. Actualiza el caso.")
        sesion.commit()
        return datos_atencion(previa)
    atencion = AtencionAlarma(registro_id=registro_id, version_alarma=version,
                             medio=medio, atendido_en=momento or ahora(), detalle_alarma=reg.detalle)
    sesion.add(atencion)
    sesion.commit()
    return datos_atencion(atencion)


def historial_nino(sesion: Session, id_nino: str) -> list[dict]:
    registros = sesion.scalars(select(Registro).where(Registro.id_nino == id_nino)
                              .order_by(Registro.semana.desc())).all()
    salida = []
    for r in registros:
        atenciones = sesion.scalars(select(AtencionAlarma).where(
            AtencionAlarma.registro_id == r.id).order_by(AtencionAlarma.atendido_en.desc(),
                                                       AtencionAlarma.id.desc())).all()
        salida.append({"semana": r.semana, "accion": r.accion, "puntaje": r.puntaje,
                       "respuesta": r.respuesta, "razon": r.razon, "detalle": r.detalle,
                       "razon_decisor": r.razon_decisor, "alarma": bool(r.alarma), "derivar": bool(r.derivar),
                       "registro_id": r.id, "version_alarma": r.alarma_version,
                       "alarma_pendiente": bool(r.alarma) and not any(
                           a.version_alarma == r.alarma_version for a in atenciones),
                       "atenciones": [datos_atencion(a) for a in atenciones]})
    return salida


def _necesita_seguimiento(sesion: Session, id_nino: str, hoy: datetime) -> tuple[int, str] | None:
    """Escalamiento: devuelve (nivel, motivo) si el niño debe subir en la lista.
    Nivel 0 = posible señal de peligro, reportó un problema o que no le dio;
    nivel 1 = no respondió a tiempo."""
    desde = semana_iso(hoy - timedelta(days=7))
    alarma = sesion.scalars(
        select(Registro).where(Registro.id_nino == id_nino, alarma_pendiente(),
                               Registro.semana <= semana_iso(hoy))
        .order_by(Registro.semana.desc())).first()
    if alarma is not None:
        return 0, f"POSIBLE SEÑAL DE PELIGRO, revisar hoy: \"{(alarma.detalle or '')[:120]}\""
    por_leer = sesion.scalars(
        select(Registro).where(Registro.id_nino == id_nino, Registro.derivar.is_(True), Registro.alarma.is_(False),
                               Registro.semana >= desde)
        .order_by(Registro.semana.desc())).first()
    if por_leer is not None:
        return 0, f"mensaje para leer: \"{(por_leer.detalle or '')[:120]}\""
    # Respuesta de esta misma semana: el niño sube apenas el cuidador avisa
    actual = sesion.scalars(
        select(Registro).where(Registro.id_nino == id_nino, Registro.semana == semana_iso(hoy),
                               Registro.respuesta.in_(("no_le_di", "problema")))).first()
    if actual is not None:
        return 0, f"esta semana respondió: {mensajes.RESPUESTAS[actual.respuesta]}"
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
                  hoy: datetime | None = None, *, guardar: bool = True) -> list[dict]:
    hoy = hoy or ahora()
    semana = semana_iso(hoy)
    ninos = sesion.scalars(select(Nino).where(Nino.establecimiento_id == establecimiento_id)).all()
    if not ninos:
        return []
    df = pd.DataFrame([{c: getattr(n, c) for c in [*COLUMNAS_PADRON, "presentacion_hierro"]}
                       for n in ninos])
    puntos = puntuar(df).set_index("id_nino")

    filas = []
    for n in ninos:
        seg = _necesita_seguimiento(sesion, n.id_nino, hoy)
        pendientes = sesion.scalars(select(Registro).where(
            Registro.id_nino == n.id_nino, alarma_pendiente(), Registro.semana <= semana)
            .order_by(Registro.semana.desc())).all()
        atenciones = sesion.scalars(select(AtencionAlarma).join(Registro).where(
            Registro.id_nino == n.id_nino, Registro.semana <= semana)
            .order_by(AtencionAlarma.atendido_en.desc(), AtencionAlarma.id.desc())).all()
        filas.append({"id_nino": n.id_nino, "alias_cuidador": n.alias_cuidador,
                      "alarmas_pendientes": [{"registro_id": r.id, "version_alarma": r.alarma_version,
                                               "semana": r.semana} for r in pendientes],
                      "atenciones_alarma": [datos_atencion(a) for a in atenciones],
                      "edad_meses": n.edad_meses,
                      "puntaje": float(puntos.loc[n.id_nino, "prob_no_consumo"]),
                      "motivos": ("en tratamiento de anemia; " if n.en_tratamiento_anemia else "")
                                 + puntos.loc[n.id_nino, "motivos"],
                      "tratamiento_anemia": bool(n.en_tratamiento_anemia),
                      "nivel": seg[0] if seg else 2,
                      "seguimiento": seg[1] if seg else None})
    # Primero quienes reportaron un problema, luego quienes no respondieron, luego el resto.
    # Dentro de cada grupo: posible señal de peligro, luego niños en tratamiento de anemia
    # (más daño si dejan el hierro), luego mayor puntaje.
    filas.sort(key=lambda f: (f["nivel"], not str(f["seguimiento"]).startswith("POSIBLE SEÑAL"),
                              not str(f["seguimiento"]).startswith("mensaje para leer"),
                              not f["tratamiento_anemia"], -f["puntaje"]))

    for orden, f in enumerate(filas, start=1):
        f["orden"] = orden
        f["accion"] = "visita" if orden <= capacidad else "whatsapp"
        if f["seguimiento"]:
            f["regla"] = f"seguimiento: {f['seguimiento']}"
        else:
            f["regla"] = f"puntaje, capacidad de {capacidad} visitas"
        reg = sesion.scalars(select(Registro).where(Registro.semana == semana,
                                                    Registro.id_nino == f["id_nino"])).first()
        if not guardar:
            if reg is not None and reg.accion in ("visita", "whatsapp"):
                f["accion"] = reg.accion
                if not f["seguimiento"]:
                    f["regla"] = "asignación del plan semanal guardado"
            continue
        if reg is None:
            reg = Registro(semana=semana, id_nino=f["id_nino"])
            sesion.add(reg)
        reg.puntaje, reg.accion, reg.regla = f["puntaje"], f["accion"], f["regla"]
        reg.prob_asignacion = 1.0  # asignación determinista; cambia si un piloto sortea
    if guardar:
        sesion.commit()
    else:
        # La lectura conserva los canales guardados; no vuelve a aplicar el corte N.
        filas.sort(key=lambda f: (f["accion"] != "visita", f["orden"]))
        for orden, fila in enumerate(filas, start=1):
            fila["orden"] = orden
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
    elif msg["tipo"] != "text":  # audio, imagen, sticker...: no se puede leer
        ninos = sesion.scalars(select(Nino).where(Nino.telefono == tel)).all()
        if ninos:
            for n in ninos:
                reg = _registro_de_semana(sesion, n.id_nino, semana_iso(momento))
                reg.detalle = _sumar_detalle(reg.detalle, f"(envió un {msg['tipo']} que el sistema no puede leer)")
                reg.derivar, reg.motivo_derivar = True, "mensaje que no es texto"
            sesion.commit()
            whatsapp.enviar_texto(tel, mensajes.TEXTO_NO_LEE_AUDIO)
            for n in ninos:
                _avisar_personal(sesion, _registro_de_semana(sesion, n.id_nino, semana_iso(momento)),
                                 "mensaje de voz o imagen que el sistema no puede leer")
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
            pendiente = _otro_motivo_pendiente(sesion, ninos, momento)
            d = decidir(msg["valor"])
            if pendiente is not None:
                pendiente.detalle = msg["valor"].strip()[:1000]
                pendiente.razon_decisor, pendiente.prob_razon_decisor = d["razon"], d["prob_razon"]
                pendiente.alarma = pendiente.alarma or d["alarma"]
                pendiente.derivar = pendiente.derivar or d["derivar"]
                if d["alarma"]:
                    _nueva_alarma(sesion, pendiente)
                pendiente.motivo_derivar = d["motivo_derivar"]
                sesion.commit()
                whatsapp.enviar_texto(tel, mensajes.TEXTO_ALARMA if d["alarma"]
                                      else mensajes.TEXTO_GRACIAS_DETALLE)
                if d["alarma"]:
                    _avisar_personal(sesion, pendiente, "posible señal de peligro")
            elif d["alarma"]:
                # Escribió sin que se le preguntara y describe un peligro: no se ignora
                for n in ninos:
                    reg = _registro_de_semana(sesion, n.id_nino, semana_iso(momento))
                    reg.detalle = _sumar_detalle(reg.detalle, msg["valor"].strip())
                    reg.alarma, reg.derivar = True, True
                    _nueva_alarma(sesion, reg)
                    reg.motivo_derivar = d["motivo_derivar"]
                sesion.commit()
                whatsapp.enviar_texto(tel, mensajes.TEXTO_ALARMA)
                for n in ninos:
                    _avisar_personal(sesion, _registro_de_semana(sesion, n.id_nino, semana_iso(momento)),
                                     "posible señal de peligro")
            else:
                whatsapp.enviar_texto(tel, mensajes.TEXTO_AYUDA)
    return True


def _avisar_personal(sesion: Session, reg: "Registro", motivo: str) -> None:
    """Aviso inmediato al personal de CRED, una sola vez por niño y semana
    (como en Verma et al.: el aviso no se repite, para no causar fatiga de alarmas).
    Si falla (plantilla no aprobada, sin internet), el caso igual queda primero en el panel."""
    if reg.alerta_enviada or not config.CRED_TELEFONOS_ALERTA:
        return
    nino = sesion.get(Nino, reg.id_nino)
    enviada = False
    for tel in config.CRED_TELEFONOS_ALERTA:
        try:
            whatsapp.enviar_alerta_personal(tel, reg.id_nino, nino.edad_meses, motivo)
            enviada = True
        except Exception as e:
            log.error("No se pudo avisar al personal (%s): %s", reg.id_nino, e)
    reg.alerta_enviada = enviada
    sesion.commit()


def _registro_de_semana(sesion: Session, id_nino: str, semana: str) -> "Registro":
    reg = sesion.scalars(select(Registro).where(Registro.semana == semana,
                                                Registro.id_nino == id_nino)).first()
    if reg is None:
        reg = Registro(semana=semana, id_nino=id_nino)
        sesion.add(reg)
    return reg


def _sumar_detalle(previo: str | None, nuevo: str) -> str:
    return (f"{previo} | {nuevo}" if previo else nuevo)[:1000]


def _otro_motivo_pendiente(sesion: Session, ninos: list, momento: datetime) -> "Registro | None":
    """El registro de esta semana o la anterior que eligió "Otro motivo" y aún no lo explicó.
    Más atrás no: un mensaje de hoy no debe pegarse a una respuesta de hace un mes."""
    return sesion.scalars(
        select(Registro).where(Registro.id_nino.in_([n.id_nino for n in ninos]),
                               Registro.razon == "otro", Registro.detalle.is_(None),
                               Registro.semana >= semana_iso(momento - timedelta(days=7)))
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
        sin_decisor = sesion.scalar(select(func.count()).select_from(Registro).where(
            Registro.id_nino.in_(ids), Registro.semana == s,
            Registro.motivo_derivar.like("%no disponible%")))
        alarmas = sesion.scalar(select(func.count()).select_from(Registro).where(
            Registro.id_nino.in_(ids), Registro.semana == s, Registro.alarma.is_(True)))
        pendientes = sesion.scalar(select(func.count()).select_from(Registro).where(
            Registro.id_nino.in_(ids), Registro.semana == s, alarma_pendiente()))
        return {"semana": s, "enviados": env, "fallidos": fall, "respondidos": resp, "si_le_di": si,
                "alarmas": alarmas, "alarmas_pendientes": pendientes,
                "alarmas_atendidas": alarmas - pendientes, "sin_clasificador": sin_decisor}

    serie = [conteos(s) for s in sorted(semanas)]
    actual = next(c for c in serie if c["semana"] == semana)
    previas = [c for c in serie if c["semana"] < semana]
    alerta = None
    if actual["sin_clasificador"]:
        alerta = ("El clasificador de mensajes no respondió esta semana: revisar que Ollama esté "
                  "encendido. Esos mensajes quedaron para que los lea una persona.")
    elif len(previas) >= 2:
        prom_env = sum(c["enviados"] for c in previas) / len(previas)
        prom_resp = sum(c["respondidos"] for c in previas) / len(previas)
        if prom_env and actual["enviados"] < config.UMBRAL_META_ALERTA * prom_env:
            alerta = "Se enviaron muchos menos recordatorios que en semanas anteriores."
        elif prom_resp and actual["respondidos"] < config.UMBRAL_META_ALERTA * prom_resp:
            alerta = "Llegaron muchas menos respuestas que en semanas anteriores."
    pendientes_total = sesion.scalar(select(func.count(func.distinct(Registro.id_nino))).where(
        Registro.id_nino.in_(ids), Registro.semana <= semana, alarma_pendiente()))
    return {"establecimiento_id": establecimiento_id, "serie": serie, "meta_alerta": alerta,
            "alarmas_pendientes": pendientes_total}
