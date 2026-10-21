import calendarIcon from '../assets/calendar.svg'
import clockIcon from '../assets/clock.svg'
import { cn } from '@/lib/cn'
import { etiquetaSemana, etiquetaSemanaLarga } from '@/lib/semana'
import { missingRosterReason } from '../format'
import { FichaCard } from './FichaCard'
import type { ChildFollowUp } from '../types'

/**
 * Tarjeta derecha: acción de la semana según la lista (canal = `accion`, fundamento = `regla`).
 * Sin "Reasignar a WhatsApp": la API asigna el canal sola y no tiene una ruta para cambiarlo.
 */
export function NextActionCard({ child, className }: { child: ChildFollowUp; className?: string }) {
  const action = child.roster?.nextAction ?? null

  return (
    <FichaCard className={cn('flex flex-col justify-between gap-[15px] p-[25px]', className)}>
      <div className="flex flex-col gap-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f6]">
              <img src={calendarIcon} alt="" width={16} height={16} />
            </span>
            <h3 className="text-sm leading-5 font-bold tracking-[-0.35px] text-[#111827]">Próxima Acción Asignada</h3>
          </div>
          {action && (
            <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] leading-5 font-semibold text-brand">
              {etiquetaSemana(action.semana)}
            </span>
          )}
        </div>

        {action ? (
          <div
            className={cn(
              'flex flex-col gap-2 rounded-xl border border-t-4 bg-[rgba(249,250,251,0.6)] px-[17px] pt-5 pb-[17px]',
              action.channel === 'visita_domiciliaria' ? 'border-brand' : 'border-success',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <img src={clockIcon} alt="" width={14} height={14} />
                <span className="text-xs leading-4 font-semibold text-[#4b5563]">{etiquetaSemanaLarga(action.semana)}</span>
              </div>
              <span className="rounded-full bg-[#d1fae5] px-2 py-0.5 text-[10px] leading-5 font-semibold text-[#065f46]">
                Planificada
              </span>
            </div>
            <h4 className="text-base leading-6 font-bold text-ink">{action.title}</h4>
            <p className="text-xs leading-[19.5px] text-[#4b5563]">
              <span className="font-bold text-[#374151]">Fundamento:</span> {action.rationale}
            </p>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-4 text-xs text-[#6b7280]">
            Sin acción asignada: {missingRosterReason(child)}.
          </p>
        )}
      </div>

      <p className="text-center text-[10px] leading-5 text-[#9ca3af] print:hidden">
        Asignación automática de la lista semanal: las primeras posiciones van a visita, según la capacidad N.
      </p>
    </FichaCard>
  )
}
