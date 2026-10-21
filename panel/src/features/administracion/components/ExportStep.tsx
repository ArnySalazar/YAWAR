import { useId, type ReactNode } from 'react'
import { useHoy, useListaSemana } from '@/api/queries'
import { AsyncContent, Skeleton } from '@/components/ui/AsyncContent'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { etiquetaSemanaLarga } from '@/lib/semana'
import csvFileIcon from '../assets/csv-file.svg'
import downloadIcon from '../assets/download.svg'
import exportPrintIcon from '../assets/tab-export-print.svg'
import { buildPrintableList } from '../api'
import { useDownloadWeeklyListCsv } from '../hooks'
import { PanelCard, PanelHeading, Pill } from './PanelCard'
import { PrintableList } from './PrintableList'

const PRIMARY_BUTTON =
  'flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-2.5 text-center text-[12px] leading-4 font-semibold tracking-[0.24px] text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand sm:w-auto'

const SECONDARY_BUTTON =
  'flex w-full items-center justify-center gap-1.5 rounded-full border border-line bg-chip px-5 py-2.5 text-center text-[12px] leading-4 font-medium tracking-[0.24px] text-ink transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-chip sm:w-auto'

/**
 * Paso 3 "Exportación y respaldo físico" (plan B de docs/riesgos_demo.md): la lista de la semana
 * en CSV (GET lista.csv) y una hoja A4 para imprimir con la lista ya generada.
 */
export function ExportStep() {
  const headingId = useId()
  const { establecimiento, capacidad } = useEstablecimiento()
  const { dia, semana } = useHoy()
  const lista = useListaSemana()
  const download = useDownloadWeeklyListCsv()
  const hasRows = (lista.data?.length ?? 0) > 0
  const [anio, mes, d] = dia.split('-')

  return (
    <div className="flex flex-col gap-6">
      <PanelCard aria-labelledby={headingId} className="gap-6 print:hidden">
        <PanelHeading
          id={headingId}
          title="Exportación y respaldo físico"
          icon={exportPrintIcon}
          iconWidth={14.1667}
          iconHeight={12.75}
          description={
            <p className="text-[13px] leading-[18px] text-[#5b5858]">
              Plan B si algo falla en campo o en la demo: la lista de la semana de {establecimiento} en CSV o impresa en
              A4.
            </p>
          }
          aside={<Pill className="text-muted">Sin teléfonos</Pill>}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ExportOption
            icon={csvFileIcon}
            iconWidth={16}
            iconHeight={20}
            title="Lista de la semana en CSV"
            description={`El archivo que entrega la API: orden, código, alias, edad, acción, motivos y regla. Al exportar, la API vuelve a generar la lista con la capacidad actual (${capacidad} visitas).`}
            feedback={
              download.isError ? (
                <p role="alert" className="text-[12px] leading-4 font-medium text-brand">
                  No se pudo descargar la lista: {download.error.message}
                </p>
              ) : download.isSuccess ? (
                <p className="text-[12px] leading-4 font-medium text-success">Lista descargada.</p>
              ) : null
            }
          >
            <button
              type="button"
              onClick={() => download.mutate()}
              disabled={download.isPending}
              className={SECONDARY_BUTTON}
            >
              <img src={downloadIcon} alt="" width={10.6667} height={10.6667} className="shrink-0" />
              {download.isPending ? 'Descargando…' : 'Descargar lista CSV'}
            </button>
          </ExportOption>

          <ExportOption
            icon={exportPrintIcon}
            iconWidth={14.1667}
            iconHeight={12.75}
            title="Lista impresa (A4)"
            description="La lista ya generada (vista previa abajo), con una columna en blanco para anotar visitas y observaciones. No vuelve a pedir la lista a la API."
          >
            <button type="button" onClick={() => window.print()} disabled={!hasRows} className={PRIMARY_BUTTON}>
              Imprimir lista (A4)
            </button>
          </ExportOption>
        </div>
      </PanelCard>

      <section aria-label="Vista previa de impresión" className="flex flex-col gap-3">
        <p className="text-[11px] leading-[14px] font-semibold tracking-[0.55px] text-[#5b5858] uppercase print:hidden">
          Vista previa de impresión
        </p>
        <AsyncContent query={lista} loading={<Skeleton className="h-[420px] w-full rounded-[12px]" />}>
          {(filas) =>
            filas.length === 0 ? (
              <div className="rounded-[12px] border-2 border-dashed border-line bg-[rgba(241,243,242,0.6)] px-5 py-12 text-center print:hidden">
                <p className="text-[14px] leading-5 font-semibold text-ink">
                  Aún no hay niños en el padrón de {establecimiento}.
                </p>
                <p className="text-[13px] leading-[18px] text-[#5b5858]">Cárguelo en el paso 1 para generar la lista.</p>
              </div>
            ) : (
              <PrintableList
                rows={buildPrintableList(filas)}
                establishment={establecimiento}
                weekLabel={etiquetaSemanaLarga(semana)}
                printedOn={`${d}/${mes}/${anio}`}
              />
            )
          }
        </AsyncContent>
      </section>
    </div>
  )
}

interface ExportOptionProps {
  icon: string
  iconWidth: number
  iconHeight: number
  title: string
  description: string
  feedback?: ReactNode
  children: ReactNode
}

function ExportOption({ icon, iconWidth, iconHeight, title, description, feedback, children }: ExportOptionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-line bg-chip p-4">
      <div className="flex items-start gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-white">
          <img src={icon} alt="" width={iconWidth} height={iconHeight} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[14px] leading-5 font-semibold text-ink">{title}</h3>
          <p className="text-[13px] leading-[18px] text-[#5b5858]">{description}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        {children}
        {feedback}
      </div>
    </div>
  )
}
