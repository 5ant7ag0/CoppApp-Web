import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SaasLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard SaaS', icon: LayoutDashboard, path: '/saas/dashboard' }
  ];

  const initials = user?.nombresCompletos
    ? user.nombresCompletos.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : 'SA';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans p-4 md:p-6 gap-6 relative select-none">
      
      {/* Premium Floating Sidebar matching AdminLayout */}
      <aside className="w-full md:w-64 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[2rem] p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,84,166,0.04)] md:sticky md:top-6 md:h-[calc(100vh-3rem)] shrink-0 transition-transform duration-300 z-50">
        <div className="space-y-8 flex flex-col flex-1 min-h-0">
          
          {/* Brand Logo & SaaS Manager Info */}
          <div className="flex flex-col items-center justify-center text-center gap-3 px-2">
            <div className="h-16 w-16 rounded-2xl bg-[#0054A6] flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-blue-600/30 select-none">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="text-center">
              <span className="font-bold tracking-tight text-slate-800 text-sm leading-snug text-center max-w-full">
                SaaS Manager
              </span>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Super Admin</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto scrollbar-none pr-1">
            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 mt-2 select-none">
              Plataforma SaaS
            </span>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                  }}
                  className={
                    isActive
                      ? "w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar with elegant user profile and popover logout button */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="group relative">
            <div className="flex items-center gap-3 px-2 p-2 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
              <div className="h-9 w-9 rounded-full bg-[#0054A6]/10 border border-[#0054A6]/20 font-black text-xs text-[#0054A6] flex items-center justify-center shrink-0 select-none overflow-hidden">
                {initials}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                  {user?.nombresCompletos || 'Super Admin'}
                </p>
                <div className="mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase bg-rose-50 text-rose-600 border border-rose-100">
                    {user?.rol || 'SUPER_ADMIN'}
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

      {/* Main Workspace */}
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
                    handleLogout();
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
