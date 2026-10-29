# Protocolo de análisis del modelo de YAWAR (versión 1, 27 oct 2026, antes de entrenar)

Se escribe antes de ver ningún resultado del modelo. Cualquier cambio posterior se anota al final con su fecha y su motivo.

## 1. Pregunta
Entre los niños de 6 a 35 meses que recibieron hierro, ¿un modelo con datos que tiene el establecimiento ordena mejor que la edad sola a quienes no lo tomaron en la última semana?

## 2. Datos y cohorte
- ENDES 2025, `tabla_modelo_2025.csv`, cohorte `en_cohorte_modelo` (6–35 meses, recibió hierro en 12 meses, respuesta clara sobre la toma semanal): n = 7.172, 2.802 conglomerados.
- ENDES 2024 se agrega cuando Magno entregue `tabla_modelo_2024` (evaluación temporal 2024 → 2025, sección 6).

## 3. Desenlace
`y = 1 − tomo_7d`: no tomó ninguna presentación de hierro en los últimos 7 días, según la madre. Prevalencia en la cohorte: 54,4 % (54,2 % ponderado).

## 4. Predictores
Criterio: el establecimiento los tiene en su registro y distinguen a niños dentro del mismo establecimiento.
- **Edad en meses** (`edad_meses`).
- **Controles CRED acumulados** (`controles_cred_acum`) y su **atraso relativo**: controles del niño menos la mediana de los niños de su misma edad en meses, calculada solo con los datos de entrenamiento de cada partición.
- **Presentación recibida** (`recibio_jarabe`, `recibio_gotas`, `recibio_polvo`).

Excluidos, con su motivo:
- Fuga de información: `tomo7_*`, `tomo_estado`, `razon_*`, anemia y hemoglobina.
- Conducta propia de la encuesta que el establecimiento no ve: `registro_entrega_mmn`, `n_cred_con_fecha` y `n_entregas_*` (dependen de que la madre muestre el carné al encuestador).
- Sin datos suficientes: `fecha_ultima_entrega_mmn` (90 % faltante), `control_cred_alguno` (no varía en la cohorte).
- Sin fecha de entrevista, por ahora: días desde el último CRED. Se agrega si Magno entrega la fecha de entrevista; entonces será versión 2 del protocolo.
- Sin asociación en la exploración descriptiva: `n_menores_5_hogar` (54,4 % frente a 53,9 %). No entra.
- Solo para equidad, nunca como predictores: lengua materna, quintil de riqueza, educación de la madre.

## 5. Modelos (fijados de antemano)
- **M0 Azar**: orden aleatorio. Su PPV es la prevalencia.
- **M1 Edad**: regresión logística con la edad en splines.
- **M2 Principal**: regresión logística con edad (splines), controles CRED, atraso relativo y presentación.
- **M3 M2 + geografía** (área, región natural, altitud). Solo para comparar: muestra cuánto se pierde al no usar geografía, que no distingue a niños de un mismo establecimiento.
- **M4 Boosting** (HistGradientBoosting) con las variables de M2. Solo como chequeo de si hay no linealidades que la logística no capta.

## 6. Partición y evaluación
- **Prueba apartada**: 25 % de los conglomerados, sorteados con semilla fija (2026). Se usa **una sola vez**, al final.
- **Desarrollo**: el 75 % restante, con validación cruzada agrupada por conglomerado (5 particiones) para comparar modelos.
- **Temporal (cuando llegue 2024)**: entrenar con 2024 y evaluar con 2025.

## 7. Métricas
- **Primaria: PPV@20 %**, es decir, de cada 100 niños que el establecimiento busca primero (el 20 % de la lista), cuántos de verdad no tomaron el hierro. Se compara con M0 y con M1.
- Secundarias: PPV@10 % y PPV@30 %, AUC, Brier, calibración (intercepto y pendiente) y curva de calibración.
- Intervalos de confianza al 95 % por bootstrap de conglomerados (1.000 repeticiones) en la prueba apartada, incluida la diferencia entre M2 y M1.
- Las métricas principales se reportan sin ponderar; las ponderadas por el factor de expansión, como sensibilidad.

## 8. Regla de decisión (fijada antes)
YAWAR usa M2 si su PPV@20 % en la prueba apartada supera a M1 y el intervalo de la diferencia excluye 0. Si no, usa la edad y la ficha lo dice.

## 9. Equidad
En la prueba apartada, por subgrupo: AUC, PPV@20 % y calibración en el conjunto (observado frente a predicho).
- Lengua materna: castellano frente a lengua originaria.
- Quintil de riqueza: 1–2, 3 y 4–5.
- Educación de la madre: hasta primaria, secundaria y superior.
- Área: urbana y rural.

## 10. Límites conocidos
- El desenlace lo declara la madre (posible sesgo de deseabilidad social).
- ENDES es una encuesta de hogares; el modelo se usaría con el padrón de un establecimiento. Hay que recalibrar en el piloto, en modo silencioso.
- "Recibió hierro" se mide en 12 meses; la lista semanal asume que el niño está en suplementación.

## Registro de cambios
- **29 oct 2026: se usa M2 en el sistema, aunque la regla de la sección 8 no se cumplió.** En la prueba apartada (n = 1.748) la diferencia de PPV@20 % entre M2 y M1 fue +3,2 pp [−0,6; +7,1]; en la evaluación temporal 2024 → 2025 (n = 7.172), +2,9 pp [+0,5; +5,1], y en la sensibilidad ponderada, +4,6 pp. Las tres van en la misma dirección. El cambio se decide después de ver los resultados y se declara así. M2 se usa de forma provisional; el modo silencioso del piloto decide con datos del establecimiento si se mantiene, se recalibra o se vuelve a la edad.
- **29 oct 2026: modelo de producción.** M2 se reajusta con ENDES 2024 + 2025 (n = 14.516) con `exportar_produccion.py`; sus tablas y coeficientes pasan a `puntuar.py`. No se vuelve a evaluar: las cifras de desempeño son las de RESULTADOS.md.
- **29 oct 2026: prioridad por necesidad (decisión de diseño, no del modelo).** Dentro de cada grupo de la lista, los niños en tratamiento de anemia van antes que el resto, porque dejar el hierro les hace más daño; el puntaje ordena después. A validar con el personal de CRED.
