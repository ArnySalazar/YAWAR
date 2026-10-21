import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Skeleton } from '@/components/ui/AsyncContent'
import { etiquetaSemana } from '@/lib/semana'
import warningIcon from '../assets/icon-warning-triangle.svg'
import problemIcon from '../assets/icon-kpi-problem.svg'
import clockIcon from '../assets/icon-clock.svg'
import { formatRate } from '../presentation'
import type { ResponseCounts, ResponseType, WeekSummary } from '../types'
import { cardClass } from './ResponseParts'

const gridClass = 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'

interface KpiCardProps {
  label: string
  /** undefined mientras cargan los historiales; null si no se pudieron cargar. */
  value: number | null | undefined
  valueClass?: string
  suffix: string
  suffixClass?: string
  badge: ReactNode
  footer: ReactNode
}

function KpiCard({ label, value, valueClass, suffix, suffixClass, badge, footer }: KpiCardProps) {
  return (
    <article className={cn(cardClass, 'flex min-w-0 flex-col justify-between gap-4 p-6')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[11px] font-medium uppercase leading-[14px] tracking-[0.55px] text-muted">{label}</h2>
          <p className="flex flex-wrap items-baseline gap-x-2 pt-1">
            <span
              aria-busy={value === undefined}
              className={cn('text-[32px] font-bold leading-10', valueClass ?? 'text-ink-strong')}
            >
              {value === undefined ? '…' : (value ?? '—')}
            </span>
            <span className={cn('text-[13px] leading-[18px]', suffixClass ?? 'text-muted')}>{suffix}</span>
          </p>
        </div>
        {badge}
      </div>
      {footer}
    </article>
  )
}

function Badge({ children, className, dotClass }: { children: ReactNode; className: string; dotClass?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] leading-[14px] tracking-[0.33px]',
        className,
      )}
    >
      {dotClass && <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', dotClass)} />}
      {children}
    </span>
  )
}

function IconCaption({ icon, width, height, children }: { icon: string; width: number; height: number; children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[13px] leading-[18px] text-muted">
      <img src={icon} alt="" width={width} height={height} className="shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </p>
  )
}

interface KpiCardsProps {
  /** Contactados y respondidos de los indicadores (todo el establecimiento). */
  summary: WeekSummary
  /** Conteos de los historiales (niños de la lista actual); undefined mientras cargan, null si fallaron. */
  counts: ResponseCounts | null | undefined
  /** Niños de la lista actual sin registro en la semana. */
  withoutRecord: number | undefined
}

export function KpiCards({ summary, counts, withoutRecord }: KpiCardsProps) {
  const rate = summary.responseRate === null ? 0 : Math.min(100, Math.max(0, summary.responseRate * 100))
  const semana = etiquetaSemana(summary.semana).replace('Semana', 'Sem.')
  const countOf = (type: ResponseType) => (counts === null ? null : counts?.[type])

  return (
    <section aria-label="Indicadores de respuesta de la semana" className="flex flex-col gap-2">
      <div className={gridClass}>
        <KpiCard
          label="Respuestas recibidas"
          value={summary.responded}
          suffix={`/ ${summary.contacted} contactados`}
          badge={<Badge className="bg-[#e8f0e8] font-medium text-muted">{semana}</Badge>}
          footer={
            <div className="flex flex-col gap-1.5">
              <div
                role="progressbar"
                aria-label="Tasa de respuesta"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(rate)}
                className="h-1.5 overflow-hidden rounded-full bg-[#e8f0e8]"
              >
                <div className="h-full rounded-full bg-ink-strong" style={{ width: `${rate}%` }} />
              </div>
              <p className="text-[11px] font-medium leading-[14px] tracking-[0.33px] text-muted">
                {summary.responseRate === null
                  ? 'Sin recordatorios enviados en la semana'
                  : `${formatRate(summary.responseRate)} de tasa de respuesta`}
              </p>
            </div>
          }
        />
        <KpiCard
          label="Reportaron no consumo"
          value={countOf('no_consumo')}
          suffix="cuidadores"
          badge={
            <Badge className="bg-[#ffddb3] font-semibold text-[#291800]" dotClass="bg-[#603e00]">
              Advertencia
            </Badge>
          }
          footer={
            <IconCaption icon={warningIcon} width={14.667} height={12.667}>
              Respondieron «No le di»
            </IconCaption>
          }
        />
        <KpiCard
          label="Reportaron problema"
          value={countOf('problema')}
          valueClass="text-brand"
          suffix="cuidadores"
          badge={
            <Badge className="bg-[#ffdad6] font-semibold text-[#93000a]" dotClass="bg-[#ba1a1a]">
              Alerta
            </Badge>
          }
          footer={
            <IconCaption icon={problemIcon} width={14.667} height={12.667}>
              Respondieron «Tuve un problema»
            </IconCaption>
          }
        />
        <KpiCard
          label="Sin respuesta"
          value={countOf('sin_respuesta')}
          valueClass="text-muted"
          suffix="cuidadores"
          badge={<Badge className="bg-[#e2eae3] font-medium text-muted">Pendiente</Badge>}
          footer={
            <IconCaption icon={clockIcon} width={13.333} height={13.333}>
              Sin respuesta registrada en la semana
            </IconCaption>
          }
        />
      </div>
      {counts !== null && (
        <p className="text-[11px] font-medium leading-[14px] tracking-[0.33px] text-muted">
          Contactados y respondidos: todo el establecimiento. «No le di», «Tuve un problema» y «Sin respuesta»: los{' '}
          {counts?.total ?? '…'} niños de la lista actual con registro en la semana
          {withoutRecord ? ` (${withoutRecord} sin registro)` : ''}.
        </p>
      )}
    </section>
  )
}

export function KpiCardsSkeleton() {
  return (
    <div className={gridClass} aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-[150px] rounded-[12px]" />
      ))}
    </div>
  )
}
