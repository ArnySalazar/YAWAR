// Pantalla "Inicio" contra la API simulada (mismo formato que la real).
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FilaLista } from '@/api/yawar'
import { INDICADORES, LISTA } from '@/test/datos'
import { errorApi, mockApi, renderizar, type PedidoApi } from '@/test/utilidades'
import InicioPage from './InicioPage'
import {
  META_ALERT_NOTE,
  buildAlerts,
  buildHomeOverview,
  buildWhatsappStats,
  statusTextFor,
  toPrioritizedChildren,
} from './api'

const META = 'Llegaron muchas menos respuestas que en semanas anteriores.'

/** Lista como la genera la API: los N primeros (por orden) a visita y el resto a WhatsApp. */
function listaConCapacidad(pedido: PedidoApi): FilaLista[] {
  const n = Number(pedido.params.get('capacidad'))
  return LISTA.map((fila) => ({ ...fila, accion: fila.orden <= n ? 'visita' : 'whatsapp' }))
}

/** Capacidad N guardada en el navegador antes de abrir la pantalla (la recuerda EstablecimientoProvider). */
function conCapacidad(n: number) {
  localStorage.setItem('yawar.capacidad.EESS01', String(n))
}

function abrirInicio(extra: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi({ 'POST /establecimientos/EESS01/lista': listaConCapacidad, ...extra })
  const vista = renderizar(<InicioPage />)
  return { api, ...vista }
}

describe('Adaptador de Inicio', () => {
  it('ordena la lista y traduce cada fila: regla, texto de la API, alias, riesgo y acción', () => {
    const children = toPrioritizedChildren([...LISTA].reverse())
    expect(children.map((c) => [c.code, c.rule, c.nextAction])).toEqual([
      ['N0001', 'R1', { type: 'home_visit', visitOrder: 1 }],
      ['N0002', 'R2', { type: 'home_visit', visitOrder: 2 }],
      ['N0004', 'R3', { type: 'whatsapp_followup' }],
      ['N0003', 'R3', { type: 'whatsapp_followup' }],
    ])
    expect(children[0]).toMatchObject({
      ageMonths: 8,
      caregiverAlias: 'Mamá de N0001',
      signalLabel: 'No le dio',
      statusText: 'La semana pasada respondió: No le di',
      riskScore: 0.278,
    })
    expect(children[1].statusText).toBe('Sin respuesta hace 7 días o más')
    expect(children[3].statusText).toBe('Tiene 18 meses o más; sin controles recientes')
    expect(statusTextFor({ seguimiento: null, motivos: '' })).toBe('Sin factores destacados')
  })

  it('arma los KPIs de la lista: priorizado = señal R1 o R2; N es la capacidad usada al generar', () => {
    const resumen = buildHomeOverview(LISTA, { semana: '2026-W43', establecimiento: 'EESS01', capacidad: 2 })
    expect(resumen).toMatchObject({
      roster: { total: 4, ageRangeMonths: { min: 8, max: 30 } },
      prioritized: { total: 2, registrySharePct: 50 },
      homeVisits: { assigned: 2, capacityN: 2, coveragePct: 100 },
      whatsappFollowUps: 2,
    })
    expect(buildHomeOverview(LISTA, { semana: '2026-W43', establecimiento: 'EESS01', capacidad: 10 }).homeVisits)
      .toMatchObject({ capacityN: 10, coveragePct: 20 })
    expect(buildHomeOverview([], { semana: '2026-W43', establecimiento: 'EESS01', capacidad: 10 })).toMatchObject({
      roster: { total: 0, ageRangeMonths: null },
      prioritized: { total: 0, registrySharePct: 0 },
    })
  })

  it('toma las respuestas de la última semana de la serie de indicadores', () => {
    expect(buildWhatsappStats(INDICADORES)).toEqual({
      semana: '2026-W43',
      sent: 4,
      failed: 0,
      responses: 2,
      responseRate: 0.5,
    })
    expect(buildWhatsappStats({ serie: [] })).toBeNull()
    expect(
      buildWhatsappStats({ serie: [{ semana: '2026-W43', enviados: 0, fallidos: 0, respondidos: 0, si_le_di: 0 }] })
        ?.responseRate,
    ).toBeNull()
  })

  it('arma las alertas: meta-alerta con su nota, R1 (nivel 0) y R2 (nivel 1)', () => {
    expect(buildAlerts(LISTA, null).map((a) => [a.type, a.title, a.affectedChildren])).toEqual([
      ['reported_problem', '1 reportó problema o no le dio', 1],
      ['no_response', '1 niño sin respuesta', 1],
    ])

    const conProblema: FilaLista = {
      ...LISTA[2],
      nivel: 0,
      seguimiento: 'la semana pasada respondió: Tuve un problema',
    }
    const alertas = buildAlerts([...LISTA, conProblema], META)
    expect(alertas.map((a) => a.type)).toEqual(['meta_alert', 'reported_problem', 'no_response'])
    expect(alertas[0]).toMatchObject({ description: META, note: META_ALERT_NOTE, affectedChildren: null })
    expect(alertas[1].title).toBe('2 reportaron problema o no le dieron')
    expect(alertas[1].description).toContain('«No le di» (1) o «Tuve un problema» (1)')

    expect(buildAlerts(LISTA.filter((f) => f.nivel === 2), null)).toEqual([])
  })
})

describe('Pantalla de Inicio', () => {
  it('oculta la tarjeta al atender aunque la alarma histórica permanezca marcada', async () => {
    abrirInicio({ 'GET /establecimientos/EESS01/indicadores': {
      ...INDICADORES, alarmas_pendientes: 0,
      serie: [{ ...INDICADORES.serie.at(-1)!, alarmas: 2, alarmas_pendientes: 0, alarmas_atendidas: 2 }],
    } })
    await screen.findByText('2 respuestas')
    expect(screen.queryByRole('alert', { name: 'Posible peligro' })).not.toBeInTheDocument()
  })

  it.each([2, 1, 0, undefined])('lee alarmas=%s de la semana actual con el formato real de la API', async (alarmas) => {
    abrirInicio({
      'GET /establecimientos/EESS01/indicadores': {
        ...INDICADORES,
        serie: INDICADORES.serie.map((semana, i) => ({
          ...semana,
          alarmas: i === INDICADORES.serie.length - 1 ? alarmas : 5,
        })),
      },
    })

    await screen.findByText('2 respuestas')
    if (alarmas) {
      const aviso = await screen.findByRole('alert', { name: 'Posible peligro' })
      expect(within(aviso).getByRole('heading', { name: 'Posible señal de peligro' })).toBeInTheDocument()
      expect(within(aviso).getByText(String(alarmas))).toBeInTheDocument()
      expect(aviso).toHaveTextContent('Revisar hoy en Planificación')
    } else {
      expect(screen.queryByRole('alert', { name: 'Posible peligro' })).not.toBeInTheDocument()
    }
  })

  it.each([
    [2, '2 niños con posible señal de peligro: revisar hoy'],
    [1, '1 niño con posible señal de peligro: revisar hoy'],
  ])('muestra la tarjeta de posible peligro junto a los indicadores con alarmas=%i y enlaza a Planificación', async (alarmas, texto) => {
    abrirInicio({
      'GET /establecimientos/EESS01/indicadores': { ...INDICADORES, alarmas },
    })

    const aviso = await screen.findByRole('alert', { name: 'Posible peligro' })
    expect(within(aviso).getByRole('link', { name: texto })).toHaveAttribute('href', '/planificacion')
    expect(within(aviso).getByText(String(alarmas))).toBeInTheDocument()
    const indicadores = screen.getByRole('region', { name: 'Indicadores de la semana' })
    expect(indicadores).toContainElement(aviso)
    expect(indicadores.firstElementChild).toBe(aviso)
    expect(within(indicadores).getAllByRole('link')).toHaveLength(5)
  })

  it.each([0, undefined])('no muestra el aviso de posible peligro con alarmas=%s', async (alarmas) => {
    abrirInicio({ 'GET /establecimientos/EESS01/indicadores': { ...INDICADORES, alarmas } })

    // Espera a que los indicadores se hayan cargado antes de comprobar la ausencia.
    await screen.findByText('2 respuestas')
    expect(screen.queryByRole('alert', { name: 'Posible peligro' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Indicadores de la semana' })).getAllByRole('link')).toHaveLength(4)
    expect(screen.queryByText(/con posible señal de peligro: revisar hoy/)).not.toBeInTheDocument()
  })

  it('saluda sin nombre de usuario y muestra el establecimiento y la semana ISO', async () => {
    abrirInicio()
    const titulo = screen.getByRole('heading', { level: 1 })
    // hora_local de la API: 10:00 en Lima
    await waitFor(() => expect(titulo).toHaveTextContent(/^Buenos días$/))
    expect(screen.getByText('EESS01', { selector: 'span span' })).toBeInTheDocument()
    expect(await screen.findByText('Semana 43 (19 – 25 oct, 2026)')).toBeInTheDocument()
    expect(await screen.findByText('Padrón nominal activo: 4 niños')).toBeInTheDocument()
    expect(screen.getByText('MODO PRUEBA · SEGUIMIENTO SEMANAL')).toBeInTheDocument()
  })

  it('muestra los KPIs con la lista y los indicadores de la API, sin regenerar la lista', async () => {
    conCapacidad(2)
    const { api } = abrirInicio()
    const kpis = await screen.findByRole('region', { name: 'Indicadores de la semana' })

    const padron = within(kpis).getByRole('link', { name: /Padrón Activo \(8-30 m\)/ })
    expect(within(padron).getByText('4')).toBeInTheDocument()

    const priorizados = within(kpis).getByRole('link', { name: /Priorizados Esta Semana/ })
    expect(within(priorizados).getByText('2')).toBeInTheDocument()
    expect(priorizados).toHaveTextContent('50% del padrón')

    const visitas = within(kpis).getByRole('link', { name: /Visitas Asignadas/ })
    expect(visitas).toHaveTextContent('2 / 2')
    expect(visitas).toHaveTextContent('100% de la capacidad')

    const whatsapp = within(kpis).getByRole('link', { name: /Seguimiento WhatsApp/ })
    expect(within(whatsapp).getByText('2')).toBeInTheDocument()
    expect(await within(whatsapp).findByText('2 respuestas')).toBeInTheDocument()
    expect(whatsapp).toHaveTextContent('Tasa de respuesta 50%')
    expect(whatsapp).toHaveTextContent('El recordatorio va a todos los cuidadores, también a los de visita')

    // Avance: respondidos de los enviados (última semana de la serie)
    expect(screen.getByRole('progressbar', { name: 'Cuidadores que respondieron el recordatorio' })).toHaveAttribute(
      'aria-valuenow',
      '2',
    )
    expect(screen.getByText('2 de 4 (50%)')).toBeInTheDocument()

    // Una sola generación al abrir, con la capacidad guardada
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(1)
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')[0].params.get('capacidad')).toBe('2')
    expect(api.pedidosA('GET', '/establecimientos/EESS01/indicadores').length).toBeGreaterThan(0)
  })

  it('lista a los niños en orden de prioridad con su motivo, texto, alias, riesgo y acción', async () => {
    conCapacidad(2)
    abrirInicio()
    const lista = await screen.findByRole('list', { name: 'Niños de la lista de la semana' })
    const filas = within(lista).getAllByRole('listitem')
    expect(filas.map((fila) => within(fila).getByRole('link', { name: /Ver ficha/ }).textContent)).toEqual([
      'N0001',
      'N0002',
      'N0004',
      'N0003',
    ])

    expect(filas[0]).toHaveTextContent('8 meses')
    expect(within(filas[0]).getByText('No le dio (R1)')).toBeInTheDocument()
    expect(within(filas[0]).getByText('La semana pasada respondió: No le di')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Mamá de N0001')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Visita domiciliaria #1')).toBeInTheDocument()
    expect(within(filas[0]).getByText('28%')).toBeInTheDocument()
    expect(within(filas[0]).getByRole('link', { name: 'Ver ficha del niño N0001' })).toHaveAttribute('href', '/ninos/N0001')

    expect(within(filas[1]).getByText('Sin respuesta (R2)')).toBeInTheDocument()
    expect(within(filas[1]).getByText('Sin respuesta hace 7 días o más')).toBeInTheDocument()
    expect(within(filas[1]).getByText('Visita domiciliaria #2')).toBeInTheDocument()

    expect(within(filas[2]).getByText('Por puntaje (R3)')).toBeInTheDocument()
    expect(within(filas[2]).getByText('Tiene 18 meses o más')).toBeInTheDocument()
    expect(within(filas[2]).getByText('Seguimiento por WhatsApp')).toBeInTheDocument()
    expect(within(filas[2]).getByText('58%')).toBeInTheDocument()

    expect(within(filas[3]).getByText('Papá de N0003')).toBeInTheDocument()
    expect(within(filas[3]).getByText('Tiene 18 meses o más; sin controles recientes')).toBeInTheDocument()

    // Filtro por motivo (en el navegador)
    fireEvent.click(screen.getByRole('button', { name: /Sin respuesta 7d \(R2\) \(1\)/ }))
    const filtrada = screen.getByRole('list', { name: 'Niños de la lista de la semana' })
    expect(within(filtrada).getAllByRole('listitem')).toHaveLength(1)
    expect(filtrada).toHaveTextContent('N0002')
    expect(screen.getByRole('link', { name: /Ver la lista completa en Planificación \(4 niños\)/ })).toHaveAttribute(
      'href',
      '/planificacion',
    )
  })

  it('muestra las alertas de R1 y R2 y la meta-alerta con su nota', async () => {
    abrirInicio({ 'GET /establecimientos/EESS01/indicadores': { ...INDICADORES, meta_alerta: META } })
    const alertas = await screen.findByRole('region', { name: 'Alertas Operativas Críticas' })
    expect(await within(alertas).findByText(META)).toBeInTheDocument()
    expect(within(alertas).getByText('Meta-alerta del sistema')).toBeInTheDocument()
    expect(alertas).toHaveTextContent('Al inicio de la semana puede salir aunque nada esté roto')
    expect(within(alertas).getByText('1 reportó problema o no le dio')).toBeInTheDocument()
    expect(within(alertas).getByText('1 niño sin respuesta')).toBeInTheDocument()
    // La meta-alerta va primero
    expect(within(alertas).getAllByRole('listitem')[0]).toHaveTextContent('Meta-alerta del sistema')
  })

  it('sin meta-alerta de la API no muestra ninguna', async () => {
    abrirInicio()
    const alertas = await screen.findByRole('region', { name: 'Alertas Operativas Críticas' })
    expect(within(alertas).getByText('1 niño sin respuesta')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('2 respuestas')).toBeInTheDocument())
    expect(within(alertas).queryByText('Meta-alerta del sistema')).toBeNull()
  })

  it('cambiar la capacidad N vuelve a generar la lista con la nueva N', async () => {
    conCapacidad(2)
    const { api } = abrirInicio()
    let capacidad = await screen.findByRole('region', { name: 'Capacidad de Seguimiento' })
    expect(within(capacidad).getByText('N=2')).toBeInTheDocument()
    expect(capacidad).toHaveTextContent('2 Visitas (50%)')

    fireEvent.click(within(capacidad).getByRole('button', { name: 'Aumentar cupo N' }))
    expect(within(capacidad).getByText('N=3')).toBeInTheDocument()
    expect(capacidad).toHaveTextContent('3 Visitas (75%)')
    // Elegir N todavía no escribe en la API
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(1)

    fireEvent.click(within(capacidad).getByRole('button', { name: 'Volver a generar con N=3' }))
    await waitFor(() => expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(2))
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')[1].params.get('capacidad')).toBe('3')

    // La pantalla toma la lista nueva
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Visitas Asignadas/ })).toHaveTextContent('3 / 3'),
    )
    expect(screen.getByText('Visita domiciliaria #3')).toBeInTheDocument()
    capacidad = screen.getByRole('region', { name: 'Capacidad de Seguimiento' })
    expect(within(capacidad).getByText('N=3')).toBeInTheDocument()
    expect(within(capacidad).queryByRole('button', { name: /Volver a generar/ })).toBeNull()
    expect(localStorage.getItem('yawar.capacidad.EESS01')).toBe('3')
  })

  it('el máximo de N es el total de niños', async () => {
    conCapacidad(10)
    abrirInicio()
    const capacidad = await screen.findByRole('region', { name: 'Capacidad de Seguimiento' })
    expect(within(capacidad).getByText('N=4')).toBeInTheDocument()
    expect(within(capacidad).getByRole('button', { name: 'Aumentar cupo N' })).toBeDisabled()
    expect(screen.getByRole('link', { name: /Visitas Asignadas/ })).toHaveTextContent('4 / 10')
  })

  it('si falla la nueva generación, avisa y no cambia la capacidad', async () => {
    conCapacidad(2)
    let llamadas = 0
    abrirInicio({
      'POST /establecimientos/EESS01/lista': (pedido: PedidoApi) =>
        ++llamadas === 1 ? listaConCapacidad(pedido) : errorApi(500, 'Internal Server Error'),
    })
    const capacidad = await screen.findByRole('region', { name: 'Capacidad de Seguimiento' })
    fireEvent.click(within(capacidad).getByRole('button', { name: 'Disminuir cupo N' }))
    fireEvent.click(within(capacidad).getByRole('button', { name: 'Volver a generar con N=1' }))
    expect(await within(capacidad).findByRole('alert')).toHaveTextContent('No se pudo volver a generar la lista')
    expect(localStorage.getItem('yawar.capacidad.EESS01')).toBe('2')
  })

  it('no muestra datos que la API no tiene ni datos que chocan con las reglas del proyecto', async () => {
    const { container } = abrirInicio()
    await screen.findByRole('list', { name: 'Niños de la lista de la semana' })
    await screen.findByText('2 respuestas')
    const texto = container.textContent ?? ''
    expect(texto).not.toMatch(/\bHb\b|hemoglobina|dosaje/i) // dosaje de Hb
    expect(texto).not.toMatch(/este mes/i) // nuevos este mes
    expect(texto).not.toMatch(/realizadas|interacciones posibles|máximo de interacciones/i)
    expect(texto).not.toMatch(/epidemiológica/i)
    expect(texto).not.toMatch(/Sector|Madre:|Padre:|Cuidador\(a\):/) // sector y nombres de cuidadores
    expect(texto).not.toMatch(/\b(ALTA|MEDIA|BAJA|ALTO|MODERADO|MEDIO|BAJO)\b/) // niveles de riesgo sin umbrales
    expect(texto).not.toMatch(/\b\d{1,2}:\d{2}\b|\bHOY\b|\b(LUN|MIÉ|JUE|VIE|SÁB|DOM)\b/) // agenda con día y hora
    expect(texto).not.toMatch(/51000|\+51|\b9\d{8}\b/) // teléfonos
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
    expect(screen.queryByRole('group', { name: 'Día de la semana' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Mapa|Llamar|Enviar WhatsApp por|Día anterior|Día siguiente/ })).toBeNull()
    // Sin fotos ni avatares: solo quedan íconos SVG
    for (const img of container.querySelectorAll('img')) {
      expect(img.getAttribute('src') ?? '').not.toMatch(/avatar|\.(png|jpe?g|webp)$/i)
    }
    // Sin alarmas pendientes, el menú conserva únicamente los accesos a otras pantallas.
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones para N0001' }))
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Ver ficha del niño',
      'Abrir en Planificación',
      'Ver comunicación',
    ])
  })

  it('sin niños en el padrón, invita a cargarlo', async () => {
    abrirInicio({ 'POST /establecimientos/EESS01/lista': [] })
    expect(await screen.findByText('Aún no hay niños en el padrón de EESS01.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cargar padrón' })).toHaveAttribute('href', '/administracion')
    expect(screen.queryByRole('region', { name: 'Indicadores de la semana' })).toBeNull()
  })

  it('si la API falla, muestra el motivo y permite reintentar', async () => {
    abrirInicio({ 'POST /establecimientos/EESS01/lista': errorApi(500, 'Internal Server Error') })
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la información.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('si fallan solo los indicadores, la lista sigue visible y se avisa', async () => {
    abrirInicio({ 'GET /establecimientos/EESS01/indicadores': errorApi(500, 'Internal Server Error') })
    await screen.findByRole('list', { name: 'Niños de la lista de la semana' })
    expect(await screen.findByText('Sin datos de respuestas')).toBeInTheDocument()
    expect(screen.getByText(/No se pudo revisar la meta-alerta/)).toBeInTheDocument()
    expect(screen.getByText(/No se pudo cargar el avance de respuestas/)).toBeInTheDocument()
  })
})
