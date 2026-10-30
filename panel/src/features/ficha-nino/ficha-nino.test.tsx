// Pantalla "Ficha del niño" contra la API simulada (mismo formato que la real).
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SemanaHistorial } from '@/api/yawar'
import { HISTORIALES, LISTA } from '@/test/datos'
import { errorApi, mockApi, renderizar } from '@/test/utilidades'
import FichaNinoPage from './FichaNinoPage'
import { SEMANAS_TENDENCIA, buildAnswerTrend, buildBotHistory, buildChildFollowUp, outcomeFor, statusFor } from './api'

const CTX = { semana: '2026-W43', establecimiento: 'EESS01' }

/** Niño con historial que no está en la lista de EESS01 (enlace directo, otro establecimiento). */
const HISTORIAL_FUERA: SemanaHistorial[] = [
  { semana: '2026-W43', accion: 'whatsapp', puntaje: 0.41, respuesta: 'problema', razon: 'se_acabo' },
  { semana: '2026-W42', accion: null, puntaje: null, respuesta: 'si_le_di', razon: null },
]

function abrirFicha(id = 'N0001') {
  return renderizar(<FichaNinoPage />, { ruta: `/ninos/${id}`, patron: '/ninos/:childId' })
}

describe('Adaptador de la Ficha del niño', () => {
  it('traduce la respuesta del cuidador al estado de la semana', () => {
    expect(statusFor('problema')).toBe('alerta')
    expect(statusFor('no_le_di')).toBe('interrupcion')
    expect(statusFor('si_le_di')).toBe('completado')
    expect(statusFor('sin_respuesta')).toBe('sin_respuesta')
  })

  it('arma la respuesta con los botones (sin comillas) y el resultado con una regla fija', () => {
    const [semana] = buildBotHistory(HISTORIALES.N0003, '2026-W43')
    expect(semana).toMatchObject({
      semana: '2026-W43',
      status: 'alerta',
      answer: 'Tuve un problema: Estreñimiento',
      outcome: 'Se envió la lista de motivos. Prioridad R1 en la lista desde esta misma semana.',
      channel: 'whatsapp',
      riskScore: 0.571,
      isCurrentWeek: true,
    })
    expect(semana.answer).not.toMatch(/["“”]/)
    expect(outcomeFor('no_le_di', null, false)).toContain('no eligió ninguno')
    expect(outcomeFor('si_le_di', null, false)).toBe('Sin dificultades reportadas.')
    expect(outcomeFor('sin_respuesta', null, true)).toBe('Semana en curso: aún no responde.')
    expect(outcomeFor('sin_respuesta', null, false)).toBe('No respondió esa semana.')
  })

  it('ordena el historial de la semana más reciente a la más antigua y las barras al revés', () => {
    const desordenado = [...HISTORIALES.N0001].reverse()
    expect(buildBotHistory(desordenado, '2026-W43').map((s) => [s.semana, s.status])).toEqual([
      ['2026-W43', 'sin_respuesta'],
      ['2026-W42', 'interrupcion'],
      ['2026-W41', 'completado'],
    ])
    expect(buildAnswerTrend(HISTORIALES.N0001, '2026-W43').map((s) => s.semana)).toEqual([
      '2026-W41',
      '2026-W42',
      '2026-W43',
    ])
  })

  it(`muestra en las barras solo las últimas ${SEMANAS_TENDENCIA} semanas`, () => {
    const largo: SemanaHistorial[] = Array.from({ length: 12 }, (_, i) => ({
      semana: `2026-W${String(43 - i).padStart(2, '0')}`,
      accion: 'whatsapp',
      puntaje: 0.3,
      respuesta: 'si_le_di',
      razon: null,
    }))
    const barras = buildAnswerTrend(largo, '2026-W43')
    expect(barras).toHaveLength(SEMANAS_TENDENCIA)
    expect(barras[0].semana).toBe('2026-W36')
    expect(barras.at(-1)?.semana).toBe('2026-W43')
  })

  it('toma edad, alias, puntaje, motivos y acción de la fila del niño en la lista', () => {
    const ficha = buildChildFollowUp('N0001', HISTORIALES.N0001, LISTA, CTX)
    expect(ficha).toMatchObject({
      code: 'N0001',
      establishmentId: 'EESS01',
      rosterStatus: 'en_lista',
      roster: {
        ageMonths: 8,
        ageGroup: '6-11 meses',
        caregiverAlias: 'Mamá de N0001',
        relationship: 'Mamá',
        priorityRank: 1,
        rosterSize: 4,
        riskScore: 0.278,
        reasons: ['sin factores destacados'],
        prioritizedForHomeVisit: true,
        nextAction: {
          channel: 'visita_domiciliaria',
          semana: '2026-W43',
          title: 'Visita domiciliaria #1',
          rationale: 'Seguimiento: la semana pasada respondió: No le di',
        },
      },
      // La última respuesta no cuenta las semanas sin respuesta
      latestReport: { text: 'No le di: No le gusta', semana: '2026-W42', isThisWeek: false },
    })
    expect(buildChildFollowUp('N0002', HISTORIALES.N0002, LISTA, CTX)?.roster?.nextAction.title).toBe('Visita domiciliaria #2')
    expect(buildChildFollowUp('N0004', HISTORIALES.N0004, LISTA, CTX)?.roster).toMatchObject({
      prioritizedForHomeVisit: false,
      nextAction: { channel: 'whatsapp', title: 'Seguimiento por WhatsApp', rationale: 'Puntaje, capacidad de 2 visitas' },
    })
    expect(buildChildFollowUp('N0003', HISTORIALES.N0003, LISTA, CTX)?.roster).toMatchObject({
      relationship: 'Papá',
      reasons: ['tiene 18 meses o más', 'sin controles recientes'],
    })
  })

  it('distingue al niño fuera de la lista, al inexistente y la lista que no cargó', () => {
    expect(buildChildFollowUp('N0099', HISTORIAL_FUERA, LISTA, CTX)).toMatchObject({
      rosterStatus: 'fuera_de_lista',
      roster: null,
      latestReport: { text: 'Tuve un problema: Se acabó el hierro', isThisWeek: true },
    })
    // La API responde [] (no 404) a un código que no existe: sin historial y fuera de la lista
    expect(buildChildFollowUp('N0099', [], LISTA, CTX)).toBeNull()
    // En la lista pero sin historial todavía: existe
    expect(buildChildFollowUp('N0004', [], LISTA, CTX)).toMatchObject({ rosterStatus: 'en_lista', botHistory: [] })
    // Sin lista no se puede decidir que no existe
    expect(buildChildFollowUp('N0099', [], undefined, CTX)).toMatchObject({ rosterStatus: 'sin_lista', roster: null })
  })
})

describe('Pantalla de la Ficha del niño', () => {
  it('muestra los datos reales del niño: lista de la semana + historial', async () => {
    const api = mockApi()
    abrirFicha('N0001')

    expect(await screen.findByRole('heading', { name: 'N0001' })).toBeInTheDocument()
    expect(api.pedidosA('GET', '/ninos/N0001/historial')).toHaveLength(1)
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')[0].params.get('capacidad')).toBe('10')
    expect(screen.getByText('ID: N0001')).toBeInTheDocument()
    expect(screen.getByText('Priorizado para Visita Domiciliaria')).toBeInTheDocument()
    expect(screen.getByText('8 meses')).toBeInTheDocument()
    expect(screen.getByText('6-11 meses')).toBeInTheDocument()
    expect(screen.getByText('EESS01')).toBeInTheDocument()
    expect(screen.getByText('#1 de 4')).toBeInTheDocument()
    expect(screen.getByText('Riesgo de no consumo: 28%')).toBeInTheDocument()
    expect(screen.getByText('Motivos del modelo: sin factores destacados')).toBeInTheDocument()
    expect(screen.getByText('Mamá de N0001')).toBeInTheDocument()
    expect(screen.getByText('Mamá')).toBeInTheDocument()
    expect(screen.getByText('Visita domiciliaria #1')).toBeInTheDocument()
    expect(screen.getByText('Seguimiento: la semana pasada respondió: No le di')).toBeInTheDocument()
    expect(await screen.findByText('Semana 43 · 19 – 25 oct 2026')).toBeInTheDocument()
    expect(await screen.findByText('No le di: No le gusta (Semana 42, vía WhatsApp)')).toBeInTheDocument()
  })

  it('traduce el historial del bot: semana ISO, respuesta + razón, estado y resultado', async () => {
    mockApi()
    abrirFicha('N0001')
    await screen.findByRole('heading', { name: 'N0001' })

    fireEvent.click(screen.getByRole('tab', { name: 'Historial Semanal' }))
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('3 Semanas')).toBeInTheDocument()
    expect(within(panel).getByText('Semana 42 (12 – 18 oct 2026)')).toBeInTheDocument()
    expect(within(panel).getByText('No le di: No le gusta')).toBeInTheDocument()
    expect(within(panel).getByText('Interrupción')).toBeInTheDocument()
    expect(within(panel).getByText('Completado')).toBeInTheDocument()
    expect(within(panel).getAllByText('Sin respuesta').length).toBeGreaterThan(0)
    expect(
      within(panel).getByText('Acción del sistema: Se envió la lista de motivos. Prioridad R1 en la lista desde esta misma semana.'),
    ).toBeInTheDocument()
    expect(await within(panel).findByText('Semana en curso: aún no responde.')).toBeInTheDocument()
    expect(within(panel).getByText('Acción de esa semana: Visita domiciliaria · Riesgo de no consumo: 28%')).toBeInTheDocument()
    expect(within(panel).getAllByText('Acción de esa semana: WhatsApp · Riesgo de no consumo: 28%')).toHaveLength(2)
    // El bot solo recibe botones: nada de citas textuales
    expect(panel.textContent).not.toMatch(/["“”]/)

    fireEvent.click(screen.getByRole('tab', { name: 'Dificultades Reportadas' }))
    const dificultades = screen.getByRole('tabpanel')
    expect(within(dificultades).getByText('1 Semana')).toBeInTheDocument()
    expect(within(dificultades).getByText('No le di: No le gusta')).toBeInTheDocument()
    expect(within(dificultades).queryByText('Semana 41 (5 – 11 oct 2026)')).toBeNull()
  })

  it('muestra la "Respuesta del cuidador" por semana con el estado sin respuesta', async () => {
    mockApi()
    abrirFicha('N0001')
    await screen.findByRole('heading', { name: 'N0001' })

    expect(screen.getByRole('heading', { name: 'Respuesta del cuidador' })).toBeInTheDocument()
    expect(screen.getByText('Sí le di: 1 / 3 sem')).toBeInTheDocument()
    const barras = within(screen.getByRole('list', { name: 'Respuesta del cuidador por semana' })).getAllByRole('listitem')
    expect(barras.map((barra) => barra.getAttribute('title'))).toEqual([
      'Semana 41: Sí le di',
      'Semana 42: No le di',
      'Semana 43: Sin respuesta (semana en curso)',
    ])
    expect(screen.queryByText(/Regularidad/)).toBeNull()
  })

  it('no muestra datos que la API no tiene ni datos que chocan con las reglas del proyecto', async () => {
    mockApi()
    const { container } = abrirFicha('N0001')
    await screen.findByRole('heading', { name: 'N0001' })

    for (const pestana of ['Resumen', 'Historial Semanal', 'Dificultades Reportadas']) {
      fireEvent.click(screen.getByRole('tab', { name: pestana }))
      const texto = container.textContent ?? ''
      expect(texto).not.toMatch(/51000|\+51|tel:|wa\.me/) // teléfonos
      expect(texto).not.toMatch(/Llamar|Contacto|Sector|Cuidadora:/) // contacto directo, sector, nombre
      expect(texto).not.toMatch(/Iniciales|Padrón Nominal \d{4}/) // iniciales y año de registro
      expect(texto).not.toMatch(/Suplemento|Sulfato|Gotas|Jarabe|Esquema/i) // suplemento y esquema
      expect(texto).not.toMatch(/CRED/) // fecha del último control CRED
      expect(texto).not.toMatch(/Reasignar|Registro de Visita|epidemiológica|norma técnica/i)
      expect(texto).not.toMatch(/\b(ALTO|MODERADO|MEDIO|BAJO)\b/) // niveles de riesgo sin umbrales definidos
    }
    expect(container.querySelector('a[href^="tel:"], a[href*="wa.me"]')).toBeNull()
    expect(screen.queryByRole('button', { name: /Reasignar/ })).toBeNull()
  })

  it('si el niño no está en la lista, muestra el código y el historial con una nota', async () => {
    mockApi({ 'GET /ninos/N0099/historial': HISTORIAL_FUERA })
    abrirFicha('N0099')

    expect(await screen.findByRole('status')).toHaveTextContent('N0099 no está en la lista de esta semana de EESS01.')
    expect(screen.getByRole('heading', { name: 'N0099' })).toBeInTheDocument()
    expect(screen.getByText('Tuve un problema: Se acabó el hierro')).toBeInTheDocument()
    expect(screen.getByText('Sin acción asignada: no está en la lista de esta semana de EESS01.')).toBeInTheDocument()
    expect(screen.getByText('Sin datos (fuera de la lista)')).toBeInTheDocument()
    expect(screen.queryByText('Priorizado para Visita Domiciliaria')).toBeNull()
    // Sin la fila de la lista no hay puntaje de esta semana (el de cada semana sí viene en el historial)
    expect(screen.queryByText(/^Riesgo de no consumo: \d+%$/)).toBeNull()
    expect(screen.getByText('Acción de esa semana: WhatsApp · Riesgo de no consumo: 41%')).toBeInTheDocument()
    expect(screen.queryByText(/No encontramos/)).toBeNull()
  })

  it('si el código no existe (historial vacío y fuera de la lista), lo dice y ofrece volver', async () => {
    mockApi({ 'GET /ninos/N9999/historial': [] })
    abrirFicha('N9999')

    expect(await screen.findByText('No encontramos un niño con el código N9999.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver niños en seguimiento' })).toHaveAttribute('href', '/ninos')
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('si la API falla, muestra el motivo y permite reintentar', async () => {
    mockApi({ 'GET /ninos/N0001/historial': errorApi(500, 'Internal Server Error') })
    abrirFicha('N0001')

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('No se pudo cargar la información.')
    expect(alerta).toHaveTextContent('Internal Server Error')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('si solo falla la lista, avisa y muestra el historial', async () => {
    mockApi({ 'POST /establecimientos/EESS01/lista': errorApi(500, 'Internal Server Error') })
    abrirFicha('N0001')

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la lista de la semana')
    expect(screen.getByText('Semana 42 (12 – 18 oct 2026)')).toBeInTheDocument()
    expect(screen.getByText('Sin acción asignada: no se pudo cargar la lista de la semana de EESS01.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(/No encontramos/)).toBeNull()
  })
})
