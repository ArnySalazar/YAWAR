import { cn } from '@/lib/cn'
import atomicWarningIcon from '../assets/atomic-warning.svg'
import csvFileIcon from '../assets/csv-file.svg'
import { formatDelimiter, formatEncoding, formatFileSize, formatIssueLocation, pluralize } from '../lib/format'
import type { CsvDelimiter, SourceEncoding, ValidationIssue } from '../types'
import { Pill } from './PanelCard'

export type FileCardState = 'parsing' | 'ready' | 'rejected' | 'uploading' | 'imported' | 'failed'

export interface FileCardModel {
  fileName: string
  sizeBytes: number
  rowsDetected: number | null
  delimiter: CsvDelimiter | null
  encoding: SourceEncoding | null
  state: FileCardState
  /** Errores por fila o columna; `errorsFrom` dice si los encontró el navegador o la API. */
  errors: ValidationIssue[]
  errorCount: number
  errorsFrom: 'local' | 'api'
  /** Problema general al enviar (sin conexión, 422, 500…). */
  failure: string | null
  /** Nota bajo el resumen (ej. de cuándo es el último archivo cargado). */
  note: string | null
}

const STATE_BADGE: Record<FileCardState, { label: string; dot: string }> = {
  parsing: { label: 'Analizando archivo…', dot: 'bg-[#f2a413] animate-pulse' },
  ready: { label: 'Listo para cargar', dot: 'bg-success' },
  rejected: { label: 'Archivo rechazado', dot: 'bg-brand' },
  uploading: { label: 'Cargando en la API…', dot: 'bg-[#f2a413] animate-pulse' },
  imported: { label: 'Cargado en la API', dot: 'bg-success' },
  failed: { label: 'No se pudo enviar', dot: 'bg-brand' },
}

/** Máximo de errores listados (el resto se resume). */
const MAX_LISTED_ERRORS = 50
/** La API informa como máximo 10 filas con errores (api/servicios.py). */
const API_MAX_REPORTED = 10

/** Archivo seleccionado y detección local: nombre, tamaño, registros, delimitador, codificación y estado. */
export function FileStatusCard({ model }: { model: FileCardModel | null }) {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-chip p-4" aria-live="polite">
      {model ? <FileSummary model={model} /> : <NoFileSummary />}

      {model?.note && (
        <p className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">{model.note}</p>
      )}

      {model && model.errors.length > 0 && (
        <ErrorList errors={model.errors} errorCount={model.errorCount} from={model.errorsFrom} />
      )}

      {model?.failure && (
        <div role="alert" className="rounded-[8px] border border-brand/20 bg-white p-3">
          <p className="text-[12px] leading-4 font-semibold text-brand">No se pudo cargar el padrón.</p>
          <p className="mt-1 text-[12px] leading-4 text-ink">{model.failure}</p>
        </div>
      )}

      <div className="flex items-start gap-2 pt-2">
        <img src={atomicWarningIcon} alt="" width={11.3333} height={16.1667} className="shrink-0" />
        <p className="max-w-[553px] text-[13px] leading-[18px] text-[#5b5858]">
          <strong className="font-bold">Carga atómica obligatoria:</strong> Si una sola fila contiene inconsistencias
          de rango o sintaxis, la API no carga nada del archivo, para que el padrón nunca quede a medias. Los niños
          que ya existían se actualizan por su código.
        </p>
      </div>
    </div>
  )
}

function FileSummary({ model }: { model: FileCardModel }) {
  const badge = STATE_BADGE[model.state]
  const details = [
    formatFileSize(model.sizeBytes),
    model.state === 'parsing'
      ? 'Detectando registros…'
      : model.rowsDetected !== null
        ? `${pluralize(model.rowsDetected, 'registro detectado', 'registros detectados')}`
        : null,
    model.delimiter
      ? `Delimitador ${formatDelimiter(model.delimiter)}${model.delimiter !== ',' ? ' → se envía con coma' : ''}`
      : null,
    model.encoding
      ? `${formatEncoding(model.encoding)}${model.encoding !== 'UTF-8' ? ' → se envía en UTF-8' : ''}`
      : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <img src={csvFileIcon} alt="" width={16} height={20} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-[12px] leading-4 font-semibold tracking-[0.24px] break-all text-ink">{model.fileName}</p>
          <p className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-[#5b5858]">{details.join(' · ')}</p>
        </div>
      </div>
      <Pill tone="white" className="shrink-0 gap-1 text-ink">
        <span aria-hidden className={cn('size-2 shrink-0 rounded-full', badge.dot)} />
        {badge.label}
      </Pill>
    </div>
  )
}

function NoFileSummary() {
  return (
    <div className="flex items-center gap-2">
      <img src={csvFileIcon} alt="" width={16} height={20} className="shrink-0" />
      <p className="text-[12px] leading-4 font-semibold tracking-[0.24px] text-ink">
        Aún no se ha cargado un padrón desde este navegador.
      </p>
    </div>
  )
}

function ErrorList({ errors, errorCount, from }: { errors: ValidationIssue[]; errorCount: number; from: 'local' | 'api' }) {
  const listed = errors.slice(0, MAX_LISTED_ERRORS)
  const remaining = errorCount - listed.length
  const heading =
    from === 'api'
      ? `La API rechazó el archivo completo: ${pluralize(errorCount, 'error informado', 'errores informados')}.`
      : errorCount === 1
        ? 'Se detectó 1 inconsistencia: el archivo completo será rechazado.'
        : `Se detectaron ${errorCount.toLocaleString('es-PE')} inconsistencias: el archivo completo será rechazado.`

  return (
    <div role="alert" className="rounded-[8px] border border-brand/20 bg-white p-3">
      <p className="text-[12px] leading-4 font-semibold text-brand">{heading}</p>
      <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto pr-1 text-[12px] leading-4 text-ink">
        {listed.map((issue, index) => (
          <li key={`${issue.row}-${issue.column}-${index}`}>
            <span className="font-semibold text-brand">{formatIssueLocation(issue)}:</span> {issue.message}
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <p className="mt-2 text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
          … y {pluralize(remaining, 'inconsistencia más', 'inconsistencias más')}. Corrija el archivo y vuelva a
          cargarlo.
        </p>
      )}
      {from === 'api' && errorCount >= API_MAX_REPORTED && (
        <p className="mt-2 text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
          La API informa como máximo {API_MAX_REPORTED} filas con errores: puede haber más.
        </p>
      )}
    </div>
  )
}
