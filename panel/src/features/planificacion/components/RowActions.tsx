import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import { paths } from '@/routes/paths'
import eyeIcon from '../assets/eye.svg'
import wandIcon from '../assets/wand.svg'
import chatIcon from '../assets/chat-lines.svg'
import type { PlannedChild } from '../types'

interface RowActionsProps {
  child: PlannedChild
  expanded: boolean
  onToggleDetail: () => void
  className?: string
}

/**
 * Acciones de la fila: ver el detalle y, para WhatsApp, ir a sus respuestas.
 * Sin llamar por teléfono (el panel no muestra teléfonos) ni reasignar canal (la API no lo permite).
 */
export function RowActions({ child, expanded, onToggleDetail, className }: RowActionsProps) {
  const isVisit = child.assignment.channel === 'home_visit'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {!!child.pendingAlarms?.length && (
        <button type="button" onClick={() => { if (!expanded) onToggleDetail() }}
          aria-label={`Atender alarma de ${child.code}`}
          className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-[#ffdad6]">
          Atender
        </button>
      )}
      {!child.pendingAlarms?.length && !!child.alarmAttendances?.length && (
        <span className="rounded-full bg-track px-2 py-1 text-xs font-semibold text-success">Atendido</span>
      )}
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? `Ocultar detalle de ${child.code}` : `Ver detalle de ${child.code}`}
        title={expanded ? 'Ocultar detalle' : 'Ver detalle'}
        onClick={onToggleDetail}
        className={cn('flex items-center justify-center rounded-full p-1.5', expanded ? 'bg-chip' : 'hover:bg-chip')}
      >
        {expanded ? (
          <img src={wandIcon} alt="" width={14} height={14} />
        ) : (
          <img src={eyeIcon} alt="" width={14.6667} height={10} />
        )}
      </button>
      {!isVisit && (
        <Link
          to={paths.comunicacion}
          aria-label={`Ver respuestas de WhatsApp de ${child.code}`}
          title="Ver respuestas en Comunicación"
          className="flex items-center justify-center rounded-full p-1.5 hover:bg-chip"
        >
          <img src={chatIcon} alt="" width={13.3333} height={13.3333} />
        </Link>
      )}
    </div>
  )
}
