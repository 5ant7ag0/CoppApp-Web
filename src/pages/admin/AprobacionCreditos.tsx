import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Layers, Clock, X, CheckCircle2, 
  AlertTriangle, AlertCircle, Loader2, 
  TrendingUp, Ban, Printer, Building,
  Eye, FileText, LayoutGrid, List,
  SlidersHorizontal, FileDown,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Search, RefreshCcw, User, Hash, DollarSign, CalendarDays, Activity
} from 'lucide-react';
import { SimuladorCredito } from '../../components/SimuladorCredito';

interface Socio {
  id: number;
  identificacion: string;
  nombresCompletos: string;
  direccion: string;
  telefono: string;
  correo: string;
  actividadEconomica: string;
  ingresosMensuales: number;
  gastosMensuales: number;
  deudasActuales: number;
  capacidadPago: number;
  estado?: string;
}

interface Credito {
  id: number;
  socio: Socio;
  numeroCredito: string;
  montoSolicitado: number;
  montoDesembolsado: number;
  plazoMeses: number;
  tasaInteresAnual: number;
  tasaMoraAnual: number;
  productoCredito?: {
    id: number;
    nombre: string;
  };
  tipoAmortizacion: string;
  garantiaDescripcion: string;
  estado: 'SOLICITADO' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'DESEMBOLSADO' | 'CANCELADO' | 'EN_MORA';
  fechaSolicitud: string;
  fechaDesembolso?: string;
  usuarioOficialId?: number;
  motivoRechazo?: string;
}

interface CuotaProyectada {
  num: number;
  fecha: string;
  capital: number;
  interes: number;
  total: number;
  saldo: number;
}

// Formateador de moneda regional estándar ($500.00)
const formatCurrency = (val: number | undefined | null) => {
  const v = val ?? 0;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Formateador de fecha a formato regional (dd/mm/yyyy)
const formatFechaStr = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  try {
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const getEstadoLabel = (estado: string) => {
  switch (estado) {
    case 'SOLICITADO': return 'Pendiente';
    case 'EN_REVISION': return 'En Análisis';
    case 'APROBADO': return 'Aprobado';
    case 'DESEMBOLSADO': return 'Desembolsado';
    case 'RECHAZADO': return 'Rechazado';
    default: return estado;
  }
};

const getEstadoStyles = (estado: string) => {
  switch (estado) {
    case 'SOLICITADO': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'EN_REVISION': return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'APROBADO': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'DESEMBOLSADO': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    case 'RECHAZADO': return 'bg-rose-50 text-rose-700 border-rose-100';
    default: return 'bg-slate-50 text-slate-700 border-slate-100';
  }
};

const getEstadoCardStyles = (estado: string) => {
  switch (estado) {
    case 'SOLICITADO': return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'EN_REVISION': return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'APROBADO': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'DESEMBOLSADO': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    case 'RECHAZADO': return 'bg-rose-50 text-rose-600 border-rose-100';
    default: return 'bg-slate-50 text-slate-650 border-slate-100';
  }
};

// Conversor de Números a Letras en Español para Respaldo Legal
const numeroALetras = (num: number): string => {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const especiales = {
    11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
    16: 'DIECISEIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE',
    21: 'VEINTIUN', 22: 'VEINTIDOS', 23: 'VEINTITRES', 24: 'VEINTICUATRO',
    25: 'VEINTICINCO', 26: 'VEINTISEIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE'
  };
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SIETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const miles = (n: number): string => {
    if (n === 0) return '';
    if (n === 1) return 'MIL';
    return `${convertirTresDigitos(n)} MIL`;
  };

  const convertirTresDigitos = (n: number): string => {
    if (n === 100) return 'CIEN';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    
    let res = centenas[c];
    if (resto > 0) {
      if (res !== '') res += ' ';
      if (resto in especiales) {
        res += (especiales as any)[resto];
      } else {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        if (d > 0) {
          res += decenas[d];
          if (u > 0) res += ` Y ${unidades[u]}`;
        } else {
          res += unidades[u];
        }
      }
    }
    return res;
  };

  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);
  const centavos = `${decimal.toString().padStart(2, '0')}/100`;

  if (entero === 0) return `CERO CON ${centavos}`;

  let texto = '';
  const millon = Math.floor(entero / 1000000);
  const mil = Math.floor((entero % 1000000) / 1000);
  const unidadesResto = entero % 1000;

  if (millon > 0) {
    if (millon === 1) {
      texto += 'UN MILLÓN';
    } else {
      texto += `${convertirTresDigitos(millon)} MILLONES`;
    }
  }

  if (mil > 0) {
    if (texto !== '') texto += ' ';
    texto += miles(mil);
  }

  if (unidadesResto > 0) {
    if (texto !== '') texto += ' ';
    texto += convertirTresDigitos(unidadesResto);
  }

  return `${texto} CON ${centavos} CENTAVOS`;
};

// Simulador determinista de Score Crediticio (Rango 300 a 1000)
const getCreditScore = (socio: Socio | undefined, cuota: number) => {
  if (!socio) return 600;
  const ing = socio.ingresosMensuales ?? (socio as any).ingresos ?? 0;
  const gas = socio.gastosMensuales ?? (socio as any).gastos ?? 0;
  const deu = socio.deudasActuales ?? (socio as any).deudas ?? 0;
  const netFlow = Number(ing) - Number(gas);
  
  let score = 700;
  
  if (netFlow > 0) {
    score += Math.min(150, Math.floor(netFlow / 10));
  } else {
    score -= 150;
  }
  
  if (deu > 0) {
    score -= Math.min(150, Math.floor(deu / 5));
  }
  
  const ratio = netFlow > 0 ? (cuota / netFlow) * 100 : 100;
  if (ratio > 40) {
    score -= 200;
  } else if (netFlow <= 0) {
    score -= 250;
  } else {
    score += 50;
  }
  
  return Math.max(300, Math.min(1000, score));
};

export const AprobacionCreditos: React.FC = () => {
  const { user } = useAuth();
  
  // Estados para solicitud presencial
  const [mostrarPresencialModal, setMostrarPresencialModal] = useState<boolean>(false);
  const [presencialCedula, setPresencialCedula] = useState<string>('');
  const [presencialSocio, setPresencialSocio] = useState<Socio | null>(null);
  const [buscarSocioLoading, setBuscarSocioLoading] = useState<boolean>(false);
  const [buscarSocioError, setBuscarSocioError] = useState<string | null>(null);
  
  const [solicitudes, setSolicitudes] = useState<Credito[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<Credito | null>(null);
  const [tablaAmortizacion, setTablaAmortizacion] = useState<CuotaProyectada[]>([]);
  const [cargandoAmortizacion, setCargandoAmortizacion] = useState<boolean>(false);
  const [verPagareCredito, setVerPagareCredito] = useState<Credito | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'detalles' | 'amortizacion' | 'pagare'>('detalles');
  const [documentosFirmados, setDocumentosFirmados] = useState<Record<number, { name: string; dataUrl?: string }>>(() => {
    try {
      const saved = localStorage.getItem('coop_pagares_firmados');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Respaldo Legal Pagaré
  const [pagareCredito, setPagareCredito] = useState<Credito | null>(null);
  const [pagareCuotas, setPagareCuotas] = useState<CuotaProyectada[]>([]);
  const [cargandoPagareCuotas, setCargandoPagareCuotas] = useState<boolean>(false);
  const [pagareFirmadoFile, setPagareFirmadoFile] = useState<File | null>(null);
  const [pagareFirmadoName, setPagareFirmadoName] = useState<string>('');
  const [pagareFirmadoDataUrl, setPagareFirmadoDataUrl] = useState<string>('');

  // Modals y Resoluciones
  const [mostrarRechazoModal, setMostrarRechazoModal] = useState<boolean>(false);
  const [mostrarAprobacionModal, setMostrarAprobacionModal] = useState<boolean>(false);
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isDisbursing, setIsDisbursing] = useState<boolean>(false);
  const [disburseError, setDisburseError] = useState<string | null>(null);
  
  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Nuevos estados para Escalamiento y Optimización
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [sortField, setSortField] = useState<keyof Credito | 'socio.nombresCompletos'>('fechaSolicitud');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  
  // Filtros Avanzados
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Reset de página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, startDate, endDate, minAmount, maxAmount, selectedOfficer, selectedStatus]);

  // Notas de Crédito / Bitácora
  const [notasCredito, setNotasCredito] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('coop_credito_notas');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleNotaChange = (creditoId: number, nota: string) => {
    const updated = {
      ...notasCredito,
      [creditoId]: nota
    };
    setNotasCredito(updated);
    localStorage.setItem('coop_credito_notas', JSON.stringify(updated));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4500);
  };

  const fetchSolicitudes = async () => {
    setCargando(true);
    try {
      const res = await api.get('/creditos');
      setSolicitudes(res.data || []);
    } catch (err) {
      console.error('Error fetching solicitudes:', err);
      showToast('Error al cargar solicitudes de crédito.', 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchAmortizacion = async (credito: Credito) => {
    setTablaAmortizacion([]);
    setCargandoAmortizacion(true);
    try {
      if (credito.estado === 'DESEMBOLSADO') {
        const res = await api.get(`/creditos/${credito.id}/amortizacion`);
        const cuotas = res.data || [];
        
        let runningBalance = credito.montoSolicitado;
        const mapped = cuotas.map((c: any) => {
          const cap = c.capitalProyectado;
          const int = c.interesProyectado;
          const tot = c.cuotaTotalProyectada || (cap + int);
          runningBalance = Math.max(0, runningBalance - cap);
          return {
            num: c.numeroCuota,
            fecha: c.fechaVencimiento,
            capital: cap,
            interes: int,
            total: tot,
            saldo: runningBalance,
            estado: c.estado || 'PENDIENTE'
          };
        });
        setTablaAmortizacion(mapped);
      } else {
        const res = await api.get('/creditos/simular', {
          params: {
            monto: credito.montoSolicitado,
            plazoMeses: credito.plazoMeses,
            tasaAnual: credito.tasaInteresAnual,
            sistema: credito.tipoAmortizacion
          }
        });
        const cuotas = res.data || [];
        const mapped = cuotas.map((c: any) => ({
          num: c.numeroCuota,
          fecha: c.fechaVencimiento,
          capital: c.capital,
          interes: c.interes,
          total: c.cuotaTotal,
          saldo: c.saldoRemanente,
          estado: 'PENDIENTE'
        }));
        setTablaAmortizacion(mapped);
      }
    } catch (err) {
      console.error('Error al simular/cargar tabla:', err);
    } finally {
      setCargandoAmortizacion(false);
    }
  };

  useEffect(() => {
    if (creditoSeleccionado) {
      fetchAmortizacion(creditoSeleccionado);
    }
  }, [creditoSeleccionado]);

  // Obtener amortización de pagaré (Soporta simulación y definitivo)
  const handleImprimirPagare = async (cred: Credito) => {
    setPagareCredito(cred);
    setPagareCuotas([]);
    setCargandoPagareCuotas(true);
    setPagareFirmadoFile(null);
    setPagareFirmadoName('');
    setDisburseError(null);
    try {
      if (cred.estado === 'DESEMBOLSADO') {
        const res = await api.get(`/creditos/${cred.id}/amortizacion`);
        const cuotas = res.data || [];
        
        let runningBalance = cred.montoSolicitado;
        const mapped = cuotas.map((c: any) => {
          const cap = c.capitalProyectado;
          const int = c.interesProyectado;
          const tot = c.cuotaTotalProyectada || (cap + int);
          runningBalance = Math.max(0, runningBalance - cap);
          return {
            num: c.numeroCuota,
            fecha: c.fechaVencimiento,
            capital: cap,
            interes: int,
            total: tot,
            saldo: runningBalance
          };
        });
        setPagareCuotas(mapped);
      } else {
        // Si está en análisis o solicitado, simular para el pagaré previo
        const res = await api.get('/creditos/simular', {
          params: {
            monto: cred.montoSolicitado,
            plazoMeses: cred.plazoMeses,
            tasaAnual: cred.tasaInteresAnual,
            sistema: cred.tipoAmortizacion
          }
        });
        const cuotas = res.data || [];
        const mapped = cuotas.map((c: any) => ({
          num: c.numeroCuota,
          fecha: c.fechaVencimiento,
          capital: c.capital,
          interes: c.interes,
          total: c.cuotaTotal,
          saldo: c.saldoRemanente
        }));
        setPagareCuotas(mapped);
      }
    } catch (err) {
      console.error('Error al cargar amortización de pagaré:', err);
      showToast('Error al cargar la tabla de amortización del pagaré.', 'error');
    } finally {
      setCargandoPagareCuotas(false);
    }
  };

  // Generación e Impresión del PDF Pagaré (Pág 1: Pagaré, Pág 2+: Tabla Amortización)
  const descargarPagarePdf = (cred: Credito, cuotas: CuotaProyectada[], oficialName: string) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const marginX = 20;
    let currentY = 20;

    // PAGINA 1: Membrete Institucional
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("COOPERATIVA DE AHORRO Y CRÉDITO ITQ", 105, currentY, { align: "center" });
    
    currentY += 5;
    doc.setFontSize(10);
    doc.text("RUC: 1791234567001", 105, currentY, { align: "center" });
    
    currentY += 5;
    doc.setFont("times", "normal");
    doc.text("Dirección Matriz: Av. Antonio de Ulloa N28-30, Quito, Ecuador", 105, currentY, { align: "center" });
    
    currentY += 12;

    // Título del Pagaré
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.text("PAGARÉ A LA ORDEN", 105, currentY, { align: "center" });
    
    currentY += 8;
    doc.setFontSize(11);
    doc.text(`Por USD: ${formatCurrency(cred.montoSolicitado)}`, 105, currentY, { align: "center" });

    currentY += 6;
    const fechaStr = new Date(cred.fechaSolicitud).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.text(`Fecha de Emisión: ${fechaStr}`, 105, currentY, { align: "center" });

    currentY += 12;
    
    // Cuerpo Legal
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    
    const textoLegal = `Debo y pagaré incondicionalmente a la orden de la COOPERATIVA DE AHORRO Y CRÉDITO ITQ, en esta ciudad o en el lugar que se me requiera, la cantidad de ${formatCurrency(cred.montoSolicitado)} (${numeroALetras(cred.montoSolicitado)}) dólares de los Estados Unidos de América, reconociendo una tasa de interés del ${cred.tasaInteresAnual}% anual. En caso de mora, me sujeto a la tasa de interés máxima de mora permitida por la Junta de Política y Regulación Financiera del Ecuador. Renuncio expresamente a fuero y domicilio, y me someto a los jueces competentes de esta jurisdicción y al trámite ejecutivo o coactivo a elección del acreedor.`;

    const splitText = doc.splitTextToSize(textoLegal, 170);
    doc.text(splitText, marginX, currentY, { align: "justify" });
    
    // Firmas al pie de la Página 1
    const sigY = 210;
    doc.setFont("times", "bold");
    doc.setFontSize(9);

    const sigWidth = 45;

    // Deudor Principal
    doc.line(marginX, sigY, marginX + sigWidth, sigY);
    doc.text("DEUDOR PRINCIPAL", marginX + sigWidth/2, sigY + 4, { align: "center" });
    doc.setFont("times", "normal");
    doc.text(cred.socio?.nombresCompletos?.toUpperCase() || "", marginX + sigWidth/2, sigY + 8, { align: "center" });
    doc.text(`C.I.: ${cred.socio?.identificacion || ""}`, marginX + sigWidth/2, sigY + 12, { align: "center" });

    // Garante
    doc.setFont("times", "bold");
    doc.line(105 - sigWidth/2, sigY, 105 + sigWidth/2, sigY);
    doc.text("CÓNYUGE / GARANTE", 105, sigY + 4, { align: "center" });
    doc.setFont("times", "normal");
    doc.text("FIRMA DEL GARANTE", 105, sigY + 8, { align: "center" });
    doc.text("C.I.: _________________", 105, sigY + 12, { align: "center" });

    // Oficial de Crédito
    doc.setFont("times", "bold");
    doc.line(190 - sigWidth, sigY, 190, sigY);
    doc.text("OFICIAL DE CRÉDITO", 190 - sigWidth/2, sigY + 4, { align: "center" });
    doc.setFont("times", "normal");
    doc.text(oficialName.toUpperCase(), 190 - sigWidth/2, sigY + 8, { align: "center" });
    doc.text("COOP. DE AHORRO Y CRÉDITO ITQ", 190 - sigWidth/2, sigY + 12, { align: "center" });

    // PAGINA 2: Salto de Página Obligatorio para la Tabla de Amortización
    doc.addPage();
    currentY = 20;

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("COOPERATIVA DE AHORRO Y CRÉDITO ITQ", 105, currentY, { align: "center" });
    
    currentY += 6;
    doc.setFontSize(10);
    doc.text("ANEXO I: TABLA DE AMORTIZACIÓN", 105, currentY, { align: "center" });
    
    currentY += 5;
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text(`Crédito Nro: ${cred.numeroCredito}  |  Socio: ${cred.socio?.nombresCompletos}`, 105, currentY, { align: "center" });

    currentY += 12;

    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [
        ['Cuota', 'Vencimiento', 'Capital', 'Interés', 'Cuota Total', 'Saldo Restante']
      ],
      body: cuotas.map(cuo => [
        cuo.num.toString(),
        cuo.fecha,
        formatCurrency(cuo.capital),
        formatCurrency(cuo.interes),
        formatCurrency(cuo.total),
        formatCurrency(cuo.saldo)
      ]),
      theme: 'grid',
      styles: {
        font: 'courier',
        fontSize: 8.5,
        cellPadding: 1.5,
      },
      headStyles: {
        fillColor: [245, 247, 250],
        textColor: [30, 41, 59],
        font: 'times',
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [180, 180, 180]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 35 }
      }
    });

    doc.save(`Pagare_${cred.numeroCredito}.pdf`);
  };

  // Genera Exclusivamente la Tabla de Amortización con Membrete (Créditos ya Aprobados/Desembolsados)
  const descargarTablaAmortizacionPdf = (cred: Credito, cuotas: CuotaProyectada[]) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let currentY = 20;

    // Membrete Institucional
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("COOPERATIVA DE AHORRO Y CRÉDITO ITQ", 105, currentY, { align: "center" });
    
    currentY += 5;
    doc.setFontSize(10);
    doc.text("RUC: 1791234567001", 105, currentY, { align: "center" });
    
    currentY += 5;
    doc.setFont("times", "normal");
    doc.text("Dirección Matriz: Av. Antonio de Ulloa N28-30, Quito, Ecuador", 105, currentY, { align: "center" });
    
    currentY += 12;

    // Título de la tabla
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("TABLA DE AMORTIZACIÓN", 105, currentY, { align: "center" });
    
    currentY += 5;
    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.text(`Crédito Nro: ${cred.numeroCredito}  |  Socio: ${cred.socio?.nombresCompletos}`, 105, currentY, { align: "center" });

    currentY += 10;

    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [
        ['Cuota', 'Vencimiento', 'Capital', 'Interés', 'Cuota Total', 'Saldo Restante']
      ],
      body: cuotas.map(cuo => [
        cuo.num.toString(),
        cuo.fecha,
        formatCurrency(cuo.capital),
        formatCurrency(cuo.interes),
        formatCurrency(cuo.total),
        formatCurrency(cuo.saldo)
      ]),
      theme: 'grid',
      styles: {
        font: 'courier',
        fontSize: 8.5,
        cellPadding: 1.5,
      },
      headStyles: {
        fillColor: [245, 247, 250],
        textColor: [30, 41, 59],
        font: 'times',
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [180, 180, 180]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 35 }
      }
    });

    doc.save(`TablaAmortizacion_${cred.numeroCredito}.pdf`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setPagareFirmadoFile(file);
      setPagareFirmadoName(file.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPagareFirmadoDataUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Manejar click en tarjeta
  const handleSelectCardClick = async (credito: Credito) => {
    setCreditoSeleccionado(credito);
    setActiveModalTab('detalles');
    setDisburseError(null);
    
    if (credito.estado === 'SOLICITADO') {
      try {
        const res = await api.put(`/creditos/${credito.id}/revisar`);
        setCreditoSeleccionado(res.data);
        fetchSolicitudes();
      } catch (err) {
        console.error('Error al marcar crédito en revisión:', err);
      }
    }
  };

  // Rechazar Solicitud
  const handleRechazarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditoSeleccionado) return;
    if (!motivoRechazo.trim()) {
      showToast('Por favor, ingrese el motivo de rechazo.', 'error');
      return;
    }

    try {
      await api.put(`/creditos/${creditoSeleccionado.id}/rechazar`, {
        motivo: motivoRechazo.trim()
      });
      showToast('Solicitud rechazada correctamente.', 'success');
      setMostrarRechazoModal(false);
      setMotivoRechazo('');
      setCreditoSeleccionado(null);
      fetchSolicitudes();
    } catch (err: any) {
      console.error('Error al rechazar crédito:', err);
      showToast(err.response?.data || 'Error al procesar el rechazo.', 'error');
    }
  };

  // Secuencia de Aprobación y Desembolso blindada (Compliance Legal)
  const triggerAprobarCreditoConfirm = () => {
    const targetCredito = pagareCredito || creditoSeleccionado;
    if (!targetCredito) return;
    setMostrarAprobacionModal(true);
  };

  const handleAprobarCreditoConfirmado = async () => {
    const targetCredito = pagareCredito || creditoSeleccionado;
    if (!targetCredito) return;

    setMostrarAprobacionModal(false);
    setIsApproving(true);
    try {
      await api.put(`/creditos/${targetCredito.id}/aprobar`);
      
      showToast('Solicitud de crédito aprobada con éxito.', 'success');
      
      const aprobadoCredito = { ...targetCredito, estado: 'APROBADO' as const };
      
      // Actualizar el estado local para reflejar que ahora está APROBADO
      if (pagareCredito && pagareCredito.id === targetCredito.id) {
        setPagareCredito(aprobadoCredito);
      }
      if (creditoSeleccionado && creditoSeleccionado.id === targetCredito.id) {
        setCreditoSeleccionado(aprobadoCredito);
      }
      
      fetchSolicitudes();

      // Iniciar de forma automática el flujo del pagaré
      handleImprimirPagare(aprobadoCredito);
    } catch (err: any) {
      console.error('Error al aprobar el crédito:', err);
      showToast(err.response?.data || 'Error al aprobar el crédito.', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDesembolsarCredito = async () => {
    const targetCredito = pagareCredito || creditoSeleccionado;
    if (!targetCredito) return;
    
    setIsDisbursing(true);
    setDisburseError(null);
    
    try {
      // Paso 1: Consultar cuentas del socio para encontrar la cuenta de ahorros activa
      const resCuentas = await api.get(`/cuentas/socio/${targetCredito.socio.id}`);
      const cuentas = resCuentas.data || [];
      const cuentaAhorro = cuentas.find((c: any) => c.tipo === 'AHORRO_VISTA');
      
      if (!cuentaAhorro) {
        throw new Error('EL_SOCIO_NO_POSEE_CUENTA_AHORRO_ACTIVA');
      }
      
      // Paso 2: Ejecutar el desembolso transaccional
      await api.post('/creditos/desembolsar', {
        creditoId: targetCredito.id,
        cuentaAhorrosId: cuentaAhorro.id,
        referenciaDocumental: pagareFirmadoName || 'pagare_firmado.pdf'
      });
      
      showToast('Crédito desembolsado con éxito.', 'success');
      
      // Guardar referencia del documento firmado
      const updatedDocs = {
        ...documentosFirmados,
        [targetCredito.id]: {
          name: pagareFirmadoName || `pagare_firmado_${targetCredito.numeroCredito}.pdf`,
          dataUrl: pagareFirmadoDataUrl || ''
        }
      };
      setDocumentosFirmados(updatedDocs);
      localStorage.setItem('coop_pagares_firmados', JSON.stringify(updatedDocs));

      setPagareCredito(null); // Cerrar pagare modal
      setCreditoSeleccionado(null); // Cerrar detail modal
      setPagareFirmadoFile(null);
      setPagareFirmadoName('');
      fetchSolicitudes();
      
    } catch (err: any) {
      console.error('Error crítico en desembolso:', err);
      if (err.message === 'EL_SOCIO_NO_POSEE_CUENTA_AHORRO_ACTIVA') {
        setDisburseError(
          'El desembolso falló porque el socio no posee una cuenta de ahorros activa para recibir los fondos.'
        );
      } else {
        setDisburseError(
          err.response?.data || err.message || 'Error al ejecutar el desembolso.'
        );
      }
      showToast('Error al ejecutar el desembolso.', 'error');
    } finally {
      setIsDisbursing(false);
    }
  };

  // Helper para tiempo transcurrido
  const getElapsedTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return 'Reciente';
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hr`;
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  };

  // Obtener lista única de IDs de oficiales de crédito para el dropdown
  const oficialesDisponibles = Array.from(
    new Set(
      solicitudes
        .map(s => s.usuarioOficialId)
        .filter((id): id is number => id !== undefined && id !== null)
    )
  );

  // Cálculos de KPIs de la Cinta de Métricas
  const getKpis = () => {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const pendientesCount = solicitudes.filter(s => s.estado === 'SOLICITADO').length;
    
    const volumenAnalisis = solicitudes
      .filter(s => s.estado === 'EN_REVISION')
      .reduce((sum, s) => sum + (s.montoSolicitado || 0), 0);
      
    const desembolsosMes = solicitudes
      .filter(s => {
        if (s.estado !== 'DESEMBOLSADO') return false;
        const fechaStr = s.fechaDesembolso || s.fechaSolicitud;
        if (!fechaStr) return false;
        const d = new Date(fechaStr);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
      })
      .reduce((sum, s) => sum + (s.montoDesembolsado || s.montoSolicitado || 0), 0);

    return { pendientesCount, volumenAnalisis, desembolsosMes };
  };

  // Filtrado y ordenamiento de solicitudes
  const getFilteredAndSortedSolicitudes = () => {
    let result = [...solicitudes];

    // 1. Búsqueda principal (Socio, Cédula, Nro Crédito)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        (s.socio?.nombresCompletos || '').toLowerCase().includes(q) ||
        (s.socio?.identificacion || '').includes(q) ||
        (s.numeroCredito || '').toLowerCase().includes(q)
      );
    }

    // 2. Filtro de Oficial
    if (selectedOfficer !== 'all') {
      const officerId = Number(selectedOfficer);
      result = result.filter(s => s.usuarioOficialId === officerId);
    }

    // 3. Filtro de Montos
    if (minAmount) {
      result = result.filter(s => s.montoSolicitado >= Number(minAmount));
    }
    if (maxAmount) {
      result = result.filter(s => s.montoSolicitado <= Number(maxAmount));
    }

    // 4. Filtro de Fecha
    if (dateFilter !== 'all') {
      const ahora = new Date();
      ahora.setHours(0, 0, 0, 0);

      result = result.filter(s => {
        const fechaStr = s.fechaSolicitud;
        if (!fechaStr) return false;
        const d = new Date(fechaStr);
        d.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          return d.getFullYear() === ahora.getFullYear() &&
                 d.getMonth() === ahora.getMonth() &&
                 d.getDate() === ahora.getDate();
        }
        if (dateFilter === 'week') {
          // Esta semana (últimos 7 días)
          const haceUnaSemana = new Date(ahora);
          haceUnaSemana.setDate(ahora.getDate() - 7);
          return d >= haceUnaSemana && d <= ahora;
        }
        if (dateFilter === 'month') {
          // Este mes
          return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
        }
        if (dateFilter === 'year') {
          // Este año
          return d.getFullYear() === ahora.getFullYear();
        }
        if (dateFilter === 'custom') {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (d < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
          }
          return true;
        }
        return true;
      });
    }

    // 5. Filtro por Estado
    if (selectedStatus !== 'all') {
      result = result.filter(s => s.estado === selectedStatus);
    }

    // Ordenamiento
    result.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'socio.nombresCompletos') {
        valA = a.socio?.nombresCompletos || '';
        valB = b.socio?.nombresCompletos || '';
      } else {
        valA = a[sortField as keyof Credito];
        valB = b[sortField as keyof Credito];
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortDirection === 'asc'
        ? (valA > valB ? 1 : -1)
        : (valB > valA ? 1 : -1);
    });

    return result;
  };

  const filteredSolicitudes = getFilteredAndSortedSolicitudes();

  // Exportar a CSV
  const handleExportCSV = () => {
    const headers = [
      'Socio Nombres',
      'Identificacion',
      'Numero Credito',
      'Monto Solicitado',
      'Plazo Meses',
      'Fecha Solicitud',
      'Estado'
    ];

    const rows = filteredSolicitudes.map(s => [
      `"${s.socio?.nombresCompletos || ''}"`,
      s.socio?.identificacion || '',
      s.numeroCredito || '',
      s.montoSolicitado || 0,
      s.plazoMeses || 0,
      s.fechaSolicitud || '',
      s.estado || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_creditos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Verificar si hay algún filtro activo
  const isFilterActive = 
    searchQuery.trim() !== '' || 
    dateFilter !== 'all' || 
    startDate !== '' || 
    endDate !== '' || 
    minAmount !== '' || 
    maxAmount !== '' || 
    selectedOfficer !== 'all' ||
    selectedStatus !== 'all';

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSelectedOfficer('all');
    setSelectedStatus('all');
  };

  // Clasificación de Columnas Kanban (usando data filtrada)
  const colPendientes = filteredSolicitudes.filter(s => s.estado === 'SOLICITADO');
  const colAnalisis = filteredSolicitudes.filter(s => s.estado === 'EN_REVISION');
  const colAprobados = filteredSolicitudes.filter(s => s.estado === 'APROBADO');
  const colDesembolsados = filteredSolicitudes.filter(s => s.estado === 'DESEMBOLSADO');

  // Límite de Kanban a 30 tarjetas
  const colAprobadosSliced = colAprobados.slice(0, 30);
  const colDesembolsadosSliced = colDesembolsados.slice(0, 30);

  // Cálculos de riesgo con verificaciones nulas y fallbacks lógicos
  const ingresos = creditoSeleccionado?.socio?.ingresosMensuales ?? (creditoSeleccionado?.socio as any)?.ingresos ?? 0;
  const gastos = creditoSeleccionado?.socio?.gastosMensuales ?? (creditoSeleccionado?.socio as any)?.gastos ?? 0;
  const deudas = creditoSeleccionado?.socio?.deudasActuales ?? (creditoSeleccionado?.socio as any)?.deudas ?? 0;

  const flujoNeto = Number(ingresos) - Number(gastos);
  const cuotaProyectada = tablaAmortizacion.length > 0 ? (tablaAmortizacion[0]?.total ?? 0) : 0;
  
  const porcentajeCapacidad = flujoNeto > 0 ? (cuotaProyectada / flujoNeto) * 100 : 100;
  const superaCapacidad = flujoNeto <= 0 || porcentajeCapacidad > 40;

  const handleSort = (field: keyof Credito | 'socio.nombresCompletos') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field: keyof Credito | 'socio.nombresCompletos') => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="inline-block h-3.5 w-3.5 ml-1 text-slate-500" />
    ) : (
      <ChevronDown className="inline-block h-3.5 w-3.5 ml-1 text-slate-500" />
    );
  };

  const { pendientesCount, volumenAnalisis, desembolsosMes } = getKpis();

  const handleBuscarSocio = async () => {
    if (!presencialCedula.trim()) {
      setBuscarSocioError('Por favor, ingrese una identificación.');
      return;
    }
    setBuscarSocioLoading(true);
    setBuscarSocioError(null);
    setPresencialSocio(null);
    try {
      const res = await api.get(`/socios/buscar?identificacion=${presencialCedula.trim()}`);
      const socio = res.data;
      if (!socio) {
        setBuscarSocioError('Error: Socio no encontrado en el sistema.');
      } else if (socio.estado !== 'ACTIVO') {
        setBuscarSocioError('Error: El socio existe pero no se encuentra en estado ACTIVO.');
      } else {
        setPresencialSocio(socio);
      }
    } catch (err: any) {
      console.error('Error buscando socio:', err);
      setBuscarSocioError(err.response?.data?.message || err.response?.data || 'Error al buscar el socio. Verifique que exista.');
    } finally {
      setBuscarSocioLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in select-none">
      
      {/* Encabezado del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 no-print">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Layers className="h-5.5 w-5.5 text-[#0054A6]" />
            Mesa de Aprobación de Créditos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evalúa el flujo neto del socio, simula la tabla de amortización y desembolsa de forma segura.
          </p>
        </div>
        <Button
          onClick={() => {
            setPresencialCedula('');
            setPresencialSocio(null);
            setBuscarSocioError(null);
            setMostrarPresencialModal(true);
          }}
          className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-10 px-5 text-xs cursor-pointer shadow-sm transition-all duration-300 flex items-center gap-2"
        >
          Nueva Solicitud Presencial
        </Button>
      </div>

      {/* Cinta de Métricas Ejecutivas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 no-print">
        {/* Solicitudes Pendientes */}
        <Card className="rounded-3xl border border-slate-100 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] bg-white flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Solicitudes Pendientes
            </span>
            <span className="text-2xl font-black text-slate-800 block">
              {pendientesCount}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100/50 flex items-center justify-center text-amber-500">
            <Clock className="h-6 w-6" />
          </div>
        </Card>

        {/* Volumen en Análisis */}
        <Card className="rounded-3xl border border-slate-100 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] bg-white flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Volumen en Análisis
            </span>
            <span className="text-2xl font-black text-slate-800 block">
              {formatCurrency(volumenAnalisis)}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100/50 flex items-center justify-center text-blue-500">
            <Layers className="h-6 w-6" />
          </div>
        </Card>

        {/* Desembolsos del Mes */}
        <Card className="rounded-3xl border border-slate-100 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] bg-white flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Desembolsos del Mes
            </span>
            <span className="text-2xl font-black text-slate-800 block">
              {formatCurrency(desembolsosMes)}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Controles de Búsqueda, Vista y Filtros */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.01)] space-y-3 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Buscador Principal y Filtro de Estado */}
          <div className="flex flex-1 gap-2.5 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar socio, cédula o número de crédito..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]"
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450">
                <Search className="h-4 w-4" />
              </div>
            </div>

            {/* Filtro por Estado */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-40 border border-slate-200 text-slate-650 font-bold rounded-2xl text-xs h-9.5 pl-3.5 pr-8 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
            >
              <option value="all">Todos los estados</option>
              <option value="SOLICITADO">Pendientes</option>
              <option value="EN_REVISION">En Análisis</option>
              <option value="APROBADO">Aprobados</option>
              <option value="DESEMBOLSADO">Desembolsados</option>
              <option value="RECHAZADO">Rechazados</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Botón X Limpiar */}
            {isFilterActive && (
              <Button
                onClick={handleClearFilters}
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold rounded-2xl text-xs h-9.5 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-sm animate-fade-in"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </Button>
            )}

            {/* Botón Filtros Avanzados */}
            <Button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              variant="outline"
              className={`w-40 border-slate-200 text-slate-650 font-bold rounded-2xl text-xs h-9.5 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all ${
                showAdvancedFilters ? 'bg-slate-100 border-slate-300' : 'hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros Avanzados
            </Button>

            {/* Exportar CSV (Sólo en Vista Lista) */}
            {viewMode === 'list' && (
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="border-emerald-250 text-emerald-700 hover:bg-emerald-50 font-bold rounded-2xl text-xs h-9.5 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileDown className="h-3.5 w-3.5" />
                Exportar CSV
              </Button>
            )}

            {/* Toggle de Vista (Tablero / Lista) */}
            <div className="flex bg-[#F1F3F6] p-1 border border-slate-100/50 rounded-full gap-1 shadow-sm">
              <button
                onClick={() => setViewMode('kanban')}
                className="relative w-32 h-8.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-805"
              >
                {viewMode === 'kanban' && (
                  <motion.div
                    layoutId="activeViewMode"
                    className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                  viewMode === 'kanban' ? 'text-white' : 'text-slate-500'
                }`}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Tablero
                </span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="relative w-32 h-8.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-805"
              >
                {viewMode === 'list' && (
                  <motion.div
                    layoutId="activeViewMode"
                    className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                  viewMode === 'list' ? 'text-white' : 'text-slate-500'
                }`}>
                  <List className="h-3.5 w-3.5" />
                  Lista
                </span>
              </button>
            </div>

            {/* Botón Circular Minimalista de Actualizar (Refresh) */}
            <Button
              onClick={fetchSolicitudes}
              variant="outline"
              disabled={cargando}
              className="h-9.5 w-9.5 rounded-full border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-[#0054A6] hover:border-blue-200 flex items-center justify-center p-0 cursor-pointer shadow-sm shrink-0 transition-all"
              title="Actualizar Tablero"
            >
              <RefreshCcw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Panel de Filtros Avanzados (Colapsable) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 animate-slide-down">
             {/* Filtro de Fecha */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Filtro de Fecha
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full border border-slate-200 text-slate-655 font-bold rounded-xl text-xs h-9.5 pl-3.5 pr-8 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
              >
                <option value="all">Todas las fechas</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
                <option value="year">Este año</option>
                <option value="custom">Rango personalizado</option>
              </select>
            </div>

            {/* Oficial Asignado */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Oficial Asignado
              </label>
              <select
                value={selectedOfficer}
                onChange={(e) => setSelectedOfficer(e.target.value)}
                className="w-full border border-slate-200 text-slate-655 font-bold rounded-xl text-xs h-9.5 pl-3.5 pr-8 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
              >
                <option value="all">Todos los oficiales</option>
                {oficialesDisponibles.map(id => (
                  <option key={id} value={id}>Oficial #{id}</option>
                ))}
              </select>
            </div>

            {/* Monto Mínimo */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Monto Mínimo (USD)
              </label>
              <input
                type="number"
                placeholder="Mínimo"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full border border-slate-200 text-slate-655 font-bold rounded-xl text-xs h-9.5 pl-3.5 pr-3 bg-white cursor-text shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
              />
            </div>

            {/* Monto Máximo */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Monto Máximo (USD)
              </label>
              <input
                type="number"
                placeholder="Máximo"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full border border-slate-200 text-slate-655 font-bold rounded-xl text-xs h-9.5 pl-3.5 pr-3 bg-white cursor-text shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
              />
            </div>

            {/* Rango de Fechas Personalizado */}
            {dateFilter === 'custom' && (
              <div className="sm:col-span-2 md:col-span-4 grid grid-cols-2 gap-4 animate-fade-in pt-1">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 text-xs font-semibold text-slate-700 bg-slate-50/30 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 text-xs font-semibold text-slate-700 bg-slate-50/30 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tablero Kanban con Fondos Ultra Tenues estilo Apple Light */}
      {cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 min-h-[500px] no-print">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-50/40 rounded-[2rem] border border-slate-100 p-4 animate-pulse space-y-4">
              <div className="h-4 w-24 bg-slate-200 rounded-lg" />
              <div className="h-36 bg-white rounded-2xl border border-slate-100" />
              <div className="h-36 bg-white rounded-2xl border border-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start no-print">
              
              {/* Columna: PENDIENTES */}
              <div className="bg-slate-50/40 rounded-[2rem] border border-slate-100/75 p-4 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Pendientes ({colPendientes.length})
                  </span>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {colPendientes.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-100/50">
                      Sin solicitudes pendientes
                    </div>
                  ) : (
                    colPendientes.map(cred => (
                      <CardSolicitud key={cred.id} cred={cred} onClick={() => handleSelectCardClick(cred)} getElapsedTime={getElapsedTime} />
                    ))
                  )}
                </div>
              </div>

              {/* Columna: EN ANÁLISIS */}
              <div className="bg-slate-50/40 rounded-[2rem] border border-slate-100/75 p-4 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    En Análisis ({colAnalisis.length})
                  </span>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {colAnalisis.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-100/50">
                      Ningún crédito en análisis
                    </div>
                  ) : (
                    colAnalisis.map(cred => (
                      <CardSolicitud key={cred.id} cred={cred} onClick={() => handleSelectCardClick(cred)} getElapsedTime={getElapsedTime} />
                    ))
                  )}
                </div>
              </div>

              {/* Columna: APROBADOS */}
              <div className="bg-slate-50/40 rounded-[2rem] border border-slate-100/75 p-4 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Aprobados ({colAprobados.length})
                  </span>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {colAprobados.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-100/50">
                      Ningún crédito aprobado
                    </div>
                  ) : (
                    <>
                      {colAprobadosSliced.map(cred => (
                        <CardSolicitud key={cred.id} cred={cred} onClick={() => handleSelectCardClick(cred)} getElapsedTime={getElapsedTime} />
                      ))}
                      {colAprobados.length > 30 && (
                        <div className="p-3 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-center">
                          <p className="text-[10px] font-semibold text-amber-700 leading-relaxed">
                            ⚠️ Mostrando las primeras 30 tarjetas. Use la <strong>"Vista Lista"</strong> para consultar el histórico completo.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Columna: DESEMBOLSADOS */}
              <div className="bg-slate-50/40 rounded-[2rem] border border-slate-100/75 p-4 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    Desembolsados ({colDesembolsados.length})
                  </span>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {colDesembolsados.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-100/50">
                      Ningún crédito desembolsado
                    </div>
                  ) : (
                    <>
                      {colDesembolsadosSliced.map(cred => (
                        <CardSolicitud key={cred.id} cred={cred} onClick={() => handleSelectCardClick(cred)} getElapsedTime={getElapsedTime} />
                      ))}
                      {colDesembolsados.length > 30 && (
                        <div className="p-3 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-center">
                          <p className="text-[10px] font-semibold text-amber-700 leading-relaxed">
                            ⚠️ Mostrando las primeras 30 tarjetas. Use la <strong>"Vista Lista"</strong> para consultar el histórico completo.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.01)] no-print">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider select-none">
                      <th 
                        onClick={() => handleSort('socio.nombresCompletos')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors border-b border-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Socio {renderSortIcon('socio.nombresCompletos')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('numeroCredito')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors border-b border-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          Nro. Crédito {renderSortIcon('numeroCredito')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('montoSolicitado')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors border-b border-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          Monto {renderSortIcon('montoSolicitado')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('plazoMeses')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors border-b border-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Plazo {renderSortIcon('plazoMeses')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('fechaSolicitud')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors border-b border-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          Fecha Solicitud {renderSortIcon('fechaSolicitud')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('estado')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors border-b border-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-slate-400" />
                          Estado {renderSortIcon('estado')}
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right border-b border-slate-100">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                    {filteredSolicitudes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 bg-white">
                          No se encontraron registros coincidentes
                        </td>
                      </tr>
                    ) : (
                      filteredSolicitudes
                        .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                        .map(s => (
                          <tr key={s.id} className="hover:bg-slate-550/5 hover:bg-slate-50/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-800 uppercase">
                              {s.socio?.nombresCompletos}
                            </td>
                            <td className="py-3.5 px-4 font-mono">{s.numeroCredito}</td>
                            <td className="py-3.5 px-4 font-mono text-[#0054A6]">
                              {formatCurrency(s.montoSolicitado)}
                            </td>
                            <td className="py-3.5 px-4">{s.plazoMeses} meses</td>
                            <td className="py-3.5 px-4">{formatFechaStr(s.fechaSolicitud)}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${getEstadoStyles(s.estado)}`}>
                                {getEstadoLabel(s.estado)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                onClick={() => handleSelectCardClick(s)}
                                variant="outline"
                                className="border-slate-200 text-slate-650 hover:bg-slate-50 font-bold rounded-xl text-[10px] h-8 px-2.5 cursor-pointer shadow-sm flex items-center gap-1 ml-auto"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Evaluar
                              </Button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 select-none bg-slate-50/30">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  Mostrar
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="p-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                  >
                    <option value={10}>10 registros</option>
                    <option value={20}>20 registros</option>
                    <option value={50}>50 registros</option>
                  </select>
                  de {filteredSolicitudes.length} encontrados
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-550 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-600">
                    Página {currentPage} de {Math.ceil(filteredSolicitudes.length / pageSize) || 1}
                  </span>
                  <button
                    disabled={currentPage === (Math.ceil(filteredSolicitudes.length / pageSize) || 1)}
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredSolicitudes.length / pageSize) || 1, prev + 1))}
                    className="p-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-550 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Centrado y Flotante Premium (Aesthetic Apple Light) */}
      {creditoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in select-none no-print">
          
          {/* Contenedor del Modal Redondeado con altura estática para evitar saltos */}
          <div className="w-full max-w-4xl bg-white shadow-2xl border border-slate-100 rounded-[2rem] p-5 md:p-6 md:pt-10 pb-6 flex flex-col h-[92vh] max-h-[850px] relative animate-scale-up overflow-hidden">
            
            {/* Estado centrado en el filo superior del modal */}
            <div className="absolute top-0 left-0 right-0 flex justify-center no-print">
              {creditoSeleccionado.estado === 'DESEMBOLSADO' ? (
                <div className="mt-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] bg-white/80 px-4 py-1 rounded-full backdrop-blur-sm border border-slate-100 shadow-sm">
                  {getEstadoLabel(creditoSeleccionado.estado)}
                </div>
              ) : (
                <div className={`px-4 py-1.5 rounded-b-xl border-x border-b text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${getEstadoStyles(creditoSeleccionado.estado)}`}>
                  {getEstadoLabel(creditoSeleccionado.estado)}
                </div>
              )}
            </div>

            {/* Header del Modal */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-0 border-b border-slate-100 mb-4 shrink-0 mt-2">
              
              {/* Contenedor Izquierdo: Título y Pestañas */}
              <div className="flex flex-col gap-4 w-full md:w-auto">
                <div className="flex items-center justify-between w-full md:w-auto md:justify-start">
                  <h3 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
                    Ficha de Evaluación: <span className="font-mono text-[#0054A6] font-bold">{creditoSeleccionado.numeroCredito}</span>
                  </h3>
                  {/* Botón Cerrar (Solo visible en móviles) */}
                  <button
                    onClick={() => {
                      if (!isDisbursing) setCreditoSeleccionado(null);
                    }}
                    disabled={isDisbursing}
                    className="md:hidden p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer disabled:opacity-50 border border-slate-200/60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Selector de Pestañas (Pill-shaped) */}
                <div className="flex items-center gap-1 bg-[#F1F3F6] p-1 rounded-full border border-slate-100/50 w-fit">
                  <button
                    onClick={() => setActiveModalTab('detalles')}
                    className="relative px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-slate-805"
                  >
                    {activeModalTab === 'detalles' && (
                      <motion.div
                        layoutId="activeTabCredito"
                        className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                      activeModalTab === 'detalles' ? 'text-white' : 'text-slate-500'
                    }`}>
                      <FileText className="h-3.5 w-3.5" />
                      Detalles
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveModalTab('amortizacion')}
                    className="relative px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-slate-805"
                  >
                    {activeModalTab === 'amortizacion' && (
                      <motion.div
                        layoutId="activeTabCredito"
                        className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                      activeModalTab === 'amortizacion' ? 'text-white' : 'text-slate-500'
                    }`}>
                      <List className="h-3.5 w-3.5" />
                      Tabla de Amortización
                    </span>
                  </button>
                </div>
              </div>

              {/* Contenedor Derecho: Action Buttons y Cerrar */}
              <div className="flex items-center gap-3 md:self-end self-start w-full md:w-auto pb-3">
                <button
                  onClick={() => descargarTablaAmortizacionPdf(creditoSeleccionado, tablaAmortizacion)}
                  disabled={cargandoAmortizacion}
                  className="px-4 py-2 rounded-xl bg-slate-50 text-slate-600 hover:text-[#0054A6] hover:bg-[#0054A6]/10 transition-all font-bold text-xs flex items-center gap-2 disabled:opacity-50 border border-slate-200/60 shadow-sm cursor-pointer flex-1 md:flex-none justify-center"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
                {creditoSeleccionado.estado === 'DESEMBOLSADO' && (
                  <button
                    onClick={() => setVerPagareCredito(creditoSeleccionado)}
                    disabled={cargandoAmortizacion}
                    className="px-4 py-2 rounded-xl bg-slate-50 text-slate-600 hover:text-[#0054A6] hover:bg-[#0054A6]/10 transition-all font-bold text-xs flex items-center gap-2 disabled:opacity-50 border border-slate-200/60 shadow-sm cursor-pointer flex-1 md:flex-none justify-center"
                  >
                    <Eye className="h-4 w-4" />
                    Ver Pagaré
                  </button>
                )}
                {/* Botón Cerrar (Solo visible en Desktop) */}
                <button
                  onClick={() => {
                    if (!isDisbursing) setCreditoSeleccionado(null);
                  }}
                  disabled={isDisbursing}
                  className="hidden md:flex p-2.5 rounded-xl bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-50 ml-1 border border-rose-200/60"
                  title="Cerrar Ficha de Detalle"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Alerta de bloqueo por desembolso */}
            {isDisbursing && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin text-[#0054A6]" />
                <div className="text-xs text-blue-700 font-bold">
                  Procesando Aprobación y Desembolso... No cierre esta ventana ni interrumpa la operación.
                </div>
              </div>
            )}

            {/* Error de desembolso crítico */}
            {disburseError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start animate-fade-in">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-red-800 uppercase">Error de Desembolso Contable</h4>
                  <p className="text-xs text-red-600 leading-relaxed font-medium">{disburseError}</p>
                </div>
              </div>
            )}

            {activeModalTab === 'detalles' && (
              <div className="animate-fade-in flex-1 overflow-y-auto pr-2 pb-2">
                {/* Cuerpo de Dos Columnas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
              
              {/* Columna Izquierda: Perfil de Riesgo */}
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                    Perfil del Socio Solicitante
                  </h4>
                  
                  {/* Datos Básicos */}
                  <Card className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5 shadow-none">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Socio:</span>
                      <span className="font-extrabold text-slate-700 uppercase">{creditoSeleccionado.socio?.nombresCompletos}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Cédula:</span>
                      <span className="font-bold text-slate-700 font-mono">{creditoSeleccionado.socio?.identificacion}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Actividad Económica:</span>
                      <span className="font-semibold text-slate-700">{creditoSeleccionado.socio?.actividadEconomica || 'No declarada'}</span>
                    </div>
                  </Card>
                </div>

                {/* Score Crediticio (Media Dona Gauge SVG) */}
                <Card className="rounded-3xl border border-slate-100 p-4 shadow-sm bg-white space-y-1">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Score de Buró Crediticio
                  </h5>
                  <div className="relative flex flex-col items-center">
                    {(() => {
                      const scoreVal = getCreditScore(creditoSeleccionado.socio, cuotaProyectada);
                      const percent = Math.min(100, Math.max(0, ((scoreVal - 300) / 700) * 100));
                      
                      let strokeColor = '#EF4444';
                      let scoreLabel = 'RIESGO ALTO';
                      let scoreClass = 'text-rose-500';
                      
                      if (scoreVal >= 600 && scoreVal < 800) {
                        strokeColor = '#F59E0B';
                        scoreLabel = 'RIESGO MEDIO';
                        scoreClass = 'text-amber-500';
                      } else if (scoreVal >= 800) {
                        strokeColor = '#10B981';
                        scoreLabel = 'EXCELENTE';
                        scoreClass = 'text-emerald-500';
                      }
                      
                      const offsetVal = 251.3 - (percent / 100) * 251.3;
                      
                      return (
                        <>
                          <svg viewBox="0 0 200 110" className="w-full max-w-[160px] mx-auto">
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              fill="transparent"
                              stroke="#F1F5F9"
                              strokeWidth="12"
                              strokeDasharray="251.3 502.6"
                              transform="rotate(-180 100 100)"
                              strokeLinecap="round"
                            />
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              fill="transparent"
                              stroke={strokeColor}
                              strokeWidth="12"
                              strokeDasharray="251.3 502.6"
                              strokeDashoffset={offsetVal}
                              transform="rotate(-180 100 100)"
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                            <text x="100" y="80" textAnchor="middle" className="text-3xl font-black fill-slate-800 tracking-tight font-sans">
                              {scoreVal}
                            </text>
                            <text x="100" y="98" textAnchor="middle" className={`text-[8px] font-black tracking-widest uppercase fill-current ${scoreClass} font-sans`}>
                              {scoreLabel}
                            </text>
                          </svg>
                          <div className="text-[9px] text-slate-400 font-semibold text-center mt-1">
                            Rango de Calificación SEPS (300 a 1000)
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </Card>

                {/* Ingresos y Gastos con formateador de moneda */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                    Ingresos y Gastos Declarados
                  </h4>

                  <Card className="rounded-3xl border border-slate-100 p-4 space-y-3 shadow-sm bg-white">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-550 font-semibold flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Ingresos Mensuales (+):
                      </span>
                      <span className="font-bold text-emerald-600 font-mono text-sm">
                        {formatCurrency(Number(ingresos))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-550 font-semibold flex items-center gap-1.5">
                        <Ban className="h-4 w-4 text-rose-500" />
                        Gastos Mensuales (-):
                      </span>
                      <span className="font-bold text-rose-600 font-mono text-sm">
                        {formatCurrency(Number(gastos))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-dashed border-slate-100 pb-2.5">
                      <span className="text-slate-550 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-slate-400" />
                        Otras Deudas Actuales:
                      </span>
                      <span className="font-bold text-slate-600 font-mono">
                        {formatCurrency(Number(deudas))}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-800 text-xs font-black uppercase tracking-wider">
                        Flujo Neto Mensual:
                      </span>
                      <span className={`font-black font-mono text-base ${flujoNeto > 0 ? 'text-[#0054A6]' : 'text-rose-600'}`}>
                        {formatCurrency(flujoNeto)}
                      </span>
                    </div>
                  </Card>

                  {/* Banner de Advertencia del 40% */}
                  {superaCapacidad && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-3xl flex gap-3 items-start animate-fade-in">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide">Alerta de Capacidad de Pago</h4>
                        <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                          Alto riesgo de impago: La cuota proyectada de {formatCurrency(cuotaProyectada)} representa el{' '}
                          {flujoNeto > 0 ? porcentajeCapacidad.toFixed(1) : '100+'}% del flujo neto mensual. Supera la capacidad de pago SEPS (límite del 40%).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Motivo de rechazo previo */}
                {creditoSeleccionado.estado === 'RECHAZADO' && creditoSeleccionado.motivoRechazo && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                      Historial de Resolución
                    </h4>
                    <div className="p-4 bg-rose-50/50 border border-rose-100/50 rounded-2xl">
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-1">Motivo de Rechazo:</span>
                      <p className="text-xs text-rose-700 font-bold leading-relaxed">{creditoSeleccionado.motivoRechazo}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Columna Derecha: Proyección Financiera y Notas */}
              <div className="space-y-4 flex flex-col justify-between">
                
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                    Proyección Financiera
                  </h4>

                  <Card className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5 shadow-none">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Monto Solicitado:</span>
                      <span className="font-extrabold text-slate-800 font-mono">{formatCurrency(creditoSeleccionado.montoSolicitado)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Sistema Amortización:</span>
                      <span className="font-bold text-slate-800 uppercase text-[11px]">{creditoSeleccionado.tipoAmortizacion}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Tasa Interés Anual:</span>
                      <span className="font-bold text-slate-800 font-mono">{creditoSeleccionado.tasaInteresAnual.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Plazo:</span>
                      <span className="font-bold text-slate-800">{creditoSeleccionado.plazoMeses} meses</span>
                    </div>
                    <div className="flex justify-between items-start text-xs flex-col gap-1 border-t border-slate-100 pt-2.5">
                      <span className="text-slate-450 font-semibold">Garantía / Justificación:</span>
                      <p className="text-slate-650 italic text-[11px] leading-relaxed">{creditoSeleccionado.garantiaDescripcion}</p>
                    </div>
                  </Card>
                </div>

                {/* Notas Internas / Bitácora */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                    Notas Internas / Bitácora
                  </h4>
                  <textarea
                    placeholder="Escriba comentarios o notas de seguimiento del crédito aquí (se autoguarda)..."
                    value={notasCredito[creditoSeleccionado.id] || ''}
                    onChange={(e) => handleNotaChange(creditoSeleccionado.id, e.target.value)}
                    rows={4}
                    className="w-full text-xs font-semibold text-slate-700 placeholder-slate-400 bg-white border border-slate-100 rounded-3xl p-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]/60 resize-none leading-relaxed"
                  />
                </div>

              </div>

            </div>

            {/* Footer de Resoluciones (Botones de Cierre) */}
            <div className="border-t border-slate-100 pt-6 flex gap-4 w-full">
              
              {/* Controles para Créditos en Análisis (Solicitados / En Revisión) */}
              {(creditoSeleccionado.estado === 'SOLICITADO' || creditoSeleccionado.estado === 'EN_REVISION') && (
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  {/* Botón Rechazar */}
                  <Button
                    onClick={() => setMostrarRechazoModal(true)}
                    disabled={isDisbursing}
                    className="flex-1 bg-rose-50/80 hover:bg-rose-600 border border-rose-200/60 text-rose-700 hover:text-white font-bold rounded-2xl h-11 text-xs cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:shadow-md hover:shadow-rose-600/10"
                  >
                    <Ban className="h-4 w-4" />
                    Rechazar Solicitud
                  </Button>

                  {/* Botón Aprobar Solicitud */}
                  <Button
                    onClick={triggerAprobarCreditoConfirm}
                    disabled={isApproving || isDisbursing}
                    className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-11 text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-800/10 disabled:opacity-50"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        Aprobando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Aprobar Solicitud
                      </>
                    )}
                  </Button>

                </div>
              )}

              {/* Controles para Créditos en APROBADO */}
              {creditoSeleccionado.estado === 'APROBADO' && (
                <div className="flex w-full gap-4 animate-fade-in">
                  {/* Botón Desembolsar Fondos */}
                  <Button
                    onClick={() => handleImprimirPagare(creditoSeleccionado)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-700/10"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Desembolsar Fondos
                  </Button>

                </div>
              )}


            </div>
              </div>
            )}

            {/* TAB: TABLA DE AMORTIZACIÓN */}
            {activeModalTab === 'amortizacion' && (
              <div className="animate-fade-in flex-1 overflow-hidden flex flex-col h-full">
                <div className="bg-white border border-slate-100/80 rounded-2xl p-4 shadow-sm flex-1 flex flex-col min-h-[400px]">
                  {/* Encabezado Premium Resumen (Como en Foto) */}
                  <div className="mb-4 bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white border-b border-slate-100">
                          <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-1/6">N° CRÉDITO</th>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-1/6">FECHA SOLICITUD</th>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-1/6">MONTO</th>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-1/6">SALDO DEUDOR</th>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-1/6">PRÓXIMO VENCIMIENTO</th>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-1/6">ESTADO</th>
                        </tr>
                      </thead>
                      <tbody className="bg-slate-50/20">
                        {(() => {
                          const nextCuota = tablaAmortizacion?.find((c: any) => c.estado !== 'PAGADA');
                          const saldoDeudor = nextCuota ? (Number(nextCuota.saldo) + Number(nextCuota.capital)) : 0;
                          
                          const isMora = tablaAmortizacion?.some((c: any) => c.estado === 'MORA');
                          const isCancelado = creditoSeleccionado.estado === 'CANCELADO' || (tablaAmortizacion?.length > 0 && !nextCuota);
                          
                          let estadoLabel = 'AL DÍA';
                          let estadoStyles = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                          if (isCancelado) {
                            estadoLabel = 'CANCELADO';
                            estadoStyles = 'bg-slate-100 text-slate-600 border border-slate-200';
                          } else if (isMora) {
                            estadoLabel = 'EN MORA';
                            estadoStyles = 'bg-rose-50 text-rose-600 border border-rose-100';
                          }

                          return (
                            <tr>
                              <td className="px-4 py-4 text-[11px] font-extrabold text-[#0054A6] font-mono">{creditoSeleccionado.numeroCredito}</td>
                              <td className="px-4 py-4 text-[11px] font-semibold text-slate-600 font-mono">{formatFechaStr(creditoSeleccionado.fechaSolicitud)}</td>
                              <td className="px-4 py-4 text-[11px] font-bold text-slate-800 font-mono">{formatCurrency(creditoSeleccionado.montoSolicitado)}</td>
                              <td className="px-4 py-4 text-[11px] font-bold text-slate-800 font-mono">{formatCurrency(saldoDeudor)}</td>
                              <td className="px-4 py-3">
                                {nextCuota ? (
                                  <>
                                    <span className="text-[11px] font-bold text-slate-800 font-mono block">{formatCurrency(nextCuota.total)}</span>
                                    <span className="text-[9px] text-slate-400 font-medium block">Vence: {creditoSeleccionado.estado === 'DESEMBOLSADO' ? nextCuota.fecha : 'Al desembolsar'}</span>
                                  </>
                                ) : (
                                  <span className="text-[11px] font-bold text-slate-400">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`px-2.5 py-1.5 text-[8px] font-black rounded-md uppercase tracking-wider ${estadoStyles}`}>
                                  {estadoLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {!tablaAmortizacion || tablaAmortizacion.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-10">
                      {cargandoAmortizacion ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">No se registra cronograma de pagos para este crédito.</span>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-y-auto flex-1 border border-slate-100 rounded-xl max-h-[500px]">
                      <table className="w-full text-left border-collapse table-fixed">
                        <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10">
                          <tr className="border-b border-slate-100">
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[12%]">Cuota</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[18%]">Vencimiento</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[14%]">Capital</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[14%]">Interés</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[14%]">Total</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[16%]">Saldo Restante</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[12%] text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {tablaAmortizacion.map((cuo: any, index: number) => {
                            const isPagada = cuo.estado === 'PAGADA';
                            return (
                              <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-[10px] font-extrabold text-slate-600 font-mono">
                                  #{cuo.num}
                                </td>
                                <td className="px-4 py-3 text-[10px] font-semibold text-slate-500 font-mono">
                                  {creditoSeleccionado.estado === 'DESEMBOLSADO' ? cuo.fecha : <span className="text-[9px] italic text-slate-400">Al desembolsar</span>}
                                </td>
                                <td className="px-4 py-3 text-[10px] font-bold text-slate-500 font-mono">
                                  {formatCurrency(cuo.capital)}
                                </td>
                                <td className="px-4 py-3 text-[10px] font-bold text-slate-500 font-mono">
                                  {formatCurrency(cuo.interes)}
                                </td>
                                <td className="px-4 py-3 text-[10px] font-black text-slate-700 font-mono">
                                  {formatCurrency(cuo.total)}
                                </td>
                                <td className="px-4 py-3 text-[10px] font-bold text-slate-500 font-mono">
                                  {formatCurrency(cuo.saldo)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`px-2 py-0.5 text-[8px] font-black rounded-md ${
                                    isPagada ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {isPagada ? '✓ PAGADA' : '○ PENDIENTE'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal Split de Previsualización e Impresión (Aesthetic Apple Light) */}
      {pagareCredito && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 no-print select-text">
          
          <div className="flex flex-col lg:flex-row gap-6 max-w-6xl w-full max-h-[92vh] overflow-hidden">
            
            {/* Panel de Compliance Izquierdo */}
            <div className="w-full lg:w-[320px] bg-white rounded-[2rem] border border-slate-100 p-6 shadow-2xl flex flex-col justify-between shrink-0 overflow-y-auto max-h-[92vh]">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="h-4.5 w-4.5 text-[#0054A6]" />
                    Documentación Legal
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
                    Autorización de Desembolso
                  </p>
                </div>

                <div className="border-t border-slate-50 my-4" />

                {pagareCredito.estado === 'SOLICITADO' || pagareCredito.estado === 'EN_REVISION' ? (
                  <div className="space-y-4 text-left animate-fade-in">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-[#0054A6] uppercase tracking-wider block">
                        Paso 1: Aprobar Solicitud
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Apruebe la solicitud en el sistema para permitir la posterior generación y firma del pagaré por parte del socio.
                      </p>
                      <Button
                        onClick={triggerAprobarCreditoConfirm}
                        disabled={isApproving}
                        className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-10 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
                      >
                        {isApproving ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Aprobando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aprobar Solicitud
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : pagareCredito.estado === 'APROBADO' ? (
                  <div className="space-y-6 text-left animate-fade-in">
                    {/* PASO 1 */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-semibold text-[#0054A6] uppercase tracking-wider block">
                        Paso 1: Generar Pagaré
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Genere e imprima el Pagaré a la Orden para la firma física del deudor principal y del garante.
                      </p>
                      <Button
                        onClick={() => {
                          descargarPagarePdf(pagareCredito, pagareCuotas, user?.nombresCompletos || 'Oficial');
                        }}
                        disabled={cargandoPagareCuotas || isDisbursing}
                        className="w-full bg-[#0054A6] hover:bg-[#0054A6]/90 text-white font-bold rounded-xl h-9 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Generar Pagaré (PDF)
                      </Button>
                    </div>

                    {/* PASO 2 */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-semibold text-[#0054A6] uppercase tracking-wider block">
                        Paso 2: Cargar Pagaré Firmado
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Suba el documento digitalizado (PDF o imagen) que contenga las firmas físicas obligatorias.
                      </p>
                      
                      {/* Dropzone minimalista */}
                      <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        pagareFirmadoFile 
                          ? 'border-emerald-200 bg-emerald-50/20' 
                          : 'border-slate-200 hover:border-[#0054A6]/30 bg-slate-50/50 hover:bg-slate-50'
                      }`}>
                        <label className="cursor-pointer block space-y-1">
                          <input 
                            type="file" 
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            disabled={isDisbursing}
                            className="hidden" 
                          />
                          {pagareFirmadoFile ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-emerald-700 block truncate" title={pagareFirmadoName}>
                                {pagareFirmadoName}
                              </span>
                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">
                                ARCHIVO LISTO
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-slate-500 block">
                                Subir Pagaré Firmado (PDF/JPG)
                              </span>
                              <span className="text-[9px] text-slate-400 block">
                                Clic para buscar archivo
                              </span>
                            </div>
                          )}
                        </label>
                      </div>
                      
                      {pagareFirmadoFile && (
                        <button
                          onClick={() => {
                            setPagareFirmadoFile(null);
                            setPagareFirmadoName('');
                          }}
                          disabled={isDisbursing}
                          className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest block mx-auto cursor-pointer"
                        >
                          [ Remover Archivo ]
                        </button>
                      )}
                    </div>

                    {/* PASO 3 */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-semibold text-[#0054A6] uppercase tracking-wider block">
                        Paso 3: Desembolso
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Proceda al desembolso de los fondos en la cuenta del socio una vez verificado el pagaré firmado.
                      </p>

                      {/* Desglose de Liquidación de Desembolso */}
                      <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] my-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Monto Aprobado:</span>
                          <span className="font-bold text-slate-700">{formatCurrency(pagareCredito.montoSolicitado)}</span>
                        </div>
                        <div className="flex justify-between text-rose-600">
                          <span className="font-medium">(-) Seguro Desgravamen (1%):</span>
                          <span className="font-bold">-{formatCurrency(pagareCredito.montoSolicitado * 0.01)}</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200 my-1.5" />
                        <div className="flex justify-between text-emerald-700 font-bold text-xs">
                          <span>Monto Líquido Acreditado:</span>
                          <span>{formatCurrency(pagareCredito.montoSolicitado * 0.99)}</span>
                        </div>
                      </div>
                      
                      {disburseError && (
                        <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-600 font-medium">
                          {disburseError}
                        </div>
                      )}

                      <Button
                        onClick={handleDesembolsarCredito}
                        disabled={cargandoPagareCuotas || !pagareFirmadoFile || isDisbursing}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-100 disabled:text-slate-350 disabled:border-slate-150 disabled:shadow-none shadow-sm shadow-emerald-600/10"
                      >
                        {isDisbursing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Procesando Desembolso...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ejecutar Desembolso
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Si ya está desembolsado o cancelado: Vista de reimpresión de tabla
                  <div className="space-y-5 text-left">
                    <div className="space-y-2">
                      <span className="text-[10px] font-semibold text-[#0054A6] uppercase tracking-wider block">
                        Crédito Resuelto
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Este crédito ya fue resuelto y desembolsado. Puede descargar la tabla de amortización para reimpresión.
                      </p>
                      <Button
                        onClick={() => {
                          descargarTablaAmortizacionPdf(pagareCredito, pagareCuotas);
                        }}
                        disabled={cargandoPagareCuotas}
                        className="w-full bg-[#0054A6] hover:bg-[#0054A6]/90 text-white font-bold rounded-xl h-9 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Imprimir Tabla de Amortización
                      </Button>
                    </div>
                    
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block mb-0.5">Archivo SEPS:</span>
                      <p className="text-[10px] text-emerald-600 leading-relaxed font-bold">
                        Pagaré digitalizado cargado y custodiado en bóveda digital.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botón de Cierre al fondo */}
              <div className="pt-4 border-t border-slate-50 mt-6">
                <Button
                  onClick={() => {
                    setPagareCredito(null);
                    setPagareCuotas([]);
                    setPagareFirmadoFile(null);
                    setPagareFirmadoName('');
                  }}
                  disabled={isDisbursing}
                  variant="outline"
                  className="w-full border-slate-200 text-slate-650 hover:bg-slate-50 font-bold rounded-xl h-9 text-xs cursor-pointer disabled:opacity-50"
                >
                  Cerrar Vista Previa
                </Button>
              </div>
            </div>

            {/* Previsualización del Pagaré Derecho */}
            <div className="flex-1 bg-slate-50 rounded-[2rem] p-6 shadow-inner overflow-y-auto max-h-[92vh] flex justify-center items-start">
              
              {/* Cuerpo de la Hoja A4 */}
              <div className="max-w-[700px] w-full bg-white shadow-lg border border-slate-200/50 p-12 rounded-lg min-h-[900px] font-serif text-slate-900 leading-relaxed text-xs select-text flex flex-col justify-between" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                
                {cargandoPagareCuotas ? (
                  <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2 font-sans w-full">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0054A6]" />
                    <span className="text-xs font-bold">Cargando previsualización...</span>
                  </div>
                ) : (
                  <div className="space-y-6 flex-1 flex flex-col justify-between w-full">
                    
                    {/* Si está pendiente / en revisión / aprobado: mostrar Pagaré + Amortización */}
                    {pagareCredito.estado === 'SOLICITADO' || pagareCredito.estado === 'EN_REVISION' || pagareCredito.estado === 'APROBADO' ? (
                      <div className="space-y-6 w-full">
                        {/* Membrete */}
                        <div className="text-center space-y-1 w-full">
                          <h2 className="text-sm font-bold tracking-tight uppercase">COOPERATIVA DE AHORRO Y CRÉDITO ITQ</h2>
                          <p className="text-[9px] text-slate-500 font-bold">RUC: 1791234567001  |  Dirección Matriz: Av. Antonio de Ulloa N28-30, Quito</p>
                          <div className="border-b border-double border-slate-350 my-1" />
                          <h3 className="text-xs font-bold uppercase pt-2">PAGARÉ A LA ORDEN</h3>
                          <p className="text-[10px] font-bold">Por USD: {formatCurrency(pagareCredito.montoSolicitado)}</p>
                        </div>

                        {/* Texto Legal */}
                        <p className="text-justify text-[10px] leading-relaxed indent-6">
                          Debo y pagaré incondicionalmente a la orden de la <strong>COOPERATIVA DE AHORRO Y CRÉDITO ITQ</strong>, 
                          en esta ciudad o en el lugar que se me requiera, la cantidad de <strong>{formatCurrency(pagareCredito.montoSolicitado)}</strong> 
                          (<strong>{numeroALetras(pagareCredito.montoSolicitado)}</strong>) dólares de los Estados Unidos de América, 
                          reconociendo una tasa de interés del <strong>{pagareCredito.tasaInteresAnual}%</strong> anual. En caso de mora, me 
                          sujeto a la tasa de interés máxima de mora permitida por la Junta de Política y Regulación Financiera del Ecuador. 
                          Renuncio expresamente a fuero y domicilio, y me someto a los jueces competentes de esta jurisdicción y al trámite 
                          ejecutivo o coactivo a elección del acreedor.
                        </p>

                        {/* Firmas en Pág 1 */}
                        <div className="grid grid-cols-3 gap-4 pt-10 text-[9px] text-center font-sans">
                          <div className="flex flex-col justify-end items-center space-y-0.5">
                            <div className="border-t border-slate-400 w-full pt-1">
                              <strong>DEUDOR PRINCIPAL</strong>
                            </div>
                            <span className="uppercase text-[8px] font-bold">{pagareCredito.socio?.nombresCompletos}</span>
                            <span className="font-mono text-[8px]">C.I.: {pagareCredito.socio?.identificacion}</span>
                          </div>
                          <div className="flex flex-col justify-end items-center space-y-0.5">
                            <div className="border-t border-slate-400 w-full pt-1">
                              <strong>CÓNYUGE / GARANTE</strong>
                            </div>
                            <span className="text-slate-400 italic text-[8px]">Firma Garante</span>
                            <span className="text-slate-400 text-[8px]">C.I.: _________________</span>
                          </div>
                          <div className="flex flex-col justify-end items-center space-y-0.5">
                            <div className="border-t border-slate-400 w-full pt-1">
                              <strong>OFICIAL DE CRÉDITO</strong>
                            </div>
                            <span className="uppercase text-[8px] font-bold">{user?.nombresCompletos || 'Oficial de Crédito'}</span>
                            <span className="text-[8px] text-slate-400 font-bold">COOP. ITQ</span>
                          </div>
                        </div>

                        {/* Indicador de Salto de Página Visual */}
                        <div className="flex items-center justify-center gap-2 text-[#0054A6] font-sans text-[9px] border-t border-dashed border-slate-200 pt-4 mt-6 font-bold">
                        </div>
                      </div>
                    ) : (
                      // Si ya está desembolsado: Previsualización de sólo la tabla
                      <div className="space-y-6 w-full">
                        {/* Membrete */}
                        <div className="text-center space-y-1 w-full">
                          <h2 className="text-sm font-bold tracking-tight uppercase">COOPERATIVA DE AHORRO Y CRÉDITO ITQ</h2>
                          <p className="text-[9px] text-slate-500 font-bold">RUC: 1791234567001  |  Dirección Matriz: Av. Antonio de Ulloa N28-30, Quito</p>
                          <div className="border-b border-double border-slate-350 my-1" />
                          <h3 className="text-xs font-bold uppercase pt-2">TABLA DE AMORTIZACIÓN</h3>
                          <p className="text-[9px] font-bold text-slate-600 mt-1">
                            Crédito Nro: {pagareCredito.numeroCredito}  |  Socio: {pagareCredito.socio?.nombresCompletos}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Tabla de amortización */}
                    <div className="space-y-2 mt-4 w-full">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-left border-b pb-1">Tabla de Amortización</h3>
                      <table className="w-full text-[9px] border-collapse border border-slate-350 text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-800">
                            <th className="border border-slate-300 p-1">Cuota</th>
                            <th className="border border-slate-300 p-1 text-center">Vencimiento</th>
                            <th className="border border-slate-300 p-1">Capital</th>
                            <th className="border border-slate-300 p-1">Interés</th>
                            <th className="border border-slate-300 p-1 font-bold">Cuota Total</th>
                            <th className="border border-slate-300 p-1 text-right pr-2">Saldo Restante</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-[8.5px]">
                          {pagareCuotas.map(cuo => (
                            <tr key={cuo.num} className="border-b border-slate-200">
                              <td className="border border-slate-250 p-1 text-center font-bold">{cuo.num}</td>
                              <td className="border border-slate-250 p-1 text-center">{cuo.fecha}</td>
                              <td className="border border-slate-250 p-1">{formatCurrency(cuo.capital)}</td>
                              <td className="border border-slate-250 p-1">{formatCurrency(cuo.interes)}</td>
                              <td className="border border-slate-250 p-1 font-bold">{formatCurrency(cuo.total)}</td>
                              <td className="border border-slate-250 p-1 text-right pr-2">{formatCurrency(cuo.saldo)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Premium: Confirmación de Aprobación de Crédito (Apple Light Style) */}
      {mostrarAprobacionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-fade-in select-none">
          <Card className="w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col justify-between relative overflow-hidden animate-scale-up">
            
            <button 
              onClick={() => setMostrarAprobacionModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-55 rounded-full transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {(() => {
              const targetCredito = pagareCredito || creditoSeleccionado;
              if (!targetCredito) return null;
              return (
                <>
                  <div className="flex flex-col items-center text-center">
                    <div className="h-14 w-14 rounded-3xl bg-blue-50/80 text-[#0054A6] flex items-center justify-center mb-4 border border-blue-100/50 shadow-sm">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">Aprobar Solicitud de Crédito</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2.5 max-w-[280px]">
                      ¿Está seguro de que desea aprobar esta solicitud de crédito para <span className="font-bold text-slate-800 uppercase">{targetCredito.socio?.nombresCompletos}</span>?
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-1.5 max-w-[280px]">
                      Esta acción cambiará el estado de la solicitud a APROBADO.
                    </p>
                  </div>

                  <div className="mt-5 space-y-3 p-4 bg-slate-50/50 backdrop-blur-sm border border-slate-100 rounded-3xl text-[11px] text-left">
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2">
                      <span className="text-slate-400 font-medium">Socio:</span>
                      <span className="font-bold text-slate-700 uppercase text-right leading-none max-w-[160px] truncate">{targetCredito.socio?.nombresCompletos}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2">
                      <span className="text-slate-400 font-medium">Monto Solicitado:</span>
                      <span className="font-extrabold text-slate-800">{formatCurrency(targetCredito.montoSolicitado)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2">
                      <span className="text-slate-400 font-medium">Plazo:</span>
                      <span className="font-bold text-slate-700">{targetCredito.plazoMeses} meses</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Amortización:</span>
                      <span className="font-bold text-slate-700 capitalize">{targetCredito.tipoAmortizacion.toLowerCase()}</span>
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="flex gap-3 pt-6">
              <Button
                onClick={() => setMostrarAprobacionModal(false)}
                variant="outline"
                className="flex-1 border-slate-200 text-slate-655 hover:bg-slate-50 font-bold rounded-2xl h-11 text-xs cursor-pointer bg-white transition-all"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAprobarCreditoConfirmado}
                className="flex-1 bg-[#0054A6] hover:bg-[#004080] active:scale-[0.98] text-white font-bold rounded-2xl h-11 flex items-center justify-center text-xs cursor-pointer shadow-lg shadow-blue-800/15 transition-all"
              >
                Confirmar
              </Button>
            </div>

          </Card>
        </div>
      )}

      {/* Modal: Ingresar Motivo de Rechazo */}
      {mostrarRechazoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in select-none">
          <Card className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden animate-scale-up">
            
            <button 
              onClick={() => setMostrarRechazoModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100/50">
                <Ban className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">Rechazar Solicitud de Crédito</h3>
              <p className="text-xs text-slate-500 font-medium tracking-wide mt-1 max-w-[280px]">
                Debe ingresar de forma obligatoria la justificación del rechazo para notificar al socio.
              </p>
            </div>

            <form onSubmit={handleRechazarSubmit} className="mt-5 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500">Motivo del Rechazo</label>
                <textarea
                  placeholder="Ej: Flujo de caja insuficiente, capacidad de pago supera el 40% del ingreso familiar..."
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={3}
                  required
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] bg-slate-50/35 leading-relaxed resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setMostrarRechazoModal(false)}
                  variant="outline"
                  className="flex-1 border-slate-200 text-slate-650 hover:bg-slate-50 font-bold rounded-xl h-10 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl h-10 flex items-center justify-center text-xs cursor-pointer shadow-md shadow-rose-600/10"
                >
                  Confirmar Rechazo
                </Button>
              </div>
            </form>

          </Card>
        </div>
      )}

      {/* Alertas Flotantes (Toast) */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-[100] animate-slide-in select-none text-left">
          <div className="bg-white rounded-[2rem] border border-slate-100 p-4 shadow-2xl flex items-center gap-3.5 max-w-sm">
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-500 border-emerald-100/50' : 'bg-red-50 text-red-500 border-red-100/50'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-800 leading-none">
                {toast.type === 'success' ? 'Operación Exitosa' : 'Ocurrió un Error'}
              </h5>
              <p className="text-[10px] text-slate-500 truncate mt-1 leading-none max-w-[200px]" title={toast.message}>
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Visor de Pagaré Firmado Custodiado */}
      {verPagareCredito && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none">
          <Card className="w-full max-w-4xl bg-white rounded-3xl border border-slate-100 p-4 shadow-2xl flex flex-col relative h-[90vh]">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#0054A6]" />
                Pagaré Firmado - Crédito {verPagareCredito.numeroCredito}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const doc = documentosFirmados[verPagareCredito.id];
                    if (doc && doc.dataUrl) {
                      const link = document.createElement('a');
                      link.href = doc.dataUrl;
                      link.download = doc.name || `pagare_firmado_${verPagareCredito.numeroCredito}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } else {
                      descargarPagarePdf(verPagareCredito, tablaAmortizacion, user?.nombresCompletos || 'Oficial');
                    }
                  }}
                  className="bg-[#0054A6] hover:bg-[#0054A6]/90 text-white font-bold rounded-xl h-9 px-4 flex items-center gap-2 text-xs cursor-pointer shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Pagaré
                </Button>
                <button 
                  onClick={() => setVerPagareCredito(null)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-100/50 rounded-2xl overflow-hidden relative border border-slate-200/60">
              {(() => {
                const doc = documentosFirmados[verPagareCredito.id];
                if (!doc || !doc.dataUrl) {
                  return (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <AlertTriangle className="h-12 w-12 text-amber-400" />
                      <p className="text-sm text-slate-500 font-bold max-w-sm">No se detectó el archivo PDF del pagaré firmado para este crédito.</p>
                    </div>
                  );
                }

                const isImage = doc.dataUrl.startsWith('data:image/');
                const isPdf = doc.dataUrl.startsWith('data:application/pdf');

                if (isImage) {
                  return (
                    <div className="absolute inset-0 overflow-y-auto flex justify-center p-4 bg-slate-100/50">
                      <img src={doc.dataUrl} alt={doc.name} className="max-w-full h-auto object-contain rounded-lg shadow-sm" />
                    </div>
                  );
                }

                if (isPdf) {
                  return (
                    <iframe 
                      src={doc.dataUrl} 
                      title={doc.name}
                      className="w-full h-full border-0"
                    />
                  );
                }

                return (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <FileText className="h-12 w-12 text-slate-400" />
                    <p className="text-sm text-slate-500 font-bold">{doc.name}</p>
                  </div>
                );
              })()}
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Nueva Solicitud Presencial */}
      {mostrarPresencialModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 no-print select-none">
          <Card className="w-full max-w-4xl bg-white rounded-[2.5rem] border border-slate-150 p-6 md:p-8 shadow-2xl flex flex-col justify-between relative max-h-[92vh] overflow-y-auto transform transition-all duration-300 animate-scale-up">
            
            {/* Botón de cerrar */}
            <button 
              onClick={() => {
                setMostrarPresencialModal(false);
                setPresencialSocio(null);
                setPresencialCedula('');
                setBuscarSocioError(null);
              }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Encabezado del Modal */}
            <div className="pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Building className="h-5.5 w-5.5 text-[#0054A6]" />
                Originación de Crédito Presencial (Ventanilla)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cree una nueva solicitud física en ventanilla asociándola a un socio activo.
              </p>
            </div>

            {/* Contenido principal */}
            <div className="space-y-6 flex-1">
              
              {/* PASO A: Identificación (Buscador por Cédula) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-50 text-[#0054A6] flex items-center justify-center text-xs font-bold font-mono">
                    A
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Identificación del Socio
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="sm:col-span-2 space-y-1.5 relative">
                    <label className="block text-xs font-semibold text-slate-500">Cédula o RUC del Socio</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ingrese número de identificación..."
                        value={presencialCedula}
                        onChange={(e) => setPresencialCedula(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleBuscarSocio();
                          }
                        }}
                        disabled={buscarSocioLoading}
                        className="w-full px-4 pr-10 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]"
                      />
                      {presencialCedula && !buscarSocioLoading && (
                        <button
                          type="button"
                          onClick={() => {
                            setPresencialCedula('');
                            setPresencialSocio(null);
                            setBuscarSocioError(null);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleBuscarSocio}
                    disabled={buscarSocioLoading || !presencialCedula.trim()}
                    className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-10.5 text-xs cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    {buscarSocioLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin animate-none mr-1.5" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Buscar Socio
                      </>
                    )}
                  </Button>
                </div>

                {buscarSocioError && (
                  <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs font-medium animate-fade-in flex items-center gap-2">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{buscarSocioError}</span>
                  </div>
                )}

                {/* Perfil del Socio Encontrado */}
                {presencialSocio && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 animate-fade-in text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                      <span className="font-semibold text-slate-800 text-sm">{presencialSocio.nombresCompletos}</span>
                      <span className="inline-flex items-center text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                        Activo
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-650">
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">Identificación:</span>
                        <span className="font-mono font-bold">{presencialSocio.identificacion}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">Correo Electrónico:</span>
                        <span className="font-bold">{presencialSocio.correo}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">Ingresos Mensuales:</span>
                        <span className="font-bold text-slate-800">{formatCurrency(presencialSocio.ingresosMensuales)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">Gastos Mensuales:</span>
                        <span className="font-bold text-slate-800">{formatCurrency(presencialSocio.gastosMensuales)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PASO B: Simulador (Sólo si el socio fue validado con éxito) */}
              {presencialSocio && (
                <div className="space-y-4 border-t border-slate-100 pt-6 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-blue-50 text-[#0054A6] flex items-center justify-center text-xs font-bold font-mono">
                      B
                    </div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Simulación y Registro del Préstamo
                    </h4>
                  </div>

                  <SimuladorCredito
                    buttonLabel="Registrar Solicitud Presencial"
                    successMessage="La solicitud presencial ha sido registrada directamente en estado EN ANÁLISIS."
                    onApply={async (params) => {
                      const response = await api.post('/creditos/solicitar?presencial=true', {
                        socio: { id: presencialSocio.id },
                        montoSolicitado: params.montoSolicitado,
                        plazoMeses: params.plazoMeses,
                        tasaInteresAnual: params.tasaInteresAnual,
                        productoCredito: { id: params.productoCreditoId },
                        tipoAmortizacion: params.tipoAmortizacion,
                        garantiaDescripcion: `Garantía Quirografaria (Firma Personal). Registro presencial por Ventanilla. Destino: ${params.destinoFondo}`,
                        usuarioOficialId: user?.detalles?.id
                      });
                      return response.data;
                    }}
                    onSuccessClose={() => {
                      setMostrarPresencialModal(false);
                      setPresencialSocio(null);
                      setPresencialCedula('');
                      fetchSolicitudes(); // Actualiza el tablero en caliente
                    }}
                  />
                </div>
              )}

            </div>

          </Card>
        </div>
      )}

    </div>
  );
};

// Subcomponente Tarjeta de Solicitud en Kanban
interface CardSolicitudProps {
  cred: Credito;
  onClick: () => void;
  getElapsedTime: (date: string) => string;
}

const CardSolicitud: React.FC<CardSolicitudProps> = ({ cred, onClick, getElapsedTime }) => {
  const getSlaAlert = () => {
    if (cred.estado !== 'SOLICITADO' && cred.estado !== 'EN_REVISION') return null;
    const date = new Date(cred.fechaSolicitud);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return null;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 2) {
      const colorClass = diffDays > 5 
        ? 'text-rose-600 bg-rose-50 border-rose-100' 
        : 'text-amber-600 bg-amber-50 border-amber-100';
      return (
        <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${colorClass}`}>
          <span>⏳</span>
          <span>{diffDays} {diffDays === 1 ? 'día' : 'días'} en espera</span>
        </span>
      );
    }
    return null;
  };

  const slaAlert = getSlaAlert();
  
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-3xl border border-slate-100 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_25px_rgba(0,84,166,0.04)] hover:border-[#0054A6]/20 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 animate-scale-up"
    >
      <div className="space-y-3 flex flex-col justify-between h-full">
        <div className="space-y-3">
          {/* Superior: Nombre y Tiempo */}
          <div className="flex justify-between items-start gap-1">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-700 truncate max-w-[110px] uppercase" title={cred.socio?.nombresCompletos}>
                {cred.socio?.nombresCompletos}
              </h4>
              <span className={`inline-flex items-center text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${getEstadoCardStyles(cred.estado)}`}>
                {getEstadoLabel(cred.estado)}
              </span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5 shrink-0 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-100/50">
              <Clock className="h-2.5 w-2.5 text-slate-350" />
              {getElapsedTime(cred.fechaSolicitud)}
            </span>
          </div>

          {/* Separador Fino */}
          <div className="border-t border-slate-50" />

          {/* Cuerpo: Monto y Plazo */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monto</span>
              <span className="font-extrabold text-[#0054A6] font-mono text-[13px]">
                {formatCurrency(cred.montoSolicitado)}
              </span>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Plazo</span>
              <span className="font-bold text-slate-700">
                {cred.plazoMeses} meses
              </span>
            </div>
          </div>

          {/* Tipo de Amortización */}
          <div className="flex justify-between items-center text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-100/50 font-bold">
            <span className="text-slate-450 uppercase">Amortización:</span>
            <span className="text-slate-650 uppercase font-extrabold">{cred.tipoAmortizacion}</span>
          </div>

          {/* Alerta de SLA */}
          {slaAlert && (
            <div className="pt-2 border-t border-slate-50 flex justify-start">
              {slaAlert}
            </div>
          )}

          {/* Garantía Corta */}
          <div className={`text-[10px] text-slate-450 italic line-clamp-1 pt-2 font-medium ${
            slaAlert ? '' : 'border-t border-slate-50'
          }`}>
            {cred.garantiaDescripcion}
          </div>
        </div>
      </div>
    </div>
  );
};
