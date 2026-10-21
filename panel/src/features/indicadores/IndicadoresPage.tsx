import { Link } from 'react-router'
import { useHoy } from '@/api/queries'
import { PageContainer } from '@/components/layout/PageContainer'
import { AsyncContent, Skeleton } from '@/components/ui/AsyncContent'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { etiquetaSemana } from '@/lib/semana'
import { paths } from '@/routes/paths'
import { chartMax } from './api'
import { useDifficultySummary, useIndicatorsReport } from './hooks'
import { ChannelCard } from './components/ChannelCard'
import { CommandBar } from './components/CommandBar'
import { DifficultyReasonsCard } from './components/DifficultyReasonsCard'
import { FormulaCard } from './components/FormulaCard'
import { IndicatorCard } from './components/IndicatorCard'
import { KpiCards } from './components/KpiCards'
import { MetaAlertBanner } from './components/MetaAlertBanner'
import { WeeklyTrendChart } from './components/WeeklyTrendChart'

export default function IndicadoresPage() {
  const { establecimientos, establecimiento, setEstablecimiento } = useEstablecimiento()
  const { modoPrueba } = useHoy()
  const { query, report, weeks, semana, setSemana } = useIndicatorsReport()
  const difficulties = useDifficultySummary(report?.semana)

  return (
    <PageContainer>
      <CommandBar
        establishments={establecimientos}
        establishmentId={establecimiento}
        onEstablishmentChange={setEstablecimiento}
        weeks={weeks}
        selectedWeek={semana}
        onWeekChange={setSemana}
        report={report}
        difficulties={difficulties.summary}
      />

      <AsyncContent query={query} loading={<IndicatorsSkeleton />}>
        {() => {
          if (!report) return null
          const showChart = chartMax(report.weeklyTrend) > 0
          return (
            <div className="flex flex-col gap-6">
              {report.metaAlert && <MetaAlertBanner message={report.metaAlert} semana={report.semana} />}

              {report.hasActivity ? (
                <>
                  <KpiCards report={report} />
                  <FormulaCard report={report} />
                </>
              ) : (
                <EmptyWeek semana={report.semana} establishmentId={report.establishmentId} />
              )}

              {(showChart || report.hasActivity) && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  {showChart && (
                    <WeeklyTrendChart
                      points={report.weeklyTrend}
                      className={report.hasActivity ? 'xl:col-span-7' : 'xl:col-span-12'}
                    />
                  )}
                  {report.hasActivity && (
                    <DifficultyReasonsCard
                      semana={report.semana}
                      establishmentId={report.establishmentId}
                      summary={difficulties.summary}
                      error={difficulties.error}
                      onRetry={difficulties.retry}
                      className={showChart ? 'xl:col-span-5' : 'xl:col-span-12'}
                    />
                  )}
                </div>
              )}

              <ChannelCard isTestMode={modoPrueba} />
            </div>
          )
        }}
      </AsyncContent>
    </PageContainer>
  )
}

/** Semana sin recordatorios: la API la devuelve en ceros (o no la devuelve, si no es la pedida). */
function EmptyWeek({ semana, establishmentId }: { semana: string; establishmentId: string }) {
  return (
    <IndicatorCard className="flex flex-col items-start gap-3">
      <h2 className="text-lg leading-6 font-semibold text-ink-strong">Sin envíos en la {etiquetaSemana(semana)}</h2>
      <p className="max-w-[640px] text-[13px] leading-[18px] text-muted">
        No hay recordatorios enviados a los cuidadores de {establishmentId} en esta semana. Los indicadores se
        calculan a partir de los recordatorios enviados y de las respuestas que llegan por WhatsApp.
      </p>
      <Link
        to={paths.planificacion}
        className="rounded-full bg-brand px-4 py-2 text-xs leading-4 font-semibold tracking-[0.24px] text-white hover:bg-brand-dark print:hidden"
      >
        Ir a Planificación
      </Link>
    </IndicatorCard>
  )
}

function IndicatorsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Cargando indicadores">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[200px]" />
        ))}
      </div>
      <Skeleton className="h-[120px]" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Skeleton className="h-[414px] xl:col-span-7" />
        <Skeleton className="h-[414px] xl:col-span-5" />
      </div>
    </div>
  )
}
