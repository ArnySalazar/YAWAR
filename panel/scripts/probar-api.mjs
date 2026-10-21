// npm run probar-api: comprueba, contra la API real encendida, cada ruta que usa el panel.
// Solo corre en MODO_PRUEBA=1 (no manda WhatsApp de verdad). Carga el padrón de ejemplo y registra
// recordatorios de la semana: después, `python -m scripts.reiniciar_demo` deja la base limpia.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const BASE = process.env.API_DESTINO || 'http://localhost:8000'
const PADRON = join(raiz, 'datos', 'padron_ejemplo.csv')
const CAMPOS_LISTA = ['orden', 'id_nino', 'alias_cuidador', 'edad_meses', 'puntaje', 'motivos',
  'nivel', 'seguimiento', 'accion', 'regla']

// Misma clave que usa la API (API_CLAVE del .env de la raíz); vacía = API sin protección
function claveDelEnv() {
  const env = join(raiz, '.env')
  if (!existsSync(env)) return ''
  const linea = readFileSync(env, 'utf8').split(/\r?\n/).find((l) => l.trim().startsWith('API_CLAVE='))
  return linea ? linea.split('=').slice(1).join('=').trim() : ''
}

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje)
}

// Un paso que no aplica en esta configuración: no cuenta como correcto ni como fallo
class Omitido extends Error {}

export async function probarApi() {
  const clave = claveDelEnv()
  const pedir = (ruta, opciones = {}) => fetch(BASE + ruta,
    { ...opciones, headers: { ...opciones.headers, ...(clave ? { 'X-API-Key': clave } : {}) } })
  const pasos = []

  async function paso(pantalla, nombre, prueba) {
    try {
      pasos.push({ pantalla, nombre, ok: true, detalle: await prueba() })
    } catch (e) {
      if (e instanceof Omitido) pasos.push({ pantalla, nombre, ok: true, omitido: true, detalle: e.message })
      else pasos.push({ pantalla, nombre, ok: false, detalle: e.cause?.code || e.message })
    }
  }

  await paso('Marco', 'La API responde en modo prueba (GET /salud)', async () => {
    const s = await (await fetch(`${BASE}/salud`)).json()
    exigir(s.modo_prueba === true, 'La API NO está en MODO_PRUEBA=1: por seguridad no se sigue probando')
    return `hora_local ${s.hora_local}`
  })
  if (!pasos[0].ok) return { base: BASE, pasos }

  await paso('Padrón', 'Carga el padrón de ejemplo (POST /padron)', async () => {
    const datos = new FormData()
    datos.append('archivo', new Blob([readFileSync(PADRON)], { type: 'text/csv' }), 'padron_ejemplo.csv')
    const r = await pedir('/padron', { method: 'POST', body: datos })
    const cuerpo = await r.json()
    exigir(r.status === 200 && cuerpo.cargados === 10, `esperaba 10 cargados, llegó ${r.status} ${JSON.stringify(cuerpo)}`)
    return '10 niños cargados'
  })

  await paso('Padrón', 'Rechaza un padrón con una fila mala y dice cuál (POST /padron)', async () => {
    const malo = readFileSync(PADRON, 'utf8').replace('Papá de N0003,+51000000003,22,', 'Papá de N0003,+51000000003,veinte,')
    const datos = new FormData()
    datos.append('archivo', new Blob([malo], { type: 'text/csv' }), 'padron_malo.csv')
    const r = await pedir('/padron', { method: 'POST', body: datos })
    const { detail } = await r.json()
    exigir(r.status === 400 && /fila 4/.test(detail), `esperaba 400 con "fila 4", llegó ${r.status} ${detail}`)
    return detail
  })

  await paso('Lista', 'Genera la lista con capacidad 2 (POST /establecimientos/EESS01/lista)', async () => {
    const r = await pedir('/establecimientos/EESS01/lista?capacidad=2', { method: 'POST' })
    const lista = await r.json()
    exigir(r.status === 200 && lista.length === 4, `esperaba 4 niños, llegó ${r.status}`)
    const faltan = CAMPOS_LISTA.filter((c) => !(c in lista[0]))
    exigir(faltan.length === 0, `a cada fila le faltan campos: ${faltan}`)
    exigir(lista.filter((n) => n.accion === 'visita').length === 2, 'esperaba 2 niños con visita')
    return `orden: ${lista.map((n) => `${n.id_nino} (${n.accion})`).join(', ')}`
  })

  await paso('Lista', 'Envía los recordatorios (POST /establecimientos/EESS01/recordatorios)', async () => {
    const r = await pedir('/establecimientos/EESS01/recordatorios', { method: 'POST' })
    const res = await r.json()
    exigir(r.status === 200 && ['enviados', 'fallidos', 'omitidos_por_baja'].every((c) => typeof res[c] === 'number'),
      `respuesta inesperada: ${r.status} ${JSON.stringify(res)}`)
    return `enviados ${res.enviados}, fallidos ${res.fallidos}, dados de baja ${res.omitidos_por_baja}`
  })

  await paso('Ficha', 'Trae el historial de N0001 (GET /ninos/N0001/historial)', async () => {
    const r = await pedir('/ninos/N0001/historial')
    const semanas = await r.json()
    exigir(r.status === 200 && semanas.length > 0, `esperaba al menos una semana, llegó ${r.status}`)
    exigir(['semana', 'accion', 'puntaje', 'respuesta', 'razon'].every((c) => c in semanas[0]), 'faltan campos')
    return `${semanas.length} semana(s); última: ${semanas[0].semana}, respuesta ${semanas[0].respuesta}`
  })

  await paso('Indicadores', 'Trae los indicadores (GET /establecimientos/EESS01/indicadores)', async () => {
    const r = await pedir('/establecimientos/EESS01/indicadores')
    const d = await r.json()
    exigir(r.status === 200 && Array.isArray(d.serie) && d.serie.length > 0 && 'meta_alerta' in d,
      `respuesta inesperada: ${r.status}`)
    const actual = d.serie.at(-1)
    return `${actual.semana}: enviados ${actual.enviados}, respondidos ${actual.respondidos}; meta-alerta: ${d.meta_alerta ?? 'ninguna'}`
  })

  await paso('Imprimir', 'Descarga la lista en CSV (GET /establecimientos/EESS01/lista.csv)', async () => {
    const r = await pedir('/establecimientos/EESS01/lista.csv?capacidad=2')
    const encabezado = (await r.text()).split(/\r?\n/)[0]
    exigir(r.status === 200 && encabezado === 'orden,id_nino,alias_cuidador,edad_meses,accion,motivos,regla',
      `encabezado inesperado: ${encabezado}`)
    return encabezado
  })

  await paso('Marco', 'Sin clave, la API rechaza al panel (401)', async () => {
    if (!clave) throw new Omitido('API_CLAVE está vacía en el .env (modo desarrollo)')
    const r = await fetch(`${BASE}/establecimientos/EESS01/indicadores`)
    exigir(r.status === 401, `esperaba 401, llegó ${r.status}`)
    return '401 sin clave'
  })

  return { base: BASE, pasos }
}

// Ejecutado directamente (npm run probar-api): muestra el resultado y sale con 1 si algo falló
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { base, pasos } = await probarApi()
  console.log(`Prueba del panel contra la API real (${base})\n`)
  for (const p of pasos) {
    console.log(`${p.omitido ? '-' : p.ok ? '✔' : '✘'} [${p.pantalla}] ${p.nombre}\n    ${p.detalle}`)
  }
  const fallos = pasos.filter((p) => !p.ok).length
  const omitidos = pasos.filter((p) => p.omitido).length
  console.log(`\n${pasos.length - fallos - omitidos} de ${pasos.length - omitidos} pasos correctos`
    + `${omitidos ? ` (${omitidos} omitido)` : ''}.`)
  console.log('Para dejar la base limpia: python -m scripts.reiniciar_demo (desde la raíz del proyecto)')
  process.exit(fallos ? 1 : 0)
}
