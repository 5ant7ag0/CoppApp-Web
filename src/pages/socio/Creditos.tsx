import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Calculator, 
  FileSpreadsheet, 
  Calendar, 
  DollarSign, 
  Percent, 
  Loader2, 
  AlertCircle,
  PiggyBank,
  CheckCircle2,
  X,
  Info
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Credit {
  id: number;
  numeroCredito: string;
  montoSolicitado: number;
  montoDesembolsado: number;
  plazoMeses: number;
  tasaInteresAnual: number;
  estado: string;
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
  estado: string; // 'PENDIENTE', 'PAGADA', 'EN_MORA'
}

interface CuotaSimulada {
  numeroCuota: number;
  fechaVencimiento: string;
  capital: number;
  interes: number;
  cuotaTotal: number;
  saldoRemanente: number;
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

  // Estados del Simulador
  const [simMonto, setSimMonto] = useState<string>('5000');
  const [simPlazo, setSimPlazo] = useState<string>('12');
  const [simTipo, setSimTipo] = useState<'CONSUMO' | 'VIVIENDA' | 'MICROCREDITO'>('CONSUMO');
  const [simSistema, setSimSistema] = useState<'FRANCES' | 'ALEMAN' | 'AMERICANO'>('FRANCES');
  const [simulatedCuotas, setSimulatedCuotas] = useState<CuotaSimulada[] | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Estados de la Solicitud de Crédito Post-Simulación
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [destinoFondo, setDestinoFondo] = useState<string>('');
  const [applyLoading, setApplyLoading] = useState<boolean>(false);
  const [applySuccessData, setApplySuccessData] = useState<any | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Tasas de interés estáticas según tipo
  const INTERES_RATES = {
    CONSUMO: 12.5,
    VIVIENDA: 9.5,
    MICROCREDITO: 15.0
  };

  // Carga de Créditos desde API
  const fetchActiveCredit = async () => {
    setLoadingCredit(true);
    setCreditError(null);
    try {
      const creditsRes = await api.get('/creditos/mis-creditos');
      const creditsList = creditsRes.data as Credit[];
      
      // Buscar crédito activo (Desembolsado o Vigente)
      const active = creditsList.find(c => c.estado === 'DESEMBOLSADO' || c.estado === 'VIGENTE') || null;
      
      if (active) {
        setCredit(active);
        const amortRes = await api.get(`/creditos/${active.id}/amortizacion`);
        setAmortization(amortRes.data as AmortizationCuota[]);
        setActiveTab('activo');
      } else {
        setCredit(null);
        setAmortization([]);
        // Si no hay deudas activas, redirigir por defecto al simulador
        setActiveTab('simulador');
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
  }, []);

  // Simulación de Crédito
  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    setSimError(null);
    setSimulatedCuotas(null);

    const montoVal = parseFloat(simMonto);
    const plazoVal = parseInt(simPlazo);
    const tasaVal = INTERES_RATES[simTipo];

    if (isNaN(montoVal) || montoVal <= 0) {
      setSimError('El monto solicitado debe ser un valor positivo mayor a cero.');
      setSimLoading(false);
      return;
    }
    if (isNaN(plazoVal) || plazoVal <= 0) {
      setSimError('El plazo en meses debe ser mayor a cero.');
      setSimLoading(false);
      return;
    }

    try {
      const simRes = await api.get('/creditos/simular', {
        params: {
          monto: montoVal,
          plazoMeses: plazoVal,
          tasaAnual: tasaVal,
          sistema: simSistema
        }
      });
      setSimulatedCuotas(simRes.data as CuotaSimulada[]);
    } catch (err: any) {
      console.error('Error simulando crédito:', err);
      setSimError(err.response?.data || 'No se pudo realizar la simulación en este momento.');
    } finally {
      setSimLoading(false);
    }
  };

  // Limpiar Simulación
  const handleClearSimulation = () => {
    setSimMonto('');
    setSimPlazo('');
    setSimTipo('CONSUMO');
    setSimSistema('FRANCES');
    setSimulatedCuotas(null);
    setSimError(null);
  };

  // Enviar Solicitud de Crédito
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.detalles?.id) {
      setApplyError('Error: No se encontró la sesión del socio.');
      return;
    }
    if (!destinoFondo) {
      setApplyError('Error: El destino del fondo es obligatorio.');
      return;
    }

    setApplyLoading(true);
    setApplyError(null);

    const montoVal = parseFloat(simMonto);
    const plazoVal = parseInt(simPlazo);
    const tasaVal = INTERES_RATES[simTipo];

    try {
      const applyRes = await api.post('/creditos/solicitar', {
        socio: { id: user.detalles.id },
        montoSolicitado: montoVal,
        plazoMeses: plazoVal,
        tasaInteresAnual: tasaVal,
        tasaMoraAnual: 5.00,
        tipoAmortizacion: simSistema,
        garantiaDescripcion: `Garantía Quirografaria (Firma Personal). Destino: ${destinoFondo}`
      });

      setApplySuccessData(applyRes.data);
      setIsApplyModalOpen(false);
    } catch (err: any) {
      console.error('Error solicitando crédito:', err);
      setApplyError(err.response?.data || 'Ocurrió un error al procesar tu solicitud de crédito.');
    } finally {
      setApplyLoading(false);
    }
  };

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

  // Métricas del Simulador
  const getSimulationMetrics = () => {
    if (!simulatedCuotas) return { totalInterest: 0, totalCost: 0, avgCuota: 0 };
    const totalInterest = simulatedCuotas.reduce((sum, q) => sum + q.interes, 0);
    const totalCost = simulatedCuotas.reduce((sum, q) => sum + q.cuotaTotal, 0);
    const avgCuota = simulatedCuotas.length > 0 ? totalCost / simulatedCuotas.length : 0;
    return { totalInterest, totalCost, avgCuota };
  };

  const simMetrics = getSimulationMetrics();

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Pestañas Superiores */}
          <TabsList className="bg-slate-100 max-w-md mb-6 rounded-2xl p-1.5 h-12">
            <TabsTrigger value="activo" className="rounded-xl py-2 font-bold text-xs h-9">
              Crédito Activo
            </TabsTrigger>
            <TabsTrigger value="simulador" className="rounded-xl py-2 font-bold text-xs h-9">
              Simulador Financiero
            </TabsTrigger>
          </TabsList>

          {/* CONTENIDO TABA 1: CRÉDITO ACTIVO */}
          <TabsContent value="activo">
            {credit ? (
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
                  <Card className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(0,84,166,0.015)] flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Próxima Cuota {metrics.nextCuota ? `(N° ${metrics.nextCuota.numeroCuota})` : ''}
                      </span>
                      <span className="text-2xl font-black text-slate-800 tracking-tight">
                        {metrics.nextCuota ? formatCurrency(metrics.nextCuota.cuotaTotalProyectada) : formatCurrency(0)}
                      </span>
                    </div>
                    <DollarSign className="h-6 w-6 text-slate-400 shrink-0" />
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
            ) : (
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
            )}
          </TabsContent>

          {/* CONTENIDO TABA 2: SIMULADOR FINANCIERO */}
          <TabsContent value="simulador">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 items-start">
              
              {/* Formulario (Col-span 2) */}
              <div className="lg:col-span-2">
                <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.03)]">
                  <form onSubmit={handleSimulate} className="space-y-6">
                    <div className="pb-3 border-b border-slate-50 flex items-center gap-2.5">
                      <Calculator className="h-5 w-5 text-[#0054A6]" />
                      <h3 className="text-sm font-bold text-slate-800">Simular Préstamo</h3>
                    </div>

                    {simError && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2 animate-fade-in font-medium">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{simError}</span>
                      </div>
                    )}

                    {/* Tipo de Crédito */}
                    <div className="space-y-1.5">
                      <Select 
                        label="Línea de Crédito"
                        value={simTipo} 
                        onChange={(e) => setSimTipo(e.target.value as any)}
                      >
                        <option value="CONSUMO">Crédito de Consumo (12.5%)</option>
                        <option value="VIVIENDA">Crédito Hipotecario / Vivienda (9.5%)</option>
                        <option value="MICROCREDITO">Microcrédito Productivo (15.0%)</option>
                      </Select>
                    </div>

                    {/* Monto */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500">Monto Solicitado ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          type="number" 
                          value={simMonto}
                          onChange={(e) => setSimMonto(e.target.value)}
                          placeholder="Monto"
                          min="100"
                          max="100000"
                          className="pl-10 pr-4 bg-white/50 border-slate-200/60 focus-visible:ring-4 focus-visible:ring-[#0054A6]/10 focus-visible:border-[#0054A6] h-[42px]"
                        />
                      </div>
                    </div>

                    {/* Plazo */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500">Plazo de Financiamiento (Meses)</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          type="number" 
                          value={simPlazo}
                          onChange={(e) => setSimPlazo(e.target.value)}
                          placeholder="Plazo"
                          min="3"
                          max="120"
                          className="pl-10 pr-4 bg-white/50 border-slate-200/60 focus-visible:ring-4 focus-visible:ring-[#0054A6]/10 focus-visible:border-[#0054A6] h-[42px]"
                        />
                      </div>
                    </div>

                    {/* Sistema de Amortización */}
                    <div className="space-y-1.5">
                      <Select 
                        label="Metodología Contable"
                        value={simSistema} 
                        onChange={(e) => setSimSistema(e.target.value as any)}
                      >
                        <option value="FRANCES">Sistema Francés (Cuota Fija)</option>
                        <option value="ALEMAN">Sistema Alemán (Amortización Constante)</option>
                        <option value="AMERICANO">Sistema Americano (Interés Mensual / Capital Final)</option>
                      </Select>
                    </div>

                    {/* Tasa fija leída de solo lectura */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500">Tasa de Interés Nominal Anual</label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          type="text" 
                          value={`${INTERES_RATES[simTipo].toFixed(2)} %`}
                          readOnly 
                          className="pl-10 pr-4 border border-slate-200 rounded-xl py-2.5 h-[42px] bg-slate-50 text-slate-500 cursor-not-allowed border-none focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    {/* Botón Simular */}
                    {simulatedCuotas ? (
                      <div className="flex gap-3">
                        <Button 
                          type="submit" 
                          disabled={simLoading}
                          className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-semibold rounded-2xl h-12 transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
                        >
                          {simLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                              Simulando...
                            </>
                          ) : (
                            <>
                              <Calculator className="h-4 w-4 text-white" />
                              Recalcular
                            </>
                          )}
                        </Button>
                        <Button 
                          type="button"
                          onClick={handleClearSimulation}
                          className="border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-semibold rounded-2xl h-12 px-4 transition-all cursor-pointer text-xs bg-white"
                        >
                          Limpiar
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        type="submit" 
                        disabled={simLoading}
                        className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-semibold rounded-2xl h-12 transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
                      >
                        {simLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            Proyectando amortización...
                          </>
                        ) : (
                          <>
                            <Calculator className="h-4 w-4 text-white" />
                            Simular Tabla de Pagos
                          </>
                        )}
                      </Button>
                    )}
                  </form>
                </Card>
              </div>

              {/* Visualizador de Proyección (Col-span 3) */}
              <div className="lg:col-span-3">
                {simulatedCuotas ? (
                  <div className="space-y-6 md:space-y-8 animate-fade-in">
                    
                    {/* Resumen de Simulación */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Interés Total */}
                      <Card className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Interés Total</span>
                        <span className="text-base font-extrabold text-slate-800 tracking-tight block mt-1">
                          {formatCurrency(simMetrics.totalInterest)}
                        </span>
                      </Card>

                      {/* Costo Total */}
                      <Card className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-bold text-[#0054A6] uppercase tracking-wider block">Costo Total Crédito</span>
                        <span className="text-base font-extrabold text-[#0054A6] tracking-tight block mt-1">
                          {formatCurrency(simMetrics.totalCost)}
                        </span>
                      </Card>

                      {/* Cuota Fija/Promedio */}
                      <Card className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          {simSistema === 'FRANCES' ? 'Cuota Fija Mensual' : 'Cuota Promedio'}
                        </span>
                        <span className="text-base font-extrabold text-slate-800 tracking-tight block mt-1">
                          {formatCurrency(simMetrics.avgCuota)}
                        </span>
                      </Card>
                    </div>

                    {/* Tabla Proyectada */}
                    <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)]">
                      <div className="flex items-center gap-2 mb-4">
                        <FileSpreadsheet className="h-5 w-5 text-[#0054A6]" />
                        <h3 className="text-sm font-bold text-slate-800">Proyección de Calendario de Amortización</h3>
                      </div>
                      
                      <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1 border border-slate-50 rounded-2xl">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs bg-slate-50/50">
                              <th className="py-3 px-4 text-center rounded-l-2xl">Cuota</th>
                              <th className="py-3 px-4">Fecha Pago</th>
                              <th className="py-3 px-4 text-right">Capital</th>
                              <th className="py-3 px-4 text-right">Interés</th>
                              <th className="py-3 px-4 text-right">Monto Cuota</th>
                              <th className="py-3 px-4 text-right rounded-r-2xl">Saldo Remanente</th>
                            </tr>
                          </thead>
                          <tbody>
                            {simulatedCuotas.map((cuota) => (
                              <tr key={cuota.numeroCuota} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all duration-150">
                                <td className="py-3 px-4 text-xs font-bold text-slate-500 text-center">
                                  {cuota.numeroCuota}
                                </td>
                                <td className="py-3 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                  {formatTxDate(cuota.fechaVencimiento)}
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-semibold text-slate-700">
                                  {formatCurrency(cuota.capital)}
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-semibold text-slate-600">
                                  {formatCurrency(cuota.interes)}
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-extrabold text-[#0054A6]">
                                  {formatCurrency(cuota.cuotaTotal)}
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-semibold text-slate-500">
                                  {formatCurrency(cuota.saldoRemanente)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>

                    {/* Botón Solicitar Crédito */}
                    <Button 
                      onClick={() => {
                        setDestinoFondo('');
                        setApplyError(null);
                        setIsApplyModalOpen(true);
                      }}
                      className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-12 transition-all shadow-md mt-4 cursor-pointer flex items-center justify-center gap-2 text-xs"
                    >
                      <PiggyBank className="h-4 w-4 text-white" />
                      Solicitar Crédito
                    </Button>
                  </div>
                ) : (
                  // Estado Inicial del Simulador (Sin Simular)
                  <Card className="rounded-[2rem] border border-slate-100 bg-white p-8 md:p-12 text-center shadow-[0_15px_40px_-10px_rgba(0,84,166,0.03)] flex flex-col items-center justify-center min-h-[460px] space-y-5">
                    <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-[#0054A6] shadow-sm animate-pulse">
                      <Calculator className="h-8 w-8 animate-none" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-slate-700">Simulador Financiero Listo</h3>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Modifica los parámetros en el panel izquierdo (monto, plazo y sistema) y haz clic en "Simular Tabla de Pagos" para proyectar la tabla contable.
                      </p>
                    </div>
                  </Card>
                )}
              </div>

            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Modal de Confirmación de Solicitud */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 backdrop-blur-2xl border border-slate-200/50 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 md:p-8 animate-scale-up select-none relative"
          >
            {/* Cerrar */}
            <button
              onClick={() => setIsApplyModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Titulo */}
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#0054A6]" />
                Confirmar Solicitud
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Revisa las condiciones financieras de tu préstamo antes de continuar.
              </p>
            </div>

            {applyError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2 mb-4 animate-fade-in font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{applyError}</span>
              </div>
            )}

            {/* Resumen */}
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Línea de Crédito</span>
                <span className="font-bold text-slate-700 capitalize">{simTipo.toLowerCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monto Solicitado</span>
                <span className="font-bold text-slate-800">{formatCurrency(parseFloat(simMonto))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plazo</span>
                <span className="font-bold text-slate-700">{simPlazo} meses</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tasa de Interés</span>
                <span className="font-bold text-slate-700">{INTERES_RATES[simTipo]}% anual</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amortización</span>
                <span className="font-bold text-slate-700 capitalize">
                  {simSistema === 'FRANCES' ? 'Francés (Fija)' : simSistema === 'ALEMAN' ? 'Alemán (Variable)' : 'Americano'}
                </span>
              </div>
            </div>

            {/* Selector Obligatorio */}
            <form onSubmit={handleApplySubmit} className="space-y-6">
              <div className="space-y-1.5">
                <Select 
                  label="Destino del Fondo (Obligatorio)"
                  value={destinoFondo} 
                  onChange={(e) => setDestinoFondo(e.target.value)}
                  required
                >
                  <option value="">-- Selecciona el destino --</option>
                  <option value="CONSUMO">Consumo Personal / Gastos Varios</option>
                  <option value="EDUCACION">Educación / Matrículas y Estudios</option>
                  <option value="SALUD">Salud / Gastos Médicos y Emergencias</option>
                </Select>
              </div>

              {/* Botón de Enviar */}
              <Button
                type="submit"
                disabled={applyLoading || !destinoFondo}
                className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-12 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                {applyLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Enviando solicitud...
                  </>
                ) : (
                  <>
                    <PiggyBank className="h-4 w-4 text-white" />
                    Confirmar y Enviar Solicitud
                  </>
                )}
              </Button>
            </form>

          </div>
        </div>
      )}

      {/* Modal de Éxito - Recibo de Solicitud en Proceso */}
      {applySuccessData !== null && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 backdrop-blur-2xl border border-slate-200/50 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 md:p-8 animate-scale-up select-none relative"
          >
            {/* Accent decoration */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-[2.5rem]" />

            <div className="flex flex-col items-center text-center space-y-4 pt-4">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-[#0054A6] shadow-sm animate-scale-up">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Solicitud en Proceso</h2>
                <p className="text-slate-400 text-xs mt-1">Comprobante de registro de solicitud</p>
              </div>
            </div>

            <div className="mt-8 space-y-5 border-t border-b border-dashed border-slate-100 py-6">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Monto Solicitado</span>
                <span className="text-2xl font-black text-[#0054A6]">
                  {formatCurrency(applySuccessData.montoSolicitado)}
                </span>
              </div>
              
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Número de Trámite</span>
                  <span className="font-mono font-bold text-slate-600">{applySuccessData.numeroCredito}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Línea de Crédito</span>
                  <span className="font-semibold text-slate-700 capitalize">{simTipo.toLowerCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plazo Solicitado</span>
                  <span className="font-semibold text-slate-700">{applySuccessData.plazoMeses} meses</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tasa de Interés</span>
                  <span className="font-semibold text-slate-700">{applySuccessData.tasaInteresAnual}% anual</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amortización</span>
                  <span className="font-semibold text-slate-700 capitalize">{applySuccessData.tipoAmortizacion.toLowerCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estado del Trámite</span>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                    {applySuccessData.estado}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fecha y Hora</span>
                  <span className="font-semibold text-slate-700">{formatTxDate(applySuccessData.fechaSolicitud)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Button
                onClick={() => {
                  setApplySuccessData(null);
                  handleClearSimulation();
                  fetchActiveCredit(); // recargar créditos
                }}
                className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-semibold rounded-2xl h-12 transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                Entendido
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-2">
                <Info className="h-3.5 w-3.5" />
                <span>Esta solicitud será revisada por un oficial de crédito asignado.</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default Creditos;
