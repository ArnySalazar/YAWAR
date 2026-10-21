import { cn } from '@/lib/cn'
import chevronLeftIcon from '../assets/chevron-left.svg'
import chevronRightIcon from '../assets/chevron-right.svg'

interface PaginationProps {
  page: number
  pageCount: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
}

/** Páginas visibles: todas si son pocas; si no 1 2 3 … última (con la actual siempre visible). */
function visiblePages(page: number, pageCount: number): Array<number | 'gap'> {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages = new Set([1, 2, 3, page, pageCount])
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  const result: Array<number | 'gap'> = []
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) result.push('gap')
    result.push(p)
  })
  return result
}

const squareButton =
  'flex size-8 items-center justify-center rounded-full text-[12px] leading-4 font-semibold tracking-[0.24px] transition-colors disabled:cursor-not-allowed disabled:opacity-40'

export function Pagination({ page, pageCount, pageSize, totalItems, onPageChange }: PaginationProps) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <nav
      aria-label="Paginación de niños"
      className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden"
    >
      <p className="text-[13px] leading-[18px] text-muted">
        Mostrando {from}–{to} de {totalItems} niños
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(squareButton, 'hover:bg-chip')}
        >
          <img src={chevronLeftIcon} alt="" width={4.93333} height={8} />
        </button>
        {visiblePages(page, pageCount).map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} aria-hidden className="px-1 text-[12px] leading-4 text-muted">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Página ${item}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                squareButton,
                item === page ? 'bg-[#2b322d] text-[#ebf3eb]' : 'text-nav-ink hover:bg-chip',
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Página siguiente"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className={cn(squareButton, 'hover:bg-chip')}
        >
          <img src={chevronRightIcon} alt="" width={4.93333} height={8} />
        </button>
      </div>
    </nav>
  )
}
