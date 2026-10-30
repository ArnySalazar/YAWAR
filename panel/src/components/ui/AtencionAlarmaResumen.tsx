import type { AtencionAlarma } from '@/api/yawar'

export function AtencionAlarmaResumen({ atencion }: { atencion: AtencionAlarma }) {
  return (
    <p className="rounded-lg bg-track p-3 text-xs leading-5 text-ink">
      <strong>Atendido por {atencion.medio === 'llamada' ? 'llamada' : 'visita presencial'}</strong>
      {' · '}<time dateTime={atencion.atendido_en}>{atencion.atendido_en.slice(0, 10)}
        {' a las '}{atencion.atendido_en.slice(11, 16)} (Lima)</time>
    </p>
  )
}
