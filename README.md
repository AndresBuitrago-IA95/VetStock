# VetStock

Aplicación MVP para gestión de veterinarias con dos tipos de acceso:

- Superadmin: puede iniciar sesión y registrar veterinarias autorizadas.
- Veterinarias: pueden iniciar sesión si fueron autorizadas por el superadmin.

La app se enfoca en la gestión de inventario, alerta de stock bajo y dashboard básico de ventas.

## Cuentas demo

- Superadmin: admin@vetstock.com / admin123
- Clínica autorizada: sanpablo@vetstock.com / clinic123

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## Producción

```bash
npm run build
npm run start
```

## Despliegue recomendado

Para que las cuentas y los cambios estén disponibles desde varios dispositivos e instancias, configura estas variables de entorno de Upstash Redis en el servicio:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Sin estas variables, el estado solo se conserva en memoria y no se comparte entre instancias; la aplicación mostrará un aviso de almacenamiento en vez de indicar que la contraseña es incorrecta cuando no pueda encontrar una veterinaria.

### Vercel

1. Conecta este repositorio con Vercel.
2. Usa el preset de Next.js.
3. Haz deploy con la configuración por defecto.

### Railway

1. Crea un servicio desde el repositorio.
2. Build: `npm install && npm run build`
3. Start: `npm run start`

## Nota

Esta versión es un prototipo funcional para validar la lógica de negocio y la administración de veterinarias antes de vender la solución.
