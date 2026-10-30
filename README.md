# YAWAR

Hackathon Interdisciplinaria FACI 2026 (UPCH) · Reto 1: Salud digital e IA para el primer nivel de atención.

**Problema.** En el Perú el hierro llega a las casas, pero menos de la mitad de los niños de 6 a 35 meses que lo reciben lo tomó en la última semana, y el establecimiento se entera recién en el siguiente control CRED, que puede llegar a los tres o seis meses.

**Solución.** Cada semana, un asistente de WhatsApp pregunta al cuidador si el niño tomó el hierro y, si no, por qué. Las respuestas llegan a un panel donde el personal de CRED ve a quién buscar primero, según cuántas visitas puede hacer.

La herramienta prioriza el seguimiento. No promete reducir la anemia: ese efecto se mediría en un piloto con grupo de comparación.

## Piezas

| Carpeta | Responsable | Contenido |
|---|---|---|
| `datos/` | Magno | Instrucciones de descarga de ENDES (los microdatos no se suben) y padrón de ejemplo |
| `analisis/` | Magno | Unión, limpieza, cifras ponderadas, gráficos y diccionario de datos |
| `modelo/` | Arny y Jose | Modelo de riesgo en producción (M2) y comparación y validación de modelos |
| `clasificador/` | Arny | Decisor local que lee el texto libre de los cuidadores |
| `api/`, `bot/` | Arny | API (FastAPI), base de datos (SQLite) y asistente de WhatsApp |
| `panel/` | Gian | Panel web (React + TypeScript) |
| `docs/` | Todos | Documentación del modelo, norma resumida, validaciones y decisiones |
| `tests/` | Todos | Pruebas automáticas |

## Cómo se ordena la lista de la semana

El personal indica cuántas visitas puede hacer (N). Los N primeros van a visita y el resto sigue por WhatsApp. El orden es:

1. **Posible señal de peligro**: el cuidador describió algo grave (esta semana o la anterior).
2. **Mensaje para leer**: el decisor no está seguro o llegó un audio; lo debe leer una persona.
3. **Reportó un problema**: respondió "No le di" o "Tuve un problema" esta semana o la anterior.
4. **Sin respuesta** en `DIAS_SIN_RESPUESTA` días (7 por defecto). El silencio también es una señal.
5. **El resto**, por riesgo estimado.

Dentro de cada grupo van primero los niños en tratamiento de anemia y luego los de mayor riesgo.

## Modelo de riesgo (`modelo/`)

En producción está el **M2**: una regresión logística con la edad (splines), los controles CRED desde el nacimiento, el atraso en controles para la edad y la presentación del hierro. Se eligió con un protocolo escrito antes de entrenar (`modelo/PROTOCOLO.md`) y se compara siempre contra ordenar solo por edad. Los resultados están en `modelo/RESULTADOS.md`.

Es **provisional**: en la prueba prevista no superó la regla fijada; sí lo hizo en una prueba temporal (entrenado con 2024, evaluado con 2025) agregada después, y el cambio está declarado en el registro del protocolo. El piloto lo recalibrará con datos del establecimiento.

La comparación de modelos de `docs/resultados_experimentacion_modelo.md` incluye un M3 que mejora al M2, pero usa dos variables que el establecimiento no registra con el mismo significado que ENDES. Queda como candidato para el modo silencioso del piloto; la decisión está al final de ese documento.

## Decisor de texto libre (`clasificador/`)

Cuando el cuidador elige "Otro motivo" o escribe sin que se le pregunte, un modelo de lenguaje abierto que corre en local (Qwen 2.5 7B con Ollama) clasifica el mensaje en una de ocho razones y detecta señales de peligro. No redacta respuestas: lee la probabilidad de cada opción.

- Si detecta peligro, el asistente envía un texto fijo (acudir al establecimiento o llamar al 106), el niño sube al primer lugar y se avisa al personal.
- Si duda o el motivo es "otro", el caso queda como "mensaje para leer".
- Los audios no se procesan: se pide escribir y el caso pasa a una persona.
- Si Ollama no responde, todo se deriva a una persona y el panel muestra una meta-alerta.

La regla de evaluación se fijó antes de la prueba (`clasificador/PROTOCOLO.md`): cero alarmas perdidas y al menos 80 % de razones correctas. `python -m clasificador.evaluar_prueba` corre la prueba una sola vez.

## Cómo correrlo

```bash
python -m venv .venv && source .venv/bin/activate   # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.ejemplo .env            # MODO_PRUEBA=1 no llama a WhatsApp
python -m pytest -q             # todas las pruebas deben pasar
python -m scripts.reiniciar_demo   # base limpia con el padrón de ejemplo
uvicorn api.main:app --reload   # documentación en http://localhost:8000/docs
```

Decisor local (opcional; sin él, todo el texto libre se deriva a una persona):

```bash
ollama pull qwen2.5:7b
ollama serve
```

Panel:

```bash
cd panel
npm install
npm test
npm run dev
```

Si en el `.env` defines `API_CLAVE`, las rutas del panel piden el encabezado `X-API-Key`. El webhook y `/salud` no la piden.

## Padrón

CSV con una fila por niño. Obligatorias: `id_nino`, `establecimiento_id`, `alias_cuidador`, `telefono`, `edad_meses` (6 a 35), `controles_cred` (desde el nacimiento) y `fecha_entrega_hierro`. Opcionales: `presentacion_hierro`, `en_tratamiento_anemia`, `nombre_nino` y la geografía. Todo sale de la libreta CRED.

## Puntos de acceso de la API

| Método y ruta | Para qué |
|---|---|
| `POST /padron` | Carga el CSV del padrón (se valida completo antes de guardarse) |
| `POST /establecimientos/{id}/lista?capacidad=N` | Genera la lista de la semana |
| `GET /establecimientos/{id}/lista.csv?capacidad=N` | La misma lista en CSV para imprimir (plan B) |
| `POST /establecimientos/{id}/recordatorios` | Envía la pregunta semanal (no duplica) |
| `GET /ninos/{id}/historial` | Respuestas por semana, con el texto de la familia, la razón del decisor y si hubo alarma |
| `GET /establecimientos/{id}/indicadores` | Enviados, respondidos, "sí le di", alarmas y meta-alerta |
| `GET` y `POST /webhook` | Verificación y respuestas de WhatsApp |

## WhatsApp

Plantillas (categoría utilidad, español), aprobadas en Meta antes de usarse:

- `recordatorio_hierro`: pregunta semanal con tres botones (Sí le di, No le di, Tuve un problema).
- `alerta_personal_cred`: aviso al personal cuando hay una posible señal de peligro. Los números van en `CRED_TELEFONOS_ALERTA`, separados por comas. El aviso no copia el texto de la familia y sale una vez por niño por semana.

El webhook necesita una URL pública con HTTPS apuntando a `/webhook`, con el mismo `WA_VERIFY_TOKEN` del `.env`. Si el cuidador escribe BAJA deja de recibir mensajes (ALTA para volver).

**Meta-alerta**: si en una semana un establecimiento envía o recibe menos del 30 % de su promedio reciente, o si el decisor no responde, el sistema lo avisa.

## Reglas del repositorio

- Nada de datos reales de personas: padrón simulado y números de prueba del equipo.
- Sin DNI ni fecha de nacimiento; solo edad en meses.
- El `.env` nunca se sube. Los microdatos de ENDES tampoco (ni en `datos/`, ni en `datos_procesados/`, ni en `modelo/datos/`), ni salidas de notebooks que impriman filas.
- Se trabaja en `modelo-ia` o en una rama que salga de ella; los PR van a `modelo-ia`. Arny revisa antes de unir a `main`.
