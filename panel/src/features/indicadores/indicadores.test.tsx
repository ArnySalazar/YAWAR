// Pantalla "Indicadores de seguimiento" contra la API simulada (mismo formato que la real).
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Indicadores, SemanaHistorial } from '@/api/yawar'
import { HISTORIALES, INDICADORES } from '@/test/datos'
import { errorApi, mockApi, renderizar, type PedidoApi } from '@/test/utilidades'
import IndicadoresPage from './IndicadoresPage'
import {
  barHeight,
  buildIndicatorsCsv,
  buildIndicatorsReport,
  chartMax,
  countDifficultyReasons,
  MAX_BAR_PX,
  topReasonText,
  weekOptionsFrom,
} from './api'

const RUTA_INDICADORES = 'GET /establecimientos/EESS01/indicadores'

/** Serie con fallas de envío y la semana actual a medias (como un miércoles real). */
const CON_FALLAS: Indicadores = {
  establecimiento_id: 'EESS01',
  serie: [
    { semana: '2026-W41', enviados: 8, fallidos: 0, respondidos: 7, si_le_di: 5 },
    { semana: '2026-W42', enviados: 8, fallidos: 2, respondidos: 6, si_le_di: 4 },
    { semana: '2026-W43', enviados: 4, fallidos: 0, respondidos: 1, si_le_di: 1 },
  ],
  meta_alerta: null,
}

/** La semana 43 recién empieza: la API la incluye en ceros aunque no tenga envíos. */
const SIN_ENVIOS: Indicadores = {
  establecimiento_id: 'EESS01',
  serie: [{ semana: '2026-W43', enviados: 0, fallidos: 0, respondidos: 0, si_le_di: 0 }],
  meta_alerta: null,
}

/** Responde como la API: con `?semana=` corta la serie en esa semana. */
function indicadoresPorSemana(pedido: PedidoApi): Indicadores {
  const semana = pedido.params.get('semana')
  if (!semana) return INDICADORES
  return { ...INDICADORES, serie: INDICADORES.serie.filter((s) => s.semana <= semana) }
}

describe('Adaptador de Indicadores', () => {
  it('calcula las tasas con las cifras de la API (enviados como base, fallas aparte)', () => {
    const report = buildIndicatorsReport(CON_FALLAS, { semana: '2026-W42', semanaActual: '2026-W43' })
    expect(report).toMatchObject({
      semana: '2026-W42',
      hasActivity: true,
      reminders: { attempted: 10, sent: 8 },
      deliveryFailures: { count: 2, share: 0.2 },
      responses: { received: 6, sent: 8, rate: 0.75 },
      adherence: { declaredYes: 4, casesWithDifficulties: 2 },
    })
    // Sin semana pedida, se analiza la última de la serie (la actual)
    const actual = buildIndicatorsReport(INDICADORES, { semanaActual: '2026-W43' })
    expect(actual).toMatchObject({ semana: '2026-W43', responses: { rate: 0.5 }, deliveryFailures: { share: 0 } })
    expect(actual.weeklyTrend.map((p) => [p.semana, p.inProgress])).toEqual([
      ['2026-W41', false],
      ['2026-W42', false],
      ['2026-W43', true],
    ])
  })

  it('sin envíos no inventa tasas: quedan en null y la semana se marca sin actividad', () => {
    const report = buildIndicatorsReport(SIN_ENVIOS, { semanaActual: '2026-W43' })
    expect(report).toMatchObject({
      hasActivity: false,
      reminders: { attempted: 0, sent: 0 },
      deliveryFailures: { share: null },
      responses: { rate: null },
    })
  })

  it('arma el selector con las semanas de la serie, de la más reciente a la más antigua', () => {
    expect(weekOptionsFrom(INDICADORES, '2026-W43')).toEqual([
      { semana: '2026-W43', label: 'Semana 43 · 19 – 25 oct 2026 (en curso)' },
      { semana: '2026-W42', label: 'Semana 42 · 12 – 18 oct 2026' },
      { semana: '2026-W41', label: 'Semana 41 · 5 – 11 oct 2026' },
    ])
  })

  it('cuenta los motivos con el historial de cada niño (las 5 razones del bot)', () => {
    const w43 = countDifficultyReasons(HISTORIALES, '2026-W43')
    expect(w43).toMatchObject({ familiesReporting: 1, withoutReason: 0, childrenCounted: 4 })
    expect(w43.reasons.map((r) => [r.label, r.cases])).toEqual([
      ['Estreñimiento', 1],
      ['No le gusta', 0],
      ['Se acabó el hierro', 0],
      ['Se me olvidó', 0],
      ['Otro motivo', 0],
    ])
    expect(topReasonText(w43)).toBe('Motivo más frecuente: Estreñimiento (1 caso)')

    const w42 = countDifficultyReasons(HISTORIALES, '2026-W42')
    expect(w42.reasons[0]).toMatchObject({ id: 'sabor', label: 'No le gusta', cases: 1 })
  })

  it('separa a quienes respondieron con dificultad pero aún no eligieron el motivo', () => {
    const historiales: Record<string, SemanaHistorial[]> = {
      A: [{ semana: '2026-W43', accion: 'whatsapp', puntaje: 0.4, respuesta: 'no_le_di', razon: 'olvido' }],
      B: [{ semana: '2026-W43', accion: 'whatsapp', puntaje: 0.4, respuesta: 'problema', razon: 'olvido' }],
      C: [{ semana: '2026-W43', accion: 'visita', puntaje: 0.4, respuesta: 'no_le_di', razon: null }],
      D: [{ semana: '2026-W43', accion: 'visita', puntaje: 0.4, respuesta: 'si_le_di', razon: null }],
    }
    const resumen = countDifficultyReasons(historiales, '2026-W43')
    expect(resumen).toMatchObject({ familiesReporting: 3, withoutReason: 1, childrenCounted: 4 })
    expect(resumen.reasons[0]).toMatchObject({ id: 'olvido', cases: 2 })
    expect(topReasonText(resumen)).toBe('Motivo más frecuente: Se me olvidó (2 casos)')
  })

  it('escala el gráfico al valor máximo real de la serie', () => {
    const report = buildIndicatorsReport(CON_FALLAS, { semanaActual: '2026-W43' })
    expect(chartMax(report.weeklyTrend)).toBe(8)
    expect(barHeight(8, 8)).toBe(MAX_BAR_PX)
    expect(barHeight(4, 8)).toBe(MAX_BAR_PX / 2)
    // El mismo valor ocupa más altura si el máximo es menor: no hay alto fijo por unidad
    expect(barHeight(4, 4)).toBe(MAX_BAR_PX)
    expect(barHeight(0, 0)).toBe(0)
  })

  it('exporta un CSV con las etiquetas de la API (enviados, no "entregados")', () => {
    const report = buildIndicatorsReport(CON_FALLAS, { semana: '2026-W42', semanaActual: '2026-W43' })
    const csv = buildIndicatorsCsv(report, countDifficultyReasons(HISTORIALES, '2026-W42'))
    expect(csv).toContain('Enviados (aceptados por WhatsApp),8')
    expect(csv).toContain('Tasa de respuesta (% = respuestas / enviados),75.0')
    expect(csv).toContain('2026-W41,8,7,87.5')
    expect(csv).toContain('No le gusta,1')
    expect(csv).not.toMatch(/entregad|en cola|epidemiol/i)
  })
})

describe('Pantalla de Indicadores', () => {
  it('muestra las cifras de la API, la tendencia y los motivos contados con el historial', async () => {
    const api = mockApi()
    renderizar(<IndicadoresPage />)

    const kpis = await screen.findByRole('region', { name: 'Indicadores clave' })
    expect(api.pedidosA('GET', '/establecimientos/EESS01/indicadores')[0].params.get('semana')).toBeNull()
    expect(within(kpis).getByText('recordatorios programados')).toBeInTheDocument()
    expect(within(kpis).getByText('enviados (100.0%): aceptados por WhatsApp, sin confirmación de lectura', { exact: false })).toBeInTheDocument()
    expect(within(kpis).getByText('50.0% tasa de respuesta')).toBeInTheDocument()
    expect(within(kpis).getByText('2 cuidadores respondieron de 4 recordatorios enviados')).toBeInTheDocument()
    expect(within(kpis).getByText('«Sí le di» (50.0%)')).toBeInTheDocument()
    expect(within(kpis).getByText('1 caso con dificultades (50.0%)')).toBeInTheDocument()
    expect(screen.getByText('= 50.0%')).toBeInTheDocument()

    // Tendencia: una columna por semana de la serie, con la tasa de cada una
    expect(screen.getByTitle('Semana 41: 4 enviados, 3 respuestas')).toBeInTheDocument()
    expect(screen.getByText('75.0%')).toBeInTheDocument()
    expect(screen.getByText('En curso')).toBeInTheDocument()

    // Motivos: N0003 respondió "Tuve un problema: Estreñimiento" esta semana
    expect(await screen.findByText('Motivo más frecuente: Estreñimiento (1 caso)')).toBeInTheDocument()
    expect(screen.getByText('1 cuidador respondió «No le di» o «Tuve un problema» (Semana 43)')).toBeInTheDocument()
    expect(screen.getByText('Sobre los 4 niños de la lista actual de EESS01.')).toBeInTheDocument()
    expect(screen.getByText('1 caso (100%)')).toBeInTheDocument()
  })

  it('dibuja las barras proporcionales al valor más alto de la serie', async () => {
    mockApi({ [RUTA_INDICADORES]: CON_FALLAS })
    renderizar(<IndicadoresPage />)
    const semana41 = await screen.findByTitle('Semana 41: 8 enviados, 7 respuestas')
    const semana43 = screen.getByTitle('Semana 43: 4 enviados, 1 respuestas')
    const alto = (columna: HTMLElement, serie: string) =>
      (columna.querySelector(`[data-serie="${serie}"]`) as HTMLElement).style.height
    expect(alto(semana41, 'enviados')).toBe(`${MAX_BAR_PX}px`)
    expect(alto(semana43, 'enviados')).toBe(`${MAX_BAR_PX / 2}px`)
    expect(alto(semana43, 'respuestas')).toBe(`${MAX_BAR_PX / 8}px`)
  })

  it('no muestra métricas que la API no mide ni conmutadores o avisos de demostración', async () => {
    mockApi()
    const { container } = renderizar(<IndicadoresPage />)
    await screen.findByRole('region', { name: 'Indicadores clave' })
    await screen.findByText('Motivo más frecuente: Estreñimiento (1 caso)')
    const texto = container.textContent ?? ''
    expect(texto).not.toMatch(/uptime|latencia|en cola|reintento|entregad/i)
    expect(texto).not.toMatch(/epidemiol|\bSE \d|HIS-MINSA|Norma Técnica/i)
    expect(texto).not.toMatch(/demostración|ficticios|Prioridad de consejería/i)
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.queryByRole('radio', { name: 'Vacío' })).toBeNull()
  })

  it('muestra la meta-alerta con su aviso de falsa alarma al inicio de la semana', async () => {
    mockApi({
      [RUTA_INDICADORES]: { ...INDICADORES, meta_alerta: 'Llegaron muchas menos respuestas que en semanas anteriores.' },
    })
    renderizar(<IndicadoresPage />)
    const alerta = await screen.findByRole('alert', { name: 'Meta-alerta' })
    expect(alerta).toHaveTextContent('Meta-alerta · Semana 43')
    expect(alerta).toHaveTextContent('Llegaron muchas menos respuestas que en semanas anteriores.')
    expect(alerta).toHaveTextContent('Al inicio de la semana puede aparecer aunque nada esté roto')
    expect(within(alerta).getByRole('link', { name: 'Planificación' })).toHaveAttribute('href', '/planificacion')
  })

  it('sin meta-alerta no muestra el banner', async () => {
    mockApi()
    renderizar(<IndicadoresPage />)
    await screen.findByRole('region', { name: 'Indicadores clave' })
    expect(screen.queryByRole('alert', { name: 'Meta-alerta' })).toBeNull()
  })

  it('al cambiar de semana pide ?semana= a la API y recalcula cifras y motivos', async () => {
    const api = mockApi({ [RUTA_INDICADORES]: indicadoresPorSemana })
    renderizar(<IndicadoresPage />)
    await screen.findByText('Motivo más frecuente: Estreñimiento (1 caso)')

    const selector = screen.getByRole('combobox', { name: 'Semana' })
    expect(within(selector).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Semana 43 · 19 – 25 oct 2026 (en curso)',
      'Semana 42 · 12 – 18 oct 2026',
      'Semana 41 · 5 – 11 oct 2026',
    ])
    fireEvent.change(selector, { target: { value: '2026-W42' } })

    await waitFor(() =>
      expect(api.pedidosA('GET', '/establecimientos/EESS01/indicadores').map((p) => p.params.get('semana'))).toContain(
        '2026-W42',
      ),
    )
    // N0001 respondió "No le di: No le gusta" en la semana 42
    expect(await screen.findByText('Motivo más frecuente: No le gusta (1 caso)')).toBeInTheDocument()
    expect(screen.getByText('1 cuidador respondió «No le di» o «Tuve un problema» (Semana 42)')).toBeInTheDocument()
    expect(screen.queryByText('En curso')).toBeNull()
    // Volver a la semana actual no repite el pedido sin `?semana=`: ya está en memoria
    fireEvent.change(selector, { target: { value: '2026-W43' } })
    expect(await screen.findByText('Motivo más frecuente: Estreñimiento (1 caso)')).toBeInTheDocument()
    const sinSemana = api.pedidosA('GET', '/establecimientos/EESS01/indicadores').filter((p) => !p.params.has('semana'))
    expect(sinSemana).toHaveLength(1)
  })

  it('cambia de establecimiento desde el selector de la pantalla', async () => {
    const api = mockApi({
      'GET /establecimientos/EESS02/indicadores': { ...SIN_ENVIOS, establecimiento_id: 'EESS02' },
      'POST /establecimientos/EESS02/lista': [],
    })
    renderizar(<IndicadoresPage />)
    await screen.findByRole('region', { name: 'Indicadores clave' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Establecimiento' }), { target: { value: 'EESS02' } })
    expect(await screen.findByText('Sin envíos en la Semana 43')).toBeInTheDocument()
    expect(api.pedidosA('GET', '/establecimientos/EESS02/indicadores')).toHaveLength(1)
  })

  it('sin envíos en la semana muestra el estado vacío y lleva a Planificación', async () => {
    mockApi({ [RUTA_INDICADORES]: SIN_ENVIOS })
    renderizar(<IndicadoresPage />)
    expect(await screen.findByText('Sin envíos en la Semana 43')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Planificación' })).toHaveAttribute('href', '/planificacion')
    expect(screen.queryByRole('region', { name: 'Indicadores clave' })).toBeNull()
    expect(screen.queryByText('Motivos de dificultad reportados')).toBeNull()
    expect(screen.queryByText('Evolución semanal: Envíos vs. Respuestas')).toBeNull()
  })

  it('si la API de indicadores falla, muestra el motivo y permite reintentar', async () => {
    mockApi({ [RUTA_INDICADORES]: errorApi(500, 'Internal Server Error') })
    renderizar(<IndicadoresPage />)
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('No se pudo cargar la información.')
    expect(alerta).toHaveTextContent('Internal Server Error')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('si no se puede leer la lista, los indicadores se ven y los motivos avisan del error', async () => {
    mockApi({ 'POST /establecimientos/EESS01/lista': errorApi(500, 'Internal Server Error') })
    renderizar(<IndicadoresPage />)
    await screen.findByRole('region', { name: 'Indicadores clave' })
    expect(await screen.findByText('No se pudieron contar los motivos.')).toBeInTheDocument()
  })

  it('indica el modo prueba que informa /salud', async () => {
    mockApi()
    renderizar(<IndicadoresPage />)
    expect(await screen.findByText('MODO PRUEBA · SEGUIMIENTO SEMANAL')).toBeInTheDocument()
    expect(await screen.findByText('WhatsApp Cloud API (modo prueba)')).toBeInTheDocument()
  })

  it('exporta el CSV en el navegador y el PDF con la impresión', async () => {
    mockApi()
    const blobs: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn((blob: Blob) => {
        blobs.push(blob)
        return 'blob:indicadores'
      }),
    })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() })
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderizar(<IndicadoresPage />)
    await screen.findByText('Motivo más frecuente: Estreñimiento (1 caso)')

    const exportar = screen.getByRole('button', { name: 'Exportar informe (PDF/CSV)' })
    fireEvent.click(exportar)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Descargar CSV' }))
    expect(clic).toHaveBeenCalledTimes(1)
    const csv = await blobs[0].text()
    expect(csv).toContain('Respuestas recibidas,2')
    expect(csv).toContain('Estreñimiento,1')

    fireEvent.click(exportar)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Imprimir / guardar como PDF' }))
    expect(imprimir).toHaveBeenCalledTimes(1)
  })
})
