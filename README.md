# AndeStock

Aplicación para que negocios de Andes, Antioquia, gestionen productos, existencias, ventas y alertas de inventario. La interfaz usa una identidad visual inspirada en los tonos verdes del paisaje cafetero y el dorado del café.

Los datos compartidos de la aplicación se guardan en Neon PostgreSQL. La primera conexión crea de forma idempotente la tabla `andestock_app_state`; si todavía no existe un estado, crea el superadmin inicial y deja las listas de negocios e inventario vacías. No se importan datos desde el navegador.

## Requisitos

- Node.js 18+
- npm
- Una base de datos Neon PostgreSQL

## Instalación local

```bash
npm install
npm run dev
```

Antes de iniciar por primera vez, crea `.env.local` con estas variables:

```env
POSTGRES_URL=postgresql://...
SESSION_SECRET=un-secreto-aleatorio-de-al-menos-32-caracteres
INITIAL_ADMIN_EMAIL=tu-correo-de-administracion
INITIAL_ADMIN_PASSWORD=una-contrasena-segura-de-12-caracteres-o-mas
```

`POSTGRES_URL` también puede llamarse `DATABASE_URL`. Mantén estas variables privadas; no uses el prefijo `NEXT_PUBLIC_`. `INITIAL_ADMIN_EMAIL` y `INITIAL_ADMIN_PASSWORD` solo son necesarios la primera vez que una base vacía se inicializa. La contraseña queda guardada en Neon; puedes quitar esas dos variables una vez que el primer inicio de sesión haya funcionado.

`SESSION_SECRET` debe ser un valor aleatorio y permanecer igual entre despliegues. Se usa para firmar una cookie HttpOnly de sesión.

## Despliegue en Vercel

1. En Neon, crea o selecciona el proyecto y copia la cadena de conexión PostgreSQL (preferiblemente la conexión pooled).
2. En Vercel, abre **Project → Settings → Environment Variables** y agrega `POSTGRES_URL`, `SESSION_SECRET`, `INITIAL_ADMIN_EMAIL` y `INITIAL_ADMIN_PASSWORD` para el entorno Production. No publiques ni compartas los valores.
3. Redepliega la aplicación.
4. Abre la app y entra con `INITIAL_ADMIN_EMAIL` y `INITIAL_ADMIN_PASSWORD`. La tabla y el estado vacío se crean al primer acceso. Confirma el inicio de sesión y, si lo deseas, elimina las variables iniciales de email y contraseña de Vercel.

Si Vercel ofrece la integración de Neon, esta puede proporcionar `POSTGRES_URL` automáticamente. Verifica que esté disponible en el mismo entorno donde despliegas.

## Desarrollo y validación

```bash
npm run build
npm run start
```

Si Neon no está configurado o no responde, la aplicación muestra un error y no confirma escrituras locales como si fueran datos guardados. El acceso a los datos requiere sesión; los usuarios de negocio solo consultan y actualizan sus propios datos.
