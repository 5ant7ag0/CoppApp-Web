import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  User, MapPin, Briefcase, DollarSign, FileText, 
  UploadCloud, CheckCircle2, AlertTriangle, Trash2, 
  Plus, ArrowRight, ArrowLeft, Check, Loader2, Users,
  Mail, Phone, Calendar, Heart, Search, Printer, X, Pencil
} from 'lucide-react';

interface Beneficiario {
  nombresCompletos: string;
  identificacion: string;
  parentesco: string;
  porcentajeAsignado: number;
}

export const CreacionSocios: React.FC = () => {
  // Pestaña activa: 'nuevo' | 'registrados'
  const [activeTab, setActiveTab] = useState<'nuevo' | 'registrados'>('nuevo');

  // Pasos del formulario: 1, 2, 3
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [cargando, setCargando] = useState<boolean>(false);
  const [errorTransaccion, setErrorTransaccion] = useState<string | null>(null);

  // Paso 1: Datos Personales
  const [tipoIdentificacion, setTipoIdentificacion] = useState<'C' | 'R' | 'P'>('C');
  const [identificacion, setIdentificacion] = useState<string>('');
  const [nombresCompletos, setNombresCompletos] = useState<string>('');
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('');
  const [estadoCivil, setEstadoCivil] = useState<string>('SOLTERO');
  const [telefono, setTelefono] = useState<string>('');
  const [correo, setCorreo] = useState<string>('');
  
  // Verificación OTP Correo
  const [correoVerificado, setCorreoVerificado] = useState<boolean>(false);
  const [mostrarOtpModal, setMostrarOtpModal] = useState<boolean>(false);
  const [codigoOtp, setCodigoOtp] = useState<string>('');
  const [cargandoOtp, setCargandoOtp] = useState<boolean>(false);
  const [validandoOtp, setValidandoOtp] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [esPep, setEsPep] = useState<boolean>(false);
  const [cargoPep, setCargoPep] = useState<string>('');
  
  // Paso 2: Información Socioeconómica
  const [direccion, setDireccion] = useState<string>('');
  const [actividadEconomica, setActividadEconomica] = useState<string>('EMPLEADO_PRIVADO');
  const [lugarTrabajo, setLugarTrabajo] = useState<string>('');
  const [ingresosMensuales, setIngresosMensuales] = useState<string>('0');
  const [gastosMensuales, setGastosMensuales] = useState<string>('0');
  const [deudasActuales, setDeudasActuales] = useState<string>('0');

  // Paso 3: Beneficiarios
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([
    { nombresCompletos: '', identificacion: '', parentesco: 'CONYUGE', porcentajeAsignado: 100 }
  ]);

  // Documentos KYC (Archivos locales para previsualizar)
  const [docCedulaFrontal, setDocCedulaFrontal] = useState<File | null>(null);
  const [docCedulaPosterior, setDocCedulaPosterior] = useState<File | null>(null);
  const [docFirmaDigital, setDocFirmaDigital] = useState<File | null>(null);

  // Modal confirmatorio final
  const [mostrarExitoModal, setMostrarExitoModal] = useState<boolean>(false);
  const [socioCreadoInfo, setSocioCreadoInfo] = useState<{
    nombre: string;
    identificacion: string;
    numeroCuenta: string;
    numeroCuentaAportaciones: string;
  } | null>(null);

  // Errores de validación en tiempo real por paso
  const [errorsPaso1, setErrorsPaso1] = useState<Record<string, string>>({});
  const [errorsPaso2, setErrorsPaso2] = useState<Record<string, string>>({});
  const [errorsPaso3, setErrorsPaso3] = useState<Record<string, string>>({});

  // Estados para pestaña 2: Socios Registrados
  const [sociosList, setSociosList] = useState<any[]>([]);
  const [loadingSocios, setLoadingSocios] = useState<boolean>(false);
  const [searchSocioQuery, setSearchSocioQuery] = useState<string>('');
  const [estadoFilter, setEstadoFilter] = useState<string>('TODOS');

  // Estados para Modal de Detalle, Portafolio y Edición KYC
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedSocio, setSelectedSocio] = useState<any | null>(null);
  const [cuentasSocio, setCuentasSocio] = useState<any[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // Estados de edición de Socio (KYC)
  const [editDireccion, setEditDireccion] = useState<string>('');
  const [editTelefono, setEditTelefono] = useState<string>('');
  const [editCorreo, setEditCorreo] = useState<string>('');
  const [editActividadEconomica, setEditActividadEconomica] = useState<string>('');
  const [editLugarTrabajo, setEditLugarTrabajo] = useState<string>('');
  const [editIngresosMensuales, setEditIngresosMensuales] = useState<string>('0');
  const [editGastosMensuales, setEditGastosMensuales] = useState<string>('0');
  const [editDeudasActuales, setEditDeudasActuales] = useState<string>('0');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Algoritmo de validación de Cédula Ecuatoriana (Módulo 10)
  const validarCedulaEcuatoriana = (ced: string): boolean => {
    if (ced.length !== 10) return false;
    const provincia = parseInt(ced.substring(0, 2), 10);
    if (provincia < 1 || provincia > 24) return false;
    const tercerDigito = parseInt(ced.substring(2, 3), 10);
    if (tercerDigito >= 6) return false; // Solo personas naturales (0-5)

    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let valor = parseInt(ced.charAt(i), 10) * coeficientes[i];
      if (valor >= 10) valor -= 9;
      suma += valor;
    }
    const verificadorCalculado = (Math.ceil(suma / 10) * 10) - suma;
    const verificadorReal = parseInt(ced.charAt(9), 10);
    return verificadorCalculado === verificadorReal;
  };

  // Validación de RUC Ecuatoriano
  const validarRucEcuatoriano = (ruc: string): boolean => {
    if (ruc.length !== 13) return false;
    if (!ruc.endsWith('001')) return false;
    return validarCedulaEcuatoriana(ruc.substring(0, 10));
  };

  // Limpiar cargo PEP si se desmarca
  useEffect(() => {
    if (!esPep) {
      setCargoPep('');
    }
  }, [esPep]);

  // Validaciones en tiempo real para el Paso 1
  useEffect(() => {
    const errs: Record<string, string> = {};
    
    // Identificación
    if (!identificacion) {
      errs.identificacion = 'La identificación es obligatoria';
    } else if (tipoIdentificacion === 'C') {
      if (!/^\d{10}$/.test(identificacion)) {
        errs.identificacion = 'Debe tener exactamente 10 dígitos numéricos';
      } else if (!validarCedulaEcuatoriana(identificacion)) {
        errs.identificacion = 'Cédula inválida (Algoritmo Módulo 10 fallido)';
      }
    } else if (tipoIdentificacion === 'R') {
      if (!/^\d{13}$/.test(identificacion)) {
        errs.identificacion = 'Debe tener exactamente 13 dígitos numéricos';
      } else if (!validarRucEcuatoriano(identificacion)) {
        errs.identificacion = 'RUC inválido (Debe terminar en 001 y tener cédula base válida)';
      }
    } else if (tipoIdentificacion === 'P') {
      if (identificacion.length < 5 || identificacion.length > 15) {
        errs.identificacion = 'Pasaporte debe tener entre 5 y 15 caracteres';
      }
    }

    // Nombres
    if (!nombresCompletos.trim()) {
      errs.nombresCompletos = 'Los nombres completos son obligatorios';
    } else if (nombresCompletos.trim().length < 5) {
      errs.nombresCompletos = 'Debe ingresar nombres y apellidos completos';
    }

    // Teléfono (Ecuadorian mobile: 09XXXXXXXX)
    if (!telefono) {
      errs.telefono = 'El teléfono celular es obligatorio';
    } else if (!/^09\d{8}$/.test(telefono)) {
      errs.telefono = 'Formato incorrecto. Debe ser celular de Ecuador (09XXXXXXXX)';
    }

    // Correo
    if (!correo) {
      errs.correo = 'El correo electrónico es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      errs.correo = 'El correo electrónico no es válido';
    }

    // Fecha Nacimiento
    if (!fechaNacimiento) {
      errs.fechaNacimiento = 'La fecha de nacimiento es obligatoria';
    } else {
      const edad = new Date().getFullYear() - new Date(fechaNacimiento).getFullYear();
      if (edad < 18) {
        errs.fechaNacimiento = 'El socio debe ser mayor de edad (+18 años)';
      }
    }

    // Cargo PEP obligatorio si es PEP
    if (esPep && !cargoPep.trim()) {
      errs.cargoPep = 'El cargo / función pública es obligatorio para personas expuestas políticamente';
    }

    setErrorsPaso1(errs);
  }, [identificacion, tipoIdentificacion, nombresCompletos, telefono, correo, fechaNacimiento, esPep, cargoPep]);

  // Validaciones en tiempo real para el Paso 2
  useEffect(() => {
    const errs: Record<string, string> = {};

    if (!direccion.trim()) {
      errs.direccion = 'La dirección domiciliaria es obligatoria';
    }

    if (actividadEconomica !== 'ESTUDIANTE' && actividadEconomica !== 'DESEMPLEADO' && !lugarTrabajo.trim()) {
      errs.lugarTrabajo = 'El lugar de trabajo es obligatorio para esta actividad';
    }

    const ing = parseFloat(ingresosMensuales);
    if (isNaN(ing) || ing < 0) {
      errs.ingresosMensuales = 'Los ingresos deben ser un valor positivo';
    }

    const gas = parseFloat(gastosMensuales);
    if (isNaN(gas) || gas < 0) {
      errs.gastosMensuales = 'Los gastos deben ser un valor positivo';
    }

    const deu = parseFloat(deudasActuales);
    if (isNaN(deu) || deu < 0) {
      errs.deudasActuales = 'Las deudas actuales deben ser un valor positivo';
    }

    setErrorsPaso2(errs);
  }, [direccion, actividadEconomica, lugarTrabajo, ingresosMensuales, gastosMensuales, deudasActuales]);

  // Validaciones en tiempo real para el Paso 3
  useEffect(() => {
    const errs: Record<string, string> = {};

    // Suma de porcentajes de beneficiarios
    const sumaPorcentajes = beneficiarios.reduce((sum, b) => sum + (Number(b.porcentajeAsignado) || 0), 0);
    if (sumaPorcentajes !== 100) {
      errs.porcentajeSum = `La suma total de asignación debe ser exactamente 100% (Actual: ${sumaPorcentajes}%)`;
    }

    // Validar cada fila de beneficiario
    beneficiarios.forEach((b, idx) => {
      if (!b.nombresCompletos.trim()) {
        errs[`nom_${idx}`] = 'El nombre es obligatorio';
      }
      if (!b.identificacion) {
        errs[`id_${idx}`] = 'La identificación es obligatoria';
      } else if (!/^\d{10}$/.test(b.identificacion) && !/^\d{13}$/.test(b.identificacion)) {
        errs[`id_${idx}`] = 'Identificación incorrecta (10 o 13 dígitos)';
      }
    });

    // Validar documentos KYC
    if (!docCedulaFrontal) {
      errs.docCedulaFrontal = 'El documento Cédula Frontal es obligatorio';
    }
    if (!docCedulaPosterior) {
      errs.docCedulaPosterior = 'El documento Cédula Posterior es obligatorio';
    }
    if (!docFirmaDigital) {
      errs.docFirmaDigital = 'El archivo de firma manuscrita es obligatorio';
    }

    setErrorsPaso3(errs);
  }, [beneficiarios, docCedulaFrontal, docCedulaPosterior, docFirmaDigital]);

  // Cálculo reactivo del flujo neto
  const ingresosVal = parseFloat(ingresosMensuales) || 0;
  const gastosVal = parseFloat(gastosMensuales) || 0;
  const deudasVal = parseFloat(deudasActuales) || 0;
  const flujoNeto = ingresosVal - gastosVal - deudasVal;

  // Manejo de Beneficiarios dinámico
  const agregarBeneficiario = () => {
    const sumaPorcentajes = beneficiarios.reduce((sum, b) => sum + b.porcentajeAsignado, 0);
    const restante = Math.max(0, 100 - sumaPorcentajes);
    setBeneficiarios([
      ...beneficiarios,
      { nombresCompletos: '', identificacion: '', parentesco: 'HIJO', porcentajeAsignado: restante }
    ]);
  };

  const eliminarBeneficiario = (index: number) => {
    if (beneficiarios.length === 1) return;
    const newBens = beneficiarios.filter((_, idx) => idx !== index);
    setBeneficiarios(newBens);
  };

  const updateBeneficiario = (index: number, key: keyof Beneficiario, value: any) => {
    const newBens = [...beneficiarios];
    if (key === 'porcentajeAsignado') {
      newBens[index] = { ...newBens[index], [key]: Math.min(100, Math.max(0, parseInt(value) || 0)) };
    } else {
      newBens[index] = { ...newBens[index], [key]: value };
    }
    setBeneficiarios(newBens);
  };

  // Cargar lista de socios (Pestaña 2)
  const fetchSocios = async () => {
    setLoadingSocios(true);
    try {
      const res = await api.get('/socios');
      setSociosList(res.data);
    } catch (err) {
      console.error('Error al consultar socios:', err);
    } finally {
      setLoadingSocios(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'registrados') {
      fetchSocios();
    }
  }, [activeTab]);

  // Filtro local de socios
  const sociosFiltrados = sociosList.filter(s => {
    const q = searchSocioQuery.toLowerCase();
    const matchesQuery = s.identificacion.toLowerCase().includes(q) || s.nombresCompletos.toLowerCase().includes(q);
    
    if (estadoFilter === 'TODOS') return matchesQuery;
    if (estadoFilter === 'PENDIENTE') return matchesQuery && s.estado === 'PENDIENTE_APROBACION';
    return matchesQuery && s.estado === estadoFilter;
  });

  // Generador PDF Ficha KYC
  const generarFichaKycPdf = (
    socio: any,
    cuentas: any[],
    bensList: Beneficiario[],
    cargoPepStr: string
  ) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 15;
    const pageWidth = 210;

    const drawLabelValue = (label: string, value: string, x: number, yPos: number, labelWidth = 35) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(label + ":", x, yPos);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(26, 26, 26);
      doc.text(value || 'N/A', x + labelWidth, yPos);
    };

    let currentY = 15;

    // Encabezado institucional
    doc.setFillColor(0, 84, 166);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 2, 'F');
    currentY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 84, 166);
    doc.text("COOPERATIVA DE AHORRO Y CRÉDITO ITQ LTDA.", margin, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`RUC: 1791234567001  |  Emisión: ${new Date().toLocaleDateString('es-EC')} ${new Date().toLocaleTimeString('es-EC')}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text("FICHA DE REGISTRO E IDENTIFICACIÓN DEL SOCIO (KYC)", margin, currentY);

    currentY += 3;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // I. DATOS PERSONALES
    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 84, 166);
    doc.text("I. DATOS PERSONALES Y DE IDENTIFICACIÓN", margin, currentY);
    currentY += 2;
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 6;
    const tipoIdMap = { 'C': 'Cédula', 'R': 'RUC', 'P': 'Pasaporte' };
    const tipoIdName = tipoIdMap[socio.tipoIdentificacion as 'C' | 'R' | 'P'] || 'Identificación';

    drawLabelValue("Nombres Completos", socio.nombresCompletos, margin, currentY, 32);
    drawLabelValue("Tipo Identificación", tipoIdName, 120, currentY, 30);

    currentY += 5;
    drawLabelValue("Identificación Nro.", socio.identificacion, margin, currentY, 32);
    const civil = socio.estadoCivil || 'SOLTERO';
    drawLabelValue("Estado Civil", civil, 120, currentY, 30);

    currentY += 5;
    const nac = socio.fechaNacimiento || 'DECLARADA EN REGISTRO';
    drawLabelValue("Fecha Nacimiento", nac, margin, currentY, 32);
    drawLabelValue("Teléfono Celular", socio.telefono, 120, currentY, 30);

    currentY += 5;
    drawLabelValue("Correo Electrónico", socio.correo, margin, currentY, 32);
    const pepStatus = socio.esPep ? "SÍ" : "NO";
    drawLabelValue("Persona Expuesta PEP", pepStatus, 120, currentY, 30);

    if (socio.esPep) {
      currentY += 5;
      const cargo = cargoPepStr || socio.cargoPep || 'CARGO POLÍTICO DECLARADO';
      drawLabelValue("Cargo / Función", cargo, margin, currentY, 32);
    }

    // II. INFORMACIÓN SOCIOECONÓMICA
    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 84, 166);
    doc.text("II. INFORMACIÓN SOCIOECONÓMICA Y CAPACIDAD DE PAGO", margin, currentY);
    currentY += 2;
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 6;
    drawLabelValue("Dirección Domicilio", socio.direccion, margin, currentY, 32);

    currentY += 5;
    drawLabelValue("Actividad Económica", socio.actividadEconomica.replace(/_/g, ' '), margin, currentY, 32);
    drawLabelValue("Lugar de Trabajo", socio.lugarTrabajo || 'Independiente / N/A', 120, currentY, 30);

    currentY += 5;
    const formatMoney = (val: any) => {
      const num = parseFloat(val) || 0;
      return `$${num.toFixed(2)}`;
    };
    drawLabelValue("Ingresos Mensuales", formatMoney(socio.ingresosMensuales), margin, currentY, 32);
    drawLabelValue("Gastos Mensuales", formatMoney(socio.gastosMensuales), 120, currentY, 30);

    currentY += 5;
    drawLabelValue("Deudas Actuales", formatMoney(socio.deudasActuales), margin, currentY, 32);

    const ing = parseFloat(socio.ingresosMensuales) || 0;
    const gas = parseFloat(socio.gastosMensuales) || 0;
    const deu = parseFloat(socio.deudasActuales) || 0;
    const net = ing - gas - deu;
    drawLabelValue("Capacidad de Pago", formatMoney(net), 120, currentY, 30);

    // III. CUENTAS ASOCIADAS
    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 84, 166);
    doc.text("III. CUENTAS Y CERTIFICADOS DE APORTACIÓN APERTURADOS", margin, currentY);
    currentY += 2;
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 6;
    const ctaVista = cuentas.find(a => a.tipo === 'AHORRO_VISTA');
    const ctaAportaciones = cuentas.find(a => a.tipo === 'APORTACIONES');

    drawLabelValue("Cta. Ahorros a la Vista", ctaVista ? ctaVista.numeroCuenta : 'PENDIENTE', margin, currentY, 35);
    drawLabelValue("Estado de Cuenta", ctaVista ? ctaVista.estado : 'ACTIVA', 120, currentY, 30);

    currentY += 5;
    drawLabelValue("Cta. Aportaciones", ctaAportaciones ? ctaAportaciones.numeroCuenta : 'PENDIENTE', margin, currentY, 35);
    const aportacionesEstado = ctaAportaciones && parseFloat(ctaAportaciones.saldo) > 0 ? 'ACTIVA' : 'PENDIENTE_PAGO';
    drawLabelValue("Estado Aportaciones", aportacionesEstado, 120, currentY, 30);

    // IV. DECLARACIÓN DE BENEFICIARIOS
    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 84, 166);
    doc.text("IV. DECLARACIÓN DE BENEFICIARIOS DE LA CUENTA", margin, currentY);
    currentY += 2;
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 5;

    let tableBody: any[] = [];
    if (bensList && bensList.length > 0) {
      tableBody = bensList.map(b => [
        b.nombresCompletos,
        b.identificacion,
        b.parentesco,
        `${b.porcentajeAsignado}%`
      ]);
    } else {
      tableBody = [
        ['DECLARACIÓN ASOCIADA EN ARCHIVO FÍSICO / REGISTRO DIGITAL', 'N/A', 'HEREDEROS LEGALES', '100%']
      ];
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Nombres Completos', 'Identificación', 'Parentesco', 'Asignación %']],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.5,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [0, 84, 166],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      didDrawPage: (data) => {
        currentY = data.cursor ? data.cursor.y : currentY + 15;
      }
    });

    // V. DECLARACIÓN DE ORIGEN DE FONDOS
    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 84, 166);
    doc.text("V. DECLARACIÓN JURADA DE ORIGEN DE FONDOS (SEPS & UAFE)", margin, currentY);
    currentY += 2;
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const declaracionText = "Declaro bajo juramento que los fondos y recursos depositados y movilizados en esta institución cooperativa tienen un origen lícito y provienen de las actividades socioeconómicas detalladas en esta ficha. Expresamente manifiesto que no provienen de ninguna actividad relacionada con el lavado de activos, financiamiento del terrorismo u otros delitos tipificados en la Ley de Prevención de Lavado de Activos de la República del Ecuador. Autorizo libre y voluntariamente a la Cooperativa de Ahorro y Crédito ITQ Ltda. a realizar las investigaciones, cruces de bases de datos y reportes de cumplimiento normativo ante la Superintendencia de Economía Popular y Solidaria (SEPS) y la Unidad de Análisis Financiero y Económico (UAFE) que correspondan por ley.";
    const splitText = doc.splitTextToSize(declaracionText, pageWidth - 2 * margin);
    doc.text(splitText, margin, currentY);

    // VI. FIRMAS Y HUELLA
    currentY += 18;
    const lineLength = 48;
    const xSocio = margin;
    const xHuella = 85;
    const xAsesor = 145;

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(xSocio, currentY, xSocio + lineLength, currentY);
    
    doc.rect(xHuella, currentY - 12, 22, 24);

    doc.line(xAsesor, currentY, xAsesor + lineLength, currentY);

    currentY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(26, 26, 26);
    doc.text("FIRMA DEL SOCIO / DEPOSITANTE", xSocio + lineLength/2, currentY, { align: 'center' });
    doc.text("FIRMA DEL ASESOR / OFICIAL", xAsesor + lineLength/2, currentY, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    currentY += 3.5;
    doc.text(`Identificación: ${socio.identificacion}`, xSocio + lineLength/2, currentY, { align: 'center' });
    doc.text("COOP. AHORRO Y CRÉDITO ITQ", xAsesor + lineLength/2, currentY, { align: 'center' });

    currentY += 2.5;
    doc.setFont("helvetica", "bold");
    doc.text("HUELLA DACTILAR", xHuella + 11, currentY + 4, { align: 'center' });

    doc.save(`ficha_kyc_${socio.identificacion}.pdf`);
  };

  // Imprimir KYC de socio nuevo (desde modal)
  const handleDownloadKycNuevo = () => {
    if (!socioCreadoInfo) return;

    const tempSocio = {
      tipoIdentificacion,
      identificacion,
      nombresCompletos: nombresCompletos.toUpperCase().trim(),
      direccion: direccion.trim(),
      telefono,
      correo: correo.trim(),
      actividadEconomica,
      ingresosMensuales: ingresosVal,
      gastosMensuales: gastosVal,
      deudasActuales: deudasVal,
      esPep,
      estado: 'PENDIENTE_APROBACION',
      fechaNacimiento,
      estadoCivil
    };

    const tempAccounts = [
      {
        numeroCuenta: socioCreadoInfo.numeroCuenta,
        tipo: 'AHORRO_VISTA',
        estado: 'ACTIVA',
        saldo: 0
      },
      {
        numeroCuenta: socioCreadoInfo.numeroCuentaAportaciones,
        tipo: 'APORTACIONES',
        estado: 'ACTIVA',
        saldo: 0
      }
    ];

    generarFichaKycPdf(tempSocio, tempAccounts, beneficiarios, cargoPep);
  };

  const handleVerDetalle = async (socio: any) => {
    setSelectedSocio(socio);
    setIsEditing(false);
    setIsDetailModalOpen(true);
    setLoadingCuentas(true);
    setCuentasSocio([]);
    
    // Initialize edit fields
    setEditDireccion(socio.direccion);
    setEditTelefono(socio.telefono);
    setEditCorreo(socio.correo);
    setEditActividadEconomica(socio.actividadEconomica);
    setEditLugarTrabajo(socio.lugarTrabajo || '');
    setEditIngresosMensuales(socio.ingresosMensuales.toString());
    setEditGastosMensuales(socio.gastosMensuales.toString());
    setEditDeudasActuales(socio.deudasActuales.toString());
    setEditErrors({});

    try {
      const res = await api.get(`/cuentas/socio/${socio.id}`);
      setCuentasSocio(res.data);
    } catch (err) {
      console.error('Error al consultar cuentas del socio:', err);
    } finally {
      setLoadingCuentas(false);
    }
  };

  const handleGuardarCambios = async () => {
    if (!selectedSocio) return;
    
    // Validaciones en caliente para los campos editados
    const errs: Record<string, string> = {};
    if (!editDireccion.trim()) errs.direccion = 'La dirección es obligatoria';
    if (!editTelefono || !/^09\d{8}$/.test(editTelefono)) errs.telefono = 'Celular ecuatoriano inválido';
    if (!editCorreo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editCorreo)) errs.correo = 'Correo electrónico inválido';
    
    if (editActividadEconomica !== 'ESTUDIANTE' && editActividadEconomica !== 'DESEMPLEADO' && !editLugarTrabajo.trim()) {
      errs.lugarTrabajo = 'El lugar de trabajo es obligatorio';
    }

    const ing = parseFloat(editIngresosMensuales);
    if (isNaN(ing) || ing < 0) errs.ingresos = 'Monto inválido';
    const gas = parseFloat(editGastosMensuales);
    if (isNaN(gas) || gas < 0) errs.gastos = 'Monto inválido';
    const deu = parseFloat(editDeudasActuales);
    if (isNaN(deu) || deu < 0) errs.deudas = 'Monto inválido';

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setCargando(true);
    try {
      const payload = {
        tipoIdentificacion: selectedSocio.tipoIdentificacion,
        identificacion: selectedSocio.identificacion,
        nombresCompletos: selectedSocio.nombresCompletos,
        direccion: editDireccion.trim(),
        telefono: editTelefono,
        correo: editCorreo.trim(),
        actividadEconomica: editActividadEconomica,
        lugarTrabajo: editLugarTrabajo.trim(),
        ingresosMensuales: ing,
        gastosMensuales: gas,
        deudasActuales: deu,
        fotoPerfilUrl: selectedSocio.fotoPerfilUrl,
        fotoCedulaFrontalUrl: selectedSocio.fotoCedulaFrontalUrl,
        fotoCedulaPosteriorUrl: selectedSocio.fotoCedulaPosteriorUrl,
        esPep: selectedSocio.esPep,
        estado: selectedSocio.estado
      };

      const res = await api.put(`/socios/${selectedSocio.id}`, payload);
      const socioActualizado = res.data;
      
      // Actualizar el socio seleccionado
      setSelectedSocio(socioActualizado);
      
      // Actualizar la lista local
      setSociosList((prev) => 
        prev.map((s) => (s.id === selectedSocio.id ? socioActualizado : s))
      );
      
      setIsEditing(false);
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error al guardar cambios de socio:', err);
      let errMsg = 'No se pudo guardar la información del socio.';
      if (err.response && typeof err.response.data === 'string') {
        errMsg = err.response.data;
      } else if (err.response && err.response.data && err.response.data.message) {
        errMsg = err.response.data.message;
      }
      alert(errMsg);
    } finally {
      setCargando(false);
    }
  };

  // Reimprimir Ficha KYC histórica
  const handleReimprimirKyc = async (socio: any) => {
    try {
      const resCuentas = await api.get(`/cuentas/socio/${socio.id}`);
      generarFichaKycPdf(socio, resCuentas.data, [], '');
    } catch (err: any) {
      console.error('Error al consultar cuentas para reimpresión:', err);
      alert('No se pudieron recuperar las cuentas asociadas para generar la Ficha KYC.');
    }
  };

  const handleEnviarOtp = async () => {
    if (!correo || errorsPaso1.correo) {
      alert("Por favor, ingrese un correo electrónico válido antes de verificar.");
      return;
    }
    setCargandoOtp(true);
    setOtpError(null);
    setCodigoOtp('');
    try {
      await api.post('/otp/enviar', { email: correo.trim() });
      setMostrarOtpModal(true);
    } catch (err: any) {
      console.error("Error al enviar OTP:", err);
      const msg = err.response?.data?.message || err.response?.data || "No se pudo enviar el código OTP. Intente de nuevo.";
      alert(msg);
    } finally {
      setCargandoOtp(false);
    }
  };

  const handleValidarOtp = async () => {
    if (codigoOtp.length !== 6) {
      setOtpError("El código debe tener exactamente 6 dígitos.");
      return;
    }
    setValidandoOtp(true);
    setOtpError(null);
    try {
      await api.post('/otp/validar', { email: correo.trim(), code: codigoOtp.trim() });
      setCorreoVerificado(true);
      setMostrarOtpModal(false);
    } catch (err: any) {
      console.error("Error al validar OTP:", err);
      const msg = err.response?.data?.message || err.response?.data || "Código incorrecto o expirado.";
      setOtpError(msg);
    } finally {
      setValidandoOtp(false);
    }
  };

  // Enviar y Registrar
  const handleRegistrar = async () => {
    setErrorTransaccion(null);
    setCargando(true);

    try {
      // 1. Registrar Socio
      const payloadSocio = {
        tipoIdentificacion,
        identificacion,
        nombresCompletos: nombresCompletos.toUpperCase().trim(),
        direccion: direccion.trim(),
        telefono,
        correo: correo.trim(),
        actividadEconomica,
        lugarTrabajo: (actividadEconomica === 'ESTUDIANTE' || actividadEconomica === 'DESEMPLEADO') ? 'Ninguno' : lugarTrabajo.trim(),
        ingresosMensuales: ingresosVal,
        gastosMensuales: gastosVal,
        deudasActuales: deudasVal,
        fotoCedulaFrontalUrl: docCedulaFrontal ? `/uploads/kyc/${identificacion}_frontal_${docCedulaFrontal.name}` : null,
        fotoCedulaPosteriorUrl: docCedulaPosterior ? `/uploads/kyc/${identificacion}_posterior_${docCedulaPosterior.name}` : null,
        esPep,
        estado: 'PENDIENTE_APROBACION'
      };

       const resSocio = await api.post('/socios', payloadSocio);
      const socioCreado = resSocio.data;

      // 1.1 Subir Cédula Frontal si existe
      if (docCedulaFrontal) {
        const formDataFront = new FormData();
        formDataFront.append('file', docCedulaFrontal);
        await api.post(`/socios/${socioCreado.id}/cedula-frontal`, formDataFront, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      // 1.2 Subir Cédula Posterior si existe
      if (docCedulaPosterior) {
        const formDataBack = new FormData();
        formDataBack.append('file', docCedulaPosterior);
        await api.post(`/socios/${socioCreado.id}/cedula-posterior`, formDataBack, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      // 2. Generar Números de Cuenta Virtuales de 10 dígitos (Ahorros a la vista: 10 + 8 dig, Aportaciones: 20 + 8 dig)
      const rDigits1 = Math.floor(10000000 + Math.random() * 90000000).toString();
      const numCuentaVista = `10${rDigits1}`;

      const rDigits2 = Math.floor(10000000 + Math.random() * 90000000).toString();
      const numCuentaAportaciones = `20${rDigits2}`;

      // 3. Crear Cuenta de Ahorros a la Vista
      const payloadVista = {
        socioId: socioCreado.id,
        numeroCuenta: numCuentaVista,
        tipo: 'AHORRO_VISTA',
        estado: 'ACTIVA'
      };
      await api.post('/cuentas', payloadVista);

      // 4. Crear Cuenta de Aportaciones
      const payloadAportaciones = {
        socioId: socioCreado.id,
        numeroCuenta: numCuentaAportaciones,
        tipo: 'APORTACIONES',
        estado: 'INACTIVA'
      };
      await api.post('/cuentas', payloadAportaciones);

      // Mostrar modal de éxito guardando la información
      setSocioCreadoInfo({
        nombre: socioCreado.nombresCompletos,
        identificacion: socioCreado.identificacion,
        numeroCuenta: numCuentaVista,
        numeroCuentaAportaciones: numCuentaAportaciones
      });
      setMostrarExitoModal(true);

    } catch (err: any) {
      console.error('Error en el flujo transaccional:', err);
      let errMsg = 'No se pudo completar la transacción. Por favor, intente de nuevo.';
      if (err.response && typeof err.response.data === 'string') {
        errMsg = err.response.data;
      } else if (err.response && err.response.data && err.response.data.message) {
        errMsg = err.response.data.message;
      } else if (err.message) {
        errMsg = err.message;
      }
      setErrorTransaccion(errMsg);
    } finally {
      setCargando(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setIdentificacion('');
    setNombresCompletos('');
    setFechaNacimiento('');
    setEstadoCivil('SOLTERO');
    setTelefono('');
    setCorreo('');
    setCorreoVerificado(false);
    setMostrarOtpModal(false);
    setCodigoOtp('');
    setOtpError(null);
    setEsPep(false);
    setCargoPep('');
    setDireccion('');
    setActividadEconomica('EMPLEADO_PRIVADO');
    setLugarTrabajo('');
    setIngresosMensuales('0');
    setGastosMensuales('0');
    setDeudasActuales('0');
    setBeneficiarios([{ nombresCompletos: '', identificacion: '', parentesco: 'CONYUGE', porcentajeAsignado: 100 }]);
    setDocCedulaFrontal(null);
    setDocCedulaPosterior(null);
    setDocFirmaDigital(null);
  };

  const stepIsValid = (step: number) => {
    if (step === 1) return Object.keys(errorsPaso1).length === 0;
    if (step === 2) return Object.keys(errorsPaso2).length === 0;
    if (step === 3) return Object.keys(errorsPaso3).length === 0;
    return false;
  };

  const tieneCambios = !!selectedSocio && (
    editDireccion.trim() !== (selectedSocio.direccion || '').trim() ||
    editTelefono !== (selectedSocio.telefono || '') ||
    editCorreo.trim() !== (selectedSocio.correo || '').trim() ||
    editActividadEconomica !== (selectedSocio.actividadEconomica || '') ||
    editLugarTrabajo.trim() !== (selectedSocio.lugarTrabajo || '').trim() ||
    (parseFloat(editIngresosMensuales) || 0) !== (parseFloat(selectedSocio.ingresosMensuales) || 0) ||
    (parseFloat(editGastosMensuales) || 0) !== (parseFloat(selectedSocio.gastosMensuales) || 0) ||
    (parseFloat(editDeudasActuales) || 0) !== (parseFloat(selectedSocio.deudasActuales) || 0)
  );

  return (
    <div className="w-full py-4 select-none animate-fade-in text-left">
      
      {/* Contenedor principal estilo Apple Light */}
      <div className={`mx-auto space-y-6 transition-all duration-300 ${
        activeTab === 'registrados' ? 'max-w-6xl' : 'max-w-4xl'
      }`}>
        
        {/* Cabecera de Módulo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#0054A6]" />
              Creación de Socios y Apertura de Cuentas
            </h2>
          </div>
          <div className="flex items-center gap-1 bg-slate-100/70 border border-slate-200/50 p-1.5 rounded-2xl shadow-inner animate-fade-in">
            <button
              onClick={() => setActiveTab('nuevo')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'nuevo'
                  ? 'bg-white text-[#0054A6] shadow-sm'
                  : 'text-slate-500 hover:text-slate-750'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo Registro
            </button>
            <button
              onClick={() => setActiveTab('registrados')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'registrados'
                  ? 'bg-white text-[#0054A6] shadow-sm'
                  : 'text-slate-500 hover:text-slate-750'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Socios Registrados
            </button>
          </div>
        </div>

        {activeTab === 'nuevo' ? (
          <>
            {/* Indicador Visual de Pasos (Píldora Apple) */}
            <div className="grid grid-cols-3 gap-2.5 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
              <button
                onClick={() => stepIsValid(1) && setCurrentStep(1)}
                disabled={currentStep === 1}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  currentStep === 1 
                    ? 'bg-[#0054A6] text-white shadow-sm shadow-blue-500/10'
                    : 'text-slate-500 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-white/15 border border-white/10 flex items-center justify-center text-[10px] font-black">1</span>
                <span className="hidden sm:inline">Datos Personales</span>
              </button>

              <button
                onClick={() => stepIsValid(1) && setCurrentStep(2)}
                disabled={!stepIsValid(1) || currentStep === 2}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  currentStep === 2 
                    ? 'bg-[#0054A6] text-white shadow-sm shadow-blue-500/10'
                    : 'text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-white/15 border border-white/10 flex items-center justify-center text-[10px] font-black">2</span>
                <span className="hidden sm:inline">Socioeconomía</span>
              </button>

              <button
                onClick={() => stepIsValid(1) && stepIsValid(2) && setCurrentStep(3)}
                disabled={!stepIsValid(1) || !stepIsValid(2) || currentStep === 3}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  currentStep === 3 
                    ? 'bg-[#0054A6] text-white shadow-sm shadow-blue-500/10'
                    : 'text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-white/15 border border-white/10 flex items-center justify-center text-[10px] font-black">3</span>
                <span className="hidden sm:inline">KYC y Beneficiarios</span>
              </button>
            </div>

            {/* Error transaccional superior */}
            {errorTransaccion && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-3xl flex gap-3 items-start animate-fade-in shadow-sm">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-800 uppercase">Error de Registro Transaccional</h4>
                  <p className="text-xs text-rose-600 leading-relaxed font-semibold">{errorTransaccion}</p>
                </div>
              </div>
            )}

            {/* Cuerpo del Formulario en Tarjeta */}
            <Card className="rounded-3xl border border-slate-100 bg-white p-5 md:p-6 shadow-sm">
              
              {/* PASO 1: Datos Personales e Identificación */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-scale-up">
                  <div className="border-b border-slate-100 pb-2 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Paso 1: Identificación y Datos Personales</h3>
                  </div>

                  {/* Grid de Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Tipo de Identificación */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo Identificación</label>
                      <div className="flex gap-2">
                        {([
                          { val: 'C', name: 'Cédula' },
                          { val: 'R', name: 'RUC' },
                          { val: 'P', name: 'Pasaporte' }
                        ] as const).map((t) => (
                          <button
                            key={t.val}
                            type="button"
                            onClick={() => {
                              setTipoIdentificacion(t.val);
                              setIdentificacion('');
                            }}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              tipoIdentificacion === t.val
                                ? 'bg-blue-50/50 border-[#0054A6]/30 text-[#0054A6] shadow-sm'
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Identificación (Cédula/RUC) */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {tipoIdentificacion === 'C' ? 'Cédula de Identidad' : tipoIdentificacion === 'R' ? 'Número de RUC' : 'Número de Pasaporte'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={tipoIdentificacion === 'C' ? 'Ej: 1724285888' : tipoIdentificacion === 'R' ? 'Ej: 1724285888001' : 'Ej: 0987654321'}
                          value={identificacion}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (tipoIdentificacion === 'C') {
                              val = val.substring(0, 10);
                            } else if (tipoIdentificacion === 'R') {
                              val = val.substring(0, 13);
                            } else if (tipoIdentificacion === 'P') {
                              val = val.substring(0, 15);
                            }
                            setIdentificacion(val);
                          }}
                          className={`w-full border rounded-xl text-xs h-9.5 pl-3.5 pr-8 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 ${
                            identificacion && errorsPaso1.identificacion
                              ? 'border-rose-300 focus:border-rose-500'
                              : 'border-slate-200 focus:border-[#0054A6]'
                          }`}
                        />
                        {identificacion && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            {errorsPaso1.identificacion ? (
                              <AlertTriangle className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                            ) : (
                              <Check className="h-4.5 w-4.5 text-emerald-500" />
                            )}
                          </span>
                        )}
                      </div>
                      {identificacion && errorsPaso1.identificacion && (
                        <span className="text-[10px] text-rose-500 font-bold tracking-wide block leading-tight">
                          {errorsPaso1.identificacion}
                        </span>
                      )}
                    </div>

                    {/* Nombres Completos */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombres Completos</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Ej: JUAN CARLOS PÉREZ GÓMEZ"
                          value={nombresCompletos}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '').toUpperCase();
                            setNombresCompletos(val);
                          }}
                          className="w-full border border-slate-200 rounded-xl text-xs h-9.5 pl-9.5 pr-3 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]"
                        />
                      </div>
                    </div>

                    {/* Fecha de Nacimiento */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Nacimiento</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          value={fechaNacimiento}
                          onChange={(e) => setFechaNacimiento(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl text-xs h-9.5 pl-9.5 pr-3 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] cursor-pointer"
                        />
                      </div>
                      {fechaNacimiento && errorsPaso1.fechaNacimiento && (
                        <span className="text-[10px] text-rose-500 font-bold tracking-wide block leading-tight">
                          {errorsPaso1.fechaNacimiento}
                        </span>
                      )}
                    </div>

                    {/* Estado Civil */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado Civil</label>
                      <div className="relative">
                        <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <select
                          value={estadoCivil}
                          onChange={(e) => setEstadoCivil(e.target.value)}
                          className="w-full border border-slate-200 text-slate-700 font-bold rounded-xl text-xs h-9.5 pl-9.5 pr-8 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
                        >
                          <option value="SOLTERO">Soltero/a</option>
                          <option value="CASADO">Casado/a</option>
                          <option value="DIVORCIADO">Divorciado/a</option>
                          <option value="VIUDO">Viudo/a</option>
                          <option value="UNION_HECHO">Unión de Hecho</option>
                        </select>
                      </div>
                    </div>

                    {/* Teléfono Celular (09XXXXXXXX) */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Celular (Ecuador)</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Ej: 0998765432"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').substring(0, 10))}
                          className={`w-full border rounded-xl text-xs h-9.5 pl-9.5 pr-3 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 ${
                            telefono && errorsPaso1.telefono
                              ? 'border-rose-300 focus:border-rose-500'
                              : 'border-slate-200 focus:border-[#0054A6]'
                          }`}
                        />
                      </div>
                      {telefono && errorsPaso1.telefono && (
                        <span className="text-[10px] text-rose-500 font-bold tracking-wide block leading-tight">
                          {errorsPaso1.telefono}
                        </span>
                      )}
                    </div>

                    {/* Correo Electrónico */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="email"
                            placeholder="Ej: juan.perez@gmail.com"
                            value={correo}
                            onChange={(e) => {
                              setCorreo(e.target.value);
                              setCorreoVerificado(false);
                            }}
                            className={`w-full border rounded-xl text-xs h-9.5 pl-9.5 pr-3 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 ${
                              correo && errorsPaso1.correo
                                ? 'border-rose-300 focus:border-rose-500'
                                : 'border-slate-200 focus:border-[#0054A6]'
                            }`}
                          />
                        </div>
                        {correoVerificado ? (
                          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 rounded-xl text-emerald-600 text-xs font-bold shrink-0">
                            <Check className="h-4 w-4" />
                            <span>Verificado</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleEnviarOtp}
                            disabled={cargandoOtp || !correo || !!errorsPaso1.correo}
                            className="bg-[#0054A6] hover:bg-[#004080] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                          >
                            {cargandoOtp ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <span>Verificar</span>
                            )}
                          </button>
                        )}
                      </div>
                      {correo && errorsPaso1.correo && (
                        <span className="text-[10px] text-rose-500 font-bold tracking-wide block leading-tight">
                          {errorsPaso1.correo}
                        </span>
                      )}
                    </div>

                    {/* Es PEP */}
                    <div className="space-y-1.5 md:col-span-2 pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={esPep}
                          onChange={(e) => setEsPep(e.target.checked)}
                          className="h-4.5 w-4.5 text-[#0054A6] rounded border-slate-300 focus:ring-[#0054A6]"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">Persona Expuesta Políticamente (PEP)</span>
                          <span className="text-[10px] font-semibold text-slate-450">Declaro ocupar o haber ocupado funciones públicas destacadas en Ecuador.</span>
                        </div>
                      </label>
                    </div>

                    {/* Reactividad: Cargo PEP */}
                    {esPep && (
                      <div className="space-y-1.5 md:col-span-2 animate-fade-in">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Cargo / Función Pública <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Asambleísta Nacional, Subsecretario de Estado, Juez de la Corte"
                          value={cargoPep}
                          onChange={(e) => setCargoPep(e.target.value.toUpperCase())}
                          className={`w-full border rounded-xl text-xs h-9.5 px-3.5 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 ${
                            esPep && errorsPaso1.cargoPep
                              ? 'border-rose-300 focus:border-rose-500'
                              : 'border-slate-200 focus:border-[#0054A6]'
                          }`}
                        />
                        {esPep && errorsPaso1.cargoPep && (
                          <span className="text-[10px] text-rose-500 font-bold tracking-wide block leading-tight">
                            {errorsPaso1.cargoPep}
                          </span>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Botón Siguiente */}
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button
                      onClick={() => setCurrentStep(2)}
                      disabled={!stepIsValid(1)}
                      className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-10 px-5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente paso
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* PASO 2: Información Socioeconómica */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-scale-up">
                  <div className="border-b border-slate-100 pb-2 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Paso 2: Información Socioeconómica y Capacidad de Pago</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Dirección Domiciliaria */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dirección Domiciliaria Completa</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Ej: Av. Amazonas N32-156 y Villalengua, Quito, Pichincha"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl text-xs h-9.5 pl-9.5 pr-3 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]"
                        />
                      </div>
                    </div>

                    {/* Actividad Económica */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actividad Económica</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <select
                          value={actividadEconomica}
                          onChange={(e) => {
                            setActividadEconomica(e.target.value);
                            if (e.target.value === 'ESTUDIANTE' || e.target.value === 'DESEMPLEADO') {
                              setLugarTrabajo('Ninguno');
                            } else if (lugarTrabajo === 'Ninguno') {
                              setLugarTrabajo('');
                            }
                          }}
                          className="w-full border border-slate-200 text-slate-700 font-bold rounded-xl text-xs h-9.5 pl-9.5 pr-8 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
                        >
                          <option value="EMPLEADO_PRIVADO">Empleado Privado</option>
                          <option value="EMPLEADO_PUBLICO">Empleado Público</option>
                          <option value="INDEPENDIENTE">Comerciante / Independiente</option>
                          <option value="PROFESIONAL_LIBERAL">Profesional Liberal</option>
                          <option value="JUBILADO">Jubilado</option>
                          <option value="ESTUDIANTE">Estudiante</option>
                          <option value="DESEMPLEADO">Sin Empleo</option>
                        </select>
                      </div>
                    </div>

                    {/* Lugar de Trabajo */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lugar de Trabajo / Razón Social</label>
                      <input
                        type="text"
                        placeholder="Ej: Corporación Favorita S.A."
                        value={lugarTrabajo}
                        onChange={(e) => setLugarTrabajo(e.target.value)}
                        disabled={actividadEconomica === 'ESTUDIANTE' || actividadEconomica === 'DESEMPLEADO'}
                        className="w-full border border-slate-200 rounded-xl text-xs h-9.5 px-3.5 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>

                    {/* Ingresos Mensuales */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingresos Mensuales Declarados ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="number"
                          placeholder="0.00"
                          value={ingresosMensuales}
                          onChange={(e) => setIngresosMensuales(e.target.value)}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="w-full border border-slate-200 rounded-xl text-xs h-9.5 pl-9.5 pr-3 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] font-mono"
                        />
                      </div>
                    </div>

                    {/* Gastos Mensuales */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gastos Mensuales Declarados ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="number"
                          placeholder="0.00"
                          value={gastosMensuales}
                          onChange={(e) => setGastosMensuales(e.target.value)}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="w-full border border-slate-200 rounded-xl text-xs h-9.5 pl-9.5 pr-3 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] font-mono"
                        />
                      </div>
                    </div>

                    {/* Deudas Actuales */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deudas en Otras Instituciones ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="number"
                          placeholder="0.00"
                          value={deudasActuales}
                          onChange={(e) => setDeudasActuales(e.target.value)}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="w-full border border-slate-200 rounded-xl text-xs h-9.5 pl-9.5 pr-3 bg-slate-50/20 font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] font-mono"
                        />
                      </div>
                    </div>

                    {/* Caja de Cálculo de Flujo Neto en Caliente */}
                    <div className="md:col-span-2 pt-2.5">
                      <div className={`p-4 rounded-2xl border transition-all ${
                        flujoNeto > 0 
                          ? 'bg-blue-50/40 border-blue-100/50 text-[#0054A6]' 
                          : 'bg-rose-50/40 border-rose-100/50 text-rose-600'
                      }`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest block opacity-70">
                              Flujo Neto Familiar Mensual
                            </span>
                            <span className="text-[9px] font-semibold opacity-60 block mt-0.5 leading-snug">
                              (Ingresos: ${ingresosVal.toFixed(2)} - Gastos: ${gastosVal.toFixed(2)} - Deudas: ${deudasVal.toFixed(2)})
                            </span>
                          </div>
                          <span className="text-lg font-black font-mono">
                            ${flujoNeto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Botones Navegación */}
                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <Button
                      onClick={() => setCurrentStep(1)}
                      variant="outline"
                      className="border-slate-200 text-slate-655 hover:bg-slate-50 font-bold rounded-xl h-10 px-5 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Paso anterior
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(3)}
                      disabled={!stepIsValid(2)}
                      className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-10 px-5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente paso
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* PASO 3: Declaración de Beneficiarios y KYC */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-scale-up">
                  
                  {/* Sección Beneficiarios */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-[#0054A6]" />
                        Declaración de Beneficiarios de Cuenta
                      </h3>
                      <button
                        type="button"
                        onClick={agregarBeneficiario}
                        className="text-xs font-bold text-[#0054A6] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar Beneficiario
                      </button>
                    </div>

                    {/* Lista de filas de beneficiarios */}
                    <div className="space-y-3">
                      {beneficiarios.map((b, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-slate-50/50 border border-slate-100 items-start">
                          
                          {/* Nombres Completos */}
                          <div className="sm:col-span-4 space-y-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Nombre Completo</label>
                            <input
                              type="text"
                              placeholder="Ej: MARÍA ESTHER PÉREZ"
                              value={b.nombresCompletos}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '').toUpperCase();
                                updateBeneficiario(idx, 'nombresCompletos', val);
                              }}
                              className="w-full border border-slate-200 rounded-lg text-xs h-8 px-2.5 bg-white font-bold outline-none"
                            />
                          </div>

                          {/* Identificación */}
                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Identificación (10 dígitos)</label>
                            <input
                              type="text"
                              placeholder="Cédula"
                              value={b.identificacion}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                                updateBeneficiario(idx, 'identificacion', val);
                              }}
                              className="w-full border border-slate-200 rounded-lg text-xs h-8 px-2.5 bg-white font-bold outline-none"
                            />
                          </div>

                          {/* Parentesco */}
                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Parentesco</label>
                            <select
                              value={b.parentesco}
                              onChange={(e) => updateBeneficiario(idx, 'parentesco', e.target.value)}
                              className="w-full border border-slate-200 text-slate-700 font-bold rounded-lg text-xs h-8 px-2 bg-white"
                            >
                              <option value="CONYUGE">Cónyuge</option>
                              <option value="HIJO">Hijo/a</option>
                              <option value="PADRE">Padre / Madre</option>
                              <option value="HERMANO">Hermano/a</option>
                              <option value="OTRO">Otro</option>
                            </select>
                          </div>

                          {/* Porcentaje de Asignación */}
                          <div className="sm:col-span-1.5 space-y-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">% Asig.</label>
                            <input
                              type="number"
                              value={b.porcentajeAsignado}
                              onChange={(e) => updateBeneficiario(idx, 'porcentajeAsignado', e.target.value)}
                              onKeyDown={(e) => {
                                if (['e', 'E', '+', '-'].includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              className="w-full border border-slate-200 rounded-lg text-xs h-8 px-2 bg-white font-mono font-bold text-center outline-none"
                            />
                          </div>

                          {/* Eliminar */}
                          {beneficiarios.length > 1 && (
                            <div className="sm:col-span-0.5 pt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => eliminarBeneficiario(idx)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                        </div>
                      ))}
                    </div>

                    {/* Banner de suma de porcentajes */}
                    <div className="pt-1">
                      <div className={`p-2.5 rounded-xl border text-xs font-bold text-center flex items-center justify-center gap-1.5 ${
                        errorsPaso3.porcentajeSum 
                          ? 'bg-rose-50 border-rose-100 text-rose-600' 
                          : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      }`}>
                        {errorsPaso3.porcentajeSum ? (
                          <>
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>{errorsPaso3.porcentajeSum}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>Distribución de Beneficiarios completa (Suma: 100%)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Repositorio Documental KYC */}
                  <div className="space-y-3 pt-2">
                    <div className="border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-[#0054A6]" />
                        Repositorio Documental KYC (Requisitos SEPS/UAFE)
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Cédula Frontal */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cédula Frontal (PDF/Img)</label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            id="doc_frontal"
                            className="hidden"
                            onChange={(e) => setDocCedulaFrontal(e.target.files?.[0] || null)}
                          />
                          <label
                            htmlFor="doc_frontal"
                            className="border-2 border-dashed border-slate-200 hover:border-[#0054A6]/30 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-4.5 text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 w-full h-32 justify-center select-none"
                          >
                            <UploadCloud className="h-6 w-6 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-655 truncate max-w-full">
                              {docCedulaFrontal ? docCedulaFrontal.name : 'Subir Cédula Frontal'}
                            </span>
                            <span className="text-[8px] font-semibold text-slate-400">PDF, PNG, JPG</span>
                          </label>
                        </div>
                      </div>

                      {/* Cédula Posterior */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cédula Posterior (PDF/Img)</label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            id="doc_posterior"
                            className="hidden"
                            onChange={(e) => setDocCedulaPosterior(e.target.files?.[0] || null)}
                          />
                          <label
                            htmlFor="doc_posterior"
                            className="border-2 border-dashed border-slate-200 hover:border-[#0054A6]/30 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-4.5 text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 w-full h-32 justify-center select-none"
                          >
                            <UploadCloud className="h-6 w-6 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-655 truncate max-w-full">
                              {docCedulaPosterior ? docCedulaPosterior.name : 'Subir Cédula Posterior'}
                            </span>
                            <span className="text-[8px] font-semibold text-slate-400">PDF, PNG, JPG</span>
                          </label>
                        </div>
                      </div>

                      {/* Firma Digitalizada */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firma Manuscrita (Imagen)</label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            id="doc_firma"
                            className="hidden"
                            onChange={(e) => setDocFirmaDigital(e.target.files?.[0] || null)}
                          />
                          <label
                            htmlFor="doc_firma"
                            className="border-2 border-dashed border-slate-200 hover:border-[#0054A6]/30 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-4.5 text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 w-full h-32 justify-center select-none"
                          >
                            <UploadCloud className="h-6 w-6 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-655 truncate max-w-full">
                              {docFirmaDigital ? docFirmaDigital.name : 'Subir Firma Digitalizada'}
                            </span>
                            <span className="text-[8px] font-semibold text-slate-400">PNG, JPG (Fondo transparente)</span>
                          </label>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Botones Navegación y Guardar */}
                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <Button
                      onClick={() => setCurrentStep(2)}
                      variant="outline"
                      disabled={cargando}
                      className="border-slate-200 text-slate-655 hover:bg-slate-50 font-bold rounded-xl h-10 px-5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Paso anterior
                    </Button>
                    <Button
                      onClick={handleRegistrar}
                      disabled={!stepIsValid(3) || !correoVerificado || cargando}
                      className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-10 px-5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cargando ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Registrar y Abrir Cuentas
                        </>
                      )}
                    </Button>
                  </div>

                </div>
              )}

            </Card>
          </>
        ) : (
          /* PESTAÑA 2: SOCIOS REGISTRADOS */
          <div className="space-y-4 animate-fade-in">
            {/* Buscador de socios y filtros de estado */}
            <div className="flex flex-col md:flex-row items-center gap-3 w-full animate-fade-in">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar socios por número de identificación o nombres..."
                  value={searchSocioQuery}
                  onChange={(e) => setSearchSocioQuery(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-2xl h-11 pl-10.5 pr-4 text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] shadow-sm placeholder:text-slate-400"
                />
              </div>

              {/* Filtros de estado como botones pill */}
              <div className="flex items-center gap-1 bg-slate-100/70 border border-slate-200/50 p-1.5 rounded-2xl shrink-0 w-full md:w-auto h-11 shadow-inner">
                {[
                  { value: 'TODOS', label: 'Todos' },
                  { value: 'PENDIENTE', label: 'Pendientes' },
                  { value: 'ACTIVO', label: 'Activos' },
                  { value: 'INACTIVO', label: 'Inactivos' }
                ].map((item) => {
                  const isActive = estadoFilter === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => setEstadoFilter(item.value)}
                      className={`flex-1 md:flex-initial h-full px-4 rounded-xl text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider ${
                        isActive
                          ? 'bg-[#0054A6] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-750'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tabla de Socios */}
            <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden animate-fade-in">
              {loadingSocios ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0054A6]" />
                  <span className="text-xs font-bold">Cargando socios registrados...</span>
                </div>
              ) : sociosFiltrados.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="h-10 w-10 mx-auto mb-2.5 opacity-45 text-slate-400" />
                  <h4 className="text-sm font-bold text-slate-700">Sin Socios Registrados</h4>
                  <p className="text-xs font-semibold text-slate-450 mt-1">
                    No se encontraron registros que coincidan con la búsqueda.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-450 uppercase tracking-wider w-[12%]">Identificación</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-450 uppercase tracking-wider w-[24%]">Nombres Completos</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-450 uppercase tracking-wider w-[12%]">Celular</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-450 uppercase tracking-wider w-[20%]">Correo</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-450 uppercase tracking-wider text-center w-[8%]">Es PEP</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-450 uppercase tracking-wider w-[10%]">Estado</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-450 uppercase tracking-wider text-right w-[14%]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sociosFiltrados.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-slate-800 font-mono truncate w-[12%]">{s.identificacion}</td>
                          <td className="px-4 py-3 text-xs font-extrabold text-slate-700 uppercase truncate w-[24%]" title={s.nombresCompletos}>{s.nombresCompletos}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-500 font-mono truncate w-[12%]">{s.telefono}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-500 truncate w-[20%]" title={s.correo}>{s.correo}</td>
                          <td className="px-4 py-3 text-xs text-center w-[8%]">
                            {s.esPep ? (
                              <span className="px-2 py-0.5 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-100 rounded-md">SÍ</span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-md">NO</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs w-[10%]">
                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${
                              s.estado === 'ACTIVO' 
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                                : s.estado === 'PENDIENTE_APROBACION'
                                ? 'text-amber-700 bg-amber-50 border border-amber-100'
                                : 'text-rose-700 bg-rose-50 border border-rose-100'
                            }`}>
                              {s.estado === 'PENDIENTE_APROBACION' ? 'PENDIENTE' : s.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-right w-[14%] space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => handleVerDetalle(s)}
                              className="text-[10px] font-black text-[#0054A6] hover:text-[#004080] inline-flex items-center gap-0.5 cursor-pointer bg-blue-50/50 hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-100/30"
                            >
                              <Search className="h-3 w-3" />
                              Detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
        
      </div>

      {/* Modal Premium OTP */}
      {mostrarOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 overflow-y-auto animate-fade-in no-print">
          <div className="w-full max-w-md bg-white shadow-2xl border border-slate-100 rounded-[2rem] p-6 text-center transform transition-all duration-300 relative animate-scale-up">
            
            {/* Botón de Cerrar */}
            <button 
              onClick={() => setMostrarOtpModal(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto h-14 w-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
              <Mail className="h-7 w-7 text-[#0054A6]" />
            </div>

            <h3 className="text-lg font-black text-slate-800 tracking-tight">Verificación de Correo</h3>
            <p className="text-xs text-slate-450 mt-1.5 font-semibold">
              Hemos enviado un código OTP de 6 dígitos a <span className="font-extrabold text-slate-700">{correo}</span>.
            </p>

            {/* OTP Input */}
            <div className="mt-6 space-y-4">
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={codigoOtp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').substring(0, 6);
                  setCodigoOtp(val);
                }}
                className="w-full tracking-[1.5em] text-center text-xl font-black font-mono h-12 border border-slate-200 rounded-xl bg-slate-50/30 focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] outline-none transition-all pl-6"
              />

              {otpError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-2 items-center text-left">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <p className="text-[10px] text-rose-700 font-bold leading-normal">
                    {otpError}
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => setMostrarOtpModal(false)}
                  variant="outline"
                  className="flex-1 border-slate-200 text-slate-655 hover:bg-slate-50 font-bold rounded-xl h-11 transition-all cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleValidarOtp}
                  disabled={validandoOtp || codigoOtp.length !== 6}
                  className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-11 transition-all cursor-pointer disabled:opacity-50"
                >
                  {validandoOtp ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "Confirmar"
                  )}
                </Button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleEnviarOtp}
                  disabled={cargandoOtp}
                  className="text-xs text-[#0054A6] hover:underline font-bold transition-all cursor-pointer disabled:text-slate-400"
                >
                  {cargandoOtp ? "Reenviando..." : "¿No recibiste el código? Reenviar"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal confirmatorio redondeado final con doble cuenta y advertencia aportes */}
      {mostrarExitoModal && socioCreadoInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 overflow-y-auto animate-fade-in no-print">
          <div className="w-full max-w-md bg-white shadow-2xl border border-slate-100 rounded-[2rem] p-6 text-center transform transition-all duration-300 relative animate-scale-up">
            
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>

            <h3 className="text-lg font-black text-slate-800 tracking-tight">Socio Registrado con Éxito</h3>

            {/* Ficha Resumen de Cuentas Generadas */}
            <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-left font-sans">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-450 font-semibold">Socio:</span>
                <span className="font-extrabold text-slate-700 uppercase">{socioCreadoInfo.nombre}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-450 font-semibold">Cédula:</span>
                <span className="font-bold text-slate-700 font-mono">{socioCreadoInfo.identificacion}</span>
              </div>

              {/* Cuenta 1: Vista */}
              <div className="border-t border-slate-200/60 pt-2.5 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-extrabold">1. Cta. Ahorros Vista:</span>
                  <span className="font-black text-[#0054A6] font-mono tracking-wide">{socioCreadoInfo.numeroCuenta}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] pl-3">
                  <span className="text-slate-450 font-medium">Estado:</span>
                  <span className="font-black text-emerald-600 uppercase text-[9px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">ACTIVA</span>
                </div>
              </div>

              {/* Cuenta 2: Aportaciones */}
              <div className="border-t border-slate-200/60 pt-2.5 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-extrabold">2. Cta. Aportaciones:</span>
                  <span className="font-black text-[#0054A6] font-mono tracking-wide">{socioCreadoInfo.numeroCuentaAportaciones}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] pl-3">
                  <span className="text-slate-450 font-medium">Estado:</span>
                  <span className="font-black text-amber-600 uppercase text-[9px] bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">PENDIENTE_PAGO</span>
                </div>
              </div>

              {/* Advertencia obligatoria de pago aportes */}
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-2 items-start mt-2">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 font-bold leading-normal">
                  Aporte obligatorio de apertura: <span className="font-black">$20.00 USD</span>. Favor derivar al socio a ventanilla para realizar el depósito y habilitar los certificados de aportación.
                </p>
              </div>

            </div>

            {/* Botonera del Modal */}
            <div className="mt-6 flex flex-col gap-2 animate-fade-in">
              <Button
                onClick={handleDownloadKycNuevo}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl h-10 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm font-sans"
              >
                <FileText className="h-4 w-4 text-[#0054A6]" />
                Descargar Ficha KYC (PDF)
              </Button>
              <Button
                onClick={() => {
                  setMostrarExitoModal(false);
                  resetForm();
                  setSocioCreadoInfo(null);
                }}
                className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-10 transition-all cursor-pointer shadow-sm"
              >
                Derivar a Ventanilla / Finalizar
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Detalle, Portafolio y Mantenimiento KYC */}
      {isDetailModalOpen && selectedSocio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 overflow-y-auto no-print">
          <div className="w-full max-w-4xl bg-white shadow-2xl border border-slate-100 rounded-[2rem] p-6 relative animate-scale-up text-left max-h-[90vh] overflow-y-auto">
            
            {/* Mensaje de Confirmación Sutil */}
            {showSuccessToast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-50 border border-emerald-200/50 text-emerald-700 text-[10px] font-extrabold px-3.5 py-1.5 rounded-xl shadow-md shadow-emerald-500/5 flex items-center gap-1.5 animate-fade-in z-50">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                CAMBIOS GUARDADOS CON ÉXITO
              </div>
            )}

            {/* Botón de Cerrar */}
            <button 
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Cabecera del Modal */}
            <div className="border-b border-slate-100 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pr-10">
              <div>
                <span className="text-[9px] font-black text-[#0054A6] bg-blue-50 border border-blue-100/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Mantenimiento y Portafolio del Socio
                </span>
                <h3 className="text-lg font-black text-slate-800 tracking-tight mt-1.5 uppercase">
                  {selectedSocio.nombresCompletos}
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Identificación: <span className="font-bold font-mono">{selectedSocio.identificacion}</span>
                </p>
              </div>

              {/* Botonera de Acciones en Cabecera */}
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl h-8.5 px-3 transition-all flex items-center gap-1 cursor-pointer text-xs"
                  >
                    <Pencil className="h-3 w-3 text-[#0054A6]" />
                    Editar Datos
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl h-8.5 px-3 transition-all text-xs cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    {tieneCambios && (
                      <Button
                        onClick={handleGuardarCambios}
                        disabled={cargando}
                        className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-8.5 px-3.5 transition-all flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                      >
                        {cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Guardar Cambios
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  onClick={() => handleReimprimirKyc(selectedSocio)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl h-8.5 px-3 transition-all flex items-center gap-1 cursor-pointer text-xs shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5 text-[#0054A6]" />
                  Ficha KYC (PDF)
                </Button>
              </div>
            </div>

            {/* Cuerpo del Modal: Datos del Socio a la Izquierda, Cuentas del Socio a la Derecha */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Columna Izquierda: Ficha de Información */}
              <div className="md:col-span-7 space-y-4">
                
                {/* Alerta PEP */}
                {selectedSocio.esPep && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl flex gap-2.5 items-start">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-wide">Persona Expuesta Políticamente (PEP)</h4>
                      <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                        Cargo Público: <span className="font-extrabold">{selectedSocio.cargoPep || 'DECLARADO EN FICHA DIGITAL'}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Formulario/Vista de Contacto */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                    Datos de Identificación y Contacto
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    
                    {/* Celular */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Teléfono Celular</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTelefono}
                          onChange={(e) => setEditTelefono(e.target.value.replace(/\D/g, '').substring(0, 10))}
                          className={`w-full border rounded-lg text-xs h-8 px-2.5 bg-slate-50/20 font-bold outline-none ${
                            editErrors.telefono ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                          }`}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700 font-mono">{selectedSocio.telefono}</span>
                      )}
                      {editErrors.telefono && <span className="text-[9px] text-rose-500 font-bold block">{editErrors.telefono}</span>}
                    </div>

                    {/* Correo */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Correo Electrónico</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editCorreo}
                          onChange={(e) => setEditCorreo(e.target.value)}
                          className={`w-full border rounded-lg text-xs h-8 px-2.5 bg-slate-50/20 font-bold outline-none ${
                            editErrors.correo ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                          }`}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700 truncate block" title={selectedSocio.correo}>{selectedSocio.correo}</span>
                      )}
                      {editErrors.correo && <span className="text-[9px] text-rose-500 font-bold block">{editErrors.correo}</span>}
                    </div>

                    {/* Dirección */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Dirección Domiciliaria</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDireccion}
                          onChange={(e) => setEditDireccion(e.target.value)}
                          className={`w-full border rounded-lg text-xs h-8 px-2.5 bg-slate-50/20 font-bold outline-none ${
                            editErrors.direccion ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                          }`}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700 block leading-tight">{selectedSocio.direccion}</span>
                      )}
                      {editErrors.direccion && <span className="text-[9px] text-rose-500 font-bold block">{editErrors.direccion}</span>}
                    </div>

                    {/* Estado del Socio */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Estado del Socio</label>
                      {isEditing ? (
                        <select
                          value={selectedSocio.estado}
                          disabled={true}
                          className="w-full border border-slate-200 text-slate-400 font-bold rounded-lg text-xs h-8 px-1.5 bg-slate-100 cursor-not-allowed outline-none"
                        >
                          <option value="PENDIENTE_APROBACION">PENDIENTE</option>
                          <option value="ACTIVO">ACTIVO</option>
                          <option value="INACTIVO">INACTIVO</option>
                        </select>
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-black rounded-md ${
                          selectedSocio.estado === 'ACTIVO' 
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                            : selectedSocio.estado === 'PENDIENTE_APROBACION'
                            ? 'text-amber-700 bg-amber-50 border border-amber-100'
                            : 'text-rose-700 bg-rose-50 border border-rose-100'
                        }`}>
                          {selectedSocio.estado === 'PENDIENTE_APROBACION' ? 'PENDIENTE' : selectedSocio.estado}
                        </span>
                      )}
                    </div>

                  </div>
                </div>

                {/* Formulario/Vista Socioeconómica */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                    Información Financiera y Capacidad de Pago
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    
                    {/* Actividad Económica */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Actividad Económica</label>
                      {isEditing ? (
                        <select
                          value={editActividadEconomica}
                          onChange={(e) => {
                            setEditActividadEconomica(e.target.value);
                            if (e.target.value === 'ESTUDIANTE' || e.target.value === 'DESEMPLEADO') {
                              setEditLugarTrabajo('Ninguno');
                            } else if (editLugarTrabajo === 'Ninguno') {
                              setEditLugarTrabajo('');
                            }
                          }}
                          className="w-full border border-slate-200 text-slate-700 font-bold rounded-lg text-xs h-8 px-1.5 bg-white"
                        >
                          <option value="EMPLEADO_PRIVADO">Empleado Privado</option>
                          <option value="EMPLEADO_PUBLICO">Empleado Público</option>
                          <option value="INDEPENDIENTE">Comerciante / Independiente</option>
                          <option value="PROFESIONAL_LIBERAL">Profesional Liberal</option>
                          <option value="JUBILADO">Jubilado</option>
                          <option value="ESTUDIANTE">Estudiante</option>
                          <option value="DESEMPLEADO">Sin Empleo</option>
                        </select>
                      ) : (
                        <span className="text-xs font-bold text-slate-700 block">{selectedSocio.actividadEconomica.replace(/_/g, ' ')}</span>
                      )}
                    </div>

                    {/* Lugar de Trabajo */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Lugar de Trabajo / Empresa</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editLugarTrabajo}
                          onChange={(e) => setEditLugarTrabajo(e.target.value)}
                          disabled={editActividadEconomica === 'ESTUDIANTE' || editActividadEconomica === 'DESEMPLEADO'}
                          className={`w-full border rounded-lg text-xs h-8 px-2 bg-slate-50/20 font-bold outline-none disabled:bg-slate-100 ${
                            editErrors.lugarTrabajo ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                          }`}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700 block">{selectedSocio.lugarTrabajo || 'Independiente / N/A'}</span>
                      )}
                      {editErrors.lugarTrabajo && <span className="text-[9px] text-rose-500 font-bold block">{editErrors.lugarTrabajo}</span>}
                    </div>

                    {/* Ingresos Mensuales */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Ingresos Declarados ($)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editIngresosMensuales}
                          onChange={(e) => setEditIngresosMensuales(e.target.value)}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                          }}
                          className={`w-full border rounded-lg text-xs h-8 px-2.5 bg-slate-50/20 font-bold outline-none font-mono ${
                            editErrors.ingresos ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                          }`}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700 font-mono block">
                          ${parseFloat(selectedSocio.ingresosMensuales).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Gastos Mensuales */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Gastos Declarados ($)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editGastosMensuales}
                          onChange={(e) => setEditGastosMensuales(e.target.value)}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                          }}
                          className={`w-full border rounded-lg text-xs h-8 px-2.5 bg-slate-50/20 font-bold outline-none font-mono ${
                            editErrors.gastos ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                          }`}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700 font-mono block">
                          ${parseFloat(selectedSocio.gastosMensuales).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Deudas Actuales */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Deudas Financieras ($)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editDeudasActuales}
                          onChange={(e) => setEditDeudasActuales(e.target.value)}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                          }}
                          className={`w-full border rounded-lg text-xs h-8 px-2.5 bg-slate-50/20 font-bold outline-none font-mono ${
                            editErrors.deudas ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                          }`}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700 font-mono block">
                          ${parseFloat(selectedSocio.deudasActuales).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Capacidad de Pago Reactiva */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Capacidad de Pago</label>
                      <span className={`text-xs font-extrabold font-mono block ${
                        (isEditing 
                          ? (parseFloat(editIngresosMensuales)||0) - (parseFloat(editGastosMensuales)||0) - (parseFloat(editDeudasActuales)||0) 
                          : selectedSocio.capacidadPago !== undefined 
                          ? parseFloat(selectedSocio.capacidadPago) 
                          : (parseFloat(selectedSocio.ingresosMensuales) - parseFloat(selectedSocio.gastosMensuales) - parseFloat(selectedSocio.deudasActuales))
                        ) >= 0
                          ? 'text-[#0054A6]'
                          : 'text-rose-600'
                      }`}>
                        ${(isEditing 
                          ? (parseFloat(editIngresosMensuales)||0) - (parseFloat(editGastosMensuales)||0) - (parseFloat(editDeudasActuales)||0) 
                          : selectedSocio.capacidadPago !== undefined 
                          ? parseFloat(selectedSocio.capacidadPago) 
                          : (parseFloat(selectedSocio.ingresosMensuales) - parseFloat(selectedSocio.gastosMensuales) - parseFloat(selectedSocio.deudasActuales))
                        ).toFixed(2)}
                      </span>
                    </div>

                  </div>
                </div>

              </div>

              {/* Columna Derecha: Portafolio Financiero */}
              <div className="md:col-span-5 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                  Portafolio de Cuentas Cooperativas
                </h4>

                {loadingCuentas ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
                    <span className="text-[10px] font-bold">Consultando cuentas asociadas...</span>
                  </div>
                ) : cuentasSocio.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400">Socio sin cuentas activas registradas.</span>
                  </div>
                ) : (
                  <div className="space-y-4 font-sans text-left">
                    {cuentasSocio.map((cta) => {
                      const isVista = cta.tipo === 'AHORRO_VISTA';
                      const bgGradient = isVista 
                        ? 'bg-gradient-to-br from-[#0054A6] to-blue-800 text-white shadow-lg shadow-blue-500/10' 
                        : 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-100';

                      return (
                        <div 
                          key={cta.id} 
                          className={`rounded-2xl p-4 shadow-md flex flex-col justify-between h-32 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${bgGradient}`}
                        >
                          {/* Marca de agua / decoración */}
                          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 pointer-events-none">
                            <Users className="h-28 w-28" />
                          </div>

                          <div className="flex justify-between items-start z-10">
                            <div>
                              <span className="text-[9px] font-black tracking-widest uppercase opacity-75">
                                {isVista ? 'Ahorro a la Vista' : 'Certificado de Aportaciones'}
                              </span>
                              <h5 className="text-xs font-bold font-mono tracking-wider mt-1 opacity-90">
                                {cta.numeroCuenta.replace(/(\d{4})/g, '$1 ').trim()}
                              </h5>
                            </div>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                              isVista
                                ? 'bg-white/20 text-white border border-white/10'
                                : parseFloat(cta.saldo) > 0
                                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/20'
                                : 'bg-amber-500/25 text-amber-300 border border-amber-500/20'
                            }`}>
                              {isVista ? 'ACTIVA' : parseFloat(cta.saldo) > 0 ? 'ACTIVA' : 'PENDIENTE_PAGO'}
                            </span>
                          </div>

                          <div className="flex justify-between items-end z-10">
                            <div>
                              <span className="text-[8px] font-medium opacity-60 uppercase block">Saldo Disponible</span>
                              <span className="text-base font-black font-mono">
                                ${parseFloat(cta.saldo).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">COOP ITQ</span>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
