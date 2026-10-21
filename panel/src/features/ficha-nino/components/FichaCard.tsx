import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function FichaCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <article
      className={cn('rounded-[22px] border border-line bg-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)]', className)}
    >
      {children}
    </article>
  )
}

interface FichaCardHeaderProps {
  icon: string
  iconClassName: string
  title: string
  aside?: ReactNode
}

/** Cabecera "ícono + título + extra" con línea inferior usada en las tarjetas de detalle. */
export function FichaCardHeader({ icon, iconClassName, title, aside }: FichaCardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f3f4f6] pb-[13px]">
      <div className="flex items-center gap-2.5">
        <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
          <img src={icon} alt="" width={16} height={16} />
        </span>
        <h3 className="text-sm leading-5 font-bold text-[#111827]">{title}</h3>
      </div>
      {aside}
    </div>
  )
}
