import React from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, LogOut, Home, Send, CreditCard, User, Menu, History } from 'lucide-react';

export const SocioLayout: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

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
          <div className="h-8 w-8 rounded-xl bg-[#0054A6] flex items-center justify-center font-bold text-white shadow-md shadow-blue-600/20">
            C
          </div>
          <span className="font-bold tracking-tight text-slate-800 text-sm">
            CoopApp Digital
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
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-2xl bg-[#0054A6] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-600/30">
              C
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-slate-800 text-base leading-none">
                CoopApp
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
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
