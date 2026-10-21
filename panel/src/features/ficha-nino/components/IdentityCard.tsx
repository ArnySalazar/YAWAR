import identityProtectedIcon from '../assets/identity-protected.svg'
import { cn } from '@/lib/cn'
import { FichaCard } from './FichaCard'
import type { ChildFollowUp } from '../types'

const AVATAR_GRADIENT = 'linear-gradient(149.84deg, #e6f4eb 0%, #edf5f0 50%, #f1f3f2 100%)'

/**
 * Tarjeta izquierda: identidad protegida. Solo el código del niño y el alias del cuidador; sin
 * nombres, iniciales, fotos, teléfonos, botones de llamar o WhatsApp ni sector (reglas del proyecto).
 */
export function IdentityCard({ child, className }: { child: ChildFollowUp; className?: string }) {
  const { roster } = child

  return (
    <FichaCard className={cn('flex flex-col justify-between overflow-hidden p-[21px]', className)}>
      <div className="flex flex-col gap-4 pb-4">
        {/* Avatar clínico abstracto con el código, en lugar de la foto o las iniciales del menor */}
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-[#d2e7d9] px-[17px] py-8"
          style={{ backgroundImage: AVATAR_GRADIENT }}
        >
          <div className="mb-2 flex h-16 min-w-16 items-center justify-center rounded-2xl border border-[#d1fae5] bg-white px-2 shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
            <span className="text-sm leading-5 font-bold tracking-[0.5px] text-[#065f46]">{child.code}</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-[rgba(167,243,208,0.6)] bg-[rgba(236,253,245,0.8)] px-[11px] py-[3px]">
            <img src={identityProtectedIcon} alt="" width={14} height={14} />
            <span className="text-[11px] leading-5 font-medium text-[#047857]">Identidad Protegida</span>
          </span>
          <span className="pt-1 text-center text-[10px] leading-5 text-[#6b7280]">Solo código del padrón y alias</span>
        </div>
      </div>

      <dl className="flex flex-col gap-1.5 border-t border-[#f3f4f6] pt-[13px]">
        {roster ? (
          <>
            <MetaRow label="Cuidador:" value={roster.caregiverAlias} />
            {roster.relationship && <MetaRow label="Parentesco:" value={roster.relationship} />}
          </>
        ) : (
          <MetaRow
            label="Cuidador:"
            value={child.rosterStatus === 'sin_lista' ? 'Sin datos (no se cargó la lista)' : 'Sin datos (fuera de la lista)'}
          />
        )}
      </dl>
    </FichaCard>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs leading-4 text-[#6b7280]">{label}</dt>
      <dd className="text-right text-xs leading-4 font-medium text-[#1f2937]">{value}</dd>
    </div>
  )
}
