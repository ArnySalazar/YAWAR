import { useId, useState } from 'react'
import { cn } from '@/lib/cn'
import criteriaIcon from '../assets/criteria.svg'
import chevronDownIcon from '../assets/chevron-down.svg'
import gavelIcon from '../assets/gavel.svg'

const rules = [
  {
    rule: 'R1',
    number: 1,
    tone: 'bg-brand-dark text-white',
    title: 'Dificultad reportada (Máxima)',
    description:
      'Primero, cualquier mensaje con una posible señal de peligro (revisar hoy) y los mensajes que debe leer una persona. Luego, cuidadores que esta semana o la anterior respondieron "No le di" o "Tuve un problema" (por ejemplo: no le gusta, estreñimiento, se acabó el hierro, se olvidó).',
  },
  {
    rule: 'R2',
    number: 2,
    tone: 'bg-[#603e00] text-white',
    title: 'Sin respuesta > 7 días (Media-Alta)',
    description:
      'Cuidadores que no respondieron el recordatorio de la semana pasada y ya pasaron 7 días o más desde el envío.',
  },
  {
    rule: 'R3',
    number: 3,
    tone: 'bg-[#2b322d] text-[#ebf3eb]',
    title: 'Probabilidad de no consumo (Predictiva)',
    description:
      'El resto, ordenado por la probabilidad estimada de no estar tomando el hierro (modelo con edad, controles CRED desde el nacimiento, atraso en controles y presentación del hierro). En cada regla, los niños en tratamiento de anemia van primero.',
  },
] as const

export function RulesBanner() {
  const [expanded, setExpanded] = useState(true)
  const panelId = useId()

  return (
    <section
      aria-labelledby={`${panelId}-title`}
      className="flex flex-col gap-3 rounded-[16px] bg-chip p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#dde5dd]">
            <img src={criteriaIcon} alt="" width={12.6745} height={13.3333} />
          </span>
          <div>
            <h2 id={`${panelId}-title`} className="text-[16px] leading-6 font-semibold text-ink-strong sm:text-[18px]">
              Criterios de Ordenación Asistida para la Toma de Decisiones CRED
            </h2>
            <p className="text-[13px] leading-[18px] text-muted">
              Diseñado para apoyar el juicio de enfermería, sin reemplazar la evaluación clínica presencial.
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex shrink-0 items-center gap-2 self-end rounded-full text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted hover:text-ink-strong sm:self-start"
        >
          Ver detalles de reglas
          <img
            src={chevronDownIcon}
            alt=""
            width={12}
            height={7.4}
            className={cn('transition-transform', !expanded && 'rotate-180')}
          />
        </button>
      </div>

      {expanded && (
        <ol id={panelId} className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3 md:pt-5">
          {rules.map((item) => (
            <li key={item.rule} className="flex flex-col gap-2 rounded-[12px] bg-white p-4">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full pt-0.5 pb-[3px] text-[10px] leading-[15px] font-bold',
                    item.tone,
                  )}
                >
                  {item.number}
                </span>
                <h3 className="text-[12px] leading-4 font-semibold tracking-[0.24px] text-ink-strong">{item.title}</h3>
              </div>
              <p className="text-[13px] leading-[18px] text-muted">{item.description}</p>
            </li>
          ))}
        </ol>
      )}

      <p className="flex items-start gap-2 text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
        <img src={gavelIcon} alt="" width={10.5} height={11.0833} className="mt-[1.46px] shrink-0" />
        <span>
          <strong className="font-bold">Aviso deontológico:</strong> Priorización sugerida. El sistema asiste y
          propone; el criterio profesional de enfermería prevalece siempre en la asignación final de visitas.
        </span>
      </p>
    </section>
  )
}
