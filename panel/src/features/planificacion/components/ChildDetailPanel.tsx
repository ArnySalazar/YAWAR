import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/routes/paths'
import { channelLabel, reportWhen } from '../utils'
import type { PlannedChild, PriorityRule } from '../types'

const ruleTitle: Record<PriorityRule, string> = {
  R1: 'Regla 1 · Dificultad reportada (Máxima)',
  R2: 'Regla 2 · Sin respuesta > 7 días (Media-Alta)',
  R3: 'Regla 3 · Probabilidad de no consumo (Predictiva)',
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] leading-[14px] font-semibold tracking-[0.55px] text-muted uppercase">{label}</dt>
      <dd className="text-[13px] leading-[18px] text-ink-strong">{children}</dd>
    </div>
  )
}

/** Detalle del caso (fila expandible de la tabla o de la tarjeta). */
export function ChildDetailPanel({ child }: { child: PlannedChild }) {
  const isVisit = child.assignment.channel === 'home_visit'
  return (
    <div className="flex flex-col gap-4 rounded-[12px] border border-line bg-white p-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="Cuidador">{child.caregiverAlias}</Fact>
        <Fact label="Criterio aplicado">
          {ruleTitle[child.signal.rule]}
          <span className="mt-1 block text-[11px] leading-[14px] font-medium text-nav-ink">
            {child.followUpNote ?? child.ruleText}
          </span>
        </Fact>
        <Fact label="Motivos del modelo">{child.reasons.length ? child.reasons.join(' · ') : '—'}</Fact>
        <Fact label="Asignación">{channelLabel(child.assignment)}</Fact>
        <Fact label="Última respuesta">
          {child.lastReport === undefined
            ? 'Cargando…'
            : child.lastReport === null
              ? 'Sin respuestas registradas'
              : `${child.lastReport.text} — ${reportWhen(child.lastReport)}`}
        </Fact>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={paths.fichaNino(child.code)}
          className="rounded-full bg-brand px-4 py-2 text-[12px] leading-4 font-semibold tracking-[0.24px] text-white hover:bg-brand-dark"
        >
          Abrir ficha del niño
        </Link>
        {!isVisit && (
          <Link
            to={paths.comunicacion}
            className="rounded-full px-4 py-2 text-[12px] leading-4 font-semibold tracking-[0.24px] text-nav-ink hover:bg-chip"
          >
            Ver respuestas en Comunicación
          </Link>
        )}
      </div>
    </div>
  )
}
