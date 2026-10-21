import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import { paths } from '@/routes/paths'
import { useWhatsappStats } from '../hooks'
import { formatPct, plural } from '../utils'
import type { HomeOverview } from '../types'
import padronIcon from '../assets/icon-kpi-padron.svg'
import priorizadosIcon from '../assets/icon-kpi-priorizados.svg'
import visitasIcon from '../assets/icon-kpi-visitas.svg'
import whatsappIcon from '../assets/icon-kpi-whatsapp.svg'
import chevronRightIcon from '../assets/icon-chevron-right.svg'
import algorithmIcon from '../assets/icon-algorithm.svg'
import syncIcon from '../assets/icon-sync.svg'

interface KpiCardProps {
  to: string
  title: string
  icon: { src: string; width: number; height: number }
  iconBgClass: string
  value: ReactNode
  badge?: ReactNode
  footer: ReactNode
  footerIndicator: ReactNode
}

function KpiCard({ to, title, icon, iconBgClass, value, badge, footer, footerIndicator }: KpiCardProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0px_4px_12px_rgba(0,0,0,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', iconBgClass)}>
            <img src={icon.src} alt="" width={icon.width} height={icon.height} />
          </span>
          <h2 className="text-xs font-semibold leading-4 tracking-[0.24px] text-muted">{title}</h2>
        </div>
        <img
          src={chevronRightIcon}
          alt=""
          width={7.4}
          height={12}
          className="shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-4">
        {value}
        {badge}
      </div>

      <div className="flex items-end justify-between gap-2 pt-6">
        <div className="text-[11px] font-medium leading-[14px] tracking-[0.33px] text-muted">{footer}</div>
        {footerIndicator}
      </div>
    </Link>
  )
}

const valueClass = 'text-[32px] font-bold leading-10 text-ink'
const badgeClass = 'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-[14px] tracking-[0.33px]'

/** Respuestas al recordatorio de esta semana (de los indicadores, no de la lista). */
function useWhatsappKpi() {
  const { query, stats } = useWhatsappStats()

  const badge = query.isPending
    ? 'Cargando respuestas…'
    : query.isError
      ? 'Sin datos de respuestas'
      : plural(stats?.responses ?? 0, 'respuesta')

  const rate = query.isPending
    ? null
    : query.isError
      ? `No se pudieron leer los indicadores: ${query.error.message}`
      : stats?.responseRate != null
        ? `Tasa de respuesta ${formatPct(stats.responseRate * 100, 1)}`
        : 'Aún no se envían recordatorios esta semana'

  return { badge, rate }
}

export function KpiCards({ overview }: { overview: HomeOverview }) {
  const { roster, prioritized, homeVisits, whatsappFollowUps } = overview
  const whatsapp = useWhatsappKpi()
  const ageRange = roster.ageRangeMonths

  return (
    <section aria-label="Indicadores de la semana" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        to={paths.ninos}
        title={ageRange ? `Padrón Activo (${ageRange.min}-${ageRange.max} m)` : 'Padrón Activo'}
        icon={{ src: padronIcon, width: 16.5, height: 12 }}
        iconBgClass="bg-chip"
        value={<p className={valueClass}>{roster.total}</p>}
        badge={<span className={cn(badgeClass, 'bg-chip text-ink')}>{overview.establishmentId}</span>}
        footer="Todos reciben visita o WhatsApp"
        footerIndicator={<span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-dark" />}
      />
      <KpiCard
        to={paths.planificacion}
        title="Priorizados Esta Semana"
        icon={{ src: priorizadosIcon, width: 15, height: 16.5 }}
        iconBgClass="bg-[#ffddb3]"
        value={<p className={valueClass}>{prioritized.total}</p>}
        badge={
          <span className={cn(badgeClass, 'bg-[#ffddb3] text-[#603e00]')}>
            {formatPct(prioritized.registrySharePct)} del padrón
          </span>
        }
        footer="Con señal R1 (problema o no le dio) o R2 (sin respuesta)"
        footerIndicator={<span aria-hidden className="size-2 shrink-0 rounded-full bg-[#603e00]" />}
      />
      <KpiCard
        to={paths.planificacion}
        title="Visitas Asignadas (Cap N)"
        icon={{ src: visitasIcon, width: 12, height: 13.5 }}
        iconBgClass="bg-chip"
        value={
          <p className={valueClass}>
            {homeVisits.assigned}{' '}
            <span className="text-base font-normal leading-6 text-muted">/ {homeVisits.capacityN}</span>
          </p>
        }
        badge={
          <span className={cn(badgeClass, 'bg-track text-ink')}>{formatPct(homeVisits.coveragePct)} de la capacidad</span>
        }
        footer="Los primeros de la lista, por orden de prioridad"
        footerIndicator={<img src={algorithmIcon} alt="" width={9.506} height={10} className="shrink-0" />}
      />
      <KpiCard
        to={paths.comunicacion}
        title="Seguimiento WhatsApp"
        icon={{ src: whatsappIcon, width: 15, height: 15 }}
        iconBgClass="bg-track"
        value={<p className={valueClass}>{whatsappFollowUps}</p>}
        badge={<span className={cn(badgeClass, 'bg-[#ffdad7] text-[#410005]')}>{whatsapp.badge}</span>}
        footer={
          <>
            {whatsapp.rate && <p>{whatsapp.rate}</p>}
            <p className="pt-0.5 font-normal">El recordatorio va a todos los cuidadores, también a los de visita</p>
          </>
        }
        footerIndicator={<img src={syncIcon} alt="" width={8} height={8} className="shrink-0" />}
      />
    </section>
  )
}
