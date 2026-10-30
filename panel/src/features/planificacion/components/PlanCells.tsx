import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import { paths } from '@/routes/paths'
import homePinIcon from '../assets/home-pin.svg'
import chatSmallIcon from '../assets/chat-lines-small.svg'
import { avatarTone, caregiverLine, channelLabel, reportWhen, riskPct, signalBadgeText, signalTone } from '../utils'
import type { PlannedChild } from '../types'

export function ChildIdentity({ child }: { child: PlannedChild }) {
  const isVisit = child.assignment.channel === 'home_visit'
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        title={`Prioridad ${child.priorityRank}`}
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] leading-[18px] font-semibold',
          avatarTone(child),
        )}
      >
        {child.priorityRank}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            to={paths.fichaNino(child.code)}
            className={cn(
              'text-[12px] leading-4 font-semibold tracking-[0.24px] whitespace-nowrap hover:underline',
              isVisit ? 'text-brand-dark' : 'text-ink-strong',
            )}
          >
            {child.code}
          </Link>
          {child.inAnemiaTreatment && (
            <span className="inline-flex items-center rounded-full bg-track px-2.5 py-1 text-[11px] leading-[14px] font-semibold text-nav-ink">
              En tratamiento
            </span>
          )}
        </div>
        <p className="text-[13px] leading-[18px] text-muted">{caregiverLine(child)}</p>
      </div>
    </div>
  )
}

export function SignalBadge({ child }: { child: PlannedChild }) {
  const tone = signalTone[child.signal.kind]
  return (
    <span
      className={cn(
        'inline-flex max-w-[150px] items-center gap-1 rounded-full px-2.5 py-1 text-[11px] leading-[14px] font-semibold',
        tone.badge,
      )}
    >
      {tone.dot && <span aria-hidden className={cn('h-1.5 w-[3px] shrink-0 rounded-full', tone.dot)} />}
      <span>{signalBadgeText(child)}</span>
    </span>
  )
}

/** Última respuesta del cuidador según su historial (incluye la de esta semana, si ya respondió). */
export function ReportSummary({ child }: { child: PlannedChild }) {
  if (child.lastReport === undefined) {
    return <p className="text-[11px] leading-[14px] text-muted">Cargando respuestas…</p>
  }
  if (child.lastReport === null) {
    return <p className="text-[13px] leading-[18px] text-muted">Sin respuestas registradas</p>
  }
  return (
    <div className="flex flex-col gap-[3px]">
      <p className="text-[13px] leading-[18px] font-medium text-ink-strong">{child.lastReport.text}</p>
      <p className="text-[11px] leading-[14px] text-muted">{reportWhen(child.lastReport)}</p>
    </div>
  )
}

export function RiskIndicator({ child }: { child: PlannedChild }) {
  const pct = riskPct(child)
  return (
    <div className="flex items-center gap-2" title={`Probabilidad estimada de no consumo: ${pct}%`}>
      <span
        role="meter"
        aria-label="Probabilidad estimada de no consumo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-chip"
      >
        <span className={cn('block h-full rounded-full', signalTone[child.signal.kind].bar)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[12px] leading-4 font-bold tracking-[0.24px] text-ink-strong">{pct}%</span>
    </div>
  )
}

export function ChannelPill({ child }: { child: PlannedChild }) {
  const isVisit = child.assignment.channel === 'home_visit'
  return (
    <span
      className={cn(
        'inline-flex max-w-[160px] items-center gap-1 rounded-full px-3 py-1 text-[11px] leading-[14px] font-bold tracking-[0.33px] uppercase',
        isVisit ? 'bg-[#ffdad7] text-[#410005]' : 'bg-chip text-ink-strong',
      )}
    >
      {isVisit ? (
        <img src={homePinIcon} alt="" width={8} height={10} className="shrink-0" />
      ) : (
        <img src={chatSmallIcon} alt="" width={10} height={10} className="shrink-0" />
      )}
      <span>{channelLabel(child.assignment)}</span>
    </span>
  )
}
