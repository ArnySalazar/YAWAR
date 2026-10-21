// Pantalla "Administración" contra la API simulada (mismo formato que la real).
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, SIN_CONEXION } from '@/api/http'
import { LISTA } from '@/test/datos'
import { errorApi, mockApi, renderizar } from '@/test/utilidades'
import AdministracionPage from './AdministracionPage'
import {
  REGISTRY_CONTRACT,
  REQUIRED_COLUMN_NAMES,
  buildPrintableList,
  buildRegistryTemplate,
  describeServerClock,
  getUploadFailure,
  parseRegistryErrorDetail,
} from './api'
import { decodeCsvBytes } from './lib/csv'
import { LAST_UPLOAD_KEY } from './lib/lastUpload'
import { maskPhone, validateRegistryCsv, validateRegistryFile } from './lib/validateRegistry'

/** COLUMNAS_PADRON de api/servicios.py, copiadas a mano: si la API cambia sus columnas, esta prueba avisa. */
const COLUMNAS_API = [
  'id_nino',
  'establecimiento_id',
  'alias_cuidador',
  'telefono',
  'edad_meses',
  'area',
  'region',
  'altitud_msnm',
  'controles_cred',
  'fecha_entrega_hierro',
]
const CABECERA = COLUMNAS_API.join(',')

/** Fila del padrón de ejemplo (datos/padron_ejemplo.csv) con cambios puntuales. */
function fila(id: string, cambios: Record<string, string> = {}, separador = ',') {
  const valores: Record<string, string> = {
    id_nino: id,
    establecimiento_id: 'EESS01',
    alias_cuidador: `Mamá de ${id}`,
    telefono: '+51000000001',
    edad_meses: '8',
    area: 'urbano',
    region: 'Lima',
    altitud_msnm: '150',
    controles_cred: '3',
    fecha_entrega_hierro: '2026-10-01',
    ...cambios,
  }
  return COLUMNAS_API.map((columna) => valores[columna]).join(separador)
}

function validar(texto: string) {
  return validateRegistryCsv(texto, { fileName: 'padron.csv', sizeBytes: texto.length, encoding: 'UTF-8' }, REGISTRY_CONTRACT)
}

/** "fila·columna" de cada error, para comparar de un vistazo. */
function ubicaciones(texto: string) {
  return validar(texto).errors.map((error) => `${error.row}·${error.column}`)
}

/** Bytes en Windows-1252, como guarda Excel en español (las tildes ocupan un solo byte). */
function enWindows1252(texto: string) {
  return Uint8Array.from(texto, (caracter) => {
    const codigo = caracter.charCodeAt(0)
    if (codigo > 0xff) throw new Error(`«${caracter}» no existe en Windows-1252`)
    return codigo
  })
}

/** Reemplaza la descarga del navegador y devuelve lo que se habría guardado. */
function capturarDescargas() {
  const blobs: Blob[] = []
  const nombres: string[] = []
  URL.createObjectURL = vi.fn((blob: Blob) => {
    blobs.push(blob)
    return 'blob:yawar'
  })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    nombres.push(this.download)
  })
  return { blobs, nombres }
}

function elegirArchivo(archivo: File) {
  fireEvent.change(screen.getByLabelText('Seleccionar archivo CSV'), { target: { files: [archivo] } })
}

describe('Contrato del padrón', () => {
  it('usa las columnas de POST /padron, en el mismo orden, y acepta_mensajes como opcional', () => {
    expect(REQUIRED_COLUMN_NAMES).toEqual(COLUMNAS_API)
    expect(REGISTRY_CONTRACT.filter((columna) => !columna.required).map((columna) => columna.name)).toEqual([
      'acepta_mensajes',
    ])
  })

  it('genera la plantilla en el navegador con la cabecera exacta y un ejemplo que pasa la validación', () => {
    const plantilla = buildRegistryTemplate('EESS02')
    const [cabecera, ejemplo] = plantilla.trim().split('\r\n')
    expect(cabecera).toBe(`${CABECERA},acepta_mensajes`)
    expect(ejemplo).toBe('N0001,EESS02,Mamá de N0001,+51000000001,8,urbano,Lima,150,3,2026-10-01,1')
    expect(validar(plantilla).ok).toBe(true)
  })
})

describe('Validación local', () => {
  it('acepta el padrón de ejemplo, con el área sin importar mayúsculas', () => {
    const reporte = validar(`${CABECERA}\n${fila('N0001')}\n${fila('N0002', { area: 'RURAL' })}\n`)
    expect(reporte.errors).toEqual([])
    expect(reporte).toMatchObject({ ok: true, validRows: 2, summary: { rowsDetected: 2, establishments: { EESS01: 2 } } })
  })

  it('rechaza área, altitud y edad fuera del contrato, y celdas vacías', () => {
    const texto = [
      CABECERA,
      fila('N0001', { area: 'Urbana' }),
      fila('N0002', { altitud_msnm: '3850.5' }),
      fila('N0003', { edad_meses: '12.7' }),
      fila('N0004', { edad_meses: '40' }),
      fila('N0005', { alias_cuidador: '' }),
      fila('N0006', { edad_meses: 'veinte' }),
    ].join('\n')
    expect(ubicaciones(texto)).toEqual([
      '2·area',
      '3·altitud_msnm',
      '4·edad_meses',
      '5·edad_meses',
      '6·alias_cuidador',
      '7·edad_meses',
    ])
    const reporte = validar(texto)
    expect(reporte.errors[0].message).toBe('Valor «Urbana» no válido: debe ser «urbano» o «rural».')
    expect(reporte.errors[4].message).toBe('Campo obligatorio vacío.')
    expect(reporte).toMatchObject({ ok: false, cleanCsv: null })
  })

  it('acepta la fecha de entrega vacía (la API también) y nunca repite el teléfono en el error', () => {
    expect(ubicaciones(`${CABECERA}\n${fila('N0001', { fecha_entrega_hierro: '' })}`)).toEqual([])
    const reporte = validar(`${CABECERA}\n${fila('N0001', { telefono: '+51 98765' })}`)
    expect(reporte.errors).toHaveLength(1)
    expect(reporte.errors[0]).toMatchObject({ row: 2, column: 'telefono' })
    expect(reporte.errors[0].message).not.toContain('98765')
    expect(reporte.preview[0].maskedPhone).toBe('*** (no válido)')
    expect(maskPhone('+51 000 000 001')).toBe('+51 000 *** 001')
  })

  it('no exige el orden de las columnas, pero rechaza columnas ajenas al contrato', () => {
    const alReves = [...COLUMNAS_API].reverse()
    const filaAlReves = fila('N0001').split(',').reverse().join(',')
    expect(validar(`${alReves.join(',')}\n${filaAlReves}`).ok).toBe(true)

    expect(ubicaciones(`${CABECERA},dni\n${fila('N0001')},12345678`)).toEqual(['1·dni'])
    expect(ubicaciones(`${CABECERA.replace(',region', '')}\n${fila('N0001').replace(',Lima', '')}`)).toEqual([
      '1·region',
    ])
  })
})

describe('Conversión antes de enviar a la API', () => {
  it('convierte un CSV de Excel con punto y coma en un CSV limpio con coma', () => {
    const texto = [CABECERA.replaceAll(',', ';'), fila('N0001', { region: 'Cusco, Perú' }, ';'), ''].join('\r\n')
    const reporte = validar(texto)
    expect(reporte.summary.delimiter).toBe(';')
    expect(reporte.cleanCsv).toBe(
      `${CABECERA}\nN0001,EESS01,Mamá de N0001,+51000000001,8,urbano,"Cusco, Perú",150,3,2026-10-01\n`,
    )
  })

  it('con tabulaciones: normaliza celular, fecha de Excel y área, e ignora filas y columnas vacías', () => {
    const texto = [
      `${CABECERA.replaceAll(',', '\t')}\t`,
      `${fila('N0001', { telefono: '987 654 321', fecha_entrega_hierro: '01/10/2026', area: 'Rural' }, '\t')}\t`,
      '',
      `${fila('N0002', { acepta_mensajes: '0' }, '\t')}\t`,
    ].join('\n')
    const reporte = validar(texto)
    expect(reporte.summary.delimiter).toBe('\t')
    expect(reporte.cleanCsv).toBe(
      `${CABECERA}\n` +
        'N0001,EESS01,Mamá de N0001,+51987654321,8,rural,Lima,150,3,2026-10-01\n' +
        'N0002,EESS01,Mamá de N0002,+51000000001,8,urbano,Lima,150,3,2026-10-01\n',
    )
    // La fila vacía no se envía: el 2.º registro del CSV limpio es la fila 4 del archivo
    expect(reporte.rowMap).toEqual([2, 4])
  })

  it('lee como Windows-1252 un archivo que no es UTF-8 y lo deja en UTF-8', async () => {
    const texto = `${CABECERA}\r\n${fila('N0001', { alias_cuidador: 'Mamá de N0001', region: 'Junín' })}\r\n`
    const bytes = enWindows1252(texto)
    expect(decodeCsvBytes(bytes)).toEqual({ text: texto, encoding: 'Windows-1252' })

    const reporte = await validateRegistryFile(new File([bytes], 'padron_excel.csv', { type: 'text/csv' }), REGISTRY_CONTRACT)
    expect(reporte).toMatchObject({ ok: true, summary: { encoding: 'Windows-1252' } })
    expect(reporte.cleanCsv).toContain('Mamá de N0001')
    expect(reporte.cleanCsv).toContain('Junín')

    const enviado = new Uint8Array(await new Blob([reporte.cleanCsv!]).arrayBuffer())
    expect(decodeCsvBytes(enviado)).toEqual({ text: reporte.cleanCsv, encoding: 'UTF-8' })
  })

  it('un UTF-8 con BOM se lee como UTF-8, sin el BOM', () => {
    const bytes = new TextEncoder().encode(`﻿${CABECERA}\n${fila('N0001')}\n`)
    const { text, encoding } = decodeCsvBytes(bytes)
    expect(encoding).toBe('UTF-8')
    expect(text.startsWith('id_nino')).toBe(true)
  })
})

describe('Errores de POST /padron', () => {
  it('convierte el 400 de la API en la lista {fila, columna, mensaje} en español', () => {
    const detail =
      "El padrón tiene errores y no se cargó: fila 4: invalid literal for int() with base 10: 'veinte'; " +
      'fila 9: area debe ser urbano o rural; fila 10: day is out of range for month; ' +
      'fila 11: cannot convert float NaN to integer; fila 12: telefono inválido; fila 13: edad_meses fuera de rango'
    expect(parseRegistryErrorDetail(detail)).toEqual([
      { row: 4, column: null, message: 'El valor «veinte» no es un número entero.' },
      { row: 9, column: 'area', message: 'El área debe ser «urbano» o «rural».' },
      { row: 10, column: 'fecha_entrega_hierro', message: 'La fecha de entrega de hierro no es válida (use AAAA-MM-DD).' },
      { row: 11, column: null, message: 'Hay un campo numérico vacío (edad, altitud o controles).' },
      { row: 12, column: 'telefono', message: 'El teléfono no es válido: debe tener al menos 9 dígitos.' },
      { row: 13, column: 'edad_meses', message: 'La edad está fuera del rango que acepta la API (0 a 59 meses).' },
    ])
  })

  it('traduce la fila de la API (CSV limpio) a la fila del archivo original', () => {
    const detail = 'El padrón tiene errores y no se cargó: fila 3: area debe ser urbano o rural'
    expect(parseRegistryErrorDetail(detail, [2, 4])).toEqual([
      { row: 4, column: 'area', message: 'El área debe ser «urbano» o «rural».' },
    ])
  })

  it('lee columnas faltantes y códigos repetidos; 422 y caídas son errores generales', () => {
    expect(parseRegistryErrorDetail("Al padrón le faltan columnas: ['region', 'altitud_msnm']")).toEqual([
      { row: 1, column: 'region', message: 'Falta la columna obligatoria «region».' },
      { row: 1, column: 'altitud_msnm', message: 'Falta la columna obligatoria «altitud_msnm».' },
    ])
    expect(parseRegistryErrorDetail("id_nino repetidos: ['Z5']")).toEqual([
      { row: null, column: 'id_nino', message: 'El código «Z5» está repetido en el archivo.' },
    ])
    expect(getUploadFailure(new ApiError(400, 'x', { detail: 'id_nino repetidos: [\'Z5\']' }))).toMatchObject({
      kind: 'validation',
    })
    expect(getUploadFailure(new ApiError(422, 'Field required'))).toEqual({
      kind: 'general',
      message: 'La API no recibió el archivo del padrón. Vuelva a seleccionarlo e inténtelo otra vez.',
    })
    expect(getUploadFailure(new ApiError(0, SIN_CONEXION))).toEqual({ kind: 'general', message: SIN_CONEXION })
  })
})

describe('Adaptadores de los pasos 2 y 3', () => {
  it('muestra la hora del servidor tal como llega (hora de Lima) y su semana', () => {
    expect(describeServerClock({ hora_local: '2026-10-21T10:00:00.000001' })).toEqual({
      date: '21/10/2026',
      time: '10:00',
      week: 'Semana 43 · 19 – 25 oct 2026',
    })
  })

  it('arma la lista imprimible en orden, sin teléfonos, con el seguimiento y los motivos', () => {
    const filas = buildPrintableList([...LISTA].reverse())
    expect(filas.map((f) => f.code)).toEqual(['N0001', 'N0002', 'N0004', 'N0003'])
    expect(filas[0]).toEqual({
      order: 1,
      code: 'N0001',
      caregiverAlias: 'Mamá de N0001',
      ageMonths: 8,
      action: 'Visita',
      reasons: 'La semana pasada respondió: No le di · Sin factores destacados',
    })
    expect(filas[3].reasons).toBe('Tiene 18 meses o más · Sin controles recientes')
  })
})

describe('Pantalla de Administración', () => {
  it('muestra el padrón activo del establecimiento y solo su código, sin datos que la API no tiene', async () => {
    mockApi()
    const { container } = renderizar(<AdministracionPage />)
    expect(await screen.findByText('4 niños')).toBeInTheDocument()
    expect(screen.getByText('Padrón activo de EESS01:')).toBeInTheDocument()
    expect(screen.getByText('Jurisdicción asignada').parentElement).toHaveTextContent('EESS01')
    const texto = container.textContent ?? ''
    expect(texto).not.toMatch(/Última sync|RENIPRESS|sincroniz|demostración|próximamente/i)
  })

  it('recuerda el último archivo cargado, aclarando que el dato es solo de este navegador', async () => {
    localStorage.setItem(
      LAST_UPLOAD_KEY,
      JSON.stringify({
        fileName: 'padron_octubre.csv',
        sizeBytes: 2048,
        rowsDetected: 10,
        delimiter: ';',
        encoding: 'Windows-1252',
        establishments: { EESS01: 4, EESS02: 6 },
        loaded: 10,
        uploadedAt: '2026-10-20T15:00:00.000Z',
      }),
    )
    mockApi()
    renderizar(<AdministracionPage />)
    expect(await screen.findByText('padron_octubre.csv')).toBeInTheDocument()
    expect(screen.getByText('Cargado en la API')).toBeInTheDocument()
    expect(
      screen.getByText(/la API confirmó 10 registros\. Este dato se guarda solo en este navegador\.$/),
    ).toBeInTheDocument()
  })

  it('valida el archivo de Excel en el navegador y envía el CSV limpio a POST /padron (campo archivo)', async () => {
    const api = mockApi({ 'POST /padron': { cargados: 2 } })
    const { container } = renderizar(<AdministracionPage />)
    await screen.findByText('4 niños')

    const excel = enWindows1252(
      [CABECERA.replaceAll(',', ';'), fila('N0001', {}, ';'), fila('N0002', { telefono: '987654321' }, ';'), ''].join(
        '\r\n',
      ),
    )
    elegirArchivo(new File([excel], 'padron_excel.csv', { type: 'text/csv' }))

    expect(await screen.findByText('Listo para cargar')).toBeInTheDocument()
    expect(screen.getByText(/Delimitador punto y coma \(;\) → se envía con coma/)).toHaveTextContent(
      'Windows-1252 (Excel) → se envía en UTF-8',
    )
    // Privacidad: el teléfono solo enmascarado
    const tabla = screen.getByRole('table', { name: 'Vista previa de los primeros registros del archivo' })
    expect(within(tabla).getByText('+51 000 *** 001')).toBeInTheDocument()
    expect(within(tabla).getByText('+51 987 *** 321')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/000000001|987654321/)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y cargar el padrón' }))
    expect(await screen.findByText('Cargado en la API')).toBeInTheDocument()

    const [pedido] = api.pedidosA('POST', '/padron')
    const enviado = (pedido.body as FormData).get('archivo') as File
    expect(enviado.name).toBe('padron_excel.csv')
    expect(await enviado.text()).toBe(
      `${CABECERA}\n` +
        'N0001,EESS01,Mamá de N0001,+51000000001,8,urbano,Lima,150,3,2026-10-01\n' +
        'N0002,EESS01,Mamá de N0002,+51987654321,8,urbano,Lima,150,3,2026-10-01\n',
    )
    expect(screen.getByText('La API cargó 2 registros del padrón (EESS01: 2).')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(LAST_UPLOAD_KEY) ?? 'null')).toMatchObject({
      fileName: 'padron_excel.csv',
      loaded: 2,
      encoding: 'Windows-1252',
    })
    // El padrón cambió: el "Padrón activo" se vuelve a consultar
    await waitFor(() => expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(2))
  })

  it('no envía un archivo con errores y los muestra por fila y columna', async () => {
    const api = mockApi()
    renderizar(<AdministracionPage />)
    elegirArchivo(new File([`${CABECERA}\n${fila('N0001', { area: 'Urbana' })}\n`], 'padron.csv'))

    expect(await screen.findByText('Archivo rechazado')).toBeInTheDocument()
    expect(screen.getByText('Fila 2 · area:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar y cargar el padrón' })).toBeDisabled()
    expect(api.pedidosA('POST', '/padron')).toHaveLength(0)
  })

  it('si la API rechaza el padrón (400), lista sus errores con la fila del archivo', async () => {
    mockApi({
      'POST /padron': () =>
        errorApi(400, "El padrón tiene errores y no se cargó: fila 2: invalid literal for int() with base 10: 'x'"),
    })
    renderizar(<AdministracionPage />)
    // Una línea vacía antes del registro: para la API es la fila 2; en el archivo, la 3
    elegirArchivo(new File([`${CABECERA}\n\n${fila('N0001')}\n`], 'padron.csv'))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar y cargar el padrón' }))

    expect(await screen.findByText('La API rechazó el archivo completo: 1 error informado.')).toBeInTheDocument()
    expect(screen.getByText('Fila 3:')).toBeInTheDocument()
    expect(screen.getByText('El valor «x» no es un número entero.')).toBeInTheDocument()
  })

  it('si la API no recibe el archivo (422), muestra un mensaje general', async () => {
    mockApi({
      'POST /padron': () => errorApi(422, [{ loc: ['body', 'archivo'], msg: 'Field required', type: 'missing' }]),
    })
    renderizar(<AdministracionPage />)
    elegirArchivo(new File([`${CABECERA}\n${fila('N0001')}\n`], 'padron.csv'))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar y cargar el padrón' }))

    expect(await screen.findByText('No se pudo cargar el padrón.')).toBeInTheDocument()
    expect(screen.getByText(/La API no recibió el archivo del padrón/)).toBeInTheDocument()
    expect(screen.queryByText(/Fila \d/)).toBeNull()
  })

  it('descarga la plantilla generada en el navegador, sin pedirla a la API', async () => {
    const api = mockApi()
    const descargas = capturarDescargas()
    renderizar(<AdministracionPage />)
    await screen.findByText('4 niños')
    const antes = api.pedidos.length

    fireEvent.click(screen.getByRole('button', { name: 'Plantilla CSV de ejemplo' }))
    expect(descargas.nombres).toEqual(['plantilla_padron_yawar.csv'])
    expect(await descargas.blobs[0].text()).toContain(`${CABECERA},acepta_mensajes`)
    expect(api.pedidos).toHaveLength(antes)
  })

  it('paso 2: muestra el estado real de la API desde /salud, sin credenciales', async () => {
    mockApi()
    renderizar(<AdministracionPage />)
    fireEvent.click(screen.getByRole('tab', { name: '2. Configuración de conexión' }))
    const panel = screen.getByRole('tabpanel')

    expect(await within(panel).findByText('Responde')).toBeInTheDocument()
    expect(within(panel).getByText('Modo prueba')).toBeInTheDocument()
    expect(within(panel).getByText('No se envían mensajes de WhatsApp reales.')).toBeInTheDocument()
    expect(within(panel).getByText('10:00 hrs')).toBeInTheDocument()
    expect(within(panel).getByText('21/10/2026 · Semana 43 · 19 – 25 oct 2026')).toBeInTheDocument()
    expect(panel.textContent).not.toMatch(/próximamente|X-API-Key|WA_TOKEN|API_CLAVE/)
  })

  it('paso 2: si la API no responde, lo dice', async () => {
    mockApi({ 'GET /salud': () => new Response(null, { status: 502 }) })
    renderizar(<AdministracionPage />)
    fireEvent.click(screen.getByRole('tab', { name: '2. Configuración de conexión' }))
    const panel = screen.getByRole('tabpanel')

    expect(await within(panel).findByText('Sin respuesta')).toBeInTheDocument()
    expect(within(panel).getByText(SIN_CONEXION)).toBeInTheDocument()
  })

  it('paso 3: descarga la lista de la semana en CSV desde la API', async () => {
    const api = mockApi({
      'GET /establecimientos/EESS01/lista.csv': () =>
        new Response('orden,id_nino,alias_cuidador\n1,N0001,Mamá de N0001\n', {
          headers: { 'content-type': 'text/csv; charset=utf-8' },
        }),
    })
    const descargas = capturarDescargas()
    renderizar(<AdministracionPage />)
    fireEvent.click(screen.getByRole('tab', { name: '3. Exportación y respaldo físico' }))
    fireEvent.click(within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Descargar lista CSV' }))

    expect(await screen.findByText('Lista descargada.')).toBeInTheDocument()
    const [pedido] = api.pedidosA('GET', '/establecimientos/EESS01/lista.csv')
    expect(pedido.params.get('capacidad')).toBe('10')
    expect(descargas.nombres).toEqual(['lista_EESS01_2026-W43.csv'])
    expect(await descargas.blobs[0].text()).toContain('1,N0001,Mamá de N0001')
  })

  it('paso 3: arma la hoja A4 con la lista ya generada y la imprime', async () => {
    const api = mockApi()
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderizar(<AdministracionPage />)
    fireEvent.click(screen.getByRole('tab', { name: '3. Exportación y respaldo físico' }))
    const panel = screen.getByRole('tabpanel')

    const hoja = await within(panel).findByRole('table', { name: 'Lista de la semana para visitas y observaciones' })
    expect(within(hoja).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'N.º',
      'Código',
      'Cuidador (alias)',
      'Edad',
      'Acción',
      'Motivos',
      'Visitado / Observaciones',
    ])
    const [primera] = within(hoja).getAllByRole('row').slice(1)
    expect(within(primera).getAllByRole('cell').map((td) => td.textContent)).toEqual([
      '1',
      'Mamá de N0001',
      '8 meses',
      'Visita',
      'La semana pasada respondió: No le di · Sin factores destacados',
      '',
    ])
    expect(within(panel).getByText('Establecimiento EESS01 · Semana 43 · 19 – 25 oct 2026')).toBeInTheDocument()
    expect(hoja.textContent).not.toMatch(/\+51|\d{9}/)

    fireEvent.click(within(panel).getByRole('button', { name: 'Imprimir lista (A4)' }))
    expect(imprimir).toHaveBeenCalledTimes(1)
    // Se imprime la lista ya generada: no se vuelve a pedir a la API
    expect(api.pedidosA('POST', '/establecimientos/EESS01/lista')).toHaveLength(1)
  })
})
