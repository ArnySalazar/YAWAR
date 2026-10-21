import { cn } from '@/lib/cn'
import chevronLeftIcon from '../assets/icon-chevron-left.svg'
import chevronRightIcon from '../assets/icon-chevron-right.svg'

interface ChildrenPaginationProps {
  page: number
  pageSize: number
  total: number
  selectedCount: number
  onPageChange: (page: number) => void
}

/** Páginas visibles: 1 2 3 … 19 · 1 … 7 8 9 … 19 · 1 … 17 18 19 */
function pageItems(page: number, totalPages: number): Array<number | 'ellipsis-start' | 'ellipsis-end'> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (page <= 3) return [1, 2, 3, 'ellipsis-end', totalPages]
  if (page >= totalPages - 2) return [1, 'ellipsis-start', totalPages - 2, totalPages - 1, totalPages]
  return [1, 'ellipsis-start', page - 1, page, page + 1, 'ellipsis-end', totalPages]
}

const navButton =
  'flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-chip focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

export function ChildrenPagination({ page, pageSize, total, selectedCount, onPageChange }: ChildrenPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col items-center gap-3 border-t border-line px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
      <p className="text-center text-xs leading-4 text-[#737373] sm:text-left" aria-live="polite">
        Mostrando <span className="font-semibold text-ink">{from}</span>–
        <span className="font-semibold text-ink">{to}</span> de <span className="font-semibold text-ink">{total}</span>{' '}
        niños en el padrón nominal
        {selectedCount > 0 && ` · ${selectedCount} seleccionado${selectedCount === 1 ? '' : 's'}`}
      </p>

      {totalPages > 1 && (
        <nav aria-label="Paginación del listado" className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={navButton}
          >
            <img src={chevronLeftIcon} alt="" width={16} height={16} />
          </button>
          {pageItems(page, totalPages).map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
                onClick={() => onPageChange(item)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg text-xs leading-4 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  item === page ? 'bg-ink text-white' : 'text-[#525252] hover:bg-chip',
                )}
              >
                {item}
              </button>
            ) : (
              <span key={item} aria-hidden className="px-1 text-xs leading-4 text-[#a3a3a3]">
                …
              </span>
            ),
          )}
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={navButton}
          >
            <img src={chevronRightIcon} alt="" width={16} height={16} />
          </button>
        </nav>
      )}
    </div>
  )
}
