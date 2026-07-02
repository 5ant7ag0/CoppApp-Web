import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import api from '../services/api';
import { 
  Loader2, 
  LogOut, 
  Users, 
  CreditCard, 
  Settings,
  Briefcase,
  Monitor
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const { activeTenant } = useTenant();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const activePath = location.pathname;

  // Logo institucional dinámico
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const fetchLogo = async () => {
    try {
      const res = await api.get('/empresas/mi-perfil');
      if (res.data?.logoUrl) {
        const url = res.data.logoUrl.startsWith('http') 
          ? res.data.logoUrl 
          : `http://localhost:8080/api/v1${res.data.logoUrl}`;
        setLogoUrl(url);
      } else {
        setLogoUrl(null);
      }
    } catch (err) {
      console.error('Error fetching company logo in sidebar:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchLogo();
      
      const handleLogoUpdated = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail) {
          const url = customEvent.detail.startsWith('http')
            ? customEvent.detail
            : `http://localhost:8080/api/v1${customEvent.detail}`;
          setLogoUrl(url);
        } else {
          fetchLogo();
        }
      };

      window.addEventListener('logo-updated', handleLogoUpdated);
      return () => {
        window.removeEventListener('logo-updated', handleLogoUpdated);
      };
    }
  }, [isAuthenticated, activeTenant]);


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#0054A6]" />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.rol === 'SOCIO') {
    return <Navigate to="/login" replace />;
  }

  if (user.detalles?.cambiarPasswordProximoInicio) {
    return <Navigate to="/forzar-cambio-password" replace />;
  }

  const initials = user?.nombresCompletos
    ? user.nombresCompletos.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : 'U';

  const isContabilidadRoute = activePath.startsWith('/admin/contabilidad');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans p-4 md:p-6 gap-6 relative select-none">
      
      {/* 2. Floating Sidebar (Desktop) matching SocioLayout */}
      <aside className="w-64 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[2rem] p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,84,166,0.04)] md:sticky md:top-6 md:h-[calc(100vh-3rem)] shrink-0 transition-transform duration-300 z-50">
        <div className="space-y-8 flex flex-col flex-1 min-h-0">
          
          {/* Brand Logo & Institution */}
          <div className="flex flex-col items-center justify-center text-center gap-3 px-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Institucional"
                className="w-full max-h-24 object-contain select-none"
                onError={() => setLogoUrl(null)}
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-[#0054A6] flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-blue-600/30 select-none">
                {activeTenant?.name ? activeTenant.name.charAt(0).toUpperCase() : 'C'}
              </div>
            )}
            <span className="font-bold tracking-tight text-slate-800 text-xs leading-snug text-center max-w-full">
              {activeTenant?.name || 'CoopApp'}
            </span>
          </div>

          <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto scrollbar-none pr-1">
            {/* GRUPO 1: BALCÓN DE SERVICIOS */}
            {(user?.rol === 'OFICIAL_DE_CREDITO' || user?.rol === 'CONTADOR' || user?.rol === 'GERENTE_GENERAL' || user?.rol === 'SUPER_ADMIN_SAAS' || user?.rol === 'ADMINISTRADOR' || user?.rol === 'CAJERO') && (
              <>
                <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 mt-2 select-none">
                  Balcón de Servicios
                </span>
                {(user?.rol === 'OFICIAL_DE_CREDITO' || user?.rol === 'CONTADOR' || user?.rol === 'GERENTE_GENERAL' || user?.rol === 'SUPER_ADMIN_SAAS' || user?.rol === 'ADMINISTRADOR') && (
                  <Link
                    to="/admin/socios"
                    className={
                      activePath === '/admin/socios'
                        ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                        : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                    }
                  >
                    <Users className="h-5 w-5 shrink-0" />
                    <span>{user?.rol === 'CONTADOR' ? 'Socios (Consulta)' : 'Socios'}</span>
                  </Link>
                )}
                {(user?.rol === 'OFICIAL_DE_CREDITO' || user?.rol === 'CONTADOR' || user?.rol === 'GERENTE_GENERAL' || user?.rol === 'SUPER_ADMIN_SAAS' || user?.rol === 'ADMINISTRADOR') && (
                  <Link
                    to="/admin/creditos"
                    className={
                      activePath === '/admin/creditos'
                        ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                        : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                    }
                  >
                    <CreditCard className="h-5 w-5 shrink-0" />
                    <span>{user?.rol === 'CONTADOR' ? 'Créditos (Consulta)' : 'Créditos'}</span>
                  </Link>
                )}
                {user?.rol === 'CAJERO' && (
                  <Link
                    to="/admin/dashboard"
                    className={
                      activePath === '/admin/dashboard'
                        ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                        : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                    }
                  >
                    <Monitor className="h-5 w-5 shrink-0" />
                    <span>Ventanilla</span>
                  </Link>
                )}
              </>
            )}

            {/* GRUPO 2: FINANZAS Y CONTROL */}
            {(user?.rol === 'CONTADOR' || user?.rol === 'GERENTE_GENERAL' || user?.rol === 'SUPER_ADMIN_SAAS' || user?.rol === 'ADMINISTRADOR') && (
              <>
                <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 mt-6 select-none">
                  Finanzas y Control
                </span>
                <Link
                  to="/admin/contabilidad"
                  className={
                    isContabilidadRoute
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <Briefcase className="h-5 w-5 shrink-0" />
                  <span>Contabilidad</span>
                </Link>
              </>
            )}

            {(user?.rol === 'ADMINISTRADOR' || user?.rol === 'GERENTE_GENERAL' || user?.rol === 'SUPER_ADMIN_SAAS') && (
              <>
                <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 mt-6 select-none">
                  Sistema
                </span>
                <Link
                  to="/admin/parametrizacion"
                  className={
                    activePath === '/admin/parametrizacion'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  <span>Parametrización</span>
                </Link>
                <Link
                  to="/admin/gestion-equipo"
                  className={
                    activePath === '/admin/gestion-equipo'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <Users className="h-5 w-5 shrink-0" />
                  <span>Gestión de Equipo</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Footer Sidebar with elegant user profile and SocioLayout logout button */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="group relative">
            <div className="flex items-center gap-3 px-2 p-2 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
              <div className="h-9 w-9 rounded-full bg-[#0054A6]/10 border border-[#0054A6]/20 font-black text-xs text-[#0054A6] flex items-center justify-center shrink-0 select-none overflow-hidden">
                {user?.detalles?.fotoPerfilUrl || (user as any)?.fotoPerfilUrl ? (
                  <img src={user?.detalles?.fotoPerfilUrl || (user as any)?.fotoPerfilUrl} alt="Perfil" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                  {user.nombresCompletos}
                </p>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase ${
                    user.rol === 'GERENTE_GENERAL' || user.rol === 'SUPER_ADMIN_SAAS'
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : user.rol === 'CAJERO'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-blue-50 text-blue-600 border border-blue-100'
                  }`}>
                    {user.rol === 'OFICIAL_DE_CREDITO' ? 'OFICIAL DE CRÉDITO' : user.rol === 'CONTADOR' ? 'CONTADOR' : user.rol.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Hover Menu */}
            <div className="absolute bottom-0 left-full ml-4 w-[160px] opacity-0 -translate-x-3 invisible group-hover:opacity-100 group-hover:translate-x-0 group-hover:visible transition-all duration-300 ease-out z-50">
              <div className="bg-white/95 backdrop-blur-xl border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.08)] rounded-2xl p-1.5 overflow-hidden relative">
                {/* Flecha lateral */}
                <div className="absolute top-[22px] -left-[5px] w-2.5 h-2.5 bg-white border-l border-b border-slate-100 rotate-45" />
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors cursor-pointer group/btn"
                >
                  <div className="h-7 w-7 rounded-lg bg-white/60 flex items-center justify-center group-hover/btn:bg-white transition-colors shrink-0 shadow-[0_1px_2px_rgba(225,29,72,0.1)]">
                    <LogOut className="h-3.5 w-3.5 text-rose-500 group-hover/btn:text-rose-600" />
                  </div>
                  <span className="truncate">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 3. Área de Trabajo (Main Workspace) */}
      <main className="flex-1 min-w-0 flex flex-col md:py-2 space-y-6">
        
        {/* Content Outlet */}
        <div className="flex-1 w-full overflow-y-auto pb-8 scrollbar-none pr-1">
          <Outlet />
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <AnimatePresence mode="wait">
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full flex flex-col items-center text-center"
            >
              <div className="h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-4 shadow-sm border border-rose-100">
                <LogOut className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">¿Cerrar sesión?</h3>
              <p className="text-xs text-slate-500 font-medium mb-6">
                Estás a punto de salir del sistema de forma segura. ¿Deseas continuar?
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    logout();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
