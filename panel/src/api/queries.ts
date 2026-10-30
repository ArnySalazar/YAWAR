/**
 * Consultas compartidas por todas las pantallas (TanStack Query). Cada dato se pide una vez a la
 * API y queda en memoria; las pantallas lo transforman con las funciones de su `api.ts`.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { diaDe, semanaIso } from '@/lib/semana'
import { yawarApi, type FilaLista, type MedioAtencion, type SemanaHistorial, type SemanaIso } from './yawar'

export const claves = {
  salud: ['salud'] as const,
  lista: (establecimiento: string) => ['lista', establecimiento] as const,
  historiales: (establecimiento: string) => ['historiales', establecimiento] as const,
  historial: (idNino: string) => ['historial', idNino] as const,
  indicadores: (establecimiento: string, semana?: SemanaIso) =>
    ['indicadores', establecimiento, semana ?? 'actual'] as const,
}

export function useSalud() {
  return useQuery({ queryKey: claves.salud, queryFn: yawarApi.salud, staleTime: 60_000 })
}

/** Día de hoy ("AAAA-MM-DD") y semana ISO según el servidor (hora de Lima). */
export function useHoy() {
  const salud = useSalud()
  const dia = salud.data ? diaDe(salud.data.hora_local) : new Date().toLocaleDateString('en-CA')
  return { dia, semana: semanaIso(dia), modoPrueba: salud.data?.modo_prueba ?? null }
}

/**
 * Lista de la semana del establecimiento elegido. La API solo la entrega generándola (POST), así que
 * se genera una vez con la capacidad guardada y se reutiliza; cambiar la capacidad no la regenera
 * sola: para eso está "Generar planificación" (useGenerarLista).
 */
export function useListaSemana() {
  const { establecimiento, capacidad } = useEstablecimiento()
  return useQuery({
    queryKey: claves.lista(establecimiento),
    queryFn: () => yawarApi.generarLista(establecimiento, capacidad),
    staleTime: Infinity,
  })
}

export function useGenerarLista() {
  const queryClient = useQueryClient()
  const { establecimiento, setCapacidad } = useEstablecimiento()
  return useMutation({
    mutationFn: (capacidad: number) => yawarApi.generarLista(establecimiento, capacidad),
    onSuccess: (lista, capacidad) => {
      setCapacidad(capacidad)
      queryClient.setQueryData(claves.lista(establecimiento), lista)
    },
  })
}

/** Ejecuta las tareas de a `limite` a la vez (para no lanzar 40 pedidos juntos). */
async function enGrupos<T, R>(items: T[], limite: number, tarea: (item: T) => Promise<R>) {
  const resultados: R[] = new Array(items.length)
  let siguiente = 0
  async function trabajador() {
    while (siguiente < items.length) {
      const i = siguiente++
      resultados[i] = await tarea(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador))
  return resultados
}

/**
 * Historial de todos los niños de la lista (una llamada por niño: la API no tiene una ruta por
 * establecimiento). Sirve para saber qué respondió cada cuidador y por qué.
 */
export function useHistoriales() {
  const { establecimiento } = useEstablecimiento()
  const lista = useListaSemana()
  const ids = lista.data?.map((fila) => fila.id_nino) ?? []
  return useQuery({
    queryKey: [...claves.historiales(establecimiento), ids.join(',')],
    queryFn: async () => {
      const historiales = await enGrupos(ids, 6, (id) => yawarApi.historial(id))
      return Object.fromEntries(ids.map((id, i) => [id, historiales[i]])) as Record<string, SemanaHistorial[]>
    },
    enabled: lista.isSuccess,
    staleTime: 30_000,
  })
}

export function useHistorial(idNino: string) {
  return useQuery({ queryKey: claves.historial(idNino), queryFn: () => yawarApi.historial(idNino) })
}

export function useIndicadores(semana?: SemanaIso) {
  const { establecimiento } = useEstablecimiento()
  return useQuery({
    queryKey: claves.indicadores(establecimiento, semana),
    queryFn: () => yawarApi.indicadores(establecimiento, semana),
    staleTime: 30_000,
  })
}

export function useEnviarRecordatorios() {
  const queryClient = useQueryClient()
  const { establecimiento } = useEstablecimiento()
  return useMutation({
    mutationFn: () => yawarApi.enviarRecordatorios(establecimiento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicadores', establecimiento] })
      queryClient.invalidateQueries({ queryKey: claves.historiales(establecimiento) })
    },
  })
}

export function useCargarPadron() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ archivo, nombre }: { archivo: Blob; nombre: string }) => yawarApi.cargarPadron(archivo, nombre),
    // El padrón cambió: todas las listas, historiales e indicadores se vuelven a pedir
    onSuccess: () =>
      Promise.all(
        ['lista', 'historiales', 'historial', 'indicadores'].map((clave) =>
          queryClient.resetQueries({ queryKey: [clave] }),
        ),
      ),
  })
}

/** Refresca también tras un conflicto para que el personal vea la versión nueva del aviso. */
export function useRegistrarAtencion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idNino, registroId, version, medio }: {
      idNino: string; registroId: number; version: number; medio: MedioAtencion
    }) => yawarApi.registrarAtencion(idNino, registroId, version, medio),
    onSettled: async () => {
      // El POST de generar lista reasigna visitas: aquí se usa la lectura sin efectos.
      const listas = queryClient.getQueriesData<FilaLista[]>({ queryKey: ['lista'] })
      await Promise.allSettled([
        ...listas.map(async ([clave]) => {
          const lista = await yawarApi.consultarLista(String(clave[1]))
          queryClient.setQueryData(clave, lista)
        }),
        ...['historial', 'historiales', 'indicadores'].map((clave) =>
          queryClient.invalidateQueries({ queryKey: [clave] })),
      ])
    },
  })
}
