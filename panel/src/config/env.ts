/** Configuración leída de las variables de entorno (ver .env.ejemplo). */
export const env = {
  /** Prefijo de la API. En desarrollo, Vite reenvía /api a http://localhost:8000 (proxy). */
  apiUrl: (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, ''),
  /** Establecimientos del selector. La API todavía no tiene una ruta que los liste. */
  establecimientos: (import.meta.env.VITE_ESTABLECIMIENTOS ?? 'EESS01,EESS02,EESS03')
    .split(',')
    .map((id: string) => id.trim())
    .filter(Boolean),
} as const
