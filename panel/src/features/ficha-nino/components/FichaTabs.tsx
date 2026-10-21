import { cn } from '@/lib/cn'

export type FichaTab = 'resumen' | 'historial' | 'dificultades'

const TABS: Array<{ id: FichaTab; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'historial', label: 'Historial Semanal' },
  { id: 'dificultades', label: 'Dificultades Reportadas' },
]

export function FichaTabs({ value, onChange }: { value: FichaTab; onChange: (tab: FichaTab) => void }) {
  return (
    <div className="flex justify-center pt-2 pb-1 print:hidden">
      <div
        role="tablist"
        aria-label="Contenido de la ficha"
        className="flex max-w-full overflow-x-auto rounded-full border border-[rgba(229,231,235,0.6)] bg-[#eaeceb] p-[5px] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]"
      >
        {TABS.map((tab) => {
          const selected = tab.id === value
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`ficha-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls="ficha-tabpanel"
              onClick={() => onChange(tab.id)}
              className={cn(
                'shrink-0 rounded-full px-6 py-1.5 text-center text-xs leading-4 whitespace-nowrap transition-colors',
                selected
                  ? 'bg-ink font-semibold text-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                  : 'font-medium text-[#4b5563] hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
