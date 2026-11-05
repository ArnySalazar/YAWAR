# Publicar el panel con inicio de sesión

El panel compilado lo sirve la misma API, en un solo dominio con HTTPS. El túnel de Cloudflare
lleva ese dominio hasta la computadora donde corre la API, sin abrir puertos del router.

## Por qué así

- Un dominio propio con certificado válido, por el puerto 443, se ve como cualquier página web.
  Los dominios gratuitos de túneles (por ejemplo `*.ngrok-free.app`) suelen estar bloqueados en
  redes institucionales y muestran una página de advertencia.
- El panel no carga nada de terceros (las fuentes van dentro del panel) y no se encontraron rutas
  que bloqueen EasyList, EasyPrivacy ni los filtros de uBlock Origin.
- Panel y API en el mismo origen: no hace falta CORS y la cookie de sesión es `HttpOnly`,
  `Secure` y `SameSite=Strict`.
- La API responde con `noindex` y `robots.txt` bloquea a los buscadores.

## 1. Compilar el panel

```bash
cd panel
npm run build          # crea panel/dist
```

`VITE_ESTABLECIMIENTOS` se lee al compilar (de `panel/.env.local`); deja solo los que se deben ver.

## 2. Configurar la API (.env)

```
PANEL_LOGIN=1
MOSTRAR_DOCS=0
SESION_COOKIE_SEGURA=1
```

Crear el usuario de cada persona (la contraseña se escribe en pantalla, mínimo 10 caracteres):

```bash
python -m scripts.usuarios crear enfermera1 "Lic. de turno"
python -m scripts.usuarios lista
```

Encender la API solo en la computadora (el túnel entra por localhost):

```bash
uvicorn api.main:app --host 127.0.0.1 --port 8000
```

## 3. Túnel de Cloudflare (Windows)

Requisito: el dominio usa los DNS de Cloudflare.

```powershell
winget install --id Cloudflare.cloudflared
cloudflared tunnel login
cloudflared tunnel create yawar
cloudflared tunnel route dns yawar <subdominio.tu-dominio>
```

`%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: yawar
credentials-file: C:\Users\<usuario>\.cloudflared\<ID-del-túnel>.json
ingress:
  - hostname: <subdominio.tu-dominio>
    service: http://localhost:8000
  - service: http_status:404
```

```powershell
cloudflared tunnel run yawar
```

## Comprobar

- `https://<subdominio>/` abre la pantalla "Ingresar al panel".
- `https://<subdominio>/api/establecimientos/EESS01/lista` sin sesión responde 401.
- `https://<subdominio>/salud` responde `{"ok": true, ...}`.

El webhook de WhatsApp (`/webhook`) no usa la sesión: lo protege la firma de Meta.
