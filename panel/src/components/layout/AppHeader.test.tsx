// Encabezado común: establecimiento, semana del servidor, modo prueba y campana de alertas.
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { INDICADORES, LISTA } from '@/test/datos'
import { mockApi, renderizar } from '@/test/utilidades'
import { AppHeader } from './AppHeader'

describe('Encabezado', () => {
  it('muestra la semana según el servidor y que está en modo prueba, sin datos de usuario inventados', async () => {
    mockApi()
    const { container } = renderizar(<AppHeader />)
    expect(await screen.findByText('Semana 43 · 19 – 25 oct 2026')).toBeInTheDocument()
    expect(await screen.findByText('Modo prueba · no se envían WhatsApp reales')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Lic\.|Enfermera|epidemiológica/)
    expect(container.querySelector('img[src*="profile"]')).toBeNull()
  })

  it('al cambiar de establecimiento, pide la lista del nuevo y lo recuerda', async () => {
    const api = mockApi({ 'POST /establecimientos/EESS02/lista': [], 'GET /establecimientos/EESS02/indicadores': INDICADORES })
    renderizar(<AppHeader />)
    fireEvent.change(await screen.findByLabelText('Establecimiento'), { target: { value: 'EESS02' } })
    await waitFor(() => expect(api.pedidosA('POST', '/establecimientos/EESS02/lista')).toHaveLength(1))
    expect(localStorage.getItem('yawar.establecimiento')).toBe('EESS02')
  })

  it('marca la campana si hay niños con señal R1 o R2', async () => {
    mockApi({ 'POST /establecimientos/EESS01/lista': LISTA.filter((fila) => fila.nivel !== 0) }) // queda un R2
    renderizar(<AppHeader />)
    expect(await screen.findByRole('link', { name: 'Hay alertas de seguimiento' })).toBeInTheDocument()
  })

  it('la marca si hay meta-alerta aunque nadie tenga señal', async () => {
    mockApi({
      'POST /establecimientos/EESS01/lista': LISTA.filter((fila) => fila.nivel === 2),
      'GET /establecimientos/EESS01/indicadores': { ...INDICADORES, meta_alerta: 'Se enviaron muchos menos recordatorios.' },
    })
    renderizar(<AppHeader />)
    expect(await screen.findByRole('link', { name: 'Hay alertas de seguimiento' })).toBeInTheDocument()
  })

  it('no la marca si no hay señales ni meta-alerta', async () => {
    mockApi({ 'POST /establecimientos/EESS01/lista': LISTA.filter((fila) => fila.nivel === 2) })
    renderizar(<AppHeader />)
    expect(await screen.findByRole('link', { name: 'Sin alertas de seguimiento' })).toBeInTheDocument()
  })
})
