import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import api from '../services/api';
import { 
  Loader2, 
  LogOut, 
  Coins, 
  Users, 
  CreditCard, 
  Calculator, 
  Settings,
  Folder,
  BookOpen,
  TrendingUp,
  Scale,
  Lock,
  FileText
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const { activeTenant } = useTenant();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isCajero = user?.rol === 'CAJERO';
  const activePath = location.pathname;

  // Estados de Caja en caliente para el cajero
  const [cajaActiva, setCajaActiva] = useState<any>(null);
  const [efectivoActual, setEfectivoActual] = useState<number>(0);

  const fetchCajaStatus = async () => {
    if (!isCajero) return;
    try {
      const resCaja = await api.get('/cajas/activa');
      setCajaActiva(resCaja.data);

      if (resCaja.data) {
        const resMovs = await api.get('/cajas/movimientos');
        const movimientos = resMovs.data || [];

        // Helper para identificar depósitos puente para pago de crédito
        const esPuenteCredito = (m: any) => {
          const desc = (m.descripcion || '').toLowerCase();
          return m.tipoTransaccion === 'CREDITO' && (
            desc.includes('para pago de crédito') ||
            desc.includes('para pago de credito') ||
            desc.includes('para pago de cuota')
          );
        };

        // Helper para identificar ingresos físicos reales a la caja
        const esIngresoEfectivo = (m: any) => {
          const desc = (m.descripcion || '').toLowerCase();
          if (desc.startsWith('[anulada]')) return false;
          if (esPuenteCredito(m)) return false;
          if (m.tipoTransaccion === 'CREDITO') return true;
          if (m.tipoTransaccion === 'DEBITO' && (
            desc.includes('pago de cuota') ||
            desc.includes('pago de crédito') ||
            desc.includes('pago de credito')
          )) {
            return true;
          }
          return false;
        };

        // Helper para identificar egresos físicos reales de la caja
        const esEgresoEfectivo = (m: any) => {
          const desc = (m.descripcion || '').toLowerCase();
          if (desc.startsWith('[anulada]')) return false;
          if (m.tipoTransaccion === 'DEBITO' && (
            desc.includes('pago de cuota') ||
            desc.includes('pago de crédito') ||
            desc.includes('pago de credito')
          )) {
            return false;
          }
          return m.tipoTransaccion === 'DEBITO';
        };

        const ingresos = movimientos
          .filter((m: any) => esIngresoEfectivo(m))
          .reduce((sum: number, current: any) => sum + current.monto, 0);
        const egresos = movimientos
          .filter((m: any) => esEgresoEfectivo(m))
          .reduce((sum: number, current: any) => sum + current.monto, 0);
        setEfectivoActual(resCaja.data.montoApertura + ingresos - egresos);
      } else {
        setEfectivoActual(0);
      }
    } catch (err) {
      console.error('Error fetching caja status in navbar:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isCajero) {
      fetchCajaStatus();
      window.addEventListener('caja-updated', fetchCajaStatus);
    }
    return () => {
      window.removeEventListener('caja-updated', fetchCajaStatus);
    };
  }, [isAuthenticated, isCajero]);

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

  const initials = user?.nombresCompletos
    ? user.nombresCompletos.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : 'U';

  const isContabilidadRoute = activePath.startsWith('/admin/contabilidad');
  const contabilidadSeccionActiva = searchParams.get('section') || 'plan';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans p-4 md:p-6 gap-6 relative select-none">
      
      {/* 2. Floating Sidebar (Desktop) matching SocioLayout */}
      <aside className="w-64 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[2rem] p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,84,166,0.04)] md:sticky md:top-6 md:h-[calc(100vh-3rem)] shrink-0 transition-transform duration-300 z-50">
        <div className="space-y-8 flex flex-col flex-1 min-h-0">
          
          {/* Brand Logo & Institution */}
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-2xl bg-[#0054A6] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-600/30 select-none">
              {activeTenant?.name ? activeTenant.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-slate-800 text-base leading-none truncate max-w-[140px]">
                {activeTenant?.name || 'CoopApp'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
                {isContabilidadRoute ? 'Portal Contable' : 'Portal Operaciones'}
              </span>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto scrollbar-none pr-1">
            {isContabilidadRoute ? (
              /* MENÚ EXCLUSIVO DE CONTABILIDAD (Mismo estilo que SocioLayout) */
              <>
                <Link
                  to="/admin/contabilidad?section=plan"
                  className={
                    contabilidadSeccionActiva === 'plan'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <Folder className="h-5 w-5 shrink-0" />
                  <span>Plan de Cuentas</span>
                </Link>
                <Link
                  to="/admin/contabilidad?section=diario"
                  className={
                    contabilidadSeccionActiva === 'diario'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <BookOpen className="h-5 w-5 shrink-0" />
                  <span>Libro Diario</span>
                </Link>
                <Link
                  to="/admin/contabilidad?section=mayor"
                  className={
                    contabilidadSeccionActiva === 'mayor'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <FileText className="h-5 w-5 shrink-0" />
                  <span>Libro Mayor</span>
                </Link>
                <Link
                  to="/admin/contabilidad?section=resultados"
                  className={
                    contabilidadSeccionActiva === 'resultados'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <TrendingUp className="h-5 w-5 shrink-0" />
                  <span>Estado Resultados</span>
                </Link>
                <Link
                  to="/admin/contabilidad?section=balance"
                  className={
                    contabilidadSeccionActiva === 'balance'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <Scale className="h-5 w-5 shrink-0" />
                  <span>Balance General</span>
                </Link>
                <Link
                  to="/admin/contabilidad?section=cierres"
                  className={
                    contabilidadSeccionActiva === 'cierres'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <Lock className="h-5 w-5 shrink-0" />
                  <span>Cierres Fiscales</span>
                </Link>
              </>
            ) : (
              /* MENÚ DE OTROS ROLES (OPERACIONES / CONTABILIDAD / SISTEMA) */
              <>
                <span className="px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1 mt-2 select-none">
                  Operaciones
                </span>
                <Link
                  to="/admin/dashboard"
                  className={
                    activePath === '/admin/dashboard'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <Coins className="h-5 w-5 shrink-0" />
                  <span>Ventanilla (Caja)</span>
                </Link>
                <Link
                  to="/admin/socios"
                  className={
                    activePath === '/admin/socios'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <Users className="h-5 w-5 shrink-0" />
                  <span>Socios</span>
                </Link>
                <Link
                  to="/admin/creditos"
                  className={
                    activePath === '/admin/creditos'
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <CreditCard className="h-5 w-5 shrink-0" />
                  <span>Créditos</span>
                </Link>

                <span className="px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1 mt-4 select-none">
                  Contabilidad
                </span>
                <Link
                  to="/admin/contabilidad?section=plan"
                  className={
                    activePath.startsWith('/admin/contabilidad')
                      ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 text-[#0054A6] font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(0,84,166,0.06)]"
                      : "flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium transition-all duration-300"
                  }
                >
                  <Calculator className="h-5 w-5 shrink-0" />
                  <span>Módulo Contable</span>
                </Link>

                {(user?.rol === 'ADMINISTRADOR' || user?.rol === 'GERENTE_GENERAL') && (
                  <>
                    <span className="px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1 mt-4 select-none">
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
                  </>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Footer Sidebar with elegant user profile and SocioLayout logout button */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-full bg-[#0054A6]/10 border border-[#0054A6]/20 font-black text-xs text-[#0054A6] flex items-center justify-center shrink-0 select-none">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                {user.nombresCompletos}
              </p>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 leading-none truncate">
                {user.rol === 'OFICIAL_DE_CREDITO' ? 'Oficial de Crédito' : user.rol === 'CONTADOR' ? 'Contador' : user.rol === 'CAJERO' ? 'Cajero' : user.rol}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold transition-all duration-300 cursor-pointer shadow-[0_4px_12px_rgba(225,29,72,0.02)]"
            title="Cerrar Sesión"
          >
            <LogOut className="h-4 w-5 shrink-0" />
            <span className="text-xs">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* 3. Área de Trabajo (Main Workspace) */}
      <main className="flex-1 min-w-0 flex flex-col md:py-2 space-y-6">
        
        {/* Controles de Cajero en caliente si existen */}
        {isCajero && cajaActiva && (
          <div className="flex justify-end items-center pb-4 border-b border-slate-100/80">
            <div className="flex items-center gap-3">
              {/* Botón de Arqueo rápido para el cajero si está en su dashboard */}
              {activePath === '/admin/dashboard' && (
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('trigger-arqueo'));
                  }}
                  className="border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-350 font-bold rounded-2xl h-8.5 px-4 cursor-pointer text-[11px] transition-all active:scale-95 flex items-center justify-center shadow-sm"
                >
                  Arqueo y cierre
                </button>
              )}

              {/* Caja Status en caliente */}
              <div className="flex items-center gap-2 select-none animate-fade-in text-[10px] font-extrabold">
                <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Caja Abierta</span>
                </div>
                <div className="px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-700 shadow-sm flex items-center gap-1">
                  <span>Efectivo:</span>
                  <span className="font-mono font-black">${efectivoActual.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Outlet */}
        <div className="flex-1 w-full overflow-y-auto pb-8 scrollbar-none pr-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
