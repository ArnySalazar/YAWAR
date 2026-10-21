import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { AsyncContent } from '@/components/ui/AsyncContent'
import { paths } from '@/routes/paths'
import { ChildrenList, ChildrenListSkeleton } from './components/ChildrenList'
import { ChildrenToolbar, type ListView } from './components/ChildrenToolbar'
import { KpiCards, KpiCardsSkeleton } from './components/KpiCards'
import { PageHeader } from './components/PageHeader'
import { useChildren } from './hooks'
import type { ChildrenFilterParams, ChildrenListParams, SortField } from './types'
import { DEFAULT_PAGE_SIZE, DEFAULT_SELECTS, buildChildrenCsv, downloadTextFile, filterChildren, queryChildren } from './utils'

type Filters = Omit<ChildrenFilterParams, 'search'>

const SEARCH_DEBOUNCE_MS = 250

function EmptyRoster({ establishmentId }: { establishmentId: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[20px] border border-line bg-white p-6">
      <p className="text-sm font-semibold text-ink">Aún no hay niños en el padrón de {establishmentId}.</p>
      <p className="text-xs leading-5 text-[#737373]">Carga el padrón para ver a los niños en seguimiento.</p>
      <Link
        to={paths.administracion}
        className="rounded-full bg-brand px-4 py-2 text-xs leading-4 font-semibold text-white hover:bg-brand-dark"
      >
        Cargar padrón
      </Link>
    </div>
  )
}

export default function NinosPage() {
  const quickFiltersId = useId()
  const advancedPanelId = useId()

  /* ---------------------------- Filtros ---------------------------- */
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(DEFAULT_SELECTS)

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const filterParams: ChildrenFilterParams = useMemo(() => ({ ...filters, search }), [filters, search])

  // La página vuelve a 1 cuando cambia cualquier filtro, búsqueda u orden.
  const filtersKey = JSON.stringify(filterParams)
  const [pageState, setPageState] = useState({ key: filtersKey, page: 1 })
  const page = pageState.key === filtersKey ? pageState.page : 1
  const setPage = (next: number) => setPageState({ key: filtersKey, page: next })

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }))

  const clearFilters = () => {
    setFilters((current) => ({ ...DEFAULT_SELECTS, sort: current.sort, order: current.order }))
    setSearchInput('')
    setSearch('')
  }

  const handleSort = (field: SortField) =>
    setFilters((current) => {
      if (current.sort !== field) return { ...current, sort: field, order: 'asc' }
      if (current.order === 'asc') return { ...current, order: 'desc' }
      return { ...current, sort: null, order: 'asc' }
    })

  const activeFilterCount = (['ageGroup', 'delivery', 'response'] as const).filter(
    (key) => filters[key] !== 'todos',
  ).length

  /* ------------------------------ UI ------------------------------ */
  const [view, setView] = useState<ListView>('list')
  const [selectsOpen, setSelectsOpen] = useState(true)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [exportedRows, setExportedRows] = useState<number | null>(null)

  /* ----------------------------- Datos ----------------------------- */
  // Todo sale de la lista de la semana y del historial: se filtra y pagina en el navegador.
  const { lista, historiales, children, summary, semana, establecimiento } = useChildren()
  const listParams: ChildrenListParams = { ...filterParams, page, pageSize: DEFAULT_PAGE_SIZE }
  const listResult = queryChildren(children, listParams)
  const loadingResponses = historiales.isPending

  const visibleCodes = listResult.items.map((child) => child.code)

  const toggleRow = (code: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(code)
      else next.delete(code)
      return next
    })

  const toggleAllVisible = (checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      for (const code of visibleCodes) {
        if (checked) next.add(code)
        else next.delete(code)
      }
      return next
    })

  /** CSV generado en el navegador con los filtros actuales (todas las páginas). */
  const handleExport = () => {
    const rows = filterChildren(children, filterParams)
    downloadTextFile(buildChildrenCsv(rows), `ninos-${establecimiento}-${semana}.csv`)
    setExportedRows(rows.length)
  }

  return (
    <PageContainer>
      <PageHeader
        onExport={handleExport}
        canExport={children.length > 0}
        advancedOpen={advancedOpen}
        onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
        advancedPanelId={advancedPanelId}
      />
      <p role="status" className="sr-only">
        {exportedRows !== null && `Se exportaron ${exportedRows} registros del padrón en CSV.`}
      </p>

      <AsyncContent
        query={lista}
        loading={
          <>
            <KpiCardsSkeleton />
            <ChildrenListSkeleton />
          </>
        }
      >
        {() =>
          children.length === 0 ? (
            <EmptyRoster establishmentId={establecimiento} />
          ) : (
            <>
              <KpiCards summary={summary} />

              <ChildrenToolbar
                search={searchInput}
                onSearchChange={setSearchInput}
                filters={filterParams}
                onFilterChange={setFilter}
                onClearFilters={clearFilters}
                segmentCounts={listResult.segmentCounts}
                activeFilterCount={activeFilterCount}
                selectsOpen={selectsOpen}
                onToggleSelects={() => setSelectsOpen((open) => !open)}
                quickFiltersId={quickFiltersId}
                advancedOpen={advancedOpen}
                advancedPanelId={advancedPanelId}
                view={view}
                onViewChange={setView}
              />

              {historiales.isError && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center gap-3 rounded-[20px] border border-brand/20 bg-brand-soft px-4 py-3 text-xs leading-5 text-brand"
                >
                  <p className="flex-1">
                    <span className="font-semibold">No se pudieron leer las respuestas de los cuidadores.</span>{' '}
                    <span className="text-ink/70">{historiales.error.message}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => historiales.refetch()}
                    className="rounded-full bg-brand px-3 py-1 font-semibold text-white hover:bg-brand-dark"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              <ChildrenList
                data={listResult}
                loadingResponses={loadingResponses}
                view={view}
                sort={filters.sort}
                order={filters.order}
                onSort={handleSort}
                onPageChange={setPage}
                onClearFilters={clearFilters}
                selected={selected}
                onToggle={toggleRow}
                onToggleAll={toggleAllVisible}
              />
            </>
          )
        }
      </AsyncContent>
    </PageContainer>
  )
}
