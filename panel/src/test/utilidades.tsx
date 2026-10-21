/**
 * Ayudas para las pruebas: una API simulada (reemplaza fetch y responde con el formato real) y un
 * render con los mismos proveedores que la app (TanStack Query, establecimiento y router).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { EstablecimientoProvider } from '@/features/establecimiento/EstablecimientoProvider'
import { HISTORIALES, INDICADORES, LISTA, SALUD } from './datos'

export interface PedidoApi {
  metodo: string
  /** Ruta de la API sin el prefijo /api, ej. "/establecimientos/EESS01/lista". */
  ruta: string
  params: URLSearchParams
  body: BodyInit | null | undefined
}

type Manejador = (pedido: PedidoApi) => unknown

function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })
}

/** Respuesta de error con el formato de FastAPI: {"detail": "..."}. */
export function errorApi(status: number, detail: unknown) {
  return json({ detail }, status)
}

/** Rutas de una API sana con los datos de ejemplo. La clave es "MÉTODO /ruta". */
export function rutasBase(): Record<string, unknown> {
  return {
    'GET /salud': SALUD,
    'POST /establecimientos/EESS01/lista': LISTA,
    'GET /establecimientos/EESS01/indicadores': INDICADORES,
    ...Object.fromEntries(Object.entries(HISTORIALES).map(([id, h]) => [`GET /ninos/${id}/historial`, h])),
  }
}

/**
 * Reemplaza fetch por una API simulada. Cada ruta puede ser un valor (se responde como JSON con 200),
 * una Response o una función que recibe el pedido. Las rutas no definidas responden 404.
 */
export function mockApi(extra: Record<string, unknown | Manejador> = {}) {
  const rutas = { ...rutasBase(), ...extra }
  const pedidos: PedidoApi[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const pedido: PedidoApi = {
      metodo: init?.method ?? 'GET',
      ruta: url.pathname.replace(/^\/api/, ''),
      params: url.searchParams,
      body: init?.body,
    }
    pedidos.push(pedido)
    const manejador = rutas[`${pedido.metodo} ${pedido.ruta}`]
    if (manejador === undefined) return errorApi(404, 'Not Found')
    const respuesta = typeof manejador === 'function' ? await (manejador as Manejador)(pedido) : manejador
    return respuesta instanceof Response ? respuesta : json(respuesta)
  })
  vi.stubGlobal('fetch', fetchMock)
  return {
    pedidos,
    /** Pedidos hechos a una ruta, ej. pedidosA('POST', '/padron'). */
    pedidosA: (metodo: string, ruta: string) => pedidos.filter((p) => p.metodo === metodo && p.ruta === ruta),
  }
}

/** Renderiza una pantalla con los proveedores de la app. `patron` es la ruta del router (ej. "/ninos/:childId"). */
export function renderizar(
  ui: ReactElement,
  { ruta = '/', patron = '*', establecimiento = 'EESS01' }: { ruta?: string; patron?: string; establecimiento?: string } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <EstablecimientoProvider inicial={establecimiento}>
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route path={patron} element={ui} />
          </Routes>
        </MemoryRouter>
      </EstablecimientoProvider>
    </QueryClientProvider>,
  )
}
