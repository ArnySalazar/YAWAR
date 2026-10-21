// Etiqueta común sobre el título de las 7 pantallas.
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SALUD } from '@/test/datos'
import { mockApi, renderizar } from '@/test/utilidades'
import { EtiquetaSeguimiento } from './EtiquetaSeguimiento'

describe('Etiqueta de seguimiento', () => {
  it('dice MODO PRUEBA cuando la API no envía WhatsApp reales', async () => {
    mockApi()
    renderizar(<EtiquetaSeguimiento />)
    expect(await screen.findByText('MODO PRUEBA · SEGUIMIENTO SEMANAL')).toBeInTheDocument()
  })

  it('con envío real queda solo SEGUIMIENTO SEMANAL', async () => {
    const api = mockApi({ 'GET /salud': { ...SALUD, modo_prueba: false } })
    renderizar(<EtiquetaSeguimiento />)
    await screen.findByText('SEGUIMIENTO SEMANAL')
    await new Promise((r) => setTimeout(r, 50)) // /salud ya respondió
    expect(api.pedidosA('GET', '/salud')).toHaveLength(1)
    expect(screen.queryByText(/MODO PRUEBA/)).not.toBeInTheDocument()
  })
})
