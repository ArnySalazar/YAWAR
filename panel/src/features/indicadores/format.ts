import { porcentaje } from '@/lib/dominio'

/** Tasa (0 a 1) con un decimal: 0.96 -> "96.0%". Sin denominador (null), "—". */
export function pctText(rate: number | null, digits = 1) {
  return rate === null ? '—' : porcentaje(rate, digits)
}

/** Ancho de una barra en % (0 a 100) a partir de una tasa (0 a 1). */
export function pctWidth(rate: number | null) {
  return rate === null ? 0 : Math.min(100, Math.max(0, rate * 100))
}

/** Porcentaje entero redondeado (para los motivos de dificultad). */
export function pctRounded(numerator: number, denominator: number) {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

/** "1 caso" · "3 casos" */
export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`
}
