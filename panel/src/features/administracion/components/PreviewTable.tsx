import { Skeleton } from '@/components/ui/AsyncContent'
import { cn } from '@/lib/cn'
import type { PreviewRecord } from '../types'

const COLUMNS: Array<{ label: string; align: 'left' | 'center' | 'right' }> = [
  { label: 'ID Niño', align: 'left' },
  { label: 'Establecimiento', align: 'left' },
  { label: 'Alias Cuidador', align: 'left' },
  { label: 'Contacto Móvil', align: 'left' },
  { label: 'Edad (meses)', align: 'center' },
  { label: 'Área / Altitud', align: 'left' },
  { label: 'Controles CRED', align: 'center' },
  { label: 'Última Entrega', align: 'left' },
  { label: 'Estado Sintáctico', align: 'right' },
]

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

interface PreviewTableProps {
  /** undefined = cargando. */
  records: PreviewRecord[] | undefined
  emptyMessage: string
  caption: string
}

/** Tabla de vista previa local (se desplaza en horizontal dentro de su propio contenedor). */
export function PreviewTable({ records, emptyMessage, caption }: PreviewTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-[12px] border border-line bg-white">
      <table className="w-full min-w-[980px] border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-chip">
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cn(
                  'h-14 px-4 py-3 align-middle text-[12px] leading-4 font-bold tracking-[0.24px] text-ink',
                  ALIGN[column.align],
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {records === undefined ? (
            Array.from({ length: 4 }, (_, index) => (
              <tr key={index}>
                <td colSpan={COLUMNS.length} className="px-4 py-3">
                  <Skeleton className="h-9 w-full rounded-[8px]" />
                </td>
              </tr>
            ))
          ) : records.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-[13px] leading-[18px] text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            records.map((record) => <PreviewRow key={`${record.rowNumber}-${record.childId}`} record={record} />)
          )}
        </tbody>
      </table>
    </div>
  )
}

function PreviewRow({ record }: { record: PreviewRecord }) {
  const cell = 'px-4 py-3 align-middle text-[13px] leading-[18px]'
  const empty = '—'

  return (
    <tr>
      <th scope="row" className={cn(cell, 'text-left font-semibold whitespace-nowrap text-brand')}>
        {record.childId || empty}
      </th>
      <td className={cn(cell, 'text-ink')}>{record.establishment || empty}</td>
      <td className={cn(cell, 'text-ink')}>{record.caregiverAlias || empty}</td>
      <td className={cn(cell, 'font-mono whitespace-nowrap text-muted')}>{record.maskedPhone || empty}</td>
      <td className={cn(cell, 'text-center font-semibold text-ink')}>{record.ageMonths || empty}</td>
      <td className={cn(cell, 'text-muted')}>
        {[record.area, record.altitude && `${record.altitude} msnm`].filter(Boolean).join(' · ') || empty}
      </td>
      <td className={cn(cell, 'text-center font-semibold text-ink')}>{record.credControls || empty}</td>
      <td className={cn(cell, 'whitespace-nowrap text-ink')}>{record.lastIronDelivery || empty}</td>
      <td className={cn(cell, 'text-right')}>
        <SyntaxBadge valid={record.valid} />
      </td>
    </tr>
  )
}

function SyntaxBadge({ valid }: { valid: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] leading-[14px] font-semibold tracking-[0.33px] whitespace-nowrap',
        valid ? 'border-success/20 bg-[#e6f4eb] text-success' : 'border-brand/20 bg-brand-soft text-brand',
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', valid ? 'bg-success' : 'bg-brand')} />
      {valid ? 'Válido' : 'Inválido'}
    </span>
  )
}
