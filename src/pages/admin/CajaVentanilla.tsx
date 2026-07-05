import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  User, 
  Lock, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  Coins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  Fingerprint, 
  FileText, 
  Building,
  Clock,
  DollarSign,
  LogOut
} from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { jsPDF } from 'jspdf';
import { maskAccountNumber } from '../../utils/securityFormatters';

interface CajaActiva {
  id: number;
  fechaContable: string;
  montoApertura: number;
  montoCierreSistema: number;
  montoCierreEfectivoReal: number | null;
  diferencia: number;
  estado: 'APERTURADA' | 'CERRADA';
}

interface SocioDetails {
  id: number;
  identificacion: string;
  nombresCompletos: string;
  estado: string;
  fotoPerfilUrl: string;
  fotoCedulaFrontalUrl: string;
  fotoCedulaPosteriorUrl: string;
}

interface CuentaCajaInfo {
  cuentaId: number;
  numeroCuenta: string;
  saldo: number;
  socio: SocioDetails;
  cuentas?: Array<{
    id: number;
    numeroCuenta: string;
    tipo: string;
    saldo: number;
    estado: string;
  }>;
}

interface MovimientoCaja {
  id: number;
  tipoTransaccion: 'CREDITO' | 'DEBITO';
  monto: number;
  saldoAnterior: number;
  saldoResultante: number;
  canal: string;
  referencia: string;
  descripcion: string;
  fechaContable: string;
  cuenta?: {
    id: number;
    numeroCuenta: string;
    tipo: string;
    socio?: {
      id: number;
      identificacion: string;
      nombresCompletos: string;
      estado: string;
      fotoPerfilUrl?: string;
    };
  };
}

const CedulaFrontalMockup: React.FC<{ nombres: string, cedula: string, avatarUrl: string | null }> = ({ nombres, cedula, avatarUrl }) => {
  return (
    <div className="w-full max-w-sm h-52 rounded-2xl bg-gradient-to-br from-blue-50/90 via-sky-50/70 to-slate-100 border border-slate-200/70 p-4 shadow-md flex flex-col justify-between relative overflow-hidden font-sans text-[9px] text-slate-800 select-none">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0054a6_1px,transparent_1px)] [background-size:8px_8px]" />
      
      <div className="flex justify-between items-start border-b border-sky-200 pb-1.5 z-10">
        <div className="flex gap-1.5 items-center">
          <div className="h-6 w-6 rounded-full bg-yellow-400/20 border border-yellow-500/30 flex items-center justify-center text-[7px] font-bold text-yellow-700 font-mono">DNI</div>
          <div>
            <h4 className="font-bold text-[8px] uppercase tracking-wider text-slate-700 leading-none">República del Ecuador</h4>
            <span className="text-[6px] font-semibold text-slate-500 uppercase tracking-widest block mt-0.5">Dirección General de Registro Civil</span>
          </div>
        </div>
        <div className="text-right">
          <span className="font-black text-rose-600 text-[10px] tracking-wider font-mono">{cedula}</span>
          <span className="text-[6px] text-slate-400 block font-bold leading-none mt-0.5">DOCUMENTO DE IDENTIDAD</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2 z-10 flex-1">
        <div className="w-16 h-20 bg-slate-200/50 border border-slate-300/60 rounded-lg overflow-hidden flex items-center justify-center shrink-0 shadow-inner bg-white relative">
          {avatarUrl ? (
            <img src={`http://localhost:8080/api/v1${avatarUrl}`} alt="Foto Cedula" className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-slate-400" />
          )}
          <div className="absolute bottom-0 inset-x-0 bg-sky-500/20 text-center py-0.5 text-[5px] text-sky-800 font-black">Ecuador</div>
        </div>

        <div className="flex-1 flex flex-col justify-between py-0.5">
          <div className="space-y-1">
            <div>
              <span className="text-[6px] font-bold text-slate-400 uppercase leading-none block">Apellidos y Nombres</span>
              <span className="font-bold text-slate-800 text-[9px] uppercase leading-tight block">{nombres}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[6px] font-bold text-slate-400 uppercase leading-none block">Nacionalidad</span>
                <span className="font-bold text-slate-700 text-[8px] block">ECUATORIANA</span>
              </div>
              <div>
                <span className="text-[6px] font-bold text-slate-400 uppercase leading-none block">Fecha Nacimiento</span>
                <span className="font-bold text-slate-700 text-[8px] block font-mono">14 ENE 1989</span>
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-sky-300 pt-1 flex justify-between items-end">
            <div>
              <span className="text-[5px] font-bold text-slate-400 uppercase block">Firma del Titular</span>
              <span className="font-serif italic font-semibold text-blue-900 tracking-wide text-xs lowercase mt-0.5 block" style={{ fontFamily: 'Georgia, serif' }}>
                {nombres.split(' ').slice(0, 2).join(' ')}
              </span>
            </div>
            <span className="text-[5px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1 tracking-widest uppercase">Verificado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CedulaPosteriorMockup: React.FC<{ cedula: string }> = ({ cedula }) => {
  return (
    <div className="w-full max-w-sm h-52 rounded-2xl bg-gradient-to-br from-slate-100 via-sky-50/30 to-slate-200/80 border border-slate-200/70 p-4 shadow-md flex flex-col justify-between relative overflow-hidden font-sans text-[9px] text-slate-800 select-none">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0054a6_1px,transparent_1px)] [background-size:8px_8px]" />

      <div className="flex gap-4 items-stretch flex-1 z-10">
        <div className="w-16 bg-white border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center gap-1.5 shadow-sm">
          <Fingerprint className="h-10 w-10 text-slate-600/80" />
          <span className="text-[5px] font-black text-slate-400 uppercase tracking-wider">Índice Derecho</span>
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-1 bg-white/50 border border-slate-200/50 rounded-lg p-1.5">
            <div>
              <span className="text-[6px] font-bold text-slate-400 uppercase block leading-none">Instrucción / Profesión</span>
              <span className="font-bold text-slate-700 text-[8px] uppercase">SUPERIOR / DESARROLLADOR</span>
            </div>
            <div>
              <span className="text-[6px] font-bold text-slate-400 uppercase block leading-none">Estado Civil / Sexo</span>
              <span className="font-bold text-slate-700 text-[8px] uppercase">SOLTERO / MASCULINO</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[5px] font-bold text-slate-400 uppercase block leading-none">Firma del Director General</span>
            <span className="font-serif italic text-slate-500 text-[8px] mt-0.5 block">Director Registro Civil</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 pt-2.5 border-t border-slate-200 z-10 flex flex-col gap-1 items-center bg-white/40 p-1.5 rounded-lg border border-slate-200/40">
        <div className="h-5 w-full flex items-center justify-between opacity-80">
          {[1,2,4,1,3,1,2,1,4,2,1,3,2,1,4,1,2,3,1,4,2,1,3,1,2,4,1,2,3,1,4,2,1].map((w, i) => (
            <div key={i} className="bg-slate-800 h-full shrink-0" style={{ width: `${w * 1.5}px` }} />
          ))}
        </div>
        <span className="font-mono text-[7px] text-slate-500 font-bold tracking-widest">I&lt;ECU{cedula}M8901140&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</span>
      </div>
    </div>
  );
};

const getErrorMessage = (err: any): string => {
  if (err.response?.data) {
    if (typeof err.response.data === 'object' && err.response.data.message) {
      return err.response.data.message;
    }
    if (typeof err.response.data === 'string') {
      return err.response.data;
    }
  }
  return err.message || 'Error desconocido';
};

export const CajaVentanilla: React.FC = () => {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  
  // Ciclo Diario
  const [caja, setCaja] = useState<CajaActiva | null>(null);
  const [cargandoCaja, setCargandoCaja] = useState<boolean>(true);
  const [montoApertura, setMontoApertura] = useState<string>('');
  const [aperturaLoading, setAperturaLoading] = useState<boolean>(false);
  const [aperturaError, setAperturaError] = useState<string | null>(null);
  
  // Arqueo / Cierre
  const [mostrarCierre, setMostrarCierre] = useState<boolean>(false);
  const [efectivoReal, setEfectivoReal] = useState<string>('');
  const [cierreLoading, setCierreLoading] = useState<boolean>(false);
  const [cierreError, setCierreError] = useState<string | null>(null);

  // Doble confirmación de Cierre
  const [mostrarPreCierre, setMostrarPreCierre] = useState<boolean>(false);

  // Filtros del Diario Inferior
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CREDITO' | 'DEBITO'>('TODOS');
  const [filtroBusqueda, setFiltroBusqueda] = useState<string>('');
  
  // Justificación UAFE
  const [uafeJustificacion, setUafeJustificacion] = useState<string>('');

  // Ficha de Socio
  const [busqueda, setBusqueda] = useState<string>('');
  const [buscandoSocio, setBuscandoSocio] = useState<boolean>(false);
  const [socioInfo, setSocioInfo] = useState<CuentaCajaInfo | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Derivación de la cuenta seleccionada con compatibilidad hacia atrás
  const getActiveAccount = () => {
    if (!socioInfo) return null;
    if (socioInfo.cuentas && socioInfo.cuentas.length > 0) {
      return socioInfo.cuentas.find(c => c.id === selectedAccountId) || socioInfo.cuentas[0];
    }
    return {
      id: socioInfo.cuentaId,
      numeroCuenta: socioInfo.numeroCuenta,
      saldo: socioInfo.saldo,
      tipo: 'AHORRO_VISTA',
      estado: 'ACTIVA'
    };
  };

  const activeAccount = getActiveAccount();
  const isAhorroVista = activeAccount ? activeAccount.tipo === 'AHORRO_VISTA' : true;
  const isAportaciones = activeAccount ? activeAccount.tipo === 'APORTACIONES' : false;

  const [busquedaError, setBusquedaError] = useState<string | null>(null);
  const [useMockups, setUseMockups] = useState<boolean>(false);

  // Transacciones
  const [activeTab, setActiveTab] = useState<'DEPOSITO' | 'RETIRO' | 'PAGO_CREDITO' | 'APORTACIONES'>('DEPOSITO');
  const [montoTx, setMontoTx] = useState<string>('');
  const [conceptoTx, setConceptoTx] = useState<string>('');
  const [depositante, setDepositante] = useState<string>('');
  const [declaracionUafe, setDeclaracionUafe] = useState<boolean>(false);
  const [procesandoTx, setProcesandoTx] = useState<boolean>(false);
  const [txError, setTxError] = useState<string | null>(null);

  const [cedulaModalView, setCedulaModalView] = useState<'FRONTAL' | 'POSTERIOR' | null>(null);

  // Crédito y Aportaciones
  const [creditosSocio, setCreditosSocio] = useState<any[]>([]);
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<any>(null);
  const [cuotaPendiente, setCuotaPendiente] = useState<any>(null);
  const [cargandoCredito, setCargandoCredito] = useState<boolean>(false);
  const [cuentaAportaciones, setCuentaAportaciones] = useState<any>(null);
  const [cargandoAportaciones, setCargandoAportaciones] = useState<boolean>(false);

  // Reversos / Anulación
  const [txParaAnular, setTxParaAnular] = useState<any>(null);
  const [claveSupervisor, setClaveSupervisor] = useState<string>('');
  const [mostrarSupervisorModal, setMostrarSupervisorModal] = useState<boolean>(false);
  const [anulandoTx, setAnulandoTx] = useState<boolean>(false);
  const [anulacionError, setAnulacionError] = useState<string | null>(null);

  // Modal de Confirmación de Transacción
  const [confirmTxData, setConfirmTxData] = useState<{
    monto: number;
    tipo: 'DEPOSITO' | 'RETIRO' | 'PAGO_CREDITO' | 'APORTACIONES';
    concepto: string;
    depositante?: string;
    declaracionUafe: boolean;
    uafeJustificacion?: string;
  } | null>(null);

  // Ticket de Ventanilla (Exito)
  const [ticketData, setTicketData] = useState<{
    referencia: string;
    tipo: 'DEPOSITO' | 'RETIRO' | 'PAGO_CREDITO' | 'APORTACIONES';
    monto: number;
    concepto: string;
    socioNombre: string;
    cuentaNumero: string;
    fechaHora: string;
    depositante?: string;
    saldoResultante: number;
    socioCedula: string;
  } | null>(null);

  // Historial Diario
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);

  // Toast Global
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const ticketRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const fetchCajaActiva = async () => {
    setCargandoCaja(true);
    setCaja(null);
    try {
      const res = await api.get('/cajas/activa');
      setCaja(res.data);
      // Cargar movimientos e historial si está abierta
      await fetchMovimientos();
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        // Caja cerrada
        setCaja(null);
      } else {
        console.error('Error al obtener estado de caja:', err);
        showToast('Error al conectar con el servidor de cajas.', 'error');
      }
    } finally {
      setCargandoCaja(false);
    }
  };

  const fetchMovimientos = async () => {
    try {
      const res = await api.get('/cajas/movimientos');
      setMovimientos(res.data);
    } catch (err) {
      console.error('Error al obtener movimientos diarios:', err);
    }
  };

  useEffect(() => {
    fetchCajaActiva();
  }, []);

  useEffect(() => {
    setUseMockups(false);
  }, [socioInfo]);

  useEffect(() => {
    const handleTriggerArqueo = () => {
      setMostrarPreCierre(true);
    };
    window.addEventListener('trigger-arqueo', handleTriggerArqueo);
    return () => {
      window.removeEventListener('trigger-arqueo', handleTriggerArqueo);
    };
  }, []);

  // Helper para identificar depósitos puente para pago de crédito
  const esPuenteCredito = (mov: MovimientoCaja) => {
    const desc = (mov.descripcion || '').toLowerCase();
    return mov.tipoTransaccion === 'CREDITO' && (
      desc.includes('para pago de crédito') ||
      desc.includes('para pago de credito') ||
      desc.includes('para pago de cuota')
    );
  };

  // Helper para identificar ingresos físicos reales a la caja
  const esIngresoEfectivo = (mov: MovimientoCaja) => {
    const desc = (mov.descripcion || '').toLowerCase();
    if (desc.startsWith('[anulada]')) return false;
    if (esPuenteCredito(mov)) return false;
    if (mov.tipoTransaccion === 'CREDITO') return true;
    if (mov.tipoTransaccion === 'DEBITO' && (
      desc.includes('pago de cuota') ||
      desc.includes('pago de crédito') ||
      desc.includes('pago de credito')
    )) {
      return true;
    }
    return false;
  };

  // Helper para identificar egresos físicos reales de la caja
  const esEgresoEfectivo = (mov: MovimientoCaja) => {
    const desc = (mov.descripcion || '').toLowerCase();
    if (desc.startsWith('[anulada]')) return false;
    if (mov.tipoTransaccion === 'DEBITO' && (
      desc.includes('pago de cuota') ||
      desc.includes('pago de crédito') ||
      desc.includes('pago de credito')
    )) {
      return false;
    }
    return mov.tipoTransaccion === 'DEBITO';
  };

  // Calcular teóricos para el arqueo
  const ingresosCaja = movimientos
    .filter(m => esIngresoEfectivo(m))
    .reduce((sum, current) => sum + current.monto, 0);

  const egresosCaja = movimientos
    .filter(m => esEgresoEfectivo(m))
    .reduce((sum, current) => sum + current.monto, 0);

  const saldoTeoricoCierre = caja ? caja.montoApertura + ingresosCaja - egresosCaja : 0;

  // Filtros del Diario Inferior
  const movimientosFiltrados = movimientos.filter(mov => {
    // Ocultar transacciones puente del diario inferior
    if (esPuenteCredito(mov)) {
      return false;
    }

    let cumpleTipo = true;
    if (filtroTipo === 'CREDITO') {
      cumpleTipo = esIngresoEfectivo(mov);
    } else if (filtroTipo === 'DEBITO') {
      cumpleTipo = esEgresoEfectivo(mov);
    }
    
    const cuentaStr = (mov.cuenta?.numeroCuenta || '').toLowerCase();
    const cedulaStr = (mov.cuenta?.socio?.identificacion || '').toLowerCase();
    const socioNombreStr = (mov.cuenta?.socio?.nombresCompletos || '').toLowerCase();
    const busquedaLower = filtroBusqueda.trim().toLowerCase();
    
    return cumpleTipo && (
      busquedaLower === '' || 
      cuentaStr.includes(busquedaLower) || 
      cedulaStr.includes(busquedaLower) ||
      socioNombreStr.includes(busquedaLower)
    );
  });

  // Aperturar Caja
  const handleAperturar = async (e: React.FormEvent) => {
    e.preventDefault();
    setAperturaError(null);

    const val = parseFloat(montoApertura);
    if (isNaN(val) || val < 0) {
      setAperturaError('El monto de apertura debe ser un número igual o mayor a 0.');
      return;
    }

    setAperturaLoading(true);
    try {
      const res = await api.post('/cajas/aperturar', { montoApertura: val });
      setCaja(res.data);
      setMontoApertura('');
      showToast('Caja diaria aperturada con éxito para el día de hoy.', 'success');
      await fetchMovimientos();
      window.dispatchEvent(new CustomEvent('caja-updated'));
    } catch (err: any) {
      console.error('Error aperturando caja:', err);
      setAperturaError(getErrorMessage(err));
    } finally {
      setAperturaLoading(false);
    }
  };

  // Cerrar Caja
  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setCierreError(null);

    const val = parseFloat(efectivoReal);
    if (isNaN(val) || val < 0) {
      setCierreError('El monto físico real de efectivo debe ser igual o mayor a 0.');
      return;
    }

    setCierreLoading(true);
    try {
      await api.post('/cajas/cerrar', { montoCierreEfectivoReal: val });
      showToast('Caja cerrada y arqueada con éxito. Fondos transferidos a Bóveda.', 'success');
      setMostrarCierre(false);
      setEfectivoReal('');
      setCaja(null);
      setSocioInfo(null);
      setMovimientos([]);
      window.dispatchEvent(new CustomEvent('caja-updated'));
    } catch (err: any) {
      console.error('Error cerrando caja:', err);
      setCierreError(getErrorMessage(err));
    } finally {
      setCierreLoading(false);
    }
  };

  const fetchAmortizacion = async (creditoId: number) => {
    try {
      const res = await api.get(`/creditos/${creditoId}/amortizacion`);
      const cuotas = res.data || [];
      const pendiente = cuotas.find((c: any) => c.estado !== 'PAGADA');
      setCuotaPendiente(pendiente || null);
      if (pendiente && activeTab === 'PAGO_CREDITO') {
        const val = (pendiente.capitalProyectado - pendiente.capitalPagado) +
                    (pendiente.interesProyectado - pendiente.interesPagado) +
                    (pendiente.montoMoraAcumulado - pendiente.montoMoraPagado);
        setMontoTx(val.toFixed(2));
      }
    } catch (err) {
      console.error('Error fetching amortization:', err);
    }
  };

  const fetchCreditos = async (socioId: number) => {
    setCargandoCredito(true);
    try {
      const res = await api.get(`/creditos/socio/${socioId}`);
      const todos = res.data || [];
      const activos = todos.filter((c: any) => c.estado === 'DESEMBOLSADO' || c.estado === 'EN_MORA');
      setCreditosSocio(activos);
      if (activos.length > 0) {
        setCreditoSeleccionado(activos[0]);
        await fetchAmortizacion(activos[0].id);
      } else {
        setCreditoSeleccionado(null);
        setCuotaPendiente(null);
      }
    } catch (err) {
      console.error('Error fetching credits:', err);
    } finally {
      setCargandoCredito(false);
    }
  };

  const fetchAportaciones = async (socioId: number) => {
    setCargandoAportaciones(true);
    try {
      const res = await api.get(`/cuentas/socio/${socioId}`);
      const cuentas = res.data || [];
      const aportaciones = cuentas.find((c: any) => c.tipo === 'APORTACIONES');
      setCuentaAportaciones(aportaciones || null);
    } catch (err) {
      console.error('Error fetching aportaciones:', err);
    } finally {
      setCargandoAportaciones(false);
    }
  };

  // Buscar Socio/Cuenta
  const handleBuscarSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusquedaError(null);
    setSocioInfo(null);
    setCreditosSocio([]);
    setCreditoSeleccionado(null);
    setCuotaPendiente(null);
    setCuentaAportaciones(null);

    if (!busqueda.trim()) {
      setBusquedaError('Ingresa un número de cuenta o de cédula.');
      return;
    }

    setBuscandoSocio(true);
    try {
      const res = await api.get(`/cuentas/buscar-caja?query=${encodeURIComponent(busqueda.trim())}`);
      setSocioInfo(res.data);
      if (res.data?.cuentaId) {
        setSelectedAccountId(res.data.cuentaId);
        const defaultAcc = res.data.cuentas?.find((c: any) => c.id === res.data.cuentaId);
        if (defaultAcc?.tipo === 'APORTACIONES') {
          setActiveTab('APORTACIONES');
        } else {
          setActiveTab('DEPOSITO');
        }
      }
      if (res.data?.socio?.id) {
        fetchCreditos(res.data.socio.id);
        fetchAportaciones(res.data.socio.id);
      }
    } catch (err: any) {
      console.error('Error buscando socio para caja:', err);
      setBusquedaError(getErrorMessage(err));
    } finally {
      setBuscandoSocio(false);
    }
  };

  // Procesar Transacción (Depósito, Retiro, Pago de Crédito, Aportación)
  const handleTransaccionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);

    if (!socioInfo) {
      setTxError('Busca y valida la cédula de un socio antes de realizar operaciones.');
      return;
    }

    const parsed = parseFloat(montoTx.replace(',', '.'));
    const montoNum = isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
    if (montoNum <= 0.00) {
      setTxError('El monto de la transacción debe ser mayor a $0.00.');
      return;
    }

    if (activeTab === 'RETIRO' && activeAccount && montoNum > activeAccount.saldo) {
      setTxError('Fondos insuficientes: El monto de retiro supera el saldo disponible del socio.');
      return;
    }

    if (activeTab === 'PAGO_CREDITO') {
      if (!creditoSeleccionado || !cuotaPendiente) {
        setTxError('No hay cuotas pendientes para pagar.');
        return;
      }
      setConfirmTxData({
        monto: montoNum,
        tipo: 'PAGO_CREDITO',
        concepto: `Pago de cuota de crédito Contrato: ${creditoSeleccionado.numeroCredito}`,
        declaracionUafe: false
      });
      return;
    }

    if (activeTab === 'APORTACIONES') {
      if (!cuentaAportaciones) {
        setTxError('No existe una cuenta de aportaciones para depositar.');
        return;
      }
      // Validación UAFE
      if (montoNum >= 10000 && (!declaracionUafe || !uafeJustificacion.trim())) {
        setTxError('Control UAFE: Se requiere ingresar la justificación escrita del origen de fondos y marcar el checkbox.');
        return;
      }
      setConfirmTxData({
        monto: montoNum,
        tipo: 'APORTACIONES',
        concepto: conceptoTx.trim() || 'Aportación en efectivo / Certificados de aportación',
        declaracionUafe: declaracionUafe,
        uafeJustificacion: montoNum >= 10000 ? uafeJustificacion.trim() : undefined
      });
      return;
    }

    // Validación UAFE
    if (montoNum >= 10000 && (!declaracionUafe || !uafeJustificacion.trim())) {
      setTxError('Control UAFE: Se requiere ingresar la justificación escrita del origen de fondos y marcar el checkbox.');
      return;
    }

    const conceptoDefecto = activeTab === 'DEPOSITO' 
      ? `Depósito en efectivo en ventanilla`
      : `Retiro en efectivo en ventanilla`;

    const finalConcepto = (conceptoTx.trim() || conceptoDefecto) + 
      (activeTab === 'DEPOSITO' && depositante.trim() ? ` (Depositante: ${depositante.trim()})` : '') +
      (montoNum >= 10000 ? ` [UAFE Origen: ${uafeJustificacion.trim()}]` : '');

    // Abrir Modal de Confirmación
    setConfirmTxData({
      monto: montoNum,
      tipo: activeTab,
      concepto: finalConcepto,
      depositante: activeTab === 'DEPOSITO' && depositante.trim() ? depositante.trim() : undefined,
      declaracionUafe: declaracionUafe,
      uafeJustificacion: montoNum >= 10000 ? uafeJustificacion.trim() : undefined
    });
  };

  const executeTransaccion = async () => {
    if (!confirmTxData || !socioInfo) return;

    setProcesandoTx(true);
    setTxError(null);
    try {
      const targetAccountId = activeAccount?.id || socioInfo.cuentaId;
      const targetCuentaNumero = activeAccount?.numeroCuenta || socioInfo.numeroCuenta;

      if (confirmTxData.tipo === 'PAGO_CREDITO') {
        if (!creditoSeleccionado || !cuotaPendiente) return;
        
        // 1. Cobro/Pago del crédito directo
        await api.post('/creditos/pagar', {
          creditoId: creditoSeleccionado.id,
          origenFondos: 'EFECTIVO',
          monto: confirmTxData.monto
        });

        // Refrescar saldos de socio y amortización
        const resCuenta = await api.get(`/cuentas/buscar-caja?query=${encodeURIComponent(socioInfo.socio.identificacion)}`);
        setSocioInfo(resCuenta.data);
        await fetchCreditos(socioInfo.socio.id);

        showToast('Pago de crédito registrado y aplicado con éxito.', 'success');

        const updatedAcc = resCuenta.data.cuentas?.find((c: any) => c.id === targetAccountId);
        const saldoResultante = updatedAcc ? updatedAcc.saldo : resCuenta.data.saldo;

        // Set ticket
        setTicketData({
          referencia: 'TX-VENT-' + Date.now(),
          tipo: 'PAGO_CREDITO',
          monto: confirmTxData.monto,
          concepto: confirmTxData.concepto,
          socioNombre: socioInfo.socio.nombresCompletos,
          cuentaNumero: targetCuentaNumero,
          fechaHora: new Date().toLocaleString('es-ES', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
          }),
          saldoResultante: saldoResultante,
          socioCedula: socioInfo.socio.identificacion
        });
      }
      else if (confirmTxData.tipo === 'APORTACIONES') {
        if (!cuentaAportaciones) return;
        
        await api.post('/cuentas/deposito', {
          cuentaAhorrosId: cuentaAportaciones.id,
          monto: confirmTxData.monto,
          concepto: confirmTxData.concepto,
          declaracionOrigenFondos: confirmTxData.declaracionUafe
        });

        // Refrescar aportaciones y socioInfo
        const resCuenta = await api.get(`/cuentas/buscar-caja?query=${encodeURIComponent(socioInfo.socio.identificacion)}`);
        setSocioInfo(resCuenta.data);

        const resAportaciones = await api.get(`/cuentas/socio/${socioInfo.socio.id}`);
        const cuentasAportacionesList = resAportaciones.data || [];
        const aportacionesRefrescadas = cuentasAportacionesList.find((c: any) => c.tipo === 'APORTACIONES');
        setCuentaAportaciones(aportacionesRefrescadas || null);
        const saldoResultanteAportaciones = aportacionesRefrescadas ? aportacionesRefrescadas.saldo : 0;

        showToast('Aportación social registrada y acreditada con éxito.', 'success');

        setTicketData({
          referencia: 'TX-VENT-' + Date.now(),
          tipo: 'APORTACIONES',
          monto: confirmTxData.monto,
          concepto: confirmTxData.concepto,
          socioNombre: socioInfo.socio.nombresCompletos,
          cuentaNumero: cuentaAportaciones.numeroCuenta,
          fechaHora: new Date().toLocaleString('es-ES', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
          }),
          saldoResultante: saldoResultanteAportaciones,
          socioCedula: socioInfo.socio.identificacion
        });
      }
      else {
        // Depósitos / Retiros regulares
        const payload = {
          cuentaAhorrosId: targetAccountId,
          monto: confirmTxData.monto,
          concepto: confirmTxData.concepto,
          declaracionOrigenFondos: confirmTxData.declaracionUafe
        };
        const endpoint = confirmTxData.tipo === 'DEPOSITO' ? '/cuentas/deposito' : '/cuentas/retiro';
        await api.post(endpoint, payload);

        showToast('Transacción procesada correctamente en los registros contables.', 'success');
        
        // Volver a consultar la cuenta del socio para que refleje estados y saldos actualizados
        const resCuenta = await api.get(`/cuentas/buscar-caja?query=${encodeURIComponent(socioInfo.socio.identificacion)}`);
        setSocioInfo(resCuenta.data);

        const updatedAcc = resCuenta.data.cuentas?.find((c: any) => c.id === targetAccountId);
        const saldoResultante = updatedAcc ? updatedAcc.saldo : resCuenta.data.saldo;

        setTicketData({
          referencia: 'TX-VENT-' + Date.now(),
          tipo: confirmTxData.tipo,
          monto: confirmTxData.monto,
          concepto: confirmTxData.concepto,
          socioNombre: socioInfo.socio.nombresCompletos,
          cuentaNumero: targetCuentaNumero,
          fechaHora: new Date().toLocaleString('es-ES', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
          }),
          depositante: confirmTxData.depositante,
          saldoResultante: saldoResultante,
          socioCedula: socioInfo.socio.identificacion
        });
      }

      // Limpiar campos comunes
      setMontoTx('');
      setConceptoTx('');
      setDepositante('');
      setDeclaracionUafe(false);
      setUafeJustificacion('');
      setConfirmTxData(null);
      await fetchMovimientos();
      window.dispatchEvent(new CustomEvent('caja-updated'));
    } catch (err: any) {
      console.error('Error procesando transacción:', err);
      setTxError(getErrorMessage(err));
      setConfirmTxData(null);
    } finally {
      setProcesandoTx(false);
    }
  };

  const handleVerTicket = (mov: MovimientoCaja) => {
    let depositanteExtracted: string | undefined = undefined;
    if (mov.descripcion.includes('(Depositante: ')) {
      const match = mov.descripcion.match(/\(Depositante:\s*([^)]+)\)/);
      if (match && match[1]) {
        depositanteExtracted = match[1].trim();
      }
    }

    let tipoTx: 'DEPOSITO' | 'RETIRO' | 'PAGO_CREDITO' | 'APORTACIONES' = mov.tipoTransaccion === 'CREDITO' ? 'DEPOSITO' : 'RETIRO';
    const desc = (mov.descripcion || '').toLowerCase();
    if (desc.includes('aportación') || desc.includes('aportacion')) {
      tipoTx = 'APORTACIONES';
    } else if (desc.includes('pago de cuota') || desc.includes('pago de crédito') || desc.includes('pago de credito')) {
      tipoTx = 'PAGO_CREDITO';
    }

    setTicketData({
      referencia: mov.referencia,
      tipo: tipoTx,
      monto: mov.monto,
      concepto: mov.descripcion,
      socioNombre: mov.cuenta?.socio?.nombresCompletos || socioInfo?.socio?.nombresCompletos || 'Socio Cooperativa',
      cuentaNumero: mov.cuenta?.numeroCuenta || 'N/A',
      fechaHora: new Date(mov.fechaContable).toLocaleString('es-ES', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      }),
      depositante: depositanteExtracted,
      saldoResultante: mov.saldoResultante,
      socioCedula: mov.cuenta?.socio?.identificacion || socioInfo?.socio?.identificacion || ''
    });
  };

  const getOperationBadge = (mov: MovimientoCaja) => {
    const desc = (mov.descripcion || '').toLowerCase();
    const esIngreso = esIngresoEfectivo(mov);
    
    if (desc.startsWith('[anulada]')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400 border border-slate-200/50 uppercase tracking-wider">
          Anulada
        </span>
      );
    }
    
    if (desc.includes('aportación') || desc.includes('aportacion')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 uppercase tracking-wider">
          <Coins className="h-3 w-3 text-teal-500" />
          Aportación
        </span>
      );
    }
    
    if (desc.includes('pago de cuota') || desc.includes('pago de crédito') || desc.includes('pago de credito')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
          <FileText className="h-3 w-3 text-blue-500" />
          Crédito
        </span>
      );
    }
    
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
        esIngreso ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}>
        {esIngreso ? <ArrowDownLeft className="h-3 w-3 text-emerald-500" /> : <ArrowUpRight className="h-3 w-3 text-rose-500" />}
        {esIngreso ? 'DEPÓSITO' : 'RETIRO'}
      </span>
    );
  };

  const handleAnularClick = (e: React.MouseEvent, mov: any) => {
    e.stopPropagation();
    if (mov.descripcion.startsWith('[ANULADA]')) {
      showToast('Esta transacción ya ha sido anulada.', 'error');
      return;
    }
    setTxParaAnular(mov);
    setClaveSupervisor('');
    setAnulacionError(null);
    setMostrarSupervisorModal(true);
  };

  const handleCloseSupervisorModal = () => {
    setMostrarSupervisorModal(false);
    setTxParaAnular(null);
    setClaveSupervisor('');
    setAnulacionError(null);
  };

  const handleConfirmarAnulacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txParaAnular) return;
    if (!claveSupervisor.trim()) {
      setAnulacionError('Ingrese la clave de supervisor.');
      return;
    }

    setAnulandoTx(true);
    setAnulacionError(null);
    try {
      await api.post(`/cuentas/transacciones/${txParaAnular.id}/anular`, {
        claveSupervisor: claveSupervisor.trim()
      });

      showToast('Transacción anulada y reversada con éxito.', 'success');
      setMostrarSupervisorModal(false);
      setTxParaAnular(null);
      setClaveSupervisor('');
      
      // Refrescar movimientos y saldo del socio
      await fetchMovimientos();
      if (socioInfo) {
        const resCuenta = await api.get(`/cuentas/buscar-caja?query=${encodeURIComponent(socioInfo.socio.identificacion)}`);
        setSocioInfo(resCuenta.data);
        fetchAportaciones(socioInfo.socio.id);
        fetchCreditos(socioInfo.socio.id);
      }
      window.dispatchEvent(new CustomEvent('caja-updated'));
    } catch (err: any) {
      console.error('Error anulando transacción:', err);
      setAnulacionError(getErrorMessage(err));
    } finally {
      setAnulandoTx(false);
    }
  };

  const handlePrintTicket = () => {
    if (!ticketData) return;

    // Formato de ticket POS personalizado: 80 mm de ancho por 130 mm de alto
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 130]
    });


    // 2. Cabecera Centrada
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    const instName = activeTenant?.name?.toUpperCase().replace(" LTDA.", "").trim() || "COOPERATIVA DE AHORRO Y CRÉDITO";
    
    if (activeTenant?.logoBase64) {
      try {
        let imgType = 'PNG';
        if (activeTenant.logoBase64.startsWith('data:image/jpeg')) imgType = 'JPEG';
        doc.addImage(activeTenant.logoBase64, imgType, 32, 5, 16, 16, undefined, 'FAST');
      } catch (e) {
        console.warn('Error drawing logo in ticket', e);
      }
    }

    doc.text(instName, 40, 26, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Canal Ventanilla", 40, 30, { align: "center" });
    doc.text(ticketData.referencia, 40, 35, { align: "center" });

    // 3. Tabla de Detalles alineada a la izquierda (x = 12)
    let currentY = 42;
    doc.setFontSize(8.5);

    const printLine = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      const labelText = label + ": ";
      doc.text(labelText, 12, currentY);
      
      doc.setFont("helvetica", "normal");
      const textWidth = doc.getTextWidth(labelText);
      doc.text(value || 'N/A', 12 + textWidth, currentY);
      currentY += 5;
    };

    // Fecha/Hora
    printLine("FECHA/HORA", ticketData.fechaHora);

    // Cajero (Format: Luis Paz)
    const cajeroNombre = user?.nombresCompletos 
      ? user.nombresCompletos.split(' ').slice(0, 2).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') 
      : 'Cajero';
    printLine("CAJERO", cajeroNombre);

    // Socio
    printLine("SOCIO", ticketData.socioNombre.toUpperCase());

    // Cédula / DNI
    printLine("CÉDULA / DNI", ticketData.socioCedula);

    // Nro Cuenta
    printLine("NRO. CUENTA", maskAccountNumber(ticketData.cuentaNumero));

    // Operación
    let tipoTxStr = "";
    if (ticketData.tipo === 'DEPOSITO') tipoTxStr = "DEPÓSITO EN EFECTIVO";
    else if (ticketData.tipo === 'RETIRO') tipoTxStr = "RETIRO EN EFECTIVO";
    else if (ticketData.tipo === 'PAGO_CREDITO') tipoTxStr = "PAGO DE CRÉDITO";
    else if (ticketData.tipo === 'APORTACIONES') tipoTxStr = "CERTIFICADO DE APORTACIÓN";
    printLine("OPERACIÓN", tipoTxStr);

    // Monto Neto
    printLine("MONTO NETO", `$${ticketData.monto.toFixed(2)}`);

    // Saldo Total
    printLine("SALDO TOTAL", `$${ticketData.saldoResultante.toFixed(2)}`);

    // Glosa (Salto de línea inteligente con alineación de margen)
    doc.setFont("helvetica", "bold");
    const glosaLabel = "GLOSA: ";
    doc.text(glosaLabel, 12, currentY);
    doc.setFont("helvetica", "normal");
    const glosaWidth = doc.getTextWidth(glosaLabel);
    
    // Obtener la primera línea del concepto que encaje junto al label
    const firstLineMaxW = 80 - 24 - glosaWidth;
    const firstLineSplit = doc.splitTextToSize(ticketData.concepto, firstLineMaxW);
    const firstLineText = firstLineSplit[0] || '';
    doc.text(firstLineText, 12 + glosaWidth, currentY);
    currentY += 5;
    
    // Escribir el resto del concepto alineado a la izquierda (x = 12)
    const remainingText = ticketData.concepto.substring(firstLineText.length).trim();
    if (remainingText) {
      const remainingSplit = doc.splitTextToSize(remainingText, 80 - 24);
      for (let i = 0; i < remainingSplit.length; i++) {
        doc.text(remainingSplit[i], 12, currentY);
        currentY += 5;
      }
    }

    // 4. Pie de página
    currentY += 4;

    currentY += 8;
    doc.text("Comprobante de Ventanilla Electrónico", 40, currentY, { align: "center" });

    // Guardar / Descargar PDF
    doc.save(`Comprobante_${ticketData.referencia}.pdf`);
  };

  // Renderizar loaders iniciales
  if (cargandoCaja) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Clock className="h-8 w-8 animate-spin text-[#0054A6]" />
          <p className="text-sm text-slate-500 font-medium">Validando estado de bóveda y diario...</p>
        </div>
      </div>
    );
  }

  // Vista de Caja Cerrada (Apertura Obligatoria)
  if (!caja) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 p-8 shadow-[0_15px_50px_-15px_rgba(0,84,166,0.06)] flex flex-col items-center select-none text-center">
          <div className="h-16 w-16 rounded-3xl bg-[#0054A6]/10 text-[#0054A6] flex items-center justify-center mb-6">
            <Lock className="h-7 w-7" />
          </div>

          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Caja Diaria Cerrada</h2>
          <p className="text-xs text-slate-500 mt-2 max-w-[280px]">
            Para operar transacciones de ventanilla de depósitos y retiros, debes abrir tu ciclo diario de arqueo.
          </p>

          {aperturaError && (
            <div className="w-full mt-6 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-semibold flex gap-2 text-left items-start">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{aperturaError}</span>
            </div>
          )}

          <form onSubmit={handleAperturar} className="w-full mt-6 space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500">Monto Inicial en Efectivo (Apertura)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">$</span>
                <Input 
                  type="text"
                  placeholder="0.00"
                  value={montoApertura}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                      setMontoApertura(val);
                    }
                  }}
                  disabled={aperturaLoading}
                  className="pl-8 text-lg font-bold text-slate-800"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={aperturaLoading}
              className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-12 flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
            >
              {aperturaLoading ? 'Aperturando canales...' : 'Abrir Caja Diaria'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Freno de sobregiro
  const sobregiroDetectado = activeTab === 'RETIRO' && montoTx.trim() !== '' && parseFloat(montoTx) > (activeAccount?.saldo || 0);
  const limiteUafeExcedido = montoTx.trim() !== '' && parseFloat(montoTx) >= 10000;

  return (
    <div className="space-y-8 animate-fade-in relative pt-4">

      {/* Cinta de Métricas de Ventanilla */}
      {caja && caja.estado === 'APERTURADA' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 no-print mb-8">
          
          {/* Estado de Caja */}
          <Card className="rounded-3xl border border-slate-100 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] bg-white flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Estado Operativo
              </span>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-2xl font-black text-slate-800 block">
                  Caja Abierta
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </Card>

          {/* Efectivo en Caja */}
          <Card className="rounded-3xl border border-slate-100 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] bg-white flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Efectivo Disponible
              </span>
              <span className="text-2xl font-black text-slate-800 block font-mono">
                ${saldoTeoricoCierre.toFixed(2)}
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100/50 flex items-center justify-center text-blue-500">
              <DollarSign className="h-6 w-6" />
            </div>
          </Card>

          {/* Arqueo y Cierre */}
          <Card 
            onClick={() => setMostrarPreCierre(true)}
            className="rounded-3xl border border-slate-100 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] bg-white hover:shadow-[0_12px_25px_rgba(225,29,72,0.04)] hover:border-rose-500/20 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 group flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block group-hover:text-rose-500 transition-colors">
                Fin de Jornada
              </span>
              <span className="text-xl md:text-2xl font-black text-slate-800 block group-hover:text-rose-600 transition-colors">
                Arqueo y Cierre
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100/50 group-hover:bg-rose-50 group-hover:border-rose-100/50 flex items-center justify-center text-slate-400 group-hover:text-rose-500 transition-colors">
              <LogOut className="h-6 w-6" />
            </div>
          </Card>

        </div>
      )}

      {/* Panel de Operaciones en Dos Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* Columna Izquierda: Búsqueda y Validación Legal (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Card Búsqueda */}
          <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_12px_30px_-8px_rgba(0,84,166,0.01)]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Buscar Socio</h3>
            <form onSubmit={handleBuscarSocio} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  type="text"
                  placeholder="Nro. Cuenta o Cédula (ej. 1710034065)"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value.replace(/\D/g, ''))}
                  className="pl-10 pr-10"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda('');
                      setSocioInfo(null);
                      setBusquedaError(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                disabled={buscandoSocio}
                className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold px-6 rounded-xl shrink-0 h-10.5 text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {buscandoSocio ? 'Buscando...' : 'Buscar'}
              </Button>
            </form>
            {busquedaError && (
              <p className="text-xs text-rose-600 font-medium mt-2 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {busquedaError}
              </p>
            )}
          </Card>

          {/* Ficha Socio y Validación */}
          {socioInfo ? (
            <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-6 animate-scale-up">
              <div className="pb-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 relative shadow-sm">
                    {socioInfo.socio.fotoPerfilUrl ? (
                      <img 
                        src={`http://localhost:8080/api/v1${socioInfo.socio.fotoPerfilUrl}`} 
                        alt="Foto Perfil Socio" 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <User className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{socioInfo.socio.nombresCompletos}</h3>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">SOC-{String(socioInfo.socio.id).padStart(6, '0')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${
                    socioInfo.socio.estado === 'ACTIVO' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {socioInfo.socio.estado}
                  </span>
                  <div className="text-right">
                    <span className="text-[9px] font-semibold text-slate-400 block uppercase">Saldo Seleccionado</span>
                    <span className="text-base font-black text-[#0054A6] block font-mono leading-none mt-0.5 text-right shrink-0">
                      ${activeAccount ? activeAccount.saldo.toFixed(2) : socioInfo.saldo.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selector de Portafolio */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Portafolio de Cuentas Activas</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {socioInfo.cuentas && socioInfo.cuentas.length > 0 ? (
                    socioInfo.cuentas.map((cta) => {
                      const isSelected = selectedAccountId === cta.id;
                      const isAhorro = cta.tipo === 'AHORRO_VISTA';
                      
                      return (
                        <div
                          key={cta.id}
                          onClick={() => {
                            setSelectedAccountId(cta.id);
                            if (cta.tipo === 'APORTACIONES') {
                              setActiveTab('APORTACIONES');
                            } else {
                              setActiveTab('DEPOSITO');
                            }
                            setTxError(null);
                          }}
                          className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[90px] ${
                            isSelected
                              ? 'border-[#0054A6] bg-blue-50/20 shadow-md ring-1 ring-[#0054A6]/20'
                              : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm hover:shadow'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                  isAhorro
                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                }`}>
                                  {isAhorro ? 'Ahorro a la Vista' : 'Aportaciones'}
                                </span>
                                {cta.estado === 'INACTIVA' && (
                                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wider">
                                    Inactiva
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono font-bold text-slate-500 block mt-2">{cta.numeroCuenta}</span>
                            </div>
                            {isSelected && (
                              <span className="h-4 w-4 rounded-full bg-[#0054A6] text-white flex items-center justify-center text-[8px] font-black shrink-0 font-sans">✓</span>
                            )}
                          </div>
                          <div className="mt-3 flex justify-between items-end">
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Saldo</span>
                            <span className="text-xs font-black text-slate-800 font-mono leading-none">${cta.saldo.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      onClick={() => setSelectedAccountId(socioInfo.cuentaId)}
                      className="p-4 rounded-2xl border border-[#0054A6] bg-blue-50/20 shadow-md flex flex-col justify-between cursor-pointer min-h-[90px]"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-blue-100 bg-blue-50 text-blue-700 uppercase tracking-wider">
                            Ahorro a la Vista
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 block mt-2">{socioInfo.numeroCuenta}</span>
                        </div>
                        <span className="h-4 w-4 rounded-full bg-[#0054A6] text-white flex items-center justify-center text-[8px] font-black">✓</span>
                      </div>
                      <div className="mt-3 flex justify-between items-end">
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Saldo</span>
                        <span className="text-xs font-black text-slate-800 font-mono leading-none">${socioInfo.saldo.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="text-[10px] text-slate-400 font-medium pt-1.5 flex gap-4">
                  <span>C.I. Titular: <strong className="text-slate-600 font-semibold">{socioInfo.socio.identificacion}</strong></span>
                  <span>Código Socio: <strong className="text-slate-600 font-semibold">SOC-{String(socioInfo.socio.id).padStart(6, '0')}</strong></span>
                </div>
              </div>

              {/* Bloque: Validación Cédula / Firma */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                  <FileText className="h-4.5 w-4.5 text-[#0054A6]" />
                  <h4 className="text-xs font-bold text-slate-800">Verificación Documental de Cédula y Firma</h4>
                </div>

                {socioInfo.socio.fotoCedulaFrontalUrl && socioInfo.socio.fotoCedulaPosteriorUrl && !useMockups ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Render de imágenes físicas cargadas */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 block text-center">Cédula Frontal</span>
                      <div 
                        className="h-40 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-200 shadow-sm hover:shadow-xl"
                        onClick={() => setCedulaModalView('FRONTAL')}
                      >
                        <img 
                          src={`http://localhost:8080/api/v1${socioInfo.socio.fotoCedulaFrontalUrl}`} 
                          alt="Cédula Frontal" 
                          className="h-full w-full object-cover" 
                          onError={() => setUseMockups(true)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 block text-center">Cédula Posterior / Firma</span>
                      <div 
                        className="h-40 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-200 shadow-sm hover:shadow-xl"
                        onClick={() => setCedulaModalView('POSTERIOR')}
                      >
                        <img 
                          src={`http://localhost:8080/api/v1${socioInfo.socio.fotoCedulaPosteriorUrl}`} 
                          alt="Cédula Posterior" 
                          className="h-full w-full object-cover" 
                          onError={() => setUseMockups(true)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Mockups Vectoriales SVG interactivos
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[11px] text-amber-700 font-semibold flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Socio sin documentos cargados en el servidor. Visualizando simulaciones vectoriales para cotejar firmas oficiales.</span>
                    </div>
                    <div className="flex flex-col xl:flex-row gap-6 justify-center items-center">
                      <div className="space-y-1 w-full max-w-sm">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center block">Cédula Frontal</span>
                        <div onClick={() => setCedulaModalView('FRONTAL')} className="cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-200 shadow-sm hover:shadow-xl rounded-2xl">
                          <CedulaFrontalMockup 
                            nombres={socioInfo.socio.nombresCompletos} 
                            cedula={socioInfo.socio.identificacion}
                            avatarUrl={socioInfo.socio.fotoPerfilUrl || null}
                          />
                        </div>
                      </div>
                      <div className="space-y-1 w-full max-w-sm">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center block">Cédula Posterior (Firma)</span>
                        <div onClick={() => setCedulaModalView('POSTERIOR')} className="cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-200 shadow-sm hover:shadow-xl rounded-2xl">
                          <CedulaPosteriorMockup 
                            cedula={socioInfo.socio.identificacion}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-12 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] flex flex-col items-center justify-center text-center select-none min-h-[300px]">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mb-4 border border-slate-100/50">
                <Search className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-500">Búsqueda Requerida</h4>
              <p className="text-xs text-slate-400 max-w-[280px] mt-1.5">
                Ingresa el número de cédula o el número de cuenta de ahorros del socio en la barra superior para cargar su ficha legal.
              </p>
            </Card>
          )}

        </div>

        {/* Columna Derecha: Formulario Transaccional (2/5) */}
        <div className="lg:col-span-2">
          
          <Card className="rounded-[2.2rem] border border-slate-100 bg-white shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)] overflow-hidden">
            
            {/* Tabs Control */}
            <div className="flex bg-[#F1F3F6] p-1 border border-slate-100/50 rounded-full gap-1 shadow-sm mx-6 mt-6">
              <button
                type="button"
                disabled={!isAhorroVista}
                onClick={() => {
                  if (!isAhorroVista) return;
                  setActiveTab('DEPOSITO');
                  setTxError(null);
                  setMontoTx('');
                  setConceptoTx('');
                  setDepositante('');
                  setDeclaracionUafe(false);
                }}
                title={!isAhorroVista ? 'Transacción no permitida para este tipo de cuenta' : ''}
                className={`relative flex-1 py-2 text-[10px] font-extrabold tracking-wider uppercase flex items-center justify-center gap-1 rounded-full ${
                  !isAhorroVista ? 'opacity-40 cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-500 hover:text-slate-805'
                }`}
              >
                {isAhorroVista && activeTab === 'DEPOSITO' && (
                  <motion.div
                    layoutId="activeTabVentanilla"
                    className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1 transition-colors duration-300 ${
                  isAhorroVista && activeTab === 'DEPOSITO' ? 'text-white' : 'text-slate-500'
                }`}>
                  <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                  Depósito
                </span>
              </button>
              <button
                type="button"
                disabled={!isAhorroVista}
                onClick={() => {
                  if (!isAhorroVista) return;
                  setActiveTab('RETIRO');
                  setTxError(null);
                  setMontoTx('');
                  setConceptoTx('');
                  setDeclaracionUafe(false);
                }}
                title={!isAhorroVista ? 'Transacción no permitida para este tipo de cuenta' : ''}
                className={`relative flex-1 py-2 text-[10px] font-extrabold tracking-wider uppercase flex items-center justify-center gap-1 rounded-full ${
                  !isAhorroVista ? 'opacity-40 cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-500 hover:text-slate-805'
                }`}
              >
                {isAhorroVista && activeTab === 'RETIRO' && (
                  <motion.div
                    layoutId="activeTabVentanilla"
                    className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1 transition-colors duration-300 ${
                  isAhorroVista && activeTab === 'RETIRO' ? 'text-white' : 'text-slate-500'
                }`}>
                  <ArrowUpRight className="h-4 w-4 text-rose-500" />
                  Retiro
                </span>
              </button>
              <button
                type="button"
                disabled={!isAhorroVista}
                onClick={() => {
                  if (!isAhorroVista) return;
                  setActiveTab('PAGO_CREDITO');
                  setTxError(null);
                  setConceptoTx('');
                  setDeclaracionUafe(false);
                  if (cuotaPendiente) {
                    const cap = (cuotaPendiente.capitalProyectado || 0) - (cuotaPendiente.capitalPagado || 0);
                    const int = (cuotaPendiente.interesProyectado || 0) - (cuotaPendiente.interesPagado || 0);
                    const mor = (cuotaPendiente.montoMoraAcumulado || 0) - (cuotaPendiente.montoMoraPagado || 0);
                    const val = cap + int + mor;
                    setMontoTx(val.toFixed(2));
                  } else {
                    setMontoTx('');
                  }
                }}
                title={!isAhorroVista ? 'Transacción no permitida para este tipo de cuenta' : ''}
                className={`relative flex-1 py-2 text-[10px] font-extrabold tracking-wider uppercase flex items-center justify-center gap-1 rounded-full ${
                  !isAhorroVista ? 'opacity-40 cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-500 hover:text-slate-805'
                }`}
              >
                {isAhorroVista && activeTab === 'PAGO_CREDITO' && (
                  <motion.div
                    layoutId="activeTabVentanilla"
                    className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1 transition-colors duration-300 ${
                  isAhorroVista && activeTab === 'PAGO_CREDITO' ? 'text-white' : 'text-slate-500'
                }`}>
                  <FileText className="h-4 w-4 text-blue-500" />
                  Crédito
                </span>
              </button>
              <button
                type="button"
                disabled={!isAportaciones}
                onClick={() => {
                  if (!isAportaciones) return;
                  setActiveTab('APORTACIONES');
                  setTxError(null);
                  setMontoTx('');
                  setConceptoTx('');
                  setDeclaracionUafe(false);
                }}
                title={!isAportaciones ? 'Transacción no permitida para este tipo de cuenta' : ''}
                className={`relative flex-1 py-2 text-[10px] font-extrabold tracking-wider uppercase flex items-center justify-center gap-1 rounded-full ${
                  !isAportaciones ? 'opacity-40 cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-500 hover:text-slate-805'
                }`}
              >
                {isAportaciones && activeTab === 'APORTACIONES' && (
                  <motion.div
                    layoutId="activeTabVentanilla"
                    className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1 transition-colors duration-300 ${
                  isAportaciones && activeTab === 'APORTACIONES' ? 'text-white' : 'text-slate-500'
                }`}>
                  <Coins className="h-4 w-4 text-amber-500" />
                  Aportaciones
                </span>
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              
              {txError && (
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-semibold flex gap-2 items-start animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{txError}</span>
                </div>
              )}

              <form onSubmit={handleTransaccionSubmit} className="space-y-6">
                
                {/* Detalles de Crédito Activo */}
                {activeTab === 'PAGO_CREDITO' && socioInfo && (
                  <div className="space-y-3 animate-slide-down">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Información de Crédito</label>
                    {cargandoCredito ? (
                      <div className="py-4 text-center text-xs text-slate-400">Cargando datos de crédito...</div>
                    ) : creditosSocio.length > 0 ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <select
                            value={creditoSeleccionado?.id || ''}
                            onChange={async (e) => {
                              const cred = creditosSocio.find(c => c.id === parseInt(e.target.value));
                              setCreditoSeleccionado(cred || null);
                              if (cred) await fetchAmortizacion(cred.id);
                            }}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#0054A6]/10"
                          >
                            {creditosSocio.map((c: any) => (
                              <option key={c.id} value={c.id}>
                                Contrato: {c.numeroCredito} - Desembolsado: ${(c.montoDesembolsado || c.montoSolicitado || 0).toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {cuotaPendiente ? (
                          <div className="bg-blue-50/40 border border-blue-100/70 rounded-2xl p-4.5 space-y-2.5 text-xs">
                            <div className="flex justify-between items-center pb-2 border-b border-blue-100/30">
                              <span className="font-extrabold text-blue-800 uppercase text-[10px]">Detalle de Cuota Nro. {cuotaPendiente.numeroCuota}</span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-mono">
                                Vence: {(() => {
                                  const dt = cuotaPendiente.fechaVencimiento;
                                  if (Array.isArray(dt)) {
                                    return `${String(dt[2]).padStart(2, '0')}/${String(dt[1]).padStart(2, '0')}/${dt[0]}`;
                                  }
                                  return dt ? new Date(dt).toLocaleDateString('es-ES') : 'N/A';
                                })()}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 font-semibold font-mono">
                              <div>
                                <span className="text-[8px] font-bold text-slate-400 block uppercase">Capital</span>
                                <span>${((cuotaPendiente.capitalProyectado || 0) - (cuotaPendiente.capitalPagado || 0)).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[8px] font-bold text-slate-400 block uppercase">Interés</span>
                                <span>${((cuotaPendiente.interesProyectado || 0) - (cuotaPendiente.interesPagado || 0)).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[8px] font-bold text-slate-400 block uppercase">Mora</span>
                                <span className={(cuotaPendiente.montoMoraAcumulado || 0) > (cuotaPendiente.montoMoraPagado || 0) ? "text-rose-600 font-bold" : ""}>
                                  ${((cuotaPendiente.montoMoraAcumulado || 0) - (cuotaPendiente.montoMoraPagado || 0)).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="border-t border-dashed border-blue-200/50 pt-2 flex justify-between items-center text-xs font-black text-blue-900">
                              <span>TOTAL CUOTA PENDIENTE:</span>
                              <span className="font-mono text-[14px]">
                                ${(((cuotaPendiente.capitalProyectado || 0) - (cuotaPendiente.capitalPagado || 0)) +
                                  ((cuotaPendiente.interesProyectado || 0) - (cuotaPendiente.interesPagado || 0)) +
                                  ((cuotaPendiente.montoMoraAcumulado || 0) - (cuotaPendiente.montoMoraPagado || 0))).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-700 font-semibold flex gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>El socio no registra cuotas pendientes por pagar.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-700 font-semibold flex gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>El socio no tiene créditos activos (DESEMBOLSADO / EN_MORA).</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Detalles de Cuenta de Aportaciones */}
                {activeTab === 'APORTACIONES' && socioInfo && (
                  <div className="space-y-3 animate-slide-down">
                    <label className="block text-xs font-bold text-slate-500 uppercase font-sans">Información de Aportación</label>
                    {cargandoAportaciones ? (
                      <div className="py-4 text-center text-xs text-slate-400">Cargando cuenta de aportaciones...</div>
                    ) : cuentaAportaciones ? (
                      <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-4 space-y-2.5 text-xs">
                        <div className="flex justify-between items-center pb-1.5 border-b border-amber-100/30">
                          <span className="font-extrabold text-amber-800 uppercase text-[10px]">Certificados de Aportación</span>
                          <span className="text-[9px] font-black text-amber-700 uppercase">Capital Social</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 block uppercase">Nro. Cuenta</span>
                            <span className="font-bold text-slate-700 font-mono">{cuentaAportaciones.numeroCuenta}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-bold text-slate-400 block uppercase">Saldo Aportado</span>
                            <span className="font-black text-amber-600 font-mono text-[14px]">${(cuentaAportaciones.saldo || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 font-semibold flex gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>El socio no posee una cuenta de aportaciones (Capital Social) activa.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Monto de la Transacción */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Monto de la Operación</label>
                  <div className="relative">
                    <span className={`absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl ${
                      sobregiroDetectado ? 'text-rose-500' : 'text-slate-400'
                    }`}>$</span>
                    <Input 
                      type="text"
                      placeholder="0.00"
                      value={montoTx}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                          setMontoTx(val);
                        }
                      }}
                      disabled={procesandoTx || !socioInfo}
                      className={`pl-10 text-3xl font-black rounded-2xl h-16 border-2 focus-visible:ring-4 ${
                        sobregiroDetectado 
                          ? 'border-rose-300 text-rose-600 focus-visible:ring-rose-500/10 focus-visible:border-rose-500 bg-rose-50/30' 
                          : 'text-[#0054A6] bg-slate-50/30'
                      }`}
                    />
                  </div>
                  {sobregiroDetectado && (
                    <p className="text-[10px] text-rose-600 font-extrabold flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Fondos insuficientes (Saldo socio: ${socioInfo?.saldo.toFixed(2)})
                    </p>
                  )}
                </div>

                {/* Concepto (Glosa) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Concepto / Glosa</label>
                  <Input 
                    type="text"
                    placeholder={`Ej. ${
                      activeTab === 'DEPOSITO' 
                        ? 'Depósito mensual de ahorros' 
                        : activeTab === 'RETIRO'
                          ? 'Retiro por ventanilla'
                          : activeTab === 'PAGO_CREDITO'
                            ? 'Pago de cuota de crédito'
                            : 'Depósito a cuenta de aportaciones'
                    }`}
                    value={conceptoTx}
                    onChange={(e) => setConceptoTx(e.target.value)}
                    disabled={procesandoTx || !socioInfo}
                  />
                </div>

                {/* Depositante Tercero (Solo Depósito) */}
                {activeTab === 'DEPOSITO' && (
                  <div className="space-y-1.5 animate-slide-down">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Nombre Depositante (Si es Tercero)</label>
                    <Input 
                      type="text"
                      placeholder="Ej. María Gómez (Opcional)"
                      value={depositante}
                      onChange={(e) => setDepositante(e.target.value)}
                      disabled={procesandoTx || !socioInfo}
                    />
                  </div>
                )}

                {/* Checkbox UAFE si excede 10k */}
                {limiteUafeExcedido && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200/50 rounded-2xl space-y-3.5 animate-slide-down">
                    <div className="flex gap-2 items-start">
                      <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[11px] font-bold text-amber-800 uppercase">Control Regulatorio SEPS / UAFE</h4>
                        <p className="text-[10px] text-amber-700 leading-tight mt-0.5">
                          Toda transacción en efectivo de $10,000.00 USD o más requiere registrar obligatoriamente la Declaración de Origen Lícito de Fondos.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-amber-900 uppercase block leading-none">
                        Declaración Jurada del Origen de los Fondos (Obligatorio)
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej. Ahorros de sueldo, Venta de inmueble, Préstamo..."
                        value={uafeJustificacion}
                        onChange={(e) => setUafeJustificacion(e.target.value)}
                        disabled={procesandoTx || !socioInfo}
                        className="h-9 text-xs rounded-xl bg-white border-amber-300 text-slate-800 placeholder-amber-600/50 focus:ring-amber-500"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-[10px] text-amber-850 font-extrabold cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={declaracionUafe}
                        onChange={(e) => setDeclaracionUafe(e.target.checked)}
                        disabled={procesandoTx || !socioInfo}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                      />
                      <span>He verificado y tengo en físico la declaración firmada.</span>
                    </label>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    procesandoTx || 
                    !socioInfo || 
                    sobregiroDetectado || 
                    (limiteUafeExcedido && (!declaracionUafe || !uafeJustificacion.trim())) ||
                    (activeTab === 'PAGO_CREDITO' && (!creditoSeleccionado || !cuotaPendiente)) ||
                    (activeTab === 'APORTACIONES' && !cuentaAportaciones)
                  }
                  className={`w-full !text-white font-bold rounded-2xl h-13 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ${
                    activeTab === 'DEPOSITO' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10' 
                      : activeTab === 'APORTACIONES'
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/10'
                        : 'bg-[#0054A6] hover:bg-[#004080] shadow-blue-500/10'
                  }`}
                >
                  {procesandoTx ? (
                    <span className="text-white font-bold">Procesando transacción ACID...</span>
                  ) : activeTab === 'DEPOSITO' ? (
                    <span className="flex items-center gap-2 text-white font-bold">
                      <ArrowDownLeft className="h-4.5 w-4.5 text-white" />
                      Registrar Depósito
                    </span>
                  ) : activeTab === 'RETIRO' ? (
                    <span className="flex items-center gap-2 text-white font-bold">
                      <ArrowUpRight className="h-4.5 w-4.5 text-white" />
                      Registrar Retiro
                    </span>
                  ) : activeTab === 'PAGO_CREDITO' ? (
                    <span className="flex items-center gap-2 text-white font-bold">
                      <FileText className="h-4.5 w-4.5 text-white" />
                      Registrar Pago Crédito
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-white font-bold">
                      <Coins className="h-4.5 w-4.5 text-white" />
                      Registrar Aportación
                    </span>
                  )}
                </Button>

              </form>

            </div>

          </Card>

        </div>

      </div>

      {/* Tabla del Diario de Caja (Día en curso) */}
      <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-50">
          <div className="flex items-center gap-2.5">
            <Coins className="h-5 w-5 text-[#0054A6]" />
            <h3 className="text-base font-bold text-slate-800">Transacciones en Ventanilla</h3>
          </div>
          <span className="text-[10px] font-bold px-3 py-1 bg-slate-100 rounded-xl text-slate-500">
            Total Movimientos: {movimientos.filter(m => !esPuenteCredito(m)).length}
          </span>
        </div>

        {/* Filtros de Diario */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/70 select-none animate-fade-in">
          {/* Filtro de Tipo (Pills / Selector) */}
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
            <button
              onClick={() => setFiltroTipo('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider transition-all uppercase cursor-pointer ${
                filtroTipo === 'TODOS'
                  ? 'bg-white text-[#0054A6] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroTipo('CREDITO')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider transition-all uppercase cursor-pointer ${
                filtroTipo === 'CREDITO'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Depósitos
            </button>
            <button
              onClick={() => setFiltroTipo('DEBITO')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider transition-all uppercase cursor-pointer ${
                filtroTipo === 'DEBITO'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Retiros
            </button>
          </div>

          {/* Buscador de Diario */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por cédula, cuenta o socio..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
            />
          </div>
        </div>

        <div className={`overflow-x-auto transition-all duration-300 ${
          movimientosFiltrados.length > 10 ? 'max-h-[440px] overflow-y-auto pr-1' : ''
        }`}>
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white">
                <th className="pb-3.5 pl-2 bg-white">Fecha y Hora</th>
                <th className="pb-3.5 bg-white">Referencia</th>
                <th className="pb-3.5 bg-white">Nro. Cuenta</th>
                <th className="pb-3.5 bg-white">Socio</th>
                <th className="pb-3.5 bg-white">Operación</th>
                <th className="pb-3.5 text-right bg-white">Monto</th>
                <th className="pb-3.5 text-center bg-white">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {movimientosFiltrados.length > 0 ? (
                [...movimientosFiltrados].reverse().map((mov) => {
                  const esIngreso = esIngresoEfectivo(mov);
                  const esAnulada = mov.descripcion.startsWith('[ANULADA]');
                  return (
                    <tr 
                      key={mov.id} 
                      className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                        esAnulada ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                      onClick={() => handleVerTicket(mov)}
                      title="Haga clic para ver e imprimir el comprobante de esta transacción"
                    >
                      <td className="py-3.5 pl-2 font-mono text-[11px] text-slate-500">
                        {new Date(mov.fechaContable).toLocaleString('es-ES', { 
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td className="py-3.5 font-mono text-[11px] text-slate-500">{mov.referencia}</td>
                      <td className="py-3.5 font-mono text-[11px] text-slate-600">{mov.cuenta?.numeroCuenta || 'N/A'}</td>
                      <td className="py-3.5 text-slate-700 font-bold uppercase truncate max-w-[150px]" title={mov.cuenta?.socio?.nombresCompletos || socioInfo?.socio?.nombresCompletos}>
                        {mov.cuenta?.socio?.nombresCompletos || socioInfo?.socio?.nombresCompletos || 'Socio Cooperativa'}
                      </td>
                      <td className="py-3.5">
                        {getOperationBadge(mov)}
                      </td>
                      <td className={`py-3.5 text-right font-bold font-mono text-[12px] ${
                        esAnulada ? 'text-slate-400 line-through' : esIngreso ? 'text-emerald-600' : 'text-slate-800'
                      }`}>
                        {esAnulada ? '' : esIngreso ? '+' : '-'}${mov.monto.toFixed(2)}
                      </td>
                      <td className="py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {!esAnulada ? (
                          <button
                            type="button"
                            onClick={(e) => handleAnularClick(e, mov)}
                            className="text-[10px] font-bold text-rose-500/80 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-100"
                          >
                            Anular
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-450 italic">
                            Reversado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se han registrado depósitos ni retiros por ventanilla el día de hoy.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Ticket de Ventanilla */}
      {ticketData && (
        <div 
          onClick={() => setTicketData(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in select-none cursor-default"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden animate-scale-up cursor-default"
          >
            
            <button 
              onClick={() => setTicketData(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Area de Impresión */}
            <div ref={ticketRef} className="font-mono text-[11px] text-slate-800 space-y-4 pt-2">
              <div className="text-center space-y-1">
                {activeTenant?.logoBase64 ? (
                  <img src={activeTenant.logoBase64} alt="Logo" className="h-8 w-auto mx-auto mb-1.5" />
                ) : (
                  <Building className="h-6 w-6 text-[#0054A6] mx-auto mb-1.5" />
                )}
                <h4 className="font-extrabold text-[12px] uppercase tracking-wide">
                  {activeTenant?.name?.toUpperCase() || 'ITQ'}
                </h4>
                <p className="text-[10px] text-slate-500 uppercase leading-none">Canal Ventanilla</p>
                <p className="text-[9px] text-slate-400 font-bold tracking-widest">{ticketData.referencia}</p>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>FECHA/HORA:</span>
                  <span className="font-bold">{ticketData.fechaHora}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAJERO:</span>
                  <span className="font-bold uppercase">{user?.nombresCompletos.split(' ').slice(0, 2).join(' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>SOCIO:</span>
                  <span className="font-bold uppercase">{ticketData.socioNombre}</span>
                </div>
                <div className="flex justify-between">
                  <span>CÉDULA / DNI:</span>
                  <span className="font-bold">{ticketData.socioCedula}</span>
                </div>
                <div className="flex justify-between">
                  <span>NRO. CUENTA:</span>
                  <span className="font-bold">{maskAccountNumber(ticketData.cuentaNumero)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px] font-black">
                  <span>OPERACIÓN:</span>
                  <span className={
                    ticketData.tipo === 'DEPOSITO' 
                      ? 'text-emerald-600' 
                      : ticketData.tipo === 'RETIRO' 
                        ? 'text-rose-600'
                        : ticketData.tipo === 'PAGO_CREDITO'
                          ? 'text-blue-600'
                          : 'text-amber-600'
                  }>
                    {ticketData.tipo === 'DEPOSITO' && 'DEPÓSITO EN EFECTIVO'}
                    {ticketData.tipo === 'RETIRO' && 'RETIRO EN EFECTIVO'}
                    {ticketData.tipo === 'PAGO_CREDITO' && 'PAGO DE CRÉDITO'}
                    {ticketData.tipo === 'APORTACIONES' && 'CERTIFICADO DE APORTACIÓN'}
                  </span>
                </div>
                {ticketData.depositante && (
                  <div className="flex justify-between">
                    <span>DEPOSITANTE:</span>
                    <span className="font-bold uppercase">{ticketData.depositante}</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px] font-black bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                  <span>MONTO NETO:</span>
                  <span>${ticketData.monto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold bg-slate-50/50 p-1.5 rounded-lg border border-slate-100/50 border-dashed">
                  <span>SALDO TOTAL:</span>
                  <span>${ticketData.saldoResultante.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>GLOSA:</span>
                  <span className="font-bold text-right max-w-[180px] break-words">{ticketData.concepto}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-3" />



              <div className="text-center pt-3 text-[9px] text-slate-400">
                <p>Comprobante de Ventanilla Electrónico</p>
              </div>
            </div>

            {/* Controles de Ticket */}
            <div className="mt-6">
              <Button
                onClick={handlePrintTicket}
                className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-11 flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md"
              >
                <Printer className="h-4 w-4" />
                Imprimir Comprobante
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Confirmación de Transacción */}
      {confirmTxData && socioInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden animate-scale-up">
            
            <button 
              onClick={() => setConfirmTxData(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-4 pt-2">
              <div className="text-center space-y-1">
                <AlertCircle className="h-8 w-8 text-[#0054A6] mx-auto mb-1.5" />
                <h4 className="font-extrabold text-[14px] text-slate-800 uppercase tracking-wide">
                  Confirmación de Transacción
                </h4>
                <p className="text-xs text-slate-500">
                  Por favor, verifique detalladamente los datos de la operación antes de procesarla en el sistema contable.
                </p>
              </div>

              <div className="border-t border-slate-100 my-2" />

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Operación:</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-lg ${
                    confirmTxData.tipo === 'DEPOSITO' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : confirmTxData.tipo === 'RETIRO' 
                        ? 'bg-rose-50 text-rose-700'
                        : confirmTxData.tipo === 'PAGO_CREDITO'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                  }`}>
                    {confirmTxData.tipo === 'DEPOSITO' && 'DEPÓSITO EN EFECTIVO'}
                    {confirmTxData.tipo === 'RETIRO' && 'RETIRO EN EFECTIVO'}
                    {confirmTxData.tipo === 'PAGO_CREDITO' && 'PAGO DE CRÉDITO'}
                    {confirmTxData.tipo === 'APORTACIONES' && 'CERTIFICADO DE APORTACIÓN'}
                  </span>
                </div>
                
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Socio:</span>
                  <span className="font-bold text-slate-800 uppercase">{socioInfo.socio.nombresCompletos}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Identificación:</span>
                  <span className="font-mono text-slate-800">{socioInfo.socio.identificacion}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Número de Cuenta:</span>
                  <span className="font-mono text-slate-800 font-bold">{activeAccount?.numeroCuenta || socioInfo.numeroCuenta}</span>
                </div>

                {confirmTxData.depositante && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="font-bold text-slate-400 uppercase text-[10px]">Depositante:</span>
                    <span className="font-bold text-slate-800 uppercase">{confirmTxData.depositante}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Concepto:</span>
                  <span className="font-semibold text-slate-600 text-right max-w-[200px] break-words">{confirmTxData.concepto}</span>
                </div>

                {confirmTxData.declaracionUafe && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="font-bold text-slate-400 uppercase text-[10px]">Origen de Fondos (UAFE):</span>
                    <span className="font-black text-emerald-600 uppercase">Declarado &gt;= $10k</span>
                  </div>
                )}

                {confirmTxData.uafeJustificacion && (
                  <div className="flex flex-col py-1 border-b border-slate-50 gap-0.5">
                    <span className="font-bold text-slate-400 uppercase text-[10px]">Justificación UAFE:</span>
                    <span className="font-semibold text-amber-700 font-mono break-words">{confirmTxData.uafeJustificacion}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black bg-slate-50 p-2.5 rounded-2xl border border-slate-100 mt-2">
                  <span className="text-slate-500">MONTO A PROCESAR:</span>
                  <span className={`font-mono text-[16px] ${
                    confirmTxData.tipo === 'DEPOSITO' 
                      ? 'text-emerald-600' 
                      : confirmTxData.tipo === 'RETIRO' 
                        ? 'text-rose-600'
                        : confirmTxData.tipo === 'PAGO_CREDITO'
                          ? 'text-blue-600'
                          : 'text-amber-600'
                  }`}>
                    ${confirmTxData.monto.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Controles del Modal de Confirmación */}
            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => setConfirmTxData(null)}
                variant="outline"
                className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl h-11 text-xs cursor-pointer"
                disabled={procesandoTx}
              >
                Cancelar
              </Button>
              <Button
                onClick={executeTransaccion}
                className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-11 flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md"
                disabled={procesandoTx}
              >
                {procesandoTx ? 'Procesando...' : 'Confirmar Operación'}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Pre-Confirmación de Arqueo */}
      {mostrarPreCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in select-none">
          <Card className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden animate-scale-up">
            
            <button 
              onClick={() => setMostrarPreCierre(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100 shadow-inner">
                <AlertCircle className="h-7 w-7 animate-pulse" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">¿Iniciar Arqueo de Caja?</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[320px]">
                  Está por iniciar el arqueo físico y conciliación. 
                  <span className="font-bold text-amber-600"> Esta acción suspenderá temporalmente</span> la ventanilla para realizar el balance teórico final.
                </p>
              </div>

              <div className="w-full border-t border-slate-100 py-3.5 space-y-2 text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Monto de Apertura:</span>
                  <span className="font-mono font-bold">${caja.montoApertura.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total Depósitos ({movimientos.filter(m => esIngresoEfectivo(m)).length}):</span>
                  <span className="font-mono font-bold text-emerald-600">+${ingresosCaja.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total Retiros ({movimientos.filter(m => esEgresoEfectivo(m)).length}):</span>
                  <span className="font-mono font-bold text-rose-600">-${egresosCaja.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-bold border-t border-dashed border-slate-200 pt-2 text-xs">
                  <span>Saldo Teórico Contable:</span>
                  <span className="font-mono text-[#0054A6]">${saldoTeoricoCierre.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => setMostrarPreCierre(false)}
                variant="outline"
                className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl h-11 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setMostrarPreCierre(false);
                  setMostrarCierre(true);
                  setCierreError(null);
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl h-11 flex items-center justify-center text-xs cursor-pointer shadow-md"
              >
                Iniciar Arqueo
              </Button>
            </div>

          </Card>
        </div>
      )}

      {/* Modal: Cierre de Caja / Arqueo */}
      {mostrarCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in select-none">
          <Card className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden animate-scale-up">
            
            <button 
              onClick={() => setMostrarCierre(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100/50">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Arqueo y Cierre Diario de Caja</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                Consolida e ingresa el efectivo real para conciliar diferencias contables.
              </p>
            </div>

            {cierreError && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-semibold flex gap-2 items-start mt-4 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{cierreError}</span>
              </div>
            )}

            <div className="mt-5 space-y-3.5 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Efectivo Apertura:</span>
                <span className="font-bold text-slate-700 font-mono">${caja.montoApertura.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Total Depósitos (+):</span>
                <span className="font-bold text-emerald-600 font-mono">+${ingresosCaja.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Total Retiros (-):</span>
                <span className="font-bold text-rose-600 font-mono">-${egresosCaja.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-slate-100 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[#0054A6] font-extrabold uppercase text-[9px] tracking-widest">Saldo Teórico Contable:</span>
                <span className="font-black text-[#0054A6] font-mono text-[13px]">${saldoTeoricoCierre.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleCerrarCaja} className="mt-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500">Monto Físico Real en Efectivo</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">$</span>
                  <Input 
                    type="text"
                    placeholder="0.00"
                    value={efectivoReal}
                    onChange={(e) => setEfectivoReal(e.target.value)}
                    disabled={cierreLoading}
                    className="pl-8 text-lg font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Diferencia Informativa */}
              {efectivoReal.trim() !== '' && !isNaN(parseFloat(efectivoReal)) && (() => {
                const diff = parseFloat(efectivoReal) - saldoTeoricoCierre;
                const esCabal = Math.abs(diff) < 0.01;
                const esFaltante = diff < 0;
                
                return (
                  <div className={`p-3 rounded-2xl border text-xs font-bold flex gap-2 items-center animate-fade-in ${
                    esCabal 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                      : esFaltante 
                        ? 'bg-rose-50 border-rose-100 text-rose-700' 
                        : 'bg-amber-50 border-amber-100 text-amber-700'
                  }`}>
                    {esCabal ? (
                      <>
                        <CheckCircle2 className="h-4.5 w-4.5" />
                        <span>Caja cuadra perfectamente (${diff.toFixed(2)}).</span>
                      </>
                    ) : esFaltante ? (
                      <>
                        <AlertCircle className="h-4.5 w-4.5" />
                        <span>Faltante de $({Math.abs(diff).toFixed(2)}) a cobrar al cajero.</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4.5 w-4.5" />
                        <span>Sobrante de $({diff.toFixed(2)}) catalogado como ingreso.</span>
                      </>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={cierreLoading}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl h-11 flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md shadow-rose-500/10"
                >
                  {cierreLoading ? 'Procesando cierre...' : 'Confirmar Cierre'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setMostrarCierre(false)}
                  variant="outline"
                  className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-2xl h-11 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Autorización de Supervisor */}
      {mostrarSupervisorModal && txParaAnular && (
        <div 
          onClick={handleCloseSupervisorModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in select-none"
        >
          <Card 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden animate-scale-up"
          >
            <button 
              onClick={handleCloseSupervisorModal}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-inner">
                <Lock className="h-7 w-7" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Requiere Clave de Supervisor</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[320px]">
                  Para anular y reversar la transacción <span className="font-mono font-bold text-slate-700">{txParaAnular.referencia}</span> por un monto de <span className="font-bold text-rose-600">${txParaAnular.monto.toFixed(2)}</span>, es obligatoria la autorización de un Oficial de Crédito o Gerente.
                </p>
              </div>
            </div>

            {anulacionError && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-semibold flex gap-2 items-start mt-4 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{anulacionError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmarAnulacion} className="mt-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500">Clave de Autorización</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input 
                    type="password"
                    placeholder="••••••••"
                    value={claveSupervisor}
                    onChange={(e) => setClaveSupervisor(e.target.value)}
                    disabled={anulandoTx}
                    className="pl-10 text-lg font-bold text-slate-800"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={anulandoTx || !claveSupervisor.trim()}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl h-11 flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md shadow-rose-500/10"
                >
                  {anulandoTx ? 'Procesando reverso...' : 'Autorizar Reverso'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCloseSupervisorModal}
                  variant="outline"
                  className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-2xl h-11 text-xs cursor-pointer"
                  disabled={anulandoTx}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Alerta flotante tipo Toast */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-white rounded-2xl border border-slate-100 shadow-2xl flex items-center gap-3 animate-slide-up max-w-sm">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800">
              {toast.type === 'success' ? 'Operación Exitosa' : 'Ocurrió un Error'}
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, show: false }))}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Modal Cédula */}
      {cedulaModalView && socioInfo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setCedulaModalView(null)}
        >
          <div 
            className="bg-white p-6 rounded-[2rem] shadow-2xl relative max-w-3xl w-full flex flex-col items-center border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setCedulaModalView(null)}
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-6">
              {cedulaModalView === 'FRONTAL' ? 'Cédula Frontal' : 'Cédula Posterior'}
            </h3>
            
            <div className="w-full max-w-2xl scale-110 md:scale-125 origin-top mb-12 flex justify-center">
              {cedulaModalView === 'FRONTAL' ? (
                (!useMockups && socioInfo.socio.fotoCedulaFrontalUrl) ? (
                  <img 
                    src={`http://localhost:8080/api/v1${socioInfo.socio.fotoCedulaFrontalUrl}`} 
                    alt="Cédula Frontal Ampliada" 
                    className="w-full max-w-sm rounded-2xl shadow-xl object-contain"
                  />
                ) : (
                  <CedulaFrontalMockup 
                    nombres={socioInfo.socio.nombresCompletos} 
                    cedula={socioInfo.socio.identificacion}
                    avatarUrl={socioInfo.socio.fotoPerfilUrl || null}
                  />
                )
              ) : (
                (!useMockups && socioInfo.socio.fotoCedulaPosteriorUrl) ? (
                  <img 
                    src={`http://localhost:8080/api/v1${socioInfo.socio.fotoCedulaPosteriorUrl}`} 
                    alt="Cédula Posterior Ampliada" 
                    className="w-full max-w-sm rounded-2xl shadow-xl object-contain"
                  />
                ) : (
                  <CedulaPosteriorMockup 
                    cedula={socioInfo.socio.identificacion}
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CajaVentanilla;
