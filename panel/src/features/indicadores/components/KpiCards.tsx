import type { ReactNode } from 'react'
import sendIcon from '../assets/send.svg'
import signalIcon from '../assets/signal.svg'
import shieldIcon from '../assets/shield.svg'
import chatIcon from '../assets/chat.svg'
import checkCircleIcon from '../assets/check-circle.svg'
import infoIcon from '../assets/info.svg'
import difficultyIcon from '../assets/difficulty.svg'
import { tasa } from '@/lib/dominio'
import { cn } from '@/lib/cn'
import { plural, pctText, pctWidth } from '../format'
import { IndicatorCard } from './IndicatorCard'
import type { IndicatorsReport } from '../types'

interface KpiCardProps {
  dotColor: string
  title: string
  icon: { src: string; width: number; height: number }
  value: number
  valueClassName?: string
  unit: ReactNode
  children?: ReactNode
  footer?: ReactNode
}

function KpiCard({ dotColor, title, icon, value, valueClassName, unit, children, footer }: KpiCardProps) {
  return (
    <IndicatorCard as="article" className="flex flex-col justify-between gap-6 overflow-hidden">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
          <h2 className="text-xs leading-4 font-semibold tracking-[0.6px] text-muted uppercase">{title}</h2>
        </div>
        <img src={icon.src} alt="" width={icon.width} height={icon.height} className="shrink-0" />
      </header>
      <div className="flex flex-col">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn('text-[32px] leading-10 font-bold tracking-[-0.8px] text-ink-strong', valueClassName)}>
            {value}
          </span>
          {unit}
        </p>
        {children}
      </div>
      {footer}
    </IndicatorCard>
  )
}

const unitClass = 'text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted'
const descriptionClass = 'pt-1 text-[13px] leading-[18px] text-muted'

export function KpiCards({ report }: { report: IndicatorsReport }) {
  const { reminders, deliveryFailures, responses, adherence } = report
  const sentShare = tasa(reminders.sent, reminders.attempted)

  return (
    <section aria-label="Indicadores clave" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {/* La API cuenta los recordatorios aceptados por WhatsApp; no confirma entrega ni lectura */}
      <KpiCard
        dotColor="#635d5d"
        title="Recordatorios enviados"
        icon={{ src: sendIcon, width: 15, height: 12.75 }}
        value={reminders.attempted}
        unit={<span className={unitClass}>recordatorios programados</span>}
        footer={
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[#e2eae3]">
            <div className="h-full bg-ink-strong" style={{ width: `${pctWidth(sentShare)}%` }} />
          </div>
        }
      >
        <p className={descriptionClass}>
          <span className="font-semibold text-ink-strong">{reminders.sent}</span> enviados ({pctText(sentShare)}):
          aceptados por WhatsApp, sin confirmación de lectura
        </p>
      </KpiCard>

      <KpiCard
        dotColor="#906f6d"
        title="Fallas de envío"
        icon={{ src: signalIcon, width: 15, height: 14.325 }}
        value={deliveryFailures.count}
        unit={<span className={unitClass}>({pctText(deliveryFailures.share)} de los intentos)</span>}
        footer={
          <p className="flex items-center gap-1.5">
            <img src={shieldIcon} alt="" width={8} height={10} />
            <span className={unitClass}>No se cuentan como falta de respuesta</span>
          </p>
        }
      >
        <p className={descriptionClass}>WhatsApp no aceptó el envío (no imputable al cuidador)</p>
      </KpiCard>

      <KpiCard
        dotColor="#8f0017"
        title="Respuestas recibidas"
        icon={{ src: chatIcon, width: 15, height: 15 }}
        value={responses.received}
        unit={
          <span className="text-[11px] leading-[14px] font-semibold tracking-[0.33px] text-brand-dark">
            {pctText(responses.rate)} tasa de respuesta
          </span>
        }
        footer={
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e2eae3]">
            <div className="h-full rounded-full bg-brand-dark" style={{ width: `${pctWidth(responses.rate)}%` }} />
          </div>
        }
      >
        <p className={descriptionClass}>
          {plural(responses.received, 'cuidador', 'cuidadores')} {responses.received === 1 ? 'respondió' : 'respondieron'}{' '}
          de {plural(responses.sent, 'recordatorio')} {responses.sent === 1 ? 'enviado' : 'enviados'}
        </p>
      </KpiCard>

      <KpiCard
        dotColor="#b81025"
        title="Adherencia declarada"
        icon={{ src: checkCircleIcon, width: 15, height: 15 }}
        value={adherence.declaredYes}
        valueClassName="text-brand-dark"
        unit={
          <span className={unitClass}>
            «Sí le di» ({pctText(tasa(adherence.declaredYes, responses.received))})
          </span>
        }
        footer={
          <p className="flex items-center justify-between gap-2">
            <span className={unitClass}>
              {plural(adherence.casesWithDifficulties, 'caso')} con dificultades (
              {pctText(tasa(adherence.casesWithDifficulties, responses.received))})
            </span>
            <img src={difficultyIcon} alt="" width={11.667} height={10.5} className="shrink-0" />
          </p>
        }
      >
        <div className="pt-1.5">
          <p className="flex items-start gap-1 rounded-lg bg-[#eef6ee] p-2">
            <img src={infoIcon} alt="" width={10} height={12} className="shrink-0" />
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-nav-ink">
              Declaración informada por el cuidador vía WhatsApp, no constituye verificación biológica ni dosaje
              directo de hemoglobina.
            </span>
          </p>
        </div>
      </KpiCard>
    </section>
  )
}
