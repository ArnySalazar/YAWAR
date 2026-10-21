import { getUploadFailure } from '../api'
import { useLocalRegistryFile, useRegistryUpload } from '../hooks'
import { formatEstablishments, formatWhen, pluralize } from '../lib/format'
import type { PreviewRecord } from '../types'
import { ContractCard } from './ContractCard'
import type { FileCardModel } from './FileStatusCard'
import { PreviewCard } from './PreviewCard'
import { UploadCard } from './UploadCard'

const DEFAULT_DISCLAIMER = 'Pre-validación en memoria · No enviada a red aún'

interface StepView {
  fileCard: FileCardModel | null
  records: PreviewRecord[] | undefined
  emptyMessage: string
  disclaimer: string
  footerMessage: string
  footerTone: 'ok' | 'warning'
}

const schemaMessage = (validRows: number, total: number) =>
  `${validRows.toLocaleString('es-PE')} de ${pluralize(total, 'registro cumple', 'registros cumplen')} con el contrato de columnas.`

/** Paso 1 "Cargar padrón": carga + contrato + vista previa y envío a POST /padron. */
export function RegistryUploadStep() {
  const local = useLocalRegistryFile()
  const { mutation: upload, upload: sendRegistry, lastUpload } = useRegistryUpload()
  const { state } = local

  const handleSelect = (file: File) => {
    upload.reset()
    void local.select(file)
  }

  const handleClear = () => {
    upload.reset()
    local.clear()
  }

  const handleImport = () => {
    if (state.phase === 'parsed') sendRegistry(state.file, state.report)
  }

  const view = buildView()

  function buildView(): StepView {
    if (state.phase === 'idle') {
      return {
        fileCard: lastUpload && {
          fileName: lastUpload.fileName,
          sizeBytes: lastUpload.sizeBytes,
          rowsDetected: lastUpload.rowsDetected,
          delimiter: lastUpload.delimiter,
          encoding: lastUpload.encoding,
          state: 'imported',
          errors: [],
          errorCount: 0,
          errorsFrom: 'local',
          failure: null,
          note: `Último archivo cargado desde este navegador ${formatWhen(lastUpload.uploadedAt)}: la API confirmó ${pluralize(
            lastUpload.loaded,
            'registro',
            'registros',
          )}. Este dato se guarda solo en este navegador.`,
        },
        records: [],
        emptyMessage:
          'Seleccione un archivo CSV para ver aquí sus primeros registros. La API no devuelve el padrón ya cargado, por eso no se previsualiza.',
        disclaimer: DEFAULT_DISCLAIMER,
        footerMessage: 'Seleccione un archivo CSV para iniciar la validación local.',
        footerTone: 'ok',
      }
    }

    if (state.phase === 'parsing') {
      return {
        fileCard: {
          fileName: state.file.name,
          sizeBytes: state.file.size,
          rowsDetected: null,
          delimiter: null,
          encoding: null,
          state: 'parsing',
          errors: [],
          errorCount: 0,
          errorsFrom: 'local',
          failure: null,
          note: null,
        },
        records: undefined,
        emptyMessage: '',
        disclaimer: DEFAULT_DISCLAIMER,
        footerMessage: 'Analizando el archivo en memoria…',
        footerTone: 'ok',
      }
    }

    const { report } = state
    const { summary } = report
    const failure = upload.isError ? getUploadFailure(upload.error, report.rowMap) : null
    const apiIssues = failure?.kind === 'validation' ? failure.issues : null
    const fileState = upload.isPending
      ? 'uploading'
      : upload.isSuccess
        ? 'imported'
        : failure?.kind === 'general'
          ? 'failed'
          : apiIssues || !report.ok
            ? 'rejected'
            : 'ready'

    const establishments = formatEstablishments(summary.establishments)
    const headerRejected = !report.ok && report.preview.length === 0 && summary.rowsDetected > 0
    const footerMessage = upload.isSuccess
      ? `La API cargó ${pluralize(upload.data.cargados, 'registro', 'registros')} del padrón${
          establishments ? ` (${establishments})` : ''
        }.`
      : apiIssues
        ? 'La API rechazó el archivo: revise las inconsistencias reportadas.'
        : failure?.kind === 'general'
          ? 'El archivo no se envió: revise la conexión e inténtelo de nuevo.'
          : `${schemaMessage(report.validRows, summary.rowsDetected)}${
              report.ok ? ' Se enviará en UTF-8 separado por comas.' : ' El archivo se rechazará en su totalidad.'
            }`

    return {
      fileCard: {
        fileName: summary.fileName,
        sizeBytes: summary.sizeBytes,
        rowsDetected: summary.rowsDetected,
        delimiter: summary.delimiter,
        encoding: summary.encoding,
        state: fileState,
        errors: apiIssues ?? report.errors,
        errorCount: apiIssues ? apiIssues.length : report.errorCount,
        errorsFrom: apiIssues ? 'api' : 'local',
        failure: failure?.kind === 'general' ? failure.message : null,
        note: establishments ? `Establecimientos del archivo: ${establishments}.` : null,
      },
      records: report.preview,
      emptyMessage: headerRejected
        ? 'No se pueden previsualizar registros: la cabecera no coincide con el contrato de columnas.'
        : 'El archivo no contiene registros válidos para previsualizar.',
      disclaimer: upload.isSuccess ? 'Cargado · Padrón actualizado en la API' : DEFAULT_DISCLAIMER,
      footerMessage,
      footerTone: upload.isError || !report.ok ? 'warning' : 'ok',
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <UploadCard
          className="lg:col-span-7"
          onFileSelected={handleSelect}
          fileCard={view.fileCard}
          busy={upload.isPending}
        />
        <ContractCard className="lg:col-span-5" />
      </div>
      <PreviewCard
        records={view.records}
        emptyMessage={view.emptyMessage}
        disclaimer={view.disclaimer}
        footerMessage={view.footerMessage}
        footerTone={view.footerTone}
        canClear={state.phase !== 'idle' && !upload.isPending}
        onClear={handleClear}
        canImport={state.phase === 'parsed' && state.report.ok && !upload.isSuccess}
        importing={upload.isPending}
        onImport={handleImport}
      />
    </div>
  )
}
