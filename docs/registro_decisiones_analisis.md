# Registro de decisiones del análisis de datos

Responsable: Magno Luque. Aquí se anota cada decisión del análisis con su fecha, el motivo y la evidencia, para que el equipo y el jurado puedan seguir el razonamiento. Lo que **no** está decidido o tiene límites conocidos va en la sección "Límites y supuestos abiertos". 

## Decisiones tomadas

| Fecha | Decisión | Motivo | Evidencia |
|---|---|---|---|
| 19 oct 2026 | Usar el módulo 1631 (REC0111) como fuente del diseño muestral (`V005`, `V021`, `V022`, `V024`, `V025`) | Está en ambos años y se une a REC95 por `CASEID` sin perder niños | Cuaderno 01, secciones 2 y 3 |
| 19 oct 2026 | Unir hierro, edad, anemia y diseño con la llave `CASEID` + índice del niño | 0 niños sin pareja y 0 llaves repetidas en 2024 y 2025 | Cuaderno 01, sección 3 |
| 20 oct 2026 | La anemia de las **cifras ponderadas** se calcula con `RECH6` (todos los niños de las viviendas) + `RECH0` (factor hogar, estrato, conglomerado); la anemia de la tabla del niño (`REC44`) queda solo como dato por niño | Así lo hace INEI; con REC44 la cifra sale ~0,15 pp más alta. Sí hacía falta el módulo 1629 de 2024 | Cuaderno 04, sección 3 |
| 20 oct 2026 | "No sabe" (8) y vacíos quedan como dato faltante, no como "no"; no se imputan | Tratarlos como "no" cambiaría la etiqueta sin base. Son 2 a 3 niños en la cohorte y unos 85 a 118 en el universo | Cuaderno 03, secciones 2 y 5 |
| 20 oct 2026 | Todo el cálculo de cifras ponderadas vive en un solo archivo, `analisis/encuestas.py` (clase `Diseno`), usado por los cuadernos 04 y 05 | Una sola fuente evita que dos cuadernos calculen distinto | `analisis/encuestas.py`; pruebas en cuaderno 04, sección 1 |
| 20 oct 2026 | Factor **mujer** para hierro y **hogar** para anemia | La ficha técnica fija el hogar para anemia en menores de 5 años; para hierro no dice nada | Cuaderno 04, sección 6 (diferencia máxima 1,3 pp en "recibió") |
| 20 oct 2026 | Gráficos con estilo común (`analisis/graficos.py`): 2024 azul y 2025 naranja; recibió violeta y tomó verde azulado; intervalos de confianza en todo gráfico de cifras; título que dice la conclusión | Consistencia y lectura honesta de la incertidumbre. Paleta validada para daltonismo | `analisis/graficos.py` |
| 19 oct 2026 | Leer todos los CSV como texto y limpiar espacios | Evita mezclar códigos ("8" = no sabe) con números reales | `analisis/rutas.py` |

## Hallazgos que el equipo debe conocer
1. **Las letras A–D de hierro no coinciden entre "recibió" y "tomó".** Jarabe es A en ambas, pero gotas es B en "recibió" y C en "tomó"; polvo es C en "recibió" y B en "tomó". Fuente: diccionario REC95 (2024 y 2025). Afecta a quien arme la etiqueta del modelo (Jose).
2. **El 64 % de los niños de 2025 vive en conglomerados que también están en 2024** (2 117 conglomerados en común). 2025 no es un año completamente independiente para validar. Fuente: cuaderno 01, sección 6; la ficha técnica 2025 llama "paneles" a los conglomerados con la misma numeración.
3. **La anemia tiene dos definiciones** (`HW57` RM 363-2022-MINSA y `HW57A` directriz OMS 2024 / RM 251-2024-MINSA). La conclusión sobre su evolución puede depender de cuál se use.
4. **Vacíos en hierro = casi siempre menores de 6 meses** (805 de 831 en 2024; 682 de 691 en 2025, entre los que tienen edad conocida). Respalda empezar la cohorte a los 6 meses.
5. **Cambio sin explicar (sin ponderar):** "tomó hierro en polvo en 7 días" pasa de 268 a 640 casos entre 2024 y 2025.
6. **La composición de 2024 y 2025 es parecida** (edad idéntica; área, región natural y altitud con diferencias de hasta 3,1 pp). Fuente: cuaderno 02, secciones 3. Todo sin ponderar.
7. **"Tomó hierro en 7 días" (entre los que recibieron) sube de 40,4 % a 45,6 %** entre 2024 y 2025, más en 12-23 meses (33,0 % → 42,3 %). La edad no lo explica. Por tanto, la frecuencia de la etiqueta "no tomó" baja de 59,6 % a 54,4 %, lo que puede desajustar la calibración de un modelo entrenado en 2024. Fuente: cuaderno 02, sección 5. Sin ponderar; pendiente confirmar en el cuaderno 04.
8. **`S466C` (cantidad de controles CRED) parece acumulado desde el nacimiento** (mediana 10, 15-16 y 18-19 en las tres bandas de edad). Es una inferencia, no algo que diga el diccionario. Afecta la definición de `controles_cred` en el padrón.
9. **Tamaño preliminar de la cohorte** (6-35 meses, recibieron hierro, respuesta clara sobre si lo tomaron): 7 344 niños en 2024 y 7 172 en 2025, sin ponderar.
10. **Las razones de no consumo (`Q465DJ`) no explican la última semana.** Según el cuestionario (pregunta 465DI), se preguntan cuando la cantidad consumida en 12 meses es menor que la recibida. La responden el 72,0 % (2024) y el 73,6 % (2025) de los que recibieron hierro, incluidos niños que sí tomaron la semana pasada. Deben presentarse como "razones por las que no se consumió todo lo recibido". Fuente: cuaderno 03, sección 4.
11. **Entre 17,5 % (2024) y 18,3 % (2025) de los niños de 6-35 meses que no recibieron hierro del MINSA lo tomaron igual la última semana** (477 y 427 niños, sin ponderar). Hoy quedan fuera de la cohorte.
12. **Existe una medida alternativa de adherencia:** cantidad recibida vs. consumida en 12 meses (`S465DD_*`). No se ha evaluado.
13. **La tabla del niño está construida:** 50 columnas, 8 uniones sin pérdida de niños, cohorte preliminar de 7 344 (2024) y 7 172 (2025). Trazabilidad paso a paso en el cuaderno 03, sección 5.
14. **Las cifras ponderadas están calculadas** (cuaderno 04). El estimador se validó con cinco pruebas internas, con un método independiente (jackknife, diferencia máxima de 0,0012 puntos) y contra INEI (diferencias de 0,0 a 0,3 puntos; las cifras de INEI caen dentro de los intervalos). Queda un residuo de 0,2 a 0,3 puntos en anemia que no pude explicar.
15. **Anemia (niños de 6 a 35 meses):** 43,9 % (2024) y 43,7 % (2025) con el criterio MINSA 2022; 35,5 % y 35,1 % con el criterio OMS 2024. El cambio no es distinguible de 0 en ninguno. La anemia se calcula con la tabla del hogar (`RECH6`) y el factor hogar (`HV005`), como indica la ficha técnica.
16. **Hierro (niños de 6 a 35 meses, factor mujer):** recibió 70,7 % → 71,9 % (sin cambio detectable); tomó la última semana 33,9 % → 38,8 % (+4,9 pp); recibió y no tomó 42,3 % → 39,0 % (−3,3 pp). La mejora está en los niños de 12 a 35 meses, no en los de 6 a 11.
17. **Entre los que recibieron hierro, no lo tomó la última semana el 59,9 % (2024) y el 54,2 % (2025).** Es la frecuencia ponderada de la etiqueta "no tomó" para el modelo.
18. **El 31 % (2024) y el 35 % (2025) de los niños a quienes se les preguntó por razones respondió únicamente el código G** (aún usan el hierro). Quitando G, las razones más frecuentes son sabor (≈50 %), estreñimiento (≈32-33 %), olvido (≈11 %) y manchar los dientes (7-9 %).
19. **Factor de expansión:** se divide entre 1 000 000 (ficha técnica). Factor hogar para anemia; factor mujer para hierro (la ficha no lo especifica). La elección cambia "recibió" hasta 1,3 puntos; "tomó" menos de 0,3.
20. **No se calcularon totales de niños**, solo porcentajes.
21. **Table 1 lista** (cuaderno 05): `analisis/resultados/tabla1_2024_2025.csv` y `docs/tabla1_2024_2025.md`. Cambios distinguibles de 0 en la composición: más niños urbanos (+2,4 pp) y de Lima Metropolitana (+4,1 pp) en 2025, y menos del Resto Costa (−1,9 pp); edad y el resto de categorías no cambian de forma distinguible. Diferencias de composición de ese tamaño son una razón más para no tratar los dos años como idénticos.
22. **Cuatro gráficos del pitch** en `analisis/graficos/` (G1 recibir no es tomar, G2 razones de no consumo, G3 hierro por departamento, G4 anemia 2024 vs 2025) con tabla de datos gemela. Ningún departamento queda marcado como poco preciso (CV>15 %), pero los intervalos son anchos.
23. **Archivos de entrega:** `para_camilla_departamentos.csv` (cifras por departamento y región) y `para_gian_proporciones_departamento.csv` (edad, área, región natural y altitud por departamento y año). Solo porcentajes; se pueden subir al repositorio.

## Límites y supuestos abiertos del análisis
- **Edad:** se usa la calculada (`V008 − B3`, cobertura completa); `HW1` queda como control (coincide en ~98 %).
- **Factor de expansión del hierro:** la ficha técnica no lo fija; se usó el factor mujer. Con el hogar, "recibió" cambia hasta 1,3 puntos.
- **Cifras de referencia de INEI:** las de 2024 se tomaron por consulta web y la de anemia 2025 proviene de una nota de prensa; no se contrastaron con los PDF oficiales.
- **Definición de anemia:** se presentan MINSA 2022 y OMS 2024; la conclusión es la misma con ambas.
- **Cohorte del modelo:** es preliminar (hallazgo 9). La frecuencia de la etiqueta "no tomó" cambia entre años (hallazgos 7 y 17) y no se evaluó una etiqueta basada en cantidad recibida y consumida (hallazgo 12).
- **Niños que no recibieron del MINSA pero sí tomaron hierro:** quedan fuera de la cohorte (hallazgo 11).
- **`controles_cred`:** `S466C` parece acumulado desde el nacimiento (hallazgo 8); es una inferencia.
- **Causa del salto en hierro en polvo** (sin ponderar, 268 a 640 casos): sin investigar; el consumo total sí subió con cifras ponderadas.
- **Independencia entre años:** ~64 % de los niños de 2025 vive en conglomerados presentes en 2024 (hallazgo 2).

## Notas de método
- Los conteos de los cuadernos 01 y 02 son **sin ponderar** y solo describen la estructura de los datos. No son cifras para el pitch.
- El cuaderno 01 se ejecutó con los datos descargados el 19 oct 2026 (ENDES 2024 y 2025, módulos 1629, 1631, 1632, 1634, 1638 y 1641).
