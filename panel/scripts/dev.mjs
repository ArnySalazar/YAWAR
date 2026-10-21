// npm run dev: levanta la API (si no está encendida) y el panel con un solo comando.
// La API se corre con el Python del .venv del proyecto; Ctrl+C apaga las dos cosas.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const panel = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const raiz = resolve(panel, '..')
const PUERTO_API = process.env.API_PUERTO || '8000'
const URL_API = `http://localhost:${PUERTO_API}`
const hijos = []

function pythonDelProyecto() {
  const opciones = [join(raiz, '.venv', 'Scripts', 'python.exe'), join(raiz, '.venv', 'bin', 'python')]
  return opciones.find(existsSync) || (process.platform === 'win32' ? 'python' : 'python3')
}

async function apiEncendida() {
  try {
    return (await fetch(`${URL_API}/salud`)).ok
  } catch {
    return false
  }
}

function apagar(codigo = 0) {
  for (const h of hijos) if (h.exitCode === null) h.kill()
  process.exit(codigo)
}

function lanzar(nombre, comando, args, cwd, env = process.env) {
  const hijo = spawn(comando, args, { cwd, env, stdio: 'inherit' })
  hijo.on('error', (e) => {
    console.error(`[${nombre}] no se pudo iniciar: ${e.message}`)
    apagar(1)
  })
  hijo.on('exit', (codigo) => {
    console.log(`[${nombre}] se detuvo (código ${codigo}).`)
    apagar(codigo ?? 0)
  })
  hijos.push(hijo)
}

process.on('SIGINT', () => apagar(0))
process.on('SIGTERM', () => apagar(0))

if (!existsSync(join(panel, 'node_modules', 'vite'))) {
  console.error('Faltan las dependencias del panel. Ejecuta primero:  npm install')
  process.exit(1)
}

if (await apiEncendida()) {
  console.log(`[api] ya estaba encendida en ${URL_API}; se usa esa.`)
} else {
  const python = pythonDelProyecto()
  console.log(`[api] levantando con ${python} en ${URL_API} ...`)
  lanzar('api', python, ['-m', 'uvicorn', 'api.main:app', '--port', PUERTO_API], raiz)
  // Esperar a que responda antes de abrir el panel (máximo 20 segundos)
  for (let i = 0; i < 40 && !(await apiEncendida()); i++) await new Promise((r) => setTimeout(r, 500))
  if (!(await apiEncendida())) console.warn('[api] todavía no responde; el panel mostrará "Reintentar".')
}

lanzar('panel', process.execPath, [join(panel, 'node_modules', 'vite', 'bin', 'vite.js')], panel,
  { ...process.env, API_DESTINO: process.env.API_DESTINO || URL_API })
