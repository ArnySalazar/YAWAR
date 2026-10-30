import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AtencionAlarma, MedioAtencion } from '@/api/yawar'
import { INDICADORES, LISTA } from '@/test/datos'
import { errorApi, mockApi, renderizar } from '@/test/utilidades'
import PlanificacionPage from './PlanificacionPage'
import InicioPage from '@/features/inicio/InicioPage'
import FichaNinoPage from '@/features/ficha-nino/FichaNinoPage'

const alarma = { registro_id: 23, version_alarma: 1, semana: '2026-W43' }
const atencion: AtencionAlarma = {
  id: 1, registro_id: 23, version_alarma: 1, medio: 'llamada',
  atendido_en: '2026-10-21T14:30:00', detalle_alarma: 'Mensaje sintético',
}

describe('Atención de alarmas', () => {
  it.each<MedioAtencion>(['llamada', 'visita_presencial'])('guarda por %s y refresca el estado y los indicadores', async (medio) => {
    let guardada = false
    const api = mockApi({
      'POST /establecimientos/EESS01/lista': () => [{
        ...LISTA[0], seguimiento: guardada ? null : 'POSIBLE SEÑAL DE PELIGRO',
        alarmas_pendientes: guardada ? [] : [alarma],
        atenciones_alarma: guardada ? [{ ...atencion, medio }] : [],
      }],
      'GET /establecimientos/EESS01/lista': () => [{
        ...LISTA[0], seguimiento: null, alarmas_pendientes: [], atenciones_alarma: [{ ...atencion, medio }],
      }],
      'GET /establecimientos/EESS01/indicadores': () => ({ ...INDICADORES, alarmas_pendientes: guardada ? 0 : 1 }),
      'POST /ninos/N0001/alarmas/23/atencion': () => { guardada = true; return { ...atencion, medio } },
    })
    // Ambas pantallas comparten el mismo QueryClient, igual que en la aplicación.
    renderizar(<><InicioPage /><PlanificacionPage /></>)
    await screen.findByRole('alert', { name: 'Posible peligro' })
    const tabla = await screen.findByRole('table')
    fireEvent.click(within(tabla).getByRole('button', { name: 'Atender alarma de N0001' }))
    fireEvent.click(within(tabla).getByRole('button', { name: /Registrar atención de N0001/ }))
    const formulario = within(tabla).getByRole('form', { name: 'Registrar atención de N0001' })
    expect(within(formulario).getByRole('button', { name: 'Guardar atención' })).toBeDisabled()
    fireEvent.change(within(formulario).getByLabelText('Medio de atención'), { target: { value: medio } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Guardar atención' }))
    await waitFor(() => expect(within(tabla).getByText(`Atendido por ${medio === 'llamada' ? 'llamada' : 'visita presencial'}`)).toBeInTheDocument())
    expect(JSON.parse(String(api.pedidosA('POST', '/ninos/N0001/alarmas/23/atencion')[0].body)))
      .toEqual({ medio, version_alarma: 1 })
    await waitFor(() => expect(screen.queryByRole('alert', { name: 'Posible peligro' })).not.toBeInTheDocument())
    expect(api.pedidosA('GET', '/ninos/N0001/historial').length).toBeGreaterThan(1)
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(1)
    expect(api.pedidosA('GET', '/establecimientos/EESS01/lista')).toHaveLength(1)
  })

  it('muestra el conflicto y permite revisar la nueva versión sin declarar atendido', async () => {
    mockApi({
      'POST /establecimientos/EESS01/lista': [{ ...LISTA[0], alarmas_pendientes: [alarma] }],
      'GET /establecimientos/EESS01/lista': [{ ...LISTA[0], alarmas_pendientes: [alarma] }],
      'POST /ninos/N0001/alarmas/23/atencion': errorApi(409, 'La alarma cambió. Actualiza el caso.'),
    })
    renderizar(<PlanificacionPage />)
    const tabla = await screen.findByRole('table')
    fireEvent.click(within(tabla).getByRole('button', { name: 'Atender alarma de N0001' }))
    fireEvent.click(within(tabla).getByRole('button', { name: /Registrar atención de N0001/ }))
    const formulario = within(tabla).getByRole('form', { name: 'Registrar atención de N0001' })
    fireEvent.change(within(formulario).getByLabelText('Medio de atención'), { target: { value: 'llamada' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Guardar atención' }))
    expect(await within(formulario).findByRole('alert')).toHaveTextContent('La alarma cambió')
    expect(within(tabla).queryByText('Atendido')).not.toBeInTheDocument()
  })

  it('conserva la atención en la ficha y muestra aparte una alarma nueva pendiente', async () => {
    mockApi({
      'GET /ninos/N0001/historial': [{
        semana: '2026-W43', accion: 'visita', puntaje: 0.3, respuesta: 'problema', razon: 'otro',
        alarma: true, alarma_pendiente: true, atenciones: [atencion],
      }],
    })
    renderizar(<FichaNinoPage />, { ruta: '/ninos/N0001', patron: '/ninos/:childId' })
    expect(await screen.findByText('Atendido por llamada')).toBeInTheDocument()
    expect(screen.getByText('Posible peligro · pendiente de atención')).toBeInTheDocument()
    expect(screen.getByText(/2026-10-21 a las 14:30/)).toBeInTheDocument()
  })
})
