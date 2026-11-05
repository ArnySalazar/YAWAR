import { env } from '@/config/env'

/** Error de la API. status = 0 cuando el servidor no respondió. */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export const SIN_CONEXION = 'No se pudo conectar con el servidor de YAWAR. Revisa que la API esté encendida.'

/** Evento que avisa que la sesión no existe o venció (401); lo escucha SesionProvider. */
export const EVENTO_SIN_SESION = 'yawar:sin-sesion'

type QueryParams = Record<string, string | number | boolean | null | undefined>

interface RequestOptions {
  params?: QueryParams
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
  /** No avisar a SesionProvider si responde 401 (lo usa la pantalla de ingreso). */
  sinAvisoDeSesion?: boolean
}

function buildUrl(path: string, params?: QueryParams) {
  const url = new URL(`${env.apiUrl}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/** FastAPI responde {"detail": "texto"} o, si rechaza un parámetro (422), {"detail": [{msg, loc…}]}. */
function mensajeDeError(status: number, payload: unknown) {
  const detail = typeof payload === 'object' && payload && 'detail' in payload ? payload.detail : null
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => (typeof d === 'object' && d && 'msg' in d ? String(d.msg) : String(d))).join('; ')
  }
  // Sin detalle: con el proxy de Vite, la API apagada llega como 5xx sin cuerpo
  return status >= 500 ? SIN_CONEXION : `Error ${status}`
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, headers, signal, sinAvisoDeSesion } = options
  const isFormData = body instanceof FormData

  let response: Response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      signal,
      // La sesión viaja en una cookie HttpOnly que el código del panel no puede leer
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, SIN_CONEXION)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const payload: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text()

  if (!response.ok) {
    if (response.status === 401 && !sinAvisoDeSesion) window.dispatchEvent(new Event(EVENTO_SIN_SESION))
    throw new ApiError(response.status, mensajeDeError(response.status, payload), payload)
  }

  return payload as T
}

export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
}
