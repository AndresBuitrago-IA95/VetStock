import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { Session } from '@/lib/vetstock-data';

export const SESSION_COOKIE_NAME = 'andestock-session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
const developmentSecret = randomBytes(32).toString('hex');

type SessionPayload = Session & { expiresAt: number };

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (secret) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  if (process.env.NODE_ENV !== 'production') return developmentSecret;
  throw new Error('Falta configurar SESSION_SECRET para proteger las sesiones.');
}

export function createSessionToken(session: Session): string {
  const payload: SessionPayload = {
    ...session,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getSessionSecret()).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  const [encodedPayload, signature, extra] = token.split('.');
  if (!encodedPayload || !signature || extra) return null;

  try {
    const expectedSignature = createHmac('sha256', getSessionSecret()).update(encodedPayload).digest();
    const actualSignature = Buffer.from(signature, 'base64url');
    if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as SessionPayload;
    if (
      !payload.userId ||
      !payload.name ||
      !['superadmin', 'clinic'].includes(payload.role) ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now() ||
      (payload.role === 'clinic' && !payload.clinicId)
    ) {
      return null;
    }
    return {
      role: payload.role,
      userId: payload.userId,
      clinicId: payload.clinicId,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest): Session | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function setSessionCookie(response: Response, session: Session): void {
  const token = createSessionToken(session);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure}`,
  );
}

export function clearSessionCookie(response: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
  );
}
