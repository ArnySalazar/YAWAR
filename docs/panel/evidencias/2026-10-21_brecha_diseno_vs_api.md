# Brecha entre el diseño final del front y la API · 2026-10-21

Se compara el front generado desde Figma (`YAWAR_FRONT_FIGMA`: React 19, TypeScript, TanStack Query, 7 pantallas) con lo que hoy devuelve la API de YAWAR (commit `30fbca5`).

**Fuentes:**
- Del front: el contrato de datos de cada pantalla (`src/features/*/types.ts`), sus llamadas (`api.ts`) y los componentes que muestran cada campo.
- De la API: las respuestas reales comprobadas el 2026-10-20 ([análisis por módulo](2026-10-20_analisis_api_por_modulo.md)).

**Leyenda:**
- ✅ la API lo da, directo o calculándolo en el front;
- 🟡 parcial, aproximado o requiere varias llamadas;
- ❌ no existe en la API.

Decisión sugerida para cada dato:
- **Mantener**: se usa tal cual.
- **Adaptar**: se cambia el dato o el texto para que calce con la API.
- **Ocultar**: se quita de la pantalla.
- **Pedir**: requiere una ruta nueva de Arny.

## 1. Resumen

El front espera **30 rutas** (`/me`, `/dashboard/home`, `/planning/weeks/...`, `/children/...`, `/communications/...`, `/indicators/...`, `/registry/...`). **Ninguna existe** con esa forma: la API tiene 9 rutas con otros nombres y otros formatos. Aun así, buena parte de la información **sí se puede armar** desde 4 rutas reales:

| Ruta real | Qué alimenta |
| --- | --- |
| `POST /establecimientos/{id}/lista` | Planificación, Niños, Inicio y parte de la Ficha |
| `GET /ninos/{id}/historial` | Ficha, Comunicación y motivos de Indicadores |
| `GET /establecimientos/{id}/indicadores` | Inicio, Comunicación e Indicadores |
| `POST /padron` | Administración |

| Pantalla | Cobertura con la API actual | Qué hacer |
| --- | --- | --- |
| Planificación semanal | **Alta** | Adaptar: quitar la agenda con horas, la reasignación manual y la elección de semana |
| Niños en seguimiento | **Media** | Adaptar: filtrar y paginar en el navegador; quitar sector, teléfono, suplemento y fecha del último reporte |
| Ficha del niño | **Media** | Adaptar: historial y "próxima acción" sí; quitar nombre, teléfono, sector, suplemento y fecha del último CRED |
| Indicadores | **Media** | Adaptar: envíos, respuestas y tendencia sí; quitar infraestructura y cola; los motivos se calculan con el historial |
| Inicio | **Media-baja** | Adaptar: quitar la agenda por día, el mapa, las fotos, el dosaje de Hb y el avance de visitas realizadas |
| Comunicación | **Baja** | Reducir a "respuestas de la semana" o esperar una ruta de mensajes de Arny |
| Administración | **Media** | La carga sí, corrigiendo el contrato de columnas. La pestaña "Exportación" se puede hacer con lo que ya existe; "Conexión" se oculta |
| Encabezado (sesión) | **Nula** | No hay usuarios en la API: quitar nombre, foto y cargo; el establecimiento sale del selector |

Hay **tres problemas de fondo** que conviene resolver antes de mirar campo por campo: la conexión técnica (sección 2), la numeración de semanas (sección 3) y los datos que chocan con las reglas del proyecto (sección 4). El diseño, además, **no tiene la meta-alerta**, una de las funciones que distinguen a YAWAR (sección 5.8).

## 2. Conexión técnica (obligatoria, no cambia pantallas)

| # | Diseño | API | Ajuste |
| --- | --- | --- | --- |
| 1 | `VITE_API_URL=http://localhost:8000/api`, llamadas directas desde el navegador | La API no tiene el prefijo `/api` ni CORS | Proxy de Vite `/api` → `localhost:8000` quitando el prefijo, como en el panel actual |
| 2 | Envía `Authorization: Bearer <token>` | Pide `X-API-Key` (solo si `API_CLAVE` está definida) | Enviar `X-API-Key` en `http.ts` y pedir la clave en pantalla, no escrita en el código |
| 3 | Lee el error de `payload.message` | FastAPI responde `{"detail": "texto"}` (o una lista en el 422) | Leer `detail` |
| 4 | Cada `api.ts` llama a su ruta de diseño | Rutas distintas | Un adaptador por pantalla dentro de `api.ts`: llama a la ruta real y transforma la respuesta al tipo del diseño. El README del front ya prevé exactamente esto |
| 5 | `VITE_USE_MOCKS=true` | — | En la demo, `false`. Lo que no venga de la API se oculta: no se muestran datos de ejemplo (regla de Arny) |

## 3. Numeración de semanas: el diseño y la API no coinciden

| Fecha | API (semana ISO, de lunes a domingo) | MINSA (semana epidemiológica, de domingo a sábado) | Diseño |
| --- | --- | --- | --- |
| Miércoles 2026-10-21 | **2026-W43** (19 al 25 de octubre) | **SE 42** (18 al 24 de octubre) | "Semana epidemiológica **42**, 19 al 25 de octubre" |

El diseño mezcla los dos sistemas: toma el número de la SE y las fechas de la semana ISO. Si se conecta tal cual, el panel diría "SE 43" donde el personal espera "SE 42".

**Opciones:**
- **(a) Rápida:** mostrar la semana de la API sin la palabra "epidemiológica", con sus fechas ("Semana 43 · 19 al 25 oct").
- **(b) Correcta para el sector salud:** que la API calcule semanas epidemiológicas del MINSA. Toca toda la lógica semanal de Arny, porque `semana_iso` se usa en la lista, los recordatorios, el registro y los indicadores.

**Recomendación:** (a) para la demo, y proponer (b) al equipo.

## 4. Datos que chocan con las reglas del proyecto (ocultar sí o sí)

El README fija estas reglas: padrón simulado; sin nombres reales, DNI ni fecha de nacimiento; solo alias del cuidador y edad en meses. El panel tampoco muestra teléfonos.

| Dato del diseño | Dónde aparece | Regla | Decisión |
| --- | --- | --- | --- |
| Nombre del cuidador ("Elena F.", "Maritza Q.") | Inicio, Planificación, Niños, Ficha, Comunicación | Solo alias | **Adaptar** a `alias_cuidador` ("Mamá de N0001"), que sí devuelve la API |
| Iniciales del niño ("Liam S.") | Planificación, Ficha | Sin nombres | **Ocultar**; usar el código del niño |
| Teléfono (enmascarado y completo, con botón "llamar") | Planificación, Niños, Ficha | El panel no muestra teléfonos; la API no los devuelve | **Ocultar** los teléfonos y los botones de llamar |
| Foto o avatar del niño | Inicio (lista de priorizados) | Sin fotos de niños | **Ocultar**; usar un ícono neutro o el número de orden |
| Fecha de nacimiento | Formulario "alta manual" (`POST /children`) | Sin fecha de nacimiento | **Quitar**. Ya no se usa en ninguna pantalla; el alta es por padrón CSV |
| Dosaje de hemoglobina (`hbScreeningPct`) | Inicio | Dato clínico fuera del alcance de YAWAR | **Ocultar** |
| Foto, nombre y cargo de la enfermera ("Lic. Rosa Vilca") | Encabezado | La API no tiene usuarios | **Ocultar** o poner un texto fijo "Personal CRED" |

## 5. Pantalla por pantalla

### 5.1 Encabezado y sesión (`GET /me`)

| Campo | Estado | Decisión |
| --- | --- | --- |
| `displayName`, `role`, `avatarUrl` | ❌ (no hay usuarios ni inicio de sesión) | Ocultar |
| Nombre del establecimiento, código RENIPRESS, red | ❌ (el padrón solo tiene un código como `EESS01`) | Adaptar: mostrar el código. Pedir `GET /establecimientos` con nombre |
| `unreadAlerts` (campana) | ❌ | Adaptar: contar las alertas de Inicio (5.2), u ocultar la campana |
| Un solo establecimiento fijo | 🟡 La API maneja varios (`EESS01`, `EESS02`, `EESS03`) | Adaptar: agregar el selector de establecimiento, como en el panel actual |

### 5.2 Inicio

**Tarjetas de indicadores (KPIs)**

| Dato | Estado | Fuente o decisión |
| --- | --- | --- |
| Padrón activo (total) y rango de edad | ✅ | Cantidad de filas de la lista; edad mínima y máxima |
| Nuevos este mes | ❌ | Ocultar |
| Dosaje de Hb registrado | ❌ y fuera de alcance | Ocultar |
| Priorizados (total y % del padrón) | 🟡 | En YAWAR **todos** los niños reciben una acción (visita o WhatsApp). Definir "priorizado" = con señal roja o ámbar (`nivel` 0 o 1). Ver la decisión 2 |
| Visitas asignadas, cupo N, cobertura | ✅ | Niños con `accion = visita`; N = la capacidad usada al generar; cobertura calculada |
| Seguimientos por WhatsApp | ✅ | Niños con `accion = whatsapp` |
| Respuestas y tasa de respuesta | ✅ | `indicadores`: respondidos y respondidos ÷ enviados. Ojo: la API manda recordatorio a **todos**, también a los de visita |
| Avance: visitas **realizadas** de las planificadas | ❌ | No existe un registro de visitas hechas. Ocultar, o pedir una ruta "registrar visita" (útil para un piloto) |
| Avance: interacciones | ✅ | Respondidos de los enviados |

**Lista de niños priorizados con agenda por día**

| Dato | Estado | Decisión |
| --- | --- | --- |
| Código, edad | ✅ | Mantener |
| Motivo de prioridad (`reported_problem`, `no_response`, `high_risk`) | ✅ | `nivel` 0 → problema; 1 → sin respuesta; 2 → por puntaje |
| Texto del estado ("No le dio: Sabor metálico") | 🟡 | `seguimiento` o `motivos` de la API. La razón de la semana pasada no viene en la lista |
| "Probabilidad de no consumo: ALTA" | 🟡 | Mostrar el porcentaje. No poner ALTA, MEDIA o BAJA hasta que Jose defina umbrales con el modelo real calibrado |
| Cuidador: parentesco | 🟡 | Se deduce del alias ("Mamá de …") |
| Cuidador: nombre, sector, canal preferido | ❌ | Ocultar (el nombre se reemplaza por el alias) |
| Próxima acción: tipo | ✅ | `accion` |
| Próxima acción: **día y hora** programados | ❌ | No hay agenda en la API. **Ocultar la tira de días y las horas**: mostrar una lista simple con Visita o WhatsApp |
| Foto | ❌ y va contra las reglas | Ocultar |
| Mapa por sectores (`SectorMapView`) | ❌ | Ocultar: no hay datos geográficos |
| Menú "registrar llamada o mensaje" (`POST /children/:code/contact-attempts`) | ❌ | Ocultar |

**Alertas operativas**

| Alerta | Estado | Fuente |
| --- | --- | --- |
| "N niños sin respuesta" | ✅ | Cantidad con `nivel` 1 |
| "N reportes de efectos" | 🟡 | `nivel` 0 junta "No le di" y "Tuve un problema"; se separan leyendo el texto de `seguimiento`. Saber si fue estreñimiento requiere el historial |
| **Meta-alerta** (el sistema dejó de enviar o recibir) | ✅ en la API, **ausente en el diseño** | Agregarla como alerta |

**Tarjeta de capacidad N**: leer la capacidad ❌ (la API no la guarda, es un parámetro); cambiarla 🟡 = volver a generar la lista (`POST lista?capacidad=N`). El máximo es el total de niños ✅. "Máximo de interacciones" ❌, ocultar.

### 5.3 Planificación semanal

| Dato o acción | Estado | Fuente o decisión |
| --- | --- | --- |
| Lista de semanas, con estado activa, cerrada o borrador | ❌ | **La API solo planifica la semana actual** (no recibe la semana). Ocultar el selector o mostrar solo la semana en curso |
| Semana, fechas, establecimiento, fecha de referencia | ✅ | Semana ISO y `salud.hora_local` (ver sección 3) |
| Tamaño del padrón, rango de edad, capacidad N | ✅ | De la lista |
| Generado a las…, recordatorios enviados a las… | ❌ | Ocultar o anotarlo en el navegador al ejecutar la acción |
| Resumen de efectos adversos | ❌ | Adaptar: "N reportaron un problema la semana pasada" (`nivel` 0) |
| **Por niño:** posición | ✅ | `orden` |
| **Por niño:** señal R1, R2, R3 | ✅ | **Coincide con las reglas de la API**: R1 = `nivel` 0, R2 = `nivel` 1, R3 = `nivel` 2 por puntaje. Mantener el banner de reglas y el aviso deontológico |
| Señal "rechazo de ingesta" frente a "reportó problema" | 🟡 | Se distinguen por el texto de `seguimiento` ("No le di" o "Tuve un problema") |
| Señales "inicio tardío del suplemento" y "monitoreo preventivo" | ❌ | No existen en la API; no usarlas |
| Último reporte: texto | 🟡 | Solo para `nivel` 0 o 1 (texto de `seguimiento`); para el resto, historial |
| Último reporte: fecha ("hace N días") | ❌ | `fecha_respuesta` se guarda pero no se devuelve. Ocultar o pedir |
| Riesgo: valor | ✅ | `puntaje` |
| Riesgo: nivel (alto, moderado, medio, bajo) | 🟡 | Sin umbrales definidos (ver Inicio) |
| Canal asignado y orden de visita | ✅ | `accion`; el orden de visita es la posición entre los de visita |
| Estado: programada, pendiente de ruta, recordatorio enviado; fecha y hora de la visita | ❌ | Ocultar |
| Iniciales, nombre y teléfono del cuidador | ❌ y va contra las reglas | Usar el alias; ocultar el teléfono (sección 4) |
| Acción **Generar con capacidad N** | ✅ | `POST lista?capacidad=N` |
| Acción **Reasignar canal** a mano | ❌ | Ocultar (o pedirla: hoy la asignación es automática, con `prob_asignacion = 1.0`) |
| Acción **Enviar recordatorios a niños seleccionados** | 🟡 | La API envía a **todos** los niños del establecimiento y devuelve solo totales. Adaptar a "Enviar a todos" y mostrar enviados, fallidos y dados de baja |

### 5.4 Niños en seguimiento

No hay `GET /children`. El listado se arma con la lista de la semana (máximo unos 40 niños por establecimiento), y **la búsqueda, los filtros, el orden y la paginación se hacen en el navegador**. Cuidado: pedir la lista la **regenera**. Hay que usar la última generada en Planificación con su capacidad, o pedir a Arny una ruta para solo leerla.

| Dato o función | Estado | Decisión |
| --- | --- | --- |
| Código, edad, grupo de edad | ✅ | Mantener; el grupo se calcula |
| Estado de seguimiento (8 estados) | 🟡 | Reducir a los 4 que existen: reportó problema, no le dio, sin respuesta, sí le dio. Quitar deserción probable, baja cobertura, recién incorporado, farmacia |
| Respuesta de la semana | 🟡 | La lista no la trae; se obtiene con el historial de cada niño (una llamada por niño) |
| Acción semanal y orden de visita, "priorizado esta semana" | ✅ | De `accion` y `nivel` |
| Alias del cuidador | ✅ | Mantener |
| Teléfono | ❌ y va contra las reglas | Ocultar |
| Suplemento (gotas o jarabe) | ❌ (no está en el padrón) | Ocultar |
| Sector y filtro de sector | ❌ | Ocultar. La región existe en el padrón pero la API no la devuelve |
| Fecha y canal del último reporte, filtro "último reporte" | ❌ (solo existe WhatsApp; no hay llamada, presencial ni farmacia) | Ocultar |
| Nombre del establecimiento | 🟡 | Mostrar el código |
| Indicadores: total, rango de edad, respuesta semanal, alertas | ✅ | Mantener |
| Indicadores: visitas asignadas hoy o pendientes | ❌ | Ocultar |
| Exportar CSV | ✅ | En el navegador, o con `lista.csv` |
| Alta manual con fecha de nacimiento | ❌ y va contra las reglas | Ya no se usa en pantalla; borrar el código |

### 5.5 Ficha del niño

| Dato o acción | Estado | Decisión |
| --- | --- | --- |
| Código, edad, grupo de edad | ✅ | La edad sale de la lista |
| "Priorizado para visita" | ✅ | `accion = visita` en la lista de la semana |
| Iniciales, año de registro | ❌ | Ocultar; el código es el título |
| Suplemento y esquema | ❌ | Ocultar |
| Fecha del último control CRED | ❌ | El padrón guarda la **cantidad** de controles, no la fecha, y no la devuelve. Ocultar, o pedir `GET /ninos/{id}` y mostrar "N controles CRED" |
| Establecimiento | 🟡 | Mostrar el código |
| Cuidador: alias | ✅ | En lugar del nombre |
| Cuidador: teléfono, sector | ❌ | Ocultar |
| Último reporte del cuidador | ✅ | Última semana del historial (respuesta + razón) |
| Próxima acción: canal, título, motivo | ✅ | Canal = `accion`; motivo = `regla` o `seguimiento`; título y estado los arma el front |
| Acción "Reasignar a WhatsApp" | ❌ | Ocultar |
| Historial del bot por semana | ✅ | Semana, fecha (calculada), estado (problema → alerta; no le di → interrupción; sí le di → completado; sin respuesta) |
| Historial del bot: frase del cuidador | 🟡 | El bot solo recibe **botones**, no texto libre. Mostrar "Tuve un problema: Estreñimiento" armado con la respuesta y la razón, **sin comillas de cita** |
| Historial del bot: resultado | 🟡 | El front lo arma con una regla fija (por ejemplo, "Se envió la lista de motivos") |
| Regularidad de la toma (barras por semana) | ✅ | Se calcula desde el historial. Llamarla **"Respuesta del cuidador"**: es lo que dice el cuidador, no una toma verificada. Falta un 4.º estado "sin respuesta" en el diseño |

Si se abre la ficha desde un enlace directo, sin lista cargada, no hay edad ni alias. La solución es pedir `GET /ninos/{id}` o cargar antes la lista.

### 5.6 Comunicación

| Dato o función | Estado | Decisión |
| --- | --- | --- |
| Contactados, respondidos, tasa | ✅ | `indicadores` |
| "No consumo" y "reportó problema" por separado | 🟡 | `indicadores` solo los da juntos; separados, con el historial de cada niño |
| Sin respuesta por más de 7 días | 🟡 | Aproximado: enviados − respondidos |
| Última sincronización y botón **Sincronizar** | ❌ | **Quitar**: no aplica, porque WhatsApp avisa solo, por el webhook |
| Lista de respuestas: niño, alias, respuesta, motivo | 🟡 | Con el historial de cada niño (≤ 40 llamadas por establecimiento) |
| Catálogo de motivos | 🟡 **No coincide** | El diseño tiene efectos adversos, derrame del frasco, desconexión digital y número no disponible, que el bot no ofrece. Al diseño le faltan **"Se acabó el hierro"** y **"Otro motivo"**, que sí ofrece. Adaptar a los 5 motivos del bot |
| Estado de entrega (respondido, entregado sin leer, fallido) y código de error | ❌ | La API los guarda pero no los devuelve. Ocultar el filtro y la etiqueta, o pedir |
| Fechas: respuesta, primer envío, último intento; cantidad de recordatorios | ❌ | Ocultar o pedir |
| Detalle con el **hilo de conversación** | ❌ | Los textos del bot no se guardan y los mensajes que llegan no se devuelven. **No simular el hilo** (sería inventar datos). Mostrar respuesta y motivo |
| Acción sugerida | 🟡 | Texto fijo por motivo, **revisado por el asesor de salud** |
| Pestañas, búsqueda, semana, paginación, exportar CSV | ✅ | En el navegador |

**Recomendación:** versión reducida, "Respuestas de la semana" (respuesta y motivo por niño, con pestañas y CSV), sin fechas, estados ni hilo. La versión completa necesita la ruta de mensajes (pedido 5).

### 5.7 Indicadores

| Dato | Estado | Fuente o decisión |
| --- | --- | --- |
| Establecimiento, año, semana; semanas disponibles | ✅ / 🟡 | `?semana=2026-W43`. Las semanas disponibles salen de la serie (máximo 5, solo las que tuvieron envíos) |
| Recordatorios: programados | 🟡 | Enviados + fallidos |
| Recordatorios: "entregados" | 🟡 | La API cuenta **enviados aceptados**, no entregados confirmados. Cambiar la etiqueta a "Enviados" |
| Recordatorios: en cola | ❌ | Ocultar |
| Fallas de envío (cantidad y %) | ✅ | `fallidos` y fallidos ÷ intentos |
| Respuestas recibidas; base de cálculo | ✅ | Respondidos; enviados |
| "Sí le di"; casos con dificultades | ✅ | `si_le_di`; respondidos − "Sí le di" |
| Fallas técnicas excluidas | ✅ | `fallidos` |
| Tendencia semanal (enviados, respuestas, tasa, semana en curso) | ✅ | `serie` (máximo 5 semanas) |
| **Motivos de dificultad** (5 categorías con casos) | 🟡 | **Calzan 1 a 1 con los motivos del bot**: digestivo = estreñimiento, sabor, frasco = se acabó, olvido, otros. La API no los cuenta; se cuentan con el historial de cada niño, o se pide en `indicadores` |
| Prioridad de consejería | 🟡 | Texto fijo según el motivo más frecuente, revisado por el asesor de salud |
| Infraestructura: disponibilidad (*uptime*) y latencia | ❌ | **Ocultar**: no se mide. Mostrar números inventados sería engañoso |
| Canal activo | ✅ | Texto fijo: "WhatsApp Cloud API (modo prueba)" según `/salud` |
| Exportar CSV o PDF | ✅ | En el navegador |

### 5.8 La meta-alerta no está en el diseño

La API la calcula (`meta_alerta` en `indicadores`) y el README la presenta como función clave: detectar que el sistema dejó de enviar o de recibir mensajes sin que nadie lo note. **Se recomienda agregarla** como banner en Indicadores y como alerta en Inicio, con su limitación conocida (falsa alarma al inicio de la semana, hallazgo 11).

### 5.9 Administración

**Paso 1 · Cargar padrón**

| Elemento | Estado | Decisión |
| --- | --- | --- |
| **Contrato de columnas** (y la plantilla CSV) | ❌ **Distinto al de la API** | Corregir los nombres: `establecimiento` → `establecimiento_id`; `altitud` → `altitud_msnm`; `controles_CRED` → `controles_cred`. El ejemplo de área es "Urbana" y debe ser `urbano` o `rural`. **Con la plantilla actual, la API rechaza el archivo** |
| Validación en el navegador | ✅ | **Mejor que la de la API**: errores en español, por fila **y columna**, y rechaza vacíos y edades con decimales (cubre los hallazgos 6, 12 y 13). Le faltan dos cosas: validar el área (`urbano` o `rural`) y la altitud entera. Además, debe convertir los separadores `;` o tabulación a coma antes de enviar, porque la API solo acepta coma |
| Subir el archivo | 🟡 | Adaptar `POST /registry/upload` (campo `file`) a `POST /padron` (campo `archivo`). Convertir `{cargados}` al resultado del diseño, y el error 400 (un solo texto) a la lista `{fila, columna, mensaje}` |
| Codificación de Excel | 🟡 | El navegador puede leer el archivo como UTF-8 y, si falla, como Windows-1252, y volver a enviarlo en UTF-8. Así se resuelve el hallazgo 7 sin tocar la API |
| Vista previa del archivo elegido | ✅ | Ya es local |
| Estado del padrón activo: total, última sincronización, último archivo, registros de muestra | ❌ / 🟡 | Total: suma de las listas por establecimiento. El resto: ocultar, o guardar el último resultado en el navegador |
| Tarjeta de jurisdicción (nombre, RENIPRESS, red) | ❌ | Mostrar el código del establecimiento |

**Paso 2 · Configuración de conexión**: hoy dice "próximamente". **Ocultar**, o mostrar solo el modo prueba (de `/salud`).

**Paso 3 · Exportación y respaldo físico**: hoy dice "próximamente". **Implementar**: la API ya tiene `lista.csv` y el panel actual ya tiene la vista para imprimir en A4. Es el plan B que pide `docs/riesgos_demo.md`.

## 6. Decisiones que tiene que tomar Gian

| # | Decisión | Opciones | Recomendación |
| --- | --- | --- | --- |
| 1 | Numeración de semanas | (a) semana ISO, sin la palabra "epidemiológica"; (b) que la API use SE del MINSA | (a) para la demo; proponer (b) |
| 2 | Qué significa "priorizado" | Señal roja o ámbar (`nivel` 0 o 1) / los N de visita / todos | Señal roja o ámbar, y aparte "N visitas y M WhatsApp" |
| 3 | Agenda por día y hora; visitas realizadas | Ocultar / pedir "registrar visita" y "programar" | Ocultar en la demo; mencionarlo como siguiente paso del piloto |
| 4 | Reasignación manual de canal | Ocultar / pedir la ruta | Ocultar. La asignación automática es la que el piloto mediría |
| 5 | Comunicación | Versión reducida ahora / esperar la ruta de mensajes | Versión reducida, y pedir la ruta |
| 6 | Niveles de riesgo (alto, medio, bajo) | Porcentaje / niveles con umbrales | Porcentaje hasta que Jose calibre el modelo |
| 7 | Qué front usar | El diseño de Figma / el panel actual (`YAWAR/panel`) | **El diseño de Figma**, más completo, movido a `YAWAR/panel`. Hay que traer del panel actual el proxy, `X-API-Key`, el `npm run dev` que levanta la API, las pruebas y `npm run evidencia` |

## 7. Pedidos a Arny que más pantallas destraban

| # | Ruta | Pantallas |
| --- | --- | --- |
| 1 | `GET /establecimientos/{id}/lista` (leer sin regenerar), con: respuesta y razón de esta semana, `fecha_respuesta`, estado del recordatorio, `acepta_mensajes` | Planificación, Niños, Inicio, Comunicación |
| 2 | `GET /ninos/{id}`: datos del padrón (área, región, controles, fecha de entrega del hierro) | Ficha |
| 3 | `GET /establecimientos/{id}/mensajes?semana=`: por niño, fecha de envío, estado, respuesta, razón, fecha de respuesta, código de error | Comunicación (versión completa) |
| 4 | En `indicadores`: conteo por razón, "No le di" y "Tuve un problema" por separado, entregados y leídos | Indicadores, Inicio, Comunicación |
| 5 | `GET /establecimientos` con nombre | Encabezado, Indicadores, Administración |
| 6 | Semana epidemiológica del MINSA (decisión 1b) | Todas |

## 8. Orden de trabajo sugerido

1. **Conexión** (sección 2) y apagar los datos de ejemplo.
2. **Quitar lo que choca con las reglas** (sección 4).
3. **Adaptadores** en cada `api.ts`, pantalla por pantalla, en orden de cobertura: Planificación → Niños → Ficha → Indicadores → Inicio → Administración → Comunicación. Cada componente cuyo dato sea ❌ se oculta; ninguno muestra datos de ejemplo.
4. **Agregar la meta-alerta** y el paso de Exportación.
5. **Pruebas y evidencia**: Vitest por pantalla, `npm run evidencia` y capturas fechadas.
6. **Pedidos a Arny** (sección 7), en paralelo.
