import { lazy } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import NotFoundPage from './NotFoundPage'

// Cada pantalla se descarga solo cuando se visita (code splitting por ruta).
const InicioPage = lazy(() => import('@/features/inicio/InicioPage'))
const PlanificacionPage = lazy(() => import('@/features/planificacion/PlanificacionPage'))
const NinosPage = lazy(() => import('@/features/ninos/NinosPage'))
const FichaNinoPage = lazy(() => import('@/features/ficha-nino/FichaNinoPage'))
const ComunicacionPage = lazy(() => import('@/features/comunicacion/ComunicacionPage'))
const IndicadoresPage = lazy(() => import('@/features/indicadores/IndicadoresPage'))
const AdministracionPage = lazy(() => import('@/features/administracion/AdministracionPage'))

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <InicioPage /> },
      { path: 'planificacion', element: <PlanificacionPage /> },
      { path: 'ninos', element: <NinosPage /> },
      { path: 'ninos/:childId', element: <FichaNinoPage /> },
      { path: 'comunicacion', element: <ComunicacionPage /> },
      { path: 'indicadores', element: <IndicadoresPage /> },
      { path: 'administracion', element: <AdministracionPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
