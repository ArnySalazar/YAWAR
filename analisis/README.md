# Análisis de datos (Magno)

Aquí se transforman los microdatos de ENDES en tablas limpias y cifras ponderadas que se puedan defender ante el jurado. **Cada cuaderno hace una sola cosa y explica sus decisiones en palabras simples**, para que cualquier compañero pueda seguir el trabajo sin preguntarme.

Los cuadernos 01 a 05 ya traen sus gráficos incrustados (se ven al abrirlos, sin ejecutar nada).

Entregables (según el plan del equipo): tabla limpia para el modelo (2024 y 2025), cifras ponderadas con intervalos de confianza (factor de expansión, estrato y conglomerado), "Table 1" 2024 vs 2025, gráficos del pitch y diccionario de datos en `docs/`.

## Cómo reproducirlo
1. Descargar los zips del INEI y dejarlos en `endes_raw/<año>/` (ver `datos/README.md`).
2. Desde la raíz del repositorio: `python datos/preparar_csv.py`
3. Abrir los cuadernos **en orden** con `analisis/` como directorio de trabajo.

## Orden de los cuadernos
| # | Cuaderno | Qué responde | Estado |
|---|---|---|---|
| 01 | `01_inventario_insumos` | ¿Qué datos hay? ¿Se pueden unir? ¿De dónde sale la edad? | Hecho |
| 02 | `02_comparacion_2024_2025` | ¿Se parecen los dos años en edad, área, región, altitud, CRED y tasas básicas? (sin ponderar) | Hecho |
| 03 | `03_union_y_limpieza` | Tabla limpia por año (una fila por niño), con las pérdidas de cada unión y cada exclusión documentadas | Hecho |
| 04 | `04_cifras_ponderadas` | Cifras ponderadas con intervalos de confianza (recibió, tomó, anemia, razones; por edad, área, región y departamento) y cambio 2024→2025 | Hecho |
| 05 | `05_table1_y_graficos` | "Table 1" 2024 vs 2025, cuatro gráficos del pitch y los archivos de entrega para Camilla y Gian | Hecho |

## Qué genera el cuaderno 03
- `datos_procesados/tabla_nino_2024.csv` y `tabla_nino_2025.csv`: **no se suben al repositorio** (derivan de microdatos de ENDES). Cada compañero los genera ejecutando el cuaderno 03.
- `docs/diccionario_tabla_nino.md`: diccionario de cada columna, generado por el mismo cuaderno.

## Qué genera el cuaderno 04
`analisis/resultados/` (tablas de porcentajes, **sí se pueden subir al repositorio**):
- `cifras_ponderadas.csv`: hierro y anemia, con intervalo de confianza, efecto de diseño, tamaño de muestra y marca de fiabilidad.
- `razones_no_consumo.csv` y `razones_no_consumo_sin_G.csv`: razones por las que no se consumió todo el hierro recibido.
- `diferencias_2024_2025.csv`: cambio en puntos porcentuales con su intervalo.

## Qué genera el cuaderno 05
- `analisis/resultados/tabla1_2024_2025.csv` y `docs/tabla1_2024_2025.md`: Table 1 (características e indicadores, 2024 y 2025, con cambio e intervalos).
- `analisis/graficos/g1…g4*.png` y `datos_graficos_pitch.csv`: los cuatro gráficos del pitch y los números que dibujan.
- `analisis/resultados/para_camilla_departamentos.csv`: cifras por departamento y región natural (mapas).
- `analisis/resultados/para_gian_proporciones_departamento.csv`: proporciones de edad, área, región natural y altitud por departamento (padrón simulado).

Todos contienen solo porcentajes: **sí se pueden subir al repositorio**.

## Archivos de apoyo
- `rutas.py`: funciones para leer los datos siempre de la misma forma (como texto, sin espacios sobrantes).
- `encuestas.py`: el estimador de proporciones con estratos y conglomerados (fuente única de las cifras ponderadas).
- `graficos.py`: estilo y colores comunes de todos los gráficos.
- Las decisiones y los pendientes se anotan en `docs/registro_decisiones_analisis.md`.

## Reglas de este análisis
- Toda cifra dice si está **ponderada o no**, de qué año y de qué edades.
- Los microdatos no se suben; las contraseñas tampoco.
- Un cuaderno no cambia datos de otro: cada uno lee y escribe en su propio paso.
