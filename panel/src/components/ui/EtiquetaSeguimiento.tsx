import { useHoy } from '@/api/queries'
import { cn } from '@/lib/cn'

/**
 * Etiqueta común sobre el título de cada pantalla. Dice "MODO PRUEBA" solo si la API está en
 * MODO_PRUEBA=1 (no envía WhatsApp reales); con envío real queda "SEGUIMIENTO SEMANAL".
 */
export function EtiquetaSeguimiento({ className }: { className?: string }) {
  const { modoPrueba } = useHoy()
  return (
    <p
      className={cn(
        'flex w-fit items-center gap-1.5 rounded-full bg-track px-2.5 py-0.5 text-[11px] font-medium leading-[14px] tracking-[0.33px] text-nav-ink',
        className,
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-brand-dark" />
      {modoPrueba ? 'MODO PRUEBA · SEGUIMIENTO SEMANAL' : 'SEGUIMIENTO SEMANAL'}
    </p>
  )
}
