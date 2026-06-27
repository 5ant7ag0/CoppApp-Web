import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Loader2,
  Folder,
  Download,
  Plus,
  Coins,
  Eye,
  EyeOff,
  BookOpen,
  TrendingUp,
  Scale,
  Lock
} from 'lucide-react';
import api from '../../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

// Types definition
interface PlanCuenta {
  id: number;
  codigoContable: string;
  nombreCuenta: string;
  tipoCuenta: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';
  esMovimiento: boolean;
  estado: 'ACTIVO' | 'INACTIVO';
}

interface AccountNode extends PlanCuenta {
  children: AccountNode[];
}

interface AsientoDetalle {
  id: number;
  codigoContable: string;
  nombreCuenta: string;
  tipoAsiento: 'DEBITO' | 'CREDITO';
  monto: number;
}

interface AsientoCabecera {
  id: number;
  numeroAsiento: string;
  glosa: string;
  fechaAsiento: string;
  referencia?: string;
  totalAsiento?: number;
  detalles: AsientoDetalle[];
}

interface MovimientoMayor {
  id: number;
  fecha: string;
  numeroAsiento: string;
  referencia: string;
  concepto: string;
  debe: number;
  haber: number;
  saldoAcumulado: number;
}

interface LibroMayorData {
  cuentaId: number;
  codigoContable: string;
  nombreCuenta: string;
  tipoCuenta: string;
  saldoInicial: number;
  totalDebitoPeriodo: number;
  totalCreditoPeriodo: number;
  saldoFinal: number;
  movimientos: MovimientoMayor[];
}

// Helper to recursively/hierarchically filter visible accounts (hiding zeros but keeping groups with non-zero descendants)
const filterVisibleAccounts = (accounts: any[] | undefined | null, virtualCode?: string, virtualBalance?: number) => {
  if (!accounts) return [];
  return accounts.filter((acc) => {
    if (virtualCode && virtualBalance && virtualBalance !== 0) {
      if (acc.codigoContable === virtualCode || virtualCode.startsWith(acc.codigoContable + '.')) {
        return true;
      }
    }
    return accounts.some((other) => {
      if (!other.esMovimiento) return false;
      const isDescendant = other.codigoContable === acc.codigoContable || 
                           other.codigoContable.startsWith(acc.codigoContable + '.');
      return isDescendant && other.balance !== 0;
    });
  });
};

export const ContabilidadDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = (searchParams.get('section') || 'PLAN').toUpperCase();


  // Cierres Fiscales state
  const [cierresHistoricos, setCierresHistoricos] = useState<any[]>([]);
  const [loadingCierres, setLoadingCierres] = useState<boolean>(false);
  const [errorCierres, setErrorCierres] = useState<string | null>(null);

  // Cierre Modal execution state
  const [showCierreModal, setShowCierreModal] = useState<boolean>(false);
  const [cierreAnio, setCierreAnio] = useState<number>(new Date().getFullYear());
  const [cierreCuentaPatrimonial, setCierreCuentaPatrimonial] = useState<PlanCuenta | null>(null);
  const [busquedaCuentaCierre, setBusquedaCuentaCierre] = useState<string>('');
  const [mostrarDropdownCuentasCierre, setMostrarDropdownCuentasCierre] = useState<boolean>(false);
  const [cierreConfirmacion, setCierreConfirmacion] = useState<string>('');
  const [cierreProcesando, setCierreProcesando] = useState<boolean>(false);
  const [errorCierreModal, setErrorCierreModal] = useState<string | null>(null);

  // Plan de cuentas state
  const [planCuentas, setPlanCuentas] = useState<PlanCuenta[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [expandedNodes, setExpandedNodes] = useState<{ [key: string]: boolean }>({});
  const [filtroPlan, setFiltroPlan] = useState<string>('');

  // Subaccount Modal & Actions state
  const [showAddSubcuentaModal, setShowAddSubcuentaModal] = useState<boolean>(false);
  const [parentAccountForNewSub, setParentAccountForNewSub] = useState<PlanCuenta | null>(null);
  const [newSubcuentaName, setNewSubcuentaName] = useState<string>('');
  const [newSubcuentaEsMovimiento, setNewSubcuentaEsMovimiento] = useState<boolean>(true);
  const [savingSubcuenta, setSavingSubcuenta] = useState<boolean>(false);
  const [errorSubcuenta, setErrorSubcuenta] = useState<string | null>(null);

  // Deactivation state
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Libro diario state
  const [asientos, setAsientos] = useState<AsientoCabecera[]>([]);
  const [loadingDiario, setLoadingDiario] = useState<boolean>(false);
  const [fechaDesdeDiario, setFechaDesdeDiario] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days ago
  );
  const [fechaHastaDiario, setFechaHastaDiario] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [expandedAsientos, setExpandedAsientos] = useState<{ [key: number]: boolean }>({});
  const [currentPageDiario, setCurrentPageDiario] = useState<number>(0);
  const [totalPagesDiario, setTotalPagesDiario] = useState<number>(0);
  const [totalElementsDiario, setTotalElementsDiario] = useState<number>(0);

  // Libro mayor state
  const [cuentaMayorSeleccionada, setCuentaMayorSeleccionada] = useState<PlanCuenta | null>(null);
  const [busquedaCuentaMayor, setBusquedaCuentaMayor] = useState<string>('');
  const [mostrarDropdownCuentas, setMostrarDropdownCuentas] = useState<boolean>(false);
  const [fechaDesdeMayor, setFechaDesdeMayor] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [fechaHastaMayor, setFechaHastaMayor] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [mayorData, setMayorData] = useState<LibroMayorData | null>(null);
  const [loadingMayor, setLoadingMayor] = useState<boolean>(false);
  const [errorMayor, setErrorMayor] = useState<string | null>(null);

  // Libro mayor pagination state
  const [currentPageMayor, setCurrentPageMayor] = useState<number>(0);
  const [totalPagesMayor, setTotalPagesMayor] = useState<number>(0);
  const [totalElementsMayor, setTotalElementsMayor] = useState<number>(0);

  // Estado de Resultados state
  const [fechaDesdeResultados, setFechaDesdeResultados] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [fechaHastaResultados, setFechaHastaResultados] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [resultadosData, setResultadosData] = useState<any>(null);
  const [loadingResultados, setLoadingResultados] = useState<boolean>(false);
  const [errorResultados, setErrorResultados] = useState<string | null>(null);

  // Balance General state
  const [fechaCorteBalance, setFechaCorteBalance] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [balanceData, setBalanceData] = useState<any>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [errorBalance, setErrorBalance] = useState<string | null>(null);

  // Seat Detail Modal state
  const [showAsientoModal, setShowAsientoModal] = useState<boolean>(false);
  const [selectedAsientoNumero, setSelectedAsientoNumero] = useState<string | null>(null);
  const [selectedAsientoData, setSelectedAsientoData] = useState<AsientoCabecera | null>(null);
  const [loadingAsientoDetail, setLoadingAsientoDetail] = useState<boolean>(false);
  const [errorAsientoDetail, setErrorAsientoDetail] = useState<string | null>(null);

  // Auto dismissal for Toast notifications
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Fetch plan de cuentas on load
  const loadPlanCuentas = async () => {
    setLoadingPlan(true);
    try {
      const res = await api.get('/contabilidad/plan-cuentas');
      setPlanCuentas(res.data || []);
      
      // Expand root nodes by default
      const initialExp: { [key: string]: boolean } = {};
      (res.data || []).forEach((acc: PlanCuenta) => {
        if (!acc.codigoContable.includes('.')) {
          initialExp[acc.codigoContable] = true;
        }
      });
      setExpandedNodes(initialExp);
    } catch (err) {
      console.error('Error cargando plan de cuentas:', err);
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    loadPlanCuentas();
  }, []);

  // Filter and build Tree for Plan de Cuentas with automatic branch expansion
  const { treeNodes, autoExpanded } = useMemo(() => {
    if (!filtroPlan.trim()) {
      // Build standard full tree
      const map: { [key: string]: AccountNode } = {};
      const roots: AccountNode[] = [];
      
      planCuentas.forEach(acc => {
        map[acc.codigoContable] = { ...acc, children: [] };
      });

      planCuentas.forEach(acc => {
        const node = map[acc.codigoContable];
        const code = acc.codigoContable;
        const lastDotIndex = code.lastIndexOf('.');
        
        if (lastDotIndex === -1) {
          roots.push(node);
        } else {
          const parentCode = code.substring(0, lastDotIndex);
          const parentNode = map[parentCode];
          if (parentNode) {
            parentNode.children.push(node);
          } else {
            roots.push(node);
          }
        }
      });

      return { treeNodes: roots, autoExpanded: {} as { [key: string]: boolean } };
    }

    const searchLower = filtroPlan.toLowerCase();

    // Step 1: Find matching nodes
    const matchingNodes = planCuentas.filter(acc => 
      acc.nombreCuenta.toLowerCase().includes(searchLower) || 
      acc.codigoContable.includes(searchLower)
    );

    // Step 2: Extract ancestor codes to build full hierarchy paths
    const visibleCodes = new Set<string>();
    const toExpand: { [key: string]: boolean } = {};

    matchingNodes.forEach(acc => {
      visibleCodes.add(acc.codigoContable);
      
      let code = acc.codigoContable;
      while (code.includes('.')) {
        const lastDotIndex = code.lastIndexOf('.');
        const parentCode = code.substring(0, lastDotIndex);
        visibleCodes.add(parentCode);
        toExpand[parentCode] = true;
        code = parentCode;
      }
    });

    // Step 3: Build the filtered tree
    const filteredAccounts = planCuentas.filter(acc => visibleCodes.has(acc.codigoContable));
    const map: { [key: string]: AccountNode } = {};
    const roots: AccountNode[] = [];

    filteredAccounts.forEach(acc => {
      map[acc.codigoContable] = { ...acc, children: [] };
    });

    filteredAccounts.forEach(acc => {
      const node = map[acc.codigoContable];
      const code = acc.codigoContable;
      const lastDotIndex = code.lastIndexOf('.');
      
      if (lastDotIndex === -1) {
        roots.push(node);
      } else {
        const parentCode = code.substring(0, lastDotIndex);
        const parentNode = map[parentCode];
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          roots.push(node);
        }
      }
    });

    return { treeNodes: roots, autoExpanded: toExpand };
  }, [planCuentas, filtroPlan]);

  // Merge auto-expanded nodes when search filter changes
  useEffect(() => {
    if (filtroPlan.trim() && Object.keys(autoExpanded).length > 0) {
      setExpandedNodes(prev => ({
        ...prev,
        ...autoExpanded
      }));
    }
  }, [autoExpanded, filtroPlan]);

  // Create subaccount form submit handler
  const handleCreateSubcuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentAccountForNewSub) return;
    if (!newSubcuentaName.trim()) {
      setErrorSubcuenta('Por favor, ingresa el nombre de la subcuenta.');
      return;
    }

    setSavingSubcuenta(true);
    setErrorSubcuenta(null);

    try {
      await api.post('/contabilidad/plan-cuentas', {
        padreId: parentAccountForNewSub.id,
        nombreCuenta: newSubcuentaName,
        esMovimiento: newSubcuentaEsMovimiento
      });

      setToastMessage({
        text: `Subcuenta creada exitosamente bajo la cuenta ${parentAccountForNewSub.codigoContable}`,
        type: 'success'
      });

      await loadPlanCuentas();
      setShowAddSubcuentaModal(false);
      setParentAccountForNewSub(null);
      setNewSubcuentaName('');
      setNewSubcuentaEsMovimiento(true);
    } catch (err: any) {
      console.error('Error al crear subcuenta:', err);
      setErrorSubcuenta(err.response?.data || 'Error al guardar la subcuenta.');
    } finally {
      setSavingSubcuenta(false);
    }
  };

  // Toggle account active/inactive state handler
  const handleToggleEstadoCuenta = async (account: PlanCuenta) => {
    const nuevoEstado = account.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    setDeactivatingId(account.id);
    try {
      await api.put(`/contabilidad/plan-cuentas/${account.id}/estado?estado=${nuevoEstado}`);
      
      setToastMessage({
        text: `Cuenta ${account.codigoContable} ${nuevoEstado === 'ACTIVO' ? 'activada' : 'desactivada'} exitosamente.`,
        type: 'success'
      });

      await loadPlanCuentas();
    } catch (err: any) {
      console.error('Error al cambiar estado de la cuenta:', err);
      setToastMessage({
        text: err.response?.data || `No se pudo cambiar el estado de la cuenta ${account.codigoContable}.`,
        type: 'error'
      });
    } finally {
      setDeactivatingId(null);
    }
  };

  // Export to CSV utility (Excel-friendly UTF-8 with BOM)
  const exportarCSV = () => {
    const headers = ['Código', 'Nombre de Cuenta', 'Tipo', 'Naturaleza', 'Estado'];
    const rows = planCuentas.map(cta => [
      cta.codigoContable,
      cta.nombreCuenta,
      cta.esMovimiento ? 'Movimiento' : 'Agrupadora',
      cta.tipoCuenta,
      cta.estado
    ]);

    const csvContent = [
      headers.join(';'), // Semicolon works great for Spanish Excel
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `plan_de_cuentas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage({
      text: 'Catálogo de cuentas exportado a CSV correctamente.',
      type: 'success'
    });
  };

  // Generate Accounting Voucher PDF (Comprobante Contable Legal)
  const imprimirComprobante = (asiento: AsientoCabecera) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [0, 84, 166]; // #0054A6
    const secondaryColor = [71, 85, 105]; // Slate
    const lightGray = [248, 250, 252]; // Slate-50

    // 1. Cabecera Institucional
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 8, 'F'); // Top colored band

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('COOPERATIVA DE AHORRO Y CRÉDITO ITQ', 15, 22);

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('R.U.C. 1792345678001 | DIRECCIÓN MATRIZ: AV. AMAZONAS N31-10 Y MARIANA DE JESÚS', 15, 27);
    doc.text('CANAL: SISTEMA CORE BANCARIO | CONTABILIDAD GENERAL', 15, 31);

    // Voucher Title Box
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(138, 14, 57, 18, 2, 2, 'FD');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(138, 14, 57, 18);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('COMPROBANTE DIARIO', 140.5, 20);
    doc.setTextColor(220, 38, 38); // Red for voucher number
    doc.setFontSize(10);
    doc.text(`${asiento.numeroAsiento}`, 140.5, 27);

    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 36, 195, 36);

    // 2. Metadata Grid
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);

    // Row 1
    doc.text('FECHA/HORA:', 15, 43);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date(asiento.fechaAsiento).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }), 45, 43);

    doc.setFont('Helvetica', 'bold');
    doc.text('REFERENCIA:', 115, 43);
    doc.setFont('Courier', 'bold'); // monospace for reference
    doc.text(asiento.referencia || '—', 143, 43);
    doc.setFont('Helvetica', 'normal');

    // Row 2 (Glosa/Concepto)
    doc.setFont('Helvetica', 'bold');
    doc.text('CONCEPTO / GLOSA:', 15, 50);
    doc.setFont('Helvetica', 'normal');
    const glosaText = doc.splitTextToSize(asiento.glosa, 150);
    doc.text(glosaText, 45, 50);

    // Y Position after metadata (Glosa height is dynamic)
    const glosaHeight = glosaText.length * 4;
    const tableStartY = Math.max(55, 50 + glosaHeight);

    // 3. Table of Accounts (Debe/Haber)
    const tableHeaders = [['Código', 'Cuenta Contable', 'Debe (Débito)', 'Haber (Crédito)']];
    
    // Sort details: DEBITs first, then CREDITs
    const sortedDetalles = [...asiento.detalles].sort((a, b) => {
      if (a.tipoAsiento === 'DEBITO' && b.tipoAsiento === 'CREDITO') return -1;
      if (a.tipoAsiento === 'CREDITO' && b.tipoAsiento === 'DEBITO') return 1;
      return a.codigoContable.localeCompare(b.codigoContable);
    });

    const tableRows = sortedDetalles.map(d => [
      d.codigoContable,
      d.nombreCuenta,
      d.tipoAsiento === 'DEBITO' ? `$ ${d.monto.toFixed(2)}` : '',
      d.tipoAsiento === 'CREDITO' ? `$ ${d.monto.toFixed(2)}` : ''
    ]);

    // Calculate totals
    const totalDebe = sortedDetalles
      .filter(d => d.tipoAsiento === 'DEBITO')
      .reduce((sum, curr) => sum + curr.monto, 0);
    const totalHaber = sortedDetalles
      .filter(d => d.tipoAsiento === 'CREDITO')
      .reduce((sum, curr) => sum + curr.monto, 0);

    // Append totals row
    tableRows.push([
      'TOTALES',
      'CUADRE DE PARTIDA DOBLE',
      `$ ${totalDebe.toFixed(2)}`,
      `$ ${totalHaber.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: tableHeaders,
      body: tableRows,
      margin: { left: 15, right: 15 },
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor as [number, number, number],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 35, font: 'Courier', fontStyle: 'bold' },
        1: { cellWidth: 90 },
        2: { cellWidth: 27, halign: 'right', font: 'Courier' },
        3: { cellWidth: 28, halign: 'right', font: 'Courier' }
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5
      },
      didParseCell: (data) => {
        // Highlight Totals row at the end
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fillColor = [241, 245, 249]; // slate-100
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42]; // slate-900
        }
      }
    });

    // 4. Responsibility Signatures at the bottom
    // Get last Y position from table
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    // Ensure signatures don't overflow the page, otherwise create a new page
    const pageHeight = doc.internal.pageSize.height;
    const sigY = (finalY + 35 > pageHeight) ? 50 : Math.max(finalY + 25, 140);
    
    if (finalY + 35 > pageHeight) {
      doc.addPage();
    }

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.5);

    // Signature 1: Elaborado
    doc.line(25, sigY, 85, sigY);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('ELABORADO POR', 55, sigY + 4.5, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text('Firma del Contador / Auxiliar', 55, sigY + 8, { align: 'center' });

    // Signature 2: Aprobado
    doc.line(125, sigY, 185, sigY);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('APROBADO POR', 155, sigY + 4.5, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text('Firma de Gerencia / Auditoría', 155, sigY + 8, { align: 'center' });

    // 5. Footer Page Numbers & Inmutabilidad Note
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('Este documento contable ha sido emitido de manera electrónica y es inmutable por auditoría de la SEPS.', 15, pageHeight - 12);
    doc.text('Cooperativa de Ahorro y Crédito ITQ | Licencia Corporativa.', 15, pageHeight - 8);
    doc.text(`Pág. 1 de 1`, 195, pageHeight - 8, { align: 'right' });

    // Trigger download
    doc.save(`comprobante_asiento_${asiento.numeroAsiento}.pdf`);

    setToastMessage({
      text: `Comprobante de asiento ${asiento.numeroAsiento} generado en PDF con éxito.`,
      type: 'success'
    });
  };

  // Load Libro Diario
  const loadLibroDiario = async (page: number = 0) => {
    setLoadingDiario(true);
    try {
      const res = await api.get(`/contabilidad/diario?desde=${fechaDesdeDiario}&hasta=${fechaHastaDiario}&page=${page}&size=10`);
      setAsientos(res.data.content || []);
      setTotalPagesDiario(res.data.totalPages || 0);
      setTotalElementsDiario(res.data.totalElements || 0);
      setCurrentPageDiario(page);
      setExpandedAsientos({}); // Reset expansions
    } catch (err) {
      console.error('Error cargando libro diario:', err);
    } finally {
      setLoadingDiario(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'DIARIO') {
      loadLibroDiario(0);
    } else if (activeSection === 'RESULTADOS') {
      loadEstadoResultados();
    } else if (activeSection === 'BALANCE') {
      loadBalanceGeneral();
    } else if (activeSection === 'CIERRES') {
      loadCierresHistoricos();
    }
  }, [activeSection]);

  // Load Estado de Resultados
  const loadEstadoResultados = async () => {
    setLoadingResultados(true);
    setErrorResultados(null);
    try {
      const res = await api.get(
        `/contabilidad/estado-resultados?desde=${fechaDesdeResultados}&hasta=${fechaHastaResultados}`
      );
      setResultadosData(res.data);
    } catch (err: any) {
      console.error('Error cargando estado de resultados:', err);
      setErrorResultados(err.response?.data || 'Error al recuperar el Estado de Resultados.');
      setResultadosData(null);
    } finally {
      setLoadingResultados(false);
    }
  };

  // Load Balance General
  const loadBalanceGeneral = async () => {
    setLoadingBalance(true);
    setErrorBalance(null);
    try {
      const res = await api.get(
        `/contabilidad/balance-general?fechaCorte=${fechaCorteBalance}`
      );
      setBalanceData(res.data);
    } catch (err: any) {
      console.error('Error cargando balance general:', err);
      setErrorBalance(err.response?.data || 'Error al recuperar el Balance General.');
      setBalanceData(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  // Load Cierres Fiscales Historicos
  const loadCierresHistoricos = async () => {
    setLoadingCierres(true);
    setErrorCierres(null);
    try {
      const res = await api.get('/contabilidad/cierres');
      setCierresHistoricos(res.data || []);
    } catch (err: any) {
      console.error('Error cargando cierres historicos:', err);
      setErrorCierres(err.response?.data || 'Error al recuperar el historial de cierres.');
      setCierresHistoricos([]);
    } finally {
      setLoadingCierres(false);
    }
  };

  // Handle ejecutar cierre fiscal
  const handleEjecutarCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cierreCuentaPatrimonial) {
      setErrorCierreModal('Debe seleccionar una cuenta patrimonial de destino.');
      return;
    }
    const fraseEsperada = `CERRAR ${cierreAnio}`;
    if (cierreConfirmacion !== fraseEsperada) {
      setErrorCierreModal(`La frase de confirmación debe ser exactamente: "${fraseEsperada}"`);
      return;
    }
    setCierreProcesando(true);
    setErrorCierreModal(null);
    try {
      await api.post('/contabilidad/cierre', {
        anioFiscal: cierreAnio,
        cuentaPatrimonialId: cierreCuentaPatrimonial.id,
        confirmacion: cierreConfirmacion
      });
      setToastMessage({
        text: `El Cierre Fiscal del año ${cierreAnio} se ejecutó con éxito.`,
        type: 'success'
      });
      setShowCierreModal(false);
      setCierreConfirmacion('');
      setCierreCuentaPatrimonial(null);
      setBusquedaCuentaCierre('');
      // Reload closures and accounts plan
      loadCierresHistoricos();
      loadPlanCuentas();
    } catch (err: any) {
      console.error('Error ejecutando cierre fiscal:', err);
      setErrorCierreModal(err.response?.data || 'Error al ejecutar el Cierre Fiscal Anual.');
    } finally {
      setCierreProcesando(false);
    }
  };

  // Descargar comprobante de cierre en PDF
  const descargarComprobanteCierre = async (cierre: any) => {
    try {
      const res = await api.get(`/contabilidad/asiento/AS-CIERRE-${cierre.anioFiscal}`);
      if (res.data) {
        imprimirComprobante(res.data);
        setToastMessage({
          text: `Comprobante de Cierre Fiscal ${cierre.anioFiscal} descargado con éxito.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error('Error descargando comprobante de cierre:', err);
      setToastMessage({
        text: err.response?.data || 'Error al descargar el comprobante contable de cierre.',
        type: 'error'
      });
    }
  };

  // Exportar Estado de Resultados a PDF
  const exportarEstadoResultadosPDF = () => {
    if (!resultadosData) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [0, 84, 166]; // #0054A6
    const secondaryColor = [71, 85, 105]; // Slate

    // 1. Cabecera Institucional
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('COOPERATIVA DE AHORRO Y CRÉDITO ITQ', 15, 20);

    doc.setFontSize(10);
    doc.text('ESTADO DE RESULTADOS (PÉRDIDAS Y GANANCIAS)', 15, 25);

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`PERIODO: DESDE ${fechaDesdeResultados} HASTA ${fechaHastaResultados}`, 15, 30);
    doc.text('MONEDA: DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA (USD)', 15, 34);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 38, 195, 38);

    // Track group accounts to style them dynamically
    const groupAccounts = new Set<string>();

    // 2. Preparar filas
    const tableHeaders = [['Código', 'Cuenta Contable', 'Monto', 'Análisis %']];
    const tableRows: any[] = [];

    const totalIngresos = resultadosData.totalIngresos || 1;

    // Ingresos Section
    tableRows.push(['', '1. INGRESOS', '', '']);
    filterVisibleAccounts(resultadosData.ingresos)
      .forEach((acc: any) => {
        if (!acc.esMovimiento) groupAccounts.add(acc.codigoContable);
        const depth = (acc.codigoContable.match(/\./g) || []).length;
        const indentation = '   '.repeat(depth) + (acc.esMovimiento ? '   ' : '');
        const pct = (acc.balance / totalIngresos) * 100;
        tableRows.push([
          acc.codigoContable,
          indentation + acc.nombreCuenta,
          `$ ${acc.balance.toFixed(2)}`,
          `${pct.toFixed(1)}%`
        ]);
      });
    tableRows.push(['', 'TOTAL INGRESOS', `$ ${resultadosData.totalIngresos.toFixed(2)}`, '100.0%']);

    // Gastos Section
    tableRows.push(['', '', '', '']); // spacing
    tableRows.push(['', '2. GASTOS', '', '']);
    filterVisibleAccounts(resultadosData.gastos)
      .forEach((acc: any) => {
        if (!acc.esMovimiento) groupAccounts.add(acc.codigoContable);
        const depth = (acc.codigoContable.match(/\./g) || []).length;
        const indentation = '   '.repeat(depth) + (acc.esMovimiento ? '   ' : '');
        const pct = (acc.balance / totalIngresos) * 100;
        tableRows.push([
          acc.codigoContable,
          indentation + acc.nombreCuenta,
          `$ ${acc.balance.toFixed(2)}`,
          `${pct.toFixed(1)}%`
        ]);
      });
    
    const totalGastosPct = (resultadosData.totalGastos / totalIngresos) * 100;
    tableRows.push(['', 'TOTAL GASTOS', `$ ${resultadosData.totalGastos.toFixed(2)}`, `${totalGastosPct.toFixed(1)}%`]);

    // Resultado Neto
    tableRows.push(['', '', '', '']); // spacing
    const netPct = (resultadosData.resultadoNeto / totalIngresos) * 100;
    tableRows.push([
      'RESULTADO',
      resultadosData.resultadoNeto >= 0 ? 'EXCEDENTE NETO DEL EJERCICIO (UTILIDAD)' : 'DÉFICIT NETO DEL EJERCICIO (PÉRDIDA)',
      `$ ${resultadosData.resultadoNeto.toFixed(2)}`,
      `${netPct.toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: 42,
      head: tableHeaders,
      body: tableRows,
      margin: { left: 15, right: 15 },
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor as [number, number, number],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 30, font: 'Courier', fontStyle: 'bold' },
        1: { cellWidth: 100 },
        2: { cellWidth: 25, halign: 'right', font: 'Courier' },
        3: { cellWidth: 25, halign: 'right', font: 'Courier' }
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      didParseCell: (data) => {
        const code = data.row.cells[0].text[0] || '';
        const rowText = data.row.cells[1].text[0] || '';
        
        if (
          rowText.includes('1. INGRESOS') || 
          rowText.includes('2. GASTOS') || 
          rowText.includes('TOTAL INGRESOS') || 
          rowText.includes('TOTAL GASTOS') || 
          code === 'RESULTADO'
        ) {
          data.cell.styles.fillColor = [241, 245, 249]; // slate-100
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42]; // slate-900
        } else if (groupAccounts.has(code)) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42]; // slate-900
        } else {
          data.cell.styles.fontStyle = 'normal';
          data.cell.styles.textColor = [71, 85, 105]; // slate-600
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    const pageHeight = doc.internal.pageSize.height;
    const sigY = (finalY + 35 > pageHeight) ? 50 : Math.max(finalY + 25, 140);
    
    if (finalY + 35 > pageHeight) {
      doc.addPage();
    }

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.5);

    // Signature 1: Contador
    doc.line(25, sigY, 85, sigY);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('CONTADOR GENERAL', 55, sigY + 4.5, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text('Firma de Responsabilidad', 55, sigY + 8, { align: 'center' });

    // Signature 2: Gerente General
    doc.line(125, sigY, 185, sigY);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('GERENTE GENERAL', 155, sigY + 4.5, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text('Firma de Autorización', 155, sigY + 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('Este documento contable ha sido emitido de manera electrónica y es inmutable por auditoría de la SEPS.', 15, pageHeight - 12);
    doc.text('Cooperativa de Ahorro y Crédito ITQ | Licencia Corporativa.', 15, pageHeight - 8);
    doc.text(`Pág. 1 de 1`, 195, pageHeight - 8, { align: 'right' });

    doc.save(`estado_resultados_${fechaDesdeResultados}_${fechaHastaResultados}.pdf`);

    setToastMessage({
      text: 'Estado de Resultados exportado a PDF correctamente.',
      type: 'success'
    });
  };

  // Exportar Balance General a PDF
  const exportarBalanceGeneralPDF = () => {
    if (!balanceData) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [0, 84, 166]; // #0054A6
    const secondaryColor = [71, 85, 105]; // Slate

    // 1. Cabecera
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('COOPERATIVA DE AHORRO Y CRÉDITO ITQ', 15, 20);

    doc.setFontSize(10);
    doc.text('BALANCE GENERAL (ESTADO DE SITUACIÓN FINANCIERA)', 15, 25);

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`FECHA DE CORTE: ${fechaCorteBalance}`, 15, 30);
    doc.text('MONEDA: DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA (USD)', 15, 34);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 38, 195, 38);

    // Track group accounts to style them dynamically
    const groupAccounts = new Set<string>();

    // 2. Preparar filas
    const tableHeaders = [['Código', 'Cuenta Contable', 'Monto', 'Análisis %']];
    const tableRows: any[] = [];

    const totalActivos = balanceData.totalActivos || 1;
    const totalPasivoPatrimonio = balanceData.totalPasivoPatrimonio || 1;

    // Activos Section
    tableRows.push(['', '1. ACTIVOS', '', '']);
    filterVisibleAccounts(balanceData.activos)
      .forEach((acc: any) => {
        if (!acc.esMovimiento) groupAccounts.add(acc.codigoContable);
        const depth = (acc.codigoContable.match(/\./g) || []).length;
        const indentation = '   '.repeat(depth) + (acc.esMovimiento ? '   ' : '');
        const pct = (acc.balance / totalActivos) * 100;
        tableRows.push([
          acc.codigoContable,
          indentation + acc.nombreCuenta,
          `$ ${acc.balance.toFixed(2)}`,
          `${pct.toFixed(1)}%`
        ]);
      });
    tableRows.push(['', 'TOTAL ACTIVOS', `$ ${balanceData.totalActivos.toFixed(2)}`, '100.0%']);

    // Pasivos Section
    tableRows.push(['', '', '', '']); // spacing
    tableRows.push(['', '2. PASIVOS', '', '']);
    filterVisibleAccounts(balanceData.pasivos)
      .forEach((acc: any) => {
        if (!acc.esMovimiento) groupAccounts.add(acc.codigoContable);
        const depth = (acc.codigoContable.match(/\./g) || []).length;
        const indentation = '   '.repeat(depth) + (acc.esMovimiento ? '   ' : '');
        const pct = (acc.balance / totalPasivoPatrimonio) * 100;
        tableRows.push([
          acc.codigoContable,
          indentation + acc.nombreCuenta,
          `$ ${acc.balance.toFixed(2)}`,
          `${pct.toFixed(1)}%`
        ]);
      });
    const totalPasivosPct = (balanceData.totalPasivos / totalPasivoPatrimonio) * 100;
    tableRows.push(['', 'TOTAL PASIVOS', `$ ${balanceData.totalPasivos.toFixed(2)}`, `${totalPasivosPct.toFixed(1)}%`]);

    // Patrimonio Section
    tableRows.push(['', '', '', '']); // spacing
    tableRows.push(['', '3. PATRIMONIO', '', '']);
    filterVisibleAccounts(balanceData.patrimonio, '3.99', balanceData.resultadoEjercicio)
      .forEach((acc: any) => {
        if (!acc.esMovimiento) groupAccounts.add(acc.codigoContable);
        const depth = (acc.codigoContable.match(/\./g) || []).length;
        const indentation = '   '.repeat(depth) + (acc.esMovimiento ? '   ' : '');
        const pct = (acc.balance / totalPasivoPatrimonio) * 100;
        tableRows.push([
          acc.codigoContable,
          indentation + acc.nombreCuenta,
          `$ ${acc.balance.toFixed(2)}`,
          `${pct.toFixed(1)}%`
        ]);
      });
    const totalPatrimonioPct = (balanceData.totalPatrimonio / totalPasivoPatrimonio) * 100;
    tableRows.push(['', 'TOTAL PATRIMONIO', `$ ${balanceData.totalPatrimonio.toFixed(2)}`, `${totalPatrimonioPct.toFixed(1)}%`]);

    // Totales Finales & Cuadre
    tableRows.push(['', '', '', '']); // spacing
    tableRows.push(['', 'TOTAL PASIVO + PATRIMONIO', `$ ${balanceData.totalPasivoPatrimonio.toFixed(2)}`, '100.0%']);
    
    // Cuadre Row
    tableRows.push([
      'ESTADO',
      balanceData.cuadrado ? 'CUADRADO (ACTIVO = PASIVO + PATRIMONIO)' : 'DESCUADRADO',
      `DIFERENCIA: $ ${(balanceData.totalActivos - balanceData.totalPasivoPatrimonio).toFixed(2)}`,
      ''
    ]);

    autoTable(doc, {
      startY: 42,
      head: tableHeaders,
      body: tableRows,
      margin: { left: 15, right: 15 },
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor as [number, number, number],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 30, font: 'Courier', fontStyle: 'bold' },
        1: { cellWidth: 100 },
        2: { cellWidth: 25, halign: 'right', font: 'Courier' },
        3: { cellWidth: 25, halign: 'right', font: 'Courier' }
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      didParseCell: (data) => {
        const code = data.row.cells[0].text[0] || '';
        const rowText = data.row.cells[1].text[0] || '';
        if (
          rowText.includes('1. ACTIVOS') || 
          rowText.includes('2. PASIVOS') || 
          rowText.includes('3. PATRIMONIO') || 
          rowText.includes('TOTAL ACTIVOS') || 
          rowText.includes('TOTAL PASIVOS') || 
          rowText.includes('TOTAL PATRIMONIO') || 
          rowText.includes('TOTAL PASIVO + PATRIMONIO') || 
          code === 'ESTADO'
        ) {
          data.cell.styles.fillColor = [241, 245, 249]; // slate-100
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42]; // slate-900
        } else if (groupAccounts.has(code)) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42]; // slate-900
        } else {
          data.cell.styles.fontStyle = 'normal';
          data.cell.styles.textColor = [71, 85, 105]; // slate-600
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    const pageHeight = doc.internal.pageSize.height;
    const sigY = (finalY + 35 > pageHeight) ? 50 : Math.max(finalY + 25, 140);
    
    if (finalY + 35 > pageHeight) {
      doc.addPage();
    }

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.5);

    // Signature 1: Contador
    doc.line(25, sigY, 85, sigY);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('CONTADOR GENERAL', 55, sigY + 4.5, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text('Firma de Responsabilidad', 55, sigY + 8, { align: 'center' });

    // Signature 2: Gerente General
    doc.line(125, sigY, 185, sigY);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('GERENTE GENERAL', 155, sigY + 4.5, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text('Firma de Autorización', 155, sigY + 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('Este documento contable ha sido emitido de manera electrónica y es inmutable por auditoría de la SEPS.', 15, pageHeight - 12);
    doc.text('Cooperativa de Ahorro y Crédito ITQ | Licencia Corporativa.', 15, pageHeight - 8);
    doc.text(`Pág. 1 de 1`, 195, pageHeight - 8, { align: 'right' });

    doc.save(`balance_general_${fechaCorteBalance}.pdf`);

    setToastMessage({
      text: 'Balance General exportado a PDF correctamente.',
      type: 'success'
    });
  };

  // Load Libro Mayor
  const loadLibroMayor = async (page: number = 0) => {
    if (!cuentaMayorSeleccionada) return;
    setLoadingMayor(true);
    setErrorMayor(null);
    try {
      const res = await api.get(
        `/contabilidad/mayor?cuentaId=${cuentaMayorSeleccionada.id}&desde=${fechaDesdeMayor}&hasta=${fechaHastaMayor}&page=${page}&size=50`
      );
      setMayorData(res.data);
      setCurrentPageMayor(page);
      setTotalPagesMayor(res.data.totalPages || 1);
      setTotalElementsMayor(res.data.totalElements || 0);
    } catch (err: any) {
      console.error('Error cargando libro mayor:', err);
      setErrorMayor(err.response?.data || 'Error al recuperar movimientos del mayor.');
      setMayorData(null);
    } finally {
      setLoadingMayor(false);
    }
  };

  // Exportar Mayor a CSV (Rango completo sin paginar)
  const exportarMayorCSV = async () => {
    if (!cuentaMayorSeleccionada) return;
    setLoadingMayor(true);
    try {
      const res = await api.get(
        `/contabilidad/mayor?cuentaId=${cuentaMayorSeleccionada.id}&desde=${fechaDesdeMayor}&hasta=${fechaHastaMayor}`
      );
      
      const data: LibroMayorData = res.data;
      
      // Generación de CSV
      let csvContent = '\uFEFF'; // UTF-8 BOM
      
      // Encabezado informativo de la cuenta
      csvContent += `LIBRO MAYOR DE CONTABILIDAD;;;;;;\n`;
      csvContent += `COOPERATIVA DE AHORRO Y CRÉDITO ITQ;;;;;;\n`;
      csvContent += `CUENTA CONTABLE:;${data.codigoContable} - ${data.nombreCuenta};;;;;\n`;
      csvContent += `TIPO DE NATURALEZA:;${data.tipoCuenta} (${['ACTIVO', 'GASTO'].includes(data.tipoCuenta) ? 'Deudora' : 'Acreedora'});;;;;\n`;
      csvContent += `PERIODO DESDE:;${fechaDesdeMayor};HASTA:;${fechaHastaMayor};;;\n`;
      csvContent += `SALDO INICIAL DEL PERIODO:;$${data.saldoInicial.toFixed(2)};;;;;\n`;
      csvContent += `SALDO FINAL DEL PERIODO:;$${data.saldoFinal.toFixed(2)};;;;;\n\n`;
      
      // Columnas de la tabla
      csvContent += `Fecha;Nro. Asiento;Referencia;Concepto;Debe;Haber;Saldo Acumulado\n`;
      
      // Fila inicial de saldo
      csvContent += `${fechaDesdeMayor};;[SALDO INICIAL DEL PERIODO];;;;${data.saldoInicial.toFixed(2)}\n`;
      
      // Filas de movimientos
      data.movimientos.forEach(m => {
        const fechaFormateada = new Date(m.fecha).toLocaleString('es-ES', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        csvContent += `"${fechaFormateada}";"${m.numeroAsiento}";"${m.referencia}";"${m.concepto.replace(/"/g, '""')}";${m.debe.toFixed(2)};${m.haber.toFixed(2)};${m.saldoAcumulado.toFixed(2)}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mayor_${data.codigoContable}_${fechaDesdeMayor}_a_${fechaHastaMayor}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setToastMessage({
        text: `Libro Mayor de ${data.nombreCuenta} exportado en CSV con éxito.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error al exportar libro mayor:', err);
      setToastMessage({
        text: `Error al exportar el mayor contable: ${err.response?.data || err.message}`,
        type: 'error'
      });
    } finally {
      setLoadingMayor(false);
    }
  };

  // Abrir el detalle del asiento contable en modal
  const abrirDetalleAsiento = async (numeroAsiento: string) => {
    setSelectedAsientoNumero(numeroAsiento);
    setShowAsientoModal(true);
    setLoadingAsientoDetail(true);
    setErrorAsientoDetail(null);
    setSelectedAsientoData(null);
    try {
      const res = await api.get(`/contabilidad/asiento/${numeroAsiento}`);
      setSelectedAsientoData(res.data);
    } catch (err: any) {
      console.error('Error al cargar detalle del asiento:', err);
      setErrorAsientoDetail(err.response?.data || 'Error al recuperar detalles del asiento.');
    } finally {
      setLoadingAsientoDetail(false);
    }
  };

  // Toggle expanded nodes in tree
  const toggleNode = (code: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  // Toggle expanded asientos in journal
  const toggleAsiento = (id: number) => {
    setExpandedAsientos(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Colors based on account type
  const getTipoCuentaStyle = (tipo: string) => {
    switch (tipo) {
      case 'ACTIVO':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'PASIVO':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'PATRIMONIO':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'INGRESO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'GASTO':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  // Filter accounts list for mayor autocomplete search
  const filteredCuentasMayor = useMemo(() => {
    if (!busquedaCuentaMayor.trim()) {
      // Only show leaf nodes (movimiento) by default
      return planCuentas.filter(c => c.esMovimiento).slice(0, 8);
    }
    return planCuentas.filter(
      c => c.esMovimiento && 
      (c.nombreCuenta.toLowerCase().includes(busquedaCuentaMayor.toLowerCase()) || 
       c.codigoContable.includes(busquedaCuentaMayor))
    ).slice(0, 8);
  }, [planCuentas, busquedaCuentaMayor]);

  // Filter accounts list for cierres patrimonio autocomplete search
  const filteredCuentasPatrimonio = useMemo(() => {
    const patrimonioLeafs = planCuentas.filter(c => c.tipoCuenta === 'PATRIMONIO' && c.esMovimiento && c.estado === 'ACTIVO');
    if (!busquedaCuentaCierre.trim()) {
      return patrimonioLeafs.slice(0, 8);
    }
    return patrimonioLeafs.filter(
      c => c.nombreCuenta.toLowerCase().includes(busquedaCuentaCierre.toLowerCase()) || 
           c.codigoContable.includes(busquedaCuentaCierre)
    ).slice(0, 8);
  }, [planCuentas, busquedaCuentaCierre]);

  // Render Plan de Cuentas Tree Node recursively
  const renderAccountNode = (node: AccountNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = !!expandedNodes[node.codigoContable];
    const isInactive = node.estado === 'INACTIVO';
    
    return (
      <div key={node.id} className="select-none">
        <div 
          onClick={() => hasChildren && toggleNode(node.codigoContable)}
          className={`group/row flex items-center justify-between py-2 px-4 rounded-xl border border-transparent transition-all ${
            hasChildren ? 'cursor-pointer hover:bg-slate-50/75' : ''
          } ${isInactive ? 'opacity-60 bg-slate-50/20' : ''}`}
          style={{ paddingLeft: `${Math.max(16, depth * 24)}px` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {hasChildren ? (
              <span className="text-slate-400 shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
            ) : (
              <span className="w-4 shrink-0" />
            )}

            {/* Account type icon distinction */}
            {node.esMovimiento ? (
              <Coins className="h-4 w-4 text-emerald-600/80 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-[#0054A6]/80 fill-blue-50/10 shrink-0" />
            )}
            
            <span className="font-mono text-xs font-bold text-slate-500 shrink-0">
              {node.codigoContable}
            </span>
            <span className={`text-[12px] truncate ${node.esMovimiento ? 'font-medium text-slate-700' : 'font-extrabold text-slate-800'} ${isInactive ? 'line-through italic text-slate-400' : ''}`}>
              {node.nombreCuenta}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Hover Actions Group */}
            <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150 mr-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setParentAccountForNewSub(node);
                  setShowAddSubcuentaModal(true);
                }}
                title="Agregar Subcuenta"
                className="p-1 hover:bg-slate-100 border border-slate-200/50 rounded-lg text-slate-500 hover:text-[#0054A6] transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleEstadoCuenta(node);
                }}
                disabled={deactivatingId === node.id}
                title={node.estado === 'ACTIVO' ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                className={`p-1 border border-slate-200/50 rounded-lg transition-colors cursor-pointer ${
                  node.estado === 'ACTIVO'
                    ? 'hover:bg-rose-50 text-rose-500 hover:text-rose-700'
                    : 'hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700'
                }`}
              >
                {deactivatingId === node.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : node.estado === 'ACTIVO' ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {isInactive && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md border border-rose-100 bg-rose-50 text-rose-700 tracking-wider uppercase shrink-0">
                Inactivo
              </span>
            )}
            
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border tracking-widest uppercase shrink-0 ${getTipoCuentaStyle(node.tipoCuenta)}`}>
              {node.tipoCuenta}
            </span>
            {!node.esMovimiento && (
              <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-650 tracking-wider uppercase shrink-0">
                Grupo
              </span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="overflow-hidden animate-slide-down border-l border-slate-100/70 ml-5 pl-1">
            {node.children.map(child => renderAccountNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in relative w-full space-y-6">
      
      {/* Tabs Navigation (Navbar Contabilidad) */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-[1.5rem] border border-slate-100 overflow-x-auto scrollbar-none gap-1">
        <button
          type="button"
          onClick={() => setSearchParams({ section: 'plan' })}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer shrink-0 ${
            activeSection === 'PLAN'
              ? 'bg-white text-[#0054A6] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Folder className="h-4 w-4" />
          <span>Plan de Cuentas</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ section: 'diario' })}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer shrink-0 ${
            activeSection === 'DIARIO'
              ? 'bg-white text-[#0054A6] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Libro Diario</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ section: 'mayor' })}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer shrink-0 ${
            activeSection === 'MAYOR'
              ? 'bg-white text-[#0054A6] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Libro Mayor</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ section: 'resultados' })}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer shrink-0 ${
            activeSection === 'RESULTADOS'
              ? 'bg-white text-[#0054A6] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Estado de Resultados</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ section: 'balance' })}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer shrink-0 ${
            activeSection === 'BALANCE'
              ? 'bg-white text-[#0054A6] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Balance General</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ section: 'cierres' })}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer shrink-0 ${
            activeSection === 'CIERRES'
              ? 'bg-white text-[#0054A6] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Cierres Fiscales</span>
        </button>
      </div>

      {/* SECCIÓN 1: PLAN DE CUENTAS */}
      {activeSection === 'PLAN' && (
        <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-6 animate-scale-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-tight flex items-center gap-2">
                Catálogo Jerárquico del Plan de Cuentas
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Estructura dinámica de cuentas y subcuentas del inquilino activo.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Button
                onClick={exportarCSV}
                className="bg-white hover:bg-slate-55 text-slate-700 font-bold border border-slate-200 h-9.5 px-4 rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                Exportar CSV
              </Button>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Filtrar por código o nombre..."
                  value={filtroPlan}
                  onChange={e => setFiltroPlan(e.target.value)}
                  className="pl-9 pr-4 h-9.5 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          {loadingPlan ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#0054A6]" />
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Cargando catálogo contable...</span>
            </div>
          ) : treeNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center select-none">
              <span className="h-10 w-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-350 text-base font-bold mb-3">!</span>
              <p className="text-xs font-bold text-slate-550">No se encontraron cuentas contables</p>
              <p className="text-[10px] text-slate-400 mt-1">Verifica el filtro o asegúrate de que el catálogo esté sembrado.</p>
            </div>
          ) : (
            <div className="space-y-1 overflow-x-auto min-h-[400px]">
              {treeNodes.map(node => renderAccountNode(node))}
            </div>
          )}
        </Card>
      )}

      {/* SECCIÓN 2: LIBRO DIARIO */}
      {activeSection === 'DIARIO' && (
        <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-6 animate-scale-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-tight">
                Auditoría Cronológica del Libro Diario
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Listado histórico de asientos contables de la cooperativa estructurados bajo partida doble.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3.5">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-1">
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fechaDesdeDiario}
                    onChange={e => setFechaDesdeDiario(e.target.value)}
                    className="pl-8 pr-3 h-8.5 text-[11px] font-bold text-slate-700 bg-transparent border-0 focus:outline-none"
                  />
                </div>
                <span className="text-[9px] font-black text-slate-355 px-1">A</span>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fechaHastaDiario}
                    onChange={e => setFechaHastaDiario(e.target.value)}
                    className="pl-8 pr-3 h-8.5 text-[11px] font-bold text-slate-700 bg-transparent border-0 focus:outline-none"
                  />
                </div>
              </div>

              <Button
                onClick={() => loadLibroDiario(0)}
                disabled={loadingDiario}
                className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold h-10.5 px-5 rounded-2xl text-xs cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
              >
                {loadingDiario ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
                Filtrar Diario
              </Button>
            </div>
          </div>

          {loadingDiario ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#0054A6]" />
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Buscando asientos en el rango...</span>
            </div>
          ) : asientos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center select-none">
              <span className="h-10 w-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-350 text-base font-bold mb-3">!</span>
              <p className="text-xs font-bold text-slate-550">No hay asientos registrados</p>
              <p className="text-[10px] text-slate-400 mt-1">No se encontraron movimientos contables en el rango de fechas provisto.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden border border-slate-100 rounded-3xl">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold tracking-wider text-left uppercase">
                      <th className="py-3 px-4 w-10"></th>
                      <th className="py-3 px-4 w-36">Fecha / Hora</th>
                      <th className="py-3 px-4 w-36">Nro. Asiento</th>
                      <th className="py-3 px-4 w-40">Referencia</th>
                      <th className="py-3 px-4">Concepto / Glosa</th>
                      <th className="py-3 px-4 text-right w-36">Monto Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asientos.map(asiento => {
                      const isExpanded = !!expandedAsientos[asiento.id];
                      const totalDebe = asiento.detalles
                        .filter(d => d.tipoAsiento === 'DEBITO')
                        .reduce((sum, curr) => sum + curr.monto, 0);
                      const totalHaber = asiento.detalles
                        .filter(d => d.tipoAsiento === 'CREDITO')
                        .reduce((sum, curr) => sum + curr.monto, 0);
                      const isCuadrado = Math.abs(totalDebe - totalHaber) < 0.01;

                      return (
                        <React.Fragment key={asiento.id}>
                          {/* Fila Principal */}
                          <tr 
                            onClick={() => toggleAsiento(asiento.id)}
                            className={`border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50/50 ${
                              isExpanded ? 'bg-slate-50/30' : ''
                            }`}
                          >
                            <td className="py-4 px-4 text-slate-400">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-600">
                              {new Date(asiento.fechaAsiento).toLocaleDateString('es-ES', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-slate-700 uppercase">
                              {asiento.numeroAsiento}
                            </td>
                            <td className="py-4 px-4 font-mono text-[11px] text-slate-550 font-bold truncate max-w-[140px]" title={asiento.referencia}>
                              {asiento.referencia || '—'}
                            </td>
                            <td className="py-4 px-4 text-slate-800 font-medium truncate max-w-[280px]" title={asiento.glosa}>
                              {asiento.glosa}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-slate-800 font-mono">
                              ${(asiento.totalAsiento ?? totalDebe).toFixed(2)}
                            </td>
                          </tr>

                          {/* Fila Expandida (Detalles de Partida Doble) */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="py-4 px-8 bg-slate-50/40 border-b border-slate-100">
                                <div className="space-y-4 max-w-4xl mx-auto border border-slate-100 rounded-2xl bg-white p-5 shadow-sm animate-slide-down">
                                  <div className="flex justify-between items-center pb-1">
                                    <span className="text-[10px] font-bold text-[#0054A6] uppercase tracking-wider block">Partida Doble Desglosada</span>
                                    
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        imprimirComprobante(asiento);
                                      }}
                                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 h-8 px-3 rounded-xl text-[10px] shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-slate-500" />
                                      Imprimir Comprobante
                                    </Button>
                                  </div>
                                  
                                  <div className="space-y-2.5">
                                    {/* Cabecera del desglose */}
                                    <div className="grid grid-cols-12 gap-2 text-[9px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-1.5 font-sans">
                                      <div className="col-span-3">Código Contable</div>
                                      <div className="col-span-5">Cuenta Contable</div>
                                      <div className="col-span-2 text-right">Debe (Débito)</div>
                                      <div className="col-span-2 text-right">Haber (Crédito)</div>
                                    </div>

                                    {/* Renglones */}
                                    {asiento.detalles.map(d => {
                                      const esDebito = d.tipoAsiento === 'DEBITO';
                                      return (
                                        <div key={d.id} className="grid grid-cols-12 gap-2 text-[11px] py-1 border-b border-slate-50 last:border-0 items-center">
                                          <div className="col-span-3 font-mono font-bold text-slate-500">{d.codigoContable}</div>
                                          <div className={`col-span-5 font-semibold text-slate-700 ${!esDebito ? 'pl-4' : ''}`}>
                                            {d.nombreCuenta}
                                          </div>
                                          <div className="col-span-2 text-right font-mono font-bold text-emerald-600">
                                            {esDebito ? `$${d.monto.toFixed(2)}` : ''}
                                          </div>
                                          <div className="col-span-2 text-right font-mono font-bold text-rose-600">
                                            {!esDebito ? `$${d.monto.toFixed(2)}` : ''}
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Totalizadores Desglose */}
                                    <div className="grid grid-cols-12 gap-2 text-[11px] font-black border-t border-slate-200/60 pt-3.5 items-center">
                                      <div className="col-span-8 text-right text-slate-450 uppercase tracking-widest text-[9px] font-sans">Total Cuadratura:</div>
                                      <div className="col-span-2 text-right font-mono font-black text-slate-800">${totalDebe.toFixed(2)}</div>
                                      <div className="col-span-2 text-right font-mono font-black text-slate-800">${totalHaber.toFixed(2)}</div>
                                    </div>
                                  </div>

                                  {/* Cuadro de verificación del balance */}
                                  <div className="pt-2 flex justify-between items-center">
                                    <div className="text-[10px] text-slate-400 font-medium">
                                      Identificador Interno: <strong className="font-mono font-semibold text-slate-655">AS-{asiento.id}</strong>
                                    </div>
                                    {isCuadrado ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100 uppercase tracking-widest">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Asiento Cuadrado
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-100 uppercase tracking-widest">
                                        <AlertCircle className="h-3 w-3" />
                                        Asiento Descuadrado
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Controles de Paginación Server-Side */}
              {totalPagesDiario > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 px-1">
                  <span className="text-[10.5px] font-bold text-slate-450 uppercase tracking-wider">
                    Total: <strong className="text-slate-700 font-mono">{totalElementsDiario}</strong> asientos
                  </span>
                  
                  <div className="flex items-center gap-3.5">
                    <Button
                      onClick={() => loadLibroDiario(currentPageDiario - 1)}
                      disabled={currentPageDiario === 0 || loadingDiario}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 h-8 px-3.5 rounded-xl text-xs shadow-sm font-bold flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </Button>
                    
                    <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1 font-mono">
                      Página {currentPageDiario + 1} de {totalPagesDiario}
                    </span>
                    
                    <Button
                      onClick={() => loadLibroDiario(currentPageDiario + 1)}
                      disabled={currentPageDiario >= totalPagesDiario - 1 || loadingDiario}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 h-8 px-3.5 rounded-xl text-xs shadow-sm font-bold flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* SECCIÓN 3: LIBRO MAYOR */}
      {activeSection === 'MAYOR' && (
        <div className="space-y-6">
          {/* Panel Filtro de Cuenta */}
          <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-6 animate-scale-up">
            <h3 className="font-bold text-slate-800 text-sm leading-tight">
              Análisis del Libro Mayor
            </h3>
            <p className="text-[11px] text-slate-400 -mt-4">Consulta la evolución y saldo dinámico acumulado de una cuenta contable específica.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
              {/* Buscador de Cuenta con Autocomplete */}
              <div className="relative">
                <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-2">Cuenta Contable (Movimiento)</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por código o nombre..."
                    value={cuentaMayorSeleccionada ? `${cuentaMayorSeleccionada.codigoContable} - ${cuentaMayorSeleccionada.nombreCuenta}` : busquedaCuentaMayor}
                    onChange={e => {
                      setCuentaMayorSeleccionada(null);
                      setBusquedaCuentaMayor(e.target.value);
                      setMostrarDropdownCuentas(true);
                      setMayorData(null);
                    }}
                    onFocus={() => setMostrarDropdownCuentas(true)}
                    className="pl-10 pr-10 h-10.5 rounded-2xl"
                  />
                  {cuentaMayorSeleccionada && (
                    <button
                      onClick={() => {
                        setCuentaMayorSeleccionada(null);
                        setBusquedaCuentaMayor('');
                        setMayorData(null);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black shrink-0 font-sans cursor-pointer p-1 rounded hover:bg-slate-50"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown de autocompletado */}
                {mostrarDropdownCuentas && !cuentaMayorSeleccionada && filteredCuentasMayor.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 border border-slate-100 rounded-2xl p-2 bg-white/95 backdrop-blur-xl shadow-xl z-50 animate-scale-up select-none">
                    {filteredCuentasMayor.map(cta => (
                      <div
                        key={cta.id}
                        onClick={() => {
                          setCuentaMayorSeleccionada(cta);
                          setMostrarDropdownCuentas(false);
                          setBusquedaCuentaMayor('');
                        }}
                        className="p-2.5 rounded-xl hover:bg-slate-50/80 cursor-pointer flex items-center justify-between text-xs transition-all border border-transparent hover:border-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-500">{cta.codigoContable}</span>
                          <span className="font-semibold text-slate-700">{cta.nombreCuenta}</span>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border tracking-widest uppercase shrink-0 ${getTipoCuentaStyle(cta.tipoCuenta)}`}>
                          {cta.tipoCuenta}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rango de Fechas */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-1 h-10.5">
                <div className="relative flex-1">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fechaDesdeMayor}
                    onChange={e => setFechaDesdeMayor(e.target.value)}
                    className="pl-8 pr-2 w-full h-8 text-[11px] font-bold text-slate-700 bg-transparent border-0 focus:outline-none"
                  />
                </div>
                <span className="text-[9px] font-black text-slate-350 px-1">A</span>
                <div className="relative flex-1">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fechaHastaMayor}
                    onChange={e => setFechaHastaMayor(e.target.value)}
                    className="pl-8 pr-2 w-full h-8 text-[11px] font-bold text-slate-700 bg-transparent border-0 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botonera de Acción */}
              <div className="flex gap-3">
                <Button
                  onClick={() => loadLibroMayor(0)}
                  disabled={loadingMayor || !cuentaMayorSeleccionada}
                  className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold h-10.5 flex-1 rounded-2xl text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  {loadingMayor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
                  Consultar
                </Button>
                
                <Button
                  onClick={exportarMayorCSV}
                  disabled={loadingMayor || !cuentaMayorSeleccionada}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 h-10.5 px-4 rounded-2xl text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  Exportar
                </Button>
              </div>
            </div>
          </Card>

          {/* Resultados del Mayor */}
          {loadingMayor ? (
            <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="h-7 w-7 animate-spin text-[#0054A6] mb-3" />
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Calculando saldos y acumulados del mayor...</span>
            </Card>
          ) : errorMayor ? (
            <Card className="rounded-[2.2rem] border border-red-100 bg-red-50/20 p-8 text-center text-rose-600 font-semibold flex items-center justify-center gap-2 shadow-sm animate-fade-in">
              <AlertCircle className="h-4.5 w-4.5" />
              <span>{errorMayor}</span>
            </Card>
          ) : mayorData ? (
            <div className="space-y-6">
              {/* Premium Header de Cuenta */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm animate-scale-up">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Cuenta Consultada</span>
                  <h4 className="text-base font-black text-slate-800 flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-[#0054A6] bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">{mayorData.codigoContable}</span>
                    {mayorData.nombreCuenta}
                  </h4>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full border tracking-widest uppercase ${getTipoCuentaStyle(mayorData.tipoCuenta)}`}>
                    {mayorData.tipoCuenta}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 font-sans">
                    Naturaleza: <strong className="text-slate-700">{['ACTIVO', 'GASTO'].includes(mayorData.tipoCuenta) ? 'Deudora' : 'Acreedora'}</strong>
                  </span>
                </div>
              </div>

              {/* Fichas Resumen / Tarjetas de Cuadre */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-scale-up">
                <Card className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Saldo Inicial</span>
                  <div className="mt-3 flex justify-between items-baseline">
                    <span className="text-base font-black text-slate-655 font-mono leading-none">
                      ${mayorData.saldoInicial.toFixed(2)}
                    </span>
                    <span className="text-[8.5px] font-extrabold text-slate-400 font-mono">Al {new Date(fechaDesdeMayor).toLocaleDateString('es-ES')}</span>
                  </div>
                </Card>

                <Card className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Flujo del Periodo</span>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold font-mono">
                    <span className="text-emerald-600">(+) D: ${mayorData.totalDebitoPeriodo.toFixed(2)}</span>
                    <span className="text-rose-600">(-) C: ${mayorData.totalCreditoPeriodo.toFixed(2)}</span>
                  </div>
                </Card>

                <Card className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Saldo Final</span>
                  <div className="mt-3 flex justify-between items-baseline">
                    <span className="text-base font-black text-[#0054A6] font-mono leading-none">
                      ${mayorData.saldoFinal.toFixed(2)}
                    </span>
                    <span className="text-[8.5px] font-extrabold text-slate-400 font-mono">Al {new Date(fechaHastaMayor).toLocaleDateString('es-ES')}</span>
                  </div>
                </Card>
              </div>

              {/* Movimientos del Mayor */}
              <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">
                    Historial de Movimientos y Balance Corriente
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">Evolución contable paso a paso en el rango seleccionado.</p>
                </div>

                {mayorData.movimientos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center select-none bg-slate-50/30 rounded-3xl border border-dashed border-slate-100">
                    <span className="h-9 w-9 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-350 text-base font-bold mb-3">!</span>
                    <p className="text-xs font-bold text-slate-550">Sin movimientos en el periodo</p>
                    <p className="text-[10px] text-slate-400 mt-1">El saldo se mantuvo constante en ${mayorData.saldoInicial.toFixed(2)}.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-hidden border border-slate-100 rounded-3xl">
                      <table className="w-full text-[11.5px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold tracking-wider text-left uppercase">
                            <th className="py-3 px-4 w-32">Fecha / Hora</th>
                            <th className="py-3 px-4 w-28">Nro. Asiento</th>
                            <th className="py-3 px-4 w-28">Referencia</th>
                            <th className="py-3 px-4">Concepto / Glosa</th>
                            <th className="py-3 px-4 text-right w-24">Debe</th>
                            <th className="py-3 px-4 text-right w-24">Haber</th>
                            <th className="py-3 px-4 text-right w-28">Saldo Acumulado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Fila de Saldo Inicial Informativa */}
                          <tr className="bg-slate-50/20 border-b border-slate-100/50 italic text-slate-450">
                            <td className="py-3 px-4 font-semibold">
                              {new Date(fechaDesdeMayor).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </td>
                            <td className="py-3 px-4">—</td>
                            <td className="py-3 px-4">—</td>
                            <td className="py-3 px-4 font-medium uppercase tracking-wider text-[10px] font-sans">
                              [SALDO INICIAL DEL PERIODO]
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold">-</td>
                            <td className="py-3 px-4 text-right font-mono font-bold">-</td>
                            <td className="py-3 px-4 text-right font-black font-mono">
                              ${mayorData.saldoInicial.toFixed(2)}
                            </td>
                          </tr>

                          {/* Listado de movimientos */}
                          {mayorData.movimientos.map(mov => {
                            const hasDebe = mov.debe > 0;
                            const hasHaber = mov.haber > 0;

                            return (
                              <tr key={mov.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-all">
                                <td className="py-3.5 px-4 font-semibold text-slate-500">
                                  {new Date(mov.fecha).toLocaleDateString('es-ES', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-bold">
                                  <button
                                    onClick={() => abrirDetalleAsiento(mov.numeroAsiento)}
                                    className="text-[#0054A6] hover:text-[#004080] hover:underline cursor-pointer font-bold focus:outline-none"
                                  >
                                    {mov.numeroAsiento}
                                  </button>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[10.5px] text-slate-500 font-bold truncate max-w-[100px]" title={mov.referencia}>
                                  {mov.referencia || '—'}
                                </td>
                                <td className="py-3.5 px-4 text-slate-800 font-medium truncate max-w-[220px]" title={mov.concepto}>
                                  {mov.concepto}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                                  {hasDebe ? `$${mov.debe.toFixed(2)}` : ''}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                                  {hasHaber ? `$${mov.haber.toFixed(2)}` : ''}
                                </td>
                                <td className="py-3.5 px-4 text-right font-black text-slate-800 font-mono">
                                  ${mov.saldoAcumulado.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Controles de Paginación Server-Side Libro Mayor */}
                    {totalPagesMayor > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 px-1">
                        <span className="text-[10.5px] font-bold text-slate-450 uppercase tracking-wider">
                          Total: <strong className="text-slate-700 font-mono">{totalElementsMayor}</strong> movimientos
                        </span>
                        
                        <div className="flex items-center gap-3.5">
                          <Button
                            onClick={() => loadLibroMayor(currentPageMayor - 1)}
                            disabled={currentPageMayor === 0 || loadingMayor}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 h-8 px-3.5 rounded-xl text-xs shadow-sm font-bold flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Anterior
                          </Button>
                          
                          <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1 font-mono">
                            Página {currentPageMayor + 1} de {totalPagesMayor}
                          </span>
                          
                          <Button
                            onClick={() => loadLibroMayor(currentPageMayor + 1)}
                            disabled={currentPageMayor >= totalPagesMayor - 1 || loadingMayor}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 h-8 px-3.5 rounded-xl text-xs shadow-sm font-bold flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Siguiente
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-12 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] flex flex-col items-center justify-center text-center select-none min-h-[300px]">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mb-4 border border-slate-100/50">
                <Search className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-500">Búsqueda Requerida</h4>
              <p className="text-xs text-slate-400 max-w-[280px] mt-1.5">
                Selecciona una cuenta contable en el buscador de la barra superior para cargar su ficha e historial de movimientos.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* SECCIÓN 4: ESTADO DE RESULTADOS */}
      {activeSection === 'RESULTADOS' && (
        <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-6 animate-scale-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-tight">
                Estado de Resultados (Pérdidas y Ganancias)
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Análisis de ingresos y gastos devengados en el periodo de tiempo consultado.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-1">
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fechaDesdeResultados}
                    onChange={e => setFechaDesdeResultados(e.target.value)}
                    className="pl-8 pr-2 py-1 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none font-bold text-slate-655"
                  />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">al</span>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fechaHastaResultados}
                    onChange={e => setFechaHastaResultados(e.target.value)}
                    className="pl-8 pr-2 py-1 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none font-bold text-slate-655"
                  />
                </div>
              </div>

              <Button
                onClick={() => loadEstadoResultados()}
                disabled={loadingResultados}
                className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold h-9.5 px-4 rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loadingResultados ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Consultar
              </Button>

              {resultadosData && (
                <Button
                  onClick={exportarEstadoResultadosPDF}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 h-9.5 px-4 rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  Exportar PDF
                </Button>
              )}
            </div>
          </div>

          {loadingResultados ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#0054A6]" />
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
                Generando Estado de Resultados...
              </span>
            </div>
          ) : errorResultados ? (
            <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-[1.5rem] text-xs font-semibold flex items-center gap-3.5 max-w-xl mx-auto my-6">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{errorResultados}</span>
            </div>
          ) : !resultadosData ? (
            <div className="flex flex-col items-center justify-center py-16 text-center select-none">
              <span className="h-10 w-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-350 text-base font-bold mb-3">?</span>
              <p className="text-xs font-bold text-slate-550">Consulta Requerida</p>
              <p className="text-[10px] text-slate-400 mt-1">Elige un rango de fechas y presiona consultar para generar el reporte.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resultado Neto Tarjeta (Movido a la parte superior) */}
              <div className={`p-6 rounded-[2rem] border transition-all ${
                resultadosData.resultadoNeto >= 0
                  ? 'bg-emerald-50/30 border-emerald-100/70 text-emerald-800 shadow-emerald-500/[0.01]'
                  : 'bg-rose-50/30 border-rose-100/70 text-rose-800 shadow-rose-500/[0.01]'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-sm">Resultado Neto del Periodo</h5>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${resultadosData.resultadoNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {resultadosData.resultadoNeto >= 0 ? 'Excedente Neto (Utilidad)' : 'Déficit Neto (Pérdida)'}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="font-mono text-3xl font-black tracking-tight">
                      {resultadosData.resultadoNeto >= 0 ? '+' : ''}${resultadosData.resultadoNeto.toFixed(2)}
                    </div>
                    <span className="text-sm font-bold opacity-60 font-mono">
                      ({(resultadosData.totalIngresos > 0 ? (resultadosData.resultadoNeto / resultadosData.totalIngresos) * 100 : 0).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Cuentas de Ingresos */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-450 uppercase tracking-widest mb-3">1. INGRESOS</h4>
                <div className="border border-slate-100/80 rounded-2xl overflow-hidden bg-slate-50/20 shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100/80 bg-slate-50/50">
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase w-32">Código</th>
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase">Cuenta Contable</th>
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase text-right w-36">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 bg-white">
                      {filterVisibleAccounts(resultadosData.ingresos)
                        .map((acc: any) => {
                          const depth = (acc.codigoContable.match(/\./g) || []).length;
                          const isGroup = !acc.esMovimiento;
                          const pct = resultadosData.totalIngresos > 0 ? (acc.balance / resultadosData.totalIngresos) * 100 : 0;
                          return (
                            <tr key={acc.codigoContable} className="hover:bg-slate-50/30 transition-all">
                              <td className={`py-2 px-4 font-mono ${isGroup ? 'font-black text-slate-800' : 'text-slate-450'}`}>{acc.codigoContable}</td>
                              <td className="py-2 px-4">
                                <span
                                  style={{ paddingLeft: isGroup ? `${depth * 1}rem` : `${depth * 1 + 1.5}rem` }}
                                  className={`inline-block ${isGroup ? 'font-bold text-slate-900' : 'text-slate-600 font-normal'}`}
                                >
                                  {acc.nombreCuenta}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-right font-mono">
                                <span className={isGroup ? 'font-black text-slate-850' : 'text-slate-700 font-normal'}>
                                  ${acc.balance.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold ml-2 font-sans bg-slate-50 border border-slate-100/60 px-1.5 py-0.5 rounded-md">
                                  {pct.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      }
                      {/* Total Ingresos Row */}
                      <tr className="bg-slate-50/85 border-t border-slate-200">
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4 font-black text-slate-800 text-[11px] uppercase tracking-wider">TOTAL INGRESOS</td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span className="font-black text-slate-900 text-sm">
                            ${resultadosData.totalIngresos.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-550 font-bold ml-2 font-sans bg-blue-50 border border-blue-100/60 px-1.5 py-0.5 rounded-md">
                            100.0%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cuentas de Gastos */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-450 uppercase tracking-widest mb-3">2. GASTOS</h4>
                <div className="border border-slate-100/80 rounded-2xl overflow-hidden bg-slate-50/20 shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100/80 bg-slate-50/50">
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase w-32">Código</th>
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase">Cuenta Contable</th>
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase text-right w-36">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 bg-white">
                      {filterVisibleAccounts(resultadosData.gastos)
                        .map((acc: any) => {
                          const depth = (acc.codigoContable.match(/\./g) || []).length;
                          const isGroup = !acc.esMovimiento;
                          const pct = resultadosData.totalIngresos > 0 ? (acc.balance / resultadosData.totalIngresos) * 100 : 0;
                          return (
                            <tr key={acc.codigoContable} className="hover:bg-slate-50/30 transition-all">
                              <td className={`py-2 px-4 font-mono ${isGroup ? 'font-black text-slate-800' : 'text-slate-450'}`}>{acc.codigoContable}</td>
                              <td className="py-2 px-4">
                                <span
                                  style={{ paddingLeft: isGroup ? `${depth * 1}rem` : `${depth * 1 + 1.5}rem` }}
                                  className={`inline-block ${isGroup ? 'font-bold text-slate-900' : 'text-slate-600 font-normal'}`}
                                >
                                  {acc.nombreCuenta}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-right font-mono">
                                <span className={isGroup ? 'font-black text-slate-850' : 'text-slate-700 font-normal'}>
                                  ${acc.balance.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold ml-2 font-sans bg-slate-50 border border-slate-100/60 px-1.5 py-0.5 rounded-md">
                                  {pct.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      }
                      {/* Total Gastos Row */}
                      <tr className="bg-slate-50/85 border-t border-slate-200">
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4 font-black text-slate-800 text-[11px] uppercase tracking-wider">TOTAL GASTOS</td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span className="font-black text-slate-900 text-sm">
                            ${resultadosData.totalGastos.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-550 font-bold ml-2 font-sans bg-blue-50 border border-blue-100/60 px-1.5 py-0.5 rounded-md">
                            {((resultadosData.totalGastos / (resultadosData.totalIngresos || 1)) * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* SECCIÓN 5: BALANCE GENERAL */}
      {activeSection === 'BALANCE' && (
        <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-6 animate-scale-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-tight">
                Balance General (Situación Financiera)
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Estado acumulado de activos, pasivos y patrimonio a la fecha de corte seleccionada.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-1">
                <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest px-2">Corte al</span>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fechaCorteBalance}
                    onChange={e => setFechaCorteBalance(e.target.value)}
                    className="pl-8 pr-2 py-1 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none font-bold text-slate-655"
                  />
                </div>
              </div>

              <Button
                onClick={() => loadBalanceGeneral()}
                disabled={loadingBalance}
                className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold h-9.5 px-4 rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loadingBalance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Consultar
              </Button>

              {balanceData && (
                <Button
                  onClick={exportarBalanceGeneralPDF}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 h-9.5 px-4 rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  Exportar PDF
                </Button>
              )}
            </div>
          </div>

          {loadingBalance ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#0054A6]" />
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
                Generando Balance General...
              </span>
            </div>
          ) : errorBalance ? (
            <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-[1.5rem] text-xs font-semibold flex items-center gap-3.5 max-w-xl mx-auto my-6">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{errorBalance}</span>
            </div>
          ) : !balanceData ? (
            <div className="flex flex-col items-center justify-center py-16 text-center select-none">
              <span className="h-10 w-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-350 text-base font-bold mb-3">?</span>
              <p className="text-xs font-bold text-slate-550">Consulta Requerida</p>
              <p className="text-[10px] text-slate-400 mt-1">Elige una fecha de corte y presiona consultar para generar el reporte.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tarjeta de validación de ecuación contable (Movido a la parte superior) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 border border-slate-100 rounded-3xl bg-slate-50/30 flex flex-col justify-between animate-fade-in">
                  <div>
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Activo Total</h5>
                    <p className="text-2xl font-black text-[#0054A6] mt-2 font-mono">${balanceData.totalActivos.toFixed(2)}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Bienes y derechos totales propiedad de la cooperativa.</p>
                </Card>

                <Card className="p-5 border border-slate-100 rounded-3xl bg-slate-50/30 flex flex-col justify-between animate-fade-in">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Pasivo + Patrimonio</h5>
                      <p className="text-2xl font-black text-slate-800 mt-2 font-mono">${balanceData.totalPasivoPatrimonio.toFixed(2)}</p>
                    </div>
                    {balanceData.cuadrado ? (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 tracking-wider uppercase">
                        Cuadrado
                      </span>
                    ) : (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full border border-rose-100 bg-rose-50 text-rose-700 tracking-wider uppercase">
                        Descuadrado
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Deudas a terceros + obligaciones internas con socios (aportaciones y resultados).</p>
                </Card>
              </div>

              {/* Activos */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-450 uppercase tracking-widest mb-3">1. ACTIVOS</h4>
                <div className="border border-slate-100/80 rounded-2xl overflow-hidden bg-slate-50/20 shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100/80 bg-slate-50/50">
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase w-32">Código</th>
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase">Cuenta Contable</th>
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase text-right w-36">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 bg-white">
                      {filterVisibleAccounts(balanceData.activos)
                        .map((acc: any) => {
                          const depth = (acc.codigoContable.match(/\./g) || []).length;
                          const isGroup = !acc.esMovimiento;
                          const pct = balanceData.totalActivos > 0 ? (acc.balance / balanceData.totalActivos) * 100 : 0;
                          return (
                            <tr key={acc.codigoContable} className="hover:bg-slate-50/30 transition-all">
                              <td className={`py-2 px-4 font-mono ${isGroup ? 'font-black text-slate-800' : 'text-slate-450'}`}>{acc.codigoContable}</td>
                              <td className="py-2 px-4">
                                <span
                                  style={{ paddingLeft: isGroup ? `${depth * 1}rem` : `${depth * 1 + 1.5}rem` }}
                                  className={`inline-block ${isGroup ? 'font-bold text-slate-900' : 'text-slate-600 font-normal'}`}
                                >
                                  {acc.nombreCuenta}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-right font-mono">
                                <span className={isGroup ? 'font-black text-slate-850' : 'text-slate-700 font-normal'}>
                                  ${acc.balance.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold ml-2 font-sans bg-slate-50 border border-slate-100/60 px-1.5 py-0.5 rounded-md">
                                  {pct.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      }
                      {/* Total Activos Row */}
                      <tr className="bg-slate-50/85 border-t border-slate-200">
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4 font-black text-slate-700 text-[10px] uppercase tracking-wider">TOTAL ACTIVOS</td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span className="font-black text-[#0054A6] text-sm">${balanceData.totalActivos.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-550 font-bold ml-2 font-sans bg-blue-50 border border-blue-100/60 px-1.5 py-0.5 rounded-md">100.0%</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pasivos */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-450 uppercase tracking-widest mb-3">2. PASIVOS</h4>
                <div className="border border-slate-100/80 rounded-2xl overflow-hidden bg-slate-50/20 shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100/80 bg-slate-50/50">
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase w-32">Código</th>
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase">Cuenta Contable</th>
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase text-right w-36">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 bg-white">
                      {filterVisibleAccounts(balanceData.pasivos)
                        .map((acc: any) => {
                          const depth = (acc.codigoContable.match(/\./g) || []).length;
                          const isGroup = !acc.esMovimiento;
                          const pct = balanceData.totalPasivoPatrimonio > 0 ? (acc.balance / balanceData.totalPasivoPatrimonio) * 100 : 0;
                          return (
                            <tr key={acc.codigoContable} className="hover:bg-slate-50/30 transition-all">
                              <td className={`py-2 px-4 font-mono ${isGroup ? 'font-black text-slate-800' : 'text-slate-450'}`}>{acc.codigoContable}</td>
                              <td className="py-2 px-4">
                                <span
                                  style={{ paddingLeft: isGroup ? `${depth * 1}rem` : `${depth * 1 + 1.5}rem` }}
                                  className={`inline-block ${isGroup ? 'font-bold text-slate-900' : 'text-slate-600 font-normal'}`}
                                >
                                  {acc.nombreCuenta}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-right font-mono">
                                <span className={isGroup ? 'font-black text-slate-850' : 'text-slate-700 font-normal'}>
                                  ${acc.balance.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold ml-2 font-sans bg-slate-50 border border-slate-100/60 px-1.5 py-0.5 rounded-md">
                                  {pct.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      }
                      {/* Total Pasivos Row */}
                      <tr className="bg-slate-50/85 border-t border-slate-200">
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4 font-black text-slate-700 text-[10px] uppercase tracking-wider">TOTAL PASIVOS</td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span className="font-black text-slate-800">${balanceData.totalPasivos.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-550 font-bold ml-2 font-sans bg-blue-50 border border-blue-100/60 px-1.5 py-0.5 rounded-md">
                            {((balanceData.totalPasivos / balanceData.totalPasivoPatrimonio) * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Patrimonio */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-450 uppercase tracking-widest mb-3">3. PATRIMONIO</h4>
                <div className="border border-slate-100/80 rounded-2xl overflow-hidden bg-slate-50/20 shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100/80 bg-slate-50/50">
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase w-32">Código</th>
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase">Cuenta Contable</th>
                        <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase text-right w-36">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 bg-white">
                      {filterVisibleAccounts(balanceData.patrimonio, '3.99', balanceData.resultadoEjercicio)
                        .map((acc: any) => {
                          const depth = (acc.codigoContable.match(/\./g) || []).length;
                          const isGroup = !acc.esMovimiento;
                          const isVirtual = acc.codigoContable === '3.99';
                          const pct = balanceData.totalPasivoPatrimonio > 0 ? (acc.balance / balanceData.totalPasivoPatrimonio) * 100 : 0;
                          return (
                            <tr key={acc.codigoContable} className={`hover:bg-slate-50/30 transition-all ${isVirtual ? 'bg-amber-50/10' : ''}`}>
                              <td className={`py-2 px-4 font-mono ${isGroup || isVirtual ? 'font-black text-slate-800' : 'text-slate-450'}`}>{acc.codigoContable}</td>
                              <td className="py-2 px-4">
                                <span
                                  style={{ paddingLeft: isGroup ? `${depth * 1}rem` : `${depth * 1 + 1.5}rem` }}
                                  className={`inline-block ${isGroup || isVirtual ? 'font-bold text-slate-900' : 'text-slate-600 font-normal'} ${isVirtual ? 'text-amber-800' : ''}`}
                                >
                                  {acc.nombreCuenta}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-right font-mono">
                                <span className={isGroup || isVirtual ? 'font-black text-slate-850' : 'text-slate-700 font-normal'} style={{ color: isVirtual ? '#b45309' : undefined }}>
                                  ${acc.balance.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold ml-2 font-sans bg-slate-50 border border-slate-100/60 px-1.5 py-0.5 rounded-md">
                                  {pct.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      }
                      {/* Total Patrimonio Row */}
                      <tr className="bg-slate-50/85 border-t border-slate-200">
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4 font-black text-slate-700 text-[10px] uppercase tracking-wider">TOTAL PATRIMONIO</td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span className="font-black text-slate-800">${balanceData.totalPatrimonio.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-550 font-bold ml-2 font-sans bg-blue-50 border border-blue-100/60 px-1.5 py-0.5 rounded-md">
                            {((balanceData.totalPatrimonio / balanceData.totalPasivoPatrimonio) * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {!balanceData.cuadrado && (
                <div className="p-4 bg-amber-50 text-amber-800 border border-amber-100 rounded-[1.5rem] text-xs font-semibold flex items-center gap-3">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                  <span>Diferencia contable de cuadre: ${(balanceData.totalActivos - balanceData.totalPasivoPatrimonio).toFixed(2)}. Revise los asientos de apertura y del diario.</span>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* SECCIÓN 6: CIERRES FISCALES ANUALES */}
      {activeSection === 'CIERRES' && (
        <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-6 animate-scale-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-tight flex items-center gap-2">
                Cierres de Ejercicios Fiscales
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Historial de cierres fiscales anuales ejecutados y control de liquidación de cuentas de resultados.
              </p>
            </div>
            
            <Button
              onClick={() => {
                setCierreAnio(new Date().getFullYear());
                setCierreCuentaPatrimonial(null);
                setBusquedaCuentaCierre('');
                setCierreConfirmacion('');
                setErrorCierreModal(null);
                setShowCierreModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-10 px-4 rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              Ejecutar Cierre Anual
            </Button>
          </div>

          {loadingCierres ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Cargando historial de cierres...</span>
            </div>
          ) : errorCierres ? (
            <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-[1.5rem] text-xs font-semibold flex items-center gap-3.5 max-w-xl mx-auto my-6">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{errorCierres}</span>
            </div>
          ) : cierresHistoricos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center select-none">
              <span className="h-10 w-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-350 text-base font-bold mb-3">∅</span>
              <p className="text-xs font-bold text-slate-550">Sin Cierres Registrados</p>
              <p className="text-[10px] text-slate-400 mt-1">Aún no se ha realizado ningún cierre de ejercicio fiscal en esta institución.</p>
            </div>
          ) : (
            <div className="border border-slate-100/80 rounded-2xl overflow-hidden bg-slate-50/20 shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100/80 bg-slate-50/50">
                    <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase">Año Cerrado</th>
                    <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase">Fecha de Ejecución</th>
                    <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase">Usuario Administrador</th>
                    <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase text-right">Resultado Neto</th>
                    <th className="py-2.5 px-4 font-extrabold text-slate-400 tracking-wider text-[9px] uppercase text-center w-36">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50 bg-white">
                  {cierresHistoricos.map((c: any) => {
                    const esExcedente = c.excedenteNeto >= 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/30 transition-all">
                        <td className="py-3 px-4 font-bold text-slate-800 text-xs font-mono">{c.anioFiscal}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(c.fechaCierre).toLocaleString('es-ES', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">{c.usuarioNombre}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={esExcedente ? 'text-emerald-600' : 'text-rose-600'}>
                            {esExcedente ? '+' : ''}${c.excedenteNeto.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <Button
                            onClick={() => descargarComprobanteCierre(c)}
                            className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 h-8 px-3 rounded-lg text-[10px] shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="h-3 w-3 text-slate-500" />
                            Voucher PDF
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal de Ejecución de Cierre Anual con Estilo Premium Alerta/Rojo */}
      {showCierreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-rose-100 rounded-[2.5rem] p-8 shadow-2xl animate-scale-up space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-rose-50">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-extrabold text-slate-805 text-sm">Cierre del Ejercicio Fiscal</h3>
              </div>
              <button 
                onClick={() => {
                  setShowCierreModal(false);
                  setCierreConfirmacion('');
                  setCierreCuentaPatrimonial(null);
                  setBusquedaCuentaCierre('');
                  setErrorCierreModal(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition-all"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-4 text-[11px] text-rose-800 leading-relaxed">
              <span className="font-bold uppercase tracking-wider block mb-1">¡ADVERTENCIA DE SEGURIDAD CRÍTICA!</span>
              Este es el proceso de cierre contable anual. Una vez ejecutado, **se liquidarán a cero** todas las cuentas de Ingresos y Gastos del año fiscal elegido, y el balance resultante se trasladará a la cuenta patrimonial de destino. 
              <span className="block mt-2 font-semibold">El año seleccionado quedará bloqueado permanentemente (Time-Lock) para cualquier registro, modificación o anulación.</span>
            </div>

            {errorCierreModal && (
              <div className="p-3.5 bg-rose-50 text-rose-850 border border-rose-100 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                <span>{errorCierreModal}</span>
              </div>
            )}

            <form onSubmit={handleEjecutarCierre} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5">Año Fiscal a Cerrar</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="2000"
                    max="2099"
                    value={cierreAnio}
                    onChange={e => {
                      setCierreAnio(parseInt(e.target.value));
                      setCierreConfirmacion(''); // Reset confirmation text to require the correct year
                    }}
                    className="w-full bg-slate-50 border border-slate-100/80 focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6] h-10.5 pl-10 pr-4 rounded-2xl text-xs font-bold text-slate-705 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Autocomplete selector for Cuenta Patrimonial */}
              <div className="relative">
                <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5">Cuenta Patrimonial de Destino</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cuenta de Patrimonio..."
                    value={cierreCuentaPatrimonial ? `${cierreCuentaPatrimonial.codigoContable} - ${cierreCuentaPatrimonial.nombreCuenta}` : busquedaCuentaCierre}
                    onChange={e => {
                      setBusquedaCuentaCierre(e.target.value);
                      setCierreCuentaPatrimonial(null);
                      setMostrarDropdownCuentasCierre(true);
                    }}
                    onFocus={() => setMostrarDropdownCuentasCierre(true)}
                    className="w-full bg-slate-50 border border-slate-100/80 focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6] h-10.5 pl-10 pr-8 rounded-2xl text-xs font-semibold text-slate-705 outline-none transition-all"
                  />
                  {cierreCuentaPatrimonial && (
                    <button
                      type="button"
                      onClick={() => {
                        setCierreCuentaPatrimonial(null);
                        setBusquedaCuentaCierre('');
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {mostrarDropdownCuentasCierre && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setMostrarDropdownCuentasCierre(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-150 rounded-2xl shadow-xl z-20 max-h-[180px] overflow-y-auto divide-y divide-slate-50">
                      {filteredCuentasPatrimonio.length > 0 ? (
                        filteredCuentasPatrimonio.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setCierreCuentaPatrimonial(c);
                              setMostrarDropdownCuentasCierre(false);
                            }}
                            className="p-3 hover:bg-slate-50/80 cursor-pointer transition-all text-xs text-slate-700 flex justify-between items-center"
                          >
                            <div>
                              <span className="font-mono font-bold text-[#0054A6]">{c.codigoContable}</span>
                              <span className="ml-2 font-medium">{c.nombreCuenta}</span>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 uppercase font-black">
                              Detalle
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-[10px] text-slate-400 font-semibold">
                          No se encontraron cuentas de Patrimonio de movimiento activas
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-455 uppercase tracking-widest mb-1.5">
                  Confirmación Estricta: Escriba <span className="font-black text-rose-600 font-mono">"CERRAR {cierreAnio}"</span>
                </label>
                <input
                  type="text"
                  placeholder={`CERRAR ${cierreAnio}`}
                  value={cierreConfirmacion}
                  onChange={e => setCierreConfirmacion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 h-10.5 px-4 rounded-2xl text-xs font-mono font-bold text-rose-700 outline-none transition-all"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => {
                    setShowCierreModal(false);
                    setCierreConfirmacion('');
                    setCierreCuentaPatrimonial(null);
                    setBusquedaCuentaCierre('');
                    setErrorCierreModal(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold h-10.5 px-5 rounded-2xl text-xs cursor-pointer shadow-sm"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={cierreProcesando || !cierreCuentaPatrimonial || cierreConfirmacion !== `CERRAR ${cierreAnio}`}
                  className="bg-rose-600 hover:bg-rose-750 text-white font-bold h-10.5 px-5 rounded-2xl text-xs cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-40"
                >
                  {cierreProcesando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Ejecutar Cierre Fiscal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Subcuenta */}
      {showAddSubcuentaModal && parentAccountForNewSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl animate-scale-up space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Nueva Subcuenta</h3>
              <button 
                onClick={() => {
                  setShowAddSubcuentaModal(false);
                  setParentAccountForNewSub(null);
                  setNewSubcuentaName('');
                  setNewSubcuentaEsMovimiento(true);
                  setErrorSubcuenta(null);
                }}
                className="text-slate-450 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorSubcuenta && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorSubcuenta}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubcuenta} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Cuenta Padre</label>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-700">
                  <span className="font-mono font-bold text-[#0054A6]">{parentAccountForNewSub.codigoContable}</span>
                  <span className="ml-2">— {parentAccountForNewSub.nombreCuenta}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Nombre de la Nueva Subcuenta</label>
                <Input
                  type="text"
                  placeholder="Ej: Caja Sucursal Norte"
                  value={newSubcuentaName}
                  onChange={e => setNewSubcuentaName(e.target.value)}
                  className="rounded-2xl text-xs h-10.5 pl-4"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Tipo de Subcuenta</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewSubcuentaEsMovimiento(true)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      newSubcuentaEsMovimiento 
                        ? 'border-emerald-500 bg-emerald-50/20 text-emerald-800 shadow-sm'
                        : 'border-slate-100 bg-slate-50/30 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Coins className={`h-4 w-4 ${newSubcuentaEsMovimiento ? 'text-emerald-600' : 'text-slate-400'}`} />
                      Movimiento
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">Registra transacciones en el Libro Diario directamente.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSubcuentaEsMovimiento(false)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      !newSubcuentaEsMovimiento
                        ? 'border-blue-505 bg-blue-50/20 text-blue-800 shadow-sm'
                        : 'border-slate-100 bg-slate-50/30 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Folder className={`h-4 w-4 ${!newSubcuentaEsMovimiento ? 'text-[#0054A6]' : 'text-slate-400'}`} />
                      Agrupadora
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">No recibe transacciones; agrupa subcuentas.</p>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => {
                    setShowAddSubcuentaModal(false);
                    setParentAccountForNewSub(null);
                    setNewSubcuentaName('');
                    setNewSubcuentaEsMovimiento(true);
                    setErrorSubcuenta(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold h-10.5 px-5 rounded-2xl text-xs cursor-pointer shadow-sm"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingSubcuenta}
                  className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold h-10.5 px-5 rounded-2xl text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {savingSubcuenta && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Guardar Subcuenta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle Asiento Contable (Trazabilidad) */}
      {showAsientoModal && selectedAsientoNumero && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white border border-slate-100 rounded-[2rem] p-6 shadow-2xl animate-scale-up space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Detalle de Asiento Contable</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Partida Doble inmutable asentada en el Libro Diario.</p>
              </div>
              <button 
                onClick={() => {
                  setShowAsientoModal(false);
                  setSelectedAsientoNumero(null);
                  setSelectedAsientoData(null);
                  setErrorAsientoDetail(null);
                }}
                className="text-slate-450 hover:text-slate-600 text-sm font-bold cursor-pointer bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition-all"
              >
                ✕
              </button>
            </div>

            {loadingAsientoDetail ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#0054A6] mb-2" />
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando partida doble...</span>
              </div>
            ) : errorAsientoDetail ? (
              <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                <span>{errorAsientoDetail}</span>
              </div>
            ) : selectedAsientoData ? (
              <div className="space-y-4">
                {/* Metadatos del Asiento */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl text-[11px] font-sans">
                  <div>
                    <span className="text-slate-400 uppercase font-black text-[9px] tracking-wider block">Número Asiento</span>
                    <strong className="text-slate-700 font-mono text-xs block mt-0.5">{selectedAsientoData.numeroAsiento}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-black text-[9px] tracking-wider block">Referencia</span>
                    <strong className="text-slate-700 font-mono text-xs block mt-0.5">{selectedAsientoData.referencia || '—'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 uppercase font-black text-[9px] tracking-wider block">Concepto / Glosa</span>
                    <span className="text-slate-700 font-medium block mt-0.5">{selectedAsientoData.glosa}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 uppercase font-black text-[9px] tracking-wider block">Fecha Asiento</span>
                    <span className="text-slate-750 font-bold block mt-0.5">
                      {new Date(selectedAsientoData.fechaAsiento).toLocaleString('es-ES', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Tabla de Partida Doble */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                  <div className="grid grid-cols-12 gap-2 text-[9px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 bg-slate-50 p-2.5">
                    <div className="col-span-3">Código</div>
                    <div className="col-span-5">Cuenta Contable</div>
                    <div className="col-span-2 text-right">Debe</div>
                    <div className="col-span-2 text-right">Haber</div>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-50">
                    {selectedAsientoData.detalles.map(d => {
                      const esDebito = d.tipoAsiento === 'DEBITO';
                      return (
                        <div key={d.id} className="grid grid-cols-12 gap-2 text-[11px] p-2.5 items-center">
                          <div className="col-span-3 font-mono font-bold text-slate-500">{d.codigoContable}</div>
                          <div className={`col-span-5 font-semibold text-slate-700 ${!esDebito ? 'pl-4' : ''}`}>{d.nombreCuenta}</div>
                          <div className="col-span-2 text-right font-mono font-bold text-emerald-600">
                            {esDebito ? `$${d.monto.toFixed(2)}` : ''}
                          </div>
                          <div className="col-span-2 text-right font-mono font-bold text-rose-600">
                            {!esDebito ? `$${d.monto.toFixed(2)}` : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totales cuadre */}
                  <div className="grid grid-cols-12 gap-2 text-[11px] font-black border-t border-slate-200/60 bg-slate-50/50 p-2.5 items-center">
                    <div className="col-span-8 text-right text-slate-450 uppercase tracking-widest text-[9px]">Total Cuadratura:</div>
                    <div className="col-span-2 text-right font-mono font-black text-emerald-600">
                      ${selectedAsientoData.totalAsiento?.toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right font-mono font-black text-rose-600">
                      ${selectedAsientoData.totalAsiento?.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                onClick={() => {
                  setShowAsientoModal(false);
                  setSelectedAsientoNumero(null);
                  setSelectedAsientoData(null);
                  setErrorAsientoDetail(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold h-10 px-5 rounded-xl text-xs cursor-pointer shadow-sm"
              >
                Cerrar Detalle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-lg animate-slide-in ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-rose-50 text-rose-850 border-rose-100'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
export default ContabilidadDashboard;
