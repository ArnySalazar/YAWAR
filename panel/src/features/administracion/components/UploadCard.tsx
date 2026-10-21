import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { cn } from '@/lib/cn'
import downloadIcon from '../assets/download.svg'
import dropzoneIcon from '../assets/dropzone-grid.svg'
import folderOpenIcon from '../assets/folder-open.svg'
import uploadHeadingIcon from '../assets/upload-heading.svg'
import { useDownloadRegistryTemplate } from '../hooks'
import { FileStatusCard, type FileCardModel } from './FileStatusCard'
import { PanelCard, PanelHeading, Pill } from './PanelCard'

interface UploadCardProps {
  onFileSelected: (file: File) => void
  /** null = no hay archivo seleccionado ni cargado antes desde este navegador. */
  fileCard: FileCardModel | null
  busy: boolean
  className?: string
}

/** Panel A: carga del CSV (arrastrar y soltar o selector) y detección local del archivo. */
export function UploadCard({ onFileSelected, fileCard, busy, className }: UploadCardProps) {
  const headingId = useId()

  return (
    <PanelCard aria-labelledby={headingId} className={cn('gap-6', className)}>
      <PanelHeading
        id={headingId}
        title="Carga de Archivo CSV de Padrón"
        icon={uploadHeadingIcon}
        iconWidth={12}
        iconHeight={12}
        aside={<Pill className="text-muted">UTF-8 o CSV de Excel</Pill>}
      />
      <Dropzone onFileSelected={onFileSelected} disabled={busy} />
      <FileStatusCard model={fileCard} />
    </PanelCard>
  )
}

function Dropzone({ onFileSelected, disabled }: { onFileSelected: (file: File) => void; disabled: boolean }) {
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const descriptionId = useId()
  const downloadTemplate = useDownloadRegistryTemplate()

  const takeFile = (files: FileList | null | undefined) => {
    const file = files?.[0]
    if (file && !disabled) onFileSelected(file)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    takeFile(event.target.files)
    // Permite volver a elegir el mismo archivo tras corregirlo.
    event.target.value = ''
  }

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    dragDepth.current++
    setDragging(true)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
  }

  const handleDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    takeFile(event.dataTransfer.files)
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-[16px] border-2 border-dashed p-5 text-center transition-colors sm:p-8',
        dragging ? 'border-brand bg-brand-soft/60' : 'border-line bg-[rgba(241,243,242,0.6)]',
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-[16px] border border-line bg-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
        <img src={dropzoneIcon} alt="" width={27} height={27} />
      </span>

      <div className="flex max-w-[448px] flex-col gap-1">
        <p className="text-[14px] leading-5 font-semibold text-ink">
          {dragging ? 'Suelte el archivo para analizarlo localmente' : 'Arrastre y suelte el archivo de padrón CRED (.csv)'}
        </p>
        <p id={descriptionId} className="text-[13px] leading-[18px] text-[#5b5858]">
          O seleccione manualmente el archivo. Se acepta el CSV guardado desde Excel (con «;» y tildes): antes de
          enviarlo se convierte a UTF-8 separado por comas.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <label
          className={cn(
            'flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-[12px] leading-4 font-semibold tracking-[0.24px] text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-brand-dark',
          )}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleChange}
            disabled={disabled}
            aria-describedby={descriptionId}
          />
          <img src={folderOpenIcon} alt="" width={16.125} height={12} className="shrink-0" />
          Seleccionar archivo CSV
        </label>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 rounded-full border border-line bg-chip px-4 py-2.5 text-[12px] leading-4 font-medium tracking-[0.24px] text-ink transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <img src={downloadIcon} alt="" width={10.6667} height={10.6667} className="shrink-0" />
          Plantilla CSV de ejemplo
        </button>
      </div>
    </div>
  )
}
