"""Base de datos. Las tablas siguen la sección "Contratos entre roles" del plan del equipo."""
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import (Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
                        UniqueConstraint, create_engine, event)
from sqlalchemy.orm import (DeclarativeBase, Mapped, mapped_column,
                            sessionmaker)

from api import config


class Base(DeclarativeBase):
    pass


class Nino(Base):
    """Contrato 1: una fila del padrón del establecimiento. Sin DNI ni nombres reales."""
    __tablename__ = "ninos"
    id_nino: Mapped[str] = mapped_column(String, primary_key=True)
    establecimiento_id: Mapped[str] = mapped_column(String, index=True)
    alias_cuidador: Mapped[str] = mapped_column(String)
    nombre_nino: Mapped[str | None] = mapped_column(String, nullable=True)  # apodo que autoriza la madre
    telefono: Mapped[str] = mapped_column(String, index=True)
    edad_meses: Mapped[int] = mapped_column(Integer)
    area: Mapped[str] = mapped_column(String)
    region: Mapped[str] = mapped_column(String)
    altitud_msnm: Mapped[int] = mapped_column(Integer)
    controles_cred: Mapped[int] = mapped_column(Integer)
    fecha_entrega_hierro: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Consentimiento: si el cuidador escribe BAJA, deja de recibir mensajes
    acepta_mensajes: Mapped[bool] = mapped_column(Boolean, default=True)
    # Opcionales, de la libreta CRED: presentación del hierro ("gotas", "jarabe", "polvo",
    # o varias con "+") y si el niño está en tratamiento de anemia (no en prevención)
    presentacion_hierro: Mapped[str | None] = mapped_column(String, nullable=True)
    en_tratamiento_anemia: Mapped[bool] = mapped_column(Boolean, default=False)


class Mensaje(Base):
    """Cada mensaje enviado al cuidador (recordatorio o pregunta de razones)."""
    __tablename__ = "mensajes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_nino: Mapped[str] = mapped_column(ForeignKey("ninos.id_nino"), index=True)
    semana: Mapped[str] = mapped_column(String, index=True)
    tipo: Mapped[str] = mapped_column(String)  # recordatorio | razones
    enviado_en: Mapped[datetime] = mapped_column(DateTime)
    wa_message_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    # enviado | entregado | leido | fallido (Meta avisa por el webhook)
    estado: Mapped[str] = mapped_column(String, default="enviado")


class MensajeEntrante(Base):
    """Todo lo que llega por el webhook. Sirve para auditar y para no procesar dos veces
    el mismo mensaje cuando Meta reintenta."""
    __tablename__ = "mensajes_entrantes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    wa_id: Mapped[str] = mapped_column(String, unique=True)
    telefono: Mapped[str] = mapped_column(String, index=True)
    tipo: Mapped[str] = mapped_column(String)  # button | interactive | text | otro
    contenido: Mapped[str] = mapped_column(Text)
    recibido_en: Mapped[datetime] = mapped_column(DateTime)


class Registro(Base):
    """Contrato 3: registro semanal de acciones y respuestas (uno por niño y semana)."""
    __tablename__ = "registro_semanal"
    __table_args__ = (UniqueConstraint("semana", "id_nino"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    semana: Mapped[str] = mapped_column(String, index=True)
    id_nino: Mapped[str] = mapped_column(ForeignKey("ninos.id_nino"), index=True)
    puntaje: Mapped[float | None] = mapped_column(Float, nullable=True)
    accion: Mapped[str | None] = mapped_column(String, nullable=True)  # visita | whatsapp | ninguna
    regla: Mapped[str | None] = mapped_column(String, nullable=True)
    prob_asignacion: Mapped[float | None] = mapped_column(Float, nullable=True)
    respuesta: Mapped[str] = mapped_column(String, default="sin_respuesta")
    razon: Mapped[str | None] = mapped_column(String, nullable=True)
    fecha_respuesta: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # "Otro motivo": lo que escribió el cuidador y lo que decidió el clasificador local
    detalle: Mapped[str | None] = mapped_column(Text, nullable=True)
    razon_decisor: Mapped[str | None] = mapped_column(String, nullable=True)
    prob_razon_decisor: Mapped[float | None] = mapped_column(Float, nullable=True)
    alarma: Mapped[bool] = mapped_column(Boolean, default=False)
    derivar: Mapped[bool] = mapped_column(Boolean, default=False)


def crear_motor(url: str = config.DATABASE_URL):
    args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    motor = create_engine(url, connect_args=args)
    if url.startswith("sqlite"):
        @event.listens_for(motor, "connect")
        def _activar_claves_foraneas(conexion, _):
            conexion.execute("PRAGMA foreign_keys=ON")  # SQLite no las aplica por defecto
    Base.metadata.create_all(motor)
    if url.startswith("sqlite"):
        _agregar_columnas_nuevas(motor)
    return motor


_COLUMNAS_NUEVAS = {
    "ninos": {"presentacion_hierro": "VARCHAR", "en_tratamiento_anemia": "BOOLEAN DEFAULT 0"},
    "registro_semanal": {"detalle": "TEXT", "razon_decisor": "VARCHAR",
                         "prob_razon_decisor": "FLOAT", "alarma": "BOOLEAN DEFAULT 0",
                         "derivar": "BOOLEAN DEFAULT 0"},
}


def _agregar_columnas_nuevas(motor):
    """create_all no agrega columnas a tablas que ya existen: se agregan aquí."""
    with motor.begin() as con:
        for tabla, columnas in _COLUMNAS_NUEVAS.items():
            existentes = {fila[1] for fila in con.exec_driver_sql(f"PRAGMA table_info({tabla})")}
            for nombre, tipo in columnas.items():
                if nombre not in existentes:
                    con.exec_driver_sql(f"ALTER TABLE {tabla} ADD COLUMN {nombre} {tipo}")


def fabrica_sesiones(motor):
    return sessionmaker(bind=motor, expire_on_commit=False)


def ahora() -> datetime:
    """Hora local de Lima sin zona adjunta. Todas las fechas se guardan así, para que las
    semanas y los días sin respuesta no se corran 5 horas si el servidor está en UTC."""
    return datetime.now(ZoneInfo(config.ZONA_HORARIA)).replace(tzinfo=None)


def semana_iso(dia: date | datetime) -> str:
    anio, num, _ = dia.isocalendar()
    return f"{anio}-W{num:02d}"
