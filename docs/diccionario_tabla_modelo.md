# Diccionario de la tabla integrada del modelo

Este documento describe las tablas `datos_procesados/tabla_modelo_2024.csv` y `datos_procesados/tabla_modelo_2025.csv`. Ambas tienen **77 columnas**, los mismos nombres y los mismos tipos detectados al cargarlas con pandas.

Una fila representa a un niño/a registrado en `REC95`; se añaden atributos del hogar, vivienda, madre/cuidadora y CRED mediante las llaves correspondientes.

## Alcance y advertencias

- Este diccionario es de referencia para explorar la data y seleccionar un target posteriormente. **No fija un target.**
- `tomo_7d`, `recibio_12m`, las presentaciones de hierro y las razones de no consumo son candidatas para evaluar targets o posibles fugas de información; no deben entrar automáticamente como predictoras.
- `caseid`, `idx_nino` y `hhid` son identificadores: se conservan para cruces y auditoría, pero no se usan como predictores.
- Los tipos `float64` en códigos enteros aparecen porque hay valores faltantes. Esto no implica que la variable sea continua.
- Las fechas CRED y de micronutrientes están almacenadas como texto en el CSV; deberán convertirse a fecha solo si se decide usarlas.
- Los códigos especiales (por ejemplo, 8, 9, 96, 98, 99 y 996) deben interpretarse según la pregunta; no se convierten globalmente a faltantes.
- En la copia limpia integrada (`tabla_modelo_2024_2025_limpia.csv`), el marcador `99.9` de ambas hemoglobinas ajustadas se convirtió a faltante real.
- `madre_afiliada_sis` llegó vacía en los dos años (100% faltante); se conserva en la tabla maestra para trazabilidad, pero no es candidata a predictor.

## 1. Identificación, demografía, geografía y diseño

| Variable | Tipo almacenado | Nivel | Descripción | Fuente |
|---|---|---|---|---|
| `anio` | int64 | entrevista | Año de la encuesta ENDES. | Archivo de origen |
| `caseid` | string | madre/entrevista | Identificador anónimo de la entrevista individual de la madre. | REC0111 / REC95 |
| `idx_nino` | string | niño | Número de orden del niño dentro de la entrevista. | IDX95 (REC95) |
| `edad_meses` | int64 | niño | Edad calculada en meses al momento de la entrevista. | Derivada de V008 y B3 |
| `edad_meses_hw1` | float64 | niño | Edad en meses registrada en la medición de anemia; sirve para control de calidad. | HW1 (REC44) |
| `edad_discrepa` | object | niño | Indicador de diferencia mayor a un mes entre las dos medidas de edad. | Derivada |
| `banda_edad` | object | niño | Banda: 0-5, 6-11, 12-23, 24-35 o 36-59 meses. | Derivada |
| `area` | object | entrevista | Área de residencia: urbana o rural. | V025 (REC0111) |
| `departamento_cod` | int64 | entrevista | Código de departamento. | V024 (REC0111) |
| `departamento` | object | entrevista | Nombre del departamento. | Derivada de V024 |
| `region_natural` | object | entrevista | Lima Metropolitana, Resto Costa, Sierra o Selva. | SREGION (REC91) |
| `altitud_msnm` | int64 | conglomerado | Altitud del conglomerado en metros sobre el nivel del mar. | V040 (REC0111) |
| `conglomerado` | int64 | conglomerado | Unidad primaria de muestreo. Útil para validación agrupada, no como predictor inicial. | V021 (REC0111) |
| `estrato` | int64 | diseño muestral | Estrato del diseño muestral. | V022 (REC0111) |
| `hhid` | string | hogar | Identificador anónimo del hogar. | HHID (REC0111 / RECH0) |
| `factor_expansion_crudo` | int64 | diseño muestral | Factor mujer sin dividir entre 1 000 000. | V005 (REC0111) |
| `factor_hogar_crudo` | int64 | diseño muestral | Factor hogar sin dividir entre 1 000 000. | HV005 (RECH0) |

## 2. Hierro: recepción, toma y razones reportadas

| Variable | Tipo almacenado | Nivel | Descripción | Fuente |
|---|---|---|---|---|
| `recibio_jarabe` | float64 | niño | Recibió hierro en jarabe del MINSA en los últimos 12 meses; 1 sí, 0 no. | S465DB_A |
| `recibio_gotas` | float64 | niño | Recibió hierro en gotas del MINSA en los últimos 12 meses; 1 sí, 0 no. | S465DB_B |
| `recibio_polvo` | float64 | niño | Recibió micronutrientes en polvo del MINSA en los últimos 12 meses; 1 sí, 0 no. | S465DB_C |
| `recibio_otra` | float64 | niño | Recibió otra presentación de hierro del MINSA en los últimos 12 meses; 1 sí, 0 no. | S465DB_D |
| `recibio_estado` | object | niño | Resumen de respuestas de recepción: sí, no, no sabe o vacío. | Derivada de S465DB_A a D |
| `recibio_12m` | float64 | niño | 1 si recibió alguna presentación, 0 si no recibió ninguna; vacío cuando no hay respuesta clara. | Derivada |
| `tomo7_jarabe` | float64 | niño | Tomó hierro en jarabe durante los últimos 7 días; 1 sí, 0 no. | S465EA |
| `tomo7_gotas` | float64 | niño | Tomó hierro en gotas durante los últimos 7 días; 1 sí, 0 no. | S465EC |
| `tomo7_polvo` | float64 | niño | Tomó micronutrientes en polvo durante los últimos 7 días; 1 sí, 0 no. | S465EB |
| `tomo7_otra` | float64 | niño | Tomó otra presentación de hierro durante los últimos 7 días; 1 sí, 0 no. | S465ED |
| `tomo_estado` | object | niño | Resumen de respuestas de toma: sí, no, no sabe o vacío. | Derivada de S465EA a ED |
| `tomo_7d` | float64 | niño | 1 si tomó alguna presentación en los últimos 7 días, 0 si no tomó ninguna; vacío si no hay respuesta clara. | Derivada |
| `razon_no_recibio_cod` | float64 | niño | Razón principal por la que no recibió hierro del MINSA. | Q465DF |
| `razon_no_consumo_cod` | object | niño | Letras de razones por las que consumió menos hierro del recibido en 12 meses; puede incluir varias respuestas. No corresponde necesariamente a la última semana. | Q465DJ |
| `razon_estomago` | float64 | niño | Razón A: le dolía el estómago. | Q465DJ |
| `razon_diarrea` | float64 | niño | Razón B: le causó diarrea. | Q465DJ |
| `razon_estrenimiento` | float64 | niño | Razón C: le causó estreñimiento. | Q465DJ |
| `razon_sabor` | float64 | niño | Razón D: el sabor es desagradable. | Q465DJ |
| `razon_dientes` | float64 | niño | Razón E: le tiñó los dientes. | Q465DJ |
| `razon_orientacion` | float64 | niño | Razón F: orientación a la madre no adecuada. | Q465DJ |
| `razon_inicio_suplementacion` | float64 | niño | Código G: inició suplementación o es continuador(a); no es una razón de no consumo. | Q465DJ |
| `razon_olvido` | float64 | niño | Razón H: se olvidó de darle. | Q465DJ |
| `razon_otra` | float64 | niño | Razón X: otra razón. | Q465DJ |

> Las letras de las presentaciones no coinciden entre `recibio_*` y `tomo7_*`; se emparejaron por el nombre de la presentación, no por la letra del código ENDES.

## 3. CRED y anemia ya presentes en la tabla original

| Variable | Tipo almacenado | Nivel | Descripción | Fuente |
|---|---|---|---|---|
| `control_cred_alguno` | float64 | niño | Reporte de algún control de crecimiento y desarrollo; 1 sí, 0 no. | S466 |
| `controles_cred_acum` | float64 | niño | Cantidad acumulada reportada de controles CRED; los valores no válidos se dejaron vacíos. | S466C |
| `nivel_anemia_minsa` | float64 | niño | Nivel de anemia según criterio MINSA 2022: grave, moderada, leve o sin anemia. | HW57 (REC44) |
| `nivel_anemia_oms` | float64 | niño | Nivel de anemia según directriz OMS 2024 / RM 251-2024-MINSA. | HW57A (REC44) |
| `anemia_minsa` | float64 | niño | Indicador de anemia según criterio MINSA 2022. | Derivada de HW57 |
| `anemia_oms` | float64 | niño | Indicador de anemia según criterio OMS 2024. | Derivada de HW57A |
| `hb_ajustada_minsa_gdl` | float64 | niño | Hemoglobina ajustada por altitud en g/dl, criterio MINSA 2022. El código 99.9 se convierte a faltante en la tabla limpia. | HW56 / 10 |
| `hb_ajustada_oms_gdl` | float64 | niño | Hemoglobina ajustada por altitud en g/dl, criterio OMS 2024. El código 99.9 se convierte a faltante en la tabla limpia. | HW56A / 10 |
| `en_universo_6_35` | bool | niño | Verdadero cuando la edad está entre 6 y 35 meses. | Derivada |
| `en_cohorte_modelo` | bool | niño | Cohorte preliminar: 6-35 meses, recibió hierro y respondió claramente sobre toma semanal. No implica que sea la cohorte final. | Derivada |

## 4. Hogar: módulo 1629

Una fila de `RECH0` y la composición agregada de integrantes de `RECH1`, unidas por `hhid`.

| Variable | Tipo almacenado | Nivel | Descripción | Fuente |
|---|---|---|---|---|
| `n_residentes_habituales` | int64 | hogar | Número de residentes habituales del hogar. | HV012 (RECH0) |
| `n_menores_5_hogar` | int64 | hogar | Número de menores de cinco años en el hogar. | HV014 (RECH0) |
| `n_ninos_6_17_hogar` | int64 | hogar | Número agregado de residentes de 6 a 17 años. | HV102 y HV105 (RECH1) |
| `n_adultos_18_59_hogar` | int64 | hogar | Número agregado de residentes de 18 a 59 años. | HV102 y HV105 (RECH1) |
| `n_adultos_mayores_hogar` | int64 | hogar | Número agregado de residentes de 60 años o más. | HV102 y HV105 (RECH1) |

## 5. Vivienda: módulo 1630

Una fila por hogar desde `RECH23`, unida por `hhid`.

| Variable | Tipo almacenado | Nivel | Descripción | Fuente |
|---|---|---|---|---|
| `quintil_riqueza` | int64 | hogar | Quintil del índice de riqueza del hogar. | HV270 (RECH23) |
| `n_habitaciones_dormir` | float64 | hogar | Número de habitaciones utilizadas para dormir. | HV216 (RECH23) |
| `personas_por_dormitorio` | float64 | hogar | Residentes habituales divididos entre habitaciones para dormir. | Derivada de HV012 y HV216 |

## 6. Madre o cuidadora: módulo 1631

Una fila por `caseid`, formada con `REC0111` y `REC91`.

| Variable | Tipo almacenado | Nivel | Descripción | Fuente |
|---|---|---|---|---|
| `edad_madre` | int64 | madre/cuidadora | Edad de la madre entrevistada. | V012 (REC0111) |
| `nivel_educativo_madre` | int64 | madre/cuidadora | Categoría de nivel educativo de la madre. | V149 (REC0111) |
| `madre_afiliada_sis` | object | madre/cuidadora | Afiliación de la madre al SIS. En las tablas integradas 2024-2025 está completamente vacía, por lo que no debe usarse como predictor. | S229B1 (REC91) |
| `cuidador_habitual` | object | madre/cuidadora | Persona que suele cuidar al niño cuando la madre se ausenta. | S720A (REC91) |
| `lengua_materna` | int64 | madre/cuidadora | Lengua materna declarada por la madre. Puede servir para equidad o personalización. | S119 (REC91) |

## 7. CRED y entregas registradas: módulo 1634

Una fila por `caseid + idx_nino` desde `REC95`. Las fechas provienen de registros de controles y carné; no se han convertido aún en medidas de antigüedad.

| Variable | Tipo almacenado | Nivel | Descripción | Fuente |
|---|---|---|---|---|
| `tuvo_cred` | object | niño | Versión categórica de si recibió algún CRED: sí, no o no sabe. Es redundante con `control_cred_alguno`; conservar solo para auditoría hasta decidir cuál usar. | Derivada de S466 |
| `cred_realizado_por_doctor` | float64 | niño | El CRED fue realizado por médico; 1 sí, 0 no. | S466AA |
| `cred_realizado_por_obstetra` | float64 | niño | El CRED fue realizado por obstetra; 1 sí, 0 no. | S466AB |
| `cred_realizado_por_enfermera` | float64 | niño | El CRED fue realizado por enfermera; 1 sí, 0 no. | S466AC |
| `cred_realizado_por_tecnico_enfermeria` | float64 | niño | El CRED fue realizado por técnico/a de enfermería; 1 sí, 0 no. | S466AD |
| `cred_realizado_por_promotor_salud` | float64 | niño | El CRED fue realizado por promotor/a de salud; 1 sí, 0 no. | S466AE |
| `cred_realizado_por_otro` | float64 | niño | El CRED fue realizado por otro personal; 1 sí, 0 no. | S466AX |
| `lugar_cred_codigo` | float64 | niño | Código del establecimiento donde realizó el CRED. | S466B |
| `n_cred_con_fecha` | int64 | niño | Número de controles CRED con fecha completa y válida entre los registros disponibles. | Derivada de S466DC/MC/YC 1-12 |
| `fecha_ultimo_cred` | object (fecha) | niño | Fecha máxima válida entre los controles CRED registrados. | Derivada de S466DC/MC/YC 1-12 |
| `n_entregas_mmn_registradas` | float64 | niño | Número de entregas de micronutrientes registradas en el carné, cuando el valor está entre 1 y 6. | Q465EC_A9 |
| `registro_entrega_mmn` | object | niño | Estado del registro de entregas: 1 a 6 entregas, carné sin fecha o no muestra carné. | Q465EC_A9 |
| `n_entregas_mmn_con_fecha` | int64 | niño | Número de entregas de micronutrientes con fecha completa válida. | Derivada de Q465EC_D/M/Y 1-6 |
| `fecha_ultima_entrega_mmn` | object (fecha) | niño | Fecha máxima válida de entrega de micronutrientes. Solo representa micronutrientes en polvo, no todas las presentaciones de hierro. | Derivada de Q465EC_D/M/Y 1-6 |

## Lectura recomendada antes de modelar

1. Revisar `docs/registro_decisiones_analisis.md` para limitaciones de las preguntas de hierro y la comparabilidad 2024-2025.
2. Ejecutar `modelo/unificacion_datos.ipynb` para obtener porcentajes de nulos, ejemplos, cardinalidad y códigos especiales por año.
3. Elegir el target recién después de comparar los candidatos disponibles en la data.
4. Separar variables de investigación de las variables que realmente existirán al puntuar un niño nuevo en producción.
