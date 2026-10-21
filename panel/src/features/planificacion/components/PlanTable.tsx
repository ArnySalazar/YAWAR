import { Fragment, useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { CapacitySeparator } from './CapacitySeparator'
import { ChildDetailPanel } from './ChildDetailPanel'
import { ChannelPill, ChildIdentity, ReportSummary, RiskIndicator, SignalBadge } from './PlanCells'
import { RowActions } from './RowActions'
import type { PlannedChild } from '../types'

export interface PlanRowsProps {
  rows: PlannedChild[]
  selectedIds: ReadonlySet<string>
  onToggleSelect: (id: string) => void
  expandedIds: ReadonlySet<string>
  onToggleExpanded: (id: string) => void
  /** Índice (en `rows`) de la última visita antes del corte N; null si no aplica. */
  separatorAfter: number | null
  capacity: number
  whatsappCount: number
}

interface PlanTableProps extends PlanRowsProps {
  allSelected: boolean
  someSelected: boolean
  onToggleSelectAll: (checked: boolean) => void
}

const headers = [
  'Niño / Código / Cuidador',
  'Señal de prioridad',
  'Última respuesta del cuidador',
  'Riesgo de no consumo',
  'Canal asignado',
]

const thClass = 'px-4 align-middle text-[11px] leading-[14px] font-semibold tracking-[0.55px] text-muted uppercase'
const COLUMN_COUNT = 9

export function PlanTable({
  rows,
  selectedIds,
  onToggleSelect,
  expandedIds,
  onToggleExpanded,
  separatorAfter,
  capacity,
  whatsappCount,
  allSelected,
  someSelected,
  onToggleSelectAll,
}: PlanTableProps) {
  const selectAllRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected
  }, [someSelected, allSelected])

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] table-fixed border-collapse text-left">
        <caption className="sr-only">Niños de la semana con canal de seguimiento asignado</caption>
        <colgroup>
          <col />
          <col className="w-[49px]" />
          <col className="w-[230px]" />
          <col className="w-[170px]" />
          <col className="w-[280px]" />
          <col className="w-[150px]" />
          <col className="w-[200px]" />
          <col className="w-[100px]" />
          <col />
        </colgroup>
        <thead>
          <tr className="h-14 bg-chip">
            <th aria-hidden />
            <th className="pr-3 pl-6 align-middle">
              <input
                ref={selectAllRef}
                type="checkbox"
                aria-label="Seleccionar todos los niños filtrados"
                checked={allSelected}
                onChange={(event) => onToggleSelectAll(event.target.checked)}
                className="block size-[13px] accent-brand-dark"
              />
            </th>
            {headers.map((header) => (
              <th key={header} scope="col" className={thClass}>
                {header}
              </th>
            ))}
            <th scope="col" className={cn(thClass, 'text-center')}>
              Acciones
            </th>
            <th aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((child, index) => {
            const expanded = expandedIds.has(child.id)
            return (
              <Fragment key={child.id}>
                <tr
                  className={cn(
                    'border-t border-track transition-colors hover:bg-[#fcfdfc]',
                    expanded && 'bg-[#fcfdfc]',
                    selectedIds.has(child.id) && 'bg-[#fcfdfc]',
                  )}
                >
                  <td aria-hidden />
                  <td className="pr-3 pl-6 align-middle">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${child.code}`}
                      checked={selectedIds.has(child.id)}
                      onChange={() => onToggleSelect(child.id)}
                      className="block size-[13px] accent-brand-dark"
                    />
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <ChildIdentity child={child} />
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <SignalBadge child={child} />
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <ReportSummary child={child} />
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <RiskIndicator child={child} />
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <ChannelPill child={child} />
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <RowActions
                      child={child}
                      expanded={expanded}
                      onToggleDetail={() => onToggleExpanded(child.id)}
                      className="justify-center"
                    />
                  </td>
                  <td aria-hidden />
                </tr>
                {expanded && (
                  <tr className="bg-[#fcfdfc]">
                    <td aria-hidden />
                    <td colSpan={COLUMN_COUNT - 2} className="px-4 pb-4">
                      <ChildDetailPanel child={child} />
                    </td>
                    <td aria-hidden />
                  </tr>
                )}
                {separatorAfter === index && (
                  <tr className="border-t border-track bg-chip">
                    <td colSpan={COLUMN_COUNT} className="px-6 py-[11px]">
                      <CapacitySeparator capacity={capacity} whatsappCount={whatsappCount} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
