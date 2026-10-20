# Diccionario de la tabla del niño (`tabla_nino_2024.csv` y `tabla_nino_2025.csv`)

Generado automáticamente por `analisis/03_union_y_limpieza.ipynb`. **No editar a mano:** si algo cambia, se corrige el cuaderno y se vuelve a ejecutar.

Una fila por niño menor de 5 años de ENDES. Códigos de faltante: celda vacía (no hay ceros ni 9s inventados).
Todas las variables de hierro y anemia son autorreporte o medición de la encuesta; ver limitaciones en `docs/registro_decisiones_analisis.md`.

| Columna | Qué es | Fuente en ENDES |
|---|---|---|
| `anio` | Año de la encuesta | Año del archivo de origen |
| `caseid` | Identificador anónimo de la madre en los microdatos públicos de ENDES | CASEID |
| `idx_nino` | Número de orden del niño dentro de la madre | IDX95 (REC95) |
| `edad_meses` | Edad del niño en meses, calculada: fecha de entrevista − fecha de nacimiento | V008 − B3 |
| `edad_meses_hw1` | Edad en meses registrada en la medición de anemia (control de la anterior) | HW1 (REC44) |
| `edad_discrepa` | Verdadero si las dos edades difieren en más de 1 mes | Derivada |
| `banda_edad` | Banda de edad: 0-5, 6-11, 12-23, 24-35, 36-59 meses | Derivada de edad_meses |
| `area` | Urbano o rural | V025 (REC0111) |
| `departamento_cod` | Código de departamento (1 a 25) | V024 (REC0111) |
| `departamento` | Nombre del departamento | V024 (REC0111) |
| `region_natural` | Lima Metropolitana, Resto Costa, Sierra o Selva | SREGION (REC91) |
| `altitud_msnm` | Altitud del conglomerado en metros | V040 (REC0111) |
| `conglomerado` | Unidad primaria de muestreo (conglomerado). Idéntico a V001 y a HV001 en los datos | V021 (REC0111) |
| `estrato` | Estrato del diseño muestral. Idéntico a HV022 en los datos | V022 (REC0111) |
| `hhid` | Identificador del hogar en los microdatos públicos de ENDES | HHID (REC0111) |
| `factor_expansion_crudo` | Factor MUJER sin transformar; el peso es este valor / 1 000 000 (ficha técnica). Se usa para indicadores del cuestionario individual | V005 (REC0111) |
| `factor_hogar_crudo` | Factor HOGAR sin transformar; el peso es este valor / 1 000 000. La ficha técnica lo indica para anemia y desnutrición en menores de 5 años | HV005 (RECH0) |
| `recibio_jarabe` | Recibió hierro en jarabe del MINSA en los últimos 12 meses (1 sí, 0 no, vacío = no sabe o no se preguntó) | S465DB_A |
| `recibio_gotas` | Ídem, en gotas | S465DB_B |
| `recibio_polvo` | Ídem, en polvo (micronutrientes) | S465DB_C |
| `recibio_otra` | Ídem, otra presentación | S465DB_D |
| `recibio_estado` | Resumen: sí, no, no sabe o vacío | Derivada de S465DB_A a D |
| `recibio_12m` | 1 si recibió alguna presentación; 0 si ninguna; vacío si no sabe o no se preguntó | Derivada de S465DB_A a D |
| `tomo7_jarabe` | Tomó hierro en jarabe en los últimos 7 días (1 sí, 0 no, vacío = no sabe) | S465EA |
| `tomo7_gotas` | Ídem, en gotas | S465EC |
| `tomo7_polvo` | Ídem, en polvo (micronutrientes) | S465EB |
| `tomo7_otra` | Ídem, otra presentación | S465ED |
| `tomo_estado` | Resumen: sí, no, no sabe o vacío | Derivada de S465EA a ED |
| `tomo_7d` | 1 si tomó alguna presentación en los últimos 7 días; 0 si ninguna; vacío si no sabe o no se preguntó | Derivada de S465EA a ED |
| `control_cred_alguno` | Le hicieron algún control de crecimiento y desarrollo (1 sí, 0 no) | S466 |
| `controles_cred_acum` | Cantidad de controles de crecimiento (parece acumulada desde el nacimiento; ver cuaderno 02). 98 y valores fuera de 0-40 quedan vacíos | S466C |
| `razon_no_recibio_cod` | Código de por qué no recibió hierro del MINSA (1 no le dijeron, 2 se acabó, 3 por la edad, 4 no tiene anemia, 5 consumió por seis meses, 6 no acude al MINSA, 96 otra) | Q465DF |
| `razon_no_consumo_cod` | Letras de las razones por las que no consumió todo el hierro recibido (puede haber varias). Se pregunta cuando la cantidad consumida en 12 meses es MENOR que la recibida (cuestionario 465DI); NO está ligada a la última semana | Q465DJ |
| `razon_estomago` | Razón: le dolía el estómago (1 sí, 0 no, vacío = no se preguntó) | Q465DJ, letra A |
| `razon_diarrea` | Razón: le causó diarrea | Q465DJ, letra B |
| `razon_estrenimiento` | Razón: le causó estreñimiento | Q465DJ, letra C |
| `razon_sabor` | Razón: el sabor es desagradable | Q465DJ, letra D |
| `razon_dientes` | Razón: le tiñó los dientes | Q465DJ, letra E |
| `razon_orientacion` | Razón: la orientación a la madre no fue adecuada | Q465DJ, letra F |
| `razon_inicio_suplementacion` | Código G: inició suplementación o es continuador(a). NO es una razón de no consumo | Q465DJ, letra G |
| `razon_olvido` | Razón: se olvidó de darle | Q465DJ, letra H |
| `razon_otra` | Razón: otra | Q465DJ, letra X |
| `nivel_anemia_minsa` | Nivel de anemia según RM 363-2022-MINSA (1 grave, 2 moderada, 3 leve, 4 sin anemia) | HW57 (REC44) |
| `nivel_anemia_oms` | Nivel de anemia según la nueva directriz OMS 2024 / RM 251-2024-MINSA | HW57A (REC44) |
| `anemia_minsa` | 1 si tiene anemia (cualquier grado) según MINSA 2022; 0 si no | Derivada de HW57 |
| `anemia_oms` | 1 si tiene anemia (cualquier grado) según OMS 2024; 0 si no | Derivada de HW57A |
| `hb_ajustada_minsa_gdl` | Hemoglobina ajustada por altitud (g/dl), criterio MINSA 2022 | HW56 / 10 |
| `hb_ajustada_oms_gdl` | Hemoglobina ajustada por altitud (g/dl), criterio OMS 2024 | HW56A / 10 |
| `en_universo_6_35` | Verdadero si el niño tiene de 6 a 35 meses | Derivada de edad_meses |
| `en_cohorte_modelo` | Verdadero si está en el universo, SÍ recibió hierro y tiene respuesta clara sobre si lo tomó (cohorte PRELIMINAR) | Derivada |

## Qué se excluyó y por qué (cohorte preliminar del modelo)

Nadie se borra de la tabla: los niños excluidos siguen en ella, marcados con `en_universo_6_35` y `en_cohorte_modelo`. Pasos (niños sin ponderar):

| Paso | Niños 2024 | Niños 2025 |
|---|---|---|
| Niños menores de 5 años (REC95) | 19 751 | 18 841 |
| de 6 a 35 meses | 10 197 | 9 589 |
| con 'recibió' en sí o no | 10 079 | 9 504 |
| que SÍ recibieron hierro | 7 347 | 7 175 |
| con 'tomó' en sí o no  (cohorte preliminar) | 7 344 | 7 172 |

- **Menores de 6 meses y de 36 meses o más:** fuera del universo del proyecto (6 a 35 meses).
- **Respuesta 'no sabe' o vacía en 'recibió' o 'tomó':** se excluyen de la cohorte; **no se imputan**.
- **No recibieron hierro del MINSA:** no entran a la cohorte del modelo (la pregunta de 'tomó' se usa solo entre quienes recibieron), pero sí cuentan en las cifras ponderadas de 'recibió'.

## Limitaciones que hay que tener presentes

1. **Autorreporte:** 'recibió' y 'tomó' son lo que declara la madre o cuidadora; dependen de su recuerdo. La anemia, en cambio, es una medición de hemoglobina.
2. **Ventanas de tiempo distintas:** 'recibió' cubre los últimos **12 meses**; 'tomó', los últimos **7 días**. No miden adherencia en sentido estricto.
3. **'No tomó' no es abandono:** incluye a quien ya terminó su esquema o aún no inicia el siguiente.
4. **Solo hierro entregado por el MINSA:** las preguntas se refieren al hierro entregado por el MINSA; no se verificó que capten el hierro comprado por cuenta propia.
5. **Universo:** la tabla contiene a los hijos menores de 5 años de mujeres entrevistadas (REC95). La anemia oficial se calcula con todos los niños de las viviendas visitadas (RECH6); por eso las cifras de anemia se calculan aparte (cuaderno 04).
6. **Razones de no consumo (`razon_*`):** se preguntan cuando lo consumido es **menor** que lo recibido en 12 meses; **no** se refieren a la última semana. Son de respuesta múltiple y el código G no es una razón.
7. **Letras de presentaciones:** las letras A a D **no significan lo mismo** en 'recibió' (`S465DB_*`) y en 'tomó' (`S465E*`); se emparejan por nombre, no por letra.
8. **Edad:** se calcula como fecha de entrevista menos fecha de nacimiento (cobertura completa). `HW1` (edad de la medición de anemia) falta en muchos niños y se usa solo como control.
9. **Factores de expansión:** las columnas `factor_*_crudo` vienen multiplicadas por 1 000 000; el peso real es el valor dividido entre 1 000 000. Para anemia corresponde el factor hogar y para hierro se usó el factor mujer (la ficha técnica no fija el del hierro).
10. **Cohorte para el modelo:** es **preliminar**. La etiqueta 'no tomó' cambia de frecuencia entre 2024 y 2025 (ver cuaderno 04); validar con el asesor de salud antes de fijarla.
