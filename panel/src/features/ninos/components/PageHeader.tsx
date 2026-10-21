import { Link } from 'react-router'
import { EtiquetaSeguimiento } from '@/components/ui/EtiquetaSeguimiento'
import { paths } from '@/routes/paths'
import { cn } from '@/lib/cn'
import exportIcon from '../assets/icon-export-download.svg'
import advancedFiltersIcon from '../assets/icon-advanced-filters.svg'
import plusIcon from '../assets/icon-plus.svg'

interface PageHeaderProps {
  onExport: () => void
  canExport: boolean
  advancedOpen: boolean
  onToggleAdvanced: () => void
  advancedPanelId: string
}

const secondaryButton =
  'flex min-h-[50px] grow basis-[140px] items-center justify-center rounded-xl border border-line bg-white py-2 pl-4 text-xs leading-4 font-semibold text-ink shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 sm:grow-0'

export function PageHeader({
  onExport,
  canExport,
  advancedOpen,
  onToggleAdvanced,
  advancedPanelId,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <EtiquetaSeguimiento />
        <h1 className="mt-1 text-[30px] leading-9 font-bold tracking-[-0.75px] text-ink">Niños en seguimiento</h1>
        <p className="mt-[3px] max-w-3xl text-sm leading-[22.75px] text-[#737373]">
          Directorio del padrón nominal para acompañamiento de suplementación de hierro en niños de 6 a 35 meses.
          Revise lo que responden los cuidadores, las alertas y las visitas priorizadas de la semana.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5 lg:shrink-0 lg:flex-nowrap">
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport}
          className={cn(secondaryButton, 'gap-[19.82px] pr-[22px]')}
        >
          <img src={exportIcon} alt="" width={14.33} height={16} className="shrink-0" />
          <span className="w-[100px] text-center">Exportar Padrón (CSV)</span>
        </button>
        <button
          type="button"
          onClick={onToggleAdvanced}
          aria-expanded={advancedOpen}
          aria-controls={advancedPanelId}
          className={cn(secondaryButton, 'gap-[22.14px] pr-[30px]', advancedOpen && 'border-ink/30 bg-canvas')}
        >
          <img src={advancedFiltersIcon} alt="" width={14.31} height={16} className="shrink-0" />
          <span className="w-16 text-center">Filtros Avanzados</span>
        </button>
        {/* No hay alta manual: los niños entran con el padrón CSV (Administración) */}
        <Link
          to={paths.administracion}
          className="flex min-h-12 grow basis-[140px] items-center justify-center gap-[17.33px] rounded-xl bg-brand py-2 pr-[19px] pl-4 text-xs leading-4 font-bold text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:grow-0"
        >
          <img src={plusIcon} alt="" width={14.36} height={16} className="shrink-0" />
          <span className="w-[98px] text-center">Cargar padrón (CSV)</span>
        </Link>
      </div>
    </div>
  )
}
