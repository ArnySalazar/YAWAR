# Guía de notebooks y resultados del modelo YAWAR

Esta guía explica para qué sirve cada notebook, qué archivos necesita, qué produce y en qué orden debe ejecutarse.

## 1. Orden recomendado

```text
procesamiento_2024.ipynb ─┐
                          ├─> unificacion_datos.ipynb
procesamiento_2025.ipynb ─┘          │
                                     v
                         limpieza_y_calidad.ipynb
                                     │
                                     v
                 entrenamiento_modelos_ampliados.ipynb
                                     │
                                     v
                  comparacion_algoritmos_m3_m4.ipynb
                                     │
                                     v
               ajuste_hiperparametros_finalistas.ipynb
```

Los notebooks pueden ejecutarse desde la raíz del proyecto o desde `modelo/`. Las rutas se resuelven automáticamente.

## 2. Procesamiento por año

### `modelo/procesamiento_2024.ipynb`

Propósito:

- Cargar `tabla_nino_2024.csv`.
- Leer los CSV crudos de los módulos 1629, 1630, 1631 y 1634.
- Validar coincidencias por `HHID`, `CASEID` y `CASEID + IDX95`.
- Crear variables de hogar, vivienda, madre/cuidadora y CRED.
- Unirlas a la tabla principal del niño.

Entradas principales:

- `datos_procesados/tabla_nino_2024.csv`.
- CSV de 2024 dentro de `modelo/datos/2024/`.

Salida:

- `datos_procesados/tabla_modelo_2024.csv`.

La tabla final tiene 19,751 filas y 77 columnas.

### `modelo/procesamiento_2025.ipynb`

Realiza el mismo procesamiento para ENDES 2025.

Entradas principales:

- `datos_procesados/tabla_nino_2025.csv`.
- CSV de 2025 dentro de `modelo/datos/2025/`.

Salida:

- `datos_procesados/tabla_modelo_2025.csv`.

La tabla final tiene 18,841 filas y 77 columnas.

### Cuándo volver a ejecutarlos

- Cuando cambien los CSV crudos.
- Cuando se incorporen nuevas variables desde los módulos ENDES.
- Cuando se corrija una regla de unión o creación de variables.

No deben ejecutarse para cambiar hiperparámetros del modelo.

## 3. Auditoría y unión de años

### `modelo/unificacion_datos.ipynb`

Propósito:

- Comprobar que 2024 y 2025 tengan las mismas columnas.
- Comparar tipos de datos.
- Validar llaves y duplicados.
- Calcular faltantes, cardinalidad, ejemplos y códigos especiales.
- Construir un diccionario técnico inicial en memoria.
- Unir ambos años de manera bruta para inspección.

Entradas:

- `datos_procesados/tabla_modelo_2024.csv`.
- `datos_procesados/tabla_modelo_2025.csv`.

Resultado principal:

- Tablas de auditoría mostradas dentro del notebook.
- Base para el documento [`docs/diccionario_tabla_modelo.md`](diccionario_tabla_modelo.md).

Este notebook no es el encargado de entrenar modelos ni de decidir el target.

### `modelo/limpieza_y_calidad.ipynb`

Propósito:

- Normalizar espacios y literales de faltante.
- Convertir el marcador `99.9` de hemoglobina a faltante real.
- Convertir fechas CRED y MMN.
- Revisar rangos, valores binarios, fechas y relaciones lógicas.
- Detectar niveles categóricos raros.
- Preservar todas las columnas para una selección posterior.

Entradas:

- `datos_procesados/tabla_modelo_2024.csv`.
- `datos_procesados/tabla_modelo_2025.csv`.

Salidas:

- `datos_procesados/tabla_modelo_2024_2025_limpia.csv`.
- `datos_procesados/reporte_calidad_2024_2025.csv`.
- `datos_procesados/registro_limpieza_2024_2025.csv`.
- `datos_procesados/niveles_raros_2024_2025.csv`.

Hallazgos principales:

- 3,406 valores `99.9` por cada variable de hemoglobina se convirtieron a faltantes.
- `madre_afiliada_sis` quedó 100 % vacía.
- Se detectaron 110 niños con más controles fechados que controles acumulados.
- Se detectaron 373 filas donde la suma de grupos de edad supera los residentes habituales.
- Se detectaron 5 filas donde menores de cinco años superan residentes habituales.
- Se registraron 46 niveles categóricos raros para revisión.

### Cuándo volver a ejecutarlos

- Después de volver a generar las tablas integradas de 2024 o 2025.
- Después de modificar reglas de limpieza o calidad.

## 4. Experimentos de modelos

### `modelo/entrenamiento_modelos_ampliados.ipynb`

Propósito:

- Fijar `no_tomo_7d` como target.
- Comparar bloques incrementales de variables.
- Determinar cuánto aportan CRED, anemia, madre y hogar sobre la edad.
- Comparar regresiones logísticas con un bosque aleatorio.
- Evaluar 2024 mediante folds por conglomerado y 2025 temporalmente.

Entrada:

- `datos_procesados/tabla_modelo_2024_2025_limpia.csv`.

Resultados:

- Directorio [`modelo/resultados_entrenamiento/`](../modelo/resultados_entrenamiento/).

Archivos principales:

- `validacion_cruzada_2024_resumen.csv`: promedio y dispersión por modelo.
- `evaluacion_temporal_2025.csv`: evaluación entrenando en 2024 y probando en 2025.
- `evaluacion_2025_conglomerados_no_vistos.csv`: sensibilidad geográfica.
- `bootstrap_candidato_vs_edad.csv`: incertidumbre frente a usar solo edad.
- `equidad_candidato_2025.csv`: auditoría por subgrupos.
- `variables_seleccionadas.csv`: variables incluidas y justificación.
- `importancias_candidato.csv`: coeficientes o importancias transformadas.

Este notebook mostró que M3 y M4 mejoraban al modelo de edad, mientras el bosque no transportaba bien a 2025.

### `modelo/comparacion_algoritmos_m3_m4.ipynb`

Propósito:

- Comparar familias de algoritmos antes de elegir regresión logística.
- Usar las mismas variables y folds para una comparación justa.

Algoritmos:

- Regresión logística.
- Random Forest.
- Extra Trees.
- Histogram Gradient Boosting.

Entrada:

- `datos_procesados/tabla_modelo_2024_2025_limpia.csv`.

Resultados:

- Directorio [`modelo/resultados_comparacion_algoritmos/`](../modelo/resultados_comparacion_algoritmos/).

Archivos principales:

- `cv_2024_resumen.csv`: comparación agrupada dentro de 2024.
- `temporal_2025.csv`: transporte de todas las combinaciones a 2025.
- `conglomerados_no_vistos_2025.csv`: sensibilidad a conglomerados nuevos.
- `bootstrap_2025.csv`: intervalos de confianza de los finalistas.
- `top3_cv_2024.csv`: top 3 definido sin mirar 2025.
- `especificaciones.csv`: bloque y algoritmo de cada combinación.

Este notebook mostró que Gradient Boosting ganaba dentro de 2024, pero las regresiones logísticas transportaban mejor a 2025.

### `modelo/ajuste_hiperparametros_finalistas.ipynb`

Propósito:

- Ajustar M3 logística, M4 logística y M3 Gradient Boosting.
- Probar regularización, flexibilidad de edad y parámetros de boosting.
- Comparar directamente los finalistas contra el M2 del compañero.

Búsqueda realizada:

- 42 configuraciones para cada regresión logística.
- 16 configuraciones para Gradient Boosting.
- Cinco folds agrupados.
- 500 ajustes en total.

Entrada:

- `datos_procesados/tabla_modelo_2024_2025_limpia.csv`.

Resultados:

- Directorio [`modelo/resultados_ajuste_hiperparametros/`](../modelo/resultados_ajuste_hiperparametros/).

Archivos principales:

- `busqueda_folds_2024.csv`: una fila por configuración y fold.
- `busqueda_resumen_2024.csv`: promedio y dispersión por configuración.
- `mejores_configuraciones_2024.csv`: configuración ganadora de cada candidato.
- `mejores_parametros.json`: hiperparámetros seleccionados.
- `evaluacion_temporal_2025.csv`: evaluación temporal de los modelos ajustados.
- `conglomerados_no_vistos_2025.csv`: sensibilidad a conglomerados nuevos.
- `comparaciones_bootstrap_2025.csv`: comparación directa contra M2 y entre finalistas.
- `equidad_ganador_cv_2025.csv`: equidad del ganador de CV 2024.

Conclusión principal:

- M3 logístico ajustado es el candidato provisional recomendado.
- PPV@20 temporal: 76.0 %.
- Mejora frente al M2 corregido: +1.71 puntos, IC 95 % `[+0.41; +2.88]`.

## 5. Documentación complementaria

- [`docs/diccionario_tabla_modelo.md`](diccionario_tabla_modelo.md): significado, fuente y tipo de las 77 columnas.
- [`docs/resultados_experimentacion_modelo.md`](resultados_experimentacion_modelo.md): resultados completos y comparación de experimentos.
- `docs/registro_decisiones_analisis.md`: decisiones y problemas semánticos de la construcción del target y variables ENDES.
- `datos/README.md`: procedencia y manejo de microdatos.

## 6. Qué notebook usar según la tarea

| Necesidad | Notebook |
|---|---|
| Volver a integrar módulos ENDES 2024 | `procesamiento_2024.ipynb` |
| Volver a integrar módulos ENDES 2025 | `procesamiento_2025.ipynb` |
| Revisar columnas, tipos, llaves y faltantes | `unificacion_datos.ipynb` |
| Limpiar y ejecutar controles de calidad | `limpieza_y_calidad.ipynb` |
| Revisar qué bloques de variables aportan | `entrenamiento_modelos_ampliados.ipynb` |
| Comparar familias de algoritmos | `comparacion_algoritmos_m3_m4.ipynb` |
| Ajustar configuraciones de los finalistas | `ajuste_hiperparametros_finalistas.ipynb` |

## 7. Estado actual y siguiente paso

Estado:

- Target definido: `no_tomo_7d`.
- Candidato provisional: M3 con regresión logística Elastic Net.
- M3 ya fue reajustado con los 14,516 registros de las cohortes 2024 y 2025.
- El artefacto provisional está en `modelo/m3_produccion.joblib` y sus metadatos en `modelo/m3_produccion_metadata.json`.
- `modelo/puntuar.py` ya carga el M3 real y conserva el contrato de salida para la API.
- La prueba de serialización fue exacta y el contrato se verificó con 100 registros reales.

Antes de declararlo modelo definitivo:

1. Auditar equidad específicamente para el M3 logístico ajustado.
2. Definir y aplicar recalibración.
3. Validar con datos nuevos del piloto.
4. Versionar una nueva variante del artefacto si la recalibración o el piloto cambian el modelo.

Los CSV con microdatos y tablas procesadas no deberían subirse al repositorio si las reglas del proyecto los excluyen.
