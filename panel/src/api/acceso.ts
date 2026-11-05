/** Inicio de sesión del panel. La sesión vive en una cookie HttpOnly que pone la API. */
import { http } from './http'

export interface UsuarioPanel {
  usuario: string | null
  nombre: string
  /** false solo en desarrollo, cuando la API corre sin PANEL_LOGIN ni API_CLAVE. */
  login: boolean
}

export const accesoApi = {
  yo: () => http.get<UsuarioPanel>('/auth/yo', { sinAvisoDeSesion: true }),
  entrar: (usuario: string, clave: string) =>
    http.post<UsuarioPanel>('/auth/login', { usuario, clave }, { sinAvisoDeSesion: true }),
  salir: () => http.post<{ ok: boolean }>('/auth/salir', undefined, { sinAvisoDeSesion: true }),
}
