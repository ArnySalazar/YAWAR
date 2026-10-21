import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Superficie blanca de 20px de radio usada en todas las tarjetas de Indicadores. */
export function IndicatorCard({
  as: Tag = 'section',
  className,
  children,
}: {
  as?: 'section' | 'article'
  className?: string
  children: ReactNode
}) {
  return (
    <Tag className={cn('rounded-[20px] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]', className)}>
      {children}
    </Tag>
  )
}
