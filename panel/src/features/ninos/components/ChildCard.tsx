import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { ChildListItem } from '../types'
import { ResponseBadge, WeeklyActionBadge } from './badges'
import { AgeInfo, CaregiverInfo, ChildIdentity, RowActions } from './ChildCells'
import { Checkbox } from './Checkbox'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-0.5 text-[10px] leading-4 font-bold tracking-[0.5px] text-[#737373] uppercase">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

interface ChildCardProps {
  child: ChildListItem
  loadingResponses: boolean
  selected: boolean
  onToggle: (code: string, checked: boolean) => void
}

/** Versión en tarjeta de una fila del padrón (móvil y vista de cuadrícula). */
export function ChildCard({ child, loadingResponses, selected, onToggle }: ChildCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors',
        selected ? 'border-brand/40 bg-brand-soft/30' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <ChildIdentity child={child} loadingResponses={loadingResponses} />
        <Checkbox
          label={`Seleccionar paciente ${child.code}`}
          checked={selected}
          onChange={(checked) => onToggle(child.code, checked)}
          className="mt-1"
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Edad / Grupo">
          <AgeInfo child={child} />
        </Field>
        <Field label="Cuidador">
          <CaregiverInfo child={child} />
        </Field>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <ResponseBadge response={child.weekResponse} loading={loadingResponses} />
        <WeeklyActionBadge action={child.weeklyAction} />
      </div>

      <div className="mt-auto border-t border-[#f5f5f5] pt-3">
        <RowActions child={child} />
      </div>
    </article>
  )
}
