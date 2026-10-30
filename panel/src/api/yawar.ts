/**
 * Rutas de la API de YAWAR que usa el panel, con sus tipos tal como responden.
 * Es la única puerta hacia la API: las pantallas transforman estos datos en su `api.ts`.
 * Rutas y reglas documentadas en el README de la raíz y en http://localhost:8000/docs.
 */
import { http } from './http'

/** Semana ISO en hora de Lima, como la calcula la API: "2026-W43". */
export type SemanaIso = string

export type Accion = 'visita' | 'whatsapp'
export type Respuesta = 'si_le_di' | 'no_le_di' | 'problema' | 'sin_respuesta'
export type Razon = 'sabor' | 'estrenimiento' | 'se_acabo' | 'olvido' | 'otro'
/** 0 = posible señal de peligro, mensaje para leer, o respondió "No le di" o "Tuve un problema" (esta semana o la anterior); 1 = no respondió en 7 días o más; 2 = sin novedad. */
export type Nivel = 0 | 1 | 2

export type MedioAtencion = 'llamada' | 'visita_presencial'
export interface AlarmaPendiente {
  registro_id: number
  version_alarma: number
  semana: SemanaIso
}
export interface AtencionAlarma {
  id: number
  registro_id: number
  version_alarma: number
  medio: MedioAtencion
  /** Fecha y hora local de Lima, como /salud. */
  atendido_en: string
  detalle_alarma: string | null
}

/** GET /salud */
export interface Salud {
  ok: boolean
  modo_prueba: boolean
  /** Hora de Lima, sin zona: "2026-10-21T10:17:00.123456". */
  hora_local: string
}

/** Una fila de POST /establecimientos/{id}/lista */
export interface FilaLista {
  /** Indicador informativo de tratamiento de anemia, tal como lo devuelve la API. */
  tratamiento_anemia?: boolean | null
  alarmas_pendientes?: AlarmaPendiente[]
  atenciones_alarma?: AtencionAlarma[]
  orden: number
  id_nino: string
  alias_cuidador: string
  edad_meses: number
  /** Probabilidad estimada de no consumo (0 a 1). */
  puntaje: number
  /** Motivos separados por "; ", o "sin factores destacados". */
  motivos: string
  nivel: Nivel
  /** "la semana pasada respondió: No le di" · "sin respuesta hace 7 días o más" · null */
  seguimiento: string | null
  accion: Accion
  /** "seguimiento: …" o "puntaje, capacidad de N visitas" */
  regla: string
}

/** Una semana de GET /ninos/{id}/historial (de la más reciente a la más antigua). */
export interface SemanaHistorial {
  registro_id?: number
  version_alarma?: number
  alarma_pendiente?: boolean
  atenciones?: AtencionAlarma[]
  semana: SemanaIso
  /** null si en esa semana solo se envió el recordatorio, sin generar la lista. */
  accion: Accion | null
  puntaje: number | null
  respuesta: Respuesta
  razon: Razon | null
  /** Lo que escribió el cuidador (en "Otro motivo" o sin que se le preguntara), o el aviso de un audio. */
  detalle?: string | null
  /** Razón que asignó el clasificador local al mensaje escrito. */
  razon_decisor?: string | null
  /** Posible señal de peligro detectada en el mensaje. */
  alarma?: boolean
  /** El mensaje debe leerlo una persona. */
  derivar?: boolean
}

/** POST /establecimientos/{id}/recordatorios */
export interface ResultadoRecordatorios {
  enviados: number
  fallidos: number
  omitidos_por_baja: number
}

export interface SemanaIndicadores {
  alarmas_pendientes?: number
  alarmas_atendidas?: number
  /** Niños con posible señal de peligro durante esta semana. */
  alarmas?: number
  semana: SemanaIso
  enviados: number
  fallidos: number
  respondidos: number
  si_le_di: number
}

/** GET /establecimientos/{id}/indicadores */
export interface Indicadores {
  /** Niños con alguna alarma pendiente, incluidas semanas anteriores. */
  alarmas_pendientes?: number
  /** Niños con posible señal de peligro; puede faltar en versiones anteriores de la API. */
  alarmas?: number
  establecimiento_id: string
  /** De la semana más antigua a la pedida (hasta 5). */
  serie: SemanaIndicadores[]
  meta_alerta: string | null
}

const enc = encodeURIComponent

export const yawarApi = {
  consultarLista: (establecimiento: string) =>
    http.get<FilaLista[]>(`/establecimientos/${enc(establecimiento)}/lista`),
  registrarAtencion: (idNino: string, registroId: number, version: number, medio: MedioAtencion) =>
    http.post<AtencionAlarma>(`/ninos/${enc(idNino)}/alarmas/${registroId}/atencion`, {
      medio, version_alarma: version,
    }),
  salud: () => http.get<Salud>('/salud'),

  /** Genera (o regenera) la lista de la semana actual: escribe en la base. */
  generarLista: (establecimiento: string, capacidad: number) =>
    http.post<FilaLista[]>(`/establecimientos/${enc(establecimiento)}/lista`, undefined, {
      params: { capacidad },
    }),

  /** La misma lista en CSV (también la regenera). */
  listaCsv: (establecimiento: string, capacidad: number) =>
    http.get<string>(`/establecimientos/${enc(establecimiento)}/lista.csv`, {
      params: { capacidad },
      headers: { Accept: 'text/csv' },
    }),

  /** Envía el recordatorio semanal a todos los cuidadores del establecimiento (no duplica). */
  enviarRecordatorios: (establecimiento: string) =>
    http.post<ResultadoRecordatorios>(`/establecimientos/${enc(establecimiento)}/recordatorios`),

  historial: (idNino: string) => http.get<SemanaHistorial[]>(`/ninos/${enc(idNino)}/historial`),

  indicadores: (establecimiento: string, semana?: SemanaIso) =>
    http.get<Indicadores>(`/establecimientos/${enc(establecimiento)}/indicadores`, { params: { semana } }),

  /** Carga el padrón (CSV). Si una fila falla, la API no carga nada y responde 400. */
  cargarPadron: (archivo: Blob, nombre = 'padron.csv') => {
    const body = new FormData()
    body.append('archivo', archivo, nombre)
    return http.post<{ cargados: number }>('/padron', body)
  },
}
