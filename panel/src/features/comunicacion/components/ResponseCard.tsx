import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import { paths } from '@/routes/paths'
import { ACTION_LABELS } from '../presentation'
import type { CommunicationResponse } from '../types'
import { ChildIdentity, ReasonTag, ResponseMessage } from './ResponseParts'

interface ResponseCardProps {
  item: CommunicationResponse
  selected: boolean
  onSelect: (item: CommunicationResponse) => void
}

const actionClass =
  'inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] leading-[14px] tracking-[0.33px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export function ResponseCard({ item, selected, onSelect }: ResponseCardProps) {
  return (
    <li
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'rounded-[12px] border border-line shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors',
        selected ? 'border-l-4 border-l-brand bg-chip py-4 pl-4 pr-4' : 'bg-white p-4 hover:border-ink/15',
      )}
    >
      <div className="flex flex-col gap-1">
        <ChildIdentity item={item} />

        <ResponseMessage item={item} className="pt-1" />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <ReasonTag item={item} />
            <span className="text-[13px] leading-[18px] text-muted">
              Acción de la semana: {ACTION_LABELS[item.action ?? 'ninguna']}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(item)}
              aria-pressed={selected}
              aria-label={`Ver en panel la respuesta de ${item.childCode}`}
              className={cn(
                actionClass,
                selected
                  ? 'bg-brand font-semibold text-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-brand-dark'
                  : 'bg-[#e8f0e8] font-medium text-ink-strong hover:bg-[#dbe7db]',
              )}
            >
              Ver en panel
            </button>
            <Link
              to={paths.fichaNino(item.id)}
              aria-label={`Ficha del niño ${item.childCode}`}
              className={cn(actionClass, 'bg-[#e8f0e8] font-medium text-ink-strong hover:bg-[#dbe7db]')}
            >
              Ficha del niño
            </Link>
          </div>
        </div>
      </div>
    </li>
  )
}
