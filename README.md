# YAWAR · HierroEnCasa

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
python -m pytest -q             # debe decir "3 passed"
uvicorn api.main:app --reload   # documentación en http://localhost:8000/docs
```

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
| `POST /establecimientos/{id}/recordatorios` | Envía el recordatorio semanal (no duplica) |
| `GET /ninos/{id}/historial` | Acciones y respuestas por semana |
| `GET /establecimientos/{id}/indicadores` | Enviados, respondidos, "sí le di" y meta-alerta |
| `GET` y `POST /webhook` | Verificación y respuestas de WhatsApp |

**Reglas de prioridad:** primero quien la semana pasada respondió "No le di" o "Tuve un problema"; luego quien no respondió en `DIAS_SIN_RESPUESTA` días; luego el resto por puntaje.

**Meta-alerta:** si en una semana un establecimiento envía o recibe menos del 30% de su promedio reciente, el sistema lo avisa (para detectar que algo dejó de funcionar).

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
