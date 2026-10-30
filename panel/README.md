# Panel (Gian)

Panel web del personal de CRED. Tiene 7 pantallas: inicio, planificación semanal, niños en seguimiento, ficha del niño, comunicación, indicadores y administración del padrón. Usa React 19, TypeScript, Tailwind 4, TanStack Query 5 y React Router 7, y su diseño viene de Figma.

**Toda la información sale de la API.** No hay datos de ejemplo en el código. Lo que la API todavía no da **no se muestra**: no se rellena con valores inventados.

- Bitácora con fechas y evidencias: [`docs/panel/BITACORA.md`](../docs/panel/BITACORA.md).
- Decisiones: [`docs/panel/DECISIONES.md`](../docs/panel/DECISIONES.md).
- Qué se muestra, adapta u oculta en cada pantalla y por qué: [brecha diseño–API](../docs/panel/evidencias/2026-10-21_brecha_diseno_vs_api.md).

## Requisitos

- Node.js 20.19 o superior (o 22.12+). Ver la versión con `node -v`.
- El entorno de Python del proyecto creado e instalado (README de la raíz: `.venv` + `pip install -r requirements.txt`), y el `.env` de la raíz con `MODO_PRUEBA=1`.

## Levantarlo

La primera vez, dentro de `panel/`:

```bash
npm install
```

Después, siempre:

```bash
npm run dev
```

Ese único comando levanta la API, con el Python del `.venv` (si la API ya estaba encendida, usa esa), y el panel. Luego se abre **http://localhost:5173**; `Ctrl+C` apaga las dos cosas.

**Para verlo en el celular:** con el celular conectado a la misma red wifi que la laptop, abrir la dirección "Network" que muestra Vite al arrancar.

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Levanta API + panel |
| `npm run solo-panel` | Solo el panel (si la API ya corre en otra terminal) |
| `npm test` | Pruebas automáticas de las 7 pantallas y de la capa común, con la API simulada |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run build` | Versión final en `panel/dist/` |
| `npm run probar-api` | Prueba cada ruta de la API que usa el panel, contra la API real encendida |
| `npm run evidencia` | Corre las dos pruebas y guarda un informe con fecha en `docs/panel/evidencias/pruebas/` |

`probar-api` y `evidencia` necesitan la API encendida y solo corren con `MODO_PRUEBA=1`. Cargan el padrón de ejemplo y registran recordatorios de prueba; para dejar la base limpia, ejecutar `python -m scripts.reiniciar_demo` desde la raíz. Si se define `API_DESTINO=http://localhost:8001`, apuntan a otra instancia de la API.

## Pantallas y de dónde sale cada dato

### Simular alarmas de cuidadores en local

Desde `panel/`, con el entorno Python del proyecto instalado (PowerShell):

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/simular-alarmas.py --cantidad 2
```

Recarga Inicio con **EESS01** seleccionado: aparecerá la tarjeta roja «Posible señal de peligro»
con **2 niños** y «Revisar hoy en Planificación», junto a los demás indicadores de la semana.
El enlace abre Planificación, donde los niños `SIM-ALARMA-EESS01-1` y `SIM-ALARMA-EESS01-2`
se identifican con «Posible peligro». La simulación usa la semana actual de Lima y guarda mensajes
entrantes ficticios y sus registros semanales. Predefine el resultado del clasificador; no ejecuta
Ollama ni llama a WhatsApp. Los niños sintéticos tienen `acepta_mensajes=False` y teléfonos no enrutables.

Usa `--cantidad 1` para el singular o `--cantidad 0` para desactivar las alarmas sintéticas.
Si hay otras alarmas en el establecimiento, seguirán contándose. Puedes elegir otro con
`--establecimiento EESS02`. Cada ejecución guarda un respaldo SQLite junto a la base y conserva
los niños e historiales que no pertenecen a la simulación. Para retirar los dos niños sintéticos:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/simular-alarmas.py --limpiar
```

El aviso lee `serie[última semana].alarmas`, tal como lo entrega la API actual; también admite
el contador `alarmas` en la raíz. No incluye el texto del mensaje del cuidador.

Con la funcionalidad de atención, Inicio prioriza `alarmas_pendientes` de los indicadores.
En Inicio, abre **⋮** en la fila del niño y selecciona **Atender**. El mismo menú muestra
**Llamada** y **Visita presencial** como opciones exclusivas; selecciona el medio y pulsa
**Confirmar atención por llamada/visita presencial**. Elegir una opción no guarda nada hasta
confirmar. **Volver al menú**, Escape o un clic fuera permiten salir. Si hay varias semanas
pendientes, primero se elige la alarma a atender. La opción **Atender** solo aparece si hay
alarmas pendientes con su identificador y versión, y usa la misma operación del backend.
En Planificación pulsa **Atender**, luego **Registrar atención**, selecciona **Llamada** o
**Visita presencial** y guarda. Se actualizan la tarjeta y el historial sin regenerar el plan.
La ficha conserva el medio y la hora de cada atención. Si llega otro mensaje con una nueva
señal de peligro, vuelve a aparecer pendiente. Una atención no confirma recuperación.
Reinicia la API después de actualizar el código para que aplique la migración automática.
El simulador abre una versión nueva al usar `--cantidad 1` o `--cantidad 2` y su limpieza
también retira las atenciones de los dos niños sintéticos.

| Ruta | Pantalla | Datos de la API |
| --- | --- | --- |
| `/` | Inicio | Lista de la semana, indicadores (incluida la meta-alerta) |
| `/planificacion` | Planificación semanal | Lista de la semana (generar con capacidad N), historial de cada niño, envío de recordatorios |
| `/ninos` | Niños en seguimiento | Lista de la semana e historial de cada niño (búsqueda y filtros en el navegador) |
| `/ninos/N0001` | Ficha del niño | Historial del niño y su fila en la lista |
| `/comunicacion` | Comunicación | Respuestas de la semana (historial de cada niño) e indicadores |
| `/indicadores` | Indicadores | Indicadores por semana, meta-alerta y motivos contados desde el historial |
| `/administracion` | Administración | Carga del padrón, estado de la conexión (`/salud`) y exportación de la lista (CSV e impresión) |

Todas comparten el encabezado, que tiene el selector de establecimiento, la semana según el servidor, el aviso de modo prueba y la campana de alertas.

## Estructura

```
panel/
├── scripts/              dev.mjs (un comando), probar-api.mjs, evidencia.mjs
└── src/
    ├── api/
    │   ├── http.ts       cliente: prefijo /api, clave X-API-Key, errores de la API ("detail")
    │   ├── yawar.ts      ÚNICA puerta a la API: las 7 rutas reales y sus tipos
    │   └── queries.ts    consultas compartidas (TanStack Query): lista, historiales, indicadores…
    ├── lib/              semana.ts (semanas ISO), dominio.ts (códigos → textos), cn.ts
    ├── features/
    │   ├── establecimiento/   establecimiento elegido y capacidad N
    │   └── <pantalla>/        types.ts · api.ts (adaptador puro) · hooks.ts · components/ · <pantalla>.test.tsx
    ├── components/       estructura común (encabezado, pie, estados de carga, clave de acceso)
    └── test/             API simulada con el formato real y datos de prueba
```

**Cómo se agrega un dato:**
1. Si la API ya lo tiene, se lee con una consulta de `src/api/queries.ts` y se transforma en el `api.ts` de la pantalla.
2. Si la API no lo tiene, se le pide a Arny la ruta; mientras tanto, el dato no se muestra.

Ningún componente llama a `fetch` directamente.

## Configuración (opcional)

Copiar `.env.ejemplo` a `panel/.env` solo para cambiar algo:
- a dónde apunta la API (`API_DESTINO`);
- el prefijo de las llamadas (`VITE_API_URL`);
- los establecimientos del selector (`VITE_ESTABLECIMIENTOS`).

Si la API tiene `API_CLAVE`, el panel pide la clave en pantalla y la guarda solo durante la sesión del navegador.

## Problemas comunes

- **"No se pudo conectar con el servidor de YAWAR"**: la API no está encendida o se cayó. Revisar la terminal de `npm run dev`.
- **El puerto 8000 o 5173 está ocupado**: quedó otra API o panel abierto. Cerrar esa terminal, o usar `npm run solo-panel` si la API que está corriendo sirve.
- **La semana dice 43 y el MINSA dice 42**: el panel usa la semana ISO de la API (de lunes a domingo), no la semana epidemiológica (de domingo a sábado). Está registrado en DECISIONES.md.
