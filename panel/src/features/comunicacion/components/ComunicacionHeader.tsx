import type { SemanaIso } from '@/api/yawar'
import { EtiquetaSeguimiento } from '@/components/ui/EtiquetaSeguimiento'
import { etiquetaSemanaLarga } from '@/lib/semana'
import downloadIcon from '../assets/icon-download.svg'

interface ComunicacionHeaderProps {
  /** Código del establecimiento, ej. "EESS01" (la API todavía no devuelve su nombre). */
  establishmentId: string
  semana: SemanaIso
  onExport: () => void
  /** Sin respuestas cargadas o sin resultados con los filtros: no hay nada que exportar. */
  exportDisabled: boolean
}

export function ComunicacionHeader({ establishmentId, semana, onExport, exportDisabled }: ComunicacionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <EtiquetaSeguimiento />
        <h1 className="text-[32px] font-bold leading-10 tracking-[-0.8px] text-ink-strong">Comunicación</h1>
        <p className="text-sm leading-5 text-muted">
          Respuestas de la semana de los cuidadores · <span className="text-ink-strong">{establishmentId}</span> ·{' '}
          {etiquetaSemanaLarga(semana)}
        </p>
      </div>

      <button
        type="button"
        onClick={onExport}
        disabled={exportDisabled}
        className="inline-flex h-10 items-center gap-1 rounded-full bg-white px-4 text-xs font-semibold leading-4 tracking-[0.24px] text-ink-strong shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        <img src={downloadIcon} alt="" width={12} height={12} className="shrink-0" />
        Exportar reporte de respuestas (CSV)
      </button>
    </div>
  )
}
