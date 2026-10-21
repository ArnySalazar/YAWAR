import { Link } from 'react-router'
import signalIcon from '../assets/signal.svg'
import infoSmallIcon from '../assets/info-small.svg'
import { etiquetaSemana } from '@/lib/semana'
import { paths } from '@/routes/paths'

/**
 * Meta-alerta de la API (no está en el diseño de Figma): avisa si la semana cayó muy por debajo de su
 * promedio reciente en envíos o en respuestas, es decir, si el sistema pudo dejar de enviar o de
 * recibir mensajes sin que nadie lo note.
 */
export function MetaAlertBanner({ message, semana }: { message: string; semana: string }) {
  return (
    <div
      role="alert"
      aria-label="Meta-alerta"
      className="flex flex-col gap-3 rounded-[20px] border border-brand/30 bg-brand-soft p-5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] sm:flex-row sm:items-start sm:gap-4"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white">
        <img src={signalIcon} alt="" width={15} height={14.325} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[11px] leading-[14px] font-semibold tracking-[0.55px] text-brand-dark uppercase">
          Meta-alerta · {etiquetaSemana(semana)}
        </p>
        <p className="text-lg leading-6 font-semibold text-ink-strong">{message}</p>
        <p className="max-w-[768px] text-[13px] leading-[18px] text-muted">
          YAWAR compara cada semana con el promedio de las semanas anteriores para detectar si el sistema dejó de
          enviar recordatorios o de recibir respuestas sin que nadie lo note.
        </p>
        <p className="flex max-w-[768px] items-start gap-1 pt-1">
          <img src={infoSmallIcon} alt="" width={10} height={10} className="mt-0.5 shrink-0" />
          <span className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-nav-ink">
            Al inicio de la semana puede aparecer aunque nada esté roto: los recordatorios o las respuestas de esta
            semana todavía no llegan. Si sigue al final de la semana, revisa que los recordatorios se hayan enviado
            en{' '}
            <Link to={paths.planificacion} className="font-semibold text-brand-dark hover:underline print:no-underline">
              Planificación
            </Link>
            .
          </span>
        </p>
      </div>
    </div>
  )
}
