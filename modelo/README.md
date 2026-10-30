# Modelo de riesgo de no consumo

- `PROTOCOLO.md`: protocolo escrito antes de entrenar (pregunta, cohorte, modelos, métricas y regla de decisión) y su registro de cambios.
- `entrenar.py`: compara azar, edad (M1), M2, M2 + geografía y boosting en ENDES 2025, con prueba apartada de conglomerados.
- `temporal.py`: entrena con ENDES 2024 y evalúa con 2025.
- `RESULTADOS.md`: resultados de las dos pruebas, calibración y equidad.
- `exportar_produccion.py`: reajusta M2 con 2024 + 2025 y genera `m2_produccion.json`.
- `puntuar.py`: la función que usa la API, con las tablas y coeficientes de M2 (sin depender de scikit-learn).

Los scripts leen `datos_procesados/tabla_nino_2024.csv` y `datos_procesados/tabla_modelo_2025.csv`, que no se suben al repositorio (microdatos de ENDES; ver `datos/README.md`). Requieren scikit-learn: `pip install scikit-learn`.
