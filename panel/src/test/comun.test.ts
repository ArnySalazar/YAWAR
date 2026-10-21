// Pruebas de la capa común: cliente HTTP, semanas ISO y traducción de códigos.
import { describe, expect, it, vi } from 'vitest'
import { EVENTO_FALTA_CLAVE, guardarClave, SIN_CONEXION } from '@/api/http'
import { yawarApi } from '@/api/yawar'
import { grupoEdad, parentesco, senalDeFila, textoRespuesta, ultimaRespuesta } from '@/lib/dominio'
import { etiquetaSemanaLarga, rangoSemana, semanaAnterior, semanaIso } from '@/lib/semana'
import { HISTORIALES } from './datos'
import { errorApi, mockApi } from './utilidades'

describe('Cliente de la API', () => {
  it('llama con el prefijo /api y envía la clave guardada como X-API-Key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    guardarClave('secreta')
    await yawarApi.historial('N0001')
    const [url, init] = fetchMock.mock.calls[0]
    expect(new URL(url).pathname).toBe('/api/ninos/N0001/historial')
    expect(init.headers['X-API-Key']).toBe('secreta')
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('pide la lista con la capacidad como parámetro', async () => {
    const api = mockApi()
    await yawarApi.generarLista('EESS01', 3)
    const [pedido] = api.pedidosA('POST', '/establecimientos/EESS01/lista')
    expect(pedido.params.get('capacidad')).toBe('3')
  })

  it('muestra el texto de "detail" que manda la API', async () => {
    mockApi({ 'POST /padron': errorApi(400, "Al padrón le faltan columnas: ['region']") })
    await expect(yawarApi.cargarPadron(new Blob(['x']))).rejects.toMatchObject({
      status: 400,
      message: "Al padrón le faltan columnas: ['region']",
    })
  })

  it('convierte el 422 de FastAPI (lista de errores) en un mensaje legible', async () => {
    mockApi({
      'POST /establecimientos/EESS01/lista': errorApi(422, [{ msg: 'Input should be greater than or equal to 0' }]),
    })
    await expect(yawarApi.generarLista('EESS01', -1)).rejects.toMatchObject({
      status: 422,
      message: 'Input should be greater than or equal to 0',
    })
  })

  it('avisa con un mensaje claro si el servidor no responde (o el proxy devuelve 500 sin cuerpo)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(yawarApi.salud()).rejects.toMatchObject({ status: 0, message: SIN_CONEXION })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    await expect(yawarApi.salud()).rejects.toMatchObject({ status: 500, message: SIN_CONEXION })
  })

  it('pide la clave en pantalla cuando la API responde 401', async () => {
    mockApi({ 'GET /salud': errorApi(401, 'Falta la clave de acceso o es incorrecta') })
    const aviso = vi.fn()
    window.addEventListener(EVENTO_FALTA_CLAVE, aviso)
    await expect(yawarApi.salud()).rejects.toMatchObject({ status: 401 })
    window.removeEventListener(EVENTO_FALTA_CLAVE, aviso)
    expect(aviso).toHaveBeenCalledOnce()
  })
})

describe('Semanas ISO (las mismas de la API)', () => {
  it('calcula la semana igual que semana_iso() de la API', () => {
    expect(semanaIso('2026-10-21')).toBe('2026-W43')
    expect(semanaIso('2026-10-18')).toBe('2026-W42') // domingo: todavía semana 42
    expect(semanaIso('2026-01-01')).toBe('2026-W01')
    expect(semanaIso('2027-01-01')).toBe('2026-W53')
  })

  it('da el rango de lunes a domingo, la semana anterior y la etiqueta', () => {
    expect(rangoSemana('2026-W43')).toEqual({ inicio: '2026-10-19', fin: '2026-10-25' })
    expect(semanaAnterior('2026-W01')).toBe('2025-W52')
    expect(etiquetaSemanaLarga('2026-W43')).toBe('Semana 43 · 19 – 25 oct 2026')
  })
})

describe('Traducción de códigos de la API', () => {
  it('lee la señal de la lista: R1 problema / no le di, R2 sin respuesta', () => {
    expect(senalDeFila({ nivel: 0, seguimiento: 'la semana pasada respondió: Tuve un problema' })).toBe('problema')
    expect(senalDeFila({ nivel: 0, seguimiento: 'la semana pasada respondió: No le di' })).toBe('no_le_di')
    expect(senalDeFila({ nivel: 1, seguimiento: 'sin respuesta hace 7 días o más' })).toBe('sin_respuesta')
    expect(senalDeFila({ nivel: 2, seguimiento: null })).toBeNull()
  })

  it('arma textos, parentesco, grupo de edad y última respuesta', () => {
    expect(textoRespuesta('problema', 'estrenimiento')).toBe('Tuve un problema: Estreñimiento')
    expect(parentesco('Papá de N0003')).toBe('Papá')
    expect([grupoEdad(8), grupoEdad(14), grupoEdad(30)]).toEqual(['6-11', '12-23', '24-35'])
    expect(ultimaRespuesta(HISTORIALES.N0001)).toMatchObject({ semana: '2026-W42', respuesta: 'no_le_di' })
    expect(ultimaRespuesta(HISTORIALES.N0002)).toBeNull()
  })
})
