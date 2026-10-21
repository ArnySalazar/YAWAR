// npm run evidencia: corre las pruebas de pantallas (Vitest) y la prueba contra la API real, y guarda
// un informe con fecha y hora de Lima en docs/panel/evidencias/pruebas/ para la bitácora.
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { probarApi } from './probar-api.mjs'

const panel = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const raiz = resolve(panel, '..')
const carpeta = join(raiz, 'docs', 'panel', 'evidencias', 'pruebas')

// "2026-10-18 15:42" en hora de Lima, sin depender de la zona horaria de la computadora
const ahora = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short',
}).format(new Date())
const [fecha, hora] = ahora.split(' ')

function git(...args) {
  const r = spawnSync('git', args, { cwd: raiz, encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : '¿?'
}

const sinColor = (texto) => texto.replace(/\x1b\[[0-9;]*m/g, '')

console.log('1/2 Pruebas de pantallas (Vitest)...')
// --reporter=verbose: el informe lista cada prueba por su nombre, no solo el total
const vitest = spawnSync(process.execPath, [join(panel, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--reporter=verbose'], {
  cwd: panel, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
})
const salidaVitest = sinColor(`${vitest.stdout}${vitest.stderr}`).trim()
const vitestOk = vitest.status === 0

console.log('2/2 Prueba contra la API real...')
const { base, pasos } = await probarApi()
const apiOk = pasos.every((p) => p.ok)
const correctos = pasos.filter((p) => p.ok && !p.omitido).length
const omitidos = pasos.filter((p) => p.omitido).length
const resumenApi = `${correctos} de ${pasos.length - omitidos} pasos correctos${omitidos ? `, ${omitidos} omitido(s)` : ''}`
const icono = (p) => (p.omitido ? '⏭️ omitido' : p.ok ? '✅' : '❌')

const cambiosSinGuardar = git('status', '--porcelain') !== ''
const informe = `# Evidencia de pruebas del panel · ${fecha} ${hora} (hora de Lima)

| Dato | Valor |
|---|---|
| Rama y commit | \`${git('branch', '--show-current')}\` @ \`${git('rev-parse', '--short', 'HEAD')}\`${cambiosSinGuardar ? ' (con cambios aún sin commit)' : ''} |
| Node | ${process.version} |
| Pruebas de pantallas (Vitest) | ${vitestOk ? '✅ todas pasaron' : '❌ hubo fallos'} |
| Prueba contra la API real | ${apiOk ? '✅' : '❌'} ${resumenApi} |

## 1. Pruebas del panel: 7 pantallas y capa común (Vitest, API simulada)

\`\`\`text
${salidaVitest}
\`\`\`

## 2. Prueba contra la API real en modo prueba (${base})

| # | Pantalla | Qué se comprobó | Resultado | Detalle |
|---|---|---|---|---|
${pasos.map((p, i) => `| ${i + 1} | ${p.pantalla} | ${p.nombre} | ${icono(p)} | ${String(p.detalle).replaceAll('|', '/')} |`).join('\n')}
`

mkdirSync(carpeta, { recursive: true })
const archivo = join(carpeta, `${fecha}_${hora.replace(':', '')}_pruebas.md`)
writeFileSync(archivo, informe, 'utf8')

const enlace = relative(join(raiz, 'docs', 'panel'), archivo).replaceAll('\\', '/')
console.log(`\nInforme guardado en ${relative(raiz, archivo)}`)
console.log('Fila sugerida para docs/panel/BITACORA.md:')
console.log(`| ${fecha} | Pruebas | Vitest ${vitestOk ? 'OK' : 'con fallos'}; API real: ${resumenApi} | npm run evidencia | [informe](${enlace}) | ${git('rev-parse', '--short', 'HEAD')} |`)
process.exit(vitestOk && apiOk ? 0 : 1)
