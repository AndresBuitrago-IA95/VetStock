import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Crown, 
  Search, 
  Check, 
  X, 
  Edit, 
  Trash2, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Mail, 
  Phone, 
  Database,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdminAccount, AdminRole, AdminPermissions } from '../types';
import { SUPER_ADMIN_EMAIL } from '../data/mockData';
import { formatDate, formatCOP } from '../utils/formatters';

// Generates a random 6-digit PIN so a new/edited account is never left
// without one (an unset PIN used to silently accept a guessable default).
const generateRandomPin = (): string => String(Math.floor(100000 + Math.random() * 900000));

export const AdminManagementView: React.FC = () => {
  const { 
    adminAccounts, 
    addAdminAccount, 
    updateAdminAccount, 
    deleteAdminAccount, 
    toggleAdminStatus,
    activeTenantEmail,
    switchActiveDatabase,
    getAdminDatabaseStats,
    setActiveTab,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminAccount | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<AdminRole>('Administrador');
  const [formNotes, setFormNotes] = useState('');
  const [formSecurityPin, setFormSecurityPin] = useState('');
  const [showFormPin, setShowFormPin] = useState(false);
  const [formPermissions, setFormPermissions] = useState<AdminPermissions>({
    canManageAdmins: false,
    canEditInventory: true,
    canSell: true,
    canEditSales: true,
    canViewReports: true,
    canDeleteProducts: false,
  });

  const openCreateModal = () => {
    setEditingAdmin(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('Administrador');
    setFormNotes('');
    // Auto-generate a real PIN up front so no account is ever created blank.
    setFormSecurityPin(generateRandomPin());
    setShowFormPin(true);
    setFormPermissions({
      canManageAdmins: false,
      canEditInventory: true,
      canSell: true,
      canEditSales: true,
      canViewReports: true,
      canDeleteProducts: false,
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (admin: AdminAccount) => {
    setEditingAdmin(admin);
    setFormName(admin.name);
    setFormEmail(admin.email);
    setFormPhone(admin.phone || '');
    setFormRole(admin.role);
    setFormNotes(admin.notes || '');
    setFormSecurityPin(admin.securityPin || '');
    setShowFormPin(false);
    setFormPermissions(admin.permissions || {
      canManageAdmins: admin.role === 'SuperAdmin',
      canEditInventory: true,
      canSell: true,
      canEditSales: true,
      canViewReports: true,
      canDeleteProducts: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleRoleChange = (role: AdminRole) => {
    setFormRole(role);
    if (role === 'SuperAdmin') {
      setFormPermissions({
        canManageAdmins: true,
        canEditInventory: true,
        canSell: true,
        canEditSales: true,
        canViewReports: true,
        canDeleteProducts: true,
      });
    } else if (role === 'Administrador') {
      setFormPermissions({
        canManageAdmins: false,
        canEditInventory: true,
        canSell: true,
        canEditSales: true,
        canViewReports: true,
        canDeleteProducts: true,
      });
    } else if (role === 'Supervisor') {
      setFormPermissions({
        canManageAdmins: false,
        canEditInventory: true,
        canSell: true,
        canEditSales: true,
        canViewReports: true,
        canDeleteProducts: false,
      });
    } else if (role === 'Cajero') {
      setFormPermissions({
        canManageAdmins: false,
        canEditInventory: false,
        canSell: true,
        canEditSales: false,
        canViewReports: false,
        canDeleteProducts: false,
      });
    } else if (role === 'Auxiliar') {
      setFormPermissions({
        canManageAdmins: false,
        canEditInventory: true,
        canSell: false,
        canEditSales: false,
        canViewReports: false,
        canDeleteProducts: false,
      });
    }
  };

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formName.trim()) return;
    if (!formSecurityPin.trim()) return;

    if (editingAdmin) {
      updateAdminAccount(editingAdmin.id, {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim() || undefined,
        role: formRole,
        notes: formNotes.trim() || undefined,
        permissions: formPermissions,
        securityPin: formSecurityPin.trim(),
      });
    } else {
      addAdminAccount({
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim() || undefined,
        role: formRole,
        status: 'activo',
        notes: formNotes.trim() || undefined,
        permissions: formPermissions,
        securityPin: formSecurityPin.trim(),
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formName)}&background=047857&color=fff`,
      });
    }

    setIsCreateModalOpen(false);
  };

  const handleSwitchAndGoToInventory = (email: string) => {
    switchActiveDatabase(email);
    setActiveTab('inventory');
  };

  const filteredAdmins = adminAccounts.filter((admin) => {
    const matchSearch =
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (admin.phone && admin.phone.includes(searchTerm));

    const matchRole = roleFilter === 'todos' || admin.role.toLowerCase() === roleFilter.toLowerCase();
    return matchSearch && matchRole;
  });

  const totalActive = adminAccounts.filter((a) => a.status === 'activo').length;
  const totalInactive = adminAccounts.filter((a) => a.status === 'inactivo').length;

  return (
    <div id="admin-management-view" className="space-y-6 animate-in fade-in duration-200">
      
      {/* SuperAdmin Master Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-extrabold tracking-widest uppercase flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Panel Maestro SuperAdmin
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {SUPER_ADMIN_EMAIL}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Gestión de Administradores y Bases de Datos
            </h2>
            
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Como SuperAdmin, autorizas cuentas Google para nuevos administradores. Cada administrador recibe automáticamente una <strong className="text-emerald-300 font-semibold">base de datos 100% independiente</strong> para su veterinaria o negocio.
            </p>
          </div>

          <button
            id="btn-add-new-admin"
            type="button"
            onClick={openCreateModal}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-lg shadow-emerald-900/40 transition-all self-start md:self-auto shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear / Autorizar Administrador</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
            Total Administradores
          </span>
          <span className="text-2xl font-extrabold text-stone-900 mt-1 block">
            {adminAccounts.length}
          </span>
          <span className="text-[10px] text-stone-500 mt-0.5 block">Bases de datos aisladas</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Accesos Activos
          </span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-1 block">
            {totalActive}
          </span>
          <span className="text-[10px] text-emerald-700/80 mt-0.5 block">Con permiso de ingreso</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
            Cuentas Inactivas
          </span>
          <span className="text-2xl font-extrabold text-amber-700 mt-1 block">
            {totalInactive}
          </span>
          <span className="text-[10px] text-stone-500 mt-0.5 block">Acceso suspendido</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">
            Base Activa Actual
          </span>
          <span className="text-sm font-extrabold text-purple-900 mt-1.5 truncate block font-mono">
            {activeTenantEmail}
          </span>
          <span className="text-[10px] text-purple-700 mt-0.5 block">Partición en edición</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo de Google o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 font-medium"
          />
        </div>

        {/* Role Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          {['todos', 'SuperAdmin', 'Administrador', 'Supervisor', 'Cajero', 'Auxiliar'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
                roleFilter === role
                  ? 'bg-stone-900 text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {role === 'todos' ? 'Todos los roles' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Admin Accounts Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/90 text-stone-600 border-b border-stone-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Usuario / Cuenta Google</th>
                <th className="py-3.5 px-3">Rol</th>
                <th className="py-3.5 px-3">Base de Datos Independiente</th>
                <th className="py-3.5 px-3">Estado</th>
                <th className="py-3.5 px-3">Último Acceso</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400 text-xs">
                    No se encontraron administradores con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isAccountSuper = admin.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                  const isCurrentActive = activeTenantEmail.toLowerCase() === admin.email.toLowerCase();
                  const stats = getAdminDatabaseStats(admin.email);

                  return (
                    <tr 
                      key={admin.id}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        isAccountSuper ? 'bg-amber-50/20' : ''
                      } ${isCurrentActive ? 'bg-emerald-50/30' : ''}`}
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-2xs ${
                            isAccountSuper ? 'bg-amber-600' : 'bg-emerald-700'
                          }`}>
                            {isAccountSuper ? <Crown className="w-4 h-4" /> : admin.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900">
                                {admin.name}
                              </span>
                              {isAccountSuper && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded text-[9px] font-extrabold uppercase tracking-wider">
                                  SuperAdmin
                                </span>
                              )}
                              {isCurrentActive && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[9px] font-extrabold uppercase tracking-wider">
                                  BD Activa
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-500 flex items-center gap-1 font-mono">
                              <Mail className="w-3 h-3 text-stone-400" />
                              {admin.email}
                            </span>
                            {admin.phone && (
                              <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                {admin.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          admin.role === 'SuperAdmin'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : admin.role === 'Administrador'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : admin.role === 'Supervisor'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : admin.role === 'Cajero'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-stone-100 text-stone-700'
                        }`}>
                          {admin.role}
                        </span>
                      </td>

                      {/* Independent Database Metrics */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-stone-50 border border-stone-200 rounded-xl space-y-0.5 min-w-[170px]">
                            <p className="text-[11px] font-bold text-stone-800 truncate">
                              {stats.clinicName}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-stone-500">
                              <span><strong>{stats.productsCount}</strong> prods</span>
                              <span>•</span>
                              <span><strong>{stats.salesCount}</strong> ventas</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">{formatCOP(stats.totalRevenue)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSwitchAndGoToInventory(admin.email)}
                            className="p-2 bg-stone-100 hover:bg-emerald-100 text-stone-600 hover:text-emerald-800 rounded-xl transition-colors cursor-pointer shrink-0"
                            title="Ver / Gestionar esta base de datos"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isAccountSuper}
                          onClick={() => toggleAdminStatus(admin.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                            admin.status === 'activo'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-stone-100 text-stone-500 border border-stone-300 hover:bg-stone-200'
                          } ${isAccountSuper ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${admin.status === 'activo' ? 'bg-emerald-600' : 'bg-stone-400'}`} />
                          {admin.status === 'activo' ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-3 text-stone-500 whitespace-nowrap">
                        {admin.lastLoginAt ? formatDate(admin.lastLoginAt, true) : 'Sin registro'}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(admin)}
                            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar permisos"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {!isAccountSuper && (
                            <button
                              type="button"
                              onClick={() => setAdminToDelete(admin)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar administrador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Admin */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            
            <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
              <div>
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  {editingAdmin ? 'Modificar Cuenta' : 'Nuevo Acceso'}
                </span>
                <h3 className="text-lg font-extrabold text-stone-900 mt-0.5">
                  {editingAdmin ? 'Editar Administrador' : 'Autorizar Nuevo Administrador'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdmin} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Laura Ramírez"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Correo de Google (Gmail o Workspace) *
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="laura.veterinaria@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Este correo tendrá una base de datos propia e independiente.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Teléfono / Celular
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Rol en el Sistema
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value as AdminRole)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="Administrador">Administrador (Base Propia)</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Cajero">Cajero</option>
                    <option value="Auxiliar">Auxiliar</option>
                    {editingAdmin?.role === 'SuperAdmin' && (
                      <option value="SuperAdmin">SuperAdmin</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Permisos */}
              <div className="pt-3 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Permisos Asignados
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canEditInventory}
                      onChange={(e) => setFormPermissions((p) => ({ ...p, canEditInventory: e.target.checked }))}
                      className="rounded text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>Gestionar Inventario</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canSell}
                      onChange={(e) => setFormPermissions((p) => ({ ...p, canSell: e.target.checked }))}
                      className="rounded text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>Realizar Ventas POS</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canEditSales}
                      onChange={(e) => setFormPermissions((p) => ({ ...p, canEditSales: e.target.checked }))}
                      className="rounded text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>Corregir / Eliminar Ventas</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canViewReports}
                      onChange={(e) => setFormPermissions((p) => ({ ...p, canViewReports: e.target.checked }))}
                      className="rounded text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>Ver Reportes Financieros</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canDeleteProducts}
                      onChange={(e) => setFormPermissions((p) => ({ ...p, canDeleteProducts: e.target.checked }))}
                      className="rounded text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>Eliminar Productos</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  PIN / Clave de Seguridad *
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showFormPin ? 'text' : 'password'}
                      required
                      value={formSecurityPin}
                      onChange={(e) => setFormSecurityPin(e.target.value)}
                      placeholder="PIN de acceso para esta cuenta"
                      autoComplete="off"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPin(!showFormPin)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showFormPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFormSecurityPin(generateRandomPin()); setShowFormPin(true); }}
                    className="p-2.5 bg-stone-100 hover:bg-emerald-100 text-stone-600 hover:text-emerald-800 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Generar un nuevo PIN aleatorio"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Comparte este PIN de forma segura con la persona; lo necesitará junto a su correo para iniciar sesión.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Notas u Observaciones
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ej: Administrador sede norte..."
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {editingAdmin ? 'Guardar Cambios' : 'Autorizar y Crear Base de Datos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-extrabold text-stone-900">
                ¿Eliminar Administrador?
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                ¿Estás seguro de revocar los accesos de <strong>{adminToDelete.name}</strong> ({adminToDelete.email})? Ya no podrá ingresar con su cuenta de Google.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAdminAccount(adminToDelete.id);
                  setAdminToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
