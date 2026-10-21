import { useId } from 'react'
import { Link } from 'react-router'
import type { FilaLista } from '@/api/yawar'
import { cn } from '@/lib/cn'
import { paths } from '@/routes/paths'
import { useOperationalAlerts } from '../hooks'
import type { OperationalAlertType } from '../types'
import alertTriangleIcon from '../assets/icon-alert-triangle.svg'
import noResponseIcon from '../assets/icon-alert-no-response.svg'
import effectsIcon from '../assets/icon-alert-effects.svg'

const TYPE_STYLE: Record<
  OperationalAlertType,
  { icon: { src: string; width: number; height: number }; iconBg: string; tag: string; item: string }
> = {
  meta_alert: {
    icon: { src: alertTriangleIcon, width: 15.6, height: 13.5 },
    iconBg: 'bg-[#ffdad6]',
    tag: 'bg-brand text-white',
    item: 'border border-brand/30 bg-brand-soft',
  },
  no_response: {
    icon: { src: noResponseIcon, width: 13.217, height: 13.217 },
    iconBg: 'bg-[#ffdad6]',
    tag: 'bg-[#ffdad6] text-[#93000a]',
    item: 'bg-chip',
  },
  reported_problem: {
    icon: { src: effectsIcon, width: 14, height: 12 },
    iconBg: 'bg-[#ffddb3]',
    tag: 'bg-[#ffddb3] text-[#603e00]',
    item: 'bg-chip',
  },
}

/** Alertas de la semana: meta-alerta de la API y niños con señal R1 o R2 en la lista. */
export function AlertsCard({ lista }: { lista: FilaLista[] }) {
  const { query, alerts } = useOperationalAlerts(lista)
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <img src={alertTriangleIcon} alt="" width={22} height={19} className="shrink-0" />
          <h2 id={headingId} className="text-lg font-semibold leading-6 text-ink">
            Alertas Operativas Críticas
          </h2>
        </div>
        <Link
          to={paths.planificacion}
          className="shrink-0 text-[11px] font-medium leading-[14px] tracking-[0.33px] text-muted hover:text-ink hover:underline"
        >
          Ver todas
        </Link>
      </div>

      {alerts.length === 0 ? (
        <p className="rounded-lg bg-chip p-3.5 text-[13px] leading-[18px] text-muted">
          Sin alertas operativas por ahora.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map((alert) => {
            const style = TYPE_STYLE[alert.type]
            return (
              <li key={alert.type} className={cn('flex items-start gap-3 rounded-lg p-3.5', style.item)}>
                <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', style.iconBg)}>
                  <img src={style.icon.src} alt="" width={style.icon.width} height={style.icon.height} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <h3 className="text-xs font-semibold leading-4 tracking-[0.24px] text-ink">{alert.title}</h3>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold leading-[14px] tracking-[0.33px]',
                        style.tag,
                      )}
                    >
                      {alert.tag}
                    </span>
                  </div>
                  <p className="pt-0.5 text-[13px] leading-[18px] text-muted">{alert.description}</p>
                  {alert.note && (
                    <p className="pt-1.5 text-[11px] font-medium leading-[14px] tracking-[0.33px] text-nav-ink">
                      <strong className="font-bold">Ojo:</strong> {alert.note}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {query.isError && (
        <p className="text-[11px] font-medium leading-[14px] tracking-[0.33px] text-brand-dark">
          No se pudo revisar la meta-alerta: {query.error.message}
        </p>
      )}
    </section>
  )
}
