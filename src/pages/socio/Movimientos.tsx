import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  Loader2, 
  Download, 
  AlertCircle,
  X,
  FileText,
  Search,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { useTenant } from '../../context/TenantContext';
import { jsPDF } from 'jspdf';

interface Account {
  id: number;
  numeroCuenta: string;
  tipo: string;
  saldo: number;
  tasaInteresAnual: number;
  estado: string;
}

interface Transaction {
  id: number;
  tipoTransaccion: 'DEBITO' | 'CREDITO';
  monto: number;
  saldoAnterior: number;
  saldoResultante: number;
  referencia: string;
  descripcion: string;
  fechaContable: string;
}

export const Movimientos: React.FC = () => {
  const { user } = useAuth();
  const { activeTenant } = useTenant();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txsLoading, setTxsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);

  // Estados de los filtros
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados del Modal de Descarga PDF
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadPeriod, setDownloadPeriod] = useState<'CURRENT' | 'SELECT'>('CURRENT');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [pdfLoading, setPdfLoading] = useState(false);

  const monthsList = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' },
  ];

  const yearsList = [2026, 2025];

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const accountsRes = await api.get('/cuentas/mis-cuentas');
      const accountsList = accountsRes.data as Account[];
      setAccounts(accountsList);

      const mainAccount = accountsList.find(acc => acc.tipo === 'AHORRO_VISTA' && acc.estado === 'ACTIVA') 
        || accountsList[0];

      if (mainAccount) {
        setSelectedAccountId(mainAccount.id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error cargando cuentas:', err);
      setError('Ocurrió un error al cargar tus cuentas financieras. Por favor, intenta de nuevo.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Cargar transacciones cada vez que cambie la cuenta seleccionada
  useEffect(() => {
    if (selectedAccountId) {
      const fetchTransactions = async () => {
        setTxsLoading(true);
        setError(null);
        try {
          const txsRes = await api.get(`/cuentas/${selectedAccountId}/transacciones`);
          setAllTransactions(txsRes.data as Transaction[]);
        } catch (err: any) {
          console.error('Error cargando movimientos:', err);
          setError('Ocurrió un error al cargar el historial de transacciones de esta cuenta.');
        } finally {
          setTxsLoading(false);
          setLoading(false);
        }
      };
      fetchTransactions();
    }
  }, [selectedAccountId]);

  // Función para descargar PDF
  const handleDownloadPdf = async () => {
    const activeAccount = accounts.find(acc => acc.id === selectedAccountId) || accounts[0];
    if (!activeAccount) return;

    setPdfLoading(true);
    try {
      let url = `/cuentas/${activeAccount.id}/reporte-pdf`;
      
      // Si elegimos un mes específico
      if (downloadPeriod === 'CURRENT') {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        url += `?anio=${year}&mes=${month}`;
      } else {
        url += `?anio=${selectedYear}&mes=${selectedMonth}`;
      }

      const response = await api.get(url, {
        responseType: 'blob',
      });
      
      const contentType = response.headers['content-type'];
      if (typeof contentType === 'string' && contentType.includes('application/json')) {
        const text = await response.data.text();
        const errObj = JSON.parse(text);
        throw new Error(errObj.message || 'Error al generar el reporte.');
      } else if (typeof contentType === 'string' && contentType.includes('text/plain')) {
        const text = await response.data.text();
        throw new Error(text || 'Error al generar el reporte.');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const filenameMonth = downloadPeriod === 'CURRENT' 
        ? monthsList[new Date().getMonth()].name 
        : monthsList[selectedMonth - 1].name;
      const filenameYear = downloadPeriod === 'CURRENT' ? new Date().getFullYear() : selectedYear;

      link.setAttribute('download', `estado_cuenta_${activeAccount.numeroCuenta}_${filenameMonth}_${filenameYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      console.error('Error descargando PDF:', err);
      alert(err.message || 'No se pudo generar el reporte PDF para el mes seleccionado.');
    } finally {
      setPdfLoading(false);
    }
  };

  const parseDescription = (desc: string) => {
    const ACCOUNT_NAMES: Record<string, string> = {
      '0201000001': 'Juan Pueblo Ortega',
      '401012000001': 'Juan Carlos Hoyos',
      '401010000001': 'Edgar Pérez',
      '401010000002': 'Marlon T'
    };

    if (!desc) {
      return {
        isTransfer: false,
        transferType: null as 'ENVIADA' | 'RECIBIDA' | null,
        descripcionDisplay: '-',
        nombres: '-',
        concepto: '-',
        cuentaAsociada: ''
      };
    }

    const descLower = desc.toLowerCase();
    const isEnviada = descLower.includes('enviada');
    const isRecibida = descLower.includes('recibida') || descLower.includes('recibida desde');
    const isTransfer = descLower.includes('transferencia');

    if (isTransfer) {
      const transferType = isEnviada ? ('ENVIADA' as const) : (isRecibida ? ('RECIBIDA' as const) : null);
      const descripcionDisplay = isEnviada ? 'Transferencia interna enviada' : (isRecibida ? 'Transferencia interna recibida' : 'Transferencia interna');
      
      let nombres = '-';
      let cuentaAsociada = '';
      let concepto = '-';

      // Intentar extraer el número de cuenta
      const ctaMatch = desc.match(/(?:Cta:|cuenta N:)\s*(\d+)/i) || desc.match(/\b(\d{8,12})\b/);
      if (ctaMatch) {
        cuentaAsociada = ctaMatch[1];
      }

      // Intentar extraer el nombre del tercero
      const nameMatch = desc.match(/enviada a\s+(.*?)\s+\(Cta:/i) || 
                        desc.match(/recibida de\s+(.*?)\s+\(Cta:/i) ||
                        desc.match(/recibida desde\s+(.*?)\s+\(Cta:/i);
      
      if (nameMatch) {
        nombres = nameMatch[1].trim();
      } else {
        // Fallback robusto con marcadores de posición o mapeo por cuenta
        const mappedName = ACCOUNT_NAMES[cuentaAsociada];
        if (mappedName) {
          nombres = mappedName;
        } else {
          nombres = isEnviada ? 'Socio Destinatario' : 'Socio Remitente';
        }
      }

      // Intentar extraer el concepto
      const conceptoMatch = desc.match(/Concepto:\s*(.*)$/i);
      if (conceptoMatch) {
        concepto = conceptoMatch[1].trim();
        if (!concepto) {
          concepto = '-';
        }
      }

      return {
        isTransfer,
        transferType,
        descripcionDisplay,
        nombres,
        concepto,
        cuentaAsociada
      };
    }

    // Crédito Desembolso
    if (desc.startsWith("Desembolso de Credito Contrato N:")) {
      return {
        isTransfer: false,
        transferType: null,
        descripcionDisplay: "Desembolso de Crédito",
        nombres: "-",
        concepto: desc.replace("Desembolso de Credito Contrato N:", "Contrato N:").trim(),
        cuentaAsociada: ""
      };
    }

    // Crédito Pago
    if (desc.startsWith("Pago de cuota de credito Contrato N:")) {
      return {
        isTransfer: false,
        transferType: null,
        descripcionDisplay: "Pago de Cuota de Crédito",
        nombres: "-",
        concepto: desc.replace("Pago de cuota de credito Contrato N:", "Contrato N:").trim(),
        cuentaAsociada: ""
      };
    }

    // Capitalización de Intereses
    if (desc.startsWith("Capitalización de intereses")) {
      return {
        isTransfer: false,
        transferType: null,
        descripcionDisplay: "Capitalización de Intereses",
        nombres: "-",
        concepto: desc.replace("Capitalización de intereses acumulados período:", "").trim(),
        cuentaAsociada: ""
      };
    }

    // Fallback genérico
    return {
      isTransfer: false,
      transferType: null,
      descripcionDisplay: desc,
      nombres: '-',
      concepto: desc,
      cuentaAsociada: ''
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatTxDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const handleDownloadReceiptPdf = (tx: Transaction) => {
    const parsed = parseDescription(tx.descripcion);
    const isEnviada = parsed.transferType === 'ENVIADA';
    const remitente = isEnviada ? (user?.nombresCompletos || '') : parsed.nombres;
    const beneficiario = isEnviada ? parsed.nombres : (user?.nombresCompletos || '');
    const ctaOrigen = isEnviada ? (activeAccount?.numeroCuenta || '-') : parsed.cuentaAsociada;
    const ctaDestino = isEnviada ? parsed.cuentaAsociada : (activeAccount?.numeroCuenta || '-');
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    // Background and Styling
    doc.setFillColor(255, 255, 255);
    doc.rect(5, 5, 138, 200, 'F');
    
    // Header accent line (emerald)
    doc.setFillColor(16, 185, 129);
    doc.rect(5, 5, 138, 3, 'F');

    // Cooperative Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(activeTenant?.name?.toUpperCase() || "COOPERATIVA DE AHORRO Y CRÉDITO ITQ", 74, 22, { align: "center" });

    // Receipt Header Title
    doc.setFontSize(15);
    doc.setTextColor(26, 26, 26);
    doc.text("¡Transferencia exitosa!", 74, 32, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 174, 192);
    doc.text("Comprobante de transacción electrónica", 74, 38, { align: "center" });

    // Decorative Circle Checkmark (Emerald)
    doc.setFillColor(209, 250, 229); // emerald-100
    doc.ellipse(74, 55, 9, 9, 'F');
    
    // Draw Checkmark
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(1.2);
    doc.line(71, 55, 73.2, 57.2);
    doc.line(73.2, 57.2, 77.5, 52.5);

    // Amount
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Monto Transferido", 74, 76, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 84, 166);
    doc.text(formatCurrency(tx.monto), 74, 86, { align: "center" });

    // Divider
    doc.setDrawColor(241, 245, 249);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(15, 96, 133, 96);
    doc.setLineDashPattern([], 0);

    // Details fields
    const drawRow = (label: string, value: string, y: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(label, 15, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(26, 26, 26);
      const splitValue = doc.splitTextToSize(value, 60);
      doc.text(splitValue, 133, y, { align: "right" });
    };

    let currentY = 106;
    drawRow("Remitente", remitente, currentY);
    currentY += 10;
    drawRow("Cuenta de Origen", ctaOrigen, currentY);
    currentY += 10;
    drawRow("Beneficiario", beneficiario, currentY);
    currentY += 10;
    drawRow("Cuenta de Destino", ctaDestino, currentY);
    currentY += 10;
    drawRow("Concepto", parsed.concepto, currentY);
    currentY += 10;
    drawRow("Número de Referencia", tx.referencia, currentY);
    currentY += 10;
    drawRow("Fecha y Hora", formatTxDate(tx.fechaContable), currentY);

    // Save the PDF
    doc.save(`comprobante_${tx.referencia}.pdf`);
  };

  // Formato para los selectores de cuenta
  const getAccountLabel = (acc: Account) => {
    const tipoStr = acc.tipo === 'AHORRO_VISTA' ? 'Ahorro a la Vista' : acc.tipo;
    return `${tipoStr} (${acc.numeroCuenta})`;
  };

  // Filtrado de movimientos reactivo en el cliente
  const filteredTransactions = allTransactions.filter(tx => {
    // 1. Filtrar por fecha desde
    if (filterStartDate) {
      const txDate = new Date(tx.fechaContable);
      const startDate = new Date(filterStartDate);
      startDate.setHours(0, 0, 0, 0);
      txDate.setHours(0, 0, 0, 0);
      if (txDate < startDate) return false;
    }

    // 2. Filtrar por fecha hasta
    if (filterEndDate) {
      const txDate = new Date(tx.fechaContable);
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      txDate.setHours(0, 0, 0, 0);
      if (txDate > endDate) return false;
    }

    // 3. Buscador Universal (por concepto o descripción)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = tx.descripcion ? tx.descripcion.toLowerCase() : '';
      const ref = tx.referencia ? tx.referencia.toLowerCase() : '';
      if (!desc.includes(q) && !ref.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Cálculos estadísticos sobre movimientos filtrados
  const totalIngresos = filteredTransactions
    .filter(tx => tx.tipoTransaccion === 'CREDITO')
    .reduce((sum, tx) => sum + tx.monto, 0);

  const totalGastos = filteredTransactions
    .filter(tx => tx.tipoTransaccion === 'DEBITO')
    .reduce((sum, tx) => sum + tx.monto, 0);

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
    if (accounts.length > 0) {
      const mainAccount = accounts.find(acc => acc.tipo === 'AHORRO_VISTA' && acc.estado === 'ACTIVA') 
        || accounts[0];
      setSelectedAccountId(mainAccount.id);
    }
  };

  const renderTableSkeleton = () => {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-4 w-2/3">
              <div className="h-4 bg-slate-100 rounded-md w-20 shrink-0" />
              <div className="h-4 bg-slate-200/80 rounded-md w-16 shrink-0" />
              <div className="h-4 bg-slate-100 rounded-md w-full max-w-[200px]" />
            </div>
            <div className="flex items-center gap-8 shrink-0">
              <div className="h-4 bg-slate-200/80 rounded-md w-14 text-right" />
              <div className="h-4 bg-slate-100 rounded-md w-16 text-right" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!user) return null;

  const activeAccount = accounts.find(acc => acc.id === selectedAccountId) || accounts[0];

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-0 select-none">
      
      {/* Header with Title and Download Button */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Historial de Movimientos</h1>
          <p className="text-slate-500 text-sm mt-1">Audita las transacciones y exporta tus reportes financieros.</p>
        </div>

        {activeAccount && (
          <Button 
            onClick={() => setIsDownloadModalOpen(true)}
            className="bg-[#0054A6] hover:bg-[#004080] text-white font-semibold rounded-2xl h-11 px-5 shadow-sm transition-all duration-300 flex items-center gap-2 cursor-pointer text-xs"
          >
            <Download className="h-4 w-4 text-white" />
            Descargar Estado de Cuenta
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Barra de Filtros en una Sola Línea */}
      <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)]">
        {loading ? (
          <div className="h-14 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            
            {/* Selector de Cuenta */}
            <div className="w-full">
              <Select
                label="Cuenta"
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccountId(Number(e.target.value))}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {getAccountLabel(acc)}
                  </option>
                ))}
              </Select>
            </div>

            {/* Fecha Desde */}
            <div className="space-y-1.5 w-full">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Desde</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="pl-10 pr-4 w-full bg-white border border-slate-200/60 rounded-xl py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] transition-all h-[42px] cursor-pointer"
                />
              </div>
            </div>

            {/* Fecha Hasta */}
            <div className="space-y-1.5 w-full">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Hasta</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="pl-10 pr-4 w-full bg-white border border-slate-200/60 rounded-xl py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] transition-all h-[42px] cursor-pointer"
                />
              </div>
            </div>

            {/* Buscador Universal */}
            <div className="space-y-1.5 w-full">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Buscador</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar concepto..."
                  className="pl-10 pr-4 w-full bg-white border border-slate-200/60 rounded-xl py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] transition-all h-[42px]"
                />
              </div>
            </div>

          </div>
        )}
      </Card>

      {/* Bloque Central de Resumen e Indicadores Visuales */}
      {!loading && !txsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {/* Card: Saldo Contable */}
          <Card className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(0,84,166,0.015)] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Saldo Contable</span>
              <span className="text-2xl font-black text-[#0054A6] tracking-tight">
                {formatCurrency(activeAccount?.saldo || 0)}
              </span>
            </div>
            <ChevronRight className="h-6 w-6 text-[#0054A6] shrink-0" />
          </Card>

          {/* Card: Total Ingresos */}
          <Card className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(0,84,166,0.015)] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Ingresos</span>
              <span className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(totalIngresos)}</span>
            </div>
            <TrendingUp className="h-6 w-6 text-emerald-500 shrink-0" />
          </Card>

          {/* Card: Total Gastos */}
          <Card className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(0,84,166,0.015)] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Total Gastos</span>
              <span className="text-2xl font-black text-rose-600 tracking-tight">{formatCurrency(totalGastos)}</span>
            </div>
            <TrendingDown className="h-6 w-6 text-rose-500 shrink-0" />
          </Card>
        </div>
      )}

      {/* Header de la Tabla con Limpiar Filtros */}
      {!loading && !txsLoading && (
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historial de transacciones</h2>
          {(selectedAccountId !== (accounts.find(acc => acc.tipo === 'AHORRO_VISTA')?.id || accounts[0]?.id) ||
            filterStartDate ||
            filterEndDate ||
            searchQuery) && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#0054A6] hover:text-[#004080] font-bold uppercase tracking-wider transition-all cursor-pointer hover:underline"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      )}

      {/* Tabla de Movimientos */}
      <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)]">
        {txsLoading ? (
          renderTableSkeleton()
        ) : (
          <div className="overflow-x-auto">
            {filteredTransactions.length > 0 ? (
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs bg-slate-50/10">
                    <th className="py-3 px-4 rounded-l-2xl">Fecha</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4">Nombres</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                    <th className="py-3 px-4 text-right rounded-r-2xl">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const isIngreso = tx.tipoTransaccion === 'CREDITO';
                    const parsed = parseDescription(tx.descripcion);
                    return (
                      <tr 
                        key={tx.id}
                        onClick={() => {
                          if (parsed.isTransfer) {
                            setSelectedTxForReceipt(tx);
                          }
                        }}
                        className={`border-b border-slate-50 transition-all duration-150 ${
                          parsed.isTransfer 
                            ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100' 
                            : 'hover:bg-slate-50/30'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-400 whitespace-nowrap">
                          {formatTxDate(tx.fechaContable)}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-500">
                          {isIngreso ? 'Ingreso' : 'Egreso'}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold text-slate-700">
                          {parsed.descripcionDisplay}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                          {parsed.nombres}
                        </td>
                        <td className={`py-3.5 px-4 text-sm text-right font-extrabold ${
                          isIngreso ? 'text-emerald-600' : 'text-slate-800'
                        }`}>
                          {isIngreso ? '+' : '-'}{formatCurrency(tx.monto)}
                        </td>
                        <td className="py-3.5 px-4 text-sm text-right font-extrabold text-slate-500">
                          {formatCurrency(tx.saldoResultante)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs font-medium space-y-3 flex flex-col items-center">
                <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-450 mb-1">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <p className="font-bold text-slate-700">No se encontraron movimientos</p>
                <p className="text-slate-400 max-w-[280px]">
                  No hay transacciones registradas en este período para los filtros seleccionados. Intenta cambiar las fechas o el concepto de búsqueda.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Modal de Configuración Descarga PDF */}
      {isDownloadModalOpen && activeAccount && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/50 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 md:p-8 animate-scale-up select-none relative">
            
            {/* Cerrar */}
            <button
              onClick={() => setIsDownloadModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Titulo */}
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#0054A6]" />
                Descargar Estado de Cuenta
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Selecciona el periodo del reporte para exportar a PDF.
              </p>
            </div>

            {/* Opciones */}
            <div className="space-y-5">
              
              <div className="space-y-2">
                <div 
                  onClick={() => setDownloadPeriod('CURRENT')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    downloadPeriod === 'CURRENT' 
                      ? 'border-[#0054A6] bg-blue-50/10' 
                      : 'border-slate-150 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    downloadPeriod === 'CURRENT' ? 'border-[#0054A6]' : 'border-slate-300'
                  }`}>
                    {downloadPeriod === 'CURRENT' && <div className="h-2 w-2 rounded-full bg-[#0054A6]" />}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-700 block leading-none">Este mes</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Incluye transacciones de {monthsList[new Date().getMonth()].name} {new Date().getFullYear()}
                    </span>
                  </div>
                </div>

                <div 
                  onClick={() => setDownloadPeriod('SELECT')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    downloadPeriod === 'SELECT' 
                      ? 'border-[#0054A6] bg-blue-50/10' 
                      : 'border-slate-150 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    downloadPeriod === 'SELECT' ? 'border-[#0054A6]' : 'border-slate-300'
                  }`}>
                    {downloadPeriod === 'SELECT' && <div className="h-2 w-2 rounded-full bg-[#0054A6]" />}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-700 block leading-none">Seleccionar un mes específico</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Exporta el reporte consolidado de un periodo histórico</span>
                  </div>
                </div>
              </div>

              {/* Selector de Meses y Años */}
              {downloadPeriod === 'SELECT' && (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 animate-slide-down">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Mes</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full h-9 px-2 rounded-lg border border-slate-200/60 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] transition-all"
                    >
                      {monthsList.map(m => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Año</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full h-9 px-2 rounded-lg border border-slate-200/60 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] transition-all"
                    >
                      {yearsList.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Descargar Button */}
              <Button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-12 transition-all shadow-md shadow-blue-600/10 cursor-pointer flex items-center justify-center gap-2 mt-4 text-xs"
              >
                {pdfLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Generando estado contable...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-white" />
                    Descargar PDF
                  </>
                )}
              </Button>

            </div>

          </div>
        </div>
      )}

      {/* Modal de Comprobante de Transferencia */}
      {selectedTxForReceipt !== null && (
        <div 
          onClick={() => setSelectedTxForReceipt(null)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 backdrop-blur-2xl border border-slate-200/50 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 md:p-8 animate-scale-up select-none relative"
          >
            {/* Accent decoration */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-[2.5rem]" />
            
            {/* Cerrar */}
            <button
              onClick={() => setSelectedTxForReceipt(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4 pt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {activeTenant?.name || 'Cooperativa de Ahorro y Crédito ITQ'}
              </span>
              <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm animate-scale-up">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">¡Transferencia exitosa!</h2>
                <p className="text-slate-400 text-xs mt-1">Comprobante de transacción electrónica</p>
              </div>
            </div>

            {(() => {
              const parsed = parseDescription(selectedTxForReceipt.descripcion);
              const isEnviada = parsed.transferType === 'ENVIADA';
              const remitente = isEnviada ? user.nombresCompletos : parsed.nombres;
              const beneficiario = isEnviada ? parsed.nombres : user.nombresCompletos;
              const ctaOrigen = isEnviada ? (activeAccount?.numeroCuenta || '-') : parsed.cuentaAsociada;
              const ctaDestino = isEnviada ? parsed.cuentaAsociada : (activeAccount?.numeroCuenta || '-');

              return (
                <div className="mt-8 space-y-5 border-t border-b border-dashed border-slate-100 py-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Monto Transferido</span>
                    <span className="text-2xl font-black text-[#0054A6]">
                      {formatCurrency(selectedTxForReceipt.monto)}
                    </span>
                  </div>
                  
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Remitente</span>
                      <span className="font-semibold text-slate-700 text-right">{remitente}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cuenta de Origen</span>
                      <span className="font-semibold text-slate-700">{ctaOrigen}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Beneficiario</span>
                      <span className="font-semibold text-slate-700 text-right">{beneficiario}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cuenta de Destino</span>
                      <span className="font-semibold text-slate-700">{ctaDestino}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Concepto</span>
                      <span className="font-semibold text-slate-700 text-right">{parsed.concepto}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Número de Referencia</span>
                      <span className="font-mono font-bold text-slate-600">{selectedTxForReceipt.referencia}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fecha y Hora</span>
                      <span className="font-semibold text-slate-700">{formatTxDate(selectedTxForReceipt.fechaContable)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mt-6">
              <Button
                onClick={() => handleDownloadReceiptPdf(selectedTxForReceipt)}
                className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-semibold rounded-2xl h-12 transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar comprobante
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default Movimientos;
