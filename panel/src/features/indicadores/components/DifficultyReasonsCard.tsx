import { Link } from 'react-router'
import counselingIcon from '../assets/counseling.svg'
import { Skeleton } from '@/components/ui/AsyncContent'
import { etiquetaSemana } from '@/lib/semana'
import { paths } from '@/routes/paths'
import { cn } from '@/lib/cn'
import { topReasonText } from '../api'
import { plural, pctRounded } from '../format'
import { IndicatorCard } from './IndicatorCard'
import type { DifficultySummary } from '../types'

interface DifficultyReasonsCardProps {
  semana: string
  establishmentId: string
  /** undefined mientras se piden los historiales. */
  summary: DifficultySummary | undefined
  error: Error | null
  onRetry: () => void
  className?: string
}

/**
 * Motivos que eligieron los cuidadores al responder «No le di» o «Tuve un problema». La API no los
 * cuenta: se cuentan con el historial de los niños de la lista actual del establecimiento.
 */
export function DifficultyReasonsCard({
  semana,
  establishmentId,
  summary,
  error,
  onRetry,
  className,
}: DifficultyReasonsCardProps) {
  const week = etiquetaSemana(semana)
  const top = summary ? topReasonText(summary) : null

  return (
    <IndicatorCard className={cn('flex flex-col gap-5', className)}>
      <header className="flex flex-col gap-0.5 pb-1">
        <h2 className="text-lg leading-6 font-semibold text-ink-strong">Motivos de dificultad reportados</h2>
        <p className="max-w-[360px] text-[13px] leading-[18px] text-muted">
          {summary
            ? `${plural(summary.familiesReporting, 'cuidador', 'cuidadores')} ${summary.familiesReporting === 1 ? 'respondió' : 'respondieron'} «No le di» o «Tuve un problema» (${week})`
            : `Respuestas «No le di» o «Tuve un problema» (${week})`}
        </p>
        {summary && (
          <p className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
            Sobre los {summary.childrenCounted} niños de la lista actual de {establishmentId}.
          </p>
        )}
      </header>

      {error ? (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-xl bg-brand-soft p-4 text-brand">
          <p className="text-[13px] leading-[18px] font-semibold">No se pudieron contar los motivos.</p>
          <p className="text-[11px] leading-[14px] text-ink/70">{error.message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-dark"
          >
            Reintentar
          </button>
        </div>
      ) : !summary ? (
        <div className="flex flex-col gap-3 py-1" aria-label="Contando los motivos">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-7 rounded-lg" />
          ))}
        </div>
      ) : summary.familiesReporting > 0 ? (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-3 py-1">
            {summary.reasons.map((reason) => {
              const share = pctRounded(reason.cases, summary.familiesReporting)
              return (
                <li key={reason.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: reason.color }} />
                      <span className="text-[13px] leading-[18px] font-medium text-ink-strong">{reason.label}</span>
                    </p>
                    <span className="shrink-0 font-mono text-[11px] leading-[14px] tracking-[0.33px] text-muted">
                      {plural(reason.cases, 'caso')} ({share}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#e2eae3]">
                    <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: reason.color }} />
                  </div>
                </li>
              )
            })}
          </ul>
          {summary.withoutReason > 0 && (
            <p className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
              {plural(summary.withoutReason, 'cuidador', 'cuidadores')} todavía no{' '}
              {summary.withoutReason === 1 ? 'eligió' : 'eligieron'} el motivo.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#d4dcd5] px-4 py-10 text-center">
          <p className="text-[13px] leading-[18px] font-semibold text-ink-strong">Sin dificultades reportadas</p>
          <p className="max-w-[280px] text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
            Ningún cuidador de la lista respondió «No le di» ni «Tuve un problema» en la {week}.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-xl bg-[rgba(226,234,227,0.4)] p-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <img src={counselingIcon} alt="" width={12.675} height={13.333} className="shrink-0" />
          <span className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
            {top ?? 'Sin motivos indicados en esta semana'}
          </span>
        </p>
        <Link
          to={paths.comunicacion}
          className="shrink-0 self-end text-[11px] leading-[14px] font-semibold tracking-[0.33px] text-brand-dark hover:underline sm:self-auto print:hidden"
        >
          Ver respuestas →
        </Link>
      </div>
    </IndicatorCard>
  )
}
