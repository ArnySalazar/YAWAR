import { EtiquetaSeguimiento } from '@/components/ui/EtiquetaSeguimiento'
import { cn } from '@/lib/cn'
import printIcon from '../assets/print.svg'
import downloadIcon from '../assets/download.svg'
import messageWhiteIcon from '../assets/message-white.svg'

interface PlanHeaderProps {
  establishmentId: string
  ageRange: { minMonths: number; maxMonths: number } | null
  isSendingReminders: boolean
  reminderFeedback: { text: string; tone: 'ok' | 'error' } | null
  onPrint: () => void
  onExportCsv: () => void
  onSendReminders: () => void
}

const pillButton =
  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-center text-[12px] leading-4 font-semibold tracking-[0.24px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors disabled:cursor-not-allowed disabled:opacity-60'

export function PlanHeader({
  establishmentId,
  ageRange,
  isSendingReminders,
  reminderFeedback,
  onPrint,
  onExportCsv,
  onSendReminders,
}: PlanHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      <EtiquetaSeguimiento />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-[600px] flex-col gap-1">
          <h1 className="text-[28px] leading-9 font-bold tracking-[-0.8px] text-ink-strong sm:text-[32px] sm:leading-10">
            Planificación semanal
          </h1>
          <p className="text-[14px] leading-5 text-muted">
            Priorización asistida para visitas domiciliarias y recordatorios por WhatsApp
            {ageRange && ` en niños de ${ageRange.minMonths} a ${ageRange.maxMonths} meses`}. Establecimiento:{' '}
            <span className="font-semibold text-ink-strong">{establishmentId}</span>.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end print:hidden">
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={onPrint} className={cn(pillButton, 'bg-white text-ink-strong hover:bg-chip')}>
              <img src={printIcon} alt="" width={15} height={13.5} />
              Imprimir formato A4
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className={cn(pillButton, 'bg-white text-ink-strong hover:bg-chip')}
            >
              <img src={downloadIcon} alt="" width={12} height={12} />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={onSendReminders}
              disabled={isSendingReminders}
              className={cn(pillButton, 'bg-brand text-white hover:bg-brand-dark')}
            >
              <img src={messageWhiteIcon} alt="" width={15} height={15} />
              {isSendingReminders ? 'Enviando recordatorios…' : 'Enviar recordatorios WhatsApp'}
            </button>
          </div>
          {reminderFeedback && (
            <p
              role="status"
              className={cn(
                'text-[11px] leading-[14px] font-medium tracking-[0.33px]',
                reminderFeedback.tone === 'ok' ? 'text-success' : 'text-brand-dark',
              )}
            >
              {reminderFeedback.text}
            </p>
          )}
        </div>
      </div>
    </header>
  )
}
