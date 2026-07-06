import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calculator, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  AlertTriangle, 
  Check, 
  ArrowRight,
  Info,
  Copy
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface Account {
  id: number;
  numeroCuenta: string;
  tipo: string;
  saldo: number;
  tasaInteresAnual: number;
  estado: string;
  createdAt?: string;
  plazoDias?: number;
  fechaVencimiento?: string;
}

interface ProductoAhorro {
  id: number;
  nombre: string;
  tipoProducto: string; // 'AHORRO_VISTA', 'AHORRO_PROGRAMADO', 'PLAZO_FIJO', 'APORTACIONES'
  tasaInteresAnual: number;
  montoMinimoApertura: number;
  saldoMinimoRequerido: number;
  tipoRetiro: string;
  tasaPenalizacionRetiro: number;
  estado: string;
}

export const Inversiones: React.FC = () => {
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'mis-inversiones' | 'simular'>('mis-inversiones');

  // Estados del simulador y apertura
  const [catalogProducts, setCatalogProducts] = useState<ProductoAhorro[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedProdId, setSelectedProdId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductoAhorro | null>(null);
  const [montoSimulacion, setMontoSimulacion] = useState<string>('');
  const [plazoSimulacion, setPlazoSimulacion] = useState<string>('');
  const [renovacionAutomatica, setRenovacionAutomatica] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [cargandoAperturaSocio, setCargandoAperturaSocio] = useState(false);
  const [aperturadoExitoso, setAperturadoExitoso] = useState<any | null>(null);
  const [aperturaError, setAperturaError] = useState<string | null>(null);

  const simulatorRef = useRef<HTMLDivElement>(null);



  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener cuentas del socio
      const accountsRes = await api.get('/cuentas/mis-cuentas');
      setAccounts(accountsRes.data as Account[]);

      // 2. Cargar catálogo de productos de ahorro activos
      setLoadingCatalog(true);
      try {
        const prodRes = await api.get('/productos-ahorro/activos');
        const filtered = (prodRes.data as ProductoAhorro[]).filter(
          p => p.tipoProducto === 'AHORRO_PROGRAMADO' || p.tipoProducto === 'PLAZO_FIJO'
        );
        setCatalogProducts(filtered);
      } catch (prodErr) {
        console.error('Error cargando catálogo de ahorros:', prodErr);
      } finally {
        setLoadingCatalog(false);
      }
    } catch (err: any) {
      console.error('Error cargando información de inversiones:', err);
      setError('Ocurrió un error al cargar la información. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrar solo las cuentas de inversión que posee el socio
  const investmentAccounts = accounts.filter(
    acc => acc.tipo === 'AHORRO_PROGRAMADO' || acc.tipo === 'PLAZO_FIJO'
  );

  // Cuenta principal Ahorro Vista para fondear
  const mainAccount = accounts.find(acc => acc.tipo === 'AHORRO_VISTA' && acc.estado === 'ACTIVA')
    || accounts.find(acc => acc.tipo === 'AHORRO_VISTA')
    || accounts[0];

  // Corrección matemática según las directrices financieras aprobadas
  const getProyeccion = () => {
    if (!selectedProduct) return null;
    const rate = selectedProduct.tasaInteresAnual / 100;
    const monto = parseFloat(montoSimulacion) || 0;
    const plazo = parseInt(plazoSimulacion) || 0;

    let intereses = 0;
    let montoTotalFinal = 0;
    let fechaVencimiento = new Date();

    if (selectedProduct.tipoProducto === 'AHORRO_PROGRAMADO') {
      const capital = monto * plazo;
      // Proyección mensual acumulada (Interés Simple sobre Aporte Mensual Gradual)
      // Fórmula: ((Capital_total * Tasa * Plazo_meses) / 12) / 2
      intereses = ((capital * rate * plazo) / 12) / 2;
      montoTotalFinal = capital + intereses;
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + plazo);
    } else if (selectedProduct.tipoProducto === 'PLAZO_FIJO') {
      const capital = monto;
      // Proyección en base a días (Interés Simple sobre Certificado de Depósito a Plazo Fijo)
      // Fórmula: (Capital * Tasa * Plazo_dias) / 360
      intereses = (capital * rate * plazo) / 360;
      montoTotalFinal = capital + intereses;
      fechaVencimiento.setDate(fechaVencimiento.getDate() + plazo);
    } else {
      intereses = 0;
      montoTotalFinal = monto;
    }

    return {
      tasaAnual: selectedProduct.tasaInteresAnual,
      montoInversion: monto,
      montoTotalAportado: selectedProduct.tipoProducto === 'AHORRO_PROGRAMADO' ? monto * plazo : monto,
      interesesGanados: intereses,
      montoTotalFinal,
      fechaVencimiento,
      montoMinimoApertura: selectedProduct.montoMinimoApertura
    };
  };

  const handleAperturaSocioSubmit = async () => {
    if (!selectedProduct) return;
    setCargandoAperturaSocio(true);
    setAperturaError(null);
    try {
      const res = await api.post('/cuentas/aperturar-socio', {
        productoAhorroId: selectedProduct.id,
        montoInicial: parseFloat(montoSimulacion) || 0,
        plazo: parseInt(plazoSimulacion) || 0,
        renovacionAutomatica: renovacionAutomatica
      });
      setAperturadoExitoso(res.data);
      setIsConfirmModalOpen(false);
      await fetchData();
      setSelectedProdId(null);
      setSelectedProduct(null);
      setMontoSimulacion('');
      setPlazoSimulacion('');
      setRenovacionAutomatica(false);
      setActiveTab('mis-inversiones'); // Redirigir a mis inversiones
    } catch (err: any) {
      console.error('Error al aperturar inversión:', err);
      const errMsg = err.response?.data || 'No se pudo completar la apertura de la cuenta de inversión. Intente más tarde.';
      setAperturaError(errMsg);
    } finally {
      setCargandoAperturaSocio(false);
    }
  };

  const handleScrollToSimulator = () => {
    setActiveTab('simular');
    setTimeout(() => {
      simulatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  // Encontrar la tasa máxima del catálogo para el banner de marketing
  const maxRate = catalogProducts.length > 0 
    ? Math.max(...catalogProducts.map(p => p.tasaInteresAnual))
    : 9.5;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-0">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">
          Inversiones y Programas de Ahorro
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1">
          Rentabiliza tu dinero con total seguridad y bajo la supervisión de la Superintendencia.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Banner Promocional Premium (Minimalista blanco con sombra suave) */}
      <Card className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 p-6 md:p-10 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.02)]">
        {/* Glow Effects sutiles */}
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-slate-50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-xl md:text-3xl font-extrabold tracking-tight leading-tight text-slate-800">
              Haz que tu dinero trabaje para ti
            </h2>
            <p className="text-slate-500 text-xs md:text-sm max-w-xl leading-relaxed">
              Consigue el máximo rendimiento con nuestros planes de **Ahorro Programado** o certificados de **Depósito a Plazo Fijo**. Abre tu inversión digitalmente desde <span className="font-extrabold text-[#0054A6]">{maxRate.toFixed(2)}% anual</span> y asegura tu futuro financiero.
            </p>
          </div>
          
          <div className="lg:col-span-4 flex lg:justify-end">
            <Button
              onClick={handleScrollToSimulator}
              className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg text-xs flex items-center gap-2 group cursor-pointer w-full lg:w-auto justify-center"
            >
              Simular ahora
              <ArrowRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Selector de Pestañas (Segmented Control) */}
      <div className="flex p-1 bg-[#F1F3F6] border border-slate-100/50 rounded-full w-full sm:w-fit gap-1 select-none">
        <button
          onClick={() => setActiveTab('mis-inversiones')}
          className="relative flex-1 sm:flex-initial px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer text-slate-505 hover:text-[#0054A6]"
        >
          {activeTab === 'mis-inversiones' && (
            <motion.div
              layoutId="activeTabInversionSocio"
              className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className={`relative z-10 transition-colors duration-300 ${
            activeTab === 'mis-inversiones' ? 'text-white' : 'text-slate-500'
          }`}>
            Mis Inversiones ({investmentAccounts.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('simular')}
          className="relative flex-1 sm:flex-initial px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer text-slate-505 hover:text-[#0054A6]"
        >
          {activeTab === 'simular' && (
            <motion.div
              layoutId="activeTabInversionSocio"
              className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className={`relative z-10 transition-colors duration-300 ${
            activeTab === 'simular' ? 'text-white' : 'text-slate-500'
          }`}>
            Simular Inversión
          </span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-6 md:space-y-8 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 min-h-[140px] space-y-4 shadow-sm">
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-8 bg-slate-200 rounded-lg w-1/2 mt-4" />
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'mis-inversiones' ? (
        <div>
          {investmentAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {investmentAccounts.map((acc) => {
                const borderLeftColor = 
                  acc.tipo === 'AHORRO_PROGRAMADO' ? 'border-l-emerald-500' :
                  acc.tipo === 'PLAZO_FIJO' ? 'border-l-amber-500' : 'border-l-slate-300';
                
                const rate = acc.tasaInteresAnual / 100;
                let rendimiento = 0;
                let fechaApertura = acc.createdAt ? new Date(acc.createdAt) : new Date();
                let fechaVencimiento = acc.fechaVencimiento ? new Date(acc.fechaVencimiento + 'T00:00:00') : new Date(fechaApertura);
                let pct = 0;
                let plazo = acc.plazoDias || 180;

                if (acc.tipo === 'AHORRO_PROGRAMADO') {
                  let meses = acc.plazoDias ? acc.plazoDias / 30 : 12;
                  rendimiento = ((acc.saldo * rate * meses) / 12) / 2;
                  if (!acc.fechaVencimiento) {
                    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 12);
                  }
                } else if (acc.tipo === 'PLAZO_FIJO') {
                  rendimiento = (acc.saldo * rate * plazo) / 360;
                  if (!acc.fechaVencimiento) {
                    fechaVencimiento.setDate(fechaVencimiento.getDate() + 180);
                  }
                }

                const totalTime = fechaVencimiento.getTime() - fechaApertura.getTime();
                const elapsedTime = Date.now() - fechaApertura.getTime();
                pct = totalTime > 0 ? Math.max(0, Math.min(100, (elapsedTime / totalTime) * 100)) : 0;

                const formatFecha = (d: Date) => {
                  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
                };

                return (
                  <Card 
                    key={acc.id} 
                    className={`rounded-2xl border border-slate-100 border-l-4 ${borderLeftColor} bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between min-h-[220px] hover:shadow-md hover:border-slate-200/50 transition-all duration-300 group`}
                  >
                    {/* Header: Icon, Cuenta, Badge */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${acc.tipo === 'AHORRO_PROGRAMADO' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {acc.tipo === 'AHORRO_PROGRAMADO' ? <TrendingUp className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold font-mono text-slate-600" title={acc.numeroCuenta}>
                            **** {acc.numeroCuenta.slice(-4)}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(acc.numeroCuenta);
                              setCopiedText(acc.numeroCuenta);
                              setTimeout(() => setCopiedText(null), 2000);
                            }}
                            className="p-1 rounded hover:bg-slate-50 hover:text-[#0054A6] text-slate-400 transition-colors cursor-pointer"
                            title="Copiar número de cuenta completo"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          {copiedText === acc.numeroCuenta && (
                            <span className="text-[9px] font-black text-emerald-600 ml-1 animate-fade-in">¡Copiado!</span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        acc.tipo === 'AHORRO_PROGRAMADO' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/80' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100/80'
                      }`}>
                        {acc.tipo === 'PLAZO_FIJO' ? 'Plazo Fijo' : 'Ahorro Programado'} • {acc.estado}
                      </span>
                    </div>

                    {/* Metricas: Capital y Rendimiento */}
                    <div className="grid grid-cols-2 gap-4 py-3.5">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Capital Invertido</span>
                        <span className="text-lg font-black text-slate-800 tracking-tight font-mono">
                          {formatCurrency(acc.saldo)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Interés Proyectado</span>
                        <span className={`text-lg font-black tracking-tight font-mono ${acc.tipo === 'AHORRO_PROGRAMADO' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          +{formatCurrency(rendimiento)}
                        </span>
                      </div>
                    </div>

                    {/* Tasa Anual */}
                    <div className="flex justify-between items-center text-[10px] text-slate-550 font-semibold mb-2">
                      <span className="text-slate-400">Tasa de Interés</span>
                      <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md">
                        {acc.tasaInteresAnual}% anual
                      </span>
                    </div>

                    {/* Fechas de Contrato */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                      <span>Apertura: {formatFecha(fechaApertura)}</span>
                      <span className="font-bold text-slate-700">Vence: {formatFecha(fechaVencimiento)}</span>
                    </div>

                    {/* Progreso del Periodo (Barra Horizontal Fina) */}
                    <div className="mt-2.5 space-y-1">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            acc.tipo === 'AHORRO_PROGRAMADO' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Progreso del Periodo</span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center min-h-[250px] max-w-2xl mx-auto space-y-4">
              <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-455 shadow-sm">
                <Coins className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-700">No tienes inversiones activas</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Planifica tus metas o asegura un rendimiento fijo para tus ahorros con tasas preferenciales. ¡Simula tu inversión y ábrela en 1 minuto!
                </p>
              </div>
              <Button
                onClick={() => setActiveTab('simular')}
                className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-10 px-5 transition-all text-xs cursor-pointer shadow-sm shadow-blue-500/10"
              >
                Comenzar Simulación
              </Button>
            </Card>
          )}
        </div>
      ) : (
        /* Simular Inversión */
        <div ref={simulatorRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8 scroll-mt-6">
          <Card className="lg:col-span-7 rounded-[2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)] space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#0054A6]" />
                Simulador Financiero
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Selecciona la modalidad de tu preferencia y personaliza tu monto y plazo.
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Selección de Producto */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Modalidad de Inversión</label>
                {loadingCatalog ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0054A6]" />
                    Cargando catálogo...
                  </div>
                ) : (
                  <select 
                    value={selectedProdId || ''} 
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedProdId(id);
                      const prod = catalogProducts.find(p => p.id === id);
                      setSelectedProduct(prod || null);
                      setMontoSimulacion('');
                      setPlazoSimulacion('');
                      setRenovacionAutomatica(false);
                      setAperturaError(null);
                    }}
                    className="w-full h-11 px-4 pr-10 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1.1rem_1.1rem] bg-[position:right_1rem_center] bg-no-repeat cursor-pointer shadow-xs transition-all hover:bg-slate-50 focus:outline-none focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/10"
                  >
                    <option value="">Seleccione un producto para simular...</option>
                    {catalogProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.tipoProducto === 'AHORRO_PROGRAMADO' ? 'Aporte Mensual' : 'Plazo Fijo Único'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedProduct && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  {/* Parámetro de Monto */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      {selectedProduct.tipoProducto === 'PLAZO_FIJO' ? 'Monto Único de Inversión' : 'Aporte Fijo Mensual'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-xs font-extrabold text-slate-400">$</span>
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={montoSimulacion}
                        onChange={(e) => setMontoSimulacion(e.target.value)}
                        className="w-full h-11 pl-7 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0054A6] text-xs font-extrabold text-slate-700 font-mono"
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 block">Apertura mínima: ${selectedProduct.montoMinimoApertura.toFixed(2)}</span>
                  </div>

                  {/* Parámetro de Plazo */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      {selectedProduct.tipoProducto === 'PLAZO_FIJO' ? 'Plazo en Días' : 'Plazo en Meses'}
                    </label>
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder={selectedProduct.tipoProducto === 'PLAZO_FIJO' ? 'Ej: 90' : 'Ej: 12'}
                        value={plazoSimulacion}
                        onChange={(e) => setPlazoSimulacion(e.target.value)}
                        className="w-full h-11 pl-4 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0054A6] text-xs font-extrabold text-slate-700 font-mono"
                      />
                      <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-wider pointer-events-none select-none">
                        {selectedProduct.tipoProducto === 'PLAZO_FIJO' ? 'Días' : 'Meses'}
                      </span>
                    </div>
                  </div>

                  {/* Renovación Automática de Capital */}
                  <div className="col-span-1 sm:col-span-2 pt-2 flex items-center gap-2 select-none">
                    <input 
                      type="checkbox"
                      id="renovacionAutomatica"
                      checked={renovacionAutomatica}
                      onChange={(e) => setRenovacionAutomatica(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-200 text-[#0054A6] focus:ring-[#0054A6]/20 cursor-pointer accent-[#0054A6]"
                    />
                    <label htmlFor="renovacionAutomatica" className="text-xs font-bold text-slate-500 cursor-pointer select-none">
                      Renovación automática de capital al vencimiento
                    </label>
                  </div>
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3 text-xs text-slate-500 leading-relaxed">
                <Info className="h-4 w-4 text-[#0054A6] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-700">Detalles de Operación</p>
                  <p>
                    {selectedProduct.tipoProducto === 'PLAZO_FIJO'
                      ? 'Este certificado se emite por un único desembolso inicial. El capital y los intereses ganados se liquidarán al vencimiento del plazo seleccionado.'
                      : 'El ahorro programado requiere aportaciones mensuales obligatorias de igual valor durante el plazo contratado. Los intereses se capitalizan de forma automática.'
                    }
                  </p>
                  {selectedProduct.tasaPenalizacionRetiro > 0 && (
                    <p className="text-slate-455 text-[10px]">
                      * Penalización por retiro anticipado: {selectedProduct.tasaPenalizacionRetiro}% de tasa.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Panel Lateral: Proyección en Tiempo Real */}
          <div className="lg:col-span-5 bg-slate-50/50 rounded-[2rem] p-6 border border-slate-200/40 flex flex-col justify-between min-h-[300px] shadow-[0_8px_30px_rgba(0,0,0,0.01)]">
            {(() => {
              const proy = getProyeccion();
              const esMontoValido = proy && proy.montoInversion >= proy.montoMinimoApertura;
              const tieneValores = proy && proy.montoInversion > 0 && parseInt(plazoSimulacion) > 0;

              if (!proy || !tieneValores) {
                return (
                  <div className="flex flex-col items-center justify-center text-center flex-1 text-slate-400 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <Calculator className="h-6 w-6 text-slate-350" />
                    </div>
                    <p className="text-xs font-semibold max-w-[220px] leading-relaxed">
                      Elige un producto e ingresa los parámetros de monto y plazo para visualizar tu rendimiento garantizado.
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex flex-col justify-between h-full w-full space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Proyección del Retorno</span>
                      <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                        {proy.tasaAnual.toFixed(2)}% APR
                      </span>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">
                          {selectedProduct?.tipoProducto === 'PLAZO_FIJO' ? 'Monto inicial invertido' : 'Total acumulado en aportes'}
                        </span>
                        <span className="font-extrabold text-slate-700 font-mono">{formatCurrency(proy.montoTotalAportado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Intereses proyectados</span>
                        <span className="font-extrabold text-emerald-600 font-mono">+{formatCurrency(proy.interesesGanados)}</span>
                      </div>
                      
                      <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Total Estimado</span>
                          <span className="text-[9px] text-slate-400">Capital + Interés</span>
                        </div>
                        <span className="text-2xl font-black text-[#0054A6] font-mono">{formatCurrency(proy.montoTotalFinal)}</span>
                      </div>
                      
                      <div className="flex justify-between text-[10px] pt-1.5">
                        <span className="text-slate-400">Fecha Estimada Vencimiento</span>
                        <span className="font-bold text-slate-600">
                          {proy.fechaVencimiento.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {!esMontoValido && (
                      <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 text-[10px] text-rose-600 font-bold rounded-xl leading-tight">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>El monto ingresado es menor al mínimo requerido (${proy.montoMinimoApertura.toFixed(2)}).</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        setAperturaError(null);
                        setIsConfirmModalOpen(true);
                      }}
                      disabled={!esMontoValido}
                      className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-11 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-sm shadow-blue-500/10 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Proceder a Apertura
                    </Button>
                    <p className="text-[9px] text-slate-400 text-center leading-normal">
                      Al proceder, los fondos del aporte inicial serán transferidos de forma inmediata desde tu cuenta de ahorro principal.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Apertura */}
      {isConfirmModalOpen && selectedProduct && (
        <div 
          onClick={() => setIsConfirmModalOpen(false)}
          className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-100 rounded-[2rem] shadow-2xl w-full max-w-md p-6 animate-scale-up select-none relative"
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-400 to-[#0054A6] rounded-t-[2rem]" />
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-4 pt-2">
              <div className="h-10 w-10 rounded-full bg-blue-50 text-[#0054A6] flex items-center justify-center shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Confirmación de Fondeo</h3>
                <p className="text-xs text-slate-400 mt-0.5">Autorización de débito para inversión</p>
              </div>

              {aperturaError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-semibold">
                  {aperturaError}
                </div>
              )}

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Producto a aperturar</span>
                  <span className="font-bold text-slate-800">{selectedProduct.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monto Débito Inicial</span>
                  <span className="font-bold text-slate-800 font-mono">{formatCurrency(parseFloat(montoSimulacion) || 0)}</span>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-slate-500 font-semibold leading-relaxed">
                    <span className="text-rose-600 font-bold block mb-1">¡ATENCIÓN!</span>
                    El monto de apertura se debitará en línea de tu **Cuenta Vista Principal ({mainAccount?.numeroCuenta || 'No encontrada'})**. Por favor, revisa que los datos sean correctos antes de confirmar.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => setIsConfirmModalOpen(false)}
                  variant="outline"
                  className="flex-1 border-slate-200 text-slate-500 hover:bg-slate-50 font-bold rounded-xl h-11 transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAperturaSocioSubmit}
                  disabled={cargandoAperturaSocio}
                  className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-11 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-sm shadow-blue-500/10 disabled:opacity-50"
                >
                  {cargandoAperturaSocio ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar y Abrir'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito de Apertura */}
      {aperturadoExitoso && (
        <div 
          onClick={() => setAperturadoExitoso(null)}
          className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-100 rounded-[2rem] shadow-2xl w-full max-w-md p-6 text-center animate-scale-up select-none relative"
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-[2rem]" />
            <button
              onClick={() => setAperturadoExitoso(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-4 pt-4 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-xs animate-bounce">
                <Check className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">¡Inversión Aperturada!</h3>
                <p className="text-xs text-slate-400 mt-1">El depósito o plan de ahorro ha sido creado satisfactoriamente.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 w-full space-y-2.5 text-xs text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Número de Contrato</span>
                  <span className="font-bold text-slate-800 font-mono">{aperturadoExitoso.numeroCuenta}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Modalidad</span>
                  <span className="font-bold text-slate-800 uppercase">{aperturadoExitoso.tipo?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Saldo Fondeado</span>
                  <span className="font-extrabold text-emerald-600 font-mono">{formatCurrency(aperturadoExitoso.saldo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tasa de Interés Pactada</span>
                  <span className="font-bold text-slate-700">{aperturadoExitoso.tasaInteresAnual}% anual</span>
                </div>
              </div>

              <Button
                onClick={() => setAperturadoExitoso(null)}
                className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-11 transition-all cursor-pointer text-xs"
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inversiones;
