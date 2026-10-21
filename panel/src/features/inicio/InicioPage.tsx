import { Link } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { AsyncContent, Skeleton } from '@/components/ui/AsyncContent'
import { useListaSemana } from '@/api/queries'
import type { FilaLista } from '@/api/yawar'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { paths } from '@/routes/paths'
import { useHomeOverview } from './hooks'
import { GreetingHeader } from './components/GreetingHeader'
import { KpiCards } from './components/KpiCards'
import { PrioritizedChildrenCard } from './components/PrioritizedChildrenCard'
import { AlertsCard } from './components/AlertsCard'
import { CapacityCard } from './components/CapacityCard'

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Cargando el resumen de la semana">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[178px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <Skeleton className="h-[460px] rounded-xl lg:col-span-8" />
        <div className="flex flex-col gap-4 lg:col-span-4">
          <Skeleton className="h-[220px] rounded-xl" />
          <Skeleton className="h-[220px] rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function EmptyRoster({ establishmentId }: { establishmentId: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-white p-6">
      <p className="text-sm leading-5 font-semibold text-ink-strong">Aún no hay niños en el padrón de {establishmentId}.</p>
      <p className="text-[13px] leading-[18px] text-muted">
        Carga el padrón para generar la lista de la semana y ver aquí el resumen.
      </p>
      <Link
        to={paths.administracion}
        className="rounded-full bg-brand px-4 py-2 text-xs leading-4 font-semibold tracking-[0.24px] text-white hover:bg-brand-dark"
      >
        Cargar padrón
      </Link>
    </div>
  )
}

function HomeDashboard({ lista }: { lista: FilaLista[] }) {
  const overview = useHomeOverview(lista)

  return (
    <>
      <KpiCards overview={overview} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <PrioritizedChildrenCard overview={overview} />
        </div>
        <aside aria-label="Alertas y capacidad" className="flex min-w-0 flex-col gap-4 lg:col-span-4">
          <AlertsCard lista={lista} />
          {/* La clave reinicia el selector de N cuando la lista se vuelve a generar */}
          <CapacityCard key={`${overview.establishmentId}-${overview.homeVisits.capacityN}`} overview={overview} />
        </aside>
      </div>
    </>
  )
}

export default function InicioPage() {
  const listaQuery = useListaSemana()
  const { establecimiento } = useEstablecimiento()

  return (
    <PageContainer>
      <GreetingHeader rosterSize={listaQuery.data?.length} />
      <AsyncContent query={listaQuery} loading={<HomeSkeleton />}>
        {(lista) => (lista.length === 0 ? <EmptyRoster establishmentId={establecimiento} /> : <HomeDashboard lista={lista} />)}
      </AsyncContent>
    </PageContainer>
  )
}
