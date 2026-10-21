/**
 * Semanas ISO (de lunes a domingo), las mismas que usa la API ("2026-W43").
 * Ojo: no es la semana epidemiológica del MINSA (de domingo a sábado); por eso el panel dice
 * "Semana 43" y no "semana epidemiológica 43". Ver docs/panel/DECISIONES.md.
 */
import type { SemanaIso } from '@/api/yawar'

/** "AAAA-MM-DD" de una fecha-hora local de la API ("2026-10-21T10:17:00.12") o de una fecha ISO. */
export function diaDe(fechaHora: string) {
  return fechaHora.slice(0, 10)
}

function aUtc(dia: string) {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

function aDia(fecha: Date) {
  return fecha.toISOString().slice(0, 10)
}

/** Semana ISO de un día "AAAA-MM-DD", igual que semana_iso() en api/db.py. */
export function semanaIso(dia: string): SemanaIso {
  const fecha = aUtc(dia)
  fecha.setUTCDate(fecha.getUTCDate() + 4 - (fecha.getUTCDay() || 7))
  const inicioAnio = Date.UTC(fecha.getUTCFullYear(), 0, 1)
  const numero = Math.ceil(((fecha.getTime() - inicioAnio) / 86_400_000 + 1) / 7)
  return `${fecha.getUTCFullYear()}-W${String(numero).padStart(2, '0')}`
}

export function partesSemana(semana: SemanaIso) {
  const m = /^(\d{4})-W(\d{2})$/.exec(semana)
  return m ? { anio: Number(m[1]), numero: Number(m[2]) } : null
}

/** Lunes y domingo ("AAAA-MM-DD") de una semana ISO. */
export function rangoSemana(semana: SemanaIso) {
  const partes = partesSemana(semana)
  if (!partes) return null
  // El 4 de enero siempre cae en la semana 1
  const cuatroEnero = aUtc(`${partes.anio}-01-04`)
  const lunesSemana1 = new Date(cuatroEnero)
  lunesSemana1.setUTCDate(cuatroEnero.getUTCDate() - ((cuatroEnero.getUTCDay() || 7) - 1))
  const inicio = new Date(lunesSemana1)
  inicio.setUTCDate(lunesSemana1.getUTCDate() + (partes.numero - 1) * 7)
  const fin = new Date(inicio)
  fin.setUTCDate(inicio.getUTCDate() + 6)
  return { inicio: aDia(inicio), fin: aDia(fin) }
}

/** Semana ISO anterior. */
export function semanaAnterior(semana: SemanaIso): SemanaIso {
  const rango = rangoSemana(semana)
  if (!rango) return semana
  const fecha = aUtc(rango.inicio)
  fecha.setUTCDate(fecha.getUTCDate() - 7)
  return semanaIso(aDia(fecha))
}

// Tabla propia (y no Intl): los navegadores no coinciden en mayúsculas ni en "sep" o "set".
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']

function mes(dia: string, nombres = MESES_CORTOS) {
  return nombres[Number(dia.slice(5, 7)) - 1]
}

/** "19 – 25 oct" o "29 sep – 5 oct". */
export function rangoCorto(semana: SemanaIso) {
  const rango = rangoSemana(semana)
  if (!rango) return ''
  const [, , dIni] = rango.inicio.split('-').map(Number)
  const [, , dFin] = rango.fin.split('-').map(Number)
  return mes(rango.inicio) === mes(rango.fin)
    ? `${dIni} – ${dFin} ${mes(rango.fin)}`
    : `${dIni} ${mes(rango.inicio)} – ${dFin} ${mes(rango.fin)}`
}

/** "Semana 43" */
export function etiquetaSemana(semana: SemanaIso) {
  const partes = partesSemana(semana)
  return partes ? `Semana ${partes.numero}` : semana
}

/** "Semana 43 · 19 – 25 oct 2026" */
export function etiquetaSemanaLarga(semana: SemanaIso) {
  const partes = partesSemana(semana)
  return partes ? `Semana ${partes.numero} · ${rangoCorto(semana)} ${partes.anio}` : semana
}

/** "Octubre" (mes del domingo de la semana), para agrupar semanas en selectores. */
export function mesDeSemana(semana: SemanaIso) {
  const rango = rangoSemana(semana)
  if (!rango) return ''
  const nombre = mes(rango.fin, MESES)
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}
