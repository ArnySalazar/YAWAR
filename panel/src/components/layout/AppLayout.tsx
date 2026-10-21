import { Suspense } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { Skeleton } from '@/components/ui/AsyncContent'
import { PedirClave } from '@/components/ui/PedirClave'
import { AppHeader } from './AppHeader'
import { AppFooter } from './AppFooter'
import { PageContainer } from './PageContainer'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <AppHeader />
      <main className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <AppFooter />
      <PedirClave />
      <ScrollRestoration />
    </div>
  )
}

function PageFallback() {
  return (
    <PageContainer>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 w-full" />
    </PageContainer>
  )
}
