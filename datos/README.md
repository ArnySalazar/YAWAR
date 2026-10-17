# Datos

Los microdatos de ENDES **no se suben al repositorio**. Cada uno los descarga del portal de microdatos del INEI (https://proyectos.inei.gob.pe/microdatos/), sección ENDES, y los guarda aquí, en `datos/endes/<año>/`.

Módulos que usamos (responsable: Magno):

| Año | Módulos | Para qué |
| --- | --- | --- |
| 2025 | 1634 | Hierro recibido, hierro consumido, razones de no consumo, tamizaje y tratamiento (REC95, REC43, REC42, DIT) |
| 2024 | 1634 | Validación del modelo en otro año (primero verificar que traiga las mismas preguntas) |
| 2025 | 1629, 1631, 1632, 1638, 1641 | Hogar, edad completa desde los 6 meses y otras variables (confirmar contenido con el diccionario) |

Variables clave del módulo 1634 (2025), archivo REC95:

- `S465DB_A` a `S465DB_D`: recibió hierro del MINSA en los últimos 12 meses.
- `S465EA` a `S465ED`: tomó hierro en los últimos 7 días (1 = sí, 2 = no, 8 = no sabe).
- `Q465DJ`: razón por la que no consumió (D sabor, C estreñimiento, E manchas en los dientes, H olvido; G no es una razón de no consumo).
- `QI465ED_CC_A` a `QI465ED_CC_D`: prueba de anemia, diagnóstico, tratamiento indicado y si lo consumió como se indicó.
- Llave del niño: `CASEID` + `IDX95` (en DIT es `BIDX`; en REC43, `HIDX`).

El padrón acepta una columna opcional `acepta_mensajes` (1 o 0; por defecto 1).

`padron_ejemplo.csv` es un padrón **simulado** de 10 niños para probar la API. Gian genera el padrón completo para la demo.
