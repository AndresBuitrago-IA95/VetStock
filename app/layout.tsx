import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VetStock | Sistema de gestión para clínicas y veterinarias',
  description:
    'VetStock ayuda a clínicas y veterinarias a gestionar ventas, inventario, clientes, agenda y reportes desde un solo lugar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
