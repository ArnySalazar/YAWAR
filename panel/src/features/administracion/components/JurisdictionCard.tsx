import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import establishmentIcon from '../assets/establishment.svg'
import swapIcon from '../assets/swap.svg'

/**
 * "Jurisdicción asignada": código del establecimiento elegido. La API no tiene nombre, código
 * RENIPRESS ni red del establecimiento: solo el código del padrón (ej. EESS01).
 */
export function JurisdictionCard() {
  const { establecimientos, establecimiento, setEstablecimiento } = useEstablecimiento()

  return (
    <div className="flex max-w-full items-center gap-2 self-start rounded-[12px] border border-line bg-white px-4 py-2 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] lg:shrink-0 lg:self-auto">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-chip">
        <img src={establishmentIcon} alt="" width={16.6667} height={15} />
      </span>
      <div className="min-w-0 pr-2">
        <p className="text-[11px] leading-[14px] font-semibold tracking-[0.55px] text-[#5b5858] uppercase">
          Jurisdicción asignada
        </p>
        <p className="text-[12px] leading-4 font-semibold tracking-[0.24px] text-ink">{establecimiento}</p>
        <p className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
          Código del establecimiento en el padrón
        </p>
      </div>
      {establecimientos.length > 1 && (
        <label
          title="Cambiar jurisdicción"
          className="relative -m-1 flex shrink-0 items-center justify-center rounded-md p-1 transition-colors focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-brand hover:bg-chip"
        >
          <img src={swapIcon} alt="" width={13.3333} height={16.6667} />
          <select
            aria-label="Cambiar jurisdicción"
            value={establecimiento}
            onChange={(event) => setEstablecimiento(event.target.value)}
            className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
          >
            {establecimientos.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
