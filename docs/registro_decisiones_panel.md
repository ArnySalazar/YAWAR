# Registro de decisiones del panel web

Responsable: Gian. Aquí se anota cada decisión del panel (`panel/`) con su fecha, el motivo y la evidencia, para que el equipo y el jurado puedan seguir el razonamiento. Lo que **no** está decidido o tiene límites conocidos va en la sección "Límites y supuestos abiertos". El detalle técnico de la conexión con la API está en [`docs/panel/INTEGRACION.md`](panel/INTEGRACION.md).

## Decisiones tomadas

| Fecha | Decisión | Motivo | Evidencia |
|---|---|---|---|
| 18 oct 2026 | Panel en **React** (TypeScript, Tailwind, TanStack Query) y no en Streamlit | Se busca un panel visualmente cuidado; los generadores de diseño (Stitch, Manus) entregan código compatible con Tailwind | `panel/package.json` |
| 18 oct 2026 | **Diseño antes que código**: prototipo en Manus → corrección en Stitch → Figma → React | Acordar las pantallas antes de programarlas; cada versión deja evidencia del proceso | Diseño final en `panel/src/` |
| 18 oct 2026 | Corregir el prototipo de Manus antes de pasarlo a Stitch (17 correcciones) | Tenía errores verificables: gris de texto con contraste 3,7:1 (el mínimo es 4,5:1), barras del gráfico casi iguales (1,27:1), una columna del padrón faltante y colores incoherentes entre pantallas | Contrastes calculados con la fórmula WCAG 2.1 |
| 18 oct 2026 | En Stitch, diseñar primero **solo escritorio** (1280 px) y después celular | Pedir los dos tamaños en el mismo prompt confundía a Stitch | Capturas de escritorio y celular en `docs/panel/evidencias/capturas/` |
| 18 oct 2026 | **Una sola puerta a la API**: ningún componente llama a `fetch` | Si una ruta cambia, se corrige en un solo lugar, y se puede comprobar la regla de Arny de que todo salga de la API | `panel/src/api/yawar.ts` |
| 18 oct 2026 | **Proxy de Vite** en `/api` hacia la API | La API no tiene CORS; con el proxy el panel funciona en desarrollo sin tocar la API | `panel/vite.config.ts` |
| 18 oct 2026 | `npm run dev` levanta **API + panel** con un solo comando | Regla de Arny. Usa el Python del `.venv`; si la API ya corre, la reutiliza | `panel/scripts/dev.mjs` |
| 18 oct 2026 | La clave `X-API-Key` **se pide en pantalla** y no va en el código | Escrita en el código de React, cualquiera la vería en el navegador | `panel/src/components/ui/PedirClave.tsx` |
| 18 oct 2026 | **Versiones fijas** compatibles con Node 20.19+ y `legacy-peer-deps` | `jsdom` 30 y `react-router` 8 piden Node 22.22 (la laptop tiene 22.16); npm 10 se caía con las dependencias opcionales de Vitest | `panel/package.json`, `panel/.npmrc` |
| 18 oct 2026 | **Dos niveles de prueba**: Vitest con API simulada (mismo formato que la real) + `probar-api` contra la API real; `npm run evidencia` guarda un informe fechado | Las pruebas simuladas cubren pantallas y casos de error; la prueba real detecta si cambia el formato de la API | `panel/src/test/`, `panel/scripts/` |
| 18 oct 2026 | **Colección de Postman** de las 9 rutas (22 peticiones, 39 pruebas), con protección que omite los envíos de WhatsApp si la API no está en modo prueba | Que cualquiera del equipo pueda probar la API sin el panel y sin mandar mensajes reales por error | `tests/postman/` |
| 20 oct 2026 | Revisar **qué devuelve la API para cada módulo** antes de conectar el diseño | El diseño traía módulos (Inicio, Comunicación) que la API cubre poco; había que saberlo antes de programar | Sección 2 de `docs/panel/INTEGRACION.md` |
| 21 oct 2026 | El **diseño final de Figma** pasa a ser el panel (7 pantallas); la base anterior de 5 pantallas se archivó fuera del repositorio | Diseño más completo; de la base anterior se reutilizaron el proxy, la clave, los scripts y la forma de probar | `panel/README.md` |
| 21 oct 2026 | **Sin datos de ejemplo** en el código: se borraron los `mocks.ts` y la sesión ficticia; lo que la API no da **se oculta** | Regla de Arny y honestidad con el jurado: ninguna cifra inventada en pantalla | [Brecha diseño–API](panel/evidencias/2026-10-21_brecha_diseno_vs_api.md), secciones 4 y 5 |
| 21 oct 2026 | Mostrar la **semana ISO** de la API, sin la palabra "epidemiológica" | La API usa semanas de lunes a domingo; la SE del MINSA va de domingo a sábado. El 21 de octubre es "2026-W43" en la API y "SE 42" en el MINSA | `panel/src/lib/semana.ts` |
| 21 oct 2026 | **"Priorizado" = niño con señal R1 o R2** (`nivel` 0 o 1) | En YAWAR todos los niños reciben una acción (visita o WhatsApp); "priorizado" tiene sentido para quien tiene una señal de seguimiento | Inicio y Planificación (`panel/src/features/`) |
| 21 oct 2026 | Ocultar la **agenda por día y hora**, las **visitas realizadas** y la **reasignación manual de canal** | La API no programa ni registra visitas ni permite reasignar; la asignación automática es la que mediría un piloto | Sección 5 de `docs/panel/INTEGRACION.md` |
| 21 oct 2026 | **Comunicación en versión reducida** ("Respuestas de la semana") | La API no devuelve fechas, estado de entrega ni conversación; no se simula ningún hilo | `panel/src/features/comunicacion/` |
| 21 oct 2026 | Riesgo **solo en porcentaje**, sin "ALTO/MEDIO/BAJO" | El modelo es provisional y no hay umbrales definidos ni calibrados (pendiente de Jose) | Planificación, Niños, Ficha |
| 21 oct 2026 | **Privacidad**: solo código del niño y alias del cuidador. Sin nombres, iniciales, teléfonos, fotos, fecha de nacimiento ni dosaje de Hb | Reglas del README del repositorio | Pruebas de cada pantalla que verifican la ausencia de esos datos |
| 21 oct 2026 | **Capa común + un adaptador por pantalla**. La lista de la semana se genera una sola vez y se reutiliza; las respuestas se piden niño por niño, de a 6 | La API solo entrega la lista generándola (`POST`, reescribe la semana) y no tiene una ruta de respuestas por establecimiento | `panel/src/api/queries.ts` |
| 21 oct 2026 | **Agregar la meta-alerta**, que el diseño no tenía | Es una función que distingue a YAWAR (detecta que el sistema dejó de enviar o recibir) y la API ya la calcula | Inicio e Indicadores |
| 21 oct 2026 | Implementar el paso **"Exportación y respaldo físico"** (CSV + hoja A4) en vez de dejarlo "próximamente" | Es el plan B de la demo (`docs/riesgos_demo.md`) y la API ya tiene `lista.csv` | `panel/src/features/administracion/` |
| 21 oct 2026 | El **contrato del padrón** usa las columnas exactas de la API, y el panel convierte el CSV de Excel (Windows-1252 y `;`) antes de enviarlo | La plantilla del diseño tenía 3 columnas con otro nombre y el área como "Urbana", así que la API la rechazaba | `panel/src/features/administracion/` |
| 21 oct 2026 | En Niños, el **estado de seguimiento** = la última respuesta real del cuidador, no el `nivel` | El `nivel` 2 de la API significa "sin novedad", no "sí le dio" | `panel/src/features/ninos/api.ts` |
| 21 oct 2026 | Corregir el texto de las **reglas R1, R2 y R3** para que diga exactamente lo que hace la API | El diseño hablaba de "2 semanas sin respuesta" (la API usa 7 días) y de motivos que el bot no ofrece | `panel/src/features/planificacion/components/RulesBanner.tsx` |
| 21 oct 2026 | Al cambiar de semana, **no mantener en pantalla las cifras anteriores** mientras cargan las nuevas | Por un instante se verían cifras de una semana bajo la etiqueta de otra; un esqueleto de carga es más honesto | `panel/src/api/queries.ts` |
| 21 oct 2026 | Cambiar la insignia "Acceso restringido" por "Uso exclusivo del personal de salud" | En desarrollo la API no tiene clave: la frase anterior no era cierta | `panel/src/features/administracion/components/AdminPageHeader.tsx` |
| 21 oct 2026 | **Una sola etiqueta sobre el título de las 7 pantallas**: "● MODO PRUEBA · SEGUIMIENTO SEMANAL" (solo "SEGUIMIENTO SEMANAL" si la API envía WhatsApp reales). Se quitaron las etiquetas distintas de cada pantalla: "Padrón nominal · Seguimiento activo" y "EESS01 · Semana…" en Niños, "Canal automatizado WhatsApp Bot CRED" en Comunicación, "Modo prueba" en ámbar en Indicadores, y "Uso exclusivo… (Ley 29733)" y "Minimización de datos activa" en Administración. La Ficha no tenía ninguna | Que todas las pantallas se vean coherentes y que siempre quede claro si se están enviando WhatsApp reales. El establecimiento y la semana ya están en el encabezado común | `panel/src/components/ui/EtiquetaSeguimiento.tsx` y su prueba |

## Hallazgos que el equipo debe conocer

1. **Un "No le di" recién sube al niño en la lista la semana siguiente.** La regla de la API mira semanas anteriores a la actual. El paso 5 del ensayo de la demo ("confirmar que el niño sube en la lista") no se ve en vivo. El panel lo compensa mostrando la respuesta de **esta** semana. Fuente: simulación con `api/servicios.py` (18 oct).
2. **La API no tiene CORS.** Un front en otro puerto no puede llamarla directamente. En desarrollo se resolvió con el proxy de Vite; para la demo hace falta que la API sirva el panel o agregue CORS.
3. **El recordatorio semanal se envía a todos los cuidadores**, también a los de visita, aunque el README dice "el resto a WhatsApp". Fuente: `api/servicios.py`, función `enviar_recordatorios`.
4. **Volver a cargar el padrón anula los BAJA.** Si el CSV no trae `acepta_mensajes`, la API pone "sí" a todos y el cuidador vuelve a recibir mensajes sin pedirlo. Es un problema de **consentimiento**. Fuente: simulación (18 oct).
5. **La meta-alerta da una falsa alarma al inicio de cada semana.** Compara las respuestas de la semana en curso con semanas ya completas. Además, necesita al menos 2 semanas anteriores con envíos para aparecer. Fuente: simulación con 3 semanas normales (18 oct).
6. **Errores del padrón en lenguaje técnico.** Ejemplos: "invalid literal for int() with base 10", "day is out of range for month". Además, solo informa los 10 primeros, sin el total. Fuente: llamadas reales a `POST /padron` (20 oct).
7. **Un alias de cuidador vacío se guarda como "nan" y una edad 12.7 se guarda como 12**, sin aviso. El WhatsApp diría "Hola, nan". Fuente: llamadas reales (20 oct).
8. **Un CSV guardado desde Excel en español no carga** (Windows-1252, a veces con `;`); UTF-8 sí. El panel ya lo convierte antes de enviarlo. Fuente: carga de prueba con las tres variantes (18 oct).
9. **`tests/test_flujo.py` falla en Windows.** Lee el CSV sin `encoding="utf-8"` y la "á" de "Papá" no coincide. Pasan 8 de 9 pruebas. Arreglo: agregar `encoding="utf-8"` en la línea 109.
10. **`datos/*` está en `.gitignore`.** El padrón de la demo (`datos/padron_demo.csv`) no se subiría al repositorio.
11. **Las semanas no coinciden.** El 21 de octubre, la API dice semana 43 (ISO) y el MINSA dice SE 42. Fuente: cálculo de ambas reglas (21 oct).
12. **El diseño esperaba 30 rutas de API y ninguna existe con esa forma.** Aun así, 4 rutas reales (lista, historial, indicadores y padrón) cubren buena parte de las pantallas. Fuente: comparación campo por campo en la [brecha diseño–API](panel/evidencias/2026-10-21_brecha_diseno_vs_api.md).
13. **La API no devuelve datos que sí guarda:** fecha de respuesta, estado de cada mensaje (entregado, leído, fallido), mensajes de texto libre, BAJA de cada cuidador, y área, región y fecha de entrega del hierro de cada niño. Son los pedidos a Arny en la sección 6 de [`INTEGRACION.md`](panel/INTEGRACION.md).
14. **Un teléfono de 9 dígitos sin el 51 pasa la validación de la API, pero WhatsApp no le llegaría** y su respuesta no se emparejaría (Meta envía "51…"). El panel agrega +51 antes de enviar el padrón.
15. **Las respuestas, motivos y conteos por niño solo cubren a los niños de la lista actual.** En semanas pasadas no aparecen los que ya salieron del padrón, porque la API no tiene una ruta de respuestas por establecimiento.

## Límites y supuestos abiertos del panel

- **Abrir el panel genera la lista de la semana** (`POST`), con la capacidad guardada. Con la misma capacidad el resultado es el mismo, pero escribe en la base. Se resuelve cuando la API tenga una ruta de solo lectura.
- **Semana ISO y no SE del MINSA** (hallazgo 11). Cambiarlo es una decisión del equipo y toca toda la lógica semanal de la API.
- **Riesgo:** sale del modelo **provisional** (`modelo/puntuar.py`). Los porcentajes cambiarán cuando Jose entregue el modelo real.
- **Capacidad mayor que el padrón:** con N = 10 y 4 niños, Inicio muestra "4 / 10" y el selector N = 4. Con un padrón real (~40 niños) no pasa.
- **Textos para revisar con el asesor de salud:** los "resultados" fijos del historial en la Ficha, los colores de los motivos en Comunicación y el recuadro "Criterio clínico primero" de Inicio.
- **Sin usuarios:** la API tiene una sola clave compartida. El encabezado no muestra nombre ni cargo.
- **Exponer el panel por internet** (túnel) requiere permitir el dominio en Vite, definir `API_CLAVE` y no reenviar `/api/webhook`. Aún no está configurado.
- **Pendiente de Gian:** armar el padrón de la demo. Magno dejó las proporciones por departamento en `analisis/resultados/para_gian_proporciones_departamento.csv`.

## Notas de método

- **Pruebas del panel:** 135 pruebas automáticas (Vitest) en 10 archivos: capa común, encabezado, etiqueta común y 7 pantallas. Usan una API simulada con el **mismo formato** que la real (respuestas comprobadas el 20 oct). Además, compilación de producción y revisión de tipos sin errores.
- **Contra la API real:** `npm run probar-api` pasó 8 de 8 pasos (1 omitido: sin clave en desarrollo). La colección de Postman se corrió con Newman dos veces: como en desarrollo, y con clave y firma de Meta como en la demo. Dio 22 de 22 peticiones y 39 de 39 pruebas en cada corrida.
- **Capturas** (21 oct): las 7 pantallas en escritorio (1440 px) y celular (390 px), contra la API real en modo prueba. Usan el padrón **simulado** de ejemplo y 4 semanas de historial generadas en una **base temporal** con las funciones de la API; no se tocó `yawar.db`. Ver `docs/panel/evidencias/capturas/`.
- **Para no tocar la base de trabajo,** las pruebas contra la API se hicieron en instancias aparte (puertos 8001 y 8002), con bases temporales.
- **Fechas:** en hora de Lima, comprobadas con el reloj de Windows.