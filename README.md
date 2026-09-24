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
