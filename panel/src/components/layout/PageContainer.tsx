import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Contenedor estándar del contenido de cada pantalla (márgenes del Figma: 32px desktop). */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}
