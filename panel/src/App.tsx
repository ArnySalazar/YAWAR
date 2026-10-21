import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { EstablecimientoProvider } from '@/features/establecimiento/EstablecimientoProvider'
import { router } from '@/routes/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EstablecimientoProvider>
        <RouterProvider router={router} />
      </EstablecimientoProvider>
    </QueryClientProvider>
  )
}
