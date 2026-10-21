import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router'
import { RESPUESTAS } from '@/lib/dominio'
import { cn } from '@/lib/cn'
import { etiquetaSemana, etiquetaSemanaLarga } from '@/lib/semana'
import { paths } from '@/routes/paths'
import { ACTION_LABELS } from '../presentation'
import type { CommunicationResponse } from '../types'
import { ChildIdentity, ReasonTag, ResponseMessage, cardClass } from './ResponseParts'

const sectionTitleClass = 'text-[11px] font-medium uppercase leading-[14px] tracking-[0.55px] text-muted'

interface ResponseDetailPanelProps {
  ref?: Ref<HTMLElement>
  item: CommunicationResponse | null
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={sectionTitleClass}>{label}</dt>
      <dd className="pt-0.5 text-[13px] leading-[18px] text-ink-strong">{children}</dd>
    </div>
  )
}

/**
 * Detalle con lo que sí registra la API: respuesta, motivo, semana y acción asignada. No hay
 * conversación que mostrar (el bot recibe botones y la API no devuelve los mensajes) ni fechas.
 */
function DetailContent({ item }: { item: CommunicationResponse }) {
  return (
    <div className="flex flex-col gap-5">
      <ChildIdentity item={item} />

      <div className="flex flex-col gap-2 rounded-[12px] bg-chip p-4">
        <ResponseMessage item={item} />
        <ReasonTag item={item} className="self-start" />
        <p className="text-[11px] font-medium leading-[14px] tracking-[0.33px] text-muted">
          Respuesta elegida con los botones del recordatorio semanal de WhatsApp.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <DetailField label="Respuesta">{RESPUESTAS[item.answer]}</DetailField>
        <DetailField label="Motivo">{item.reasonLabel ?? '—'}</DetailField>
        <DetailField label="Semana">{etiquetaSemanaLarga(item.semana)}</DetailField>
        <DetailField label="Acción asignada">{ACTION_LABELS[item.action ?? 'ninguna']}</DetailField>
        <DetailField label="Parentesco">{item.caregiverRole}</DetailField>
        <DetailField label="Cuidador">{item.caregiverAlias}</DetailField>
      </dl>

      <Link
        to={paths.fichaNino(item.id)}
        className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-xs font-semibold leading-4 tracking-[0.24px] text-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Ficha del niño
      </Link>
    </div>
  )
}

/** Panel derecho (40%) con el detalle de la respuesta seleccionada. Debajo de la lista en pantallas < lg. */
export function ResponseDetailPanel({ ref, item }: ResponseDetailPanelProps) {
  return (
    <aside
      ref={ref}
      aria-labelledby="comunicacion-detail-title"
      className={cn(
        cardClass,
        'flex scroll-mt-24 flex-col gap-4 p-5 lg:sticky lg:top-[104px] lg:max-h-[calc(100dvh-128px)] lg:overflow-y-auto',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="comunicacion-detail-title" className="text-sm font-semibold leading-5 text-ink-strong">
          Detalle de la respuesta
        </h2>
        {item && (
          <span className="rounded-full bg-[#e8f0e8] px-2.5 py-1 text-[11px] font-medium leading-[14px] tracking-[0.33px] text-muted">
            {etiquetaSemana(item.semana).replace('Semana', 'Sem.')}
          </span>
        )}
      </div>

      {item ? (
        <DetailContent item={item} />
      ) : (
        <p className="text-[13px] leading-[18px] text-muted">
          Selecciona «Ver en panel» en una respuesta para revisar su detalle.
        </p>
      )}
    </aside>
  )
}
