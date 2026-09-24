import { NextRequest, NextResponse } from 'next/server';
import { readAppStateFile, writeAppStateFile, type AppState } from '@/lib/vetstock-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const state = readAppStateFile();
  return NextResponse.json(state);
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as AppState;

    if (!payload || !payload.superAdmin || !Array.isArray(payload.clinics)) {
      return NextResponse.json({ error: 'Estado inválido: estructura incorrecta' }, { status: 400 });
    }

    writeAppStateFile(payload);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('API /api/state Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo guardar el estado en el servidor' },
      { status: 500 },
    );
  }
}

