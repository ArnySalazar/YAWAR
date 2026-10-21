import { useEffect, useRef, useState } from 'react'
import pdfIcon from '../assets/pdf.svg'
import { buildIndicatorsCsv } from '../api'
import type { DifficultySummary, IndicatorsReport } from '../types'

/** Descarga un texto como archivo, generado en el navegador (la API no exporta indicadores). */
function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  // BOM para que Excel lea las tildes
  const url = URL.createObjectURL(new Blob(['﻿', content], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function ExportMenu({
  report,
  difficulties,
}: {
  report: IndicatorsReport | undefined
  difficulties: DifficultySummary | undefined
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={!report}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-chip disabled:opacity-60"
      >
        <img src={pdfIcon} alt="" width={10.667} height={13.333} />
        <span className="text-center text-xs leading-4 font-semibold tracking-[0.24px] text-ink-strong">
          Exportar informe (PDF/CSV)
        </span>
      </button>

      {open && report && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 flex w-56 flex-col rounded-2xl border border-line bg-white p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              window.print()
            }}
            className="rounded-xl px-3 py-2 text-left text-xs font-medium text-ink-strong hover:bg-chip"
          >
            Imprimir / guardar como PDF
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              downloadTextFile(
                `indicadores_${report.establishmentId}_${report.semana}.csv`,
                buildIndicatorsCsv(report, difficulties),
              )
            }}
            className="rounded-xl px-3 py-2 text-left text-xs font-medium text-ink-strong hover:bg-chip"
          >
            Descargar CSV
          </button>
        </div>
      )}
    </div>
  )
}
