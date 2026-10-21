import { cn } from '@/lib/cn'
import { missingRosterReason, reportWhen, riskPct } from '../format'
import { FichaCard } from './FichaCard'
import type { ChildFollowUp } from '../types'

/**
 * Tarjeta central: datos de la lista de la semana y último reporte del cuidador. El código es el
 * título (sin iniciales ni año de registro); no hay suplemento, esquema ni fecha del último CRED
 * porque la API no los devuelve.
 */
export function RegistryCard({ child, className }: { child: ChildFollowUp; className?: string }) {
  const { roster, latestReport } = child

  return (
    <FichaCard className={cn('@container flex flex-col justify-between p-[25px]', className)}>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 pb-2">
          <div className="flex flex-col gap-[3.5px] pt-[2.5px]">
            <p className="text-xs leading-4 font-semibold tracking-[0.3px] text-[#047857] uppercase">ID Padrón</p>
            <h2 className="text-2xl leading-8 font-bold tracking-[-0.6px] text-ink">{child.code}</h2>
          </div>
          {roster && (
            <span className="rounded-full border border-[#fde68a] bg-[#fffbeb] px-[13px] py-[5px] text-xs leading-4 font-medium text-[#92400e]">
              Riesgo de no consumo: {riskPct(roster.riskScore)}
            </span>
          )}
        </div>

        {roster ? (
          <>
            <p className="border-b border-[#f3f4f6] pb-[13px] text-xs leading-4 text-[#9ca3af]">
              Motivos del modelo: {roster.reasons.length ? roster.reasons.join(' · ') : '—'}
            </p>

            <dl className="grid grid-cols-2 gap-4 border-b border-[#f3f4f6] pt-4 pb-[17px] @lg:grid-cols-4">
              <Indicator label="Edad actual" value={`${roster.ageMonths} meses`} />
              <Indicator label="Grupo etario" value={roster.ageGroup} />
              <Indicator label="Establecimiento" value={child.establishmentId} />
              <Indicator label="Prioridad" value={`#${roster.priorityRank} de ${roster.rosterSize}`} />
            </dl>
          </>
        ) : (
          <p className="border-b border-[#f3f4f6] pb-[13px] text-xs leading-[19.5px] text-[#6b7280]">
            Sin edad, grupo etario ni prioridad: esos datos solo vienen en la lista de la semana, y el niño{' '}
            {missingRosterReason(child)}.
          </p>
        )}
      </div>

      <div className="pt-4">
        <div className="flex items-start gap-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-[13px]">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-xs leading-4 font-bold text-[#92400e]">
            i
          </span>
          <p className="text-xs leading-[19.5px] text-[#4b5563]">
            <span className="font-semibold text-[#1f2937]">Último reporte del cuidador:</span>{' '}
            {latestReport ? `${latestReport.text} (${reportWhen(latestReport)})` : 'Sin respuestas registradas'}
          </p>
        </div>
      </div>
    </FichaCard>
  )
}

function Indicator({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] leading-5 font-medium text-[#9ca3af]">{label}</dt>
      <dd className="truncate text-sm leading-5 font-semibold text-ink">{value}</dd>
    </div>
  )
}
