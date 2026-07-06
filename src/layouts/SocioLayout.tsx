import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, LogOut, Home, Send, CreditCard, User, Menu, History, TrendingUp } from 'lucide-react';
import api, { getAssetUrl } from '../services/api';
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
        const url = getAssetUrl(res.data.logoUrl);
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
          const url = getAssetUrl(customEvent.detail);
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
      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)] md:justify-center xl:justify-start md:group-hover:justify-start"
      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300 md:justify-center xl:justify-start md:group-hover:justify-start";
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

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <aside className="fixed inset-y-4 left-4 z-50 w-64 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[2rem] p-6 flex flex-col justify-between shadow-2xl md:hidden transition-transform duration-300">
          <div className="space-y-8">
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

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink 
                    key={item.to} 
                    to={item.to} 
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <button
              onClick={() => {
                setMobileOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold transition-all duration-300 cursor-pointer"
            >
              <LogOut className="h-4 w-5 shrink-0" />
              <span className="text-xs">Cerrar Sesión</span>
            </button>
          </div>
        </aside>
      )}

      {/* Premium Desktop Collapsible Floating Sidebar (No Layout Shift) */}
      <aside className="hidden md:block md:w-20 xl:w-64 h-[calc(100vh-3rem)] sticky top-6 shrink-0 group z-50">
        <div className="absolute left-0 top-0 bottom-0 md:w-20 xl:w-64 md:group-hover:w-64 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[2rem] p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,84,166,0.04)] group-hover:shadow-[0_20px_60px_rgba(0,84,166,0.12)] transition-all duration-300 ease-in-out">
          <div className="space-y-8">
            {/* Brand Logo & Institution */}
            <div className="flex flex-col items-center justify-center text-center gap-3 px-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo Institucional"
                  className="w-10 h-10 md:w-11 md:h-11 xl:w-full xl:max-h-24 md:group-hover:w-full md:group-hover:max-h-24 object-contain select-none transition-all duration-300"
                  onError={() => setLogoUrl(null)}
                />
              ) : (
                <div className="h-10 w-10 md:h-11 md:w-11 xl:h-16 xl:w-16 rounded-2xl bg-[#0054A6] flex items-center justify-center font-black text-white text-lg xl:text-2xl shadow-lg shadow-blue-600/30 select-none transition-all duration-300">
                  {activeTenant?.name ? activeTenant.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div className="flex flex-col items-center xl:block md:hidden md:group-hover:block transition-all duration-300">
                <span className="font-bold tracking-tight text-slate-800 text-xs leading-snug text-center max-w-full block truncate">
                  {activeTenant?.name || 'CoopApp'}
                </span>
                <span className="text-[9px] text-slate-400 font-extrabold tracking-wider uppercase mt-1 block">
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
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="xl:inline md:hidden md:group-hover:inline transition-opacity duration-300 whitespace-nowrap truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Footer Sidebar */}
          <div className="border-t border-slate-100 pt-6">
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold transition-all duration-300 cursor-pointer shadow-[0_4px_12px_rgba(225,29,72,0.02)] md:justify-center xl:justify-start md:group-hover:justify-start"
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-5 shrink-0" />
              <span className="text-xs xl:inline md:hidden md:group-hover:inline whitespace-nowrap">Cerrar Sesión</span>
            </button>
          </div>
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
