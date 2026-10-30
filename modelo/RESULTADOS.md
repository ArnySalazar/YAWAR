# Resultados v1 (27 oct 2026, 2:40 a. m.) — ENDES 2025, protocolo v1 sin cambios

Prueba apartada: 1.748 niños de 700 conglomerados, usada una sola vez. Prevalencia de no consumo: 55,0 %.

| Modelo | PPV@10 % | PPV@20 % (primaria) | PPV@30 % | AUC |
|---|---|---|---|---|
| Azar | 55,0 % | 55,0 % | 55,0 % | 0,50 |
| Edad | 76,0 % | 73,1 % | 66,9 % | 0,64 |
| Principal (edad, controles CRED, atraso, presentación) | 81,7 % | 76,3 % | 74,3 % | 0,68 |
| Principal + geografía | 79,4 % | 76,3 % | 74,1 % | 0,68 |
| Boosting | 77,1 % | 76,9 % | 73,5 % | 0,68 |

Diferencia principal − edad (bootstrap de conglomerados, IC 95 %): PPV@20 % +3,2 pp [−0,6; +7,1]; AUC +0,038 [0,022; 0,056].

Decisión según la regla fijada: el IC de la PPV@20 % incluye 0 → no se demuestra que el modelo supere a la edad en la métrica primaria. El modelo sí discrimina mejor (AUC) y rinde más al 30 %, pero esas son secundarias.
Calibración: intercepto ≈ 0, pendiente 0,96. Geografía no aporta. Boosting no mejora y calibra peor (pendiente 0,82).
Equidad: AUC y PPV similares entre subgrupos; el modelo subestima 2–3 pp el no consumo en madres con hasta primaria (58,6 % observado vs 55,7 % predicho) y en zona rural (57,5 % vs 55,5 %).
Verificaciones: ningún conglomerado ni hogar se repite entre desarrollo y prueba; ordenar por edad sin modelo da 73,4 %, coherente con M1.
Siguiente: evaluación temporal 2024 → 2025 (n de prueba ≈ 7.172) cuando llegue tabla_modelo_2024; agregar días desde el último CRED si llega la fecha de entrevista (protocolo v2, escrito antes de ver esos datos).

# Evaluación temporal (29 oct 2026) — protocolo v1, sección 6, sin cambios
Entrena con ENDES 2024 (cohorte del modelo, n = 7.344, de `tabla_nino_2024.csv` de Magno) y evalúa con toda la cohorte 2025 (n = 7.172). Script: `temporal.py`.
No consumo: 59,6 % en 2024, 54,4 % en 2025.

| Modelo | PPV@10 % | PPV@20 % | PPV@30 % | AUC | Predicho medio |
|---|---|---|---|---|---|
| Azar | 54,4 % | 54,4 % | 54,4 % | 0,50 | — |
| Edad (M1) | 78,7 % | 71,2 % | 65,5 % | 0,65 | 60,0 % |
| Principal (M2) | 78,2 % | 74,1 % | 70,9 % | 0,67 | 59,2 % |

Diferencia M2 − M1 (bootstrap de conglomerados 2025, 1.000): PPV@20 % +2,9 pp [+0,5; +5,1]; AUC +0,023 [0,017; 0,030].
Calibración M2: intercepto −0,17, pendiente 0,87 → sobreestima ~5 pp porque el no consumo bajó entre años.
Equidad (M2, observado vs predicho): hasta primaria 54,6 vs 58,6; secundaria 54,4 vs 59,2; superior 54,3 vs 59,8; rural 53,2 vs 58,8 (PPV@20 % 70,8 %); urbano 55,0 vs 59,5 (PPV@20 % 75,3 %).
Lectura: la ventaja es la misma que en la prueba apartada (~3 pp, casi 1 niño de cada 20), pero aquí el IC excluye 0. La regla de la sección 8 se fijó sobre la prueba apartada, que no la cumple. La subestimación por subgrupos de la prueba apartada no se repite: entre años el desajuste dominante es de nivel (todos sobreestimados), lo que respalda recalibrar con datos locales.
