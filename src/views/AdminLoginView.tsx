import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Boxes, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  KeyRound,
  Crown,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUPER_ADMIN_EMAIL } from '../data/mockData';

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
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const superAdminEmail = SUPER_ADMIN_EMAIL;
  const superAdminName = 'Andrés Buitrago';

  const handleQuickLogin = (email = superAdminEmail, name = superAdminName) => {
    setAuthError(null);
    setIsLoading(true);
    setTimeout(() => {
      const result = loginWithGoogle(email, name);
      if (!result.success) {
        setAuthError(result.message);
      }
      setIsLoading(false);
    }, 450);
  };

  const handleCustomGoogleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    setAuthError(null);
    setIsLoading(true);
    setTimeout(() => {
      const derivedName = customName.trim() || customEmail.split('@')[0].replace('.', ' ');
      const result = loginWithGoogle(customEmail.trim(), derivedName);
      if (!result.success) {
        setAuthError(result.message);
      }
      setIsLoading(false);
    }, 450);
  };

  // Other authorized admins
  const authorizedOtherAdmins = adminAccounts.filter(
    (a) => a.email.toLowerCase() !== superAdminEmail.toLowerCase() && a.status === 'activo'
  );

  return (
    <div className="min-h-screen w-screen bg-stone-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-stone-800">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-stone-200/90 overflow-hidden">
        
        {/* Top Header Banner */}
        <div className="bg-stone-900 text-stone-100 p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-40 h-40 bg-emerald-700/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  StockPro
                </h1>
                <span className="text-[10px] font-extrabold tracking-widest px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full uppercase">
                  Admin Gate
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium">
                {clinicSettings.name || 'Gestión de Inventario'} • Sistema Privado
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700/80 text-xs font-semibold text-stone-300">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Acceso Privado Exclusivo para Administradores</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Auth Error Banner if unauthorized */}
          {authError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Acceso Denegado</p>
                <p className="mt-0.5 leading-relaxed">{authError}</p>
              </div>
            </div>
          )}

          {/* SuperAdmin Master Access Button */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500" />
                Acceso SuperAdmin Maestro
              </label>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded-full">
                Control Total
              </span>
            </div>

            {/* Primary SuperAdmin Card */}
            <div 
              onClick={() => handleQuickLogin(superAdminEmail, superAdminName)}
              className="p-4 bg-gradient-to-r from-amber-50/80 via-emerald-50/50 to-white hover:from-amber-100/80 hover:via-emerald-100/60 hover:to-stone-50 border-2 border-amber-300 hover:border-amber-400 rounded-2xl flex items-center justify-between cursor-pointer transition-all group shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-extrabold text-stone-900 group-hover:text-emerald-950">
                      {superAdminName}
                    </p>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                      SuperAdmin
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 font-mono font-medium">
                    {superAdminEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-2xs group-hover:bg-emerald-700 group-hover:text-white transition-all">
                <span>Ingresar</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Google Single Click Action */}
            <button
              id="google-admin-login-btn"
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickLogin(superAdminEmail, superAdminName)}
              className="w-full py-3 px-4 bg-white hover:bg-stone-50 active:scale-[0.99] border border-stone-300 hover:border-stone-400 text-stone-800 font-bold rounded-2xl shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              ) : (
                <GoogleLogo className="w-5 h-5 shrink-0" />
              )}
              <span className="text-xs sm:text-sm">
                {isLoading ? 'Autenticando...' : 'Iniciar Sesión con Google'}
              </span>
            </button>
          </div>

          {/* Other Authorized Admins (created by SuperAdmin) */}
          {authorizedOtherAdmins.length > 0 && (
            <div className="pt-2 border-t border-stone-100">
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                Otras Cuentas de Administrador Autorizadas por SuperAdmin:
              </p>
              <div className="space-y-2">
                {authorizedOtherAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    onClick={() => handleQuickLogin(admin.email, admin.name)}
                    className="p-3 bg-stone-50 hover:bg-emerald-50/70 border border-stone-200 hover:border-emerald-300 rounded-2xl flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-stone-700 text-white flex items-center justify-center font-bold text-xs">
                        {admin.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-stone-900 group-hover:text-emerald-900">
                            {admin.name}
                          </p>
                          <span className="text-[10px] text-stone-500 font-medium">
                            ({admin.role})
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-mono">
                          {admin.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-stone-600 group-hover:text-emerald-800">
                      <span>Acceder</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Google Email Login option with authorization check */}
          <div className="pt-2 border-t border-stone-100">
            {!showCustomForm ? (
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="text-xs text-stone-500 hover:text-stone-800 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Ingresar con otra cuenta de Google (Gmail / Workspace)
              </button>
            ) : (
              <form onSubmit={handleCustomGoogleLogin} className="space-y-3 pt-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Validar Cuenta Google Autorizada
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="text-[11px] text-stone-400 hover:text-stone-600 font-semibold cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
                <div>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@gmail.com o correo corporativo"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Solo podrán ingresar los correos que hayan sido autorizados previamente por el SuperAdmin ({superAdminEmail}).
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !customEmail.trim()}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <GoogleLogo className="w-4 h-4 shrink-0" />
                  <span>Validar Permisos y Acceder</span>
                </button>
              </form>
            )}
          </div>

          {/* Security Summary */}
          <div className="pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-[11px] text-stone-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>SuperAdmin Maestro Activo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Permisos Granulares</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Control de Inventario & POS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Moneda Pesos (COP)</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 text-center">
          <p className="text-[11px] text-stone-400 font-medium">
            StockPro • Autenticación segura de administrador
          </p>
        </div>

      </div>
    </div>
  );
};
