import { useId, useState } from 'react'
import type { AlarmaPendiente, MedioAtencion } from '@/api/yawar'
import { useRegistrarAtencion } from '@/api/queries'
import { AtencionAlarmaResumen } from '@/components/ui/AtencionAlarmaResumen'

export function AtencionAlarmaForm({ idNino, alarma }: { idNino: string; alarma: AlarmaPendiente }) {
  const [abierto, setAbierto] = useState(false)
  const [medio, setMedio] = useState<MedioAtencion | ''>('')
  const mutation = useRegistrarAtencion()
  const id = useId()

  if (mutation.isSuccess) return <div role="status"><AtencionAlarmaResumen atencion={mutation.data} /></div>

  if (!abierto) return (
    <button type="button" onClick={() => setAbierto(true)}
      className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark">
      Registrar atención de {idNino} · {alarma.semana}
    </button>
  )

  return (
    <form aria-label={`Registrar atención de ${idNino}`} className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-brand-soft p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (medio && !mutation.isPending) mutation.mutate({ idNino, registroId: alarma.registro_id, version: alarma.version_alarma, medio })
      }}>
      <p className="text-sm font-semibold text-brand-dark">Posible peligro · {alarma.semana}</p>
      <label htmlFor={id} className="text-xs font-semibold text-ink">Medio de atención</label>
      <select id={id} required value={medio} disabled={mutation.isPending}
        onChange={(event) => setMedio(event.target.value as MedioAtencion | '')}
        className="rounded-lg border border-line bg-white p-2 text-sm">
        <option value="">Selecciona un medio</option>
        <option value="llamada">Llamada</option>
        <option value="visita_presencial">Visita presencial</option>
      </select>
      <p className="text-xs text-muted">Registra la atención realizada. No confirma la recuperación del niño.</p>
      {mutation.isError && <p role="alert" className="text-xs text-brand-dark">No se pudo registrar la atención: {mutation.error.message}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={!medio || mutation.isPending}
          className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {mutation.isPending ? 'Guardando…' : 'Guardar atención'}
        </button>
        <button type="button" disabled={mutation.isPending} onClick={() => { setAbierto(false); mutation.reset() }}
          className="rounded-full px-4 py-2 text-xs font-semibold text-nav-ink hover:bg-white">Cancelar</button>
      </div>
    </form>
  )
}
