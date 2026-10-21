import { EtiquetaSeguimiento } from '@/components/ui/EtiquetaSeguimiento'
import { JurisdictionCard } from './JurisdictionCard'

/** Encabezado de página: etiqueta común, título, descripción y jurisdicción. */
export function AdminPageHeader() {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6 print:hidden">
      <div className="flex min-w-0 flex-col gap-1">
        <EtiquetaSeguimiento />
        <h1 className="pt-1 text-[28px] leading-9 font-bold tracking-[-0.8px] text-ink sm:text-[32px] sm:leading-10">
          Administración y Gestión Operativa
        </h1>
        <p className="max-w-[768px] text-[14px] leading-5 text-[#5b5858]">
          Carga del padrón nominal, estado de la conexión con la API y respaldo impreso de la lista semanal para el
          trabajo en campo del programa CRED.
        </p>
      </div>
      <JurisdictionCard />
    </header>
  )
}
