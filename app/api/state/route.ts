import { NextRequest, NextResponse } from 'next/server';
import { readAppStateFile, writeAppStateFile, type AppState } from '@/lib/vetstock-data';
import { getSessionFromRequest } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Debes iniciar sesión para consultar los datos.' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const state = await readAppStateFile();
    if (session.role === 'superadmin') {
      if (state.superAdmin.id !== session.userId) {
        return NextResponse.json({ error: 'La sesión ya no es válida.' }, { status: 401, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json(state, { headers: NO_CACHE_HEADERS });
    }

    const clinic = state.clinics.find((item) => item.id === session.clinicId && item.authorized);
    if (!clinic || session.userId !== clinic.id) {
      return NextResponse.json({ error: 'El negocio ya no está autorizado.' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({
      ...state,
      superAdmin: { ...state.superAdmin, password: '' },
      clinics: [{ ...clinic, password: '' }],
    }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('API /api/state GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo leer el estado de Neon.' },
      { status: 503, headers: NO_CACHE_HEADERS },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Debes iniciar sesión para guardar los datos.' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const payload = (await request.json()) as AppState;

    if (!payload || !payload.superAdmin || !Array.isArray(payload.clinics)) {
      return NextResponse.json({ error: 'Estado inválido: estructura incorrecta' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const currentState = await readAppStateFile();
    if (session.role === 'superadmin') {
      if (currentState.superAdmin.id !== session.userId) {
        return NextResponse.json({ error: 'La sesión ya no es válida.' }, { status: 401, headers: NO_CACHE_HEADERS });
      }
      const savedState = await writeAppStateFile(payload);
      return NextResponse.json(savedState, { headers: NO_CACHE_HEADERS });
    }

    if (
      session.userId !== session.clinicId ||
      payload.clinics.length !== 1 ||
      payload.clinics[0].id !== session.clinicId
    ) {
      return NextResponse.json({ error: 'No tienes permiso para modificar otros negocios.' }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const currentClinic = currentState.clinics.find(
      (clinic) => clinic.id === session.clinicId && clinic.authorized,
    );
    if (!currentClinic) {
      return NextResponse.json({ error: 'El negocio ya no está autorizado.' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const submittedClinic = payload.clinics[0];
    const collections = [
      submittedClinic.inventory,
      submittedClinic.sales,
      submittedClinic.purchases,
      submittedClinic.clients,
      submittedClinic.suppliers,
      submittedClinic.employees,
      submittedClinic.cashFlow,
    ];
    if (collections.some((collection) => !Array.isArray(collection))) {
      return NextResponse.json({ error: 'Estado inválido: faltan listas de datos del negocio.' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const savedState = await writeAppStateFile({
      ...currentState,
      clinics: currentState.clinics.map((clinic) =>
        clinic.id === currentClinic.id
          ? {
              ...currentClinic,
              inventory: submittedClinic.inventory,
              sales: submittedClinic.sales,
              purchases: submittedClinic.purchases,
              clients: submittedClinic.clients,
              suppliers: submittedClinic.suppliers,
              employees: submittedClinic.employees,
              cashFlow: submittedClinic.cashFlow,
            }
          : clinic,
      ),
    });
    const savedClinic = savedState.clinics.find((clinic) => clinic.id === session.clinicId);
    return NextResponse.json({
      ...savedState,
      superAdmin: { ...savedState.superAdmin, password: '' },
      clinics: savedClinic ? [{ ...savedClinic, password: '' }] : [],
    }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('API /api/state Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo guardar el estado en Neon.' },
      { status: 503, headers: NO_CACHE_HEADERS },
    );
  }
}
