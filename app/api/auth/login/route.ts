import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, readAppStateFile } from '@/lib/vetstock-data';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { email?: string; password?: string };
    const email = payload.email ?? '';
    const password = payload.password ?? '';

    const appState = await readAppStateFile();
    const session = authenticateUser(email, password, appState);

    if (!session) {
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
