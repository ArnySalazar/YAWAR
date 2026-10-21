import { cn } from '@/lib/cn'
import { REASON_TAG_CLASSES, formatAge, messageIconFor } from '../presentation'
import type { CommunicationResponse } from '../types'

/** Estilo base de tarjeta blanca del Figma (borde #e2e5e3, radio 12, sombra sutil). */
export const cardClass = 'rounded-[12px] border border-line bg-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'

/** "N0001 · 8 meses (Mamá de N0001)" */
export function ChildIdentity({ item, className }: { item: CommunicationResponse; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1', className)}>
      <span className="rounded-full bg-[#e8f0e8] px-2 py-0.5 text-xs font-bold leading-4 tracking-[0.24px] text-ink-strong">
        {item.childCode}
      </span>
      <span className="text-[13px] leading-[18px] text-muted">· {formatAge(item.ageMonths)}</span>
      <span className="text-[11px] font-medium leading-[14px] tracking-[0.33px] text-ink-strong">
        ({item.caregiverAlias})
      </span>
    </div>
  )
}

/**
 * Respuesta del cuidador con su ícono. Sin comillas de cita: el bot solo recibe botones, así que el
 * texto se arma con la respuesta y la razón elegidas, no es una frase escrita por el cuidador.
 */
export function ResponseMessage({ item, className }: { item: CommunicationResponse; className?: string }) {
  const icon = messageIconFor(item)
  const muted = item.responseType === 'sin_respuesta'
  return (
    <p className={cn('flex items-start gap-1', className)}>
      <img src={icon.src} alt="" width={icon.width} height={icon.height} className={cn('shrink-0', icon.className)} />
      <span className={cn('min-w-0 text-sm font-medium leading-[19.25px]', muted ? 'text-muted' : 'text-ink-strong')}>
        {item.message}
      </span>
    </p>
  )
}

/** Etiqueta del motivo. «No le di» o «Tuve un problema» sin razón elegida: "Sin motivo indicado". */
export function ReasonTag({ item, className }: { item: CommunicationResponse; className?: string }) {
  if (item.responseType === 'sin_respuesta') return null
  const severity = item.reasonSeverity ?? 'neutral'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-[14px] tracking-[0.33px]',
        REASON_TAG_CLASSES[severity],
        className,
      )}
    >
      {item.reasonLabel ?? 'Sin motivo indicado'}
    </span>
  )
}
