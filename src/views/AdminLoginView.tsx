import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Boxes, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Crown, 
  UserCheck,
  Eye,
  EyeOff,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUPER_ADMIN_EMAIL } from '../data/mockData';
import { decodeGoogleCredential } from '../utils/googleAuth';

export const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const AdminLoginView: React.FC = () => {
  const { loginWithGoogle, clinicSettings, adminAccounts } = useApp();
  
  // Login form state
  const [selectedEmail, setSelectedEmail] = useState<string>(SUPER_ADMIN_EMAIL);
  const [securityPin, setSecurityPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'google_oauth' | 'email_pin'>('email_pin');

  const superAdminEmail = SUPER_ADMIN_EMAIL;
  const superAdminName = 'Andrés Buitrago';

  const googleBtnContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize Google Identity Services if available in window
  useEffect(() => {
    try {
      const google = (window as any).google;
      if (google?.accounts?.id && googleBtnContainerRef.current) {
        google.accounts.id.initialize({
          client_id: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com',
          callback: (response: any) => {
            if (response.credential) {
              const payload = decodeGoogleCredential(response.credential);
              if (payload?.email) {
                setIsLoading(true);
                const res = loginWithGoogle(
                  payload.email,
                  payload.name || payload.given_name || 'Administrador',
                  payload.picture,
                  { isGoogleVerified: true }
                );
                if (!res.success) {
                  setAuthError(res.message);
                  setIsLoading(false);
                }
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'pill',
        });
      }
    } catch (err) {
      console.warn('Google Identity Services SDK check:', err);
    }
  }, []);

  // Submit handler for Email + PIN verification
  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    const cleanEmail = selectedEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setAuthError('Por favor ingresa un correo de Google válido.');
      return;
    }

    if (!securityPin.trim()) {
      setAuthError('Por favor ingresa el PIN o clave de seguridad para validar el acceso.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const matchedAccount = adminAccounts.find(
        (a) => a.email.toLowerCase() === cleanEmail
      );
      const nameToUse = matchedAccount?.name || (cleanEmail === superAdminEmail.toLowerCase() ? superAdminName : 'Administrador');

      const result = loginWithGoogle(
        cleanEmail, 
        nameToUse, 
        matchedAccount?.avatarUrl, 
        { securityPin: securityPin.trim(), isGoogleVerified: false }
      );

      if (!result.success) {
        setAuthError(result.message);
      } else {
        setAuthSuccessMsg(result.message);
      }
      setIsLoading(false);
    }, 450);
  };

  // Google OAuth Popup Flow simulation & GSI invocation
  const handleGoogleOAuthPopup = () => {
    setAuthError(null);
    setAuthSuccessMsg(null);
    setIsLoading(true);

    const google = (window as any).google;
    if (google?.accounts?.oauth2) {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '',
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const userData = await res.json();
              if (userData?.email) {
                const loginRes = loginWithGoogle(
                  userData.email,
                  userData.name,
                  userData.picture,
                  { isGoogleVerified: true }
                );
                if (!loginRes.success) {
                  setAuthError(loginRes.message);
                }
              }
            } catch (fetchErr) {
              setAuthError('Error al contactar los servidores de Google OAuth.');
            }
          }
          setIsLoading(false);
        },
      });
      client.requestAccessToken();
    } else {
      // In preview sandbox without Google Client ID credentials, prompt the user to use the Security PIN verification
      setTimeout(() => {
        setIsLoading(false);
        setAuthMode('email_pin');
        setAuthError(
          'Para validar tu cuenta Google sin credenciales OAuth externas en este entorno, utiliza la Verificación Segura con PIN / Clave Maestra.'
        );
      }, 500);
    }
  };

  const isSelectedSuper = selectedEmail.trim().toLowerCase() === superAdminEmail.toLowerCase();

  return (
    <div className="min-h-screen w-screen bg-stone-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-stone-800">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-stone-200/90 overflow-hidden">
        
        {/* Top Header Banner */}
        <div className="bg-stone-900 text-stone-100 p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-40 h-40 bg-emerald-700/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  StockPro
                </h1>
                <span className="text-[10px] font-extrabold tracking-widest px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full uppercase">
                  Acceso Seguro
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium">
                {clinicSettings.name || 'Gestión de Inventario'} • Autenticación Administrativa
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800/90 border border-stone-700/80 text-xs font-semibold text-stone-300">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Validación de Identidad y Cuentas Google Autorizadas</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Auth Error Banner */}
          {authError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error de Validación</p>
                <p className="mt-0.5 leading-relaxed">{authError}</p>
              </div>
            </div>
          )}

          {/* Auth Success Banner */}
          {authSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Acceso Autorizado</p>
                <p className="mt-0.5 leading-relaxed">{authSuccessMsg}</p>
              </div>
            </div>
          )}

          {/* Auth Method Switcher */}
          <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200">
            <button
              type="button"
              onClick={() => { setAuthMode('email_pin'); setAuthError(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'email_pin'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
              <span>Verificación con PIN</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode('google_oauth'); setAuthError(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'google_oauth'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <GoogleLogo className="w-3.5 h-3.5" />
              <span>Google Identity (GIS)</span>
            </button>
          </div>

          {/* MODE 1: Email + PIN Authentication */}
          {authMode === 'email_pin' && (
            <form onSubmit={handlePinLogin} className="space-y-4">
              
              {/* Account selection / input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Correo de Google Autorizado *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    placeholder="ejemplo@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                  {isSelectedSuper && (
                    <span className="absolute right-3 top-2.5 px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-md flex items-center gap-1 border border-amber-200">
                      <Crown className="w-3 h-3 text-amber-600" /> SuperAdmin
                    </span>
                  )}
                </div>
              </div>

              {/* Security PIN input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-stone-500" />
                    PIN o Clave de Seguridad *
                  </label>
                  <span className="text-[10px] text-stone-400 font-medium">
                    Asignado por el SuperAdmin
                  </span>
                </div>
                
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    value={securityPin}
                    onChange={(e) => setSecurityPin(e.target.value)}
                    placeholder="Ingresa tu PIN de acceso"
                    autoComplete="off"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-bold text-stone-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isSelectedSuper && (
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center gap-2 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-950">SuperAdmin Maestro</p>
                    <p className="text-[11px] text-amber-800/80 font-mono">{superAdminEmail}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Validando Seguridad...' : 'Validar Identidad y Acceder'}</span>
              </button>
            </form>
          )}

          {/* MODE 2: Google Identity Services (GIS) */}
          {authMode === 'google_oauth' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs text-stone-600">
                <p className="font-bold text-stone-800 flex items-center gap-1.5">
                  <GoogleLogo className="w-4 h-4" /> Autenticación Directa Google Identity Services
                </p>
                <p className="leading-relaxed text-[11px]">
                  Al iniciar sesión, el sistema valida que tu cuenta de Google pertenezca a la lista de administradores autorizados por el SuperAdmin ({superAdminEmail}).
                </p>
              </div>

              <div ref={googleBtnContainerRef} className="min-h-[44px] flex justify-center" />

              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogleOAuthPopup}
                className="w-full py-3 px-4 bg-white hover:bg-stone-50 active:scale-[0.99] border border-stone-300 hover:border-stone-400 text-stone-800 font-bold rounded-2xl shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GoogleLogo className="w-5 h-5 shrink-0" />
                )}
                <span className="text-xs sm:text-sm">
                  {isLoading ? 'Conectando con Google...' : 'Iniciar Sesión con Cuenta de Google'}
                </span>
              </button>
            </div>
          )}

          {/* Security Summary */}
          <div className="pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-[11px] text-stone-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Validación Criptográfica</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Base de Datos Aislada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Protección Anti-Bypass</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>SuperAdmin Maestro</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 text-center">
          <p className="text-[11px] text-stone-400 font-medium">
            StockPro • Sistema de Inventario y Ventas Privado
          </p>
        </div>

      </div>
    </div>
  );
};
