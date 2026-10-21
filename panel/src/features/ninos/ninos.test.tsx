// Pantalla "Niños en seguimiento" contra la API simulada (mismo formato que la real).
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FilaLista } from '@/api/yawar'
import { HISTORIALES, INDICADORES, LISTA } from '@/test/datos'
import { errorApi, mockApi, renderizar } from '@/test/utilidades'
import NinosPage from './NinosPage'
import { attachResponses, buildChildren, statusFor, summarizeChildren, weekResponseFor, weeklyResponseFrom } from './api'
import { formatStatus } from './format'
import { DEFAULT_FILTERS, buildChildrenCsv, queryChildren } from './utils'

const SEMANA = '2026-W43'

/** Los niños de ejemplo ya con su historial, como los arma la pantalla. */
function ninosDeEjemplo() {
  return attachResponses(buildChildren(LISTA, 'EESS01'), HISTORIALES, SEMANA)
}

/** Padrón grande para probar la paginación: N0101..N0110, todos sin historial. */
function listaGrande(n: number): FilaLista[] {
  return Array.from({ length: n }, (_, i) => ({
    ...LISTA[3],
    orden: i + 1,
    id_nino: `N0${101 + i}`,
    alias_cuidador: `Mamá de N0${101 + i}`,
    accion: i < 2 ? 'visita' : 'whatsapp',
  }))
}

describe('Adaptador de Niños en seguimiento', () => {
  it('arma una fila por niño en el orden de la lista y numera las visitas', () => {
    const ninos = buildChildren(LISTA, 'EESS01')
    expect(ninos.map((c) => [c.code, c.priorityRank, c.weeklyAction.visitOrder])).toEqual([
      ['N0001', 1, 1],
      ['N0002', 2, 2],
      ['N0004', 3, null],
      ['N0003', 4, null],
    ])
    expect(ninos[0]).toMatchObject({
      ageMonths: 8,
      ageGroup: '6-11',
      caregiverAlias: 'Mamá de N0001',
      establishmentId: 'EESS01',
      signal: 'no_le_di',
      prioritizedThisWeek: true,
    })
    // Sin historial todavía: el estado y la respuesta quedan pendientes
    expect(ninos[0].status).toBeUndefined()
    expect(ninos[0].weekResponse).toBeUndefined()
    // Nivel 1 = sin respuesta en 7 días o más; nivel 2 = sin novedad (no priorizado)
    expect(ninos[1]).toMatchObject({ signal: 'sin_respuesta', prioritizedThisWeek: true })
    expect(ninos[2]).toMatchObject({ signal: null, prioritizedThisWeek: false, ageGroup: '24-35' })
  })

  it('el estado es la última respuesta registrada, con su semana si no es la actual', () => {
    const n1 = statusFor(HISTORIALES.N0001, SEMANA)
    expect(n1).toEqual({ kind: 'no_le_di', semana: '2026-W42', isThisWeek: false })
    expect(formatStatus(n1)).toBe('No le dio · Semana 42')
    const n3 = statusFor(HISTORIALES.N0003, SEMANA)
    expect(formatStatus(n3)).toBe('Reportó problema')
    expect(statusFor(HISTORIALES.N0002, SEMANA)).toEqual({ kind: 'sin_respuesta', semana: null, isThisWeek: false })
    expect(statusFor([], SEMANA).kind).toBe('sin_respuesta')
  })

  it('la respuesta de la semana sale del historial, con el motivo y sin comillas', () => {
    expect(weekResponseFor(HISTORIALES.N0003, SEMANA)).toEqual({
      kind: 'problema',
      label: 'Tuve un problema: Estreñimiento',
    })
    expect(weekResponseFor(HISTORIALES.N0004, SEMANA)).toEqual({ kind: 'si_le_di', label: 'Sí le di' })
    // N0001 respondió la semana pasada, pero no esta
    expect(weekResponseFor(HISTORIALES.N0001, SEMANA)).toEqual({ kind: 'sin_respuesta', label: 'Sin respuesta' })
    expect(weekResponseFor(undefined, SEMANA).kind).toBe('sin_respuesta')
  })

  it('toma la tasa de respuesta de la semana en curso de los indicadores', () => {
    expect(weeklyResponseFrom(INDICADORES, SEMANA)).toEqual({ responded: 2, contacted: 4, returnRate: 0.5 })
    // Las semanas sin envíos no aparecen en la serie
    expect(weeklyResponseFrom(INDICADORES, '2026-W44')).toEqual({ responded: 0, contacted: 0, returnRate: null })
  })

  it('resume el padrón: total, edades, visitas y casos con dificultades', () => {
    const resumen = summarizeChildren(ninosDeEjemplo(), weeklyResponseFrom(INDICADORES, SEMANA), 'listo')
    expect(resumen).toEqual({
      totalActive: 4,
      ageRange: { minMonths: 8, maxMonths: 30 },
      weeklyResponse: { responded: 2, contacted: 4, returnRate: 0.5 },
      homeVisits: { assigned: 2, whatsapp: 2 },
      alerts: { active: 2, problems: 1, refusals: 1 },
    })
    expect(summarizeChildren(buildChildren(LISTA, 'EESS01'), undefined, 'cargando').alerts).toBeUndefined()
    expect(summarizeChildren(buildChildren(LISTA, 'EESS01'), null, 'error').alerts).toBeNull()
  })

  it('filtra, cuenta los chips, ordena y pagina en el navegador', () => {
    const ninos = ninosDeEjemplo()
    const params = { ...DEFAULT_FILTERS, page: 1, pageSize: 8 }
    expect(queryChildren(ninos, params).segmentCounts).toEqual({
      todos: 4,
      priorizados: 2,
      dificultades: 2,
      sin_respuesta: 1,
      si_le_di: 1,
    })
    const codigos = (p: Partial<typeof params>) => queryChildren(ninos, { ...params, ...p }).items.map((c) => c.code)
    expect(codigos({})).toEqual(['N0001', 'N0002', 'N0004', 'N0003'])
    expect(codigos({ segment: 'dificultades' })).toEqual(['N0001', 'N0003'])
    expect(codigos({ search: 'papa' })).toEqual(['N0003']) // sin tildes ni mayúsculas
    expect(codigos({ response: 'problema' })).toEqual(['N0003'])
    expect(codigos({ delivery: 'visita_domiciliaria' })).toEqual(['N0001', 'N0002'])
    expect(codigos({ ageGroup: '12-23' })).toEqual(['N0002', 'N0003'])
    expect(codigos({ sort: 'age', order: 'desc' })).toEqual(['N0004', 'N0003', 'N0002', 'N0001'])
    expect(queryChildren(ninos, { ...params, pageSize: 3, page: 2 })).toMatchObject({ total: 4, page: 2 })
    // Mientras carga el historial, los chips que dependen de él no tienen conteo
    expect(queryChildren(buildChildren(LISTA, 'EESS01'), params).segmentCounts).toEqual({
      todos: 4,
      priorizados: 2,
      sin_respuesta: 1,
    })
  })

  it('el CSV no lleva teléfonos, sector, suplemento ni fecha del último reporte', () => {
    const csv = buildChildrenCsv(ninosDeEjemplo())
    const [cabecera, ...filas] = csv.replace(/^﻿/, '').split('\r\n')
    expect(cabecera).toBe(
      '"Prioridad","Código","Estado de seguimiento","Edad","Grupo","Establecimiento","Cuidador",' +
        '"Respuesta de la semana","Acción semanal","Entrega","Priorizado esta semana"',
    )
    expect(filas).toHaveLength(4)
    expect(filas[3]).toBe(
      '"4","N0003","Reportó problema","22 meses","12–23 m","EESS01","Papá de N0003",' +
        '"Tuve un problema: Estreñimiento","WhatsApp Automatizado","WhatsApp automatizado","No"',
    )
    expect(csv).not.toMatch(/Sector|Contacto|Suplemento|Gotas|Jarabe|Último reporte|\+51/)
  })
})

describe('Pantalla de Niños en seguimiento', () => {
  beforeEach(() => {
    // jsdom no implementa las URL de Blob ni scrollIntoView (el panel de filtros avanzados lo usa)
    URL.createObjectURL = vi.fn(() => 'blob:yawar')
    URL.revokeObjectURL = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  /** Códigos de los niños visibles en la tabla, en orden. */
  function codigosEnTabla() {
    return within(screen.getByRole('table'))
      .getAllByRole('link', { name: /^N\d+$/ })
      .map((link) => link.textContent)
  }

  async function esperarRespuestas() {
    const tabla = await screen.findByRole('table')
    await within(tabla).findByText('Tuve un problema: Estreñimiento')
    await screen.findByText('MODO PRUEBA · SEGUIMIENTO SEMANAL') // /salud ya respondió
    return tabla
  }

  it('muestra los niños de la lista de la semana con su estado y la respuesta del cuidador', async () => {
    const api = mockApi()
    renderizar(<NinosPage />)
    const tabla = await esperarRespuestas()

    expect(screen.getByText('MODO PRUEBA · SEGUIMIENTO SEMANAL')).toBeInTheDocument()
    expect(codigosEnTabla()).toEqual(['N0001', 'N0002', 'N0004', 'N0003'])
    const fila = (codigo: string) => within(tabla).getByRole('link', { name: codigo }).closest('tr') as HTMLElement
    expect(fila('N0001')).toHaveTextContent('No le dio · Semana 42')
    expect(fila('N0001')).toHaveTextContent('8 meses6–11 m')
    expect(fila('N0001')).toHaveTextContent('Mamá de N0001')
    expect(fila('N0001')).toHaveTextContent('Sin respuesta')
    expect(fila('N0001')).toHaveTextContent('Visita Domiciliaria #1')
    expect(fila('N0003')).toHaveTextContent('Reportó problema')
    expect(fila('N0003')).toHaveTextContent('Papá de N0003')
    expect(fila('N0003')).toHaveTextContent('WhatsApp Automatizado')
    expect(fila('N0004')).toHaveTextContent('Sí le dio')
    expect(within(fila('N0002')).getAllByText('Sin respuesta')).toHaveLength(2)
    expect(within(tabla).getByRole('link', { name: /^Ver fichas*de N0003$/ })).toHaveAttribute('href', '/ninos/N0003')

    // Indicadores calculados con la lista, el historial y los indicadores de la API
    const kpis = within(screen.getByRole('region', { name: 'Indicadores del padrón' }))
    expect(kpis.getByText('8 a 30 meses de edad en jurisdicción')).toBeInTheDocument()
    expect(kpis.getByText('/ 4 contactados')).toBeInTheDocument()
    expect(kpis.getByText('50.0% tasa de respuesta esta semana')).toBeInTheDocument()
    expect(kpis.getByText('2 con seguimiento por WhatsApp')).toBeInTheDocument()
    expect(kpis.getByText('1 reportó un problema · 1 no le dio')).toBeInTheDocument()
    expect(screen.getByText('Mostrando', { exact: false })).toHaveTextContent('Mostrando 1–4 de 4 niños')

    // Usa la lista ya generada (una sola vez, con la capacidad guardada) y no envía nada
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(1)
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')[0].params.get('capacidad')).toBe('10')
    expect(api.pedidos.filter((p) => p.metodo === 'POST')).toHaveLength(1)
  })

  it('no muestra datos que la API no tiene ni datos que chocan con las reglas del proyecto', async () => {
    mockApi()
    const { container } = renderizar(<NinosPage />)
    await esperarRespuestas()
    const texto = container.textContent ?? ''
    expect(texto).not.toMatch(/\+51|\*\*\*|tel:|Llamar/) // teléfonos
    expect(texto).not.toMatch(/Sector|Pamplona/) // sector
    expect(texto).not.toMatch(/Gotas|Jarabe|Polimaltosado|Sulfato/) // suplemento
    expect(texto).not.toMatch(/Último reporte|Hoy, |Ayer, |Hace \d+ días|Presencial|Farmacia|Llamada/) // último reporte
    expect(texto).not.toMatch(/asignados hoy|pendientes/) // visitas del día
    expect(texto).not.toMatch(/Deserción|Baja cobertura|Recién incorporado|Adherente|intermitente|Inicio tardío/)
    expect(texto).not.toMatch(/Nuevo Registro|epidemiológica|\b(ALTO|MEDIO|BAJO)\b/)
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
    expect(screen.queryByRole('combobox', { name: /Sector|Último reporte/ })).toBeNull()
    // El acceso a Administración es para cargar el padrón CSV, no un alta manual
    expect(screen.getByRole('link', { name: 'Cargar padrón (CSV)' })).toHaveAttribute('href', '/administracion')
  })

  it('filtra con los chips, la búsqueda y los selectores, y ordena por edad, en el navegador', async () => {
    const api = mockApi()
    renderizar(<NinosPage />)
    await esperarRespuestas()

    fireEvent.click(screen.getByRole('button', { name: 'Con dificultades (2)' }))
    expect(codigosEnTabla()).toEqual(['N0001', 'N0003'])
    fireEvent.click(screen.getByRole('button', { name: 'Sin respuesta ≥7 días (1)' }))
    expect(codigosEnTabla()).toEqual(['N0002'])
    fireEvent.click(screen.getByRole('button', { name: 'Sí le dio (1)' }))
    expect(codigosEnTabla()).toEqual(['N0004'])
    fireEvent.click(screen.getByRole('button', { name: 'Priorizados esta semana (2)' }))
    expect(codigosEnTabla()).toEqual(['N0001', 'N0002'])
    fireEvent.click(screen.getByRole('button', { name: 'Todos (4)' }))

    fireEvent.change(screen.getByRole('combobox', { name: /^Entrega/ }), { target: { value: 'whatsapp_automatizado' } })
    expect(codigosEnTabla()).toEqual(['N0004', 'N0003'])
    fireEvent.change(screen.getByRole('combobox', { name: /^Entrega/ }), { target: { value: 'todos' } })

    fireEvent.click(screen.getByRole('button', { name: 'Filtros Avanzados' }))
    fireEvent.change(screen.getByRole('combobox', { name: /^Respuesta de la semana/ }), {
      target: { value: 'problema' },
    })
    expect(codigosEnTabla()).toEqual(['N0003'])
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' })) // el del panel avanzado
    expect(codigosEnTabla()).toEqual(['N0001', 'N0002', 'N0004', 'N0003'])

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Papá' } })
    await waitFor(() => expect(codigosEnTabla()).toEqual(['N0003']))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'N9999' } })
    expect(await screen.findByText('No se encontraron niños con los filtros seleccionados.')).toBeInTheDocument()
    const listado = within(screen.getByRole('region', { name: 'Listado de niños en seguimiento' }))
    fireEvent.click(listado.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(codigosEnTabla()).toHaveLength(4))

    fireEvent.click(screen.getByRole('button', { name: /Edad \/ Grupo/ }))
    expect(codigosEnTabla()).toEqual(['N0001', 'N0002', 'N0003', 'N0004'])
    fireEvent.click(screen.getByRole('button', { name: /Edad \/ Grupo/ }))
    expect(codigosEnTabla()).toEqual(['N0004', 'N0003', 'N0002', 'N0001'])

    // Nada de esto vuelve a pedir la lista a la API
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(1)
  })

  it('pagina de a 8 niños en el navegador', async () => {
    const lista = listaGrande(10)
    mockApi({
      'POST /establecimientos/EESS01/lista': lista,
      ...Object.fromEntries(lista.map((f) => [`GET /ninos/${f.id_nino}/historial`, []])),
    })
    renderizar(<NinosPage />)
    await screen.findByRole('table')
    expect(codigosEnTabla()).toHaveLength(8)
    expect(screen.getByText('Mostrando', { exact: false })).toHaveTextContent('Mostrando 1–8 de 10 niños')
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(codigosEnTabla()).toEqual(['N0109', 'N0110'])
    expect(screen.getByText('Mostrando', { exact: false })).toHaveTextContent('Mostrando 9–10 de 10 niños')
  })

  it('exporta en CSV los niños que cumplen los filtros, generado en el navegador', async () => {
    mockApi()
    const descargas: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      descargas.push(this.download)
    })
    renderizar(<NinosPage />)
    await esperarRespuestas()

    fireEvent.click(screen.getByRole('button', { name: 'Con dificultades (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Padrón (CSV)' }))

    expect(descargas).toEqual(['ninos-EESS01-2026-W43.csv'])
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    const csv = await blob.text()
    const filas = csv.split('\r\n')
    expect(filas).toHaveLength(3) // cabecera + N0001 + N0003
    expect(filas[1]).toContain('"N0001","No le dio · Semana 42"')
    expect(filas[2]).toContain('"Tuve un problema: Estreñimiento"')
    expect(csv).not.toMatch(/Sector|Contacto|\+51/)
    expect(screen.getByRole('status')).toHaveTextContent('Se exportaron 2 registros del padrón en CSV.')
  })

  it('sin niños en el padrón, invita a cargarlo y no deja exportar', async () => {
    mockApi({ 'POST /establecimientos/EESS01/lista': [] })
    renderizar(<NinosPage />)
    expect(await screen.findByText('Aún no hay niños en el padrón de EESS01.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cargar padrón' })).toHaveAttribute('href', '/administracion')
    expect(screen.getByRole('button', { name: 'Exportar Padrón (CSV)' })).toBeDisabled()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('si la API falla, muestra el motivo y permite reintentar', async () => {
    mockApi({ 'POST /establecimientos/EESS01/lista': errorApi(500, 'Internal Server Error') })
    renderizar(<NinosPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la información.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('si no se pueden leer las respuestas, muestra la lista igual y avisa', async () => {
    mockApi({
      'GET /ninos/N0003/historial': errorApi(500, 'Internal Server Error'),
      'GET /establecimientos/EESS01/indicadores': errorApi(500, 'Internal Server Error'),
    })
    renderizar(<NinosPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron leer las respuestas de los cuidadores.')
    expect(codigosEnTabla()).toEqual(['N0001', 'N0002', 'N0004', 'N0003'])
    expect(within(screen.getByRole('table')).getAllByText('No disponible')).toHaveLength(4)
    expect(screen.getByText('No se pudieron leer las respuestas')).toBeInTheDocument()
    expect(await screen.findByText('No se pudieron leer los indicadores de la semana')).toBeInTheDocument()
    // Los chips que dependen del historial quedan sin número
    expect(screen.getByRole('button', { name: 'Con dificultades' })).toBeInTheDocument()
  })
})
