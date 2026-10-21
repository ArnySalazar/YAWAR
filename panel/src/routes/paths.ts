export const paths = {
  inicio: '/',
  planificacion: '/planificacion',
  ninos: '/ninos',
  fichaNino: (id: string) => `/ninos/${encodeURIComponent(id)}`,
  comunicacion: '/comunicacion',
  indicadores: '/indicadores',
  administracion: '/administracion',
} as const
