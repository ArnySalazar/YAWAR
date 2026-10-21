/**
 * Comunicación, versión reducida "Respuestas de la semana": qué respondió cada cuidador de la lista
 * al recordatorio de WhatsApp y por qué. Sin fechas, estados de entrega ni conversación: la API no
 * los devuelve (docs/panel/evidencias/2026-10-21_brecha_diseno_vs_api.md, sección 5.6).
 */
import { useMemo, useRef, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { AsyncContent } from '@/components/ui/AsyncContent'
import { useHoy } from '@/api/queries'
import type { SemanaIso } from '@/api/yawar'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { etiquetaSemana } from '@/lib/semana'
import { ComunicacionHeader } from './components/ComunicacionHeader'
import { FiltersPanel } from './components/FiltersPanel'
import { KpiCards, KpiCardsSkeleton } from './components/KpiCards'
import {
  ResponseListEmpty,
  ResponseListError,
  ResponseListSkeleton,
  RosterEmpty,
} from './components/ListStates'
import { Pagination } from './components/Pagination'
import { PrivacyNote } from './components/PrivacyNote'
import { ResponseCard } from './components/ResponseCard'
import { ResponseDetailPanel } from './components/ResponseDetailPanel'
import { countResponses, queryResponses, selectResponses, weekSummary } from './api'
import { downloadResponsesCsv, responsesCsvFileName } from './csv'
import { useWeekIndicators, useWeekOptions, useWeekResponses } from './hooks'
import type { CommunicationResponse, ResponseFilters } from './types'

const PAGE_SIZE = 6
const LIST_ID = 'comunicacion-response-list'

type ListFilters = Omit<ResponseFilters, 'q'>

const DEFAULT_FILTERS: ListFilters = { tab: 'todas', reason: 'todos', page: 1, pageSize: PAGE_SIZE }

export default function ComunicacionPage() {
  const { establecimiento } = useEstablecimiento()
  const { semana: semanaActual } = useHoy()
  // null = la semana actual (sigue a la del servidor cuando responde /salud)
  const [semanaElegida, setSemanaElegida] = useState<SemanaIso | null>(null)
  const semana = semanaElegida ?? semanaActual

  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const panelRef = useRef<HTMLElement>(null)

  const indicadoresQuery = useWeekIndicators(semana)
  const weekOptions = useWeekOptions()
  const { lista, historiales, data } = useWeekResponses(semana)

  const counts = useMemo(() => (data ? countResponses(data.items) : undefined), [data])
  const page = useMemo(
    () => (data ? queryResponses(data.items, { ...filters, q: search }) : undefined),
    [data, filters, search],
  )
  // Por defecto queda seleccionada la primera tarjeta (como "Ítem 1 (SELECCIONADO POR DEFECTO)" del Figma).
  const selected = page ? (page.items.find((item) => item.id === selectedId) ?? page.items[0] ?? null) : null
  const responsesFailed = lista.isError || historiales.isError

  const updateFilters = (patch: Partial<ListFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch, page: patch.page ?? 1 }))
    setSelectedId(null)
  }

  const clearFilters = () => {
    setSearch('')
    setFilters(DEFAULT_FILTERS)
    setSelectedId(null)
  }

  const changeWeek = (value: SemanaIso) => {
    setSemanaElegida(value === semanaActual ? null : value)
    updateFilters({})
  }

  const handleSelect = (item: CommunicationResponse) => {
    setSelectedId(item.id)
    // En móvil/tablet el panel está debajo de la lista: lo traemos a la vista.
    if (window.matchMedia?.('(max-width: 1023.98px)').matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  // Se exportan todas las respuestas que cumplen los filtros, no solo la página visible.
  const exportCsv = () => {
    if (!data) return
    downloadResponsesCsv(
      selectResponses(data.items, { ...filters, q: search }),
      responsesCsvFileName(establecimiento, semana),
    )
  }

  const renderList = () => {
    if (lista.isError) return <ResponseListError message={lista.error.message} onRetry={() => lista.refetch()} />
    if (lista.data?.length === 0) return <RosterEmpty establishmentId={establecimiento} />
    if (historiales.isError) {
      return <ResponseListError message={historiales.error.message} onRetry={() => historiales.refetch()} />
    }
    if (!data || !page) return <ResponseListSkeleton />
    if (data.items.length === 0) {
      return (
        <ResponseListEmpty
          title="Sin registros en esta semana"
          description={`Ningún niño de la lista actual tiene registro en la ${etiquetaSemana(semana).toLowerCase()}: no estaban en la lista ni se les envió el recordatorio.`}
        />
      )
    }
    if (page.items.length === 0) return <ResponseListEmpty onClearFilters={clearFilters} />
    return (
      <>
        <ul aria-label="Respuestas de cuidadores" className="flex flex-col gap-2">
          {page.items.map((item) => (
            <ResponseCard key={item.id} item={item} selected={item.id === selected?.id} onSelect={handleSelect} />
          ))}
        </ul>
        <Pagination
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(value) => updateFilters({ page: value })}
        />
      </>
    )
  }

  return (
    <PageContainer>
      <ComunicacionHeader
        establishmentId={establecimiento}
        semana={semana}
        onExport={exportCsv}
        exportDisabled={!page || page.total === 0}
      />

      <AsyncContent query={indicadoresQuery} loading={<KpiCardsSkeleton />}>
        {(indicadores) => (
          <KpiCards
            summary={weekSummary(indicadores, semana)}
            counts={responsesFailed ? null : counts}
            withoutRecord={data?.withoutRecord}
          />
        )}
      </AsyncContent>

      <FiltersPanel
        listId={LIST_ID}
        tab={filters.tab}
        counts={page?.counts}
        onTabChange={(tab) => updateFilters({ tab })}
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          updateFilters({})
        }}
        week={semana}
        weekOptions={weekOptions}
        onWeekChange={changeWeek}
        reason={filters.reason}
        onReasonChange={(reason) => updateFilters({ reason })}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div
          role="tabpanel"
          id={LIST_ID}
          aria-labelledby={`comunicacion-tab-${filters.tab}`}
          aria-busy={lista.isFetching || historiales.isFetching}
          className="flex min-w-0 flex-col gap-2 lg:col-span-7"
        >
          {renderList()}
        </div>

        <div className="min-w-0 lg:col-span-5">
          <ResponseDetailPanel ref={panelRef} item={selected} />
        </div>
      </div>

      <PrivacyNote />
    </PageContainer>
  )
}
