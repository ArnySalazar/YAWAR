import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import { Skeleton } from '@/components/ui/AsyncContent'
import { paths } from '@/routes/paths'
import noResponseIcon from '../assets/icon-msg-no-response.svg'
import { cardClass } from './ResponseParts'

interface ResponseListEmptyProps {
  title?: string
  description?: string
  onClearFilters?: () => void
}

export function ResponseListEmpty({
  title = 'No hay respuestas para mostrar',
  description = 'Ningún cuidador coincide con la búsqueda o los filtros seleccionados en esta semana.',
  onClearFilters,
}: ResponseListEmptyProps) {
  return (
    <div className={cn(cardClass, 'flex flex-col items-center gap-2 px-6 py-10 text-center')}>
      <img src={noResponseIcon} alt="" width={15} height={18.5} />
      <p className="text-sm font-semibold leading-5 text-ink-strong">{title}</p>
      <p className="max-w-sm text-[13px] leading-[18px] text-muted">{description}</p>
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-2 rounded-full bg-[#e8f0e8] px-3 py-1 text-[11px] font-medium leading-[14px] tracking-[0.33px] text-ink-strong transition-colors hover:bg-[#dbe7db] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

/** Padrón vacío: no hay niños a quienes enviar el recordatorio. */
export function RosterEmpty({ establishmentId }: { establishmentId: string }) {
  return (
    <div className={cn(cardClass, 'flex flex-col items-center gap-2 px-6 py-10 text-center')}>
      <img src={noResponseIcon} alt="" width={15} height={18.5} />
      <p className="text-sm font-semibold leading-5 text-ink-strong">
        Aún no hay niños en el padrón de {establishmentId}.
      </p>
      <p className="max-w-sm text-[13px] leading-[18px] text-muted">
        Carga el padrón para que el bot envíe los recordatorios y aquí aparezcan las respuestas.
      </p>
      <Link
        to={paths.administracion}
        className="mt-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold leading-4 tracking-[0.24px] text-white hover:bg-brand-dark"
      >
        Cargar padrón
      </Link>
    </div>
  )
}

export function ResponseListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-[12px] border border-brand/20 bg-brand-soft p-5 text-sm text-brand"
    >
      <p className="font-semibold">No se pudo cargar la información.</p>
      <p className="text-xs text-ink/70">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-dark"
      >
        Reintentar
      </button>
    </div>
  )
}

export function ResponseListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-[116px] rounded-[12px]" />
      ))}
    </div>
  )
}
