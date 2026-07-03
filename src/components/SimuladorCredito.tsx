import React, { useState } from 'react';
import { 
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
  Info,
  CreditCard
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import api from '../services/api';
import { useEffect } from 'react';

interface CuotaSimulada {
  numeroCuota: number;
  fechaVencimiento: string;
  capital: number;
  interes: number;
  cuotaTotal: number;
  saldoRemanente: number;
}

interface SimuladorCreditoProps {
  onApply: (params: {
    montoSolicitado: number;
    plazoMeses: number;
    tasaInteresAnual: number;
    tipoAmortizacion: string;
    destinoFondo: string;
    productoCreditoId: number;
  }) => Promise<any>;
  buttonLabel?: string;
  successMessage?: string;
  onSuccessClose?: () => void;
}

interface ProductoCredito {
  id: number;
  nombre: string;
  tasaInteresAnual: number;
  montoMinimo: number;
  montoMaximo: number;
  plazoMinimoMeses: number;
  plazoMaximoMeses: number;
}

const formatCurrency = (val: number | undefined | null) => {
  const v = val ?? 0;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatTxDate = (dateStr: string) => {
  try {
    const cleanDateStr = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
    const date = new Date(cleanDateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const SimuladorCredito: React.FC<SimuladorCreditoProps> = ({ 
  onApply, 
  buttonLabel = "Solicitar Crédito",
  successMessage = "Esta solicitud será revisada por un oficial de crédito asignado.",
  onSuccessClose
}) => {
  // Estados del Simulador
  const [productos, setProductos] = useState<ProductoCredito[]>([]);
  const [simMonto, setSimMonto] = useState<string>('5000');
  const [simPlazo, setSimPlazo] = useState<string>('12');
  const [simProductoId, setSimProductoId] = useState<number | ''>('');
  const [simSistema, setSimSistema] = useState<'FRANCES' | 'ALEMAN' | 'AMERICANO'>('FRANCES');
  const [simulatedCuotas, setSimulatedCuotas] = useState<CuotaSimulada[] | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await api.get('/productos-credito/activos');
        const prods = (res.data || []);
        setProductos(prods);
        if (prods.length > 0) {
          setSimProductoId(prods[0].id);
          setSimMonto(String(prods[0].montoMinimo));
          setSimPlazo(String(prods[0].plazoMinimoMeses));
        }
      } catch (err) {
        console.error('Error fetching productos de crédito:', err);
      }
    };
    fetchProductos();
  }, []);

  // Estados de la Solicitud de Crédito Post-Simulación
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [destinoFondo, setDestinoFondo] = useState<string>('');
  const [applyLoading, setApplyLoading] = useState<boolean>(false);
  const [applySuccessData, setApplySuccessData] = useState<any | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Simulación de Crédito
  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    setSimError(null);
    setSimulatedCuotas(null);

    const montoVal = parseFloat(simMonto);
    const plazoVal = parseInt(simPlazo);
    const productoSel = productos.find(p => p.id === Number(simProductoId));

    if (!productoSel) {
      setSimError('Debe seleccionar un producto de crédito válido.');
      setSimLoading(false);
      return;
    }

    const tasaVal = productoSel.tasaInteresAnual;

    if (isNaN(montoVal) || montoVal < productoSel.montoMinimo || montoVal > productoSel.montoMaximo) {
      setSimError(`El monto solicitado debe estar entre ${formatCurrency(productoSel.montoMinimo)} y ${formatCurrency(productoSel.montoMaximo)}.`);
      setSimLoading(false);
      return;
    }
    if (isNaN(plazoVal) || plazoVal < productoSel.plazoMinimoMeses || plazoVal > productoSel.plazoMaximoMeses) {
      setSimError(`El plazo en meses debe estar entre ${productoSel.plazoMinimoMeses} y ${productoSel.plazoMaximoMeses} meses.`);
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
    if (productos.length > 0) {
      setSimMonto(String(productos[0].montoMinimo));
      setSimPlazo(String(productos[0].plazoMinimoMeses));
      setSimProductoId(productos[0].id);
    } else {
      setSimMonto('');
      setSimPlazo('');
      setSimProductoId('');
    }
    setSimSistema('FRANCES');
    setSimulatedCuotas(null);
    setSimError(null);
  };

  // Enviar Solicitud de Crédito
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinoFondo) {
      setApplyError('Error: El destino del fondo es obligatorio.');
      return;
    }

    setApplyLoading(true);
    setApplyError(null);

    const montoVal = parseFloat(simMonto);
    const plazoVal = parseInt(simPlazo);
    const productoSel = productos.find(p => p.id === Number(simProductoId));

    if (!productoSel) {
      setApplyError('Error: No se ha seleccionado un producto de crédito válido.');
      return;
    }

    const tasaVal = productoSel.tasaInteresAnual;

    try {
      const result = await onApply({
        montoSolicitado: montoVal,
        plazoMeses: plazoVal,
        tasaInteresAnual: tasaVal,
        tipoAmortizacion: simSistema,
        destinoFondo,
        productoCreditoId: productoSel.id
      });
      setApplySuccessData(result);
      setIsApplyModalOpen(false);
    } catch (err: any) {
      console.error('Error solicitando crédito:', err);
      const errMsg = err.response?.data?.message || err.response?.data || 'Ocurrió un error al procesar la solicitud de crédito.';
      setApplyError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    } finally {
      setApplyLoading(false);
    }
  };

  // Métricas del Simulador
  const getSimMetrics = () => {
    if (!simulatedCuotas || simulatedCuotas.length === 0) return { totalInterest: 0, totalCost: 0, avgCuota: 0 };
    
    const totalCost = simulatedCuotas.reduce((sum, q) => sum + q.cuotaTotal, 0);
    const totalInterest = simulatedCuotas.reduce((sum, q) => sum + q.interes, 0);
    const avgCuota = totalCost / simulatedCuotas.length;

    return { totalInterest, totalCost, avgCuota };
  };

  const simMetrics = getSimMetrics();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 items-start">
        
        {/* Formulario (Col-span 2) */}
        <div className="lg:col-span-2">
          <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.03)]">
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
                  value={String(simProductoId)} 
                  onChange={(e) => {
                    const pid = Number(e.target.value);
                    setSimProductoId(pid);
                    const sel = productos.find(p => p.id === pid);
                    if (sel) {
                      setSimMonto(String(sel.montoMinimo));
                      setSimPlazo(String(sel.plazoMinimoMeses));
                    }
                  }}
                >
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.tasaInteresAnual}%)</option>
                  ))}
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
                    min={productos.find(x => x.id === Number(simProductoId))?.plazoMinimoMeses || 1}
                    max={productos.find(x => x.id === Number(simProductoId))?.plazoMaximoMeses || 120}
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

              {/* Información Adicional del Producto Seleccionado */}
              {simProductoId && (() => {
                const p = productos.find(x => x.id === Number(simProductoId));
                if (!p) return null;
                return (
                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#0054A6]" />
                      <div className="space-y-1">
                        <p><strong>Rango de Monto:</strong> {formatCurrency(p.montoMinimo)} - {formatCurrency(p.montoMaximo)}</p>
                        <p><strong>Plazo Permitido:</strong> {p.plazoMinimoMeses} a {p.plazoMaximoMeses} meses</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tasa fija leída de solo lectura */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500">Tasa de Interés Nominal Anual</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="text" 
                    value={(() => {
                      const p = productos.find(x => x.id === Number(simProductoId));
                      return p ? `${p.tasaInteresAnual.toFixed(2)} %` : '0.00 %';
                    })()}
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
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 select-none">
                        <th className="py-2.5 px-3 text-center">Cuota</th>
                        <th className="py-2.5 px-3">Fecha Vencimiento</th>
                        <th className="py-2.5 px-3">Capital</th>
                        <th className="py-2.5 px-3">Interés</th>
                        <th className="py-2.5 px-3">Cuota Total</th>
                        <th className="py-2.5 px-3 text-right pr-3">Saldo Restante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600 text-xs">
                      {simulatedCuotas.map(cuota => (
                        <tr key={cuota.numeroCuota} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 text-center font-bold text-slate-800">{cuota.numeroCuota}</td>
                          <td className="py-2 px-3">{cuota.fechaVencimiento}</td>
                          <td className="py-2 px-3">{formatCurrency(cuota.capital)}</td>
                          <td className="py-2 px-3">{formatCurrency(cuota.interes)}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{formatCurrency(cuota.cuotaTotal)}</td>
                          <td className="py-2 px-3 text-right pr-3 font-mono text-slate-400">
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
                {buttonLabel}
              </Button>
            </div>
          ) : (
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

      {/* Modal de Confirmación de Solicitud */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in select-none">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 backdrop-blur-2xl border border-slate-200/50 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 md:p-8 animate-scale-up relative"
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
                Revisa las condiciones financieras del préstamo antes de continuar.
              </p>
            </div>

            {(() => {
              const productoSel = productos.find(p => p.id === Number(simProductoId));
              return (
                <>

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
                <span className="font-bold text-slate-700 capitalize">{productoSel?.nombre || 'N/A'}</span>
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
                <span className="font-bold text-slate-700">{productoSel?.tasaInteresAnual || 0}% anual</span>
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
            </>
            );
            })()}

          </div>
        </div>
      )}

      {/* Modal de Éxito - Recibo de Solicitud en Proceso */}
      {applySuccessData !== null && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in select-none">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 backdrop-blur-2xl border border-slate-200/50 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 md:p-8 animate-scale-up relative"
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
                  <span className="font-semibold text-slate-700 capitalize">
                    {productos.find(p => p.id === Number(simProductoId))?.nombre || ''}
                  </span>
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
                  if (onSuccessClose) {
                    onSuccessClose();
                  }
                }}
                className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-semibold rounded-2xl h-12 transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                Entendido
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-2">
                <Info className="h-3.5 w-3.5" />
                <span>{successMessage}</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
