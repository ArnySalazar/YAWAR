/**
 * Traducción de los códigos de la API a lo que se muestra en pantalla.
 * RESPUESTAS y RAZONES copian bot/mensajes.py: si cambian allá, se actualizan aquí.
 */
import type { FilaLista, Razon, Respuesta, SemanaHistorial } from '@/api/yawar'

export const RESPUESTAS: Record<Respuesta, string> = {
  si_le_di: 'Sí le di',
  no_le_di: 'No le di',
  problema: 'Tuve un problema',
  sin_respuesta: 'Sin respuesta',
}

export const RAZONES: Record<Razon, string> = {
  sabor: 'No le gusta',
  estrenimiento: 'Estreñimiento',
  se_acabo: 'Se acabó el hierro',
  olvido: 'Se me olvidó',
  otro: 'Otro motivo',
}

export const ORDEN_RAZONES: Razon[] = ['estrenimiento', 'sabor', 'se_acabo', 'olvido', 'otro']

/** Respuesta + razón en una línea: "Tuve un problema: Estreñimiento". */
export function textoRespuesta(respuesta: Respuesta, razon: Razon | null) {
  return razon ? `${RESPUESTAS[respuesta]}: ${RAZONES[razon]}` : RESPUESTAS[respuesta]
}

/** Qué pasó la semana pasada según la lista: el texto de `seguimiento` termina con la respuesta. */
export type SenalSeguimiento = 'problema' | 'no_le_di' | 'sin_respuesta' | null

export function senalDeFila(fila: Pick<FilaLista, 'nivel' | 'seguimiento'>): SenalSeguimiento {
  if (fila.nivel === 1) return 'sin_respuesta'
  if (fila.nivel !== 0) return null
  const texto = fila.seguimiento ?? ''
  if (texto.endsWith(RESPUESTAS.problema)) return 'problema'
  // Señal de peligro o mensaje que debe leer una persona: se muestran como problema reportado;
  // el texto completo va en la nota de seguimiento de la fila.
  if (texto.startsWith('POSIBLE SEÑAL') || texto.startsWith('mensaje para leer')) return 'problema'
  return 'no_le_di'
}

/** "la semana pasada respondió: No le di" → "La semana pasada respondió: No le di" */
export function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Los motivos del modelo vienen como "a; b; c". */
export function listaMotivos(motivos: string) {
  return motivos
    .split(';')
    .map((m) => m.trim())
    .filter(Boolean)
}

/** "Mamá de N0001" → "Mamá". Si el alias no sigue ese formato, se devuelve completo. */
export function parentesco(alias: string) {
  const m = /^(.+?)\s+de\s+/i.exec(alias)
  return m ? m[1] : alias
}

export type GrupoEdad = '6-11' | '12-23' | '24-35'

export function grupoEdad(meses: number): GrupoEdad {
  if (meses < 12) return '6-11'
  if (meses < 24) return '12-23'
  return '24-35'
}

export function porcentaje(valor: number, decimales = 0) {
  return `${(valor * 100).toFixed(decimales)}%`
}

/** Tasa a / b en %, o null si b es 0. */
export function tasa(a: number, b: number) {
  return b > 0 ? a / b : null
}

/** Última semana con respuesta del cuidador (el historial viene de la más reciente a la más antigua). */
export function ultimaRespuesta(historial: SemanaHistorial[] | undefined) {
  return historial?.find((s) => s.respuesta !== 'sin_respuesta') ?? null
}

/** Respuesta de una semana concreta, si hay registro. */
export function respuestaDeSemana(historial: SemanaHistorial[] | undefined, semana: string) {
  return historial?.find((s) => s.semana === semana) ?? null
}
