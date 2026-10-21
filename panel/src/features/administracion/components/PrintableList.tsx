import { useEffect } from 'react'
import { cn } from '@/lib/cn'
import { pluralize } from '../lib/format'
import type { PrintableRow } from '../types'

const COLUMNS: Array<{ label: string; className?: string }> = [
  { label: 'N.º', className: 'w-[5%] text-center' },
  { label: 'Código', className: 'w-[9%]' },
  { label: 'Cuidador (alias)', className: 'w-[15%]' },
  { label: 'Edad', className: 'w-[8%]' },
  { label: 'Acción', className: 'w-[9%]' },
  { label: 'Motivos' },
  { label: 'Visitado / Observaciones', className: 'w-[28%]' },
]

const CELL = 'border border-[#9ca3af] px-2 py-1.5 text-left align-top'

/**
 * Hoja A4 vertical con márgenes de 12 mm. La regla @page se agrega solo mientras se imprime (antes
 * de imprimir y se quita al terminar), para no afectar otras pantallas.
 */
function usePrintPageSize() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '@page { size: A4 portrait; margin: 12mm; }'
    const add = () => document.head.appendChild(style)
    const remove = () => style.remove()
    window.addEventListener('beforeprint', add)
    window.addEventListener('afterprint', remove)
    return () => {
      window.removeEventListener('beforeprint', add)
      window.removeEventListener('afterprint', remove)
      remove()
    }
  }, [])
}

interface PrintableListProps {
  rows: PrintableRow[]
  establishment: string
  /** "Semana 43 · 19 – 25 oct 2026" */
  weekLabel: string
  /** "21/10/2026" (fecha del servidor). */
  printedOn: string
}

/**
 * Hoja A4 de la lista de la semana (plan B en campo): se ve como vista previa y es lo único que sale
 * al imprimir desde el paso 3. Sin teléfonos: solo código, alias, edad, acción y motivos, con una
 * columna en blanco para anotar a mano.
 */
export function PrintableList({ rows, establishment, weekLabel, printedOn }: PrintableListProps) {
  const visits = rows.filter((row) => row.action === 'Visita').length
  usePrintPageSize()

  return (
    <div className="w-full overflow-x-auto rounded-[12px] border border-line bg-white shadow-[0px_8px_24px_0px_rgba(35,31,31,0.05)] print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      <article
        aria-label={`Lista para imprimir de ${establishment}`}
        className="mx-auto w-full max-w-[210mm] min-w-[720px] p-6 text-ink sm:p-8 print:max-w-none print:min-w-0 print:p-0"
      >
        <header className="flex items-end justify-between gap-4 border-b-2 border-ink pb-2">
          <div className="min-w-0">
            <p className="text-[11px] leading-[14px] font-semibold tracking-[0.55px] text-[#5b5858] uppercase">
              YAWAR CRED · Lista de seguimiento semanal
            </p>
            <h3 className="text-[18px] leading-6 font-bold">
              Establecimiento {establishment} · {weekLabel}
            </h3>
          </div>
          <p className="shrink-0 text-right text-[11px] leading-[14px] text-[#5b5858]">
            {pluralize(visits, 'visita', 'visitas')} · {rows.length - visits} por WhatsApp
            <br />
            Impreso el {printedOn}
          </p>
        </header>

        <table className="mt-3 w-full border-collapse text-[11px] leading-[14px]">
          <caption className="sr-only">Lista de la semana para visitas y observaciones</caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.label} scope="col" className={cn(CELL, 'bg-chip font-bold', column.className)}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="break-inside-avoid">
                <td className={cn(CELL, 'text-center')}>{row.order}</td>
                <th scope="row" className={cn(CELL, 'font-semibold whitespace-nowrap')}>
                  {row.code}
                </th>
                <td className={CELL}>{row.caregiverAlias}</td>
                <td className={cn(CELL, 'whitespace-nowrap')}>{row.ageMonths} meses</td>
                <td className={cn(CELL, row.action === 'Visita' && 'font-semibold')}>{row.action}</td>
                <td className={CELL}>{row.reasons}</td>
                <td className={cn(CELL, 'h-10')} />
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-3 text-[10px] leading-[13px] text-[#5b5858]">
          Uso interno del establecimiento. Sin teléfonos ni datos personales: solo el código del niño y el alias del
          cuidador. YAWAR sugiere el orden; la decisión final es del personal de salud.
        </footer>
      </article>
    </div>
  )
}
