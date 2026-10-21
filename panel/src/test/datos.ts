/**
 * Respuestas de la API para las pruebas, con el mismo formato que devuelve la API real
 * (comprobado el 2026-10-20, ver docs/panel/evidencias/2026-10-20_analisis_api_por_modulo.md).
 * Niños del padrón simulado de ejemplo (datos/padron_ejemplo.csv), establecimiento EESS01.
 */
import type { FilaLista, Indicadores, Salud, SemanaHistorial } from '@/api/yawar'

/** Miércoles 21 de octubre de 2026: semana ISO 2026-W43 (19 al 25 de octubre). */
export const SALUD: Salud = { ok: true, modo_prueba: true, hora_local: '2026-10-21T10:00:00.000001' }

export const LISTA: FilaLista[] = [
  {
    orden: 1,
    id_nino: 'N0001',
    alias_cuidador: 'Mamá de N0001',
    edad_meses: 8,
    puntaje: 0.278,
    motivos: 'sin factores destacados',
    nivel: 0,
    seguimiento: 'la semana pasada respondió: No le di',
    accion: 'visita',
    regla: 'seguimiento: la semana pasada respondió: No le di',
  },
  {
    orden: 2,
    id_nino: 'N0002',
    alias_cuidador: 'Mamá de N0002',
    edad_meses: 14,
    puntaje: 0.36,
    motivos: 'sin factores destacados',
    nivel: 1,
    seguimiento: 'sin respuesta hace 7 días o más',
    accion: 'visita',
    regla: 'seguimiento: sin respuesta hace 7 días o más',
  },
  {
    orden: 3,
    id_nino: 'N0004',
    alias_cuidador: 'Mamá de N0004',
    edad_meses: 30,
    puntaje: 0.581,
    motivos: 'tiene 18 meses o más',
    nivel: 2,
    seguimiento: null,
    accion: 'whatsapp',
    regla: 'puntaje, capacidad de 2 visitas',
  },
  {
    orden: 4,
    id_nino: 'N0003',
    alias_cuidador: 'Papá de N0003',
    edad_meses: 22,
    puntaje: 0.571,
    motivos: 'tiene 18 meses o más; sin controles recientes',
    nivel: 2,
    seguimiento: null,
    accion: 'whatsapp',
    regla: 'puntaje, capacidad de 2 visitas',
  },
]

export const HISTORIALES: Record<string, SemanaHistorial[]> = {
  N0001: [
    { semana: '2026-W43', accion: 'visita', puntaje: 0.278, respuesta: 'sin_respuesta', razon: null },
    { semana: '2026-W42', accion: 'whatsapp', puntaje: 0.278, respuesta: 'no_le_di', razon: 'sabor' },
    { semana: '2026-W41', accion: 'whatsapp', puntaje: 0.278, respuesta: 'si_le_di', razon: null },
  ],
  N0002: [
    { semana: '2026-W43', accion: 'visita', puntaje: 0.36, respuesta: 'sin_respuesta', razon: null },
    { semana: '2026-W42', accion: 'whatsapp', puntaje: 0.36, respuesta: 'sin_respuesta', razon: null },
  ],
  N0004: [{ semana: '2026-W43', accion: 'whatsapp', puntaje: 0.581, respuesta: 'si_le_di', razon: null }],
  N0003: [{ semana: '2026-W43', accion: 'whatsapp', puntaje: 0.571, respuesta: 'problema', razon: 'estrenimiento' }],
}

export const INDICADORES: Indicadores = {
  establecimiento_id: 'EESS01',
  serie: [
    { semana: '2026-W41', enviados: 4, fallidos: 0, respondidos: 3, si_le_di: 2 },
    { semana: '2026-W42', enviados: 4, fallidos: 0, respondidos: 2, si_le_di: 1 },
    { semana: '2026-W43', enviados: 4, fallidos: 0, respondidos: 2, si_le_di: 1 },
  ],
  meta_alerta: null,
}
