import { cn } from '@/lib/cn'
import { formatStatus, formatWeeklyAction } from '../format'
import type { ChildListItem, ChildStatus, FollowUpStatus, ResponseKind, WeekResponse } from '../types'
import problemIcon from '../assets/icon-response-problem.svg'
import refusedIcon from '../assets/icon-response-refused.svg'
import noAnswerIcon from '../assets/icon-response-no-answer.svg'
import continuousIcon from '../assets/icon-response-continuous.svg'
import whatsappIcon from '../assets/icon-whatsapp.svg'

/* --------------------------- Posición en la lista --------------------------- */

const RANK_STYLE: Record<FollowUpStatus, string> = {
  problema: 'bg-[#fce8eb] text-brand shadow-[0_0_0_1px_rgba(184,16,37,0.1)]',
  no_le_di: 'bg-[#feecec] text-brand shadow-[0_0_0_1px_rgba(184,16,37,0.1)]',
  sin_respuesta: 'bg-[#e5e5e5] text-[#404040]',
  si_le_di: 'bg-[#ecfdf5] text-[#047857] shadow-[0_0_0_1px_#a7f3d0]',
}

/** Círculo con la posición en la lista de la semana (sin foto ni iniciales del niño). */
export function PriorityRank({ rank, status }: { rank: number; status: FollowUpStatus | undefined }) {
  return (
    <span
      title={`Prioridad ${rank} en la lista de la semana`}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs leading-4 font-bold',
        status ? RANK_STYLE[status] : 'bg-chip text-[#737373]',
      )}
    >
      <span className="sr-only">Prioridad </span>
      {rank}
    </span>
  )
}

/* --------------------------- Estado (texto) -------------------------- */

const STATUS_TEXT_STYLE: Partial<Record<FollowUpStatus, string>> = {
  problema: 'font-semibold text-brand',
  no_le_di: 'font-semibold text-brand',
  si_le_di: 'font-semibold text-[#047857]',
}

/** Última respuesta del cuidador; sin historial (cargando o con error) solo se avisa que carga. */
export function StatusText({
  status,
  loading,
  className,
}: {
  status: ChildStatus | undefined
  loading: boolean
  className?: string
}) {
  if (!status) {
    return loading ? (
      <span className={cn('text-[11px] leading-4 font-medium text-[#a3a3a3]', className)}>Cargando…</span>
    ) : null
  }
  return (
    <span
      className={cn('text-[11px] leading-4', STATUS_TEXT_STYLE[status.kind] ?? 'font-medium text-[#737373]', className)}
    >
      {formatStatus(status)}
    </span>
  )
}

/* ------------------------- Respuesta de la semana ------------------------- */

const GREY = 'border-[#e5e5e5] bg-[#f5f5f5]'

const RESPONSE_STYLE: Record<ResponseKind, { className: string; icon: string; width: number; height: number }> = {
  problema: {
    className: 'border-[rgba(253,230,138,0.5)] bg-[#fff4e5] text-[#9e5b00]',
    icon: problemIcon,
    width: 11.56,
    height: 14,
  },
  no_le_di: {
    className: 'border-[rgba(254,202,202,0.5)] bg-[#feecec] text-brand',
    icon: refusedIcon,
    width: 10.92,
    height: 14,
  },
  sin_respuesta: { className: cn(GREY, 'text-[#525252]'), icon: noAnswerIcon, width: 12.84, height: 14 },
  si_le_di: { className: 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]', icon: continuousIcon, width: 11.89, height: 14 },
}

/** Respuesta del cuidador esta semana; undefined mientras carga el historial (o si no se pudo leer). */
export function ResponseBadge({ response, loading }: { response: WeekResponse | undefined; loading: boolean }) {
  if (!response) {
    return (
      <span className="text-[11px] leading-4 text-[#a3a3a3]">{loading ? 'Cargando respuesta…' : 'No disponible'}</span>
    )
  }
  const style = RESPONSE_STYLE[response.kind]
  return (
    <span
      className={cn(
        'inline-flex max-w-[180px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-4 font-semibold',
        style.className,
      )}
    >
      <img src={style.icon} alt="" width={style.width} height={style.height} className="shrink-0" />
      <span>{response.label}</span>
    </span>
  )
}

/* --------------------------- Acción semanal --------------------------- */

export function WeeklyActionBadge({ action }: { action: ChildListItem['weeklyAction'] }) {
  const isVisit = action.channel === 'visita_domiciliaria'
  return (
    <span
      className={cn(
        'inline-flex max-w-[141px] items-center gap-1.5 rounded-lg border border-[#e5e5e5] px-2.5 py-1 text-[11px] leading-4',
        isVisit ? 'bg-[#f5f5f5] font-bold text-ink' : 'bg-chip font-medium text-[#404040]',
      )}
    >
      {isVisit ? (
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand" />
      ) : (
        <img src={whatsappIcon} alt="" width={9.5} height={12} className="shrink-0" />
      )}
      <span>{formatWeeklyAction(action)}</span>
    </span>
  )
}
