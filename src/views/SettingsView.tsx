import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Settings, 
  User, 
  Sliders, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  LogOut, 
  KeyRound, 
  Database,
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GoogleLogo } from './AdminLoginView';
import { formatCOP } from '../utils/formatters';

export const SettingsView: React.FC = () => {
  const {
    clinicSettings,
    updateClinicSettings,
    userProfile,
    updateUserProfile,
    adminUser,
    activeTenantEmail,
    logoutAdmin,
    products,
    stockMovements,
    sales,
    importDatabaseBackup,
    showToast,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clinic fields
  const [clinicName, setClinicName] = useState(clinicSettings.name);
  const [address, setAddress] = useState(clinicSettings.address);
  const [phone, setPhone] = useState(clinicSettings.phone);
  const [email, setEmail] = useState(clinicSettings.email);
  const [nit, setNit] = useState(clinicSettings.nit);

  // Inventory rule fields
  const [defaultMinStock, setDefaultMinStock] = useState(clinicSettings.defaultMinStock);
  const [expiringDaysThreshold, setExpiringDaysThreshold] = useState(clinicSettings.expiringDaysThreshold);

  // User fields
  const [userName, setUserName] = useState(userProfile.name);
  const [userEmail, setUserEmail] = useState(userProfile.email);
  const [userRole, setUserRole] = useState(userProfile.role);

  // Keep form state in sync when clinicSettings or userProfile changes
  useEffect(() => {
    setClinicName(clinicSettings.name);
    setAddress(clinicSettings.address);
    setPhone(clinicSettings.phone);
    setEmail(clinicSettings.email);
    setNit(clinicSettings.nit);
    setDefaultMinStock(clinicSettings.defaultMinStock);
    setExpiringDaysThreshold(clinicSettings.expiringDaysThreshold);
  }, [clinicSettings]);

  useEffect(() => {
    setUserName(userProfile.name);
    setUserEmail(userProfile.email);
    setUserRole(userProfile.role);
  }, [userProfile]);

  const handleSaveClinic = (e: React.FormEvent) => {
    e.preventDefault();
    updateClinicSettings({
      name: clinicName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      nit: nit.trim(),
      defaultMinStock: Number(defaultMinStock),
      expiringDaysThreshold: Number(expiringDaysThreshold),
    });
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name: userName.trim(),
      email: userEmail.trim(),
      role: userRole,
    });
  };

  // Export full backup JSON for current tenant
  const handleExportBackup = () => {
    const backup = {
      version: '2.0',
      tenantEmail: activeTenantEmail,
      exportedAt: new Date().toISOString(),
      clinicSettings,
      userProfile,
      products,
      stockMovements,
      sales,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = clinicSettings.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.download = `backup_${cleanName}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Copia de seguridad descargada exitosamente en archivo JSON', 'success');
  };

  // File import handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importDatabaseBackup(json);
      } catch (err) {
        showToast('Error al leer el archivo. Asegúrate de que sea un JSON válido.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalRevenue = sales.reduce((acc, s) => acc + (s.status !== 'anulada' ? s.total : 0), 0);

  return (
    <div id="settings-view" className="space-y-6 animate-in fade-in duration-200">
      
      {/* Banner de Base de Datos Independiente Activa */}
      <div className="bg-emerald-900 text-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-800/80 border border-emerald-700/50 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold tracking-tight">
                {clinicSettings.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 text-xs font-bold border border-emerald-700">
                Base de Datos Independiente
              </span>
            </div>
            <p className="text-xs text-emerald-200/90 mt-1">
              Partición exclusiva para <strong>{activeTenantEmail}</strong> • Cada administrador opera su inventario y facturación de forma 100% aislada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 bg-emerald-950/40 p-3 rounded-2xl border border-emerald-800/50">
          <div className="text-center px-2">
            <p className="text-[11px] text-emerald-300 uppercase font-semibold">Productos</p>
            <p className="text-base font-extrabold text-white">{products.length}</p>
          </div>
          <div className="w-px h-7 bg-emerald-800/80" />
          <div className="text-center px-2">
            <p className="text-[11px] text-emerald-300 uppercase font-semibold">Ventas</p>
            <p className="text-base font-extrabold text-white">{sales.length}</p>
          </div>
          <div className="w-px h-7 bg-emerald-800/80" />
          <div className="text-center px-2">
            <p className="text-[11px] text-emerald-300 uppercase font-semibold">Facturado</p>
            <p className="text-base font-extrabold text-emerald-300">{formatCOP(totalRevenue)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 1. DATOS DEL NEGOCIO / VETERINARIA & REGLAS DE INVENTARIO (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <form onSubmit={handleSaveClinic} className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  Configuración de la Veterinaria / Negocio
                </h3>
                <p className="text-xs text-stone-500">
                  Personaliza los datos de tu establecimiento reflejados en recibos, facturas e informes
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Nombre de la Veterinaria / Razón Social *
                </label>
                <input
                  id="settings-clinic-name"
                  type="text"
                  required
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Ej: Veterinaria San Roque & Pet Shop"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    NIT / RUT *
                  </label>
                  <input
                    id="settings-clinic-nit"
                    type="text"
                    required
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    placeholder="Ej: 900.123.456-1"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Teléfono / Celular / WhatsApp
                  </label>
                  <input
                    id="settings-clinic-phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: +57 310 000 0000"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Dirección y Ciudad
                </label>
                <input
                  id="settings-clinic-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Calle 10 # 20-30, Medellín / Bogotá"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Correo Electrónico de Contacto
                </label>
                <input
                  id="settings-clinic-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: contacto@miveterinaria.co"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              {/* Reglas de inventario */}
              <div className="pt-4 border-t border-stone-100">
                <div className="flex items-center gap-2 mb-3">
                  <Sliders className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Reglas de Inventario y Alertas
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Stock mínimo predeterminado
                    </label>
                    <div className="relative">
                      <input
                        id="settings-default-min-stock"
                        type="number"
                        min="1"
                        value={defaultMinStock}
                        onChange={(e) => setDefaultMinStock(Number(e.target.value))}
                        className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                      />
                      <span className="absolute right-3.5 top-2 text-xs text-stone-400">unidades</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Días de alerta para vencimiento
                    </label>
                    <div className="relative">
                      <input
                        id="settings-expiring-threshold"
                        type="number"
                        min="7"
                        max="365"
                        value={expiringDaysThreshold}
                        onChange={(e) => setExpiringDaysThreshold(Number(e.target.value))}
                        className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                      />
                      <span className="absolute right-3.5 top-2 text-xs text-stone-400">días antes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end">
              <button
                id="btn-save-clinic-settings"
                type="submit"
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Guardar Configuración de Mi Veterinaria
              </button>
            </div>
          </form>
        </div>

        {/* 2. PERFIL DE USUARIO & GESTIÓN DE BASE DE DATOS (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Tarjeta de Autenticación Google para Admin */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center">
                  <GoogleLogo className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    Administrador Autenticado
                  </h3>
                  <p className="text-[11px] text-stone-500">Acceso mediante Google OAuth</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Conectado
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={adminUser?.avatarUrl || userProfile.avatarUrl}
                  alt={adminUser?.name || userProfile.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-600/30"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-stone-900 truncate">
                    {adminUser?.name || userProfile.name}
                  </p>
                  <p className="text-[11px] text-stone-500 truncate">
                    {adminUser?.email || userProfile.email}
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-stone-500 pt-1 border-t border-stone-200/60 flex items-center justify-between">
                <span>Rol: <strong>{adminUser?.role || userProfile.role}</strong></span>
                <span className="font-semibold text-emerald-800">Base de Datos Propia</span>
              </div>
            </div>

            <button
              type="button"
              onClick={logoutAdmin}
              className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión Administrativa
            </button>
          </div>

          {/* Configuración de usuario activo */}
          <form onSubmit={handleSaveUser} className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
              <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  Perfil del Operador Activo
                </h3>
                <p className="text-xs text-stone-500">Datos visibles en el encabezado y ventas</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Nombre Completo
                </label>
                <input
                  id="settings-user-name"
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  id="settings-user-email"
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end">
              <button
                id="btn-save-user-settings"
                type="submit"
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Actualizar Perfil
              </button>
            </div>
          </form>

          {/* Backup & Import Copias de Seguridad */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
              <Database className="w-4 h-4 text-emerald-700" />
              <h4 className="font-bold text-stone-900 text-sm">
                Copias de Seguridad (JSON)
              </h4>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              className="hidden" 
            />

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-stone-600" />
                Descargar Copia de Seguridad de Mi Base de Datos (JSON)
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-700" />
                Restaurar / Importar Copia de Seguridad (JSON)
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
