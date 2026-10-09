import { NextRequest, NextResponse } from 'next/server';
import { readAppStateFile } from '@/lib/vetstock-data';
import { clearSessionCookie, getSessionFromRequest } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const state = await readAppStateFile();
    const isValid = session.role === 'superadmin'
      ? state.superAdmin.id === session.userId
      : state.clinics.some(
          (clinic) => clinic.id === session.clinicId && clinic.id === session.userId && clinic.authorized,
        );

    if (!isValid) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      clearSessionCookie(response);
      return response;
    }
    return NextResponse.json({ user: session }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('API /api/auth/session Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo validar la sesión.' },
      { status: 503 },
    );
  }
}
