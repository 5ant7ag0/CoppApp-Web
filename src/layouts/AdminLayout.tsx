import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import api from '../services/api';
import { Loader2, LogOut } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const { activeTenant } = useTenant();

  const isCajero = user?.rol === 'CAJERO';
  const isLightTheme = user?.rol === 'CAJERO' || user?.rol === 'OFICIAL_DE_CREDITO';

  // Estados de Caja en caliente para el cajero
  const [cajaActiva, setCajaActiva] = useState<any>(null);
  const [efectivoActual, setEfectivoActual] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

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

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${
      isLightTheme ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-white'
    }`}>
      {/* Header Estilo Apple Glassmorphism */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b px-6 py-4 flex items-center justify-between transition-colors duration-500 ${
        isLightTheme 
          ? 'bg-white/75 border-slate-100/80 text-slate-800 shadow-[0_1px_10px_rgba(0,0,0,0.015)]' 
          : 'bg-slate-900/60 border-white/5 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white shadow-lg transition-all ${
            isLightTheme ? 'bg-[#0054A6] shadow-blue-600/20' : 'bg-amber-600 shadow-amber-600/30'
          }`}>
            {activeTenant?.name ? activeTenant.name.charAt(0).toUpperCase() : 'A'}
          </div>

          {!isCajero ? (
            <span className={`font-semibold tracking-wide text-sm ${
              isLightTheme ? 'text-slate-800' : 'bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent'
            }`}>
              {activeTenant?.name || 'CoopApp Core Administrativo'}
            </span>
          ) : (
            <div className="flex items-center gap-2.5 select-none animate-fade-in">
              {cajaActiva ? (
                <>
                  {/* Caja abierta inicial */}
                  <div className="px-3 py-1 bg-emerald-50 border border-emerald-100/50 rounded-full text-[12px] font-extrabold text-emerald-700 flex items-center gap-1.5 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Caja abierta inicial: ${cajaActiva.montoApertura % 1 === 0 ? cajaActiva.montoApertura.toFixed(0) : cajaActiva.montoApertura.toFixed(2)}</span>
                  </div>

                  {/* Efectivo en caja */}
                  <div className="px-3 py-1 bg-blue-50 border border-blue-100/50 rounded-full text-[12px] font-extrabold text-blue-700 shadow-sm flex items-center gap-1">
                    <span>Efectivo en caja:</span>
                    <span className="font-mono font-black">${efectivoActual.toFixed(2)}</span>
                  </div>

                  {/* Fecha Contable */}
                  <div className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-[12px] font-extrabold text-slate-650 shadow-sm flex items-center gap-1">
                    <span>Fecha Contable: {cajaActiva.fechaContable} </span>
                  </div>
                </>
              ) : (
                <div className="px-3 py-1 bg-rose-50 border border-rose-100/50 rounded-full text-[10px] font-extrabold text-rose-700 flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Caja Cerrada
                </div>
              )}
            </div>
          )}
        </div>

        {/* Extremo Derecho: Botón Arqueo y Avatar con Dropdown Flotante */}
        <div className="flex items-center gap-3">
          {isCajero && cajaActiva && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('trigger-arqueo'));
              }}
              className="border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold rounded-2xl h-9 px-4 cursor-pointer text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center"
            >
              Arqueo y cierre
            </button>
          )}

          <div 
            className="relative"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <button
              className={`h-9 w-9 rounded-full font-black text-xs flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm relative focus:outline-none ${
                isLightTheme 
                  ? 'bg-[#0054A6]/10 text-[#0054A6] hover:bg-[#0054A6] hover:text-white border border-[#0054A6]/20' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              {initials}
            </button>

          {showDropdown && (
            <div className="absolute right-0 top-full pt-2.5 w-56 z-[999] animate-scale-up select-none">
              <div className={`border rounded-2xl p-2.5 shadow-xl text-left backdrop-blur-xl ${
                isLightTheme 
                  ? 'bg-white/95 border-slate-100/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]' 
                  : 'bg-slate-900/90 border-white/5 text-white'
              }`}>
                {/* Cabecera */}
                <div className="px-3 py-2">
                  <p className={`text-xs font-extrabold truncate ${isLightTheme ? 'text-slate-800' : 'text-white'}`}>
                    {user.nombresCompletos}
                  </p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {user.rol === 'OFICIAL_DE_CREDITO' ? 'Oficial de Crédito' : user.rol}
                  </p>
                </div>
                
                {/* Separador */}
                <div className={`border-t my-1.5 ${isLightTheme ? 'border-slate-100' : 'border-white/5'}`} />

                {/* Opción Cerrar Sesión */}
                <button
                  onClick={logout}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border border-transparent ${
                    isLightTheme 
                      ? 'text-rose-600 hover:bg-rose-50/50 hover:border-rose-100/30' 
                      : 'text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20'
                  }`}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};
