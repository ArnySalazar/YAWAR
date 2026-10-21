import { Link } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { paths } from './paths'

export default function NotFoundPage() {
  return (
    <PageContainer className="items-start py-16">
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="text-sm text-muted">La ruta que buscas no existe.</p>
      <Link to={paths.inicio} className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white">
        Volver al inicio
      </Link>
    </PageContainer>
  )
}
