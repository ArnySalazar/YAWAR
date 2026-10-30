/**
 * Adaptador de Administración: el contrato del padrón (el mismo de POST /padron), la plantilla CSV,
 * la lectura de los errores de la API y los datos de la lista imprimible. Las llamadas a la API
 * están en @/api/yawar y @/api/queries (compartidas con las demás pantallas).
 */
import { ApiError } from '@/api/http'
import type { FilaLista, Salud } from '@/api/yawar'
import { capitalizar, listaMotivos } from '@/lib/dominio'
import { diaDe, etiquetaSemanaLarga, semanaIso } from '@/lib/semana'
import { toCsvField } from './lib/csv'
import type { ContractColumn, PrintableRow, ServerClock, UploadFailure, ValidationIssue } from './types'

/**
 * Columnas del padrón en el orden de COLUMNAS_PADRON (api/servicios.py), más la opcional
 * `acepta_mensajes`. Si la API cambia sus columnas, se corrige aquí y en la prueba.
 */
export const REGISTRY_CONTRACT: ContractColumn[] = [
  {
    name: 'id_nino',
    description: 'Código anonimizado del niño (ej. N0001). Sin DNI ni nombres.',
    type: 'Texto',
    required: true,
    example: 'N0001',
  },
  {
    name: 'establecimiento_id',
    description: 'Código del establecimiento (ej. EESS01). Un mismo archivo puede traer varios.',
    type: 'Texto',
    required: true,
    example: 'EESS01',
  },
  {
    name: 'alias_cuidador',
    description: 'Alias del cuidador, sin nombres reales (ej. «Mamá de N0001»).',
    type: 'Texto',
    required: true,
    example: 'Mamá de N0001',
  },
  {
    name: 'telefono',
    description: 'Celular de WhatsApp del cuidador: 9 dígitos, con o sin +51 (se envía con +51).',
    type: 'Texto',
    required: true,
    example: '+51000000001',
  },
  {
    name: 'edad_meses',
    description: 'Edad en meses cumplidos: número entero de 6 a 35.',
    type: 'Entero',
    required: true,
    example: '8',
  },
  {
    name: 'area',
    description: 'Opcional (el modelo no la usa). «urbano» o «rural».',
    type: 'Texto',
    required: false,
    example: 'urbano',
  },
  {
    name: 'region',
    description: 'Opcional (el modelo no la usa). Región del domicilio (ej. Lima, Cusco, Puno).',
    type: 'Texto',
    required: false,
    example: 'Lima',
  },
  {
    name: 'altitud_msnm',
    description: 'Opcional (el modelo no la usa). Altitud en metros sobre el nivel del mar: número entero (ej. 150).',
    type: 'Entero',
    required: false,
    example: '150',
  },
  {
    name: 'controles_cred',
    description: 'Total de controles CRED desde el nacimiento, según la libreta: número entero, 0 o más.',
    type: 'Entero',
    required: true,
    example: '3',
  },
  {
    name: 'fecha_entrega_hierro',
    description: 'Última entrega de hierro, AAAA-MM-DD. Puede quedar vacía si aún no recibió.',
    type: 'Fecha ISO',
    required: true,
    example: '2026-10-01',
  },
  {
    name: 'presentacion_hierro',
    description: 'Opcional. Presentación del hierro según la libreta: gotas, jarabe o polvo (varias con «+», ej. gotas+polvo).',
    type: 'Texto',
    required: false,
    example: 'gotas',
  },
  {
    name: 'en_tratamiento_anemia',
    description: 'Opcional. 1 si el niño está en tratamiento de anemia (no solo prevención); 0 si no. Va primero dentro de su grupo.',
    type: '1 o 0',
    required: false,
    example: '0',
  },
  {
    name: 'nombre_nino',
    description: 'Opcional. Apodo del niño que autoriza el cuidador, para el mensaje semanal. Nunca el nombre completo.',
    type: 'Texto',
    required: false,
    example: 'Mateo',
  },
  {
    name: 'acepta_mensajes',
    description:
      'Opcional. 1 = acepta WhatsApp; 0 = no. Si falta la columna, la API pone 1 a todos y anula las BAJA pedidas por WhatsApp.',
    type: '1 o 0',
    required: false,
    example: '1',
  },
]

/** Las columnas obligatorias, en el orden de la API. */
export const REQUIRED_COLUMN_NAMES = REGISTRY_CONTRACT.filter((column) => column.required).map((column) => column.name)

/**
 * Plantilla CSV generada en el navegador a partir del contrato: cabecera exacta + una fila de
 * ejemplo con el establecimiento elegido.
 */
export function buildRegistryTemplate(establecimiento: string, columns: ContractColumn[] = REGISTRY_CONTRACT): string {
  const header = columns.map((column) => toCsvField(column.name)).join(',')
  const example = columns
    .map((column) => toCsvField(column.name === 'establecimiento_id' ? establecimiento : column.example))
    .join(',')
  return `${header}\r\n${example}\r\n`
}

// ---------- Errores de POST /padron ----------

const PREFIJO_FILAS = 'El padrón tiene errores y no se cargó:'

interface RowErrorRule {
  pattern: RegExp
  column: string | null
  message: (match: RegExpExecArray) => string
}

/**
 * Mensajes de fila que produce la API (algunos en inglés, de Python) y su traducción. Si el mensaje
 * no dice la columna (por ejemplo, un entero mal escrito puede ser edad, altitud o controles), la
 * columna queda en null.
 */
const ROW_ERRORS: RowErrorRule[] = [
  {
    pattern: /^edad_meses fuera de rango$/,
    column: 'edad_meses',
    message: () => 'La edad está fuera del rango que acepta la API (0 a 59 meses).',
  },
  {
    pattern: /^area debe ser urbano o rural$/,
    column: 'area',
    message: () => 'El área debe ser «urbano» o «rural».',
  },
  {
    pattern: /^telefono inválido$/,
    column: 'telefono',
    message: () => 'El teléfono no es válido: debe tener al menos 9 dígitos.',
  },
  {
    pattern: /^invalid literal for int\(\) with base 10: '(.*)'$/,
    column: null,
    message: (m) => `El valor «${m[1]}» no es un número entero.`,
  },
  {
    pattern: /^cannot convert float NaN to integer$/,
    column: null,
    message: () => 'Hay un campo numérico vacío (edad, altitud o controles).',
  },
  {
    pattern: /out of range for month|month must be in|datetime string|Unknown string format|does not contain a date|out of bounds|doesn't match format|time data/i,
    column: 'fecha_entrega_hierro',
    message: () => 'La fecha de entrega de hierro no es válida (use AAAA-MM-DD).',
  },
]

function translateRowError(text: string): { column: string | null; message: string } {
  for (const rule of ROW_ERRORS) {
    const match = rule.pattern.exec(text)
    if (match) return { column: rule.column, message: rule.message(match) }
  }
  return { column: null, message: text }
}

/** "['region', 'area']" (lista de Python) -> ["region", "area"]. */
function parsePythonList(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

/**
 * Convierte el texto de `detail` de un 400 de POST /padron en la lista {fila, columna, mensaje}.
 * La API numera las filas del CSV limpio que se le envió; con `rowMap` se traducen a las filas del
 * archivo original (pueden diferir si el archivo tenía líneas vacías).
 */
export function parseRegistryErrorDetail(detail: string, rowMap: number[] = []): ValidationIssue[] {
  const text = detail.trim()

  if (text.startsWith(PREFIJO_FILAS)) {
    // "fila 4: …; fila 9: …": se corta solo antes de cada "fila N:", por si un mensaje trae "; ".
    return text
      .slice(PREFIJO_FILAS.length)
      .split(/;\s*(?=fila \d+:)/)
      .map((part): ValidationIssue => {
        const match = /^\s*fila (\d+):\s*([\s\S]*)$/.exec(part)
        if (!match) return { row: null, column: null, message: part.trim() }
        const apiRow = Number(match[1])
        return { row: rowMap[apiRow - 2] ?? apiRow, ...translateRowError(match[2].trim()) }
      })
  }

  const missing = /^Al padrón le faltan columnas:\s*\[(.*)\]$/.exec(text)
  if (missing) {
    return parsePythonList(missing[1]).map((name) => ({
      row: 1,
      column: name,
      message: `Falta la columna obligatoria «${name}».`,
    }))
  }

  const repeated = /^id_nino repetidos:\s*\[(.*)\]$/.exec(text)
  if (repeated) {
    return parsePythonList(repeated[1]).map((id) => ({
      row: null,
      column: 'id_nino',
      message: `El código «${id}» está repetido en el archivo.`,
    }))
  }

  const unreadable = /^No se pudo leer el CSV:\s*([\s\S]*)$/.exec(text)
  if (unreadable) {
    return [
      {
        row: null,
        column: null,
        message: `La API no pudo leer el archivo (${unreadable[1]}). Guárdelo como «CSV UTF-8» separado por comas.`,
      },
    ]
  }

  return [{ row: null, column: null, message: text }]
}

/**
 * Por qué falló POST /padron. 400 = el padrón tiene errores (se listan por fila); 422 = la API no
 * recibió el archivo; lo demás (sin conexión, 401, 500) es un problema general.
 */
export function getUploadFailure(error: unknown, rowMap: number[] = []): UploadFailure {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      const body = error.body
      const detail =
        typeof body === 'object' && body && 'detail' in body && typeof body.detail === 'string' ? body.detail : error.message
      return { kind: 'validation', issues: parseRegistryErrorDetail(detail, rowMap) }
    }
    if (error.status === 422) {
      return {
        kind: 'general',
        message: 'La API no recibió el archivo del padrón. Vuelva a seleccionarlo e inténtelo otra vez.',
      }
    }
    return { kind: 'general', message: error.message }
  }
  return { kind: 'general', message: error instanceof Error ? error.message : 'No se pudo cargar el padrón.' }
}

// ---------- Exportación y respaldo físico ----------

/** Lista de la semana para imprimir: sin teléfonos, con el motivo de seguimiento y los motivos del modelo. */
export function buildPrintableList(lista: FilaLista[]): PrintableRow[] {
  return [...lista]
    .sort((a, b) => a.orden - b.orden)
    .map((fila) => ({
      order: fila.orden,
      code: fila.id_nino,
      caregiverAlias: fila.alias_cuidador,
      ageMonths: fila.edad_meses,
      action: fila.accion === 'visita' ? 'Visita' : 'WhatsApp',
      reasons: [fila.seguimiento, ...listaMotivos(fila.motivos)]
        .filter((texto): texto is string => Boolean(texto))
        .map(capitalizar)
        .join(' · '),
    }))
}

// ---------- Configuración de conexión ----------

/** Hora del servidor (ya viene en hora de Lima, sin zona): se muestra tal cual, sin convertir. */
export function describeServerClock(salud: Pick<Salud, 'hora_local'>): ServerClock {
  const dia = diaDe(salud.hora_local)
  const [anio, mes, d] = dia.split('-')
  return {
    date: `${d}/${mes}/${anio}`,
    time: salud.hora_local.slice(11, 16),
    week: etiquetaSemanaLarga(semanaIso(dia)),
  }
}
