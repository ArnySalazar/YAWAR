import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { cn } from '@/lib/cn'

interface AsyncContentProps<T> {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  /** Esqueleto a mostrar mientras carga; por defecto un bloque gris. */
  loading?: ReactNode
  className?: string
}

/** Pinta loading / error / datos de una query de TanStack Query de forma uniforme. */
export function AsyncContent<T>({ query, children, loading, className }: AsyncContentProps<T>) {
  if (query.isPending) {
    return loading ?? <Skeleton className={cn('h-40 w-full', className)} />
  }

  if (query.isError) {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col items-start gap-2 rounded-[20px] border border-brand/20 bg-brand-soft p-5 text-sm text-brand',
          className,
        )}
      >
        <p className="font-semibold">No se pudo cargar la información.</p>
        <p className="text-xs text-ink/70">{query.error.message}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return <>{children(query.data)}</>
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-[20px] bg-black/5', className)} />
}
