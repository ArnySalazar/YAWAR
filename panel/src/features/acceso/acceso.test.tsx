import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { errorApi, mockApi } from '@/test/utilidades'
import { SesionProvider } from './SesionProvider'
import { RequiereSesion } from './RequiereSesion'
import IngresarPage from './IngresarPage'

function app(ruta = '/planificacion') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[ruta]}>
        <SesionProvider>
          <Routes>
            <Route path="/ingresar" element={<IngresarPage />} />
            <Route path="*" element={<RequiereSesion><p>Panel privado</p></RequiereSesion>} />
          </Routes>
        </SesionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Inicio de sesión', () => {
  it('sin sesión manda a ingresar y no muestra el panel', async () => {
    mockApi({ 'GET /auth/yo': errorApi(401, 'Inicia sesión para usar el panel') })
    app()
    expect(await screen.findByRole('heading', { name: 'Ingresar al panel' })).toBeInTheDocument()
    expect(screen.queryByText('Panel privado')).not.toBeInTheDocument()
  })

  it('con usuario y contraseña correctos entra a la página que pidió', async () => {
    const api = mockApi({
      'GET /auth/yo': errorApi(401, 'Inicia sesión para usar el panel'),
      'POST /auth/login': { usuario: 'enfermera1', nombre: 'Lic. de turno', login: true },
    })
    app()
    fireEvent.change(await screen.findByLabelText('Usuario'), { target: { value: 'enfermera1' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'una-clave-larga' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Panel privado')).toBeInTheDocument()
    expect(JSON.parse(String(api.pedidosA('POST', '/auth/login')[0].body))).toEqual({
      usuario: 'enfermera1',
      clave: 'una-clave-larga',
    })
  })

  it('con contraseña incorrecta muestra el error y borra la contraseña', async () => {
    mockApi({
      'GET /auth/yo': errorApi(401, 'Inicia sesión para usar el panel'),
      'POST /auth/login': errorApi(401, 'Usuario o contraseña incorrectos'),
    })
    app()
    fireEvent.change(await screen.findByLabelText('Usuario'), { target: { value: 'enfermera1' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'mal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos')
    expect(screen.getByLabelText('Contraseña')).toHaveValue('')
  })

  it('con sesión abierta entra directo', async () => {
    mockApi({ 'GET /auth/yo': { usuario: 'enfermera1', nombre: 'Lic. de turno', login: true } })
    app()
    expect(await screen.findByText('Panel privado')).toBeInTheDocument()
  })
})
