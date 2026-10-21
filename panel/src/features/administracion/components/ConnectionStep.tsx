import { useId } from 'react'
import { useSalud } from '@/api/queries'
import { Skeleton } from '@/components/ui/AsyncContent'
import { cn } from '@/lib/cn'
import connectionIcon from '../assets/tab-connection.svg'
import privacyShieldIcon from '../assets/privacy-shield.svg'
import { describeServerClock } from '../api'
import { PanelCard, PanelHeading, Pill } from './PanelCard'

type Tone = 'ok' | 'warning' | 'error' | 'neutral'

const DOT: Record<Tone, string> = {
  ok: 'bg-success',
  warning: 'bg-[#f2a413]',
  error: 'bg-brand',
  neutral: 'bg-muted/50',
}

/**
 * Paso 2 "Configuración de conexión": solo lectura, con lo que responde GET /salud (si la API
 * responde, si está en modo prueba y la hora del servidor). Las credenciales viven en el servidor.
 */
export function ConnectionStep() {
  const headingId = useId()
  const salud = useSalud()
  const clock = salud.data ? describeServerClock(salud.data) : null

  return (
    <PanelCard aria-labelledby={headingId} className="gap-6">
      <PanelHeading
        id={headingId}
        title="Configuración de conexión"
        icon={connectionIcon}
        iconWidth={17}
        iconHeight={16.2917}
        description={
          <p className="text-[13px] leading-[18px] text-[#5b5858]">
            Estado de la API de YAWAR según <code className="font-mono text-[12px]">GET /salud</code>. Solo lectura.
          </p>
        }
        aside={<Pill className="text-muted">Solo lectura</Pill>}
      />

      {salud.isPending ? (
        <Skeleton className="h-[104px] w-full rounded-[12px]" />
      ) : (
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatusItem
            label="API de YAWAR"
            tone={salud.isError ? 'error' : salud.data.ok ? 'ok' : 'warning'}
            value={salud.isError ? 'Sin respuesta' : salud.data.ok ? 'Responde' : 'Responde con problemas'}
            detail={salud.isError ? salud.error.message : 'El panel se comunica con la API.'}
          />
          <StatusItem
            label="Envío de WhatsApp"
            tone={salud.isError ? 'neutral' : salud.data.modo_prueba ? 'warning' : 'ok'}
            value={salud.isError ? 'Sin datos' : salud.data.modo_prueba ? 'Modo prueba' : 'Envío real'}
            detail={
              salud.isError
                ? 'Se sabrá cuando la API responda.'
                : salud.data.modo_prueba
                  ? 'No se envían mensajes de WhatsApp reales.'
                  : 'Los recordatorios salen por WhatsApp Cloud API.'
            }
          />
          <StatusItem
            label="Hora del servidor (Lima)"
            tone="neutral"
            value={clock ? `${clock.time} hrs` : 'Sin datos'}
            detail={clock ? `${clock.date} · ${clock.week}` : 'Se sabrá cuando la API responda.'}
          />
        </dl>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-[13px] leading-[18px] text-[#5b5858]">
          <img src={privacyShieldIcon} alt="" width={13.3333} height={16.6667} className="mt-px shrink-0" />
          La clave de acceso y los datos de WhatsApp se configuran en el servidor (archivo .env) y no se muestran aquí.
        </p>
        <button
          type="button"
          onClick={() => void salud.refetch()}
          disabled={salud.isFetching}
          className="w-full shrink-0 rounded-full border border-line bg-chip px-5 py-2.5 text-center text-[12px] leading-4 font-medium tracking-[0.24px] text-ink transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {salud.isFetching ? 'Comprobando…' : 'Comprobar de nuevo'}
        </button>
      </div>
    </PanelCard>
  )
}

function StatusItem({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: Tone }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border border-line bg-chip p-4">
      <dt className="text-[11px] leading-[14px] font-semibold tracking-[0.55px] text-[#5b5858] uppercase">{label}</dt>
      <dd className="flex items-center gap-2 text-[16px] leading-6 font-bold text-ink">
        <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', DOT[tone])} />
        {value}
      </dd>
      <dd className="text-[12px] leading-4 text-[#5b5858]">{detail}</dd>
    </div>
  )
}
