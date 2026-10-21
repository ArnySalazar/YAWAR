# Integración del panel con la API de YAWAR

**Actualizado:** 2026-10-21 · **Responsable del panel:** Gian · **API:** Arny

Este documento explica cómo se conectó el panel web (`panel/`) con la API (`api/`). Cubre qué datos muestra cada pantalla, de dónde salen y qué se calcula en el panel. Al final está la lista de lo que falta en la API, ordenada por prioridad, para que Arny decida qué hacer.

> **En una frase:** el diseño de Figma (7 pantallas) quedó conectado a las 7 rutas reales de la API, sin datos de ejemplo. Lo que la API todavía no da **no se muestra**; no se rellena con valores inventados.

---

## 1. Resumen

| | |
| --- | --- |
| **Qué se hizo** | Se tomó el front generado desde Figma (React 19 + TypeScript + TanStack Query) y se conectó a la API real |
| **Cómo** | Una capa común que habla con la API y un adaptador por pantalla, que convierte las respuestas al formato de cada pantalla |
| **Qué se quitó** | Todo dato de ejemplo (`mocks.ts`), la sesión ficticia y todo dato que la API no tiene o que choca con las reglas de privacidad |
| **Qué se agregó** | La meta-alerta, que estaba en la API pero no en el diseño, y el paso de exportación e impresión (plan B de la demo) |
| **Cómo se verificó** | 135 pruebas automáticas, prueba contra la API real (8 de 8 pasos) y capturas de las 7 pantallas en escritorio y celular |
| **Qué falta** | 16 pedidos a la API (sección 6). Los 3 más útiles: leer la lista sin regenerarla, no borrar los BAJA al recargar el padrón, y un parámetro de fecha en modo prueba para la demo |

---

## 2. Cómo está conectado

```
 Navegador (panel React, puerto 5173)
        │  fetch("/api/…")  +  encabezado X-API-Key (si la API tiene clave)
        ▼
 Proxy de Vite  ──  quita el prefijo /api
        │
        ▼
 API FastAPI (puerto 8000)  ──  SQLite (yawar.db)
        ▲
        │  webhook (lo llama Meta, no el panel)
 WhatsApp Cloud API ◄──► cuidador
```

`npm run dev`, dentro de `panel/`, levanta las dos cosas con un solo comando: la API con el Python del `.venv` y el panel.

### Capas del panel

| Capa | Archivo | Qué hace |
| --- | --- | --- |
| Cliente HTTP | `src/api/http.ts` | Agrega el prefijo `/api` y la clave `X-API-Key` (la clave se pide en pantalla, nunca va en el código). Lee los errores de la API (`detail`). Con un 401 pide la clave y, si la API no responde, muestra "No se pudo conectar" |
| Rutas | `src/api/yawar.ts` | **Única puerta a la API**: las 7 rutas con sus tipos exactos |
| Consultas compartidas | `src/api/queries.ts` | Cada dato se pide una vez y lo usan todas las pantallas (TanStack Query) |
| Dominio | `src/lib/semana.ts`, `src/lib/dominio.ts` | Semana ISO (la misma que la API) y traducción de códigos a texto (`no_le_di` → "No le di") |
| Estado | `src/features/establecimiento/` | Establecimiento elegido y capacidad N, recordados en el navegador |
| Pantallas | `src/features/<pantalla>/api.ts` | Adaptador: convierte los datos de la API al formato de la pantalla. Funciones puras, con pruebas |

**Regla del código:** ningún componente llama a `fetch`. Cuando Arny agregue una ruta, se suma en `yawar.ts` y `queries.ts`, y se usa en el `api.ts` de la pantalla que la necesite.

### Rutas de la API que usa el panel

| Ruta | Para qué | Pantallas |
| --- | --- | --- |
| `GET /salud` | Hora de Lima del servidor (semana actual), modo prueba | Encabezado, Inicio, Administración |
| `POST /establecimientos/{id}/lista?capacidad=N` | Lista priorizada de la semana | Todas |
| `GET /establecimientos/{id}/lista.csv?capacidad=N` | Lista en CSV para imprimir | Administración (Exportación) |
| `POST /establecimientos/{id}/recordatorios` | Enviar el recordatorio semanal | Planificación |
| `GET /ninos/{id}/historial` | Semanas de un niño: acción, puntaje, respuesta, razón | Ficha, y de todos los niños para Planificación, Niños, Comunicación e Indicadores |
| `GET /establecimientos/{id}/indicadores?semana=` | Enviados, fallidos, respondidos, "Sí le di", meta-alerta | Encabezado, Inicio, Niños, Comunicación, Indicadores |
| `POST /padron` | Cargar el padrón (campo `archivo`) | Administración |

`GET /webhook` y `POST /webhook` los usa solo Meta; el panel no los toca.

### Dos comportamientos de la capa común que conviene conocer

1. **La lista de la semana se genera una sola vez.** La API solo la entrega generándola (`POST`), y cada llamada la reescribe en la base. Por eso el panel la pide **una vez**, con la capacidad N guardada, y todas las pantallas reutilizan esa respuesta. Solo se regenera al pulsar "Generar planificación" o al cambiar N en Inicio.
2. **Las respuestas de los cuidadores se piden niño por niño.** No hay una ruta por establecimiento, así que el panel pide el historial de cada niño de la lista, de a 6 a la vez. Con unos 40 niños funciona bien. Solo cubre a los niños que están en la lista **actual**.

---

## 3. Reglas que se aplicaron

| Regla | Cómo se cumple |
| --- | --- |
| Toda la información sale de la API (Arny) | Se borraron los 7 `mocks.ts`, `withMock` y la sesión ficticia. Lo que no da la API se oculta |
| Se levanta con un solo comando (Arny) | `npm run dev` levanta la API y el panel |
| Se ve bien en celular (Arny) | Las 7 pantallas se adaptan a 390 px. Hay capturas en celular |
| Documentar con evidencia y fecha (Arny) | Este documento, la brecha diseño–API y las capturas fechadas en `docs/panel/` |
| Sin nombres reales, DNI ni fecha de nacimiento (README) | Solo el código del niño y el **alias** del cuidador ("Mamá de N0001"). Sin iniciales, fotos, teléfonos ni enlaces para llamar |
| Semana | Semana **ISO** de la API (de lunes a domingo). El panel nunca dice "epidemiológica" (sección 7) |
| Riesgo | Solo en **porcentaje**. Sin "ALTO/MEDIO/BAJO" hasta que el modelo de Jose esté calibrado |

---

## 4. Datos que calcula el panel

La API no entrega estos datos ya listos; el panel los calcula a partir de lo que sí devuelve.

| Dato en pantalla | Cómo se obtiene | Fuente |
| --- | --- | --- |
| Señal **R1, R2 o R3** | R1 = `nivel` 0 (con "No le di" o "Tuve un problema" según el texto de `seguimiento`); R2 = `nivel` 1; R3 = `nivel` 2 | Lista |
| **Priorizados** | Niños con señal R1 o R2 | Lista |
| Orden de visita (#1, #2…) | Posición entre los niños con `accion = visita` | Lista |
| **Última respuesta** del cuidador | La semana más reciente del historial con respuesta distinta de "sin respuesta" | Historial |
| **Respuesta de esta semana** | El registro de la semana actual en el historial. Se ve aunque el orden de la lista recién cambie la semana siguiente | Historial |
| Tasa de respuesta | respondidos ÷ enviados | Indicadores |
| "No le di" y "Tuve un problema" por separado | Contando los historiales de la semana (la API los da juntos) | Historial |
| Conteo de **motivos** | Contando la `razon` de los historiales de la semana | Historial |
| Grupo de edad | 6–11, 12–23 o 24–35 meses, según `edad_meses` | Lista |
| Parentesco | Del alias: "Mamá de N0001" → "Mamá" | Lista |
| Semana actual y sus fechas | Semana ISO de `hora_local` | `/salud` |

---

## 5. Pantalla por pantalla

Las capturas están en [`evidencias/capturas/`](evidencias/capturas/README.md). Se tomaron contra la API real con el padrón simulado de ejemplo y 4 semanas de historial generadas en una base temporal.

### 5.1 Encabezado y etiqueta común (todas las pantallas)

Sobre el título de cada pantalla va la misma etiqueta, "● MODO PRUEBA · SEGUIMIENTO SEMANAL". Si la API está en envío real, dice solo "SEGUIMIENTO SEMANAL". Reemplaza a las etiquetas distintas que traía cada pantalla del diseño.

En el encabezado común:

- **Muestra:** logo, menú de las 6 secciones, **selector de establecimiento** (EESS01, EESS02, EESS03), la semana actual según el servidor ("Semana 43 · 19 – 25 oct 2026"), el aviso "Modo prueba · no se envían WhatsApp reales" y una campana que se marca si hay niños con señal R1 o R2 o una meta-alerta.
- **Datos:** `/salud`, la lista y los indicadores.
- **Se quitó:** nombre, cargo y foto de la enfermera, y el nombre del establecimiento con su código RENIPRESS. La API no tiene usuarios ni nombres de establecimientos.
- Los establecimientos del selector salen de la configuración (`VITE_ESTABLECIMIENTOS`), porque la API todavía no tiene una ruta que los liste.

### 5.2 Inicio (`/`)

- **Saludo** según la hora de Lima, sin nombre. Debajo: el establecimiento, la semana y el tamaño del padrón.
- **Indicadores:**
  - padrón activo y su rango de edad;
  - **priorizados** (R1 + R2) y su porcentaje;
  - visitas asignadas sobre la capacidad N;
  - seguimiento por WhatsApp: respuestas y tasa, con la aclaración de que el recordatorio va a todos los cuidadores.
- **Avance de la semana:** cuidadores que respondieron sobre recordatorios enviados.
- **Lista de prioridad de la semana:** los 5 primeros, con filtro R1, R2 o R3. Cada fila trae puesto, código, edad, señal, texto de seguimiento o motivos del modelo, alias, acción (visita #k o WhatsApp) y riesgo en %.
- **Alertas:**
  - **meta-alerta** (nueva), con la nota de que al inicio de la semana puede salir aunque nada esté roto;
  - "N reportaron un problema o no le dieron" (R1);
  - "N niños sin respuesta" (R2).
- **Capacidad N:** se elige N con − y + y se confirma con "Volver a generar con N=…" (regenera la lista).
- **Botones:** "Exportar Lista A4" imprime la página; "Nueva Planificación" lleva a Planificación.
- **Se quitó:**
  - dosaje de Hb y "nuevos este mes";
  - visitas **realizadas** y máximo de interacciones;
  - agenda por día y hora y mapa de sectores;
  - fotos, nombres de cuidadores, sector y canal preferido;
  - "registrar llamada o mensaje".

### 5.3 Planificación semanal (`/planificacion`)

- **Configuración:** la semana en curso (la API solo planifica la actual), el establecimiento con el tamaño del padrón y la **capacidad N** con el botón "Generar planificación". Debajo, la regla de corte: los N primeros van a visita y el resto a WhatsApp.
- **Indicadores:** priorizados (R1 + R2), asignados a visita, asignados a WhatsApp y dificultades reportadas (R1).
- **Criterios de ordenación R1, R2 y R3.** Los textos se corrigieron para que digan exactamente lo que hace la API (7 días, variables del modelo y motivos del bot). Se mantiene el aviso deontológico.
- **Tabla** (en celular, tarjetas), con una línea que marca el corte N. Cada niño muestra:
  - prioridad y código;
  - edad y alias;
  - señal;
  - **última respuesta** del cuidador, incluida la de esta semana;
  - riesgo en %;
  - canal asignado.

  La fila se expande con detalle: criterio aplicado, motivos del modelo y última respuesta.
- **Acciones:**
  - **Enviar recordatorios WhatsApp**, con confirmación y resultado "Enviados · Fallidos · Dados de baja". La confirmación aclara que la API envía a **todos** los cuidadores, también a los de visita;
  - Imprimir A4;
  - Exportar CSV (todos o los seleccionados).
- **Se quitó:**
  - selector de semanas pasadas o futuras;
  - estado "programada" con hora;
  - reasignar canal a mano;
  - teléfono y botón de llamar;
  - nivel ALTO/MEDIO/BAJO.

### 5.4 Niños en seguimiento (`/ninos`)

- **Indicadores:**
  - total del padrón y rango de edad;
  - respuesta semanal (respondidos / contactados y tasa);
  - visitas asignadas;
  - alertas, con "X reportó un problema · Y no le dio".
- **Tabla** (en celular, tarjetas): puesto, código y estado, edad y grupo, alias, **respuesta de la semana** con su motivo, acción semanal y "Ver ficha".
- **Estado de seguimiento** = la **última respuesta real** del cuidador ("No le dio · Semana 42"). No se toma del `nivel`, porque el nivel 2 significa "sin novedad", no "sí le dio".
- **Búsqueda, filtros y orden en el navegador:**
  - búsqueda por código o alias;
  - segmentos: priorizados, con dificultades, sin respuesta ≥7 días y "sí le dio";
  - edad, entrega y respuesta;
  - orden por código o edad;
  - paginación.
- **Botones:** "Exportar padrón (CSV)" con los filtros aplicados; "Cargar padrón (CSV)" lleva a Administración, porque no hay alta manual.
- **Se quitó:**
  - teléfono y botón de llamar;
  - sector y su filtro;
  - suplemento;
  - fecha y canal del último reporte;
  - 4 estados que no existen en la API;
  - el formulario de alta manual, que pedía fecha de nacimiento.

### 5.5 Ficha del niño (`/ninos/N0001`)

- **Identidad:** el código como título (sin iniciales ni foto), alias y parentesco del cuidador.
- **Datos del niño:**
  - edad y grupo;
  - establecimiento;
  - prioridad ("#2 de 4");
  - riesgo en %;
  - motivos del modelo;
  - "Priorizado para visita domiciliaria" cuando corresponde.
- **Último reporte del cuidador**, con respuesta, razón y semana.
- **Próxima acción:** visita domiciliaria #k o seguimiento por WhatsApp, con el **fundamento** (la regla que devuelve la API).
- **Historial del bot:** cada semana con su estado (Alerta, Interrupción, Completado o Sin respuesta), lo que respondió el cuidador ("No le di: No le gusta"), la acción y el riesgo de esa semana. El "resultado" sale de una regla fija, por ejemplo "Se envió la lista de motivos…".
- **Respuesta del cuidador:** barras de las últimas semanas, con una aclaración: es lo que dijo el cuidador, no una toma verificada.
- **Botón:** "Exportar Ficha A4" imprime la página.
- **Casos especiales:**
  - si el niño no está en la lista actual, se ven el código y el historial, con una nota;
  - si el código no existe, sale "No encontramos…".
- **Se quitó:**
  - iniciales y año de registro;
  - suplemento y esquema;
  - fecha del último CRED;
  - nombre, teléfono y sector de la cuidadora;
  - botones de llamar y WhatsApp;
  - "Reasignar a WhatsApp".

### 5.6 Comunicación (`/comunicacion`) · versión reducida "Respuestas de la semana"

- **Indicadores de la semana:**
  - contactados y respondidos, con la tasa (de los indicadores);
  - "No le di", "Tuve un problema" y "Sin respuesta", contados con los historiales.
- **Lista:** una tarjeta por niño, con la respuesta de la semana elegida ("Tuve un problema: Estreñimiento"), su motivo y la acción de la semana. Las dificultades van primero.
- **Filtros en el navegador:**
  - pestañas: todas, con dificultades, sin respuesta y favorable;
  - búsqueda;
  - semana: la actual y las de la serie;
  - motivo: los 5 del bot;
  - paginación de 6 en 6.
- **Detalle:** respuesta, motivo, semana, acción, parentesco, alias y enlace a la ficha.
- **Exportar CSV** con todas las filas filtradas.
- **Se quitó:**
  - botón "Sincronizar" (WhatsApp avisa solo, por el webhook);
  - estado de entrega (entregado, leído o fallido) y su filtro;
  - fechas de envío y de respuesta, cantidad de recordatorios y códigos de error;
  - el **hilo de conversación**, que no se simula;
  - la "acción sugerida", porque era consejo clínico sin revisar;
  - motivos que el bot no ofrece.

### 5.7 Indicadores (`/indicadores`)

- **Selectores:** establecimiento y semana. Las semanas disponibles salen de la serie de la API, hasta 5.
- **Meta-alerta** (nueva): un banner cuando la API la devuelve, con la nota sobre la falsa alarma al inicio de la semana.
- **Indicadores de la semana:**
  - recordatorios programados (enviados + fallidos);
  - enviados (aceptados por WhatsApp, **sin confirmación de lectura**);
  - fallas de envío;
  - respuestas y tasa;
  - "Sí le di" (declarado, no verificado) y casos con dificultades.
- **Fórmula a la vista:** respuestas ÷ enviados (los fallidos quedan fuera).
- **Gráfico semanal:** enviados contra respuestas, escalado al valor real más alto, con la semana en curso marcada.
- **Motivos de dificultad:** cantidad de casos por cada uno de los 5 motivos del bot en la semana elegida, sobre los niños de la lista actual, y el motivo más frecuente.
- **Canal:** "WhatsApp Cloud API (modo prueba)".
- **Exportar:** CSV, y PDF mediante la impresión de la página.
- **Se quitó:**
  - "entregados" y "en cola";
  - disponibilidad (*uptime*) y latencia;
  - la "prioridad de consejería" (texto clínico);
  - insignias de norma técnica o de validación HIS-MINSA, que no tienen respaldo.

### 5.8 Administración (`/administracion`)

**Paso 1 · Cargar padrón**
- **Contrato:** las columnas **exactas** de la API: `id_nino, establecimiento_id, alias_cuidador, telefono, edad_meses, area, region, altitud_msnm, controles_cred, fecha_entrega_hierro`, más la opcional `acepta_mensajes`. La plantilla CSV de ejemplo se genera en el navegador.
- **Validación antes de enviar**, en español y por fila y columna:
  - vacíos;
  - edad entera de 6 a 35;
  - área `urbano` o `rural`;
  - altitud entera;
  - teléfono;
  - fecha.
- **Conversión del archivo**, para que la API no rechace los CSV de Excel en español:
  - Windows-1252 → UTF-8;
  - `;` → `,`;
  - fechas DD/MM/AAAA → AAAA-MM-DD;
  - teléfono con +51.
- **Envío:** `POST /padron`. El error 400 de la API (un solo texto) se convierte en una lista por fila, con sus mensajes traducidos.
- **Estado:** el padrón activo del establecimiento (de la lista). El "último archivo cargado" se guarda solo en este navegador, y la pantalla lo aclara.

**Paso 2 · Conexión (solo lectura):** si la API responde, si está en modo prueba y la hora del servidor. No muestra credenciales.

**Paso 3 · Exportación y respaldo físico (plan B de la demo):**
- descargar la lista en CSV (`lista.csv`);
- hoja A4 imprimible con N.º, código, alias, edad, acción, motivos y una columna vacía "Visitado / Observaciones".

**Se quitó:** "última sincronización", registros de muestra del padrón activo (la API no lo devuelve), y el nombre, RENIPRESS y red del establecimiento.

---

## 6. Lo que falta en la API (para Arny)

Ordenado por impacto. Cada pedido indica qué resuelve y qué cambia en el panel cuando exista. Todos los problemas descritos se comprobaron llamando a la API real (commit `30fbca5`, octubre de 2026), no solo leyendo el código.

### Prioridad alta (afecta la demo o el consentimiento)

| # | Pedido | Por qué | En el panel |
| --- | --- | --- | --- |
| 1 | **`GET /establecimientos/{id}/lista`** para **leer** la lista de la semana sin regenerarla. Agregar en cada fila: `respuesta_semana`, `razon_semana`, `fecha_respuesta`, `estado_recordatorio`, `acepta_mensajes` | Hoy cada sesión del panel hace un `POST` que **reescribe** la lista de la semana. Tampoco se puede saber quién pidió BAJA ni a quién le llegó el recordatorio | Todas las pantallas leerían sin escribir. Planificación y Niños mostrarían BAJA y el estado del recordatorio. Comunicación dejaría de pedir 40 historiales |
| 2 | **No borrar los BAJA al recargar el padrón** | Si el CSV no trae `acepta_mensajes`, la API pone "sí" a todos y el cuidador vuelve a recibir mensajes sin pedirlo | Ninguno: es un arreglo de la API |
| 3 | **Parámetro de fecha en modo prueba** (por ejemplo `?hoy=2026-10-26` en la lista), o reordenar en la misma semana | El paso 5 del ensayo de la demo ("el niño sube en la lista") no se ve en vivo: un "No le di" recién sube la semana siguiente | Planificación podría simular "la semana que viene" durante la demo |
| 4 | **Errores del padrón en español y con estructura**: `{"errores": [{"fila": 4, "columna": "edad_meses", "mensaje": "…"}], "total": 12}`. Rechazar vacíos y decimales | Hoy llegan en un solo texto, a veces en inglés, máximo 10 y sin total. Un alias vacío se guarda como "nan" y una edad 12.7 se trunca a 12 | Administración mostraría los errores tal cual. Ya valida antes de enviar, pero la API debe protegerse sola |
| 5 | **Meta-alerta sin falsa alarma**: evaluar las respuestas solo con semanas cerradas o unos días después del envío | Cada lunes, recién enviados los recordatorios, aparece "Llegaron muchas menos respuestas…" | El banner dejaría de necesitar la nota aclaratoria |
| 6 | **Confirmar la regla de los recordatorios**: ¿también a los niños con visita? | El README dice "el resto a WhatsApp", pero el código envía a todos | Se ajustaría el texto de la confirmación en Planificación y de la tarjeta de WhatsApp en Inicio |

### Prioridad media (completa pantallas)

| # | Pedido | Por qué | En el panel |
| --- | --- | --- | --- |
| 7 | **`GET /ninos/{id}`** con los datos del padrón: área, región, altitud, controles CRED, fecha de entrega del hierro, `acepta_mensajes` | La ficha no puede mostrar esos datos, y abierta por un enlace directo depende de la lista | Ficha: datos completos y "N controles CRED" |
| 8 | **En el historial:** `fecha_respuesta` y estado del recordatorio | Hoy solo se sabe la semana, no el día ni si el mensaje llegó | Ficha y Niños: "hace N días"; Comunicación: estado de entrega |
| 9 | **`GET /establecimientos/{id}/mensajes?semana=`**: por niño, fecha de envío, estado (enviado, entregado, leído o fallido), código de error, respuesta, razón y fecha de respuesta | Para la versión completa de Comunicación, con una sola llamada | Comunicación completa: estados, fechas y filtro de entrega |
| 10 | **Indicadores más completos:** `no_le_di`, `problema`, `razones: {sabor: n, …}`, `entregados`, `leidos`, `visitas`; y un total de todos los establecimientos | Hoy esos números se calculan con 40 historiales y solo sobre la lista actual | Indicadores, Inicio y Comunicación sin cálculos niño por niño |
| 11 | **`GET /establecimientos`** con nombre | El selector usa códigos fijos en la configuración | Encabezado y Administración mostrarían nombres |
| 12 | **Validar** el formato de `semana` (hoy `?semana=hola` responde 200) y responder **404** si el establecimiento o el niño no existen | Hoy un establecimiento inexistente se ve igual que uno con el padrón vacío | Mensajes de error más claros |
| 13 | **Teléfono con 51:** normalizarlo o exigirlo | Un celular de 9 dígitos pasa la validación, pero WhatsApp no le llegaría y su respuesta no se emparejaría (Meta envía "51…"). El panel ya agrega +51 antes de enviar | Ninguno |

### Para conversar con el equipo

| # | Tema | Nota |
| --- | --- | --- |
| 14 | **Semana epidemiológica del MINSA** (de domingo a sábado) en lugar de la semana ISO | Hoy la API dice semana 43 donde el MINSA dice SE 42. Cambiarlo toca toda la lógica semanal de la API. El panel solo cambiaría `src/lib/semana.ts` |
| 15 | **Registrar visitas realizadas** y programarlas por día | Habilitaría "visitas realizadas" en Inicio y la agenda del diseño. Es útil para medir un piloto |
| 16 | **Reasignar canal a mano** | El diseño lo tenía. Si se agrega, conviene registrarlo (hoy `prob_asignacion = 1.0`) para que el piloto lo sepa |

**Cómo se conecta un pedido nuevo en el panel:** se agrega la ruta en `src/api/yawar.ts`, su consulta en `src/api/queries.ts` y se usa en el `api.ts` de la pantalla. Los componentes que hoy ocultan ese dato se vuelven a mostrar.

---

## 7. Limitaciones conocidas del panel (hoy)

- **Abrir el panel genera la lista de la semana** (`POST`), con la capacidad guardada. Con la misma capacidad el resultado es el mismo, pero escribe en la base. Se resuelve con el pedido 1.
- **Las respuestas, motivos y conteos por niño** se calculan solo sobre los niños de la **lista actual**. En semanas pasadas no aparecen los que ya salieron del padrón.
- **Capacidad mayor que el padrón:** si N = 10 y hay 4 niños, Inicio dice "4 / 10" y el selector muestra N = 4. Con un padrón real (~40 niños) no ocurre.
- **Semana ISO, no la del MINSA** (pedido 14).
- **Textos para revisar** con el asesor de salud:
  - los "resultados" fijos del historial en la Ficha;
  - los colores de los motivos en Comunicación;
  - el recuadro "Criterio clínico primero" de Inicio, que viene del diseño.

---

## 8. Cómo probarlo

| Qué | Cómo |
| --- | --- |
| Levantar todo | `cd panel` → `npm install` (la primera vez) → `npm run dev` → http://localhost:5173 |
| Pruebas del panel (API simulada con el formato real) | `npm test`: 135 pruebas en 10 archivos |
| Prueba contra la API real | `npm run probar-api`, con la API encendida en `MODO_PRUEBA=1` |
| Informe con fecha | `npm run evidencia`, que se guarda en `docs/panel/evidencias/pruebas/` |
| Probar la API sola | Colección de Postman en [`tests/postman/`](../../tests/postman/README.md) |

---

## 9. Documentos relacionados

- [Brecha diseño–API](evidencias/2026-10-21_brecha_diseno_vs_api.md): la decisión campo por campo que guió esta integración.
- [Capturas de las 7 pantallas](evidencias/capturas/README.md), en escritorio y celular.
- [README del panel](../../panel/README.md): cómo levantarlo, comandos y estructura del código.
- [Colección de Postman](../../tests/postman/README.md) para probar la API.
