import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, LogOut, Home, Send, CreditCard, User, Menu, History, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { useTenant } from '../context/TenantContext';

export const SocioLayout: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const { activeTenant } = useTenant();
  const [mobileOpen, setMobileOpen] = useState(false);
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0054A6]" />
          <p className="text-sm text-slate-500 font-medium">Cargando canales seguros...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.rol !== 'SOCIO') {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { to: '/socio/dashboard', label: 'Inicio', icon: Home },
    { to: '/socio/movimientos', label: 'Movimientos', icon: History },
    { to: '/socio/transferencias', label: 'Transferir', icon: Send },
    { to: '/socio/inversiones', label: 'Inversiones', icon: TrendingUp },
    { to: '/socio/creditos', label: 'Créditos', icon: CreditCard },
    { to: '/socio/perfil', label: 'Perfil', icon: User },
  ];

  const getLinkClass = ({ isActive }: { isActive: boolean }) => {
    return isActive
      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans p-4 md:p-6 gap-6 relative select-none">
      
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm z-40">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-8 w-8 object-contain"
              onError={() => setLogoUrl(null)}
            />
          ) : (
            <div className="h-8 w-8 rounded-xl bg-[#0054A6] flex items-center justify-center font-bold text-white shadow-md shadow-blue-600/20">
              {activeTenant?.name ? activeTenant.name.charAt(0).toUpperCase() : 'C'}
            </div>
          )}
          <span className="font-bold tracking-tight text-slate-800 text-xs">
            {activeTenant?.name || 'CoopApp'}
          </span>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Floating Sidebar (Desktop) */}
      <aside className={`
        fixed inset-y-4 left-4 z-50 w-64 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[2rem] p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,84,166,0.04)]
        md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:translate-x-0 transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-[110%] md:translate-x-0'}
      `}>
        <div className="space-y-8">
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
            <div className="flex flex-col items-center">
              <span className="font-bold tracking-tight text-slate-800 text-xs leading-snug text-center max-w-full">
                {activeTenant?.name || 'CoopApp'}
              </span>
              <span className="text-[9px] text-slate-400 font-extrabold tracking-wider uppercase mt-1">
                Portal Socios
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  className={getLinkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="border-t border-slate-100 pt-6">
          <button
            onClick={() => {
              setMobileOpen(false);
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold transition-all duration-300 cursor-pointer shadow-[0_4px_12px_rgba(225,29,72,0.02)]"
            title="Cerrar Sesión"
          >
            <LogOut className="h-4 w-5 shrink-0" />
            <span className="text-xs">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile Sidebar */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-40 transition-all duration-300"
        />
      )}

      {/* Content Area */}
      <main className="flex-1 min-w-0 flex flex-col md:py-2">
        <Outlet />
      </main>
    </div>
  );
};
export default SocioLayout;
