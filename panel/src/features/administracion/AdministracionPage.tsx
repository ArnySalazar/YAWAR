import { useState, type ReactNode } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { AdminPageHeader } from './components/AdminPageHeader'
import { ConnectionStep } from './components/ConnectionStep'
import { ExportStep } from './components/ExportStep'
import { RegistryQuickStatus } from './components/RegistryQuickStatus'
import { RegistryUploadStep } from './components/RegistryUploadStep'
import { StepTabs, stepPanelId, stepTabId, type AdminStepId } from './components/StepTabs'

export default function AdministracionPage() {
  const [activeStep, setActiveStep] = useState<AdminStepId>('padron')

  return (
    // Al imprimir (paso 3) solo sale la hoja A4: lo demás lleva print:hidden.
    <PageContainer className="print:max-w-none print:p-0">
      <AdminPageHeader />

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 print:hidden">
        <StepTabs active={activeStep} onChange={setActiveStep} />
        <RegistryQuickStatus />
      </div>

      {/* Los paneles quedan montados (ocultos) para no perder el archivo seleccionado al cambiar de paso. */}
      <StepPanel id="padron" active={activeStep}>
        <RegistryUploadStep />
      </StepPanel>
      <StepPanel id="conexion" active={activeStep}>
        <ConnectionStep />
      </StepPanel>
      <StepPanel id="exportacion" active={activeStep}>
        <ExportStep />
      </StepPanel>
    </PageContainer>
  )
}

function StepPanel({ id, active, children }: { id: AdminStepId; active: AdminStepId; children: ReactNode }) {
  return (
    <div role="tabpanel" id={stepPanelId(id)} aria-labelledby={stepTabId(id)} hidden={id !== active} className="min-w-0">
      {children}
    </div>
  )
}
