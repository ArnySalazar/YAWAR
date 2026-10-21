import serverIcon from '../assets/server.svg'
import { IndicatorCard } from './IndicatorCard'

/**
 * Canal de mensajería. Reemplaza la tarjeta de infraestructura del diseño: la API no mide
 * disponibilidad ni latencia, así que solo se muestra el canal y si está en modo prueba (/salud).
 */
export function ChannelCard({ isTestMode }: { isTestMode: boolean | null }) {
  return (
    <IndicatorCard className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <div className="flex items-start gap-4 lg:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e2eae3]">
          <img src={serverIcon} alt="" width={15} height={16} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg leading-6 font-semibold text-ink-strong">Canal de mensajería</h2>
          <p className="max-w-[768px] text-[13px] leading-[18px] text-muted">
            Los recordatorios salen por WhatsApp. Un recordatorio que WhatsApp no acepta se cuenta como falla de
            envío, nunca como falta de respuesta o desinterés de la familia.
          </p>
        </div>
      </div>

      <dl className="flex shrink-0 flex-col items-end self-end lg:self-auto">
        <dt className="text-right text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">Canal activo</dt>
        <dd className="text-right text-xs leading-4 font-semibold tracking-[0.24px] text-ink-strong">
          WhatsApp Cloud API{isTestMode ? ' (modo prueba)' : ''}
        </dd>
      </dl>
    </IndicatorCard>
  )
}
