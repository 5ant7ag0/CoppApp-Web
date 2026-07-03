import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Loader2, 
  AlertCircle,
  PiggyBank,
  X,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { SimuladorCredito } from '../../components/SimuladorCredito';

interface Credit {
  id: number;
  numeroCredito: string;
  montoSolicitado: number;
  montoDesembolsado: number;
  plazoMeses: number;
  tasaInteresAnual: number;
  estado: string;
  productoCredito?: {
    id: number;
    nombre: string;
  };
}

interface AmortizationCuota {
  id: number;
  numeroCuota: number;
  fechaVencimiento: string;
  capitalProyectado: number;
  interesProyectado: number;
  cuotaTotalProyectada: number;
  capitalPagado: number;
  interesPagado: number;
  montoMoraAcumulado?: number;
  montoMoraPagado?: number;
  estado: string; // 'PENDIENTE', 'PAGADA', 'EN_MORA'
}

export const Creditos: React.FC = () => {
  const { user } = useAuth();

  // Pestañas: 'activo' o 'simulador'
  const [activeTab, setActiveTab] = useState<string>('activo');

  // Estados de Crédito Activo
  const [credit, setCredit] = useState<Credit | null>(null);
  const [amortization, setAmortization] = useState<AmortizationCuota[]>([]);
  const [loadingCredit, setLoadingCredit] = useState<boolean>(true);
  const [creditError, setCreditError] = useState<string | null>(null);

  // Nuevos estados para solicitudes
  const [creditsList, setCreditsList] = useState<Credit[]>([]);
  const [dismissedSolicitudes, setDismissedSolicitudes] = useState<number[]>([]);

  // Estados para el motor de cobro manual/autoservicio
  const [savingsAccount, setSavingsAccount] = useState<any | null>(null);
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [paying, setPaying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSavingsAccount = async () => {
    try {
      const res = await api.get('/cuentas/mis-cuentas');
      const accounts = res.data as any[];
      const savings = accounts.find((acc: any) => acc.tipo === 'AHORRO_VISTA' && acc.estado === 'ACTIVA');
      if (savings) {
        setSavingsAccount(savings);
      } else {
        setSavingsAccount(null);
      }
    } catch (err) {
      console.error('Error fetching savings account:', err);
    }
  };

  const getCuotaPendingAmount = (cuota: AmortizationCuota | null) => {
    if (!cuota) return 0;
    const cap = cuota.capitalProyectado - cuota.capitalPagado;
    const int = cuota.interesProyectado - cuota.interesPagado;
    const mor = (cuota.montoMoraAcumulado || 0) - (cuota.montoMoraPagado || 0);
    return Math.max(0, cap + int + mor);
  };

  const handlePayCuota = async () => {
    if (!credit || !metrics.nextCuota || !savingsAccount) return;
    
    const amountToPay = Number(getCuotaPendingAmount(metrics.nextCuota).toFixed(2));
    setPaying(true);
    setErrorMsg(null);
    try {
      await api.post('/creditos/pagar', {
        creditoId: credit.id,
        origenFondos: 'CUENTA',
        cuentaAhorrosId: savingsAccount.id,
        monto: amountToPay
      });
      
      setSuccessMsg(`La cuota N° ${metrics.nextCuota.numeroCuota} por un valor de ${formatCurrency(amountToPay)} ha sido cancelada correctamente desde tu cuenta de ahorros.`);
      setShowPayModal(false);
      
      // Actualización reactiva sin recargar
      await Promise.all([
        fetchActiveCredit(),
        fetchSavingsAccount()
      ]);
    } catch (err: any) {
      console.error('Error al pagar cuota:', err);
      const backendErr = typeof err.response?.data === 'string' 
        ? err.response.data 
        : err.response?.data?.message || 'Error al procesar el pago. Por favor intente de nuevo.';
      setErrorMsg(backendErr);
    } finally {
      setPaying(false);
    }
  };

  // Carga de Créditos desde API
  const fetchActiveCredit = async () => {
    setLoadingCredit(true);
    setCreditError(null);
    try {
      const creditsRes = await api.get('/creditos/mis-creditos');
      const list = creditsRes.data as Credit[];
      setCreditsList(list);
      
      // Buscar crédito activo (Desembolsado o Vigente)
      const active = list.find(c => c.estado === 'DESEMBOLSADO' || c.estado === 'VIGENTE') || null;
      
      // Buscar si hay solicitudes pendientes/rechazadas
      const hasSolicitudes = list.some(c => 
        ['SOLICITADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO'].includes(c.estado)
      );

      if (active) {
        setCredit(active);
        const amortRes = await api.get(`/creditos/${active.id}/amortizacion`);
        setAmortization(amortRes.data as AmortizationCuota[]);
        setActiveTab('activo');
      } else {
        setCredit(null);
        setAmortization([]);
        if (hasSolicitudes) {
          setActiveTab('activo');
        } else {
          setActiveTab('simulador');
        }
      }
    } catch (err: any) {
      console.error('Error cargando créditos:', err);
      setCreditError('Ocurrió un error al cargar tu historial de créditos contables.');
      setActiveTab('simulador');
    } finally {
      setLoadingCredit(false);
    }
  };

  useEffect(() => {
    fetchActiveCredit();
    fetchSavingsAccount();
  }, []);



  // Formateadores
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatTxDate = (dateStr: string) => {
    try {
      // Evitar desfase de zona horaria concatenando T00:00:00 si es necesario
      const cleanDateStr = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
      const date = new Date(cleanDateStr);
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Métricas de Crédito Activo
  const getCreditMetrics = () => {
    if (amortization.length === 0) return { pendingBalance: 0, nextCuota: null, progressPercent: 0, paidCount: 0, totalCount: 0 };
    
    const pendingBalance = amortization
      .filter(q => q.estado !== 'PAGADA')
      .reduce((sum, q) => sum + (q.capitalProyectado - q.capitalPagado), 0);

    const nextCuota = amortization.find(q => q.estado === 'PENDIENTE' || q.estado === 'EN_MORA') || null;
    
    const paidCount = amortization.filter(q => q.estado === 'PAGADA').length;
    const totalCount = amortization.length;
    const progressPercent = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

    return { pendingBalance, nextCuota, progressPercent, paidCount, totalCount };
  };

  const metrics = getCreditMetrics();



  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-0 select-none">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Créditos Financieros</h1>
          <p className="text-slate-500 text-sm mt-1">Administra tus préstamos activos y proyecta nuevas simulaciones de amortización.</p>
        </div>
      </div>

      {creditError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-medium animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{creditError}</span>
        </div>
      )}

      {loadingCredit ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0054A6]" />
          <p className="text-xs text-slate-400 font-medium">Cargando información crediticia...</p>
        </div>
      ) : (
        <div className="w-full">
          {/* Pestañas Superiores */}
          <div className="flex bg-[#F1F3F6] p-1 border border-slate-100/50 rounded-full w-fit gap-1 mb-6">
            <button
              onClick={() => setActiveTab('activo')}
              className="relative px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-slate-500 hover:text-slate-805"
            >
              {activeTab === 'activo' && (
                <motion.div
                  layoutId="activeTabCreditosSocio"
                  className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 transition-colors duration-300 ${
                activeTab === 'activo' ? 'text-white' : 'text-slate-500'
              }`}>
                Crédito Activo
              </span>
            </button>
            <button
              onClick={() => setActiveTab('simulador')}
              className="relative px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-slate-500 hover:text-slate-805"
            >
              {activeTab === 'simulador' && (
                <motion.div
                  layoutId="activeTabCreditosSocio"
                  className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 transition-colors duration-300 ${
                activeTab === 'simulador' ? 'text-white' : 'text-slate-500'
              }`}>
                Simulador Financiero
              </span>
            </button>
          </div>

          {/* CONTENIDO TABA 1: CRÉDITO ACTIVO */}
          {activeTab === 'activo' && (() => {
              const solicitudes = creditsList.filter(c => 
                ['SOLICITADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO'].includes(c.estado) && 
                !dismissedSolicitudes.includes(c.id)
              );

              const handleDismissSolicitud = (id: number) => {
                setDismissedSolicitudes(prev => [...prev, id]);
              };

              if (credit || solicitudes.length > 0) {
                return (
                  <div className="space-y-6 md:space-y-8 animate-fade-in">
                    {/* Crédito Activo */}
                    {credit && (
                      <div className="space-y-6 md:space-y-8">
                        {/* Indicadores en Fila */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Tarjeta: Saldo Pendiente */}
                          <Card className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(0,84,166,0.015)] flex items-center justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-[#0054A6] uppercase tracking-wider block">Saldo Pendiente (Capital)</span>
                              <span className="text-2xl font-black text-[#0054A6] tracking-tight">
                                {formatCurrency(metrics.pendingBalance)}
                              </span>
                            </div>
                            <CreditCard className="h-6 w-6 text-[#0054A6] shrink-0" />
                          </Card>

                          {/* Tarjeta: Próxima Cuota */}
                          <Card className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(0,84,166,0.015)] flex flex-col justify-between">
                            <div className="flex items-center justify-between w-full">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                  Próxima Cuota {metrics.nextCuota ? `(N° ${metrics.nextCuota.numeroCuota})` : ''}
                                </span>
                                <span className="text-2xl font-black text-slate-800 tracking-tight">
                                  {metrics.nextCuota ? formatCurrency(getCuotaPendingAmount(metrics.nextCuota)) : formatCurrency(0)}
                                </span>
                              </div>
                              <DollarSign className="h-6 w-6 text-slate-400 shrink-0" />
                            </div>
                            {metrics.nextCuota && (
                              <div className="mt-3 pt-3 border-t border-slate-100/50 w-full text-center">
                                <Button 
                                  onClick={() => {
                                    setErrorMsg(null);
                                    setSuccessMsg(null);
                                    setShowPayModal(true);
                                  }}
                                  className="w-full bg-[#0054A6]/10 hover:bg-[#0054A6]/20 text-[#0054A6] hover:text-[#004080] font-bold rounded-xl h-9 transition-all duration-300 cursor-pointer text-xs border-0"
                                >
                                  Pagar Próxima Cuota
                                </Button>
                              </div>
                            )}
                          </Card>

                          {/* Tarjeta: Fecha de Vencimiento */}
                          <Card className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(0,84,166,0.015)] flex items-center justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fecha de Vencimiento</span>
                              <span className="text-2xl font-black text-slate-800 tracking-tight">
                                {metrics.nextCuota ? formatTxDate(metrics.nextCuota.fechaVencimiento) : '-'}
                              </span>
                            </div>
                            <Calendar className="h-6 w-6 text-slate-400 shrink-0" />
                          </Card>
                        </div>

                        {/* Desglose de Liquidación de Desembolso */}
                        <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)] animate-fade-in">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Liquidación de Desembolso (Seguro de Desgravamen)</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monto Aprobado</span>
                              <span className="text-lg font-black text-slate-800 tracking-tight block mt-1">
                                {formatCurrency(credit.montoSolicitado)}
                              </span>
                            </div>
                            <div className="p-4 bg-rose-50/50 border border-rose-100/50 rounded-2xl">
                              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">(-) Seguro Desgravamen (1%)</span>
                              <span className="text-lg font-black text-rose-700 tracking-tight block mt-1">
                                {formatCurrency(credit.montoSolicitado * 0.01)}
                              </span>
                            </div>
                            <div className="p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Monto Líquido Acreditado</span>
                              <span className="text-lg font-black text-emerald-800 tracking-tight block mt-1">
                                {formatCurrency(credit.montoSolicitado * 0.99)}
                              </span>
                            </div>
                          </div>
                        </Card>

                        {/* Barra de Progreso Visual */}
                        <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)]">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                              <span>Progreso de Pago</span>
                              <span className="text-[#0054A6] font-bold">
                                {metrics.paidCount} de {metrics.totalCount} cuotas canceladas ({metrics.progressPercent.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-[#0054A6] to-blue-400 h-full rounded-full transition-all duration-700" 
                                style={{ width: `${metrics.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </Card>

                        {/* Tabla de Amortización */}
                        <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)]">
                          <h3 className="text-sm font-bold text-slate-700 mb-4">Tabla de Amortización Oficial (Contrato {credit.numeroCredito})</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs bg-slate-50/10">
                                  <th className="py-3 px-4 rounded-l-2xl text-center">N° Cuota</th>
                                  <th className="py-3 px-4">Fecha Vencimiento</th>
                                  <th className="py-3 px-4 text-right">Capital</th>
                                  <th className="py-3 px-4 text-right">Interés</th>
                                  <th className="py-3 px-4 text-right">Cuota Total</th>
                                  <th className="py-3 px-4 text-center rounded-r-2xl">Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {amortization.map((cuota) => {
                                  let badgeClass = '';
                                  let estadoStr = '';
                                  
                                  if (cuota.estado === 'PAGADA') {
                                    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                    estadoStr = 'Pagada';
                                  } else if (cuota.estado === 'EN_MORA') {
                                    badgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
                                    estadoStr = 'En Mora';
                                  } else {
                                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                                    estadoStr = 'Pendiente';
                                  }

                                  return (
                                    <tr key={cuota.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all duration-150">
                                      <td className="py-3.5 px-4 text-xs font-bold text-slate-500 text-center">
                                        {cuota.numeroCuota}
                                      </td>
                                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                        {formatTxDate(cuota.fechaVencimiento)}
                                      </td>
                                      <td className="py-3.5 px-4 text-sm text-right font-semibold text-slate-700">
                                        {formatCurrency(cuota.capitalProyectado)}
                                      </td>
                                      <td className="py-3.5 px-4 text-sm text-right font-semibold text-slate-600">
                                        {formatCurrency(cuota.interesProyectado)}
                                      </td>
                                      <td className="py-3.5 px-4 text-sm text-right font-extrabold text-[#0054A6]">
                                        {formatCurrency(cuota.cuotaTotalProyectada)}
                                      </td>
                                      <td className="py-3.5 px-4 text-center">
                                        <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${badgeClass} uppercase tracking-wider`}>
                                          {estadoStr}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Solicitudes de crédito en trámite (Apple Light UI Cards) */}
                    {solicitudes.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-slate-100/85">
                        <h3 className="text-sm font-bold text-slate-700">Solicitudes en Trámite</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {solicitudes.map((sol) => {
                            let cardBg = 'bg-white';
                            let borderClass = 'border-slate-100';
                            let badgeClass = '';
                            let statusText = '';
                            let messageText = '';
                            let isRejected = sol.estado === 'RECHAZADO';

                            switch (sol.estado) {
                              case 'SOLICITADO':
                                cardBg = 'bg-gradient-to-br from-white to-blue-50/10';
                                borderClass = 'border-blue-100/50';
                                badgeClass = 'bg-blue-50/80 text-blue-700 border-blue-100/50';
                                statusText = 'Solicitado';
                                messageText = 'Su solicitud fue recibida y está en cola de espera.';
                                break;
                              case 'EN_REVISION':
                                cardBg = 'bg-gradient-to-br from-white to-amber-50/10';
                                borderClass = 'border-amber-100/50';
                                badgeClass = 'bg-amber-50/80 text-amber-700 border-amber-100/50';
                                statusText = 'En Revisión';
                                messageText = 'Su trámite está siendo analizado por un Oficial de Crédito.';
                                break;
                              case 'APROBADO':
                                cardBg = 'bg-gradient-to-br from-white to-emerald-50/10';
                                borderClass = 'border-emerald-200/60';
                                badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                                statusText = 'Aprobado';
                                messageText = '¡Crédito Aprobado! Por favor, acérquese a la cooperativa para firmar la documentación.';
                                break;
                              case 'RECHAZADO':
                                cardBg = 'bg-gradient-to-br from-white to-rose-50/10';
                                borderClass = 'border-rose-100/50';
                                badgeClass = 'bg-rose-50/80 text-rose-700 border-rose-100/50';
                                statusText = 'Rechazado';
                                messageText = 'Lo sentimos, su solicitud no pudo ser procesada en este momento. Por favor, contacte a un asesor.';
                                break;
                              default:
                                badgeClass = 'bg-slate-50 text-slate-700 border-slate-100';
                                statusText = sol.estado;
                                messageText = 'Estado desconocido.';
                            }

                            // Estimación de la cuota (en el cliente)
                            const tasaMensual = (sol.tasaInteresAnual / 100) / 12;
                            let cuotaEstimada = 0;
                            if (tasaMensual > 0) {
                              cuotaEstimada = (sol.montoSolicitado * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -sol.plazoMeses));
                            } else {
                              cuotaEstimada = sol.montoSolicitado / sol.plazoMeses;
                            }

                            return (
                              <Card 
                                key={sol.id} 
                                className={`rounded-[1.5rem] border ${borderClass} ${cardBg} p-6 shadow-[0_10px_35px_rgba(0,0,0,0.01)] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.02)]`}
                              >
                                {isRejected && (
                                  <button
                                    onClick={() => handleDismissSolicitud(sol.id)}
                                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100/80 text-slate-400 hover:text-slate-600 transition-all cursor-pointer z-10"
                                    title="Descartar aviso"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}

                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                                      N° Trámite: {sol.numeroCredito}
                                    </span>
                                    <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${badgeClass} uppercase tracking-wider`}>
                                      {statusText}
                                    </span>
                                  </div>

                                  {sol.productoCredito?.nombre && (
                                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 w-fit">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Línea de Crédito</span>
                                      <span className="text-xs font-black text-slate-800">{sol.productoCredito.nombre}</span>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-3 gap-2 border-b border-dashed border-slate-100/80 pb-4">
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monto</span>
                                      <span className="text-lg font-black text-slate-800">{formatCurrency(sol.montoSolicitado)}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Plazo</span>
                                      <span className="text-lg font-black text-slate-800">{sol.plazoMeses} Meses</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cuota Est.</span>
                                      <span className="text-lg font-black text-[#0054A6]">{formatCurrency(cuotaEstimada)}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2.5 pt-1">
                                    <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                      {messageText}
                                    </p>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  // No hay deudas activas -> Renderizar banner informativo
                  <Card className="rounded-[2.5rem] border border-slate-100 bg-white p-8 md:p-12 text-center shadow-[0_15px_40px_-10px_rgba(0,84,166,0.03)] flex flex-col items-center justify-center max-w-xl mx-auto space-y-6">
                    <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-[#0054A6] shadow-sm">
                      <PiggyBank className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-800">¡Libre de Deudas Activas!</h3>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                        Actualmente no posees deudas vigentes registradas a tu nombre en nuestra cooperativa.
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        ¿Deseas financiar un nuevo proyecto? Proyecta tus cuotas con nuestro simulador financiero interactivo.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setActiveTab('simulador')}
                      className="bg-[#0054A6] hover:bg-[#004080] text-white font-semibold rounded-2xl h-11 px-6 shadow-sm transition-all duration-300 cursor-pointer text-xs"
                    >
                      Ir al Simulador Financiero
                    </Button>
                  </Card>
                );
              }
            })()}

          {/* CONTENIDO TABA 2: SIMULADOR FINANCIERO */}
          {activeTab === 'simulador' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <SimuladorCredito
                onApply={async (params) => {
                  if (!user || !user.detalles?.id) {
                    throw new Error('Error: No se encontró la sesión del socio.');
                  }
                  const response = await api.post('/creditos/solicitar', {
                    socio: { id: user.detalles.id },
                    montoSolicitado: params.montoSolicitado,
                    plazoMeses: params.plazoMeses,
                    tasaInteresAnual: params.tasaInteresAnual,
                    productoCredito: { id: params.productoCreditoId },
                    tipoAmortizacion: params.tipoAmortizacion,
                    garantiaDescripcion: `Garantía Quirografaria (Firma Personal). Destino: ${params.destinoFondo}`
                  });
                  return response.data;
                }}
                onSuccessClose={() => {
                  fetchActiveCredit(); // recargar créditos
                }}
              />
            </motion.div>
          )}
        </div>
      )}

      {/* Modal de Confirmación de Pago */}
      {showPayModal && metrics.nextCuota && savingsAccount && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            <button 
              onClick={() => setShowPayModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              disabled={paying}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-blue-50 text-[#0054A6] flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Confirmar Pago de Cuota</h3>
                <p className="text-xs text-slate-500">Revisa los detalles del débito a realizarse.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3.5 border border-slate-100/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400">Préstamo N°</span>
                  <span className="font-bold text-slate-700">{credit?.numeroCredito}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400">Cuota a Cancelar</span>
                  <span className="font-bold text-slate-700"># {metrics.nextCuota.numeroCuota}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400">Cuenta de Ahorros</span>
                  <span className="font-bold text-slate-700">{savingsAccount.numeroCuenta}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400">Saldo Disponible</span>
                  <span className="font-bold text-slate-700">{formatCurrency(savingsAccount.saldo)}</span>
                </div>
                <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Monto a Debitar</span>
                  <span className="text-lg font-black text-[#0054A6]">
                    {formatCurrency(getCuotaPendingAmount(metrics.nextCuota))}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed text-center font-medium bg-blue-50/50 p-3 rounded-xl border border-blue-100/30">
                Se debitará el valor de <span className="font-bold text-[#0054A6]">{formatCurrency(getCuotaPendingAmount(metrics.nextCuota))}</span> de su cuenta de ahorros para cancelar la cuota <span className="font-bold text-slate-700">#{metrics.nextCuota.numeroCuota}</span>.
              </p>

              {savingsAccount && savingsAccount.saldo < getCuotaPendingAmount(metrics.nextCuota) && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>Fondos insuficientes en su cuenta de ahorros.</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold animate-fade-in">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl h-11 border-0 cursor-pointer text-xs"
                  disabled={paying}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handlePayCuota}
                  className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-11 border-0 cursor-pointer text-xs shadow-sm flex items-center justify-center gap-1.5"
                  disabled={paying || savingsAccount.saldo < getCuotaPendingAmount(metrics.nextCuota)}
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar Pago'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Éxito de Pago */}
      {successMsg && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 text-center space-y-5 animate-scale-up">
            <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">¡Transacción Exitosa!</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {successMsg}
              </p>
            </div>
            <Button 
              onClick={() => setSuccessMsg(null)}
              className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-11 border-0 cursor-pointer text-xs shadow-sm"
            >
              Entendido
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Creditos;
