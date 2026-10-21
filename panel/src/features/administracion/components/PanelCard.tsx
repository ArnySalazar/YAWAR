import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Tarjeta blanca de panel (radio 16, borde #e2e5e3, sombra suave del diseño). */
export function PanelCard({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-[16px] border border-line bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.02),0px_8px_24px_0px_rgba(35,31,31,0.03)] sm:p-6 lg:p-8',
        className,
      )}
      {...props}
    />
  )
}

interface PanelHeadingProps {
  id?: string
  title: string
  icon: string
  iconWidth: number
  iconHeight: number
  /** Texto secundario bajo el título. */
  description?: ReactNode
  /** Contenido alineado a la derecha (badges, etiquetas). */
  aside?: ReactNode
  className?: string
}

/** Cabecera de panel: icono en recuadro gris de 32px + título h2 de 18px. */
export function PanelHeading({ id, title, icon, iconWidth, iconHeight, description, aside, className }: PanelHeadingProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-chip">
            <img src={icon} alt="" width={iconWidth} height={iconHeight} />
          </span>
          <h2 id={id} className="text-[18px] leading-6 font-bold text-ink">
            {title}
          </h2>
        </div>
        {description}
      </div>
      {aside}
    </div>
  )
}

interface PillProps extends ComponentPropsWithoutRef<'span'> {
  /** md = 24px de alto · sm = 20px de alto (relleno + borde de 1px). */
  size?: 'md' | 'sm'
  /** Peso del texto: medium (por defecto) o semibold. */
  weight?: 'medium' | 'semibold'
  /** Fondo: chip gris (por defecto) o blanco. */
  tone?: 'chip' | 'white'
}

/**
 * Etiqueta tipo píldora (borde #e2e5e3, texto 11px). Pasa el color de texto y el `gap`
 * por `className` (sin repetir utilidades de relleno/peso/fondo, que ya resuelven las props).
 */
export function Pill({ size = 'md', weight = 'medium', tone = 'chip', className, ...props }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-line text-[11px] leading-[14px] tracking-[0.33px]',
        size === 'md' ? 'px-3 py-1' : 'px-2.5 py-0.5',
        weight === 'medium' ? 'font-medium' : 'font-semibold',
        tone === 'chip' ? 'bg-chip' : 'bg-white',
        className,
      )}
      {...props}
    />
  )
}
