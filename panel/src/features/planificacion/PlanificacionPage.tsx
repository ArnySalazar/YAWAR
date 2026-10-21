import { Link } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { AsyncContent, Skeleton } from '@/components/ui/AsyncContent'
import { useListaSemana } from '@/api/queries'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { paths } from '@/routes/paths'
import { WeeklyPlanView } from './components/WeeklyPlanView'

function PlanSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Cargando planificación semanal">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-72 max-w-full rounded-full" />
        <Skeleton className="h-10 w-80 max-w-full rounded-[12px]" />
        <Skeleton className="h-10 w-full max-w-[600px] rounded-[12px]" />
      </div>
      <Skeleton className="h-56 w-full rounded-[16px]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[154px] rounded-[16px]" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-[16px]" />
    </div>
  )
}

function EmptyRoster({ establishmentId }: { establishmentId: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[16px] border border-line bg-white p-6">
      <p className="text-[14px] leading-5 font-semibold text-ink-strong">
        Aún no hay niños en el padrón de {establishmentId}.
      </p>
      <p className="text-[13px] leading-[18px] text-muted">Carga el padrón para generar la planificación de la semana.</p>
      <Link
        to={paths.administracion}
        className="rounded-full bg-brand px-4 py-2 text-[12px] leading-4 font-semibold tracking-[0.24px] text-white hover:bg-brand-dark"
      >
        Cargar padrón
      </Link>
    </div>
  )
}

export default function PlanificacionPage() {
  const listaQuery = useListaSemana()
  const { establecimiento } = useEstablecimiento()

  return (
    <PageContainer>
      <AsyncContent query={listaQuery} loading={<PlanSkeleton />}>
        {(lista) =>
          lista.length === 0 ? <EmptyRoster establishmentId={establecimiento} /> : <WeeklyPlanView lista={lista} />
        }
      </AsyncContent>
    </PageContainer>
  )
}
