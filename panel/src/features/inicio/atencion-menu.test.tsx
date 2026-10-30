import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MedioAtencion } from '@/api/yawar'
import { INDICADORES, LISTA } from '@/test/datos'
import { errorApi, mockApi, renderizar } from '@/test/utilidades'
import InicioPage from './InicioPage'

const alarma = { registro_id: 23, version_alarma: 2, semana: '2026-W43' }
const rutaAtencion = '/ninos/N0001/alarmas/23/atencion'

function abrirInicio({ error = false, multiples = false } = {}) {
  let atendida = false
  const fila = () => ({
    ...LISTA[0], seguimiento: atendida ? null : 'POSIBLE SEÑAL DE PELIGRO',
    alarmas_pendientes: atendida ? [] : [alarma, ...(multiples ? [{ ...alarma, registro_id: 22, semana: '2026-W42' }] : [])],
  })
  const api = mockApi({
    'POST /establecimientos/EESS01/lista': () => [fila()],
    'GET /establecimientos/EESS01/lista': () => [fila()],
    'GET /establecimientos/EESS01/indicadores': () => ({ ...INDICADORES, alarmas_pendientes: atendida ? 0 : 1 }),
    [`POST ${rutaAtencion}`]: error ? errorApi(409, 'La alarma cambió. Actualiza el caso.') : () => {
      atendida = true
      const pedido = api.pedidosA('POST', rutaAtencion).at(-1)!
      const cuerpo = JSON.parse(String(pedido.body))
      return { ...cuerpo, id: 1, registro_id: 23, atendido_en: '2026-10-21T14:30:00', detalle_alarma: null }
    },
  })
  renderizar(<InicioPage />)
  return api
}

async function abrirAtencion() {
  fireEvent.click(await screen.findByRole('button', { name: 'Más opciones para N0001' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Atender' }))
}

describe('Atender desde los tres puntos de Inicio', () => {
  it.each<MedioAtencion>(['llamada', 'visita_presencial'])('registra por %s solo después de confirmar', async (medio) => {
    const api = abrirInicio()
    await abrirAtencion()
    const menu = screen.getByRole('menu', { name: 'Atender a N0001' })
    expect(within(menu).getByRole('menuitem', { name: 'Confirmar atención' })).toBeDisabled()
    const opcion = within(menu).getByRole('menuitemradio', { name: medio === 'llamada' ? 'Llamada' : 'Visita presencial' })
    fireEvent.click(opcion)
    expect(opcion).toHaveAttribute('aria-checked', 'true')
    expect(api.pedidosA('POST', rutaAtencion)).toHaveLength(0)
    fireEvent.click(within(menu).getByRole('menuitem', { name: `Confirmar atención por ${medio === 'llamada' ? 'llamada' : 'visita presencial'}` }))
    expect(await within(menu).findByRole('status')).toHaveTextContent(`Atendido por ${medio === 'llamada' ? 'llamada' : 'visita presencial'}`)
    expect(api.pedidosA('POST', rutaAtencion)).toHaveLength(1)
    expect(JSON.parse(String(api.pedidosA('POST', rutaAtencion)[0].body))).toEqual({ medio, version_alarma: 2 })
    await waitFor(() => expect(screen.queryByRole('alert', { name: 'Posible peligro' })).not.toBeInTheDocument())
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Volver al menú' }))
    expect(screen.queryByRole('menuitem', { name: 'Atender' })).not.toBeInTheDocument()
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(1)
  })

  it('volver o cerrar el menú descarta la selección sin registrar atención', async () => {
    const api = abrirInicio()
    await abrirAtencion()
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Llamada' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Volver al menú' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Atender' }))
    expect(screen.getByRole('menuitemradio', { name: 'Llamada' })).toHaveAttribute('aria-checked', 'false')
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Más opciones para N0001' })).toHaveFocus()
    expect(api.pedidosA('POST', rutaAtencion)).toHaveLength(0)
  })

  it('permite navegar con flechas y seleccionar un medio con el teclado', async () => {
    abrirInicio()
    await abrirAtencion()
    const llamada = screen.getByRole('menuitemradio', { name: 'Llamada' })
    const visita = screen.getByRole('menuitemradio', { name: 'Visita presencial' })
    expect(llamada).toHaveFocus()
    fireEvent.keyDown(llamada, { key: 'ArrowDown' })
    expect(visita).toHaveFocus()
    fireEvent.keyDown(visita, { key: 'Home' })
    expect(llamada).toHaveFocus()
  })

  it('muestra el error del backend y conserva el caso pendiente', async () => {
    abrirInicio({ error: true })
    await abrirAtencion()
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Llamada' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Confirmar atención por llamada' }))
    expect(await within(screen.getByRole('menu')).findByRole('alert')).toHaveTextContent('La alarma cambió')
    expect(within(screen.getByRole('menu')).queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('alert', { name: 'Posible peligro' })).toBeInTheDocument()
  })

  it('deja elegir la alarma cuando el niño tiene varias semanas pendientes', async () => {
    const api = abrirInicio({ multiples: true })
    await abrirAtencion()
    expect(screen.getByRole('menuitem', { name: 'Alarma de 2026-W42' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Alarma de 2026-W43' }))
    expect(screen.getByRole('menuitemradio', { name: 'Llamada' })).toBeInTheDocument()
    expect(api.pedidosA('POST', rutaAtencion)).toHaveLength(0)
  })
})
