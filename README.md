# VetStock - Sistema de Gestión de Inventario Veterinario

Sistema completo de gestión de inventario y ventas para veterinarias con sincronización multi-dispositivo en tiempo real.

## Características Principales

- Gestión de productos con control de stock
- Registro de ventas (POS)
- Historial de movimientos de inventario
- Alertas de stock bajo y productos por vencer
- Panel de administración multi-usuario
- Sincronización automática entre dispositivos
- Base de datos en la nube
- Diseño responsive (móvil y desktop)

## Tecnologías

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + Node.js
- **Base de datos**: JSON persistente (archivo local)
- **Autenticación**: Google OAuth + PIN de seguridad

## Requisitos Previos

- Node.js 18+
- npm o bun

## Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/vetstock.git
cd vetstock

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Despliegue en Vercel

### Opción 1: Desde la CLI de Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

### Opción 2: Desde GitHub (Recomendado)

1. Haz fork de este repositorio
2. Ve a [vercel.com](https://vercel.com)
3. Importa tu repositorio de GitHub
4. Vercel detectará automáticamente la configuración
5. Haz clic en "Deploy"

### Variables de Entorno en Vercel

Configura estas variables en el panel de Vercel:

- `NODE_ENV=production`

## Uso

### Cuentas de Administrador por Defecto

El sistema incluye cuentas SuperAdmin preconfiguradas:

1. **SuperAdmin Principal**
   - Email: `andrezbuitrago82@gmail.com`
   - PIN: `8282`

2. **SuperAdmin Institucional**
   - Email: `andres.buitragos@udea.edu.co`
   - PIN: `8282`

### Sincronización

- La sincronización automática ocurre cada 30 segundos
- Usa el botón "Sincronizar" en el header para forzar actualización
- Los cambios se reflejan en todos los dispositivos conectados

## Estructura del Proyecto

```
vetstock/
├── src/
│   ├── components/      # Componentes React reutilizables
│   ├── context/         # Estado global (AppContext)
│   ├── hooks/           # Custom hooks (useSync)
│   ├── services/        # Cliente API
│   ├── utils/           # Utilidades y formateadores
│   ├── views/           # Vistas/páginas principales
│   └── types.ts         # Tipos TypeScript
├── data/                # Base de datos JSON persistente
├── server.ts            # Servidor Express
├── vercel.json          # Configuración de Vercel
└── package.json         # Dependencias y scripts
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/admins` - Listar administradores
- `POST /api/admins` - Crear administrador
- `PUT /api/admins/:id` - Actualizar administrador
- `DELETE /api/admins/:id` - Eliminar administrador

### Datos de Tenant
- `GET /api/tenant/:email` - Obtener datos del usuario
- `POST /api/tenant/:email` - Sincronizar datos

### Sistema
- `GET /api/health` - Health check

## Solución de Problemas

### Los cambios no se ven en otros dispositivos

1. Haz clic en el botón "Sincronizar" en el header
2. Verifica que ambos dispositivos tengan conexión a internet
3. La sincronización automática ocurre cada 30 segundos

### Error de conexión al servidor

1. Verifica que el servidor esté ejecutándose
2. En producción, verifica que la URL de la API sea correcta
3. Revisa los logs del servidor en Vercel

## Licencia

MIT

## Autor

Andrés Buitrago - [andrezbuitrago82@gmail.com](mailto:andrezbuitrago82@gmail.com)
