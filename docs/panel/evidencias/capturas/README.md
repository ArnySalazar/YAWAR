# Capturas del panel

Las 7 pantallas del panel funcionando contra la **API real** de YAWAR, el 2026-10-21. Hay una versión de escritorio (1440 px) y una de celular (390 px) de cada pantalla.

**De dónde salen los datos de las capturas:**
- **Padrón:** `datos/padron_ejemplo.csv`, el padrón **simulado** de 10 niños del repositorio. No hay datos reales de ninguna persona.
- **Historial:** 4 semanas (de la 40 a la 43 de 2026), generadas en una **base temporal** con las mismas funciones de la API: `cargar_padron`, `generar_lista`, `enviar_recordatorios` y `procesar_entrante`, con fechas pasadas, como hacen las pruebas de la API. Incluye respuestas "Sí le di", "No le di" y "Tuve un problema", con sus razones, y semanas sin respuesta.
- **Modo:** la API corría en `MODO_PRUEBA=1`: no se envió ningún WhatsApp real.
- **Base de trabajo:** no se tocó la base del proyecto (`yawar.db`).

**Cómo se tomaron:** con Microsoft Edge en modo automático (`playwright-core`), y la página completa de cada ruta.

| Pantalla | Escritorio | Celular |
| --- | --- | --- |
| Inicio | [ver](2026-10-21_inicio_escritorio.png) | [ver](2026-10-21_inicio_celular.png) |
| Planificación semanal | [ver](2026-10-21_planificacion_escritorio.png) | [ver](2026-10-21_planificacion_celular.png) |
| Niños en seguimiento | [ver](2026-10-21_ninos_escritorio.png) | [ver](2026-10-21_ninos_celular.png) |
| Ficha del niño (N0001) | [ver](2026-10-21_ficha-nino_escritorio.png) | [ver](2026-10-21_ficha-nino_celular.png) |
| Comunicación | [ver](2026-10-21_comunicacion_escritorio.png) | [ver](2026-10-21_comunicacion_celular.png) |
| Indicadores | [ver](2026-10-21_indicadores_escritorio.png) | [ver](2026-10-21_indicadores_celular.png) |
| Administración | [ver](2026-10-21_administracion_escritorio.png) | [ver](2026-10-21_administracion_celular.png) |
