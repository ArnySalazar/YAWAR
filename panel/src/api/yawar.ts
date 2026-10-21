/**
 * Las 7 rutas de la API de YAWAR que usa el panel, con sus tipos tal como responden.
 * Es la única puerta hacia la API: las pantallas transforman estos datos en su `api.ts`.
 * Rutas y reglas documentadas en el README de la raíz y en http://localhost:8000/docs.
 */
import { http } from './http'

/** Semana ISO en hora de Lima, como la calcula la API: "2026-W43". */
export type SemanaIso = string

export type Accion = 'visita' | 'whatsapp'
export type Respuesta = 'si_le_di' | 'no_le_di' | 'problema' | 'sin_respuesta'
export type Razon = 'sabor' | 'estrenimiento' | 'se_acabo' | 'olvido' | 'otro'
/** 0 = la semana pasada respondió "No le di" o "Tuve un problema"; 1 = no respondió en 7 días o más; 2 = sin novedad. */
export type Nivel = 0 | 1 | 2

/** GET /salud */
export interface Salud {
  ok: boolean
  modo_prueba: boolean
  /** Hora de Lima, sin zona: "2026-10-21T10:17:00.123456". */
  hora_local: string
}

/** Una fila de POST /establecimientos/{id}/lista */
export interface FilaLista {
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
  semana: SemanaIso
  /** null si en esa semana solo se envió el recordatorio, sin generar la lista. */
  accion: Accion | null
  puntaje: number | null
  respuesta: Respuesta
  razon: Razon | null
}

/** POST /establecimientos/{id}/recordatorios */
export interface ResultadoRecordatorios {
  enviados: number
  fallidos: number
  omitidos_por_baja: number
}

export interface SemanaIndicadores {
  semana: SemanaIso
  enviados: number
  fallidos: number
  respondidos: number
  si_le_di: number
}

/** GET /establecimientos/{id}/indicadores */
export interface Indicadores {
  establecimiento_id: string
  /** De la semana más antigua a la pedida (hasta 5). */
  serie: SemanaIndicadores[]
  meta_alerta: string | null
}

const enc = encodeURIComponent

export const yawarApi = {
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
