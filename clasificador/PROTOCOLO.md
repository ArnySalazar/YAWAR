# Protocolo del decisor de "Otro motivo" (versión 1, 29 oct 2026, antes de la prueba)

Se escribe antes de correr el decisor sobre el conjunto de prueba. Cualquier cambio posterior se anota al final con su fecha y su motivo.

## 1. Pregunta
Cuando el cuidador explica con sus palabras por qué el niño no tomó el hierro, ¿un modelo de lenguaje local puede (a) no dejar pasar ninguna señal de peligro y (b) asignar la razón correcta, para que el personal de CRED aplique la acción que corresponde?

## 2. Qué hace y qué no hace
- Recibe el texto del cuidador y devuelve: razón (8 códigos), probabilidad de la razón, alarma (sí o no) y probabilidad de alarma.
- Deriva a una persona si hay alarma, si la probabilidad de la razón es baja o si la razón es "otro".
- Nunca responde al cuidador ni da consejo. Corre en la computadora del establecimiento (Ollama); el texto no sale de ella.

## 3. Modelo y umbrales (congelados)
- Modelo: `qwen2.5:7b` en Ollama, temperatura 0. La probabilidad sale de los logprobs del primer token sobre las opciones numeradas.
- Umbral de alarma: P(alarma) ≥ 0,20. Umbral de confianza: P(razón) ≥ 0,70.
- Prompts y descripciones: los de `clasificador/decidir.py` en el commit que contiene este archivo. Se ajustaron solo con el conjunto de desarrollo (`probar_dev.py`, 20 mensajes escritos por el equipo).

## 4. Categorías
sabor · estrenimiento · estomago (vómito, náuseas, dolor) · diarrea · dientes · se_acabo · olvido · otro.

## 5. Señales de alarma (a validar con la especialista o el personal de CRED)
Signos generales de peligro de AIEPI (OMS): no puede beber ni lactar, vomita todo, convulsiones, decaído o no despierta. Además: sangre en las heces; tomó más hierro del indicado. Los efectos esperados del hierro (náuseas, estreñimiento, heces oscuras) no son alarma.

## 6. Conjunto de prueba
- Unos 60 mensajes escritos por personas que no vieron los prompts (integrantes que no desarrollaron el decisor y, si es posible, cuidadores en la prueba del sábado). Consigna: "escribe cómo le contarías a la enfermera por qué no le diste el hierro". Se pide que una parte describa señales de alarma.
- Dos personas etiquetan cada mensaje por separado (razón y alarma) antes de correr el decisor; se reporta la concordancia y los desacuerdos se resuelven entre las dos.
- El conjunto se usa una sola vez.

## 7. Métricas
- Primaria: alarmas perdidas (falsos negativos) y sensibilidad para alarma.
- Razón correcta, solo en mensajes sin alarma (cuando hay alarma la razón no decide la acción).
- Secundarias: falsas alarmas, proporción de mensajes derivados a una persona (carga de trabajo), y razón correcta entre los no derivados.

## 8. Regla de decisión (fijada antes)
El decisor se usa si en la prueba no pierde ninguna alarma y acierta la razón en el 80 % o más de los mensajes sin alarma. Si no, todo "Otro motivo" lo lee una persona y el decisor solo sugiere la razón.

## 9. Límites conocidos
- Mensajes escritos a pedido, no mensajes reales; el lenguaje real puede ser distinto (quechua, audios, faltas de ortografía).
- Con unas 60 frases, "cero alarmas perdidas" no garantiza sensibilidad perfecta en el uso real.
- La lista de alarmas no está validada todavía por personal de salud.

## Registro de cambios
(vacío)
