import { Link } from 'react-router'
import arrowLeftIcon from '../assets/arrow-left.svg'
import downloadIcon from '../assets/download.svg'
import { EtiquetaSeguimiento } from '@/components/ui/EtiquetaSeguimiento'
import { paths } from '@/routes/paths'
import type { ChildRoster } from '../types'

interface FichaHeaderProps {
  code: string
  /** Fila del niño en la lista de la semana; null mientras carga o si no está en la lista. */
  roster: ChildRoster | null
}

// Sin botón "Registro de Visita": la API no registra visitas realizadas (decisión 3 del documento de brecha).
export function FichaHeader({ code, roster }: FichaHeaderProps) {
  return (
    <section
      aria-label="Cabecera de acción y navegación"
      className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
    >
      <div className="flex flex-col gap-2">
        <EtiquetaSeguimiento />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            to={paths.ninos}
            className="flex items-center gap-1 text-xs leading-4 font-medium text-[#6b7280] hover:text-ink print:hidden"
          >
            <img src={arrowLeftIcon} alt="" width={16} height={16} />
            Volver a Niños en Seguimiento
          </Link>
          <span aria-hidden className="hidden text-sm leading-5 text-[#d1d5db] sm:inline print:hidden">
            /
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl leading-7 font-bold tracking-[-0.5px] text-ink">Ficha de Seguimiento</h1>
            <span className="rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-[11px] py-[3px] text-xs leading-4 font-semibold text-[#374151]">
              ID: {code}
            </span>
            {roster?.prioritizedForHomeVisit && (
              <span className="flex items-center gap-1 rounded-full border border-brand/20 bg-brand-soft px-[11px] py-[3px]">
                <span className="size-1.5 rounded-full bg-brand" />
                <span className="text-[11px] leading-5 font-semibold text-brand">Priorizado para Visita Domiciliaria</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-[15px] py-[9px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-chip"
        >
          <img src={downloadIcon} alt="" width={14} height={14} />
          <span className="text-xs leading-4 font-medium text-[#374151]">Exportar Ficha A4</span>
        </button>
      </div>
    </section>
  )
}
