import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import { paths } from '@/routes/paths'
import { describeNextAction, riskPct, type ActionIcon } from '../utils'
import type { PrioritizedChild, PriorityRule } from '../types'
import { RowActionsMenu } from './RowActionsMenu'
import walkIcon from '../assets/icon-visit-walk.svg'
import chatSmallIcon from '../assets/icon-chat-small.svg'

/** Colores por regla: franja lateral, círculo de orden, pastilla y barra de riesgo (tonos del Figma). */
const RULE_STYLES: Record<PriorityRule, { stripe: string; rank: string; badge: string; dot: string | null; bar: string }> = {
  R1: {
    stripe: 'shadow-[inset_6px_0_0_#b81025]',
    rank: 'bg-[#ffdad6] text-[#93000a]',
    badge: 'bg-[#ffdad6] text-[#93000a]',
    dot: 'bg-brand',
    bar: 'bg-brand',
  },
  R2: {
    stripe: 'shadow-[inset_6px_0_0_#7f5300]',
    rank: 'bg-[#ffddb3] text-[#603e00]',
    badge: 'bg-[#ffddb3] text-[#603e00]',
    dot: 'bg-[#603e00]',
    bar: 'bg-[#603e00]',
  },
  R3: {
    stripe: 'shadow-[inset_6px_0_0_#906f6d]',
    rank: 'bg-track text-ink',
    badge: 'bg-chip text-ink-strong',
    dot: null,
    bar: 'bg-[#906f6d]',
  },
}

const ACTION_ICONS: Record<ActionIcon, { src: string; width: number; height: number }> = {
  walk: { src: walkIcon, width: 7.583, height: 12.542 },
  chat: { src: chatSmallIcon, width: 11.667, height: 11.667 },
}

/** Una fila de la lista: código, edad, motivo de prioridad, alias del cuidador, acción y riesgo. */
export function PrioritizedChildRow({ child }: { child: PrioritizedChild }) {
  const styles = RULE_STYLES[child.rule]
  const action = describeNextAction(child.nextAction)
  const actionIcon = ACTION_ICONS[action.icon]
  const pct = riskPct(child)

  return (
    <li
      className={cn(
        'relative flex flex-col gap-3 rounded-xl bg-canvas py-4 pr-3 pl-4 transition-colors sm:pr-4 sm:pl-5 hover:bg-[#f2f4f3] sm:flex-row sm:items-center sm:justify-between',
        styles.stripe,
      )}
    >
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        {/* Sin fotos de niños: el círculo muestra el puesto en la lista */}
        <span
          aria-hidden
          title={`Prioridad ${child.rank}`}
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold leading-[18px]',
            styles.rank,
          )}
        >
          {child.rank}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={paths.fichaNino(child.code)}
              aria-label={`Ver ficha del niño ${child.code}`}
              className="text-sm font-bold leading-5 text-ink after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-brand"
            >
              {child.code}
            </Link>
            <span className="text-[13px] leading-[18px] text-muted">· {child.ageMonths} meses</span>
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-[14px] tracking-[0.33px]',
                styles.badge,
              )}
            >
              {styles.dot && <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', styles.dot)} />}
              {child.signalLabel} ({child.rule})
            </span>
          </div>
          <p className="pt-1 text-[13px] leading-[18px] text-ink-strong">{child.statusText}</p>
          <div className="flex flex-col items-start gap-x-3 gap-y-0.5 pt-0.5 text-[13px] leading-[18px] sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-muted">{child.caregiverAlias}</span>
            <span aria-hidden className="hidden text-muted sm:inline">
              ·
            </span>
            <span className="flex items-center gap-1 font-medium text-ink">
              <img src={actionIcon.src} alt="" width={actionIcon.width} height={actionIcon.height} className="shrink-0" />
              {action.label}
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-3 self-end sm:self-auto">
        <div className="flex flex-col items-end gap-1" title={`Probabilidad estimada de no consumo: ${pct}%`}>
          <span className="text-[11px] font-medium leading-[14px] tracking-[0.33px] text-muted">Riesgo</span>
          <div className="flex items-center gap-2">
            <span
              role="meter"
              aria-label={`Probabilidad estimada de no consumo de ${child.code}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-track"
            >
              <span className={cn('block h-full rounded-full', styles.bar)} style={{ width: `${pct}%` }} />
            </span>
            <span className="text-xs font-bold leading-4 tracking-[0.24px] text-ink-strong">{pct}%</span>
          </div>
        </div>
        <RowActionsMenu childCode={child.code} />
      </div>
    </li>
  )
}
