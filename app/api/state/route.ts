import { NextRequest, NextResponse } from 'next/server';
import { readAppStateFile, writeAppStateFile, type AppState } from '@/lib/vetstock-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  const state = await readAppStateFile();
  return NextResponse.json(state, { headers: NO_CACHE_HEADERS });
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as AppState;

    if (!payload || !payload.superAdmin || !Array.isArray(payload.clinics)) {
      return NextResponse.json({ error: 'Estado inválido: estructura incorrecta' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const savedState = await writeAppStateFile(payload);
    return NextResponse.json(savedState, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('API /api/state Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo guardar el estado en el servidor' },
      { status: 500, headers: NO_CACHE_HEADERS },
    );
  }
}
