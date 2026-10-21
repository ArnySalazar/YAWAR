import { Skeleton } from '@/components/ui/AsyncContent'
import { cn } from '@/lib/cn'
import type { ChildrenListResponse, SortField, SortOrder } from '../types'
import { ChildCard } from './ChildCard'
import { ChildrenPagination } from './ChildrenPagination'
import { ChildrenTable, type SelectionProps } from './ChildrenTable'
import { Checkbox } from './Checkbox'
import type { ListView } from './ChildrenToolbar'

interface ChildrenListProps extends SelectionProps {
  data: ChildrenListResponse
  /** El historial de respuestas aún está cargando. */
  loadingResponses: boolean
  view: ListView
  sort: SortField | null
  order: SortOrder
  onSort: (field: SortField) => void
  onPageChange: (page: number) => void
  onClearFilters: () => void
}

/** Tabla (escritorio) o tarjetas (móvil / vista de cuadrícula) + pie con paginación. */
export function ChildrenList({
  data,
  loadingResponses,
  view,
  sort,
  order,
  onSort,
  onPageChange,
  onClearFilters,
  selected,
  onToggle,
  onToggleAll,
}: ChildrenListProps) {
  const { items } = data
  const selectedOnPage = items.filter((child) => selected.has(child.code)).length
  const allSelected = items.length > 0 && selectedOnPage === items.length

  return (
    <section
      aria-label="Listado de niños en seguimiento"
      aria-busy={loadingResponses}
      className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No se encontraron niños con los filtros seleccionados.</p>
          <p className="max-w-md text-xs leading-5 text-[#737373]">
            Pruebe con otro código o alias del cuidador, o limpie los filtros para ver todo el padrón.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-full bg-ink px-4 py-1.5 text-xs leading-4 font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div>
          {view === 'list' && (
            <div className="hidden overflow-x-auto xl:block">
              <ChildrenTable
                items={items}
                loadingResponses={loadingResponses}
                sort={sort}
                order={order}
                onSort={onSort}
                selected={selected}
                onToggle={onToggle}
                onToggleAll={onToggleAll}
              />
            </div>
          )}

          <div className={cn('bg-[#fafbfa] p-4', view === 'list' && 'xl:hidden')}>
            <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-xs leading-4 font-semibold text-[#737373]">
              <Checkbox
                label="Seleccionar todos los registros"
                checked={allSelected}
                indeterminate={selectedOnPage > 0 && !allSelected}
                onChange={onToggleAll}
              />
              Seleccionar todos
            </label>
            <div
              className={cn(
                'grid grid-cols-1 gap-4 sm:grid-cols-2',
                view === 'grid' && 'lg:grid-cols-3 2xl:grid-cols-4',
              )}
            >
              {items.map((child) => (
                <ChildCard
                  key={child.code}
                  child={child}
                  loadingResponses={loadingResponses}
                  selected={selected.has(child.code)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ChildrenPagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          selectedCount={selected.size}
          onPageChange={onPageChange}
        />
      )}
    </section>
  )
}

export function ChildrenListSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-line bg-white p-4" aria-busy>
      <Skeleton className="h-12 rounded-xl" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-16 rounded-xl" />
      ))}
    </div>
  )
}
