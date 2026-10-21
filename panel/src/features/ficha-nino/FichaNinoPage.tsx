import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { AsyncContent, Skeleton } from '@/components/ui/AsyncContent'
import { paths } from '@/routes/paths'
import { useChildFollowUp } from './hooks'
import { FichaHeader } from './components/FichaHeader'
import { IdentityCard } from './components/IdentityCard'
import { RegistryCard } from './components/RegistryCard'
import { NextActionCard } from './components/NextActionCard'
import { FichaTabs, type FichaTab } from './components/FichaTabs'
import { BotHistoryCard } from './components/BotHistoryCard'
import { EvolutionCard } from './components/EvolutionCard'
import type { ChildFollowUp } from './types'

export default function FichaNinoPage() {
  const { childId = '' } = useParams()
  const { historial, lista, child } = useChildFollowUp(childId)
  const [tab, setTab] = useState<FichaTab>('resumen')

  return (
    <PageContainer>
      <FichaHeader code={childId} roster={child?.roster ?? null} />

      <AsyncContent query={historial} loading={<FichaSkeleton />}>
        {() =>
          child === undefined ? (
            <FichaSkeleton />
          ) : child === null ? (
            <ChildNotFound code={childId} />
          ) : (
            <>
              {lista.isError ? (
                <RosterError message={lista.error.message} onRetry={() => lista.refetch()} />
              ) : (
                child.rosterStatus === 'fuera_de_lista' && <NotInRoster child={child} />
              )}

              <section aria-label="Tarjetas principales de resumen" className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-12">
                <IdentityCard child={child} className="xl:col-span-3" />
                <RegistryCard child={child} className="xl:col-span-5" />
                <NextActionCard child={child} className="lg:col-span-2 xl:col-span-4" />
              </section>

              <FichaTabs value={tab} onChange={setTab} />

              <section id="ficha-tabpanel" role="tabpanel" aria-labelledby={`ficha-tab-${tab}`}>
                <TabContent tab={tab} child={child} />
              </section>
            </>
          )
        }
      </AsyncContent>
    </PageContainer>
  )
}

function TabContent({ tab, child }: { tab: FichaTab; child: ChildFollowUp }) {
  if (tab === 'historial') {
    return <BotHistoryCard entries={child.botHistory} />
  }

  if (tab === 'dificultades') {
    const difficulties = child.botHistory.filter((entry) => entry.status === 'alerta' || entry.status === 'interrupcion')
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <BotHistoryCard
          title="Dificultades Reportadas"
          entries={difficulties}
          emptyMessage="El cuidador no reportó dificultades en las semanas registradas."
        />
        <EvolutionCard answers={child.answerTrend} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <BotHistoryCard entries={child.botHistory.slice(0, 4)} />
      <EvolutionCard answers={child.answerTrend} />
    </div>
  )
}

function FichaSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-12" aria-label="Cargando ficha del niño">
      <Skeleton className="h-[368px] rounded-[22px] xl:col-span-3" />
      <Skeleton className="h-[368px] rounded-[22px] xl:col-span-5" />
      <Skeleton className="h-[368px] rounded-[22px] lg:col-span-2 xl:col-span-4" />
    </div>
  )
}

/** Enlace directo a un niño de otro establecimiento (o que salió de la lista): solo hay historial. */
function NotInRoster({ child }: { child: ChildFollowUp }) {
  return (
    <div role="status" className="flex flex-col gap-1 rounded-[22px] border border-[#fde68a] bg-[#fffbeb] p-5">
      <p className="text-sm font-semibold text-[#78350f]">
        {child.code} no está en la lista de esta semana de {child.establishmentId}.
      </p>
      <p className="text-xs leading-[19.5px] text-[#92400e]">
        La edad, el cuidador y la próxima acción solo vienen en la lista de la semana. Si el niño pertenece a otro
        establecimiento, elígelo en el selector de la cabecera. Abajo está su historial de respuestas.
      </p>
    </div>
  )
}

function RosterError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-[22px] border border-brand/20 bg-brand-soft p-5">
      <p className="text-sm font-semibold text-brand">No se pudo cargar la lista de la semana: se muestra solo el historial.</p>
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

function ChildNotFound({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[22px] border border-line bg-white p-6">
      <p className="text-sm font-semibold text-ink">No encontramos un niño con el código {code}.</p>
      <p className="text-xs text-[#6b7280]">
        No tiene historial y no está en la lista de la semana. Verifica el código, cambia de establecimiento en el
        selector o vuelve al listado.
      </p>
      <Link to={paths.ninos} className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark">
        Ver niños en seguimiento
      </Link>
    </div>
  )
}
