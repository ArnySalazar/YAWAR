# Resultados consolidados de experimentación del modelo YAWAR

Fecha de consolidación: 29 de octubre de 2026.

## 1. Objetivo y definición del problema

El modelo busca priorizar niños de 6 a 35 meses con mayor probabilidad de no haber consumido hierro durante los últimos siete días.

El target utilizado es:

```text
no_tomo_7d = 1 - tomo_7d
```

- `no_tomo_7d = 1`: no tomó ninguna presentación de hierro durante los últimos siete días.
- `no_tomo_7d = 0`: tomó al menos una presentación.

Este target mide no consumo semanal observado. No representa directamente abandono futuro del tratamiento.

La cohorte incluye niños de 6 a 35 meses que recibieron hierro y tienen una respuesta clara sobre consumo semanal:

| Año | Niños | Prevalencia de `no_tomo_7d` |
|---:|---:|---:|
| 2024 | 7,344 | 59.6 % |
| 2025 | 7,172 | 54.4 % |
| Total | 14,516 | 57.0 % aproximadamente |

## 2. Métricas

La métrica principal es **PPV@20 %**: porcentaje de no consumidores reales dentro del 20 % de niños con mayor puntaje de riesgo.

También se reportan:

- PPV@10 % y PPV@30 %.
- AUC, para medir capacidad de ordenamiento general.
- Brier, para medir error de las probabilidades.
- Intercepto y pendiente de calibración.
- Resultados en conglomerados de 2025 no vistos en 2024.
- Intervalos de confianza mediante bootstrap de conglomerados.
- Auditorías de equidad por área, educación, riqueza y lengua.

Los empates en el límite de PPV se resuelven mediante el valor esperado dentro del grupo empatado. Así, el resultado no depende del orden accidental de las filas.

## 3. Trabajo inicial del compañero

### 3.1 Prueba apartada dentro de ENDES 2025

Prueba de 1,748 niños pertenecientes a 700 conglomerados. Prevalencia de no consumo: 55.0 %.

| Modelo | PPV@10 % | PPV@20 % | PPV@30 % | AUC |
|---|---:|---:|---:|---:|
| Azar | 55.0 % | 55.0 % | 55.0 % | 0.50 |
| Solo edad | 76.0 % | 73.1 % | 66.9 % | 0.64 |
| M2 principal | 81.7 % | 76.3 % | 74.3 % | 0.68 |
| M2 + geografía | 79.4 % | 76.3 % | 74.1 % | 0.68 |
| Boosting | 77.1 % | 76.9 % | 73.5 % | 0.68 |

La diferencia M2 menos edad en PPV@20 fue de `+3.2` puntos porcentuales, con IC 95 % `[-0.6; +7.1]`. El intervalo incluyó cero, por lo que no se cumplió la regla confirmatoria original para PPV@20.

### 3.2 Evaluación temporal 2024 → 2025

| Modelo | PPV@10 % | PPV@20 % | PPV@30 % | AUC | Predicción media |
|---|---:|---:|---:|---:|---:|
| Azar | 54.4 % | 54.4 % | 54.4 % | 0.50 | — |
| Edad | 78.7 % | 71.2 % | 65.5 % | 0.65 | 60.0 % |
| M2 principal | 78.2 % | 74.1 % | 70.9 % | 0.67 | 59.2 % |

La diferencia M2 menos edad fue:

- PPV@20: `+2.9` puntos, IC 95 % `[+0.5; +5.1]`.
- AUC: `+0.023`, IC 95 % `[+0.017; +0.030]`.

El M2 original utilizó edad, controles CRED acumulados, atraso respecto de la mediana por edad y presentaciones de hierro recibidas. Sobreestimó el riesgo de 2025 aproximadamente cinco puntos porcentuales.

## 4. Experimento de bloques ampliados

Notebook: [`modelo/entrenamiento_modelos_ampliados.ipynb`](../modelo/entrenamiento_modelos_ampliados.ipynb).

Se compararon bloques incrementales:

- M1: edad.
- M2: edad, atraso CRED y presentaciones.
- M3: M2 más controles con fecha y lugar del CRED.
- M4: M3 más anemia, madre, cuidador, hogar y área.
- M5: bosque aleatorio con las variables de M4.

### 4.1 Validación cruzada agrupada en 2024

| Modelo | PPV@20 medio | AUC medio |
|---|---:|---:|
| M1 edad | 76.9 % | 0.692 |
| M2 operativo | 78.3 % | 0.708 |
| M3 CRED | 79.8 % | 0.710 |
| M4 ampliado | 79.2 % | 0.709 |
| M5 bosque | **80.5 %** | **0.713** |

### 4.2 Evaluación temporal 2025

| Modelo | PPV@20 | AUC | Brier |
|---|---:|---:|---:|
| M1 edad | 71.2 % | 0.651 | 0.232 |
| M2 operativo | 74.3 % | 0.673 | 0.227 |
| M3 CRED | 75.8 % | 0.680 | 0.225 |
| M4 ampliado | **76.6 %** | **0.684** | 0.224 |
| M5 bosque | 74.1 % | 0.682 | **0.224** |

El bosque ganó dentro de 2024, pero no mantuvo esa ventaja en 2025. M4 obtuvo el mejor PPV@20 temporal antes del ajuste fino.

## 5. Comparación de familias de algoritmos

Notebook: [`modelo/comparacion_algoritmos_m3_m4.ipynb`](../modelo/comparacion_algoritmos_m3_m4.ipynb).

Se probaron regresión logística, Random Forest, Extra Trees y Histogram Gradient Boosting con los bloques M3 y M4. Todos utilizaron los mismos cinco folds por conglomerado en 2024.

### 5.1 Validación cruzada 2024

| Combinación | PPV@20 medio | AUC medio |
|---|---:|---:|
| M3 + Gradient Boosting | **80.2 %** | 0.708 |
| M4 + Gradient Boosting | 80.1 % | 0.705 |
| M3 + logística | 79.8 % | **0.710** |
| M4 + logística | 79.2 % | 0.709 |
| M3 + Random Forest | 79.0 % | 0.705 |
| M4 + Extra Trees | 78.8 % | 0.691 |
| M3 + Extra Trees | 78.8 % | 0.699 |
| M4 + Random Forest | 78.0 % | 0.702 |

### 5.2 Evaluación temporal 2025

| Combinación | PPV@20 | AUC |
|---|---:|---:|
| M4 + logística | **76.6 %** | 0.684 |
| M3 + logística | 75.8 % | 0.680 |
| M3 + Extra Trees | 75.4 % | 0.678 |
| M4 + Gradient Boosting | 74.8 % | **0.686** |
| M4 + Random Forest | 74.2 % | 0.679 |
| M4 + Extra Trees | 74.2 % | 0.670 |
| M3 + Gradient Boosting | 73.9 % | 0.684 |
| M3 + Random Forest | 73.2 % | 0.683 |

Los árboles y boosting no mostraron una mejora estable de PPV@20 al cambiar de año. Las regresiones logísticas transportaron mejor.

## 6. Ajuste de hiperparámetros de los finalistas

Notebook: [`modelo/ajuste_hiperparametros_finalistas.ipynb`](../modelo/ajuste_hiperparametros_finalistas.ipynb).

Se ajustaron:

- M3 con regresión logística.
- M4 con regresión logística.
- M3 con Histogram Gradient Boosting.

Se evaluaron 500 ajustes en total, contando las cinco particiones agrupadas.

### 6.1 Mejores configuraciones según CV 2024

| Candidato | Configuración seleccionada | PPV@20 CV | AUC CV |
|---|---|---:|---:|
| M3 Gradient Boosting | `learning_rate=0.03`, 7 hojas, mínimo 20 por hoja, L2=0 | **81.3 %** | **0.715** |
| M4 logística | Elastic Net, `C=0.1`, `l1_ratio=0.25`, 7 nodos | 80.3 % | 0.710 |
| M3 logística | Elastic Net, `C=0.3`, `l1_ratio=0.5`, 7 nodos | 80.3 % | 0.712 |

### 6.2 Evaluación temporal de las configuraciones ajustadas

| Modelo | PPV@10 | PPV@20 | PPV@30 | AUC | Brier | Predicción media |
|---|---:|---:|---:|---:|---:|---:|
| M3 logística | **83.0 %** | **76.0 %** | 71.4 % | 0.680 | 0.225 | 59.2 % |
| M4 logística | 82.7 % | 76.0 % | **72.2 %** | 0.683 | 0.224 | 59.3 % |
| M2 compañero corregido | 78.5 % | 74.3 % | 70.9 % | 0.674 | 0.227 | 59.2 % |
| M3 Gradient Boosting | 82.8 % | 74.2 % | 71.9 % | **0.687** | **0.223** | 59.2 % |
| M1 edad | 79.0 % | 71.2 % | 65.7 % | 0.651 | 0.232 | 60.0 % |

Gradient Boosting tuvo mejor AUC y Brier, pero fue peor en la métrica primaria PPV@20. M3 y M4 logísticos quedaron prácticamente empatados; M3 requiere menos variables y fue más estable en conglomerados no vistos.

### 6.3 Conglomerados de 2025 no vistos en 2024

| Modelo | PPV@20 | AUC |
|---|---:|---:|
| M3 logística | **76.0 %** | 0.675 |
| M4 logística | 75.3 % | 0.678 |
| M2 compañero corregido | 74.6 % | 0.666 |
| M3 Gradient Boosting | 74.1 % | **0.686** |
| M1 edad | 73.5 % | 0.649 |

Esta sensibilidad contiene 2,914 niños, equivalentes al 40.6 % de la cohorte 2025.

### 6.4 Comparaciones bootstrap en 2025

| Comparación | Diferencia PPV@20 | IC 95 % | Lectura |
|---|---:|---:|---|
| M3 logística − M2 corregido | **+1.71 pp** | `[+0.41; +2.88]` | Mejora consistente |
| M4 logística − M2 corregido | +1.64 pp | `[-0.0003; +3.21]` aproximadamente | Resultado fronterizo |
| M3 boosting − M2 corregido | −0.13 pp | `[-1.86; +1.83]` | Sin mejora |
| M4 logística − M3 logística | −0.07 pp | `[-1.32; +1.32]` | Prácticamente equivalentes |
| M3 boosting − M3 logística | **−1.84 pp** | `[-3.38; −0.09]` | Boosting es peor en PPV@20 |

## 7. Comparación final con el modelo del compañero

La comparación temporal más justa es:

| Métrica | M2 original reportado | M3 logístico ajustado | Cambio |
|---|---:|---:|---:|
| PPV@10 | 78.2 % | **83.0 %** | +4.8 pp |
| PPV@20 | 74.1 % | **76.0 %** | +1.9 pp |
| PPV@30 | 70.9 % | **71.4 %** | +0.5 pp |
| AUC | 0.67 | **0.680** | +0.010 |

En el 20 % priorizado de 7,172 niños, M3 identifica aproximadamente 25 a 28 no consumidores adicionales frente a M2.

El resultado interno de 76.3 % del compañero no es directamente comparable porque fue obtenido entrenando y evaluando dentro de 2025. El 76.0 % del M3 se obtiene entrenando en 2024 y evaluando en 2025, una prueba temporal más exigente.

## 8. Recomendación provisional

El candidato recomendado es **M3 con regresión logística Elastic Net**:

```text
n_knots = 7
penalty = elasticnet
C = 0.3
l1_ratio = 0.5
```

Predictores:

```text
edad_meses
atraso_cred
recibio_jarabe
recibio_gotas
recibio_polvo
n_cred_con_fecha
lugar_cred_codigo
```

M4 no mejora PPV@20 frente a M3 y requiere ocho variables adicionales. Gradient Boosting gana en AUC, pero pierde en la métrica primaria y transporta peor entre años.

## 9. Limitaciones y trabajo pendiente

- Las probabilidades continúan sobreestimadas: M3 predice 59.2 % en promedio y en 2025 se observa 54.4 %.
- M3 necesita recalibración antes de mostrar probabilidades al usuario.
- 2024 y 2025 comparten conglomerados. Por eso se añadió la sensibilidad sobre conglomerados no vistos.
- ENDES 2025 ya fue consultado en varias etapas; no es una prueba confirmatoria nueva.
- La auditoría de equidad del último notebook corresponde al ganador de CV 2024, M3 Gradient Boosting. Antes de declarar definitivo el modelo debe ejecutarse la auditoría específica del M3 logístico recomendado.
- La confirmación final debe realizarse con datos nuevos del piloto.
- El M3 seleccionado ya fue reajustado con 2024 + 2025 y conectado a `modelo/puntuar.py`; el artefacto continúa marcado como provisional y no calibrado.

## 10. Ubicación de los resultados

- Bloques ampliados: [`modelo/resultados_entrenamiento/`](../modelo/resultados_entrenamiento/).
- Comparación de algoritmos: [`modelo/resultados_comparacion_algoritmos/`](../modelo/resultados_comparacion_algoritmos/).
- Ajuste de hiperparámetros: [`modelo/resultados_ajuste_hiperparametros/`](../modelo/resultados_ajuste_hiperparametros/).
- Diccionario de datos: [`docs/diccionario_tabla_modelo.md`](diccionario_tabla_modelo.md).
- Tabla limpia utilizada: `datos_procesados/tabla_modelo_2024_2025_limpia.csv`.
- Exportador reproducible: [`modelo/exportar_m3_produccion.py`](../modelo/exportar_m3_produccion.py).
- Metadatos del artefacto: [`modelo/m3_produccion_metadata.json`](../modelo/m3_produccion_metadata.json).

Se exportó un artefacto provisional para integración y priorización. Aún no debe considerarse definitivo ni interpretarse como una probabilidad absoluta calibrada.
