import { Link } from 'react-router'
import { paths } from '@/routes/paths'
import { cn } from '@/lib/cn'
import { formatAge, formatAgeGroup } from '../format'
import type { ChildListItem } from '../types'
import { PriorityRank, StatusText } from './badges'

/** Posición en la lista + código (enlace a la ficha) + estado de seguimiento. */
export function ChildIdentity({ child, loadingResponses }: { child: ChildListItem; loadingResponses: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <PriorityRank rank={child.priorityRank} status={child.status?.kind} />
      <div className="flex min-w-0 flex-col gap-[0.5px]">
        <Link
          to={paths.fichaNino(child.code)}
          className="text-sm leading-5 font-bold whitespace-nowrap text-ink hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
        >
          {child.code}
        </Link>
        <StatusText status={child.status} loading={loadingResponses} />
      </div>
    </div>
  )
}

export function AgeInfo({ child }: { child: ChildListItem }) {
  return (
    <>
      <p className="text-xs leading-4 font-semibold text-ink">{formatAge(child.ageMonths)}</p>
      <p className="text-[11px] leading-4 text-[#737373]">{formatAgeGroup(child)}</p>
    </>
  )
}

/** Solo el alias del padrón: el panel no muestra nombres ni teléfonos de los cuidadores. */
export function CaregiverInfo({ child }: { child: ChildListItem }) {
  return <p className="text-xs leading-4 font-semibold text-ink">{child.caregiverAlias}</p>
}

/** "Ver ficha" (no hay botón de llamar: la API no devuelve teléfonos). */
export function RowActions({ child, compact = false }: { child: ChildListItem; compact?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        to={paths.fichaNino(child.code)}
        className={cn(
          'rounded-full bg-chip py-1.5 text-center text-xs leading-4 font-semibold text-ink transition-colors hover:bg-[#e6e9e7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          compact ? 'w-[65px] px-[17.5px]' : 'px-4 whitespace-nowrap',
        )}
      >
        Ver ficha<span className="sr-only"> de {child.code}</span>
      </Link>
    </div>
  )
}
