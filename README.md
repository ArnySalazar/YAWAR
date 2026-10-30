# YAWAR

Hackathon Interdisciplinaria FACI 2026 (UPCH) · Reto 1: Salud digital e IA para el primer nivel de atención.

**Problema.** En el Perú el hierro llega a las casas, pero muchos niños de 6 a 35 meses no lo están tomando, y nadie hace seguimiento entre un control y otro.

**Solución.** Tres piezas conectadas:

1. **Modelo** (`modelo/`): estima, con datos abiertos de ENDES, qué niños tienen mayor riesgo de no estar tomando el hierro que recibieron.
2. **Panel** (`panel/`): el personal de CRED ve cada semana una lista priorizada según cuántas visitas puede hacer.
3. **Asistente de WhatsApp** (`bot/` y `api/`): pregunta al cuidador si le dio el hierro y, si no, por qué. La respuesta vuelve al panel.

La herramienta prioriza el seguimiento. No promete reducir la anemia: ese efecto se mediría en un piloto.

## Estructura

| Carpeta | Responsable | Contenido |
| --- | --- | --- |
| `datos/` | Magno | Instrucciones de descarga de ENDES (los microdatos **no** se suben) y el padrón de ejemplo |
| `analisis/` | Magno | Unión, limpieza, cifras ponderadas, gráficos y diccionario de datos |
| `modelo/` | Jose | Entrenamiento, validación y la función `puntuar(df)` |
| `api/`, `bot/` | Arny | API (FastAPI), base de datos y asistente de WhatsApp |
| `panel/` | Gian | Panel web |
| `docs/` | Todos | Ficha técnica, norma resumida, validaciones, decisiones |
| `tests/` | Todos | Pruebas automáticas |

Los formatos que se pasan entre carpetas (padrón, puntaje y registro semanal) están en la sección **Contratos entre roles** del plan del equipo. Si uno cambia, se avisa a todos antes.

## Cómo correrlo

```bash
python -m venv .venv && source .venv/bin/activate   # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.ejemplo .env            # MODO_PRUEBA=1 no llama a WhatsApp
python -m pytest -q             # todas las pruebas deben pasar
python -m scripts.reiniciar_demo   # base limpia con el padrón de ejemplo
uvicorn api.main:app --reload   # documentación en http://localhost:8000/docs
```

Si en el `.env` defines `API_CLAVE`, todas las rutas del panel piden el encabezado `X-API-Key` (agrega `-H "X-API-Key: tu-clave"` a cada `curl`). El webhook y `/salud` no la piden.

Prueba rápida con el padrón de ejemplo:

```bash
curl -F "archivo=@datos/padron_ejemplo.csv" localhost:8000/padron
curl -X POST "localhost:8000/establecimientos/EESS01/lista?capacidad=2"
curl -X POST localhost:8000/establecimientos/EESS01/recordatorios
curl localhost:8000/establecimientos/EESS01/indicadores
```

## Puntos de acceso de la API

| Método y ruta | Para qué |
| --- | --- |
| `POST /padron` | Carga el CSV del padrón |
| `POST /establecimientos/{id}/lista?capacidad=N` | Genera la lista de la semana: los N primeros van a visita, el resto a WhatsApp |
| `GET /establecimientos/{id}/lista.csv?capacidad=N` | La misma lista en CSV para imprimir (plan B) |
| `POST /establecimientos/{id}/recordatorios` | Envía el recordatorio semanal (no duplica; informa enviados, fallidos y bajas) |
| `GET /ninos/{id}/historial` | Acciones y respuestas por semana |
| `GET /establecimientos/{id}/indicadores` | Enviados, respondidos, "sí le di" y meta-alerta |
| `GET` y `POST /webhook` | Verificación y respuestas de WhatsApp |

**Reglas de prioridad:** primero quien la semana pasada respondió "No le di" o "Tuve un problema"; luego quien no respondió en `DIAS_SIN_RESPUESTA` días; luego el resto por puntaje.

**Mensajes de texto libre:** si el cuidador escribe BAJA deja de recibir mensajes (ALTA para volver). Cualquier otro texto recibe una respuesta de ayuda. Todo lo que llega se guarda en `mensajes_entrantes`.

**Robustez:** el webhook no procesa dos veces el mismo mensaje y siempre responde 200; un envío fallido no detiene a los demás; el padrón se valida completo antes de guardarse. Ver `docs/riesgos_demo.md`.

**Meta-alerta:** si en una semana un establecimiento envía o recibe menos del 30% de su promedio reciente, el sistema lo avisa (para detectar que algo dejó de funcionar).

## Atención de posibles señales de peligro

En Planificación, **Atender** abre el detalle del niño. **Registrar atención** exige elegir
**Llamada** o **Visita presencial**. El servidor registra la hora local de Lima y conserva
la señal original, la versión atendida y el medio. Una atención indica que el personal atendió
el aviso; no confirma recuperación. Una señal nueva vuelve a quedar pendiente, también dentro
de la misma semana, y no borra atenciones anteriores.

- `POST /ninos/{id}/alarmas/{registro_id}/atencion`, protegido con `X-API-Key` cuando está configurada.
  Cuerpo: `{"medio":"llamada","version_alarma":1}`. Medios: `llamada` o `visita_presencial`.
- `200`: atención guardada; repetir la misma versión y medio devuelve el mismo registro.
- `404`: no existe ese registro para el niño; `409`: versión desactualizada o ya atendida por otro medio;
  `422`: faltan datos o el medio/versión no son válidos. No se cambia una atención anterior.
- Lista e historial incluyen las alarmas pendientes, sus identificadores/versiones y las atenciones.
  `alarma=true` se conserva como dato histórico.
- Indicadores incorpora `alarmas_pendientes` en la raíz: niños con al menos una alarma sin atender
  hasta la semana consultada, incluidas semanas anteriores. Cada semana de `serie` añade
  `alarmas_pendientes` y `alarmas_atendidas` (estado de la última versión de cada registro semanal).
  El campo previo `alarmas` mantiene su significado histórico. Inicio muestra el total pendiente.
- `GET /establecimientos/{id}/lista` consulta el estado sin escribir ni reasignar canales. El panel lo usa
  después de registrar atención; **Generar planificación** sigue siendo la acción explícita de reasignación.

Al reiniciar la API se crea `atenciones_alarma` y se agrega `alarma_version` sin borrar datos;
las alarmas anteriores arrancan en versión 0 y pendientes. No hace falta reiniciar la demo.
El historial de la ficha muestra todas las atenciones, aunque haya otra alarma pendiente.

## WhatsApp en modo de pruebas

1. Crear una app en Meta for Developers y agregar el producto WhatsApp. Meta da un número de prueba y permite registrar unos pocos números destinatarios: usar solo números del equipo.
2. Copiar el token y el `phone_number_id` al `.env` y poner `MODO_PRUEBA=0`.
3. Crear la plantilla `recordatorio_hierro` (categoría utilidad, español): cuerpo con la variable `{{1}}` para el alias y tres botones de respuesta rápida en este orden: **Sí le di**, **No le di**, **Tuve un problema**. Debe estar aprobada para poder enviarla.
4. El webhook necesita una URL pública con HTTPS (por ejemplo, un túnel temporal) apuntando a `/webhook`, con el mismo `WA_VERIFY_TOKEN` del `.env`.

Por qué una plantilla: WhatsApp solo permite iniciar una conversación con plantillas aprobadas. La lista de razones sí puede ser un mensaje libre porque se envía justo después de que la persona respondió.

## Reglas del repositorio

- Nada de datos reales de personas: padrón simulado y números de prueba del equipo.
- Sin DNI ni fecha de nacimiento; solo edad en meses.
- El `.env` nunca se sube. Los microdatos de ENDES tampoco.
- Cada uno trabaja en su rama; Arny revisa antes de unir a `main`.
