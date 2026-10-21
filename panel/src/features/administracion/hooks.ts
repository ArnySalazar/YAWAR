import { useCallback, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useCargarPadron, useHoy } from '@/api/queries'
import { yawarApi } from '@/api/yawar'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { REGISTRY_CONTRACT, buildRegistryTemplate } from './api'
import { downloadCsv } from './lib/download'
import { readLastUpload, writeLastUpload } from './lib/lastUpload'
import { validateRegistryFile } from './lib/validateRegistry'
import type { LastRegistryUpload, RegistryValidationReport } from './types'

export const REGISTRY_TEMPLATE_FILE_NAME = 'plantilla_padron_yawar.csv'

/** Plantilla CSV generada en el navegador desde el contrato (no se pide nada a la API). */
export function useDownloadRegistryTemplate() {
  const { establecimiento } = useEstablecimiento()
  return useCallback(
    () => downloadCsv(buildRegistryTemplate(establecimiento), REGISTRY_TEMPLATE_FILE_NAME),
    [establecimiento],
  )
}

export type LocalRegistryFile =
  | { phase: 'idle' }
  | { phase: 'parsing'; file: File }
  | { phase: 'parsed'; file: File; report: RegistryValidationReport }

/**
 * Archivo seleccionado por el usuario y su validación local (parseo en memoria, nada se envía
 * a la red hasta confirmar la carga).
 */
export function useLocalRegistryFile() {
  const [state, setState] = useState<LocalRegistryFile>({ phase: 'idle' })
  const latestRequest = useRef(0)

  const select = useCallback(async (file: File) => {
    const requestId = ++latestRequest.current
    setState({ phase: 'parsing', file })

    let report: RegistryValidationReport
    try {
      report = await validateRegistryFile(file, REGISTRY_CONTRACT)
    } catch (error) {
      report = {
        summary: {
          fileName: file.name,
          sizeBytes: file.size,
          rowsDetected: 0,
          delimiter: ',',
          encoding: 'UTF-8',
          establishments: {},
        },
        ok: false,
        validRows: 0,
        errors: [
          {
            row: null,
            column: null,
            message:
              error instanceof Error
                ? `No se pudo validar el archivo: ${error.message}`
                : 'No se pudo validar el archivo.',
          },
        ],
        errorCount: 1,
        preview: [],
        cleanCsv: null,
        rowMap: [],
      }
    }

    if (requestId === latestRequest.current) setState({ phase: 'parsed', file, report })
  }, [])

  const clear = useCallback(() => {
    latestRequest.current++
    setState({ phase: 'idle' })
  }, [])

  return { state, select, clear }
}

/**
 * POST /padron con el CSV limpio (UTF-8, coma) en el campo `archivo`. Al cargar, useCargarPadron
 * vuelve a pedir las listas (y con ellas el "Padrón activo"); el último archivo se recuerda en
 * este navegador.
 */
export function useRegistryUpload() {
  const mutation = useCargarPadron()
  const [lastUpload, setLastUpload] = useState<LastRegistryUpload | null>(readLastUpload)

  const upload = (file: File, report: RegistryValidationReport) => {
    if (!report.ok || report.cleanCsv === null) return
    mutation.mutate(
      { archivo: new Blob([report.cleanCsv], { type: 'text/csv;charset=utf-8' }), nombre: file.name },
      {
        onSuccess: ({ cargados }) => {
          const entry: LastRegistryUpload = { ...report.summary, loaded: cargados, uploadedAt: new Date().toISOString() }
          writeLastUpload(entry)
          setLastUpload(entry)
        },
      },
    )
  }

  return { mutation, upload, lastUpload }
}

/**
 * GET /establecimientos/{id}/lista.csv con la capacidad actual y descarga del archivo.
 * Ojo: la API vuelve a generar la lista al exportarla (con la misma capacidad, sale igual).
 */
export function useDownloadWeeklyListCsv() {
  const { establecimiento, capacidad } = useEstablecimiento()
  const { semana } = useHoy()
  return useMutation({
    mutationFn: async () => {
      const csv = await yawarApi.listaCsv(establecimiento, capacidad)
      downloadCsv(csv, `lista_${establecimiento}_${semana}.csv`)
    },
  })
}
