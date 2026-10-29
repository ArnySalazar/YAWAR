import chatIcon from '../assets/chat.svg'
import arrowRightRedIcon from '../assets/arrow-right-red.svg'
import { cn } from '@/lib/cn'
import { channelName, riskPct, weekTitle } from '../format'
import { FichaCard, FichaCardHeader } from './FichaCard'
import type { BotWeeklyResponse, WeeklyResponseStatus } from '../types'

const ENTRY_STYLES: Record<
  WeeklyResponseStatus,
  { box: string; title: string; tag: string; tagLabel: string; answer: string; outcome: string }
> = {
  alerta: {
    box: 'border-[#fecdd3] bg-[rgba(255,241,242,0.5)]',
    title: 'font-bold text-[#881337]',
    tag: 'bg-[#ffe4e6] font-semibold text-brand',
    tagLabel: 'Alerta',
    answer: 'text-[#1f2937]',
    outcome: 'font-medium text-brand',
  },
  interrupcion: {
    box: 'border-[#fde68a] bg-[rgba(255,251,235,0.4)]',
    title: 'font-semibold text-[#78350f]',
    tag: 'bg-[#fef3c7] font-medium text-[#92400e]',
    tagLabel: 'Interrupción',
    answer: 'text-[#374151]',
    outcome: 'text-[#4b5563]',
  },
  completado: {
    box: 'border-[#f3f4f6] bg-[#f9fafb]',
    title: 'font-medium text-[#374151]',
    tag: 'bg-[#d1fae5] font-medium text-[#065f46]',
    tagLabel: 'Completado',
    answer: 'text-[#4b5563]',
    outcome: 'text-[#9ca3af]',
  },
  sin_respuesta: {
    box: 'border-[#f3f4f6] bg-[#f9fafb]',
    title: 'font-medium text-[#374151]',
    tag: 'bg-[#f3f4f6] font-medium text-[#6b7280]',
    tagLabel: 'Sin respuesta',
    answer: 'text-[#6b7280]',
    outcome: 'text-[#9ca3af]',
  },
}

interface BotHistoryCardProps {
  entries: BotWeeklyResponse[]
  title?: string
  emptyMessage?: string
  className?: string
}

/**
 * Historial semanal de respuestas del cuidador al bot de WhatsApp. El bot solo recibe botones:
 * se muestra la respuesta elegida (y la razón), no una cita textual ni la conversación.
 */
export function BotHistoryCard({
  entries,
  title = 'Historial Bot WhatsApp',
  emptyMessage = 'Sin semanas registradas.',
  className,
}: BotHistoryCardProps) {
  return (
    <FichaCard className={cn('flex flex-col justify-between p-[21px]', className)}>
      <div className="flex flex-col gap-4">
        <FichaCardHeader
          icon={chatIcon}
          iconClassName="bg-[#ecfdf5]"
          title={title}
          aside={
            <span className="shrink-0 rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] leading-5 font-semibold text-[#6b7280]">
              {entries.length} {entries.length === 1 ? 'Semana' : 'Semanas'}
            </span>
          }
        />
        {entries.length > 0 ? (
          <ol className="flex flex-col gap-3">
            {entries.map((entry) => (
              <BotHistoryEntry key={entry.semana} entry={entry} />
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-4 text-xs text-[#6b7280]">{emptyMessage}</p>
        )}
      </div>

      <div className="pt-4">
        <p className="border-t border-[#f3f4f6] pt-[13px] text-[10px] leading-5 text-[#9ca3af] italic">
          * Respuestas elegidas con los botones del bot de WhatsApp y, cuando el cuidador escribe, su mensaje. El
          clasificador local solo ordena y deriva; la acción la decide el personal.
        </p>
      </div>
    </FichaCard>
  )
}

function BotHistoryEntry({ entry }: { entry: BotWeeklyResponse }) {
  const style = ENTRY_STYLES[entry.status]
  const withDifficulty = entry.status === 'alerta' || entry.status === 'interrupcion'

  return (
    <li className={cn('flex flex-col gap-1 rounded-xl border p-[13px]', style.box)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-xs leading-4', style.title)}>
          {weekTitle(entry.semana)}
          {entry.isCurrentWeek && <span className="font-normal text-[#6b7280]"> · en curso</span>}
        </p>
        <span className={cn('shrink-0 rounded px-2 py-0.5 text-[10px] leading-4', style.tag)}>{style.tagLabel}</span>
      </div>
      <p className={cn('text-xs leading-4 font-medium', style.answer)}>{entry.answer}</p>
      {entry.status === 'alerta' ? (
        <p className="flex items-center gap-1 pt-1">
          <img src={arrowRightRedIcon} alt="" width={14} height={14} className="shrink-0" />
          <span className={cn('text-[11px] leading-5', style.outcome)}>Acción del sistema: {entry.outcome}</span>
        </p>
      ) : (
        <p className={cn('text-[11px] leading-5', style.outcome)}>
          {withDifficulty ? `Acción del sistema: ${entry.outcome}` : entry.outcome}
        </p>
      )}
      {entry.channel && (
        <p className="text-[10px] leading-4 text-[#9ca3af]">
          Acción de esa semana: {channelName(entry.channel)}
          {entry.riskScore !== null && ` · Riesgo de no consumo: ${riskPct(entry.riskScore)}`}
        </p>
      )}
    </li>
  )
}
