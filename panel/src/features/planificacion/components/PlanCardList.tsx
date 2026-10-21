import { Fragment } from 'react'
import { cn } from '@/lib/cn'
import { CapacitySeparator } from './CapacitySeparator'
import { ChildDetailPanel } from './ChildDetailPanel'
import { ChannelPill, ChildIdentity, ReportSummary, RiskIndicator, SignalBadge } from './PlanCells'
import { RowActions } from './RowActions'
import type { PlanRowsProps } from './PlanTable'

/** Vista de tarjetas: se usa en celular y cuando se elige la vista de cuadrícula. */
export function PlanCardList({
  rows,
  selectedIds,
  onToggleSelect,
  expandedIds,
  onToggleExpanded,
  separatorAfter,
  capacity,
  whatsappCount,
}: PlanRowsProps) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((child, index) => {
        const expanded = expandedIds.has(child.id)
        return (
          <Fragment key={child.id}>
            <li
              className={cn(
                'flex min-w-0 flex-col gap-3 rounded-[16px] border border-line p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)]',
                expanded || selectedIds.has(child.id) ? 'bg-[#fcfdfc]' : 'bg-white',
                expanded && 'sm:col-span-2 xl:col-span-3',
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${child.code}`}
                  checked={selectedIds.has(child.id)}
                  onChange={() => onToggleSelect(child.id)}
                  className="mt-[14px] block size-[13px] shrink-0 accent-brand-dark"
                />
                <div className="min-w-0 flex-1">
                  <ChildIdentity child={child} />
                </div>
                <RowActions
                  child={child}
                  expanded={expanded}
                  onToggleDetail={() => onToggleExpanded(child.id)}
                  className="shrink-0"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SignalBadge child={child} />
                <ChannelPill child={child} />
              </div>
              <ReportSummary child={child} />
              <RiskIndicator child={child} />
              {expanded && <ChildDetailPanel child={child} />}
            </li>
            {separatorAfter === index && (
              <li className="rounded-[12px] bg-chip px-3 py-[11px] sm:col-span-2 xl:col-span-3">
                <CapacitySeparator capacity={capacity} whatsappCount={whatsappCount} />
              </li>
            )}
          </Fragment>
        )
      })}
    </ul>
  )
}
