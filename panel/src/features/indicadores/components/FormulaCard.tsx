import calculatorIcon from '../assets/calculator.svg'
import { etiquetaSemana } from '@/lib/semana'
import { pctText } from '../format'
import { IndicatorCard } from './IndicatorCard'
import type { IndicatorsReport } from '../types'

/** Transparencia en el cálculo de tasas y denominadores. */
export function FormulaCard({ report }: { report: IndicatorsReport }) {
  const { responses, deliveryFailures } = report

  return (
    <IndicatorCard className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <div className="flex max-w-[768px] items-start gap-4">
        <span className="flex shrink-0 rounded-xl bg-[#e2eae3] p-3">
          <img src={calculatorIcon} alt="" width={15} height={15} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg leading-6 font-semibold text-ink-strong">
            Transparencia en el cálculo de tasas y denominadores
          </h2>
          <p className="max-w-[560px] text-[13px] leading-[18px] text-muted">
            Los recordatorios que no se pudieron enviar ({deliveryFailures.count} en la {etiquetaSemana(report.semana)})
            quedan fuera del denominador. Así, una falla técnica del envío no se cuenta como falta de respuesta de la
            madre o cuidador.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center rounded-xl bg-[#eef6ee] px-4 py-3 lg:max-w-[480px]">
        <p className="pb-1 text-[11px] leading-[14px] font-medium tracking-[0.55px] text-muted uppercase">
          Fórmula de la tasa de respuesta
        </p>
        <p className="flex flex-wrap items-center gap-2 font-mono text-sm leading-5 font-bold">
          <span className="text-ink-strong">Respuestas recibidas ({responses.received})</span>
          <span className="text-muted">/</span>
          <span className="text-ink-strong">Enviados ({responses.sent})</span>
          <span className="text-brand-dark">= {pctText(responses.rate)}</span>
        </p>
      </div>
    </IndicatorCard>
  )
}
