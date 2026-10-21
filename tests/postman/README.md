# Pruebas de la API con Postman

| Archivo | Qué es |
| --- | --- |
| `YAWAR.postman_collection.json` | Las 9 rutas de la API en 22 peticiones y 7 carpetas. Cada una tiene su explicación y pruebas automáticas |
| `YAWAR-local.postman_environment.json` | Variables: dirección de la API, clave, establecimiento y niños de prueba |
| `padron_con_error.csv` | Padrón simulado con 3 filas malas, para probar la validación |

## Preparar (una sola vez)

1. Usar **Postman de escritorio**. La versión web no llega a `localhost` sin el Postman Agent.
2. **Import** → arrastrar los dos archivos `.json`.
3. Arriba a la derecha, elegir el entorno **"YAWAR · local (modo prueba)"**.
4. **Settings → General → Working directory:** elegir la carpeta raíz del proyecto (`YAWAR`). Así Postman encuentra los CSV. Si no, en cada petición de padrón se elige el archivo en **Body → form-data → archivo**.
5. Copiar estos valores del `.env` de la raíz a la columna **Current value** del entorno. Esa columna se queda en tu computadora y no se comparte:

| Variable del entorno | Valor del `.env` |
| --- | --- |
| `api_key` | `API_CLAVE` (vacía si la API no tiene clave) |
| `wa_verify_token` | `WA_VERIFY_TOKEN` |
| `wa_app_secret` | `WA_APP_SECRET` (vacía si no está definida) |

## Usar

1. Levantar la API con `MODO_PRUEBA=1`: `npm run dev` dentro de `panel/`, o `uvicorn api.main:app` en la raíz.
2. Ejecutar **0 · Salud**, siempre primero: calcula la semana actual y confirma el modo prueba.
3. Para el flujo completo de una semana: clic derecho en la colección → **Run collection** → **Run**. Las carpetas van en orden:

| Carpeta | Qué hace |
| --- | --- |
| 0 · Salud | API encendida, semana actual y modo prueba |
| 1 · Padrón | Carga el padrón de ejemplo y prueba uno con errores (no carga nada) |
| 2 · Lista de la semana | Genera la lista con `capacidad` visitas y la descarga en CSV |
| 3 · Recordatorios | Envía el recordatorio semanal |
| 4 · WhatsApp simulado | Hace de Meta: verifica el webhook y simula respuestas ("No le di" + razón, "Sí le di", BAJA, ALTA, aviso de leído) |
| 5 · Comprobar resultados | Historial e indicadores después de las respuestas |
| 6 · Robustez y seguridad | Contenido raro, teléfono ajeno, sin clave, niño inexistente |

4. Al terminar, en la raíz: `python -m scripts.reiniciar_demo`. La colección carga el padrón de ejemplo, envía recordatorios de prueba y registra respuestas; este comando deja la base limpia.

Las pruebas de la carpeta 5 esperan lo que hizo la carpeta 4: si se corren solas, fallan.

## Variables del entorno

| Variable | Para qué | Por defecto |
| --- | --- | --- |
| `base_url` | Dirección de la API | `http://localhost:8000` |
| `api_key` | Se envía como `X-API-Key` en las rutas del panel | vacía |
| `est`, `capacidad` | Establecimiento y número de visitas de la lista | `EESS01`, `2` |
| `id_nino` / `telefono` | Niño que responde "No le di" | `N0001` / `51000000001` |
| `id_nino_2` / `telefono_2` | Niño que responde "Sí le di" | `N0002` / `51000000002` |
| `id_nino_3` / `telefono_3` | Cuidador que escribe BAJA y ALTA | `N0003` / `51000000003` |
| `semana`, `modo_prueba` | Las llena **Salud** sola | — |
| `permitir_envios_reales` | Ver "Protección" | `false` |
| `wa_verify_token`, `wa_app_secret` | Verificación y firma del webhook | del `.env` |
| `wa_message_id` | Mensaje para el aviso de "leído" (en modo prueba: `prueba-1`, `prueba-2`…) | `prueba-1` |

Los teléfonos van solo con dígitos y sin "+", como los manda Meta.

## Protección contra envíos reales

Las peticiones que mandan WhatsApp (recordatorios y webhook) **se omiten solas** si **Salud** no confirmó `MODO_PRUEBA=1`. Para probar con WhatsApp de verdad (números del equipo y `MODO_PRUEBA=0`), hay que poner a propósito `permitir_envios_reales = true`.

## Webhook simulado

Los mensajes de la carpeta 4 tienen el mismo formato que manda WhatsApp Cloud API. Cada uno lleva un id nuevo, porque la API ignora los repetidos. Si `wa_app_secret` tiene valor, Postman calcula la firma `X-Hub-Signature-256` igual que Meta.

## Desde la terminal (Newman)

```bash
npx newman run tests/postman/YAWAR.postman_collection.json -e tests/postman/YAWAR-local.postman_environment.json --working-dir .
```

Verificada el 2026-10-18 con Newman 6.2.3: [informe](../../docs/panel/evidencias/pruebas/2026-10-18_2042_postman.md).
