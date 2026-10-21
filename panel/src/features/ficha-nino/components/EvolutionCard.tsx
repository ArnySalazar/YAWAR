import chartIcon from '../assets/chart.svg'
import type { Respuesta } from '@/api/yawar'
import { cn } from '@/lib/cn'
import { RESPUESTAS } from '@/lib/dominio'
import { etiquetaSemana } from '@/lib/semana'
import { weekShort } from '../format'
import { FichaCard, FichaCardHeader } from './FichaCard'
import type { WeeklyAnswer } from '../types'

const ANSWER_STYLES: Record<Respuesta, { bar: string; text: string }> = {
  si_le_di: { bar: 'bg-[#10b981]', text: 'text-white' },
  no_le_di: { bar: 'bg-[#fbbf24]', text: 'text-white' },
  problema: { bar: 'bg-brand', text: 'text-white' },
  sin_respuesta: { bar: 'bg-[#e5e7eb]', text: 'text-[#4b5563]' },
}

const LEYENDA: Respuesta[] = ['si_le_di', 'no_le_di', 'problema', 'sin_respuesta']

/**
 * "Respuesta del cuidador" por semana (antes "Regularidad de tomas"): es lo que dijo el cuidador
 * al bot, no una toma verificada. Incluye el estado "Sin respuesta".
 */
export function EvolutionCard({ answers, className }: { answers: WeeklyAnswer[]; className?: string }) {
  const gaveIron = answers.filter((week) => week.respuesta === 'si_le_di').length

  return (
    <FichaCard className={cn('flex flex-col gap-4 p-[21px]', className)}>
      <FichaCardHeader icon={chartIcon} iconClassName="bg-[#eef2ff]" title="Respuesta del cuidador" />

      <div className="flex flex-col gap-2 rounded-xl border border-[#f3f4f6] bg-[#f9fafb] p-[13px]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs leading-4 font-medium text-[#374151]">
            Últimas {answers.length} {answers.length === 1 ? 'semana' : 'semanas'}
          </p>
          <p className="shrink-0 text-xs leading-4 font-bold text-[#111827]">
            {RESPUESTAS.si_le_di}: {gaveIron} / {answers.length} sem
          </p>
        </div>

        {answers.length > 0 ? (
          <ol className="flex h-7 gap-1.5" aria-label="Respuesta del cuidador por semana">
            {answers.map((week) => {
              const label = `${etiquetaSemana(week.semana)}: ${RESPUESTAS[week.respuesta]}${week.isCurrentWeek ? ' (semana en curso)' : ''}`
              return (
                <li
                  key={week.semana}
                  title={label}
                  aria-label={label}
                  className={cn('flex min-w-0 flex-1 items-end justify-center rounded-md pb-1', ANSWER_STYLES[week.respuesta].bar)}
                >
                  <span aria-hidden className={cn('font-mono text-[9px] leading-5', ANSWER_STYLES[week.respuesta].text)}>
                    {weekShort(week.semana)}
                  </span>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="text-xs text-[#6b7280]">Sin semanas registradas.</p>
        )}

        <ul className="flex flex-wrap items-center justify-between gap-2">
          {LEYENDA.map((respuesta) => (
            <li key={respuesta} className="flex items-center gap-1">
              <span className={cn('size-2 rounded', ANSWER_STYLES[respuesta].bar)} />
              <span className="text-[10px] leading-5 text-[#6b7280]">{RESPUESTAS[respuesta]}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] leading-5 text-[#9ca3af] italic">
        * Es lo que dijo el cuidador al bot, no una toma verificada.
      </p>
    </FichaCard>
  )
}
