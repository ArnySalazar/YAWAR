# Datos

Los microdatos de ENDES **no se suben al repositorio**. Cada uno los descarga del portal de microdatos del INEI (https://proyectos.inei.gob.pe/microdatos/) → *Consulta por Encuestas* → ENDES → año → **formato CSV**. Se descargan también los diccionarios y cuestionarios de cada módulo.

## Qué descargar
Código de encuesta: **968** (2024) y **1038** (2025). El número de módulo es el mismo en ambos años.

| Módulo | Nombre en el portal | 2024 | 2025 | Para qué |
|---|---|---|---|---|
| 1629 | Características del Hogar | sí | sí | Diseño muestral del hogar (verificación cruzada) |
| 1631 | Datos Básicos de MEF | sí | sí | **Diseño muestral** (`V005`, `V021`, `V022`, `V024`, `V025`) y fecha de entrevista (`V008`) |
| 1632 | Historia de Nacimiento | sí | sí | Fecha de nacimiento (`B3`) |
| 1634 | Inmunización y Salud | sí | sí | **Hierro** recibido, tomado y razones (tabla REC95) |
| 1638 | Peso y Talla - Anemia | sí | sí | Edad en meses y **anemia** (tabla REC44) |
| 1641 | Programas Sociales | sí | sí | Opcional; fuera del camino principal |

## Dónde dejarlos
```
endes_raw/
  2024/  968-Modulo1629.zip ... 968-Modulo1641.zip
  2025/  1038-Modulo1629.zip ... 1038-Modulo1641.zip
```
Después, desde la raíz del repositorio:
```bash
python datos/preparar_csv.py
```
Esto deja los CSV y diccionarios en `endes_raw/<año>/extraido/<módulo>/`. `endes_raw/` está en el `.gitignore`.

## Variables clave
- `S465DB_A` a `S465DB_D`: recibió hierro del MINSA en los últimos 12 meses. **A** jarabe, **B** gotas, **C** polvo (micronutrientes), **D** otra presentación.
- `S465EA` a `S465ED`: tomó hierro en los últimos 7 días (1 = sí, 2 = no, 8 = no sabe). **A** jarabe, **B** polvo, **C** gotas, **D** otra. Atención: **El orden de B y C es distinto al de la pregunta de "recibió".** No emparejar por letra.
- `Q465DJ`: razón por la que no consumió (D sabor, C estreñimiento, E manchas en los dientes, H olvido; G "inició suplementación/continuador(a)" no es una razón de no consumo).
- `QI465ED_CC_A` a `QI465ED_CC_D`: prueba de anemia, diagnóstico, tratamiento indicado y si lo consumió como se indicó.
- Edad en meses: `HW1` (tabla REC44) o calculada como `V008 − B3`.
- Anemia: `HW57` (RM 363-2022-MINSA) y `HW57A` (nueva directriz OMS 2024 / RM 251-2024-MINSA).
- Llaves: REC95 `CASEID` + `IDX95`; REC44 `CASEID` + `HWIDX`; REC21 `CASEID` + `BIDX`; REC0111 `CASEID`.

El padrón acepta una columna opcional `acepta_mensajes` (1 o 0; por defecto 1).

`padron_ejemplo.csv` es un padrón **simulado** de 10 niños para probar la API. Gian genera el padrón completo para la demo.

`padron_demo_30.csv` agrega **30 niños ficticios** con edades de 6 a 35 meses, 10 en tratamiento,
consentimiento explícito y campos opcionales. La guía de casos y el cargador de historial para una
base separada están en [`docs/escenarios_demo_30.md`](../docs/escenarios_demo_30.md).
Desde la raíz: `python -m scripts.preparar_demo_30`. No reemplaza la base activa ni envía WhatsApp.
