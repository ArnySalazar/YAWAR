// Pantalla "Comunicación" (respuestas de la semana) contra la API simulada (mismo formato que la real).
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FilaLista, Razon, Respuesta, SemanaHistorial } from '@/api/yawar'
import { HISTORIALES, INDICADORES, LISTA } from '@/test/datos'
import { errorApi, mockApi, renderizar } from '@/test/utilidades'
import ComunicacionPage from './ComunicacionPage'
import {
  buildResponse,
  buildWeekResponses,
  countResponses,
  queryResponses,
  responseTypeOf,
  weekOptions,
  weekSummary,
} from './api'
import { buildResponsesCsv } from './csv'

const fila = (id: string) => LISTA.find((f) => f.id_nino === id)!
const registro = (id: string, semana: string) => HISTORIALES[id].find((s) => s.semana === semana)!

/** Un niño más de la lista con su registro de la semana 43. */
function extra(orden: number, id: string, alias: string, respuesta: Respuesta, razon: Razon | null): [FilaLista, SemanaHistorial] {
  return [
    {
      orden,
      id_nino: id,
      alias_cuidador: alias,
      edad_meses: 7 + orden,
      puntaje: 0.3,
      motivos: 'sin factores destacados',
      nivel: 2,
      seguimiento: null,
      accion: 'whatsapp',
      regla: 'puntaje, capacidad de 2 visitas',
    },
    { semana: '2026-W43', accion: 'whatsapp', puntaje: 0.3, respuesta, razon },
  ]
}

/** Cuatro niños más (8 en total) para probar la paginación de 6 en 6 y las demás razones. */
const EXTRA = [
  extra(5, 'N0005', 'Abuela de N0005', 'no_le_di', 'olvido'),
  extra(6, 'N0006', 'Mamá de N0006', 'no_le_di', null),
  extra(7, 'N0007', 'Mamá de N0007', 'si_le_di', null),
  extra(8, 'N0008', 'Papá de N0008', 'problema', 'se_acabo'),
]

const rutasExtra = {
  'POST /establecimientos/EESS01/lista': [...LISTA, ...EXTRA.map(([f]) => f)],
  ...Object.fromEntries(EXTRA.map(([f, r]) => [`GET /ninos/${f.id_nino}/historial`, [r]])),
}

function tarjetaKpi(titulo: string) {
  return screen.getByRole('heading', { name: titulo }).closest('article') as HTMLElement
}

async function listaRespuestas() {
  return screen.findByRole('list', { name: 'Respuestas de cuidadores' })
}

function codigosEnLista(lista: HTMLElement) {
  return within(lista)
    .getAllByRole('listitem')
    .map((li) => /N\d{4}/.exec(li.textContent ?? '')?.[0])
}

describe('Adaptador de Comunicación', () => {
  it('traduce la respuesta de la API al tipo de la pantalla', () => {
    expect(responseTypeOf('problema')).toBe('problema')
    expect(responseTypeOf('no_le_di')).toBe('no_consumo')
    expect(responseTypeOf('si_le_di')).toBe('favorable')
    expect(responseTypeOf('sin_respuesta')).toBe('sin_respuesta')
  })

  it('arma el mensaje con la respuesta y la razón, el parentesco del alias y la acción de la semana', () => {
    expect(buildResponse(fila('N0003'), registro('N0003', '2026-W43'))).toMatchObject({
      childCode: 'N0003',
      ageMonths: 22,
      caregiverAlias: 'Papá de N0003',
      caregiverRole: 'Papá',
      responseType: 'problema',
      message: 'Tuve un problema: Estreñimiento',
      reason: 'estrenimiento',
      reasonLabel: 'Estreñimiento',
      reasonSeverity: 'critica',
      action: 'whatsapp',
    })
    expect(buildResponse(fila('N0001'), registro('N0001', '2026-W42'))).toMatchObject({
      responseType: 'no_consumo',
      message: 'No le di: No le gusta',
      reasonLabel: 'No le gusta',
      reasonSeverity: 'advertencia',
    })
    expect(buildResponse(fila('N0004'), registro('N0004', '2026-W43'))).toMatchObject({
      responseType: 'favorable',
      message: 'Sí le di',
      reason: 'consumo_completo',
      reasonLabel: 'Consumo completo',
      reasonSeverity: 'positiva',
    })
    expect(buildResponse(fila('N0001'), registro('N0001', '2026-W43'))).toMatchObject({
      responseType: 'sin_respuesta',
      message: 'Sin respuesta',
      reason: null,
      reasonLabel: null,
      action: 'visita',
    })
  })

  it('lista a los niños con registro en la semana: primero las dificultades y cuenta cada tipo', () => {
    const semana43 = buildWeekResponses(LISTA, HISTORIALES, '2026-W43')
    expect(semana43.items.map((i) => i.childCode)).toEqual(['N0003', 'N0001', 'N0002', 'N0004'])
    expect(semana43.withoutRecord).toBe(0)
    expect(countResponses(semana43.items)).toEqual({ problema: 1, no_consumo: 0, sin_respuesta: 2, favorable: 1, total: 4 })

    // N0004 y N0003 no tienen registro en la semana 42: no se cuentan como "sin respuesta"
    const semana42 = buildWeekResponses(LISTA, HISTORIALES, '2026-W42')
    expect(semana42.items.map((i) => [i.childCode, i.message])).toEqual([
      ['N0001', 'No le di: No le gusta'],
      ['N0002', 'Sin respuesta'],
    ])
    expect(semana42.withoutRecord).toBe(2)
  })

  it('toma contactados y respondidos de los indicadores y calcula la tasa', () => {
    expect(weekSummary(INDICADORES, '2026-W43')).toEqual({
      semana: '2026-W43',
      contacted: 4,
      responded: 2,
      responseRate: 0.5,
    })
    expect(weekSummary(INDICADORES, '2026-W30')).toMatchObject({ contacted: 0, responded: 0, responseRate: null })
  })

  it('ofrece las semanas de la serie y la actual, de la más reciente a la más antigua', () => {
    expect(weekOptions(INDICADORES.serie, '2026-W43')).toEqual([
      { value: '2026-W43', label: 'Semana 43 (actual)', current: true },
      { value: '2026-W42', label: 'Semana 42', current: false },
      { value: '2026-W41', label: 'Semana 41', current: false },
    ])
    expect(weekOptions([], '2026-W43').map((o) => o.value)).toEqual(['2026-W43'])
  })

  it('filtra por pestaña, búsqueda (sin tildes) y motivo, y pagina en el navegador', () => {
    const { items } = buildWeekResponses(LISTA, HISTORIALES, '2026-W43')
    const base = { tab: 'todas', q: '', reason: 'todos', page: 1, pageSize: 6 } as const
    expect(queryResponses(items, base).counts).toEqual({ todas: 4, con_dificultades: 1, sin_respuesta: 2, favorable: 1 })
    expect(queryResponses(items, { ...base, tab: 'sin_respuesta' }).items.map((i) => i.childCode)).toEqual(['N0001', 'N0002'])
    expect(queryResponses(items, { ...base, q: 'papa' }).items.map((i) => i.childCode)).toEqual(['N0003'])
    expect(queryResponses(items, { ...base, q: 'n0004' }).counts.todas).toBe(1)
    expect(queryResponses(items, { ...base, reason: 'estrenimiento' }).items.map((i) => i.childCode)).toEqual(['N0003'])
    const pagina2 = queryResponses(items, { ...base, pageSize: 3, page: 2 })
    expect(pagina2).toMatchObject({ total: 4, page: 2 })
    expect(pagina2.items.map((i) => i.childCode)).toEqual(['N0004'])
  })

  it('exporta el CSV sin fechas, estados de entrega ni teléfonos', () => {
    const { items } = buildWeekResponses(LISTA, HISTORIALES, '2026-W43')
    const [encabezado, primera] = buildResponsesCsv(items).split('\r\n')
    expect(encabezado).toBe(
      'Semana,Código del niño,Edad (meses),Parentesco,Alias del cuidador,Respuesta,Motivo,Mensaje,Acción asignada',
    )
    expect(primera).toBe(
      '2026-W43,N0003,22,Papá,Papá de N0003,Tuve un problema,Estreñimiento,Tuve un problema: Estreñimiento,Seguimiento por WhatsApp',
    )
  })
})

describe('Pantalla de Comunicación', () => {
  let blobs: Blob[]
  const originales = { crear: URL.createObjectURL, revocar: URL.revokeObjectURL }

  beforeEach(() => {
    blobs = []
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob)
      return 'blob:respuestas'
    }) as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    URL.createObjectURL = originales.crear
    URL.revokeObjectURL = originales.revocar
  })

  it('muestra los KPIs de la semana: indicadores de la API y conteos de los historiales', async () => {
    const api = mockApi()
    renderizar(<ComunicacionPage />)

    const respuestas = await waitFor(() => tarjetaKpi('Respuestas recibidas'))
    expect(within(respuestas).getByText('2')).toBeInTheDocument()
    expect(within(respuestas).getByText('/ 4 contactados')).toBeInTheDocument()
    expect(within(respuestas).getByText('50% de tasa de respuesta')).toBeInTheDocument()
    expect(within(respuestas).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    expect(await within(tarjetaKpi('Problema o posible peligro')).findByText('1')).toBeInTheDocument()
    expect(within(tarjetaKpi('Reportaron no consumo')).getByText('0')).toBeInTheDocument()
    expect(within(tarjetaKpi('Sin respuesta')).getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/los 4 niños de la lista actual con registro en la semana/)).toBeInTheDocument()
    // La semana actual reutiliza la consulta de indicadores sin parámetro (la misma del encabezado)
    expect(api.pedidosA('GET', '/establecimientos/EESS01/indicadores').every((p) => !p.params.has('semana'))).toBe(true)
  })

  it('lista una fila por niño con la respuesta y la razón traducidas, y el detalle de la primera', async () => {
    mockApi()
    renderizar(<ComunicacionPage />)

    const lista = await listaRespuestas()
    expect(codigosEnLista(lista)).toEqual(['N0003', 'N0001', 'N0002', 'N0004'])
    expect(within(lista).getByText('Tuve un problema: Estreñimiento')).toBeInTheDocument()
    expect(within(lista).getByText('Estreñimiento')).toBeInTheDocument()
    expect(within(lista).getByText('Sí le di')).toBeInTheDocument()
    expect(within(lista).getByText('Consumo completo')).toBeInTheDocument()
    expect(within(lista).getAllByText('Sin respuesta')).toHaveLength(2)
    expect(within(lista).getByText('(Papá de N0003)')).toBeInTheDocument()
    expect(within(lista).getByText('· 22 meses')).toBeInTheDocument()
    expect(within(lista).getAllByText('Acción de la semana: Visita domiciliaria')).toHaveLength(2)
    expect(screen.getByText('Mostrando 1-4 de 4 registros')).toBeInTheDocument()

    // Detalle: la primera respuesta queda seleccionada
    const detalle = screen.getByRole('complementary', { name: 'Detalle de la respuesta' })
    expect(within(detalle).getByText('Papá')).toBeInTheDocument()
    expect(within(detalle).getByText('Tuve un problema')).toBeInTheDocument()
    expect(within(detalle).getByText('Semana 43 · 19 – 25 oct 2026')).toBeInTheDocument()
    expect(within(detalle).getByText('Seguimiento por WhatsApp')).toBeInTheDocument()
    expect(within(detalle).getByRole('link', { name: 'Ficha del niño' })).toHaveAttribute('href', '/ninos/N0003')

    fireEvent.click(screen.getByRole('button', { name: 'Ver en panel la respuesta de N0004' }))
    expect(within(detalle).getAllByText('Consumo completo')).toHaveLength(2) // etiqueta y campo "Motivo"
    expect(within(detalle).getByRole('link', { name: 'Ficha del niño' })).toHaveAttribute('href', '/ninos/N0004')
  })

  it('filtra por pestaña, búsqueda y motivo en el navegador', async () => {
    const api = mockApi()
    renderizar(<ComunicacionPage />)
    await listaRespuestas()
    const pedidosAntes = api.pedidos.length

    fireEvent.click(screen.getByRole('tab', { name: 'Con dificultades (1)' }))
    expect(codigosEnLista(await listaRespuestas())).toEqual(['N0003'])
    fireEvent.click(screen.getByRole('tab', { name: 'Sin respuesta (2)' }))
    expect(codigosEnLista(await listaRespuestas())).toEqual(['N0001', 'N0002'])
    fireEvent.click(screen.getByRole('tab', { name: 'Con respuesta favorable (1)' }))
    expect(codigosEnLista(await listaRespuestas())).toEqual(['N0004'])

    fireEvent.click(screen.getByRole('tab', { name: 'Todas (4)' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar por código del niño o alias del cuidador' }), {
      target: { value: 'papá' },
    })
    expect(codigosEnLista(await listaRespuestas())).toEqual(['N0003'])
    expect(screen.getByRole('tab', { name: 'Todas (1)' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Motivo' }), { target: { value: 'estrenimiento' } })
    expect(codigosEnLista(await listaRespuestas())).toEqual(['N0003'])
    // Nada de esto pidió datos nuevos a la API
    expect(api.pedidos.length).toBe(pedidosAntes)
  })

  it('sin resultados con los filtros, ofrece limpiarlos', async () => {
    mockApi()
    renderizar(<ComunicacionPage />)
    await listaRespuestas()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'N9999' } })
    expect(screen.getByText('No hay respuestas para mostrar')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(codigosEnLista(await listaRespuestas())).toHaveLength(4)
  })

  it('al cambiar de semana pide sus indicadores y muestra lo que respondió cada niño esa semana', async () => {
    const api = mockApi()
    renderizar(<ComunicacionPage />)
    await listaRespuestas()

    const semana = screen.getByRole('combobox', { name: 'Semana' })
    await waitFor(() =>
      expect(within(semana).getAllByRole('option').map((o) => o.textContent)).toEqual([
        'Semana 43 (actual)',
        'Semana 42',
        'Semana 41',
      ]),
    )
    expect(semana).toHaveValue('2026-W43')

    fireEvent.change(semana, { target: { value: '2026-W42' } })
    await waitFor(() =>
      expect(
        api.pedidosA('GET', '/establecimientos/EESS01/indicadores').some((p) => p.params.get('semana') === '2026-W42'),
      ).toBe(true),
    )
    const lista = await listaRespuestas()
    expect(codigosEnLista(lista)).toEqual(['N0001', 'N0002'])
    expect(within(lista).getByText('No le di: No le gusta')).toBeInTheDocument()
    expect(within(lista).getByText('No le gusta')).toBeInTheDocument()
    expect(await screen.findByText('Sem. 42', { selector: 'article span' })).toBeInTheDocument()
    expect(within(tarjetaKpi('Reportaron no consumo')).getByText('1')).toBeInTheDocument()
    expect(screen.getByText(/\(2 sin registro\)/)).toBeInTheDocument()
    expect(screen.getByText(/Respuestas de la semana de los cuidadores/)).toHaveTextContent('Semana 42 · 12 – 18 oct 2026')
  })

  it('pagina de 6 en 6', async () => {
    mockApi(rutasExtra)
    renderizar(<ComunicacionPage />)
    const lista = await listaRespuestas()
    expect(within(lista).getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByText('Mostrando 1-6 de 8 registros')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(screen.getByText('Mostrando 7-8 de 8 registros')).toBeInTheDocument()
    expect(within(await listaRespuestas()).getAllByRole('listitem')).toHaveLength(2)
    // Las demás razones del bot y la respuesta sin razón elegida
    fireEvent.click(screen.getByRole('tab', { name: 'Con dificultades (4)' }))
    const dificultades = await listaRespuestas()
    expect(within(dificultades).getByText('No le di: Se me olvidó')).toBeInTheDocument()
    expect(within(dificultades).getByText('Tuve un problema: Se acabó el hierro')).toBeInTheDocument()
    expect(within(dificultades).getByText('Sin motivo indicado')).toBeInTheDocument()
  })

  it('exporta en CSV todas las respuestas que cumplen los filtros', async () => {
    mockApi()
    const descargas: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      descargas.push(this.download)
    })
    renderizar(<ComunicacionPage />)
    await listaRespuestas()

    fireEvent.click(screen.getByRole('tab', { name: 'Sin respuesta (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exportar reporte de respuestas (CSV)' }))

    expect(descargas).toEqual(['respuestas_whatsapp_EESS01_2026-W43.csv'])
    const bytes = new Uint8Array(await blobs[0].arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]) // BOM para Excel
    const filas = (await blobs[0].text()).replace(/^﻿/, '').split('\r\n')
    expect(filas).toEqual([
      'Semana,Código del niño,Edad (meses),Parentesco,Alias del cuidador,Respuesta,Motivo,Mensaje,Acción asignada',
      '2026-W43,N0001,8,Mamá,Mamá de N0001,Sin respuesta,,Sin respuesta,Visita domiciliaria',
      '2026-W43,N0002,14,Mamá,Mamá de N0002,Sin respuesta,,Sin respuesta,Visita domiciliaria',
    ])
  })

  it('no muestra sincronización, estados de entrega, fechas, conversación, consejos ni teléfonos', async () => {
    mockApi()
    const { container } = renderizar(<ComunicacionPage />)
    const lista = await listaRespuestas()
    const texto = container.textContent ?? ''
    expect(screen.queryByRole('button', { name: /sincroniz/i })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Estado' })).toBeNull()
    expect(texto).not.toMatch(/Sincroniz|Actualizado hace|Entregado|Fallido|Error telco|sin lectura/i)
    expect(texto).not.toMatch(/Reportado (hoy|ayer|hace)|Primer envío|Último intento|Código de error/)
    expect(texto).not.toMatch(/Conversación|Bot CRED ·|Acción sugerida/)
    expect(texto).not.toMatch(/Previsualización|Vista Normal|demostración|Simulación/i)
    expect(texto).not.toMatch(/epidemiológica|Efectos adversos|Derrame|Desconexión digital|Número no disponible/i)
    expect(texto).not.toMatch(/51000|\+51|9\d{8}/) // teléfonos
    expect(within(lista).queryByText(/«|»/)).toBeNull() // la respuesta no es una frase citada: el bot solo recibe botones
    expect(container.querySelector('a[href^="tel:"], a[href*="wa.me"]')).toBeNull()
  })

  it('sin niños en el padrón, invita a cargarlo', async () => {
    mockApi({ 'POST /establecimientos/EESS01/lista': [] })
    renderizar(<ComunicacionPage />)
    expect(await screen.findByText('Aún no hay niños en el padrón de EESS01.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cargar padrón' })).toHaveAttribute('href', '/administracion')
    expect(screen.getByRole('button', { name: 'Exportar reporte de respuestas (CSV)' })).toBeDisabled()
  })

  it('si la lista falla, muestra el motivo y permite reintentar', async () => {
    const api = mockApi({ 'POST /establecimientos/EESS01/lista': errorApi(500, 'Internal Server Error') })
    renderizar(<ComunicacionPage />)
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('No se pudo cargar la información.')
    expect(alerta).toHaveTextContent('Internal Server Error')
    // Los KPIs de los historiales quedan sin dato, no "cargando"
    await waitFor(() => expect(within(tarjetaKpi('Problema o posible peligro')).getByText('—')).toBeInTheDocument())
    fireEvent.click(within(alerta).getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(2))
  })

  it('si fallan los indicadores, avisa en los KPIs y la lista sigue disponible', async () => {
    mockApi({ 'GET /establecimientos/EESS01/indicadores': errorApi(500, 'Internal Server Error') })
    renderizar(<ComunicacionPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la información.')
    expect(codigosEnLista(await listaRespuestas())).toHaveLength(4)
    expect(await screen.findByRole('option', { name: 'Semana 43 (actual)' })).toBeInTheDocument()
  })
})
