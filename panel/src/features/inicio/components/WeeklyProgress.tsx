import { Skeleton } from '@/components/ui/AsyncContent'
import { etiquetaSemana } from '@/lib/semana'
import { useWhatsappStats } from '../hooks'
import { formatPct, percentOf } from '../utils'

const containerClass = 'flex flex-col gap-2 rounded-xl border border-line bg-canvas p-3.5'

/**
 * Avance de la semana: cuántos cuidadores respondieron el recordatorio de los que lo recibieron.
 * No hay barra de "visitas realizadas": la API no registra las visitas hechas.
 */
export function WeeklyProgress() {
  const { query, stats } = useWhatsappStats()

  if (query.isPending) return <Skeleton className="h-[86px] rounded-xl" />

  if (query.isError) {
    return (
      <p className={`${containerClass} text-[13px] leading-[18px] text-muted`}>
        No se pudo cargar el avance de respuestas: {query.error.message}
      </p>
    )
  }

  const label = 'Cuidadores que respondieron el recordatorio'
  const completed = stats?.responses ?? 0
  const planned = stats?.sent ?? 0
  const pct = percentOf(completed, planned)

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-[11px] leading-[14px] tracking-[0.33px]">
        <h3 className="font-semibold text-ink-strong">Avance de respuestas de la semana</h3>
        {stats && <span className="font-medium text-muted">{etiquetaSemana(stats.semana)} en curso</span>}
      </div>
      {planned === 0 ? (
        <p className="pt-1 text-xs leading-4 text-muted">Aún no se enviaron recordatorios esta semana.</p>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
          <div className="flex items-start justify-between gap-2 text-xs leading-4">
            <span className="text-muted">{label}</span>
            <span className="shrink-0 font-semibold text-ink-strong">
              {completed} de {planned} ({formatPct(pct, 1)})
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={planned}
            aria-valuenow={completed}
            className="h-2 w-full overflow-hidden rounded-full bg-[#b5b5b5]"
          >
            <div className="h-full rounded-full bg-brand-dark" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
