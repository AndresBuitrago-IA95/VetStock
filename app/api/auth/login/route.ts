import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, readAppStateFile } from '@/lib/vetstock-data';
import { setSessionCookie } from '@/lib/session-auth';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { email?: string; password?: string };
    const appState = await readAppStateFile();
    const session = authenticateUser(payload.email ?? '', payload.password ?? '', appState);

    if (!session) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas o el negocio no está autorizado.' },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ user: session });
    setSessionCookie(response, session);
    return response;
  } catch (error) {
    console.error('API /api/auth/login Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo iniciar sesión.' },
      { status: 503 },
    );
  }
}
