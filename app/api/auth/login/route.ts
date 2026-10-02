import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, hasSharedPersistenceConfigured, readAppStateFile } from '@/lib/vetstock-data';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { email?: string; password?: string };
    const email = payload.email ?? '';
    const password = payload.password ?? '';

    let appState;
    try {
      appState = await readAppStateFile();
    } catch {
      return NextResponse.json(
        { error: 'No se pudo verificar la cuenta. Revisa la conexión del almacenamiento compartido.' },
        { status: 503 },
      );
    }

    const session = authenticateUser(email, password, appState);

    if (!session) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!hasSharedPersistenceConfigured() && normalizedEmail !== appState.superAdmin.email.toLowerCase()) {
        return NextResponse.json(
          { error: 'No se pueden verificar las credenciales de la veterinaria entre dispositivos. Configura Upstash Redis para sincronizar las cuentas.' },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: 'Credenciales incorrectas o la veterinaria no está autorizada.' },
        { status: 401 },
      );
    }

    return NextResponse.json({ user: session });
  } catch {
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 });
  }
}
