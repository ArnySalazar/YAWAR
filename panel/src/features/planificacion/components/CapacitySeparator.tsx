import arrowDownIcon from '../assets/arrow-down.svg'

/** Banda que marca el corte N: arriba visitas en campo, abajo seguimiento por WhatsApp. */
export function CapacitySeparator({ capacity, whatsappCount }: { capacity: number; whatsappCount: number }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-px min-w-4 flex-1 bg-[#e4beba]" />
      <p className="inline-flex max-w-full items-center gap-1.5 rounded-[9px] bg-[#cbcccb] px-3 py-0.5 text-center text-[11px] leading-[14px] font-semibold tracking-[0.33px] text-ink-strong uppercase sm:rounded-full">
        <img src={arrowDownIcon} alt="" width={8} height={8} className="shrink-0" />
        <span>
          Límite de capacidad de visitas en campo (N = {capacity}) · Los siguientes {whatsappCount} casos pasan a
          canal WhatsApp
        </span>
      </p>
      <span aria-hidden className="h-px min-w-4 flex-1 bg-[#e4beba]" />
    </div>
  )
}
