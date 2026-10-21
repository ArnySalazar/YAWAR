import { useId, useState } from 'react'
import { useGenerarLista } from '@/api/queries'
import { cn } from '@/lib/cn'
import { etiquetaSemana } from '@/lib/semana'
import { formatPct, percentOf } from '../utils'
import type { HomeOverview } from '../types'
import shieldIcon from '../assets/icon-shield.svg'

const stepperButtonClass =
  'flex size-7 items-center justify-center rounded-full border border-line bg-white p-px text-base font-bold leading-6 text-ink transition-colors hover:bg-chip disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white'

/** Reparto de la semana: los N primeros a visita y el resto a WhatsApp (la misma regla de la API). */
function CapacityBody({ total, homeVisits, isDraft }: { total: number; homeVisits: number; isDraft: boolean }) {
  const whatsappFollowUps = total - homeVisits
  const visitsShare = Math.round(percentOf(homeVisits, total))
  // Los porcentajes de la leyenda suman siempre 100 % (el de WhatsApp es el complemento).
  const whatsappShare = total > 0 ? 100 - visitsShare : 0

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`${homeVisits} visitas y ${whatsappFollowUps} seguimientos por WhatsApp de ${total} niños`}
        className={cn('flex h-3 w-full overflow-hidden rounded-full bg-chip', isDraft && 'opacity-60')}
      >
        <div className="h-full bg-ink transition-[width]" style={{ width: `${visitsShare}%` }} />
        <div className="h-full bg-brand-dark transition-[width]" style={{ width: `${whatsappShare}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1 text-[11px] font-semibold leading-[14px] tracking-[0.33px] text-ink">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-ink" />
          {homeVisits} Visitas ({formatPct(visitsShare)})
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-brand-dark" />
          {whatsappFollowUps} WhatsApp ({formatPct(whatsappShare)})
        </span>
      </div>
    </div>
  )
}

/**
 * Capacidad N de visitas. La API no la guarda: es el parámetro con el que se genera la lista. Por eso
 * cambiarla es volver a generar la lista de la semana (lo mismo que "Generar planificación").
 */
export function CapacityCard({ overview }: { overview: HomeOverview }) {
  const generate = useGenerarLista()
  const headingId = useId()
  const total = overview.roster.total
  // El máximo es el total de niños: más cupos que niños no cambian nada
  const current = Math.min(overview.homeVisits.capacityN, total)
  const [draft, setDraft] = useState(current)
  const changed = draft !== current

  const changeDraft = (delta: number) => setDraft((n) => Math.min(total, Math.max(0, n + delta)))

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={generate.isPending}
      className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-semibold leading-6 text-ink">
            Capacidad de Seguimiento
          </h2>
          <p className="text-[13px] leading-[18px] text-muted">
            {etiquetaSemana(overview.semana)} · Distribución del equipo
          </p>
        </div>
        <div role="group" aria-label="Cupo N de visitas domiciliarias" className="flex shrink-0 items-center rounded-full bg-chip p-1">
          <button
            type="button"
            aria-label="Disminuir cupo N"
            disabled={draft <= 0 || generate.isPending}
            onClick={() => changeDraft(-1)}
            className={stepperButtonClass}
          >
            -
          </button>
          <output className="px-2.5 text-xs font-bold leading-4 tracking-[0.24px] text-ink" aria-live="polite">
            N={draft}
          </output>
          <button
            type="button"
            aria-label="Aumentar cupo N"
            disabled={draft >= total || generate.isPending}
            onClick={() => changeDraft(1)}
            className={stepperButtonClass}
          >
            +
          </button>
        </div>
      </div>

      {/* Mientras se elige un N nuevo, la barra muestra cómo quedaría el reparto */}
      <CapacityBody
        total={total}
        homeVisits={changed ? Math.min(draft, total) : overview.homeVisits.assigned}
        isDraft={changed}
      />

      {changed && (
        <div className="flex flex-col gap-2 rounded-lg border border-brand/20 bg-brand-soft p-3.5">
          <p className="text-[13px] leading-[18px] text-nav-ink">
            Al cambiar N se vuelve a generar la lista de la semana: los {draft} primeros van a visita y el resto a
            WhatsApp.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => generate.mutate(draft)}
              disabled={generate.isPending}
              className="rounded-full bg-brand px-4 py-2 text-xs font-semibold leading-4 tracking-[0.24px] text-white transition-colors hover:bg-brand-dark disabled:opacity-70"
            >
              {generate.isPending ? 'Generando…' : `Volver a generar con N=${draft}`}
            </button>
            <button
              type="button"
              onClick={() => setDraft(current)}
              disabled={generate.isPending}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold leading-4 tracking-[0.24px] text-ink transition-colors hover:bg-chip disabled:opacity-70"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {generate.isError && (
        <p role="alert" className="rounded-lg bg-brand-soft px-3.5 py-2 text-[13px] leading-[18px] text-brand">
          No se pudo volver a generar la lista: {generate.error.message}
        </p>
      )}

      <div className="flex items-start gap-2.5 rounded-lg bg-chip p-3.5">
        <img src={shieldIcon} alt="" width={10.667} height={15.333} className="shrink-0" />
        <p className="text-[13px] leading-[21.13px] text-nav-ink">
          <strong className="font-bold text-ink">Criterio Clínico Primero:</strong> Las sugerencias del algoritmo son un
          apoyo a su juicio como profesional de enfermería. Usted decide y aprueba la asignación definitiva.
        </p>
      </div>
    </section>
  )
}
