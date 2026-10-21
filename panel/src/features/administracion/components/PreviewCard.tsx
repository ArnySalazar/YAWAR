import { useId } from 'react'
import atomicWarningIcon from '../assets/atomic-warning.svg'
import importConfirmIcon from '../assets/import-confirm.svg'
import infoIcon from '../assets/info-circle.svg'
import previewTableIcon from '../assets/preview-table.svg'
import schemaCheckIcon from '../assets/schema-check.svg'
import type { PreviewRecord } from '../types'
import { PanelCard, PanelHeading } from './PanelCard'
import { PreviewTable } from './PreviewTable'

interface PreviewCardProps {
  /** undefined = cargando. */
  records: PreviewRecord[] | undefined
  emptyMessage: string
  /** Etiqueta del lado derecho (ej. "Pre-validación en memoria · No enviada a red aún"). */
  disclaimer: string
  footerMessage: string
  footerTone: 'ok' | 'warning'
  canClear: boolean
  onClear: () => void
  canImport: boolean
  importing: boolean
  onImport: () => void
}

/** Panel C: vista previa local del archivo y barra de acciones de carga. */
export function PreviewCard({
  records,
  emptyMessage,
  disclaimer,
  footerMessage,
  footerTone,
  canClear,
  onClear,
  canImport,
  importing,
  onImport,
}: PreviewCardProps) {
  const headingId = useId()
  const shown = records?.length || 4
  const description = `Validación sintáctica en el navegador (${
    shown === 1 ? 'primer registro del archivo' : `primeros ${shown} registros del archivo`
  }). El teléfono siempre se muestra enmascarado.`

  return (
    <PanelCard aria-labelledby={headingId} className="gap-4">
      <PanelHeading
        id={headingId}
        title="Vista Previa Local del Archivo"
        icon={previewTableIcon}
        iconWidth={15}
        iconHeight={15}
        description={<p className="text-[13px] leading-[18px] text-[#5b5858]">{description}</p>}
        aside={
          <span className="flex items-center gap-2 rounded-full border border-line bg-chip px-3.5 py-1.5 text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
            <img src={infoIcon} alt="" width={13.3333} height={13.3333} className="shrink-0" />
            {disclaimer}
          </span>
        }
      />

      <PreviewTable records={records} emptyMessage={emptyMessage} caption="Vista previa de los primeros registros del archivo" />

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-[13px] leading-[18px] text-[#5b5858]" aria-live="polite">
          {footerTone === 'ok' ? (
            <img src={schemaCheckIcon} alt="" width={16.5} height={15.75} className="mt-px shrink-0" />
          ) : (
            <img src={atomicWarningIcon} alt="" width={11.3333} height={16.1667} className="shrink-0" />
          )}
          {footerMessage}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onClear}
            disabled={!canClear}
            className="w-full rounded-full border border-line bg-chip px-5 py-2.5 text-center text-[12px] leading-4 font-medium tracking-[0.24px] text-ink transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-chip sm:w-auto"
          >
            Limpiar selección
          </button>
          <button
            type="button"
            onClick={onImport}
            disabled={!canImport || importing}
            aria-busy={importing}
            title={canImport ? undefined : 'Seleccione un archivo CSV válido para habilitar la carga'}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-2.5 text-center text-[12px] leading-4 font-semibold tracking-[0.24px] text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand sm:w-auto"
          >
            <img src={importConfirmIcon} alt="" width={15} height={15} className="shrink-0" />
            {importing ? 'Cargando el padrón…' : 'Confirmar y cargar el padrón'}
          </button>
        </div>
      </div>
    </PanelCard>
  )
}
