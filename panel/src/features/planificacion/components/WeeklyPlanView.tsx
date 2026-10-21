import { useMemo, useState } from 'react'
import { useEnviarRecordatorios, useGenerarLista } from '@/api/queries'
import type { FilaLista } from '@/api/yawar'
import { cn } from '@/lib/cn'
import { useWeeklyPlan } from '../hooks'
import { buildPlanCsv, downloadTextFile, sortForDisplay, summarizePlan } from '../utils'
import type { PlannedChild } from '../types'
import { MetricCards } from './MetricCards'
import { OperationalConfigCard } from './OperationalConfigCard'
import { Pagination } from './Pagination'
import { PlanCardList } from './PlanCardList'
import { PlanHeader } from './PlanHeader'
import { PlanTable } from './PlanTable'
import { RulesBanner } from './RulesBanner'
import { TableControls, type ChannelFilter, type QuickFilter, type ViewMode } from './TableControls'

const PAGE_SIZE = 12

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function matchesSearch(child: PlannedChild, query: string) {
  if (!query) return true
  const haystack = normalize([child.code, child.caregiverAlias].join(' '))
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

export function WeeklyPlanView({ lista }: { lista: FilaLista[] }) {
  const plan = useWeeklyPlan(lista)
  const generatePlan = useGenerarLista()
  const sendReminders = useEnviarRecordatorios()

  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState<ChannelFilter>('all')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [view, setView] = useState<ViewMode>('table')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [reminderFeedback, setReminderFeedback] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)

  const summary = useMemo(() => summarizePlan(plan), [plan])
  const sortedChildren = useMemo(() => sortForDisplay(plan.children), [plan.children])

  const filtered = useMemo(
    () =>
      sortedChildren.filter((child) => {
        if (quickFilter === 'difficulty' && !child.hasDifficulty) return false
        if ((quickFilter === 'home_visit' || quickFilter === 'whatsapp') && child.assignment.channel !== quickFilter)
          return false
        if (channel !== 'all' && child.assignment.channel !== channel) return false
        return matchesSearch(child, search.trim())
      }),
    [sortedChildren, quickFilter, channel, search],
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  /* Corte N: última visita seguida de un caso de WhatsApp (puede caer al final de la página). */
  const boundary = filtered.findIndex(
    (child, index) =>
      child.assignment.channel === 'home_visit' && filtered[index + 1]?.assignment.channel === 'whatsapp',
  )
  const separatorIndex = boundary >= pageStart && boundary < pageStart + pageRows.length ? boundary - pageStart : -1

  const selectedInFilter = filtered.filter((child) => selectedIds.has(child.id)).length
  const allSelected = filtered.length > 0 && selectedInFilter === filtered.length

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  const toggleInSet = (setter: typeof setSelectedIds, id: string) =>
    setter((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleToggleSelectAll = (checked: boolean) =>
    setSelectedIds((current) => {
      const next = new Set(current)
      for (const child of filtered) {
        if (checked) next.add(child.id)
        else next.delete(child.id)
      }
      return next
    })

  const handleExportCsv = () => {
    const rows = selectedIds.size > 0 ? plan.children.filter((child) => selectedIds.has(child.id)) : filtered
    downloadTextFile(`planificacion-${plan.establishmentId}-${plan.semana}.csv`, buildPlanCsv(rows))
  }

  const handleSendReminders = () => {
    const ok = window.confirm(
      `Se enviará el recordatorio semanal por WhatsApp a los cuidadores de los ${summary.total} niños de ` +
        `${plan.establishmentId} (también a los asignados a visita). Quienes pidieron no recibir mensajes ` +
        'no lo recibirán, y a quien ya lo recibió esta semana no se le repite. ¿Continuar?',
    )
    if (!ok) return
    setReminderFeedback(null)
    sendReminders.mutate(undefined, {
      onSuccess: (r) =>
        setReminderFeedback({
          tone: r.fallidos > 0 ? 'error' : 'ok',
          text:
            `Enviados: ${r.enviados} · Fallidos: ${r.fallidos} · Dados de baja: ${r.omitidos_por_baja}` +
            (r.enviados === 0 && r.fallidos === 0 ? ' (ya se habían enviado esta semana)' : ''),
        }),
      onError: (error) =>
        setReminderFeedback({ tone: 'error', text: `No se pudieron enviar los recordatorios: ${error.message}` }),
    })
  }

  const rowProps = {
    rows: pageRows,
    selectedIds,
    onToggleSelect: (id: string) => toggleInSet(setSelectedIds, id),
    expandedIds,
    onToggleExpanded: (id: string) => toggleInSet(setExpandedIds, id),
    separatorAfter: separatorIndex >= 0 ? separatorIndex : null,
    capacity: plan.visitCapacity,
    whatsappCount: summary.whatsapp,
  }

  const pagination =
    filtered.length > 0 ? (
      <Pagination
        page={currentPage}
        pageCount={pageCount}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
      />
    ) : null

  const emptyState = (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-[14px] leading-5 font-semibold text-ink-strong">No hay niños que coincidan con los filtros.</p>
      <button
        type="button"
        onClick={() => {
          setSearch('')
          setChannel('all')
          setQuickFilter('all')
          setPage(1)
        }}
        className="rounded-full bg-chip px-4 py-2 text-[12px] leading-4 font-semibold tracking-[0.24px] text-ink-strong hover:bg-track"
      >
        Limpiar filtros
      </button>
    </div>
  )

  return (
    <div
      aria-busy={generatePlan.isPending}
      className={cn(
        'flex flex-col gap-6 transition-opacity',
        generatePlan.isPending && 'pointer-events-none opacity-60',
      )}
    >
      <div className="flex flex-col gap-4">
        <PlanHeader
          establishmentId={plan.establishmentId}
          ageRange={plan.ageRange}
          isSendingReminders={sendReminders.isPending}
          reminderFeedback={reminderFeedback}
          onPrint={() => window.print()}
          onExportCsv={handleExportCsv}
          onSendReminders={handleSendReminders}
        />
        <OperationalConfigCard
          key={`${plan.establishmentId}-${plan.visitCapacity}`}
          plan={plan}
          summary={summary}
          isGenerating={generatePlan.isPending}
          generateError={generatePlan.error?.message ?? null}
          onGenerate={(visitCapacity) => generatePlan.mutate(visitCapacity)}
        />
      </div>

      <MetricCards plan={plan} summary={summary} />

      <RulesBanner />

      <section aria-label="Niños de la semana" className="flex flex-col gap-3">
        <TableControls
          search={search}
          onSearchChange={resetPage(setSearch)}
          channel={channel}
          onChannelChange={resetPage(setChannel)}
          quickFilter={quickFilter}
          onQuickFilterChange={resetPage(setQuickFilter)}
          counts={{
            all: summary.total,
            home_visit: summary.homeVisits,
            whatsapp: summary.whatsapp,
            difficulty: summary.difficulties,
          }}
          resultCount={filtered.length}
          selectedCount={selectedIds.size}
          semana={plan.semana}
          view={view}
          onViewChange={setView}
        />

        {view === 'table' && (
          <div className="hidden overflow-hidden rounded-[16px] border border-line bg-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)] md:block">
            {filtered.length > 0 ? (
              <>
                <PlanTable
                  {...rowProps}
                  allSelected={allSelected}
                  someSelected={selectedInFilter > 0}
                  onToggleSelectAll={handleToggleSelectAll}
                />
                <div className="border-t border-track px-6 py-4">{pagination}</div>
              </>
            ) : (
              emptyState
            )}
          </div>
        )}

        <div className={cn('flex flex-col gap-4', view === 'table' && 'md:hidden')}>
          {filtered.length > 0 ? (
            <>
              <label className="flex items-center gap-2 px-1 text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => handleToggleSelectAll(event.target.checked)}
                  className="size-[13px] accent-brand-dark"
                />
                Seleccionar todos ({filtered.length})
              </label>
              <PlanCardList {...rowProps} />
              {pagination}
            </>
          ) : (
            <div className="rounded-[16px] border border-line bg-white">{emptyState}</div>
          )}
        </div>
      </section>
    </div>
  )
}
