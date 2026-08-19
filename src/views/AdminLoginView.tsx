import React, { useState } from 'react';
import { Mail, AlertCircle, CheckCircle2, Boxes, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function AdminLoginView() {
  const { loginWithGoogle, clinicSettings } = useApp();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Secure Firebase Google Auth Login
  const handleFirebaseGoogleLogin = async () => {
    setAuthError(null);
    setAuthSuccessMsg(null);
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (user && user.email) {
        // Enforce verified emails for security
        if (!user.emailVerified) {
          throw new Error('Tu cuenta de Google no está verificada. Por seguridad, no puedes acceder.');
        }

        const loginRes = await loginWithGoogle(
          user.email,
          user.displayName || 'Administrador',
          user.photoURL || undefined,
          { isGoogleVerified: true }
        );

        if (!loginRes.success) {
          setAuthError(loginRes.message);
          // Sign out immediately if unauthorized
          auth.signOut();
        } else {
          setAuthSuccessMsg(loginRes.message);
        }
      } else {
        throw new Error('No se pudo obtener la información del correo de Google.');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Autenticación cancelada.');
      } else {
        setAuthError(err.message || 'Error al contactar los servidores de Google OAuth.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-stone-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-stone-800">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-stone-200/90 overflow-hidden">
        
        {/* Top Header Banner */}
        <div className="bg-stone-900 text-stone-100 p-6 sm:p-7 relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-40 h-40 bg-emerald-700/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col items-center gap-2 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
              <Boxes className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                StockPro
              </h1>
              <span className="text-[10px] font-extrabold tracking-widest px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full uppercase">
                Privado
              </span>
            </div>
            <p className="text-xs text-stone-400 font-medium">
              {clinicSettings.name || 'Gestión de Inventario y Ventas'}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-stone-800/90 border border-stone-700/80 text-[11px] font-semibold text-stone-300">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Acceso Seguro con Firebase</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-7 space-y-6">
          
          {/* Auth Error Banner */}
          {authError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error de Validación</p>
                <p className="mt-0.5 leading-relaxed">{authError}</p>
              </div>
            </div>
          )}

          {/* Auth Success Banner */}
          {authSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Acceso Autorizado</p>
                <p className="mt-0.5 leading-relaxed">{authSuccessMsg}</p>
              </div>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm font-medium text-stone-600 mb-6">
              Inicia sesión con tu cuenta de Google corporativa o autorizada para sincronizar tus datos en la nube.
            </p>
            
            <button
              type="button"
              onClick={handleFirebaseGoogleLogin}
              disabled={isLoading}
              className="w-full relative flex items-center justify-center gap-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold py-3.5 px-4 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin"></div>
                  <span>Validando Seguridad...</span>
                </>
              ) : (
                <>
                  <GoogleLogo className="w-5 h-5" />
                  <span>Continuar con Google</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-stone-50 p-4 border-t border-stone-100 text-center">
          <p className="text-[10px] text-stone-400 font-medium">
            Solo personal administrativo autorizado. Todo acceso es registrado y monitorizado en tiempo real.
          </p>
        </div>

      </div>
    </div>
  );
}
