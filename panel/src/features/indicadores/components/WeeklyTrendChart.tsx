import infoSmallIcon from '../assets/info-small.svg'
import { partesSemana } from '@/lib/semana'
import { cn } from '@/lib/cn'
import { barHeight, chartMax } from '../api'
import { pctText } from '../format'
import { IndicatorCard } from './IndicatorCard'
import type { WeeklyTrendPoint } from '../types'

/** "Semana 39 a 43 (2026)" o, si cruza el año, "Semana 52 (2025) a 2 (2026)". */
function rangeLabel(points: WeeklyTrendPoint[]) {
  const first = partesSemana(points[0]?.semana ?? '')
  const last = partesSemana(points[points.length - 1]?.semana ?? '')
  if (!first || !last) return points.map((point) => point.label).join(', ')
  if (first.numero === last.numero && first.anio === last.anio) return `Semana ${last.numero} (${last.anio})`
  return first.anio === last.anio
    ? `Semanas ${first.numero} a ${last.numero} (${last.anio})`
    : `Semanas ${first.numero} (${first.anio}) a ${last.numero} (${last.anio})`
}

export function WeeklyTrendChart({ points, className }: { points: WeeklyTrendPoint[]; className?: string }) {
  // La barra más alta corresponde al valor más alto real de la serie
  const maxValue = chartMax(points)
  const height = (value: number) => `${barHeight(value, maxValue)}px`
  const inProgress = points.find((point) => point.inProgress)

  return (
    <IndicatorCard className={cn('flex min-w-0 flex-col gap-4', className)}>
      <header className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg leading-6 font-semibold text-ink-strong">Evolución semanal: Envíos vs. Respuestas</h2>
          <p className="text-[13px] leading-[18px] text-muted">{rangeLabel(points)}</p>
        </div>
        <ul className="flex shrink-0 flex-wrap items-center gap-4">
          <LegendItem color="bg-muted" label="Enviados" />
          <LegendItem color="bg-brand-dark" label="Respuestas recibidas" />
        </ul>
      </header>

      <div className="-mx-2 overflow-x-auto px-2 py-4">
        <div className="flex min-w-[520px] flex-col gap-2">
          <ol
            aria-label="Recordatorios enviados y respuestas recibidas por semana"
            className="relative flex h-56 items-end justify-center gap-4 rounded-xl bg-[rgba(238,246,238,0.4)] px-4 pt-6"
          >
            {[40, 112, 176].map((top) => (
              <li
                key={top}
                aria-hidden
                className="pointer-events-none absolute inset-x-4 h-px bg-[rgba(226,234,227,0.6)]"
                style={{ top }}
              />
            ))}
            {points.map((point) => (
              <li
                key={point.semana}
                className={cn(
                  'relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2',
                  point.inProgress && 'rounded-lg bg-[rgba(226,234,227,0.4)] p-1',
                )}
              >
                <div
                  className="flex w-full flex-1 items-end justify-center gap-1.5"
                  title={`${point.label}: ${point.sent} enviados, ${point.responses} respuestas`}
                >
                  <span
                    data-serie="enviados"
                    className={cn(
                      'w-5 rounded-t',
                      point.inProgress ? 'border-2 border-dashed border-[#f4fbf4] bg-muted' : 'bg-[#cdc5c4]',
                    )}
                    style={{ height: height(point.sent) }}
                  />
                  <span
                    data-serie="respuestas"
                    className={cn(
                      'w-5 rounded-t',
                      point.inProgress
                        ? 'bg-brand-dark shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]'
                        : 'bg-[rgba(143,0,23,0.7)]',
                    )}
                    style={{ height: height(point.responses) }}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'text-xs leading-4 tracking-[0.24px] whitespace-nowrap text-ink-strong',
                      point.inProgress ? 'font-bold' : 'font-semibold',
                    )}
                  >
                    {point.label}
                    {point.inProgress && '*'}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] leading-[14px] tracking-[0.33px]',
                      point.inProgress ? 'font-semibold text-brand-dark' : 'font-medium text-muted',
                    )}
                  >
                    {pctText(point.responseRate)}
                  </span>
                </div>
                {point.inProgress && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2b322d] px-2 py-0.5 text-[11px] leading-[14px] font-medium tracking-[0.33px] whitespace-nowrap text-[#ebf3eb] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                    En curso
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className="flex items-start justify-between gap-4 px-2 pt-2">
            {inProgress ? (
              <p className="flex items-start gap-1">
                <img src={infoSmallIcon} alt="" width={10} height={10} className="mt-0.5 shrink-0" />
                <span className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
                  *{inProgress.label} en curso: todavía pueden llegar respuestas a su recordatorio.
                </span>
              </p>
            ) : (
              <span />
            )}
            <p className="max-w-[260px] text-right text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
              Tasa = respuestas ÷ enviados. Las semanas sin envíos no aparecen.
            </p>
          </div>
        </div>
      </div>
    </IndicatorCard>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn('size-3 rounded-full', color)} />
      <span className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">{label}</span>
    </li>
  )
}
