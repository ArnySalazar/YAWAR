# Riesgos del día de la demo

Qué puede fallar, qué hace el sistema y qué hacemos nosotros. Revisar esta lista el día anterior y una hora antes.

## Ya resuelto en el código

| Riesgo | Qué hace el sistema |
| --- | --- |
| Meta reenvía el mismo mensaje (reintentos del webhook) | Cada mensaje entrante se guarda con su id; si llega de nuevo, se ignora |
| El webhook recibe algo inesperado | Siempre responde 200 y registra el error en el log; no se cae |
| Meta envía el número sin "+" y el padrón lo tiene con "+" | Los teléfonos se guardan solo con dígitos |
| Falla un envío (token vencido, número no registrado, sin internet) | Sigue con los demás, lo marca como fallido y al reintentar solo reenvía ese |
| El padrón trae una fila mala | No carga nada y dice qué fila y qué error |
| Alguien sin permiso usa la API | Con `API_CLAVE` definida, el panel debe enviar `X-API-Key` |
| Un cuidador no quiere más mensajes | Escribe BAJA y deja de recibirlos; ALTA para volver |
| El servidor está en otra zona horaria | Las fechas se calculan en hora de Lima |
| Los avisos de "entregado" o "leído" llegan desordenados | El estado nunca retrocede |
| La base quedó sucia por los ensayos | `python -m scripts.reiniciar_demo` la deja limpia en segundos |

## Depende de nosotros

| Riesgo | Prevención |
| --- | --- |
| La plantilla de WhatsApp no está aprobada | Enviarla a aprobación esta semana, no la víspera |
| El token temporal de Meta vence (dura pocas horas) | Usar un token permanente de usuario del sistema antes del ensayo final |
| La URL del túnel cambia al reiniciarlo | Verificar el webhook en Meta después de cada reinicio del túnel |
| El número de prueba no está registrado como destinatario | Registrar los números del equipo con anticipación |
| No hay internet en el auditorio | Video de respaldo de la demo completa + datos locales en `MODO_PRUEBA=1` |
| El celular de la demo se queda sin batería o en silencio | Cargado, con sonido y sin otras notificaciones |
| Algo falla en vivo | Lista exportada en CSV/PDF impresa y la frase preparada: "Les mostramos el video" |
| La laptop se apaga o se actualiza | Cargador conectado y actualizaciones de Windows pausadas |

## Orden del ensayo general (la víspera)

1. `python -m pytest -q` → todo debe pasar.
2. `python -m scripts.reiniciar_demo datos/padron_demo.csv`.
3. Levantar la API y el túnel; verificar el webhook en Meta.
4. Generar la lista, enviar recordatorios y responder desde un celular del equipo.
5. Confirmar que el niño sube en la lista del panel.
6. Reiniciar la base otra vez para dejarla limpia.
