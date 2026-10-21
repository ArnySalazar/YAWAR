import { cn } from '@/lib/cn'
import type { ChildListItem, SortField, SortOrder } from '../types'
import { ResponseBadge, WeeklyActionBadge } from './badges'
import { AgeInfo, CaregiverInfo, ChildIdentity, RowActions } from './ChildCells'
import { Checkbox } from './Checkbox'
import sortIcon from '../assets/icon-sort.svg'

export interface SelectionProps {
  selected: ReadonlySet<string>
  onToggle: (code: string, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
}

interface ChildrenTableProps extends SelectionProps {
  items: ChildListItem[]
  /** El historial de respuestas aún está cargando. */
  loadingResponses: boolean
  sort: SortField | null
  order: SortOrder
  onSort: (field: SortField) => void
}

const th =
  'py-[14px] text-left align-middle text-[11px] leading-[16.5px] font-bold tracking-[0.55px] text-[#737373] uppercase'
const td = 'px-3 py-4 align-middle'

function SortableHeader({
  field,
  label,
  sort,
  order,
  onSort,
  className,
}: {
  field: SortField
  label: string
  sort: SortField | null
  order: SortOrder
  onSort: (field: SortField) => void
  className?: string
}) {
  const active = sort === field
  return (
    <th
      scope="col"
      aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(th, className)}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap uppercase transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-brand',
          active && 'text-ink',
        )}
      >
        {label}
        <img src={sortIcon} alt="" width={12} height={12} className={cn(active && 'brightness-50')} />
        <span className="sr-only">
          {active ? (order === 'asc' ? ', orden ascendente' : ', orden descendente') : ', ordenar'}
        </span>
      </button>
    </th>
  )
}

export function ChildrenTable({
  items,
  loadingResponses,
  sort,
  order,
  onSort,
  selected,
  onToggle,
  onToggleAll,
}: ChildrenTableProps) {
  const selectedOnPage = items.filter((child) => selected.has(child.code)).length
  const allSelected = items.length > 0 && selectedOnPage === items.length

  return (
    <table className="w-full min-w-[880px] border-collapse">
      <caption className="sr-only">Niños en seguimiento del padrón nominal</caption>
      <thead>
        <tr className="border-b border-line bg-[#fafbfa]">
          <th scope="col" className={cn(th, 'w-[52px] pr-3 pl-6')}>
            <Checkbox
              label="Seleccionar todos los registros"
              checked={allSelected}
              indeterminate={selectedOnPage > 0 && !allSelected}
              onChange={onToggleAll}
            />
          </th>
          <SortableHeader
            field="code"
            label="Código & Estado"
            sort={sort}
            order={order}
            onSort={onSort}
            className="px-3"
          />
          <SortableHeader
            field="age"
            label="Edad / Grupo"
            sort={sort}
            order={order}
            onSort={onSort}
            className="pr-3 pl-6"
          />
          <th scope="col" className={cn(th, 'px-3')}>
            Cuidador
          </th>
          <th scope="col" className={cn(th, 'px-3')}>
            Respuesta de la semana
          </th>
          <th scope="col" className={cn(th, 'px-3')}>
            Acción semanal
          </th>
          <th scope="col" className={cn(th, 'pr-6 pl-3 text-right')}>
            Acción
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {items.map((child) => {
          const isSelected = selected.has(child.code)
          return (
            <tr
              key={child.code}
              className={cn('transition-colors', isSelected ? 'bg-brand-soft/40' : 'hover:bg-[#fafbfa]')}
            >
              <td className="py-4 pr-3 pl-6 align-middle">
                <Checkbox
                  label={`Seleccionar paciente ${child.code}`}
                  checked={isSelected}
                  onChange={(checked) => onToggle(child.code, checked)}
                />
              </td>
              <td className={cn(td, 'min-w-[157px]')}>
                <ChildIdentity child={child} loadingResponses={loadingResponses} />
              </td>
              <td className="py-4 pr-3 pl-6 align-middle">
                <AgeInfo child={child} />
              </td>
              <td className={cn(td, 'min-w-[127px]')}>
                <CaregiverInfo child={child} />
              </td>
              <td className={td}>
                <ResponseBadge response={child.weekResponse} loading={loadingResponses} />
              </td>
              <td className={td}>
                <WeeklyActionBadge action={child.weeklyAction} />
              </td>
              <td className="py-4 pr-6 pl-3 align-middle">
                <RowActions child={child} compact />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
