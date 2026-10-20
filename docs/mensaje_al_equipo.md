# Mensaje al equipo (listo para enviar)

> Texto para pegar en el grupo del equipo. Las cifras salen de `analisis/resultados/` y de `docs/tabla1_2024_2025.md`. Antes de enviar cualquier cifra al Comité, revisarla con Arny.

---

**Equipo YAWAR: el análisis de datos ENDES (mi parte) está listo.**

**Qué hay y dónde (carpeta `analisis/` y `docs/` del repositorio)**
- **Cuadernos 01 a 05** (`analisis/`): se leen en orden y explican cada decisión. Traen sus gráficos incrustados.
- **Table 1** 2024 vs 2025: `docs/tabla1_2024_2025.md` (para la ficha) y `analisis/resultados/tabla1_2024_2025.csv`.
- **4 gráficos para el pitch**: `analisis/graficos/g1…g4*.png`, con sus datos en `datos_graficos_pitch.csv`.
- **Diccionario de la tabla del niño**, con qué se excluyó y limitaciones: `docs/diccionario_tabla_nino.md`.
- **Registro de decisiones, hallazgos y límites**: `docs/registro_decisiones_analisis.md`.

**Cifras clave** (ponderadas, niños de 6 a 35 meses, ENDES 2025 salvo que diga otro año; entre paréntesis, intervalo de confianza del 95 %)
1. **72 % recibió hierro del MINSA** en 12 meses (70,6–73,2), pero **solo 39 % lo tomó la última semana** (37,5–40,1).
2. Entre los que **sí recibieron**, lo tomó el 46 %; baja con la edad: **70 %** a los 6-11 meses y **34 %** a los 24-35 meses.
3. **La anemia no cambió de forma detectable:** 43,9 % (2024) → 43,7 % (2025), criterio MINSA 2022. Con el criterio OMS 2024: 35,5 % → 35,1 %.
4. **El consumo de hierro sí mejoró** de 2024 a 2025: tomó la última semana 33,9 % → 38,8 % (+4,9 puntos). La mejora está en los niños de 12 a 35 meses.
5. **Razones de no consumo** (de lo recibido en 12 meses; respuesta múltiple): sabor desagradable ≈50 %, estreñimiento ≈33 %, olvido ≈11 %, mancha los dientes ≈9 %.

**Qué necesito de cada uno**
- **Jose (modelo):** (a) genera la tabla ejecutando el cuaderno 03 y confirma que obtienes los mismos totales (cohorte de 7 344 niños en 2024 y 7 172 en 2025). (b) **Ojo con la etiqueta "no tomó":** entre los que recibieron, pasa de 59,9 % (2024) a 54,2 % (2025) ponderado; un modelo entrenado en 2024 puede salir descalibrado en 2025. (c) Las letras de las presentaciones de hierro **no coinciden** entre "recibió" y "tomó" (ver diccionario). (d) Cerca del 64 % de los niños de 2025 vive en conglomerados que también están en 2024, así que 2025 no es un año totalmente "no visto".
- **Camilla (mapas / ficha):** usa `analisis/resultados/para_camilla_departamentos.csv`. Los intervalos por departamento son anchos (200 a 450 niños cada uno): no rankear departamentos vecinos. Comprueba que los nombres coincidan con tu mapa ("Lima" y "Callao" vienen por separado).
- **Gian (padrón simulado):** usa `analisis/resultados/para_gian_proporciones_departamento.csv` (edad, área, región natural y altitud por departamento y año) y las tasas del archivo de Camilla. Ojo: `controles_cred` en ENDES parece **acumulado desde el nacimiento**, no "recientes".
- **Arny:** las opciones del asistente ("no le gusta", "estreñimiento", "se me olvidó", "otro") coinciden con las razones más frecuentes de ENDES; hay que validarlas con el asesor de salud. "Se acabó" en ENDES es razón de **no recibir**, no de no consumir.

**Lo que NO podemos decir en el pitch**
- Que la herramienta reduce la anemia (ENDES solo describe la situación; no mide nuestro efecto).
- Que "la mitad abandona el hierro": "no tomó la última semana" incluye a quien ya terminó su esquema.
- Que un departamento es peor que otro: los intervalos se superponen casi siempre.
- Cifras de INEI de 2025 como "oficiales": la de anemia 2025 que usé para validar viene de una nota de prensa; falta comprobarla en la publicación.

**Qué sigue abierto (lo cierro yo)**
1. Verificar en la publicación de INEI las cifras de comparación (2024 y 2025).
2. Fijar el factor de expansión del hierro (usé el de mujer; con el de hogar "recibió" cambia hasta 1,3 puntos).
3. Elegir con el asesor de salud qué definición de anemia presentamos (MINSA 2022 u OMS 2024); la conclusión es la misma con las dos.

**Cómo confiar en estas cifras:** el estimador pasó pruebas internas, coincide con INEI (diferencias de 0,0 a 0,3 puntos) y con un segundo método independiente. Queda una diferencia de 0,2 a 0,3 puntos en anemia que no pude explicar; es mucho menor que el margen de error (±1,2).

**Recordatorios del proyecto:** los microdatos de ENDES **no se suben** al repositorio (solo las tablas de porcentajes de `analisis/resultados/`); nada de claves o secretos en el repo; primer borrador de la ficha: **jueves 29 de octubre**.
