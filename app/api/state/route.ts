import { NextRequest, NextResponse } from 'next/server';
import { readAppStateFile, writeAppStateFile, type AppState } from '@/lib/vetstock-data';

export async function GET() {
  const state = readAppStateFile();
  return NextResponse.json(state);
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as AppState;

    if (!payload || !payload.superAdmin || !Array.isArray(payload.clinics)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    writeAppStateFile(payload);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar el estado' }, { status: 500 });
  }
}
