"""Conjunto de DESARROLLO (escrito por el equipo para ajustar). No es la prueba."""
from clasificador.decidir import decidir

DEV = [
    ("no le gusta, lo escupe todito", "sabor", False),
    ("hace muecas y lo bota, dice que sabe feo", "sabor", False),
    ("ya van 3 días que no hace caca", "estrenimiento", False),
    ("está durito para hacer, llora cuando hace", "estrenimiento", False),
    ("le da náuseas después de tomarlo", "estomago", False),
    ("le duele la barriguita cuando se lo doy", "estomago", False),
    ("tiene diarrea desde el lunes", "diarrea", False),
    ("le dio soltura del estómago", "diarrea", False),
    ("se le están poniendo los dientes negros", "dientes", False),
    ("se terminó el frasco y en la posta no había", "se_acabo", False),
    ("no me dieron los sobrecitos este mes", "se_acabo", False),
    ("me olvidé, estuve trabajando toda la semana", "olvido", False),
    ("viajamos a la sierra y no lo llevé", "olvido", False),
    ("su papá no quiere que le dé", "otro", False),
    ("ok gracias", "otro", False),
    ("no quiere lactar nada y está muy decaído", "otro", True),
    ("vomita todo lo que le doy, hasta el agua", "estomago", True),
    ("vi sangre en su pañal cuando hizo caca", "otro", True),
    ("mi hijo mayor le dio medio frasco jugando", "otro", True),
    ("tuvo convulsiones anoche con fiebre", "otro", True),
]

ok_r = ok_a = perdidas = 0
for texto, razon, alarma in DEV:
    d = decidir(texto)
    ok_r += (not alarma) and d["razon"] == razon
    ok_a += d["alarma"] == alarma
    perdidas += alarma and not d["alarma"]
    marca = "" if ((alarma or d["razon"] == razon) and d["alarma"] == alarma) else "  <-- revisar"
    print(f'{texto[:45]:45} | {d["razon"]:13} {d["prob_razon"]:.2f} | alarma {d["alarma"]!s:5} {d["prob_alarma"]:.2f}{marca}')
print(f"\nRazón correcta (casos sin alarma): {ok_r}/{sum(not a for _, _, a in DEV)} | Alarma correcta: {ok_a}/{len(DEV)} | Alarmas perdidas: {perdidas}")
