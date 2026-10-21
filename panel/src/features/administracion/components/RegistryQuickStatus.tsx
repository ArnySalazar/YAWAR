import { useListaSemana } from '@/api/queries'
import { Skeleton } from '@/components/ui/AsyncContent'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import activeRegistryIcon from '../assets/active-registry.svg'
import { pluralize } from '../lib/format'

/**
 * Métrica rápida: "Padrón activo" del establecimiento elegido = cantidad de niños de la lista de la
 * semana (la API no tiene otra forma de contarlos).
 */
export function RegistryQuickStatus() {
  const { establecimiento } = useEstablecimiento()
  const lista = useListaSemana()

  if (lista.isPending) return <Skeleton className="h-4 w-full max-w-[260px] rounded-full" />

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] leading-[14px] font-medium tracking-[0.33px] text-[#5b5858]"
    >
      <p className="flex items-center gap-2" title={lista.isError ? lista.error.message : undefined}>
        <img src={activeRegistryIcon} alt="" width={14.1667} height={14.1667} className="shrink-0" />
        <span>
          Padrón activo de {establecimiento}:{' '}
          <span className={lista.isError ? 'font-normal text-brand' : 'font-normal text-ink'}>
            {lista.isError ? 'no se pudo consultar' : pluralize(lista.data.length, 'niño', 'niños')}
          </span>
        </span>
      </p>
    </div>
  )
}
