// Pantalla "Planificación semanal" contra la API simulada (mismo formato que la real).
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HISTORIALES, LISTA } from '@/test/datos'
import { errorApi, mockApi, renderizar } from '@/test/utilidades'
import PlanificacionPage from './PlanificacionPage'
import { buildWeeklyPlan, lastReportFor, signalFor } from './api'

describe('Adaptador de Planificación', () => {
  it('traduce el nivel de la API a las reglas R1, R2 y R3', () => {
    expect(signalFor(LISTA[0])).toMatchObject({ kind: 'intake_rejection', rule: 'R1' })
    expect(signalFor({ nivel: 0, seguimiento: 'la semana pasada respondió: Tuve un problema' })).toMatchObject({
      kind: 'reported_problem',
      rule: 'R1',
    })
    expect(signalFor(LISTA[1])).toMatchObject({ kind: 'no_response', rule: 'R2' })
    expect(signalFor(LISTA[2])).toMatchObject({ kind: 'predictive_risk', rule: 'R3' })
  })

  it('numera las visitas en orden y deja a los demás en WhatsApp', () => {
    const plan = buildWeeklyPlan(LISTA, { semana: '2026-W43', hoy: '2026-10-21', establecimiento: 'EESS01', capacidad: 2 })
    expect(plan.children.map((c) => [c.code, c.assignment.visitOrder])).toEqual([
      ['N0001', 1],
      ['N0002', 2],
      ['N0004', null],
      ['N0003', null],
    ])
    expect(plan).toMatchObject({ rosterSize: 4, ageRange: { minMonths: 8, maxMonths: 30 }, startDate: '2026-10-19' })
  })

  it('toma la última respuesta del historial e indica si es de esta semana', () => {
    expect(lastReportFor(HISTORIALES.N0001, '2026-W43')).toEqual({
      text: 'No le di: No le gusta',
      semana: '2026-W42',
      isThisWeek: false,
    })
    expect(lastReportFor(HISTORIALES.N0003, '2026-W43')).toMatchObject({ isThisWeek: true })
    expect(lastReportFor(HISTORIALES.N0002, '2026-W43')).toBeNull()
  })
})

describe('Pantalla de Planificación', () => {
  it.each([true, false, null, undefined])('muestra En tratamiento solo con tratamiento_anemia=true (recibe %s)', async (tratamiento_anemia) => {
    mockApi({
      'POST /establecimientos/EESS01/lista': LISTA.map((fila) => ({
        ...fila, tratamiento_anemia: fila.id_nino === 'N0002' ? tratamiento_anemia : false,
      })),
    })
    renderizar(<PlanificacionPage />)
    const tabla = await screen.findByRole('table')
    const fila = within(tabla).getByRole('link', { name: 'N0002' }).closest('tr')!
    if (tratamiento_anemia === true) {
      expect(within(fila).getByText('En tratamiento')).toBeInTheDocument()
    } else {
      expect(within(fila).queryByText('En tratamiento')).not.toBeInTheDocument()
    }
    // El indicador nunca cambia el orden que entrega el backend.
    expect(within(tabla).getAllByRole('link', { name: /^N\d+$/ }).map((link) => link.textContent))
      .toEqual(LISTA.map((nino) => nino.id_nino))
  })

  it('genera la lista con la capacidad guardada y muestra a cada niño con su señal y su última respuesta', async () => {
    const api = mockApi()
    renderizar(<PlanificacionPage />)

    const tabla = await screen.findByRole('table')
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')[0].params.get('capacidad')).toBe('10')
    expect(within(tabla).getByText('N0001')).toBeInTheDocument()
    expect(within(tabla).getByText('8 meses · Mamá de N0001')).toBeInTheDocument()
    expect(within(tabla).getByText('No le dio (R1)')).toBeInTheDocument()
    expect(within(tabla).getByText('Sin respuesta (R2)')).toBeInTheDocument()
    expect(within(tabla).getAllByText('Por puntaje (R3)')).toHaveLength(2)
    expect(within(tabla).getByText('58%')).toBeInTheDocument()
    // La respuesta de ESTA semana se ve aunque el orden recién cambie la próxima (hallazgo 1)
    expect(await within(tabla).findByText('Tuve un problema: Estreñimiento')).toBeInTheDocument()
    expect(within(tabla).getAllByText('Esta semana, vía WhatsApp').length).toBeGreaterThan(0)
    expect(within(tabla).getByText('Sin respuestas registradas')).toBeInTheDocument()
  })

  it('no muestra datos que la API no tiene ni datos que chocan con las reglas del proyecto', async () => {
    mockApi()
    const { container } = renderizar(<PlanificacionPage />)
    await screen.findByRole('table')
    const texto = container.textContent ?? ''
    expect(texto).not.toMatch(/51000|\+51|tel:/) // teléfonos
    expect(texto).not.toMatch(/\b(ALTO|MODERADO|MEDIO|BAJO)\b/) // niveles de riesgo sin umbrales definidos
    expect(texto).not.toMatch(/Reasignar|Programada|epidemiológica/)
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('vuelve a generar la planificación con la nueva capacidad N', async () => {
    const api = mockApi()
    renderizar(<PlanificacionPage />)
    await screen.findByRole('table')
    // Hay 4 niños: la capacidad 10 guardada se ajusta a 4; se baja a 1
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Disminuir capacidad de visitas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Generar planificación' }))
    await waitFor(() => expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(2))
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')[1].params.get('capacidad')).toBe('1')
    expect(localStorage.getItem('yawar.capacidad.EESS01')).toBe('1')
  })

  it('envía los recordatorios después de confirmar y deja el resultado en pantalla', async () => {
    const api = mockApi({
      'POST /establecimientos/EESS01/recordatorios': { enviados: 3, fallidos: 1, omitidos_por_baja: 0 },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderizar(<PlanificacionPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar recordatorios WhatsApp' }))
    expect(await screen.findByText('Enviados: 3 · Fallidos: 1 · Dados de baja: 0')).toBeInTheDocument()
    expect(api.pedidosA('POST', '/establecimientos/EESS01/recordatorios')).toHaveLength(1)
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('también a los asignados a visita'))
  })

  it('no envía nada si se cancela la confirmación', async () => {
    const api = mockApi()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderizar(<PlanificacionPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar recordatorios WhatsApp' }))
    expect(api.pedidosA('POST', '/establecimientos/EESS01/recordatorios')).toHaveLength(0)
  })

  it('sin niños en el padrón, invita a cargarlo', async () => {
    mockApi({ 'POST /establecimientos/EESS01/lista': [] })
    renderizar(<PlanificacionPage />)
    expect(await screen.findByText('Aún no hay niños en el padrón de EESS01.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cargar padrón' })).toHaveAttribute('href', '/administracion')
  })

  it('si la API falla, muestra el motivo y permite reintentar', async () => {
    mockApi({ 'POST /establecimientos/EESS01/lista': errorApi(500, 'Internal Server Error') })
    renderizar(<PlanificacionPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la información.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
