import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  TrendingUp, 
  AlertCircle,
  X,
  CheckCircle2,
  Download,
  Copy,
  Wallet,
  Coins,
  Send,
  CreditCard
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useTenant } from '../../context/TenantContext';
import { jsPDF } from 'jspdf';
import { maskAccountNumber } from '../../utils/securityFormatters';
import { drawReceiptHeader } from '../../utils/pdfGenerators';

interface Account {
  id: number;
  numeroCuenta: string;
  tipo: string;
  saldo: number;
  tasaInteresAnual: number;
  estado: string;
}

interface Credit {
  id: number;
  numeroCredito: string;
  montoSolicitado: number;
  montoDesembolsado: number;
  plazoMeses: number;
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

interface AmortizationCuota {
  id: number;
  numeroCuota: number;
  fechaVencimiento: string;
  capitalProyectado: number;
  interesProyectado: number;
  cuotaTotalProyectada: number;
  capitalPagado: number;
  interesPagado: number;
  estado: string;
}



export const Inicio: React.FC = () => {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]); // Últimas 5
  const [nextCuota, setNextCuota] = useState<AmortizationCuota | null>(null);
  const [activeCreditCuotas, setActiveCreditCuotas] = useState<AmortizationCuota[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const getFullAvatarUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) {
      return url;
    }
    return `http://localhost:8080/api/v1${url}`;
  };

  useEffect(() => {
    if (user && user.detalles) {
      setAvatarUrl(user.detalles.fotoPerfilUrl);
    }
  }, [user]);

  useEffect(() => {
    const handleAvatarChange = () => {
      if (user && user.detalles) {
        setAvatarUrl(user.detalles.fotoPerfilUrl);
      }
    };

    window.addEventListener('avatar-changed', handleAvatarChange);
    return () => {
      window.removeEventListener('avatar-changed', handleAvatarChange);
    };
  }, [user]);

  // Formatear fecha actual
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const dateStr = new Date().toLocaleDateString('es-ES', options);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener cuentas del socio
      const accountsRes = await api.get('/cuentas/mis-cuentas');
      const accountsList = accountsRes.data as Account[];
      setAccounts(accountsList);

      // 2. Obtener créditos del socio
      const creditsRes = await api.get('/creditos/mis-creditos');
      const creditsList = creditsRes.data as Credit[];
      setCredits(creditsList);

      // 3. Cargar movimientos de la cuenta principal AHORRO_VISTA si existe
      const mainAccount = accountsList.find(acc => acc.tipo === 'AHORRO_VISTA' && acc.estado === 'ACTIVA') 
        || accountsList[0];

      if (mainAccount) {
        const txsRes = await api.get(`/cuentas/${mainAccount.id}/transacciones`);
        const txsList = txsRes.data as Transaction[];
        setTransactions(txsList.slice(0, 5));
      }

      // 4. Si hay un crédito desembolsado, cargar su tabla de amortización para buscar la siguiente cuota pendiente
      const activeCredit = creditsList.find(c => c.estado === 'DESEMBOLSADO');
      if (activeCredit) {
        const amortRes = await api.get(`/creditos/${activeCredit.id}/amortizacion`);
        const cuotas = amortRes.data as AmortizationCuota[];
        setActiveCreditCuotas(cuotas);
        // Buscar la primera cuota pendiente o en mora
        const pending = cuotas.find(q => q.estado === 'PENDIENTE' || q.estado === 'EN_MORA');
        if (pending) {
          setNextCuota(pending);
        }
      } else {
        setActiveCreditCuotas([]);
        setNextCuota(null);
      }
    } catch (err: any) {
      console.error('Error cargando posición consolidada:', err);
      setError('Ocurrió un error al cargar la información financiera. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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



  // Formatear la fecha contable
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
    const ctaOrigen = maskAccountNumber(isEnviada ? (mainAccount?.numeroCuenta || '-') : parsed.cuentaAsociada);
    const ctaDestino = maskAccountNumber(isEnviada ? parsed.cuentaAsociada : (mainAccount?.numeroCuenta || '-'));
    
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

    // Cooperative Name and Logo
    drawReceiptHeader(doc, activeTenant, 74, 22);

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

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 animate-pulse p-4 md:p-0 select-none">
        {/* Header Skeleton */}
        <div className="border-b border-slate-100 pb-6 space-y-3">
          <div className="h-8 bg-slate-200 rounded-xl w-64 md:w-96" />
          <div className="h-4 bg-slate-100 rounded-lg w-40" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Left Skeleton */}
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 md:p-8 min-h-[220px] flex flex-col justify-between shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)]">
            <div className="flex items-start justify-between">
              <div className="space-y-2.5 w-1/2">
                <div className="h-3 bg-slate-200 rounded-md w-24" />
                <div className="h-4 bg-slate-100 rounded-md w-32" />
              </div>
              <div className="h-6 bg-slate-100 rounded-full w-16" />
            </div>
            <div className="mt-8 space-y-2">
              <div className="h-3 bg-slate-100 rounded-md w-28" />
              <div className="h-10 bg-slate-200 rounded-xl w-48" />
            </div>
          </div>

          {/* Card Right Skeleton */}
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 md:p-8 min-h-[220px] flex flex-col justify-between shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)]">
            <div className="flex items-start justify-between">
              <div className="space-y-2.5 w-1/2">
                <div className="h-3 bg-slate-200 rounded-md w-28" />
                <div className="h-4 bg-slate-100 rounded-md w-24" />
              </div>
              <div className="h-6 bg-slate-100 rounded-full w-16" />
            </div>
            <div className="mt-8 flex justify-between items-end">
              <div className="space-y-2 w-1/2">
                <div className="h-3 bg-slate-100 rounded-md w-28" />
                <div className="h-8 bg-slate-200 rounded-xl w-32" />
              </div>
              <div className="h-10 bg-slate-100 rounded-xl w-24" />
            </div>
          </div>
        </div>

        {/* Movements Skeleton */}
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50">
            <div className="space-y-2">
              <div className="h-5 bg-slate-200 rounded-lg w-44" />
              <div className="h-3 bg-slate-100 rounded-md w-60" />
            </div>
            <div className="h-10 bg-slate-100 rounded-2xl w-44" />
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-50/50 last:border-0">
                <div className="flex items-center gap-4 w-2/3">
                  <div className="h-4 bg-slate-100 rounded-md w-16 shrink-0" />
                  <div className="h-4 bg-slate-200 rounded-md w-full max-w-[200px] md:max-w-[280px]" />
                </div>
                <div className="flex items-center gap-6 md:gap-12 shrink-0">
                  <div className="h-4 bg-slate-200 rounded-md w-12 text-right" />
                  <div className="h-4 bg-slate-100 rounded-md w-14 text-right" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const mainAccount = accounts.find(acc => acc.tipo === 'AHORRO_VISTA') || accounts[0];
  const activeCredit = credits.find(c => c.estado === 'DESEMBOLSADO');

  // Filtrar cuentas: solo AHORRO_VISTA y APORTACIONES
  const displayAccounts = accounts.filter(
    acc => acc.tipo === 'AHORRO_VISTA' || acc.tipo === 'APORTACIONES'
  );

  // Calcular Saldo Total Disponible (suma de todas las cuentas AHORRO_VISTA activas)
  const saldoTotalDisponible = accounts
    .filter(acc => acc.tipo === 'AHORRO_VISTA' && acc.estado === 'ACTIVA')
    .reduce((sum, acc) => sum + acc.saldo, 0);

  // Calcular Saldo Deudor del crédito activo
  const totalCapitalPagado = activeCreditCuotas.reduce((sum, q) => sum + (q.capitalPagado || 0), 0);
  const saldoDeudor = activeCredit 
    ? Math.max(0, (activeCredit.montoDesembolsado || activeCredit.montoSolicitado || 0) - totalCapitalPagado) 
    : 0;

  const getCreditHealth = (estado: string) => {
    switch (estado) {
      case 'EN_MORA':
        return { label: 'En Mora', className: 'bg-rose-50 text-rose-700 border-rose-100' };
      case 'DESEMBOLSADO':
      default:
        return { label: 'Al Día', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-0">
      
      {/* Header with Full Name and ID (Cédula) */}
      <div className="border-b border-slate-100 pb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">
            Hola, {user.nombresCompletos}
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1 capitalize font-medium">
            {getFormattedDate()}
          </p>
        </div>

        {/* Avatar Circular en Cabecera */}
        <div className="h-14 w-14 rounded-full bg-[#0054A6]/10 text-[#0054A6] flex items-center justify-center overflow-hidden font-bold text-base shrink-0 border-2 border-white shadow-md">
          {avatarUrl ? (
            <img src={getFullAvatarUrl(avatarUrl) || undefined} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            user.nombresCompletos
              ? user.nombresCompletos.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
              : 'US'
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tarjeta de Resumen Ejecutivo: Saldo Total Disponible (Estética Apple/Stripe blanca con sombra suave) */}
      <Card className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Glow decoration sutil */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">
              Saldo Total Disponible
            </span>
            <div className="text-3xl md:text-4xl font-extrabold tracking-tight leading-none text-slate-900 font-mono">
              {formatCurrency(saldoTotalDisponible)}
            </div>
            <p className="text-slate-450 text-[11px] font-medium pt-1">
              Consolidado de tus cuentas de ahorro a la vista activas
            </p>
          </div>
          
          <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 self-start md:self-auto shadow-sm">
            <Wallet className="h-6 w-6" />
          </div>
        </div>
      </Card>

      {/* Barra de Acciones Rápidas */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Button
          onClick={() => navigate('/socio/transferencias')}
          className="flex flex-col md:flex-row items-center justify-center gap-2 h-16 md:h-12 bg-white hover:bg-slate-50 border border-slate-200 text-[#0054A6] font-bold rounded-2xl transition-all shadow-sm hover:shadow-md cursor-pointer text-xs"
        >
          <Send className="h-4 w-4 shrink-0 text-[#0054A6]" />
          <span>Transferir</span>
        </Button>
        
        <Button
          onClick={() => navigate('/socio/inversiones')}
          className="flex flex-col md:flex-row items-center justify-center gap-2 h-16 md:h-12 bg-white hover:bg-slate-50 border border-slate-200 text-emerald-650 font-bold rounded-2xl transition-all shadow-sm hover:shadow-md cursor-pointer text-xs"
        >
          <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Invertir</span>
        </Button>

        <Button
          onClick={() => navigate('/socio/creditos')}
          className="flex flex-col md:flex-row items-center justify-center gap-2 h-16 md:h-12 bg-white hover:bg-slate-50 border border-slate-200 text-amber-650 font-bold rounded-2xl transition-all shadow-sm hover:shadow-md cursor-pointer text-xs"
        >
          <CreditCard className="h-4 w-4 shrink-0 text-amber-500" />
          <span>Pagar Crédito</span>
        </Button>
      </div>

      {/* Financial Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Column 1: Portafolio de Cuentas Financieras */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xs font-black text-slate-455 uppercase tracking-widest block">Mis Cuentas</h2>
            <span className="text-[10px] font-bold text-slate-400">{displayAccounts.length} producto{displayAccounts.length !== 1 ? 's' : ''}</span>
          </div>
          
          <div className="space-y-4">
            {displayAccounts.map((acc) => {
              const borderLeftColor = 
                acc.tipo === 'AHORRO_VISTA' ? 'border-l-[#0054A6]' :
                acc.tipo === 'APORTACIONES' ? 'border-l-amber-500' : 'border-l-slate-350';
              return (
                <Card 
                  key={acc.id} 
                  className={`rounded-2xl border border-slate-100 border-l-4 ${borderLeftColor} bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between min-h-[135px] hover:shadow-md hover:border-slate-200/50 transition-all duration-300 group`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 leading-none mb-1">
                        {acc.tipo === 'AHORRO_VISTA' && <Wallet className="h-3 w-3 text-[#0054A6]/75" />}
                        {acc.tipo === 'APORTACIONES' && <Coins className="h-3 w-3 text-amber-600/75" />}
                        {acc.tipo === 'AHORRO_VISTA' ? 'Ahorro a la Vista' : 
                         acc.tipo === 'APORTACIONES' ? 'Aportaciones' : acc.tipo}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        {/* Enmascaramiento de seguridad: muestra únicamente últimos 4 dígitos */}
                        <span className="text-xs font-bold font-mono" title={acc.numeroCuenta}>
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
                      acc.estado === 'ACTIVA' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {acc.estado}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-between items-end">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Saldo Disponible</span>
                      <span className="text-2xl font-black text-[#0054A6] tracking-tight font-mono">
                        {formatCurrency(acc.saldo)}
                      </span>
                    </div>
                    {acc.tasaInteresAnual > 0 && (
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {acc.tasaInteresAnual}% anual
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Column 2: Crédito Activo Reestructurado (Información Accionable) */}
        <div className="space-y-4">
          <div className="mb-1">
            <h2 className="text-xs font-black text-slate-455 uppercase tracking-widest block">Mis Créditos</h2>
          </div>
          
          {activeCredit ? (
            <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between min-h-[190px] hover:shadow-md hover:border-slate-200/50 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">
                    Préstamo de Consumo
                  </span>
                  <h3 className="text-xs font-bold text-slate-500 font-mono">
                    {activeCredit.numeroCredito}
                  </h3>
                </div>
                {(() => {
                  const health = getCreditHealth(activeCredit.estado);
                  return (
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${health.className}`}>
                      {health.label}
                    </span>
                  );
                })()}
              </div>

              {/* Grid de Información Accionable */}
              <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-50 py-3 my-3 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Próximo Pago</span>
                  <span className="font-extrabold text-slate-800 font-mono block">
                    {nextCuota ? formatCurrency(nextCuota.cuotaTotalProyectada) : '$0.00'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Vencimiento</span>
                  <span className="font-semibold text-slate-700 block">
                    {nextCuota ? formatTxDate(nextCuota.fechaVencimiento).split(',')[0] : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Saldo Deudor</span>
                  <span className="font-extrabold text-[#0054A6] font-mono block">
                    {formatCurrency(saldoDeudor)}
                  </span>
                </div>
              </div>

              {/* Botones de Acción Rápidas */}
              <div className="flex gap-2.5">
                <Button
                  onClick={() => navigate('/socio/creditos')}
                  variant="outline"
                  className="flex-1 border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold rounded-xl h-9 transition-all cursor-pointer text-xs"
                >
                  Ver Detalle
                </Button>
                <Button
                  onClick={() => navigate('/socio/creditos')}
                  className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-9 transition-all cursor-pointer text-xs shadow-sm shadow-blue-500/10"
                >
                  Pagar Cuota
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between min-h-[190px]">
              <div className="flex flex-col items-center justify-center text-center flex-1 py-1">
                <TrendingUp className="h-6 w-6 text-slate-350 mb-1.5" />
                <h3 className="text-xs font-bold text-slate-700">Sin Créditos Activos</h3>
                <p className="text-[10px] text-slate-400 max-w-[240px] mt-0.5 leading-relaxed">
                  ¿Necesitas financiamiento? Simula un crédito y solicita tu préstamo de forma rápida.
                </p>
              </div>
              <Button
                onClick={() => navigate('/socio/creditos')}
                variant="outline"
                className="border border-slate-200 text-[#0054A6] hover:bg-slate-50 font-bold rounded-xl h-9 w-full transition-all cursor-pointer text-xs mt-3"
              >
                Simular Crédito
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Historial de Movimientos Recientes */}
      <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Movimientos Recientes</h2>
            <p className="text-slate-400 text-xs mt-0.5">Últimas 5 transacciones en tu cuenta principal</p>
          </div>
          <Button
            onClick={() => navigate('/socio/movimientos')}
            variant="outline"
            className="border border-slate-200 text-[#0054A6] hover:bg-slate-50 font-bold rounded-2xl h-10 px-4 transition-all cursor-pointer text-xs animate-pulse hover:animate-none"
          >
            Ver todos los movimientos
          </Button>
        </div>

        <div className="overflow-x-auto">
          {transactions.length > 0 ? (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 text-slate-400 font-semibold text-xs bg-slate-50/20">
                  <th className="py-3 px-4 rounded-l-2xl">Fecha</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4">Nombres</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-right rounded-r-2xl">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
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
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-400">
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
                      <td className="py-3.5 px-4 text-sm text-right font-bold text-slate-500">
                        {formatCurrency(tx.saldoResultante)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs font-medium space-y-1">
              <p>No se registran transacciones recientes.</p>
              <p className="text-slate-300">Tus depósitos y retiros aparecerán aquí en tiempo real.</p>
            </div>
          )}
        </div>
      </Card>

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
              <div className="flex items-center justify-center space-x-2">
                {activeTenant?.logoBase64 && (
                  <img src={activeTenant.logoBase64} alt="Logo" className="h-5 w-auto" />
                )}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {activeTenant?.name || 'Cooperativa de Ahorro y Crédito'}
                </span>
              </div>
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
              const ctaOrigen = isEnviada ? (mainAccount?.numeroCuenta || '-') : parsed.cuentaAsociada;
              const ctaDestino = isEnviada ? parsed.cuentaAsociada : (mainAccount?.numeroCuenta || '-');

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
export default Inicio;
