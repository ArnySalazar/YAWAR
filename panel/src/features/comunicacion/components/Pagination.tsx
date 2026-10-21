import { cn } from '@/lib/cn'
import chevronLeftIcon from '../assets/icon-chevron-left.svg'
import chevronRightIcon from '../assets/icon-chevron-right.svg'
import { cardClass } from './ResponseParts'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/** Muestra como máximo 3 números de página alrededor de la actual (como en el Figma: 1 2 3). */
function visiblePages(page: number, totalPages: number) {
  const start = Math.max(1, Math.min(page - 1, totalPages - 2))
  const end = Math.min(totalPages, start + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

const arrowClass =
  'flex size-8 items-center justify-center rounded-full transition-colors hover:bg-chip disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand'

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="pt-1">
      <div className={cn(cardClass, 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2')}>
        <p className="text-[13px] leading-[18px] text-muted" aria-live="polite">
          Mostrando {from}-{to} de {total} registros
        </p>
        <nav aria-label="Paginación de respuestas" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={arrowClass}
          >
            <img src={chevronLeftIcon} alt="" width={5.55} height={9} />
          </button>
          {visiblePages(page, totalPages).map((value) => {
            const current = value === page
            return (
              <button
                key={value}
                type="button"
                aria-label={`Página ${value}`}
                aria-current={current ? 'page' : undefined}
                onClick={() => onPageChange(value)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-center text-[11px] leading-[14px] tracking-[0.33px] transition-colors focus-visible:outline-2 focus-visible:outline-brand',
                  current ? 'bg-[#2b322d] font-semibold text-[#ebf3eb]' : 'font-medium text-muted hover:bg-chip',
                )}
              >
                {value}
              </button>
            )
          })}
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={arrowClass}
          >
            <img src={chevronRightIcon} alt="" width={5.55} height={9} />
          </button>
        </nav>
      </div>
    </div>
  )
}
