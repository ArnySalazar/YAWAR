import { useId } from 'react'
import { cn } from '@/lib/cn'
import contractIcon from '../assets/contract-checklist.svg'
import privacyShieldIcon from '../assets/privacy-shield.svg'
import { REGISTRY_CONTRACT } from '../api'
import { PanelCard, PanelHeading, Pill } from './PanelCard'

/** Panel B: guía del contrato de columnas que exige POST /padron en la cabecera del CSV. */
export function ContractCard({ className }: { className?: string }) {
  const headingId = useId()
  const requiredCount = REGISTRY_CONTRACT.filter((column) => column.required).length
  const optionalCount = REGISTRY_CONTRACT.length - requiredCount

  return (
    <PanelCard aria-labelledby={headingId} className={cn('gap-4', className)}>
      <PanelHeading
        id={headingId}
        title={`Contrato Requerido (${requiredCount} Columnas${optionalCount ? ` + ${optionalCount} Opcional` : ''})`}
        icon={contractIcon}
        iconWidth={15}
        iconHeight={11.3062}
        aside={
          <Pill size="sm" weight="semibold" className="text-muted">
            Obligatorio
          </Pill>
        }
      />

      <p className="text-[13px] leading-[18px] text-[#5b5858]">
        La cabecera del archivo CSV debe usar exactamente estos identificadores de campo (el orden no importa):
      </p>

      <ul aria-label="Columnas del padrón" className="flex max-h-[360px] flex-col gap-1 overflow-y-auto pr-[4.58px]">
        {REGISTRY_CONTRACT.map((column) => (
          <li
            key={column.name}
            className="flex items-center justify-between gap-3 rounded-[12px] border border-[rgba(226,229,227,0.6)] bg-[rgba(241,243,242,0.6)] p-2.5"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 text-[12px] leading-4 font-bold tracking-[0.24px] break-words text-brand">
                {column.name}
                {!column.required && (
                  <span className="rounded-full border border-line bg-white px-1.5 text-[10px] leading-[14px] font-semibold text-muted">
                    Opcional
                  </span>
                )}
              </p>
              <p className="text-[13px] leading-[18px] text-[#5b5858]">{column.description}</p>
            </div>
            <span className="shrink-0 text-[11px] leading-[14px] font-semibold tracking-[0.33px] text-muted">
              {column.type}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-start gap-2 rounded-[12px] border border-line bg-chip p-3.5">
        <img src={privacyShieldIcon} alt="" width={13.3333} height={16.6667} className="shrink-0" />
        <div>
          <p className="text-[11px] leading-[14px] font-semibold tracking-[0.33px] text-ink">
            Protección de Datos &amp; Minimización
          </p>
          <p className="max-w-[364px] text-[13px] leading-[18px] text-[#5b5858]">
            No cargue DNI, nombres reales, fechas de nacimiento ni direcciones. Use el código del niño y un alias del
            cuidador.
          </p>
        </div>
      </div>
    </PanelCard>
  )
}
