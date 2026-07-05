import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TablaAmortizacion } from '../../components/shared/TablaAmortizacion';
import { 
  User, MapPin, Briefcase, DollarSign, FileText, 
  UploadCloud, CheckCircle2, AlertTriangle, Trash2, 
  Plus, ArrowRight, ArrowLeft, Check, Loader2, Users,
  Mail, Phone, Calendar, Heart, Search, Printer, X, Pencil, Eye,
  CreditCard, ArrowRightLeft, Copy, Download, Lock,
  FolderOpen, IdCard, Activity, MinusCircle, ShieldCheck, KeyRound
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { drawExecutiveHeader, generarPdfTablaAmortizacionUniversal } from '../../utils/pdfGenerators';

interface Beneficiario {
  nombresCompletos: string;
  identificacion: string;
  parentesco: string;
  porcentajeAsignado: number;
}

export const CreacionSocios: React.FC = () => {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const isContador = user?.rol === 'CONTADOR';
  // Pestaña activa: 'nuevo' | 'registrados'
  const [activeTab, setActiveTab] = useState<'nuevo' | 'registrados'>(isContador ? 'registrados' : 'nuevo');

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

  // Previsualizaciones de imágenes de documentos
  const [previewFrontal, setPreviewFrontal] = useState<string>('');
  const [previewPosterior, setPreviewPosterior] = useState<string>('');
  const [previewFirma, setPreviewFirma] = useState<string>('');

  // Estados para verificación de identificación en tiempo real
  const [checkingIdentificacion, setCheckingIdentificacion] = useState<boolean>(false);
  const [identificacionExisteMsg, setIdentificacionExisteMsg] = useState<string>('');

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
  const [riesgoFilter, setRiesgoFilter] = useState<string>('TODOS');

  // Estados para Modal de Detalle, Portafolio y Edición KYC
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedSocio, setSelectedSocio] = useState<any | null>(null);
  const [cuentasSocio, setCuentasSocio] = useState<any[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [cargandoDocType, setCargandoDocType] = useState<'cedula-frontal' | 'cedula-posterior' | 'firma' | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Estados de edición de Socio (KYC)
  const [editDireccion, setEditDireccion] = useState<string>('');
  const [editTelefono, setEditTelefono] = useState<string>('');
  const [editCorreo, setEditCorreo] = useState<string>('');
  const [editActividadEconomica, setEditActividadEconomica] = useState<string>('');
  const [editLugarTrabajo, setEditLugarTrabajo] = useState<string>('');
  const [editIngresosMensuales, setEditIngresosMensuales] = useState<string>('0');
  const [editGastosMensuales, setEditGastosMensuales] = useState<string>('0');
  const [editDeudasActuales, setEditDeudasActuales] = useState<string>('0');
  const [editNombresCompletos, setEditNombresCompletos] = useState<string>('');
  const [editEstadoCivil, setEditEstadoCivil] = useState<string>('SOLTERO');
  const [editProfesion, setEditProfesion] = useState<string>('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<string>('');

  // Estados para Navegación 360 y Módulo de Apertura de Cuentas / Créditos
  const [activeDetailTab, setActiveDetailTab] = useState<'perfil' | 'cuentas' | 'creditos' | 'transacciones'>('perfil');
  const [creditosSocio, setCreditosSocio] = useState<any[]>([]);
  const [loadingCreditos, setLoadingCreditos] = useState<boolean>(false);
  const [transaccionesSocio, setTransaccionesSocio] = useState<any[]>([]);
  const [loadingTransacciones, setLoadingTransacciones] = useState<boolean>(false);
  const [filtroCuentaTx, setFiltroCuentaTx] = useState<string>('TODAS');
  const [isAperturaModalOpen, setIsAperturaModalOpen] = useState<boolean>(false);
  const [verPagare, setVerPagare] = useState<{cred: any, url: string} | null>(null);
  const [productosAhorro, setProductosAhorro] = useState<any[]>([]);
  const [selectedProductoId, setSelectedProductoId] = useState<number | ''>('');
  const [montoInicialApertura, setMontoInicialApertura] = useState<string>('0');
  const [fondearInmediatamente, setFondearInmediatamente] = useState<boolean>(false);
  const [aperturaError, setAperturaError] = useState<string | null>(null);
  const [cargandoApertura, setCargandoApertura] = useState<boolean>(false);
  const [copiedCtaId, setCopiedCtaId] = useState<number | null>(null);
  const [expandedCreditId, setExpandedCreditId] = useState<number | null>(null);
  const [filtroTxBuscar, setFiltroTxBuscar] = useState<string>('');
  const [filtroTxFechaDesde, setFiltroTxFechaDesde] = useState<string>('');
  const [filtroTxFechaHasta, setFiltroTxFechaHasta] = useState<string>('');

  // Filtros de créditos de un socio
  const [filtroCredBuscar, setFiltroCredBuscar] = useState<string>('');
  const [filtroCredEstado, setFiltroCredEstado] = useState<string>('TODOS');
  const [filtroCredFechaDesde, setFiltroCredFechaDesde] = useState<string>('');
  const [filtroCredFechaHasta, setFiltroCredFechaHasta] = useState<string>('');

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

    // Si ya existe en base de datos
    if (identificacionExisteMsg) {
      errs.identificacion = identificacionExisteMsg;
    }

    setErrorsPaso1(errs);
  }, [identificacion, tipoIdentificacion, nombresCompletos, telefono, correo, fechaNacimiento, esPep, cargoPep, identificacionExisteMsg]);

  // Verificar si la identificación ya existe (en tiempo real con debounce)
  useEffect(() => {
    let esFormatoValido = false;
    if (tipoIdentificacion === 'C' && /^\d{10}$/.test(identificacion) && validarCedulaEcuatoriana(identificacion)) {
      esFormatoValido = true;
    } else if (tipoIdentificacion === 'R' && /^\d{13}$/.test(identificacion) && validarRucEcuatoriano(identificacion)) {
      esFormatoValido = true;
    } else if (tipoIdentificacion === 'P' && identificacion.length >= 5 && identificacion.length <= 15) {
      esFormatoValido = true;
    }

    if (!esFormatoValido) {
      setIdentificacionExisteMsg('');
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setCheckingIdentificacion(true);
      setIdentificacionExisteMsg('');
      try {
        const response = await api.get(`/socios/buscar?identificacion=${identificacion}`);
        if (response.data && response.data.nombresCompletos) {
          setIdentificacionExisteMsg(`⚠️ Esta identificación ya está registrada para el socio: ${response.data.nombresCompletos}`);
        }
      } catch (error: any) {
        // Si el socio no existe, el backend devuelve 400. Esto es lo correcto para un nuevo registro.
        setIdentificacionExisteMsg('');
      } finally {
        setCheckingIdentificacion(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounce);
  }, [identificacion, tipoIdentificacion]);

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

  const handleEnviarRestablecimiento = async (id: number) => {
    setResetLoading(true);
    setResetSuccess('');
    try {
      const { data } = await api.post(`/socios/${id}/enviar-restablecimiento`);
      setResetSuccess(data?.message || 'Enlace de restablecimiento enviado correctamente al socio.');
      setTimeout(() => setResetSuccess(''), 5000);
    } catch (err: any) {
      alert(err.response?.data || 'Error al enviar el enlace de restablecimiento.');
    } finally {
      setResetLoading(false);
    }
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
    
    let matchesEstado = true;
    if (estadoFilter === 'PENDIENTE') matchesEstado = s.estado === 'PENDIENTE_APROBACION';
    else if (estadoFilter !== 'TODOS') matchesEstado = s.estado === estadoFilter;
    
    let matchesRiesgo = true;
    if (riesgoFilter !== 'TODOS') matchesRiesgo = s.estadoRiesgo === riesgoFilter;

    return matchesQuery && matchesEstado && matchesRiesgo;
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

    let currentY = drawExecutiveHeader(doc, activeTenant, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emisión: ${new Date().toLocaleDateString('es-EC')} ${new Date().toLocaleTimeString('es-EC')}`, pageWidth - margin, currentY - 5, { align: 'right' });

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
    drawLabelValue("Persona Expuesta PEP", pepStatus, 120, currentY, 40);

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
    const coopName = activeTenant?.name || "Cooperativa de Ahorro y Crédito";
    const declaracionText = `Declaro bajo juramento que los fondos y recursos depositados y movilizados en esta institución cooperativa tienen un origen lícito y provienen de las actividades socioeconómicas detalladas en esta ficha. Expresamente manifiesto que no provienen de ninguna actividad relacionada con el lavado de activos, financiamiento del terrorismo u otros delitos tipificados en la Ley de Prevención de Lavado de Activos de la República del Ecuador. Autorizo libre y voluntariamente a la ${coopName} a realizar las investigaciones, cruces de bases de datos y reportes de cumplimiento normativo ante la Superintendencia de Economía Popular y Solidaria (SEPS) y la Unidad de Análisis Financiero y Económico (UAFE) que correspondan por ley.`;
    const splitText = doc.splitTextToSize(declaracionText, pageWidth - 2 * margin);
    doc.text(splitText, margin, currentY);

    // VI. FIRMAS Y HUELLA
    const textHeight = splitText.length * 3.5;
    currentY += textHeight + 25;
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
    doc.text(coopName.toUpperCase(), xAsesor + lineLength/2, currentY, { align: 'center' });

    currentY += 2.5;
    doc.setFont("helvetica", "bold");
    doc.text("HUELLA DACTILAR", xHuella + 11, currentY + 4, { align: 'center' });

    doc.save(`ficha_kyc_${socio.identificacion}.pdf`);
  };

  // Se removió descargarAmortizacionPdf (se usa el generador universal de utilidades)

  // Descarga el pagaré digital en PDF usando jsPDF
  const generarPagareDoc = (cred: any, socio: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 20;
    const pageWidth = 210;
    let currentY = drawExecutiveHeader(doc, activeTenant, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.text(`PAGARÉ A LA ORDEN - OPERACIÓN Nº ${cred.numeroCredito}`, margin, currentY);

    currentY += 4;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(26, 26, 26);
    doc.text(`MONTO: $${parseFloat(cred.montoSolicitado || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })} USD`, margin, currentY);
    
    const fechaLetras = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`FECHA DE EMISIÓN: Quito, D.M., ${fechaLetras}`, 110, currentY);

    currentY += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    
    const textoPagare = `Por el presente PAGARÉ A LA ORDEN, yo, ${socio.nombresCompletos}, portador de la identificación nº ${socio.identificacion}, en mi calidad de DEUDOR PRINCIPAL, me obligo a pagar incondicional e irrevocablemente a la orden de ${activeTenant?.name?.toUpperCase() || 'LA COOPERATIVA'}, en sus oficinas de esta ciudad de Quito, la cantidad de $${parseFloat(cred.montoSolicitado || 0).toFixed(2)} USD (DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA), más los intereses generados a la tasa del ${parseFloat(cred.tasaInteresAnual || 0).toFixed(2)}% anual.\n\n` +
      `Este valor será cancelado en el plazo de ${cred.plazoMeses} meses, mediante cuotas consecutivas mensuales de acuerdo con la tabla de amortización adjunta a este título valor.\n\n` +
      `En caso de mora en el pago de una o más cuotas de capital o intereses, la cooperativa queda facultada para declarar vencida y exigible la totalidad de la obligación pendiente de pago y demandar por la vía coactiva o ejecutiva el saldo total deudor. El deudor acepta que el interés de mora sea cobrado a la tasa máxima permitida por la ley vigente al momento de la mora.\n\n` +
      `Para todos los efectos legales que se deriven de este pagaré, el deudor renuncia a fuero y domicilio, y se somete expresamente a los jueces y tribunales de la ciudad de Quito. Expresamente se exime a la cooperativa del protesto y de la presentación para el pago de este pagaré.`;

    // Split text to fit page
    const textLines = doc.splitTextToSize(textoPagare, pageWidth - 2 * margin);
    doc.text(textLines, margin, currentY);
    
    // Calculate new currentY based on number of text lines
    currentY += textLines.length * 5 + 15;

    if (currentY > 230) {
      doc.addPage();
      currentY = 30;
    }

    // Signature area
    doc.setDrawColor(148, 163, 184);
    doc.line(margin + 10, currentY, margin + 70, currentY);
    doc.line(pageWidth - margin - 70, currentY, pageWidth - margin - 10, currentY);
    
    currentY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(26, 26, 26);
    doc.text("DEUDOR PRINCIPAL", margin + 22, currentY);
    const repName = `REPRESENTANTE LEGAL ${(activeTenant?.name || "COOP").toUpperCase()}`;
    doc.text(repName, pageWidth - margin - 65, currentY);

    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Firma: ________________________`, margin + 15, currentY);
    doc.text(`Firma: ________________________`, pageWidth - margin - 65, currentY);

    currentY += 4;
    doc.text(`Identificación: ${socio.identificacion}`, margin + 15, currentY);
    doc.text(`Nombre: ${socio.nombresCompletos}`, margin + 15, currentY);

    return doc;
  };

  const descargarPagarePdf = (cred: any, socio: any) => {
    const doc = generarPagareDoc(cred, socio);
    doc.save(`pagare_operacion_${cred.numeroCredito}.pdf`);
  };

  const handleVerPagare = (cred: any, socio: any) => {
    const doc = generarPagareDoc(cred, socio);
    const url = doc.output('bloburl');
    setVerPagare({ cred, url: url.toString() });
  };

  // Exporta el historial de transacciones filtradas a un PDF
  const exportarTransaccionesPdf = (filtradas: any[], socio: any, cuentaSeleccionada: string) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 15;
    const pageWidth = 210;
    let currentY = drawExecutiveHeader(doc, activeTenant, 15);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text("ESTADO DE CUENTA / HISTORIAL DE TRANSACCIONES", margin, currentY);

    currentY += 3;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // Socio details
    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 84, 166);
    doc.text("INFORMACIÓN DEL SOCIO", margin, currentY);
    currentY += 2;
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 6;
    
    // Draw rows of details helper
    const drawRow = (l1: string, v1: string, l2: string, v2: string, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(l1 + ":", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(26, 26, 26);
      doc.text(v1, margin + 30, y);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(l2 + ":", 110, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(26, 26, 26);
      doc.text(v2, 110 + 32, y);
    };

    drawRow("Socio", socio.nombresCompletos, "Identificación", socio.identificacion, currentY);
    currentY += 5;
    drawRow("Cuenta Filtrada", cuentaSeleccionada, "Fecha Generación", new Date().toLocaleString('es-EC'), currentY);
    
    currentY += 8;

    // Table body
    const tableBody = filtradas.map((tx: any) => {
      const esCredito = tx.tipoTransaccion === 'CREDITO';
      return [
        tx.fechaContable ? new Date(tx.fechaContable).toLocaleString('es-EC') : 'N/A',
        tx.numeroCuenta || 'N/A',
        esCredito ? 'DEPÓSITO' : 'RETIRO',
        `${esCredito ? '+' : '-'}$${parseFloat(tx.monto || 0).toFixed(2)}`,
        `$${parseFloat(tx.saldoResultante || 0).toFixed(2)}`,
        `${tx.descripcion || ''} (Ref: ${tx.referencia || ''})`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Fecha y Hora', 'Cuenta', 'Tipo', 'Monto', 'Saldo Resultante', 'Concepto / Referencia']],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
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

    doc.save(`estado_cuenta_${socio.identificacion}.pdf`);
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

  const fetchTransaccionesSocio = async (cuentas: any[]) => {
    setLoadingTransacciones(true);
    setTransaccionesSocio([]);
    setFiltroCuentaTx('TODAS');
    if (!cuentas || cuentas.length === 0) {
      setLoadingTransacciones(false);
      return;
    }
    try {
      const allTransactionsList: any[] = [];
      for (const account of cuentas) {
        try {
          const txRes = await api.get(`/cuentas/${account.id}/transacciones`);
          const txsWithAccount = txRes.data.map((tx: any) => ({
            ...tx,
            numeroCuenta: account.numeroCuenta,
            tipoCuenta: account.tipo
          }));
          allTransactionsList.push(...txsWithAccount);
        } catch (txErr) {
          console.error(`Error al consultar transacciones para la cuenta ${account.id}:`, txErr);
        }
      }
      // Ordenar por fechaContable desc
      allTransactionsList.sort((a, b) => {
        const dateA = a.fechaContable ? new Date(a.fechaContable).getTime() : 0;
        const dateB = b.fechaContable ? new Date(b.fechaContable).getTime() : 0;
        return dateB - dateA;
      });
      setTransaccionesSocio(allTransactionsList);
    } catch (err) {
      console.error('Error al consultar transacciones del socio:', err);
    } finally {
      setLoadingTransacciones(false);
    }
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
    setEditNombresCompletos(socio.nombresCompletos);
    setEditEstadoCivil(socio.estadoCivil || 'SOLTERO');
    setEditProfesion(socio.profesion || '');
    setEditErrors({});
    setActiveDetailTab('perfil');
    setCreditosSocio([]);
    setLoadingCreditos(true);
    setTransaccionesSocio([]);
    setLoadingTransacciones(true);

    let fetchedCuentas: any[] = [];
    try {
      const res = await api.get(`/cuentas/socio/${socio.id}`);
      fetchedCuentas = res.data;
      setCuentasSocio(fetchedCuentas);
    } catch (err) {
      console.error('Error al consultar cuentas del socio:', err);
    } finally {
      setLoadingCuentas(false);
    }

    try {
      const resCred = await api.get(`/creditos/socio/${socio.id}`);
      setCreditosSocio(resCred.data);
    } catch (err) {
      console.error('Error al consultar créditos del socio:', err);
    } finally {
      setLoadingCreditos(false);
    }

    // Fetch transactions using the fetched accounts list
    await fetchTransaccionesSocio(fetchedCuentas);
  };

  const handleGuardarCambios = async () => {
    if (!selectedSocio) return;
    
    // Validaciones en caliente para los campos editados
    const errs: Record<string, string> = {};
    if (!editNombresCompletos.trim()) errs.nombresCompletos = 'Nombres completos son obligatorios';
    if (!editDireccion.trim()) errs.direccion = 'La dirección es obligatoria';
    if (!editTelefono || !/^09\d{8}$/.test(editTelefono)) errs.telefono = 'Celular ecuatoriano inválido';
    if (!editCorreo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editCorreo)) errs.correo = 'Correo electrónico inválido';
    if (!editProfesion.trim()) errs.profesion = 'La profesión es obligatoria';
    
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
        nombresCompletos: editNombresCompletos.trim(),
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
        estado: selectedSocio.estado,
        estadoCivil: editEstadoCivil,
        profesion: editProfesion.trim()
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

  // Subir documentos KYC (Cédula Frontal, Posterior, Firma) de manera asíncrona
  const handleUploadDocument = async (docType: 'cedula-frontal' | 'cedula-posterior' | 'firma', file: File) => {
    if (!selectedSocio) return;
    setCargandoDocType(docType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await api.post(`/socios/${selectedSocio.id}/${docType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const updatedSocio = { ...selectedSocio };
      if (docType === 'cedula-frontal') {
        updatedSocio.fotoCedulaFrontalUrl = res.data.fotoCedulaFrontalUrl;
      } else if (docType === 'cedula-posterior') {
        updatedSocio.fotoCedulaPosteriorUrl = res.data.fotoCedulaPosteriorUrl;
      } else if (docType === 'firma') {
        updatedSocio.firmaUrl = res.data.firmaUrl;
      }
      
      setSelectedSocio(updatedSocio);
      setSociosList((prev) => 
        prev.map((s) => (s.id === selectedSocio.id ? updatedSocio : s))
      );
      
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error('Error al subir documento KYC:', err);
      alert('Error al subir el documento: ' + (err.response?.data || err.message));
    } finally {
      setCargandoDocType(null);
    }
  };

  const handleAbrirAperturaModal = async () => {
    setAperturaError(null);
    setMontoInicialApertura('0');
    setSelectedProductoId('');
    setFondearInmediatamente(false);
    try {
      const res = await api.get('/productos-ahorro/activos');
      setProductosAhorro(res.data);
      setIsAperturaModalOpen(true);
    } catch (err: any) {
      console.error('Error al cargar productos de ahorro activos:', err);
      setProductosAhorro([]);
      setIsAperturaModalOpen(true);
    }
  };

  const handleAperturarCuentaSubmit = async () => {
    if (!selectedSocio || !selectedProductoId) {
      setAperturaError('Debe seleccionar un producto de ahorro.');
      return;
    }

    let monto = 0;
    if (fondearInmediatamente) {
      monto = parseFloat(montoInicialApertura);
      if (isNaN(monto) || monto <= 0) {
        setAperturaError('El monto inicial de fondeo debe ser mayor a cero.');
        return;
      }

      const prodSeleccionado = productosAhorro.find((p) => p.id === Number(selectedProductoId));
      if (prodSeleccionado && monto < parseFloat(prodSeleccionado.montoMinimoApertura)) {
        setAperturaError(`El monto mínimo de apertura para este producto es $${parseFloat(prodSeleccionado.montoMinimoApertura).toFixed(2)}`);
        return;
      }

      const cuentaVista = cuentasSocio.find(c => c.tipo === 'AHORRO_VISTA' && c.estado === 'ACTIVA');
      if (!cuentaVista) {
        setAperturaError('El socio no posee una cuenta de ahorros a la vista activa para realizar el fondeo.');
        return;
      }
      if (parseFloat(cuentaVista.saldo) < monto) {
        setAperturaError(`Saldo insuficiente en la cuenta de ahorros a la vista ($${parseFloat(cuentaVista.saldo).toFixed(2)}).`);
        return;
      }
    }

    setCargandoApertura(true);
    setAperturaError(null);
    try {
      const payload = {
        socioId: selectedSocio.id,
        productoAhorroId: Number(selectedProductoId),
        montoInicial: monto,
        medioFondeo: 'TRANSFERENCIA'
      };
      const res = await api.post('/cuentas/aperturar', payload);
      const nuevaCta = res.data;
      
      // Si se hizo un fondeo por transferencia, recargar el portafolio completo del socio para refrescar saldos
      if (monto > 0) {
        const resCuentas = await api.get(`/cuentas/socio/${selectedSocio.id}`);
        setCuentasSocio(resCuentas.data);
      } else {
        setCuentasSocio((prev) => [...prev, { ...nuevaCta, saldo: 0 }]); // Asegurar formato de saldo para mostrar
      }
      
      setIsAperturaModalOpen(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error('Error al aperturar cuenta:', err);
      const errMsg = err.response?.data || 'Error interno al aperturar cuenta. Verifique el saldo de la cuenta de origen.';
      setAperturaError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    } finally {
      setCargandoApertura(false);
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
    if (previewFrontal) URL.revokeObjectURL(previewFrontal);
    if (previewPosterior) URL.revokeObjectURL(previewPosterior);
    if (previewFirma) URL.revokeObjectURL(previewFirma);
    setPreviewFrontal('');
    setPreviewPosterior('');
    setPreviewFirma('');
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
    (parseFloat(editDeudasActuales) || 0) !== (parseFloat(selectedSocio.deudasActuales) || 0) ||
    editNombresCompletos.trim() !== (selectedSocio.nombresCompletos || '').trim() ||
    editEstadoCivil !== (selectedSocio.estadoCivil || 'SOLTERO') ||
    editProfesion.trim() !== (selectedSocio.profesion || '').trim()
  );

  // Helper to map credit state to a semantic badge
  const getEstadoCreditoBadge = (estado: string) => {
    switch (estado) {
      case 'DESEMBOLSADO':
        return {
          label: 'AL DÍA',
          classes: 'text-emerald-700 bg-emerald-50 border border-emerald-100'
        };
      case 'EN_MORA':
        return {
          label: 'EN MORA',
          classes: 'text-rose-700 bg-rose-50 border border-rose-100 font-bold'
        };
      case 'CANCELADO':
        return {
          label: 'LIQUIDADO',
          classes: 'text-slate-500 bg-slate-50 border border-slate-200'
        };
      case 'SOLICITADO':
        return {
          label: 'SOLICITADO',
          classes: 'text-amber-700 bg-amber-50 border border-amber-100'
        };
      case 'EN_REVISION':
        return {
          label: 'EN REVISIÓN',
          classes: 'text-blue-700 bg-blue-50 border border-blue-100'
        };
      case 'APROBADO':
        return {
          label: 'APROBADO',
          classes: 'text-cyan-700 bg-cyan-50 border border-cyan-100'
        };
      case 'RECHAZADO':
        return {
          label: 'RECHAZADO',
          classes: 'text-slate-500 bg-slate-100 border border-slate-200'
        };
      default:
        return {
          label: estado,
          classes: 'text-slate-700 bg-slate-50 border border-slate-200'
        };
    }
  };

  // Helper to get next due cuota's details
  const obtenerProximoVencimiento = (cred: any) => {
    if (!cred.cuotas || cred.cuotas.length === 0) return { fecha: 'N/A', monto: 0 };
    
    // Sort cuotas by numeroCuota
    const cuotasOrdenadas = [...cred.cuotas].sort((a, b) => a.numeroCuota - b.numeroCuota);
    
    // Find first unpaid cuota (PENDIENTE or EN_MORA)
    const proxima = cuotasOrdenadas.find((c: any) => c.estado === 'PENDIENTE' || c.estado === 'EN_MORA');
    
    if (!proxima) {
      return { fecha: 'N/A', monto: 0 };
    }
    
    // Remaining amount for this cuota: projected + mora - paid
    const totalProyectado = parseFloat(proxima.cuotaTotalProyectada || (parseFloat(proxima.capitalProyectado || 0) + parseFloat(proxima.interesProyectado || 0)));
    const totalMora = parseFloat(proxima.montoMoraAcumulado || 0);
    const totalPagado = parseFloat(proxima.capitalPagado || 0) + parseFloat(proxima.interesPagado || 0) + parseFloat(proxima.montoMoraPagado || 0);
    
    const montoPendiente = Math.max(0, (totalProyectado + totalMora) - totalPagado);
    
    return {
      fecha: proxima.fechaVencimiento ? new Date(proxima.fechaVencimiento).toLocaleDateString('es-EC') : 'N/A',
      monto: montoPendiente
    };
  };

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
          {!isContador && (
            <div className="flex items-center gap-1 bg-[#F1F3F6] p-1 rounded-full border border-slate-100/50 flex-row">
              <button
                onClick={() => setActiveTab('nuevo')}
                className="relative px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-slate-805"
              >
                {activeTab === 'nuevo' && (
                  <motion.div
                    layoutId="activeTabSocios"
                    className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                  activeTab === 'nuevo' ? 'text-white' : 'text-slate-500'
                }`}>
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo Registro
                </span>
              </button>
              <button
                onClick={() => setActiveTab('registrados')}
                className="relative px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-slate-805"
              >
                {activeTab === 'registrados' && (
                  <motion.div
                    layoutId="activeTabSocios"
                    className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                  activeTab === 'registrados' ? 'text-white' : 'text-slate-500'
                }`}>
                  <Users className="h-3.5 w-3.5" />
                  Socios Registrados
                </span>
              </button>
            </div>
          )}
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
                            let val = e.target.value;
                            if (tipoIdentificacion !== 'P') {
                              val = val.replace(/\D/g, '');
                            }
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
                            {checkingIdentificacion ? (
                              <Loader2 className="h-3.5 w-3.5 text-[#0054A6] animate-spin" />
                            ) : errorsPaso1.identificacion ? (
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
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setDocCedulaFrontal(file);
                              if (file && file.type.startsWith('image/')) {
                                if (previewFrontal) URL.revokeObjectURL(previewFrontal);
                                setPreviewFrontal(URL.createObjectURL(file));
                              } else {
                                if (previewFrontal) URL.revokeObjectURL(previewFrontal);
                                setPreviewFrontal('');
                              }
                            }}
                          />
                          <label
                            htmlFor="doc_frontal"
                            className="border-2 border-dashed border-slate-200 hover:border-[#0054A6]/30 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-4.5 text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 w-full h-32 justify-center select-none overflow-hidden"
                          >
                            {previewFrontal ? (
                              <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-slate-50">
                                <img src={previewFrontal} alt="Cédula Frontal" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                                  Cambiar Imagen
                                </div>
                              </div>
                            ) : (
                              <>
                                <UploadCloud className="h-6 w-6 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-655 truncate max-w-full">
                                  {docCedulaFrontal ? docCedulaFrontal.name : 'Subir Cédula Frontal'}
                                </span>
                                <span className="text-[8px] font-semibold text-slate-400">PDF, PNG, JPG</span>
                              </>
                            )}
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
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setDocCedulaPosterior(file);
                              if (file && file.type.startsWith('image/')) {
                                if (previewPosterior) URL.revokeObjectURL(previewPosterior);
                                setPreviewPosterior(URL.createObjectURL(file));
                              } else {
                                if (previewPosterior) URL.revokeObjectURL(previewPosterior);
                                setPreviewPosterior('');
                              }
                            }}
                          />
                          <label
                            htmlFor="doc_posterior"
                            className="border-2 border-dashed border-slate-200 hover:border-[#0054A6]/30 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-4.5 text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 w-full h-32 justify-center select-none overflow-hidden"
                          >
                            {previewPosterior ? (
                              <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-slate-50">
                                <img src={previewPosterior} alt="Cédula Posterior" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                                  Cambiar Imagen
                                </div>
                              </div>
                            ) : (
                              <>
                                <UploadCloud className="h-6 w-6 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-655 truncate max-w-full">
                                  {docCedulaPosterior ? docCedulaPosterior.name : 'Subir Cédula Posterior'}
                                </span>
                                <span className="text-[8px] font-semibold text-slate-400">PDF, PNG, JPG</span>
                              </>
                            )}
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
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setDocFirmaDigital(file);
                              if (file && file.type.startsWith('image/')) {
                                if (previewFirma) URL.revokeObjectURL(previewFirma);
                                setPreviewFirma(URL.createObjectURL(file));
                              } else {
                                if (previewFirma) URL.revokeObjectURL(previewFirma);
                                setPreviewFirma('');
                              }
                            }}
                          />
                          <label
                            htmlFor="doc_firma"
                            className="border-2 border-dashed border-slate-200 hover:border-[#0054A6]/30 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-4.5 text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 w-full h-32 justify-center select-none overflow-hidden"
                          >
                            {previewFirma ? (
                              <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-slate-50">
                                <img src={previewFirma} alt="Firma Manuscrita" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                                  Cambiar Imagen
                                </div>
                              </div>
                            ) : (
                              <>
                                <UploadCloud className="h-6 w-6 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-655 truncate max-w-full">
                                  {docFirmaDigital ? docFirmaDigital.name : 'Subir Firma Digitalizada'}
                                </span>
                                <span className="text-[8px] font-semibold text-slate-400">PNG, JPG (Fondo transparente)</span>
                              </>
                            )}
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
            {/* Buscador de socios y filtros de estado e indicadores */}
            <div className="flex flex-col md:flex-row flex-wrap items-center gap-3 w-full animate-fade-in">
              <div className="flex items-center gap-2 flex-1 w-full">
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
                {(searchSocioQuery || estadoFilter !== 'TODOS' || riesgoFilter !== 'TODOS') && (
                  <button
                    onClick={() => {
                      setSearchSocioQuery('');
                      setEstadoFilter('TODOS');
                      setRiesgoFilter('TODOS');
                    }}
                    className="h-11 w-11 shrink-0 flex items-center justify-center rounded-2xl border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 hover:text-rose-700 transition-all shadow-sm cursor-pointer animate-fade-in"
                    title="Limpiar Filtros"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>

              {/* Filtros de estado como botones pill */}
              <div className="flex items-center gap-1 bg-[#F1F3F6] p-1 rounded-full border border-slate-100/50 shrink-0 w-full md:w-auto h-11">
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
                      className="relative flex-1 md:flex-initial h-full px-4 rounded-full text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider text-slate-500 hover:text-slate-805"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeFilterSocio"
                          className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 transition-colors duration-300 ${
                        isActive ? 'text-white' : 'text-slate-500'
                      }`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Filtro de Riesgo (Select Desplegable) */}
              <div className="shrink-0 w-full md:w-48 h-11 relative">
                <select
                  value={riesgoFilter}
                  onChange={(e) => setRiesgoFilter(e.target.value)}
                  className="w-full border border-slate-200 text-slate-600 font-bold rounded-2xl text-[11px] uppercase tracking-wider h-11 pl-4 pr-10 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_1rem_center] bg-no-repeat cursor-pointer shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20"
                >
                  <option value="TODOS">Cualquier Riesgo</option>
                  <option value="AL_DIA">Al Día</option>
                  <option value="EN_MORA">En Mora</option>
                  <option value="SIN_CREDITO">Sin Crédito</option>
                </select>
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
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left w-[15%]">
                          <div className="flex items-center gap-2">
                            <IdCard className="w-3.5 h-3.5" />
                            Identificación
                          </div>
                        </th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left w-[25%]">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            Socio
                          </div>
                        </th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left w-[12%]">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" />
                            Contacto
                          </div>
                        </th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left w-[23%]">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" />
                            Correo
                          </div>
                        </th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center w-[15%]">
                          <div className="flex items-center justify-center gap-2">
                            <Activity className="w-3.5 h-3.5" />
                            Riesgo
                          </div>
                        </th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center w-[10%]">
                          <div className="flex items-center justify-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Estado
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sociosFiltrados.map((s) => (
                        <tr 
                          key={s.id} 
                          onClick={() => handleVerDetalle(s)}
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-slate-700 font-mono truncate w-[15%]">
                            <div className="flex items-center gap-2 group">
                              {s.identificacion}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(s.identificacion);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600"
                                title="Copiar identificación"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-800 capitalize truncate w-[25%]">
                            {s.nombresCompletos.toLowerCase()}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-slate-500 truncate w-[12%]">
                            {s.telefono}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-500 truncate w-[23%]">
                            {s.correo.toLowerCase()}
                          </td>
                          <td className="px-5 py-4 text-center w-[15%]">
                            {s.estadoRiesgo === 'EN_MORA' ? (
                              <span className="inline-flex items-center justify-center gap-1 px-3 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full whitespace-nowrap">
                                <AlertTriangle className="w-3 h-3" />
                                EN MORA
                              </span>
                            ) : s.estadoRiesgo === 'AL_DIA' ? (
                              <span className="inline-flex items-center justify-center gap-1 px-3 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3" />
                                AL DÍA
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1 px-3 py-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full whitespace-nowrap">
                                <MinusCircle className="w-3 h-3" />
                                N/A
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center w-[10%]">
                            <span className={`inline-flex items-center justify-center px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap ${
                              s.estado === 'ACTIVO' 
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                : s.estado === 'PENDIENTE_APROBACION'
                                ? 'text-amber-700 bg-amber-50 border border-amber-200'
                                : 'text-rose-700 bg-rose-50 border border-rose-200'
                            }`}>
                              {s.estado === 'PENDIENTE_APROBACION' ? 'PENDIENTE' : s.estado}
                            </span>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-md p-4 overflow-y-auto no-print">
          <div className="w-full md:w-[90vw] max-w-6xl bg-white shadow-2xl border border-slate-100 rounded-[2rem] p-6 relative animate-scale-up text-left max-h-[90vh] overflow-y-auto my-8">
            
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

            {/* Texto de Cabecera Centrado y Sutil */}
            <div className="text-center w-full mb-3 select-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Mantenimiento y Portafolio del Socio
              </span>
            </div>

            {/* Cabecera del Modal */}
            <div className="border-b border-slate-100 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pr-10">
              <div className="flex items-center gap-4">
                {/* Foto de Perfil del Socio (Avatar) */}
                <div className="h-16 w-16 rounded-full border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {selectedSocio.fotoPerfilUrl ? (
                    <img 
                      src={`http://localhost:8080/api/v1${selectedSocio.fotoPerfilUrl}`} 
                      alt="Foto de Perfil" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#0054A6]/10 text-[#0054A6] flex items-center justify-center font-black text-xl">
                      {selectedSocio.nombresCompletos ? selectedSocio.nombresCompletos.charAt(0).toUpperCase() : 'S'}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase leading-none">
                    {selectedSocio.nombresCompletos}
                  </h3>
                  <span className="text-xs text-slate-400 font-bold font-mono mt-1.5 block">
                    {selectedSocio.identificacion}
                  </span>
                </div>
              </div>

              {/* Botonera de Acciones en Cabecera */}
              <div className="flex items-center gap-2">
                {activeDetailTab === 'perfil' && (
                  <>
                    {!isEditing && !isContador ? (
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl h-8.5 px-3 transition-all flex items-center gap-1 cursor-pointer text-xs"
                      >
                        <Pencil className="h-3 w-3 text-[#0054A6]" />
                        Editar Datos
                      </Button>
                    ) : null}
                    {isEditing && (
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
                  </>
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

              {/* Selector de Pestañas Principal */}
              <div className="flex bg-[#F1F3F6] p-1 border border-slate-100/50 shadow-sm rounded-full w-fit gap-1 mb-6 no-print font-sans">
                <button
                  onClick={() => setActiveDetailTab('perfil')}
                  className="relative px-5 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-805"
                >
                  {activeDetailTab === 'perfil' && (
                    <motion.div
                      layoutId="activeTabDetailSocio"
                      className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-2 transition-colors duration-300 ${
                    activeDetailTab === 'perfil' ? 'text-white' : 'text-slate-500'
                  }`}>
                    <User className="h-3.5 w-3.5" />
                    Perfil General
                  </span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('cuentas')}
                  className="relative px-5 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-805"
                >
                  {activeDetailTab === 'cuentas' && (
                    <motion.div
                      layoutId="activeTabDetailSocio"
                      className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-2 transition-colors duration-300 ${
                    activeDetailTab === 'cuentas' ? 'text-white' : 'text-slate-500'
                  }`}>
                    <DollarSign className="h-3.5 w-3.5" />
                    Cuentas Financieras
                  </span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('creditos')}
                  className="relative px-5 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-805"
                >
                  {activeDetailTab === 'creditos' && (
                    <motion.div
                      layoutId="activeTabDetailSocio"
                      className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-2 transition-colors duration-300 ${
                    activeDetailTab === 'creditos' ? 'text-white' : 'text-slate-500'
                  }`}>
                    <CreditCard className="h-3.5 w-3.5" />
                    Créditos
                  </span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('transacciones')}
                  className="relative px-5 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-805"
                >
                  {activeDetailTab === 'transacciones' && (
                    <motion.div
                      layoutId="activeTabDetailSocio"
                      className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-2 transition-colors duration-300 ${
                    activeDetailTab === 'transacciones' ? 'text-white' : 'text-slate-500'
                  }`}>
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Transacciones
                  </span>
                </button>
              </div>

            {/* Contenido de la Pestaña Perfil */}
            {activeDetailTab === 'perfil' && (
              <div className="space-y-6 animate-fade-in text-left">
                
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

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Columna Izquierda: Identidad, Contacto y Botón */}
                  <div className="md:col-span-8 flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                      
                      {/* Bloque 1: Datos de Identidad */}
                      <div className="h-full flex flex-col space-y-4 bg-slate-50/30 p-4 border border-slate-100 rounded-2xl">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      Datos de Identidad
                    </h4>
                    
                    <div className="space-y-3.5">
                      {/* Cédula / Identificación */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Identificación (Cédula/RUC)</label>
                        {isEditing ? (
                          <div className="relative">
                            <input
                              type="text"
                              value={selectedSocio.identificacion}
                              readOnly={true}
                              disabled={true}
                              className="w-full border border-slate-200 rounded-lg text-xs h-8 pl-2.5 pr-8 bg-slate-100 text-slate-500 font-bold select-none cursor-not-allowed outline-none font-mono"
                            />
                            <Lock className="absolute right-2.5 top-2 h-4 w-4 text-slate-400" />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-700 font-mono block">{selectedSocio.identificacion}</span>
                        )}
                      </div>

                      {/* Nombres Completos */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Nombres Completos</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editNombresCompletos}
                            onChange={(e) => setEditNombresCompletos(e.target.value)}
                            className={`w-full border rounded-lg text-xs h-8 px-2.5 bg-slate-50/20 font-bold outline-none uppercase ${
                              editErrors.nombresCompletos ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                            }`}
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-700 block uppercase">{selectedSocio.nombresCompletos}</span>
                        )}
                        {editErrors.nombresCompletos && <span className="text-[9px] text-rose-500 font-bold block">{editErrors.nombresCompletos}</span>}
                      </div>

                      {/* Estado Civil */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Estado Civil</label>
                        {isEditing ? (
                          <select
                            value={editEstadoCivil}
                            onChange={(e) => setEditEstadoCivil(e.target.value)}
                            className="w-full border border-slate-200 text-slate-700 font-bold rounded-lg text-xs h-8 px-1.5 bg-white outline-none"
                          >
                            <option value="SOLTERO">Soltero/a</option>
                            <option value="CASADO">Casado/a</option>
                            <option value="DIVORCIADO">Divorciado/a</option>
                            <option value="VIUDO">Viudo/a</option>
                            <option value="UNION_DE_HECHO">Unión de Hecho</option>
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-slate-700 block uppercase">{selectedSocio.estadoCivil || 'SOLTERO'}</span>
                        )}
                      </div>

                      {/* Estado del Socio */}
                      <div className="space-y-1">
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

                      {/* Bloque 2: Datos de Contacto */}
                      <div className="h-full flex flex-col space-y-4 bg-slate-50/30 p-4 border border-slate-100 rounded-2xl">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      Datos de Contacto
                    </h4>
                    
                    <div className="space-y-3.5">
                      {/* Celular */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Teléfono Celular</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTelefono}
                            onChange={(e) => setEditTelefono(e.target.value.replace(/\D/g, '').substring(0, 10))}
                            className={`w-full border rounded-lg text-xs h-8 px-2.5 bg-slate-50/20 font-bold outline-none font-mono ${
                              editErrors.telefono ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                            }`}
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-700 font-mono block">{selectedSocio.telefono}</span>
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
                          <span className="text-xs font-bold text-slate-700 truncate block">{selectedSocio.correo}</span>
                        )}
                        {editErrors.correo && <span className="text-[9px] text-rose-500 font-bold block">{editErrors.correo}</span>}
                      </div>

                      {/* Dirección */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Dirección Domiciliaria</label>
                        {isEditing ? (
                          <textarea
                            value={editDireccion}
                            onChange={(e) => setEditDireccion(e.target.value)}
                            rows={4}
                            className={`w-full border rounded-lg text-xs p-2 bg-slate-50/20 font-bold outline-none resize-none ${
                              editErrors.direccion ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                            }`}
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-700 block leading-normal">{selectedSocio.direccion}</span>
                        )}
                        {editErrors.direccion && <span className="text-[9px] text-rose-500 font-bold block">{editErrors.direccion}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                    
                    {/* Botón Restablecer Contraseña (Bajo las dos tarjetas, sin bordes) */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                      <button
                        onClick={() => handleEnviarRestablecimiento(selectedSocio.id)}
                        disabled={resetLoading}
                        className="shrink-0 w-full sm:w-auto flex justify-center items-center gap-2 bg-[#0054A6] hover:bg-[#004080] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#0054A6]/15 hover:shadow-lg hover:shadow-[#0054A6]/25 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:active:scale-100"
                      >
                        {resetLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <KeyRound className="w-4 h-4" />
                        )}
                        Restablecer Contraseña
                      </button>
                      
                      {resetSuccess && (
                        <div className="flex-1 w-full sm:w-auto flex items-center gap-2.5 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 animate-in fade-in slide-in-from-left-4 duration-500">
                          <div className="bg-emerald-100/80 rounded-full p-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <span className="text-xs font-bold">{resetSuccess}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloque 3: Perfil Socioeconómico */}
                  <div className="md:col-span-4 space-y-4 bg-slate-50/30 p-4 border border-slate-100 rounded-2xl">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                      Perfil Socioeconómico
                    </h4>
                    
                    <div className="space-y-3.5">
                      {/* Profesión */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Profesión / Oficio</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editProfesion}
                            onChange={(e) => setEditProfesion(e.target.value)}
                            className={`w-full border rounded-lg text-xs h-8 px-2.5 bg-slate-50/20 font-bold outline-none ${
                              editErrors.profesion ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                            }`}
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-700 block">{selectedSocio.profesion || 'No especificada'}</span>
                        )}
                        {editErrors.profesion && <span className="text-[9px] text-rose-500 font-bold block">{editErrors.profesion}</span>}
                      </div>

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
                            className="w-full border border-slate-200 text-slate-700 font-bold rounded-lg text-xs h-8 px-1.5 bg-white outline-none"
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
                          <span className="text-xs font-bold text-slate-700 block uppercase">{selectedSocio.actividadEconomica.replace(/_/g, ' ')}</span>
                        )}
                      </div>

                      {/* Lugar de Trabajo */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Empresa / Lugar Trabajo</label>
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
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Ingresos Mensuales</label>
                        {isEditing ? (
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400 font-mono">$</span>
                            <input
                              type="number"
                              value={editIngresosMensuales}
                              onChange={(e) => setEditIngresosMensuales(e.target.value)}
                              onKeyDown={(e) => {
                                if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                              }}
                              className={`w-full border rounded-lg text-xs h-8 pl-6 pr-2.5 bg-slate-50/20 font-bold outline-none font-mono ${
                                editErrors.ingresos ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                              }`}
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-700 font-mono block">
                            ${parseFloat(selectedSocio.ingresosMensuales).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Gastos Mensuales */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Gastos Mensuales</label>
                        {isEditing ? (
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400 font-mono">$</span>
                            <input
                              type="number"
                              value={editGastosMensuales}
                              onChange={(e) => setEditGastosMensuales(e.target.value)}
                              onKeyDown={(e) => {
                                if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                              }}
                              className={`w-full border rounded-lg text-xs h-8 pl-6 pr-2.5 bg-slate-50/20 font-bold outline-none font-mono ${
                                editErrors.gastos ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                              }`}
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-700 font-mono block">
                            ${parseFloat(selectedSocio.gastosMensuales).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Deudas Actuales */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Deudas Financieras</label>
                        {isEditing ? (
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400 font-mono">$</span>
                            <input
                              type="number"
                              value={editDeudasActuales}
                              onChange={(e) => setEditDeudasActuales(e.target.value)}
                              onKeyDown={(e) => {
                                if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                              }}
                              className={`w-full border rounded-lg text-xs h-8 pl-6 pr-2.5 bg-slate-50/20 font-bold outline-none font-mono ${
                                editErrors.deudas ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#0054A6]'
                              }`}
                            />
                          </div>
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

                {/* Expediente Digital (KYC) */}
                <div className="border-t border-slate-100 pt-6 mt-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                    <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                    Expediente Digital (Documentos KYC)
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Cédula Anverso */}
                    {(() => {
                      const path = selectedSocio.fotoCedulaFrontalUrl;
                      const docUrl = path ? `http://localhost:8080/api/v1${path}` : '';
                      const isLoading = cargandoDocType === 'cedula-frontal';
                      return (
                        <div className="bg-white border border-slate-100 rounded-2xl flex flex-col h-56 shadow-sm relative overflow-hidden group hover:border-[#0054A6]/20 transition-all duration-300">
                          {isLoading && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30">
                              <Loader2 className="h-5 w-5 animate-spin text-[#0054A6]" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subiendo...</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center p-3 pb-2 border-b border-slate-100 bg-slate-50/30">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Cédula Anverso</span>
                            <span className={`h-2 w-2 rounded-full ${docUrl ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                          </div>
                          <div className="flex-1 w-full overflow-hidden flex items-center justify-center bg-slate-50/20 relative">
                            {docUrl ? (
                              <>
                                <img 
                                  src={docUrl} 
                                  alt="Cédula Anverso" 
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                                  onClick={() => setLightboxImage({ url: docUrl, title: "Cédula Anverso" })}
                                />
                                {!isContador && (
                                  <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-slate-150 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-250 z-20">
                                    <button
                                      onClick={() => setLightboxImage({ url: docUrl, title: "Cédula Anverso" })}
                                      className="p-1 rounded-md text-slate-600 hover:text-[#0054A6] hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center"
                                      title="Visualizar"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <label className="p-1 rounded-md text-slate-600 hover:text-[#0054A6] hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center relative">
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadDocument('cedula-frontal', file);
                                        }}
                                      />
                                      <UploadCloud className="h-3.5 w-3.5" />
                                    </label>
                                  </div>
                                )}
                              </>
                            ) : (
                              isContador ? (
                                <div className="flex flex-col items-center gap-1.5 text-slate-350 p-4 w-full h-full justify-center select-none">
                                  <FileText className="h-6 w-6 text-slate-300" />
                                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Sin Documento</span>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-[#0054A6] cursor-pointer transition-colors p-4 w-full h-full justify-center select-none">
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadDocument('cedula-frontal', file);
                                    }}
                                  />
                                  <UploadCloud className="h-6 w-6 text-slate-350 group-hover:scale-110 transition-transform duration-200" />
                                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Subir Documento</span>
                                </label>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Cédula Reverso */}
                    {(() => {
                      const path = selectedSocio.fotoCedulaPosteriorUrl;
                      const docUrl = path ? `http://localhost:8080/api/v1${path}` : '';
                      const isLoading = cargandoDocType === 'cedula-posterior';
                      return (
                        <div className="bg-white border border-slate-100 rounded-2xl flex flex-col h-56 shadow-sm relative overflow-hidden group hover:border-[#0054A6]/20 transition-all duration-300">
                          {isLoading && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30">
                              <Loader2 className="h-5 w-5 animate-spin text-[#0054A6]" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subiendo...</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center p-3 pb-2 border-b border-slate-100 bg-slate-50/30">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Cédula Reverso</span>
                            <span className={`h-2 w-2 rounded-full ${docUrl ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                          </div>
                          <div className="flex-1 w-full overflow-hidden flex items-center justify-center bg-slate-50/20 relative">
                            {docUrl ? (
                              <>
                                <img 
                                  src={docUrl} 
                                  alt="Cédula Reverso" 
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                                  onClick={() => setLightboxImage({ url: docUrl, title: "Cédula Reverso" })}
                                />
                                {!isContador && (
                                  <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-slate-150 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-250 z-20">
                                    <button
                                      onClick={() => setLightboxImage({ url: docUrl, title: "Cédula Reverso" })}
                                      className="p-1 rounded-md text-slate-600 hover:text-[#0054A6] hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center"
                                      title="Visualizar"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <label className="p-1 rounded-md text-slate-600 hover:text-[#0054A6] hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center relative">
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadDocument('cedula-posterior', file);
                                        }}
                                      />
                                      <UploadCloud className="h-3.5 w-3.5" />
                                    </label>
                                  </div>
                                )}
                              </>
                            ) : (
                              isContador ? (
                                <div className="flex flex-col items-center gap-1.5 text-slate-350 p-4 w-full h-full justify-center select-none">
                                  <FileText className="h-6 w-6 text-slate-300" />
                                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Sin Documento</span>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-[#0054A6] cursor-pointer transition-colors p-4 w-full h-full justify-center select-none">
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadDocument('cedula-posterior', file);
                                    }}
                                  />
                                  <UploadCloud className="h-6 w-6 text-slate-350 group-hover:scale-110 transition-transform duration-200" />
                                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Subir Documento</span>
                                </label>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Firma Registrada */}
                    {(() => {
                      const path = selectedSocio.firmaUrl;
                      const docUrl = path ? `http://localhost:8080/api/v1${path}` : '';
                      const isLoading = cargandoDocType === 'firma';
                      return (
                        <div className="bg-white border border-slate-100 rounded-2xl flex flex-col h-56 shadow-sm relative overflow-hidden group hover:border-[#0054A6]/20 transition-all duration-300">
                          {isLoading && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30">
                              <Loader2 className="h-5 w-5 animate-spin text-[#0054A6]" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subiendo...</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center p-3 pb-2 border-b border-slate-100 bg-slate-50/30">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Firma Registrada</span>
                            <span className={`h-2 w-2 rounded-full ${docUrl ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                          </div>
                          <div className="flex-1 w-full overflow-hidden flex items-center justify-center bg-slate-50/20 relative">
                            {docUrl ? (
                              <>
                                <img 
                                  src={docUrl} 
                                  alt="Firma Registrada" 
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                                  onClick={() => setLightboxImage({ url: docUrl, title: "Firma Registrada" })}
                                />
                                {!isContador && (
                                  <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-slate-150 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-250 z-20">
                                    <button
                                      onClick={() => setLightboxImage({ url: docUrl, title: "Firma Registrada" })}
                                      className="p-1 rounded-md text-slate-600 hover:text-[#0054A6] hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center"
                                      title="Visualizar"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <label className="p-1 rounded-md text-slate-600 hover:text-[#0054A6] hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center relative">
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadDocument('firma', file);
                                        }}
                                      />
                                      <UploadCloud className="h-3.5 w-3.5" />
                                    </label>
                                  </div>
                                )}
                              </>
                            ) : (
                              isContador ? (
                                <div className="flex flex-col items-center gap-1.5 text-slate-350 p-4 w-full h-full justify-center select-none">
                                  <FileText className="h-6 w-6 text-slate-300" />
                                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Sin Documento</span>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-[#0054A6] cursor-pointer transition-colors p-4 w-full h-full justify-center select-none">
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadDocument('firma', file);
                                    }}
                                  />
                                  <UploadCloud className="h-6 w-6 text-slate-350 group-hover:scale-110 transition-transform duration-200" />
                                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Subir Documento</span>
                                </label>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Contenido de la Pestaña Cuentas */}
            {activeDetailTab === 'cuentas' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Portafolio de Cuentas Financieras
                    </h4>
                    <p className="text-[9.5px] font-bold text-slate-400 mt-0.5">
                      Cuentas de ahorro a la vista y aportaciones sociales del socio
                    </p>
                  </div>
                  {/* Botón premium de Apertura */}
                  <Button
                    onClick={handleAbrirAperturaModal}
                    className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-8.5 px-3.5 transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-sm shadow-blue-500/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Aperturar Nueva Cuenta
                  </Button>
                </div>

                {loadingCuentas ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
                    <span className="text-[10px] font-bold">Consultando cuentas asociadas...</span>
                  </div>
                ) : cuentasSocio.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400">El socio no posee cuentas activas registradas.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cuentasSocio.map((cta) => {
                      const isVista = cta.tipo === 'AHORRO_VISTA';
                      const isProgramado = cta.tipo === 'AHORRO_PROGRAMADO';
                      const isAportaciones = cta.tipo === 'APORTACIONES';
                      
                      // 5. Borde sutil izquierdo basado en el tipo de producto
                      const borderLeftColor = isVista 
                        ? 'border-l-4 border-l-[#00E5FF]' 
                        : isProgramado
                        ? 'border-l-4 border-l-[#00E676]'
                        : isAportaciones
                        ? 'border-l-4 border-l-slate-400'
                        : 'border-l-4 border-l-amber-400';

                      const bgGradient = isVista 
                        ? 'bg-gradient-to-br from-[#0054A6] to-blue-800 text-white shadow-md' 
                        : isProgramado
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md shadow-emerald-500/10'
                        : isAportaciones
                        ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-100'
                        : 'bg-gradient-to-br from-amber-600 to-yellow-800 text-white shadow-md shadow-amber-500/10';

                      const accountLabel = cta.productoAhorro?.nombre || 
                        (isVista ? 'Ahorro a la Vista' : isAportaciones ? 'Aportaciones' : cta.tipo.replace(/_/g, ' '));

                      // 1. Badge Dinámico con colores semánticos basados en el estado real
                      const getStatusBadgeStyle = () => {
                        const st = (cta.estado || 'ACTIVA').toUpperCase();
                        if (st === 'ACTIVA') return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
                        if (st === 'BLOQUEADA') return 'bg-rose-500/30 text-rose-300 border-rose-400/30';
                        return 'bg-amber-500/20 text-amber-300 border-amber-400/30';
                      };

                      return (
                        <div 
                          key={cta.id} 
                          className={`rounded-2xl p-5 shadow-sm flex flex-col justify-between h-44 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${bgGradient} ${borderLeftColor}`}
                        >
                          {/* Marca de agua */}
                          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 pointer-events-none">
                            <Users className="h-28 w-28" />
                          </div>

                          <div className="flex justify-between items-start z-10">
                            <div>
                              <span className="text-[9px] font-black tracking-widest uppercase opacity-75">
                                {accountLabel}
                              </span>
                              
                              {/* 4. Clipboard Copy icon next to the account number */}
                              <h5 className="text-xs font-bold font-mono tracking-wider mt-1 opacity-90 flex items-center gap-1.5">
                                {cta.numeroCuenta.replace(/(\d{4})/g, '$1 ').trim()}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(cta.numeroCuenta);
                                    setCopiedCtaId(cta.id);
                                    setTimeout(() => setCopiedCtaId(null), 1500);
                                  }}
                                  className="p-1 rounded hover:bg-white/15 text-white/60 hover:text-white transition-all cursor-pointer relative"
                                  title="Copiar número de cuenta"
                                >
                                  {copiedCtaId === cta.id ? (
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black px-1.5 py-0.5 bg-emerald-500 text-white rounded shadow animate-fade-in whitespace-nowrap">
                                      ¡Copiado!
                                    </span>
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </h5>

                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded tracking-wide ${
                                  isAportaciones 
                                    ? 'bg-slate-650 text-slate-200 border border-slate-500'
                                    : 'bg-white/15 text-white border border-white/10' 
                                }`}>
                                  Tasa: {parseFloat(cta.tasaInteresAnual || 0).toFixed(2)}% Anual
                                </span>
                              </div>
                            </div>
                            
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide border ${getStatusBadgeStyle()}`}>
                              {cta.estado || 'ACTIVA'}
                            </span>
                          </div>

                          {/* 2. Desglose de Saldos */}
                          <div className="flex justify-between items-end z-10 mt-2">
                            <div className="flex gap-4">
                              <div>
                                <span className="text-[7.5px] font-medium opacity-65 uppercase block">Saldo Disponible</span>
                                <span className="text-sm font-black font-mono leading-none block mt-0.5">
                                  ${parseFloat(cta.saldo).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="border-l border-white/20 h-6 my-auto"></div>
                              <div>
                                <span className="text-[7.5px] font-medium opacity-65 uppercase block">Saldo Contable</span>
                                <span className="text-sm font-bold font-mono opacity-80 leading-none block mt-0.5">
                                  ${parseFloat(cta.saldo).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 3. Información de Antigüedad (Fecha de Creación) */}
                          <div className="z-10 flex justify-between items-center border-t border-white/10 pt-1.5 mt-1">
                            <span className="text-[8px] font-medium opacity-50 uppercase">{activeTenant?.name || 'COOP'}</span>
                            <span className="text-[8px] font-medium opacity-50">
                              Apertura: {cta.createdAt ? new Date(cta.createdAt).toLocaleDateString('es-EC') : 'N/A'}
                            </span>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Contenido de la Pestaña Créditos */}
            {activeDetailTab === 'creditos' && (
              <div className="space-y-4 animate-fade-in text-left">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                  Créditos Solicitados y Desembolsados
                </h4>
                {loadingCreditos ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
                    <span className="text-[10px] font-bold">Cargando información de créditos...</span>
                  </div>
                ) : creditosSocio.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400">El socio no registra solicitudes de crédito.</span>
                  </div>
                ) : (
                  <>
                    {/* Filtros Inteligentes de Créditos */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end mb-4 animate-fade-in">
                      {/* Buscador de Texto y Limpiar */}
                      <div className="sm:col-span-5 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buscar Nº Crédito o Monto</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder="Buscar..."
                              value={filtroCredBuscar}
                              onChange={(e) => setFiltroCredBuscar(e.target.value)}
                              className="w-full border border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9.5 pl-8 pr-3.5 bg-white outline-none transition-all shadow-sm focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20"
                            />
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                          </div>
                          {(filtroCredBuscar || filtroCredFechaDesde || filtroCredFechaHasta || filtroCredEstado !== 'TODOS') && (
                            <button
                              onClick={() => {
                                setFiltroCredBuscar('');
                                setFiltroCredFechaDesde('');
                                setFiltroCredFechaHasta('');
                                setFiltroCredEstado('TODOS');
                              }}
                              className="h-9.5 w-9.5 shrink-0 flex items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all shadow-sm cursor-pointer animate-fade-in"
                              title="Limpiar Filtros"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Filtro por Estado */}
                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                        <select
                          value={filtroCredEstado}
                          onChange={(e) => setFiltroCredEstado(e.target.value)}
                          className="w-full border border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9.5 pl-3.5 pr-8 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20"
                        >
                          <option value="TODOS">Todos los Estados</option>
                          <option value="DESEMBOLSADO">Desembolsado</option>
                          <option value="PAGADO">Cancelado / Liquidado</option>
                          <option value="EN_MORA">En Mora</option>
                          <option value="SOLICITADO">Solicitado</option>
                        </select>
                      </div>

                      {/* Fecha Desde */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Desde</label>
                        <input
                          type="date"
                          value={filtroCredFechaDesde}
                          onChange={(e) => setFiltroCredFechaDesde(e.target.value)}
                          className="w-full border border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9.5 px-2 bg-white outline-none transition-all shadow-sm focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20 font-mono"
                        />
                      </div>

                      {/* Fecha Hasta */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Hasta</label>
                        <input
                          type="date"
                          value={filtroCredFechaHasta}
                          onChange={(e) => setFiltroCredFechaHasta(e.target.value)}
                          className="w-full border border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9.5 px-2 bg-white outline-none transition-all shadow-sm focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20 font-mono"
                        />
                      </div>
                    </div>

                    {(() => {
                      const creditosSocioFiltrados = creditosSocio.filter(cred => {
                        let match = true;
                        if (filtroCredEstado !== 'TODOS') {
                          if (cred.estado !== filtroCredEstado) match = false;
                        }
                        if (filtroCredFechaDesde) {
                          if (!cred.fechaSolicitud || new Date(cred.fechaSolicitud) < new Date(filtroCredFechaDesde)) match = false;
                        }
                        if (filtroCredFechaHasta) {
                          if (!cred.fechaSolicitud || new Date(cred.fechaSolicitud) > new Date(filtroCredFechaHasta)) match = false;
                        }
                        if (filtroCredBuscar) {
                          const q = filtroCredBuscar.toLowerCase();
                          if (!cred.numeroCredito?.toLowerCase().includes(q) &&
                              !cred.montoSolicitado?.toString().includes(q)) {
                            match = false;
                          }
                        }
                        return match;
                      });

                      if (creditosSocioFiltrados.length === 0) {
                        return (
                          <div className="text-center py-8 bg-slate-50 border border-slate-100 rounded-2xl">
                            <span className="text-[10px] font-bold text-slate-400">No hay créditos que coincidan con los filtros aplicados.</span>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Nº Crédito</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Fecha Solicitud</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Monto</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Saldo Deudor</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Próximo Vencimiento</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Estado</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {creditosSocioFiltrados.map((cred) => {
                          const totalCapitalPagado = cred.cuotas ? cred.cuotas.reduce((sum: number, cuota: any) => sum + parseFloat(cuota.capitalPagado || 0), 0) : 0;
                          const saldoDeudor = cred.estado === 'DESEMBOLSADO' || cred.estado === 'EN_MORA'
                            ? Math.max(0, parseFloat(cred.montoDesembolsado || 0) - totalCapitalPagado)
                            : 0;

                          const prox = obtenerProximoVencimiento(cred);
                          const badge = getEstadoCreditoBadge(cred.estado);
                          const isExpanded = expandedCreditId === cred.id;

                          let runningBalance = parseFloat(cred.montoDesembolsado || cred.montoSolicitado || 0);
                          const cuotasOrdenadas = cred.cuotas ? [...cred.cuotas].sort((a, b) => a.numeroCuota - b.numeroCuota).map((cuota) => {
                            runningBalance = runningBalance - parseFloat(cuota.capitalProyectado || 0);
                            return {
                              ...cuota,
                              saldoRestante: Math.max(0, runningBalance)
                            };
                          }) : [];

                          return (
                            <React.Fragment key={cred.id}>
                              <tr 
                                onClick={() => setExpandedCreditId(isExpanded ? null : cred.id)}
                                className={`hover:bg-slate-50/70 active:bg-slate-100/50 transition-all duration-200 cursor-pointer border-b border-slate-100/60 ${isExpanded ? 'bg-[#0054A6]/[0.02]' : ''}`}
                              >
                                <td className="px-4 py-3.5 text-xs font-bold text-[#0054A6] font-mono truncate text-center">
                                  {cred.numeroCredito}
                                </td>
                                <td className="px-4 py-3.5 text-xs font-semibold text-slate-500 font-mono text-center">
                                  {cred.fechaSolicitud ? new Date(cred.fechaSolicitud).toLocaleDateString('es-EC') : 'N/A'}
                                </td>
                                <td className="px-4 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">
                                  ${parseFloat(cred.montoSolicitado || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">
                                  ${saldoDeudor.toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-xs font-semibold text-slate-650 font-mono text-center">
                                  {prox.fecha !== 'N/A' ? (
                                    <div className="flex flex-col items-center">
                                      <span className="text-slate-700 font-bold">${prox.monto.toFixed(2)}</span>
                                      <span className="text-[10px] text-slate-400 font-medium">Vence: {prox.fecha}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-medium">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-xs text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${badge.classes}`}>
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-xs text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        generarPdfTablaAmortizacionUniversal(cred, selectedSocio, cred.cuotas, activeTenant, user?.nombresCompletos || "Administrador");
                                      }}
                                      className="p-1.5 rounded-full bg-slate-50 text-slate-400 hover:text-[#0054A6] hover:bg-blue-50 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                      title="Imprimir tabla"
                                    >
                                      <Printer className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleVerPagare(cred, selectedSocio);
                                      }}
                                      className="p-1.5 rounded-full bg-slate-50 text-slate-400 hover:text-[#0054A6] hover:bg-blue-50 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                      title="Ver pagaré"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                                </tr>

                              {isExpanded && (
                                <tr className="bg-slate-50/30">
                                  <td colSpan={7} className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <div className="bg-white border border-slate-100/80 rounded-2xl p-4 shadow-sm animate-fade-in">
                                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
                                        <div className="flex items-center gap-3">
                                          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                            Detalle de Amortización — Sistema: {cred.tipoAmortizacion}
                                          </h5>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-semibold font-mono">
                                          Plazo: {cred.plazoMeses} Meses | Tasa: {parseFloat(cred.tasaInteresAnual || 0).toFixed(2)}%
                                        </span>
                                      </div>

                                      {!cred.cuotas || cred.cuotas.length === 0 ? (
                                        <div className="text-center py-4">
                                          <span className="text-xs text-slate-400 font-medium">No se registra cronograma de pagos para este crédito.</span>
                                        </div>
                                      ) : (
                                        <div className="mt-2">
                                          <TablaAmortizacion
                                            credito={cred}
                                            cuotas={cuotasOrdenadas.map((cuota: any) => ({
                                              num: cuota.numeroCuota,
                                              fecha: cuota.fechaVencimiento || 'N/A',
                                              capital: cuota.capitalProyectado || 0,
                                              interes: cuota.interesProyectado || 0,
                                              total: cuota.cuotaTotalProyectada || (parseFloat(cuota.capitalProyectado || 0) + parseFloat(cuota.interesProyectado || 0)),
                                              saldo: cuota.saldoRestante || 0,
                                              estado: cuota.estado
                                            }))}
                                            mostrarResumenSuperior={false}
                                            isEmbedded={true}
                                          />
                                        </div>
                                      )}
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
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* Contenido de la Pestaña Transacciones */}
            {activeDetailTab === 'transacciones' && (
              <div className="space-y-4 animate-fade-in text-left">
                {(() => {
                  const filtradas = transaccionesSocio.filter(tx => {
                    // Account filter
                    if (filtroCuentaTx !== 'TODAS' && tx.numeroCuenta !== filtroCuentaTx) {
                      return false;
                    }
                    // Text search filter
                    if (filtroTxBuscar) {
                      const query = filtroTxBuscar.toLowerCase();
                      const descMatches = tx.descripcion ? tx.descripcion.toLowerCase().includes(query) : false;
                      const refMatches = tx.referencia ? tx.referencia.toLowerCase().includes(query) : false;
                      if (!descMatches && !refMatches) return false;
                    }
                    // Date range filter
                    if (tx.fechaContable) {
                      const txDate = new Date(tx.fechaContable);
                      if (filtroTxFechaDesde) {
                        const fromDate = new Date(filtroTxFechaDesde + 'T00:00:00');
                        if (txDate < fromDate) return false;
                      }
                      if (filtroTxFechaHasta) {
                        const toDate = new Date(filtroTxFechaHasta + 'T23:59:59');
                        if (txDate > toDate) return false;
                      }
                    } else if (filtroTxFechaDesde || filtroTxFechaHasta) {
                      return false;
                    }
                    return true;
                  });

                  return (
                    <>
                      <div className="flex flex-col gap-4 border-b border-slate-100 pb-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Movimientos y Transacciones Ledger
                          </h4>
                          
                          {/* Botón Exportar PDF (Estado de Cuenta) */}
                          {transaccionesSocio.length > 0 && (
                            <Button
                              onClick={() => {
                                console.log("Exportando estado de cuenta en PDF...");
                                exportarTransaccionesPdf(filtradas, selectedSocio, filtroCuentaTx);
                              }}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl h-8.5 px-3 transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-sm font-sans shrink-0 self-end sm:self-auto"
                            >
                              <Download className="h-3.5 w-3.5 text-[#0054A6]" />
                              Exportar PDF
                            </Button>
                          )}
                        </div>

                        {/* Fila de Filtros Avanzados */}
                        {transaccionesSocio.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            {/* Buscador de Texto y Limpiar */}
                            <div className="sm:col-span-5 space-y-1.5">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buscar Concepto / Ref</label>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={filtroTxBuscar}
                                    onChange={(e) => setFiltroTxBuscar(e.target.value)}
                                    className="w-full border border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9.5 pl-8 pr-3.5 bg-white outline-none transition-all shadow-sm focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20"
                                  />
                                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                </div>
                                {(filtroTxBuscar || filtroTxFechaDesde || filtroTxFechaHasta || filtroCuentaTx !== 'TODAS') && (
                                  <button
                                    onClick={() => {
                                      setFiltroTxBuscar('');
                                      setFiltroTxFechaDesde('');
                                      setFiltroTxFechaHasta('');
                                      setFiltroCuentaTx('TODAS');
                                    }}
                                    className="h-9.5 w-9.5 shrink-0 flex items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all shadow-sm cursor-pointer animate-fade-in"
                                    title="Limpiar Filtros"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Filtro por Cuenta */}
                            <div className="sm:col-span-3 space-y-1.5">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuenta Financiera</label>
                              <select
                                value={filtroCuentaTx}
                                onChange={(e) => setFiltroCuentaTx(e.target.value)}
                                className="w-full border border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9.5 pl-3.5 pr-8 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20"
                              >
                                <option value="TODAS">Todas las Cuentas</option>
                                {cuentasSocio.map((cta) => (
                                  <option key={cta.id} value={cta.numeroCuenta}>
                                    {cta.numeroCuenta} ({cta.tipo === 'AHORRO_VISTA' ? 'Ahorros' : 'Aportes'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Fecha Desde */}
                            <div className="sm:col-span-2 space-y-1.5">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Desde</label>
                              <input
                                type="date"
                                value={filtroTxFechaDesde}
                                onChange={(e) => setFiltroTxFechaDesde(e.target.value)}
                                className="w-full border border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9.5 px-2 bg-white outline-none transition-all shadow-sm focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20 font-mono"
                              />
                            </div>

                            {/* Fecha Hasta */}
                            <div className="sm:col-span-2 space-y-1.5">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Hasta</label>
                              <input
                                type="date"
                                value={filtroTxFechaHasta}
                                onChange={(e) => setFiltroTxFechaHasta(e.target.value)}
                                className="w-full border border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9.5 px-2 bg-white outline-none transition-all shadow-sm focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20 font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {loadingTransacciones ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                          <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
                          <span className="text-[10px] font-bold">Cargando transacciones...</span>
                        </div>
                      ) : transaccionesSocio.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                          <span className="text-[10px] font-bold text-slate-400">No se registran transacciones para este socio.</span>
                        </div>
                      ) : filtradas.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                          <span className="text-[10px] font-bold text-slate-400">No hay transacciones que coincidan con los filtros aplicados.</span>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                          <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[18%]">Fecha y Hora</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[18%]">Cuenta</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[12%]">Tipo</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[12%]">Monto</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[12%]">Saldo</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[28%]">Concepto</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filtradas.map((tx) => {
                                const esCredito = tx.tipoTransaccion === 'CREDITO';
                                return (
                                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-semibold text-slate-500 font-mono">
                                      {tx.fechaContable ? new Date(tx.fechaContable).toLocaleString('es-EC') : 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-bold text-slate-700 font-mono">
                                      <span className="block">{tx.numeroCuenta}</span>
                                      <span className="text-[9px] font-medium text-slate-400 uppercase">
                                        {tx.tipoCuenta === 'AHORRO_VISTA' ? 'Ahorros' : 'Aportes'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                      <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-black rounded ${
                                        esCredito 
                                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                                          : 'text-rose-700 bg-rose-50 border border-rose-100'
                                      }`}>
                                        {esCredito ? 'DEPÓSITO' : 'RETIRO'}
                                      </span>
                                    </td>
                                    <td className={`px-4 py-3 text-xs font-black font-mono ${
                                      esCredito ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                      {esCredito ? '+' : '-'}${parseFloat(tx.monto).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-bold text-slate-700 font-mono">
                                      ${parseFloat(tx.saldoResultante).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 truncate">
                                      <span className="block font-semibold text-slate-700 truncate">{tx.descripcion}</span>
                                      <span className="block text-[9px] font-mono text-slate-400 truncate">Ref: {tx.referencia}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal de Apertura de Cuenta */}
      {isAperturaModalOpen && (
        <div id="modal-apertura-cuenta" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 overflow-y-auto animate-fade-in no-print">
          <div className="w-full max-w-lg bg-white shadow-2xl border border-slate-100 rounded-[2rem] p-6 relative animate-scale-up text-left">
            {/* Botón de Cerrar */}
            <button 
              id="btn-cerrar-apertura"
              onClick={() => setIsAperturaModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-[#0054A6]" />
            </div>

            <h3 className="text-base font-black text-slate-800 tracking-tight text-center">
              Aperturar Nueva Cuenta de Ahorro
            </h3>
            <p className="text-[10px] text-slate-450 mt-1 font-semibold text-center uppercase tracking-wider">
              Socio: {selectedSocio?.nombresCompletos}
            </p>

            <div className="mt-5 space-y-4">
              {/* Selector de Producto */}
              <div>
                <label id="lbl-producto" htmlFor="select-producto" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Producto de Ahorro
                </label>
                <select
                  id="select-producto"
                  value={selectedProductoId}
                  onChange={(e) => {
                    setSelectedProductoId(e.target.value ? Number(e.target.value) : '');
                    setAperturaError(null);
                  }}
                  className="w-full h-11 border border-slate-200 rounded-xl bg-slate-50/50 px-3.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] outline-none transition-all cursor-pointer"
                >
                  <option value="">Seleccione un producto...</option>
                  {productosAhorro.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.nombre} (Mín. ${parseFloat(prod.montoMinimoApertura).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle de Fondeo Inmediato */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 transition-all duration-300">
                <div className="space-y-0.5">
                  <span className="block text-[10.5px] font-extrabold text-slate-700 leading-tight">
                    Fondear inmediatamente por transferencia
                  </span>
                  <span className="block text-[9px] text-slate-400 font-semibold leading-normal">
                    Debita el monto inicial desde la cuenta de Ahorro a la Vista del socio
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="toggle-fondear-inmediatamente"
                    type="checkbox"
                    checked={fondearInmediatamente}
                    onChange={(e) => {
                      setFondearInmediatamente(e.target.checked);
                      setAperturaError(null);
                      if (!e.target.checked) {
                        setMontoInicialApertura('0');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0054A6]"></div>
                </label>
              </div>

              {/* Sección Condicional de Fondeo */}
              {fondearInmediatamente && (
                <div className="space-y-3.5 border border-blue-100 bg-blue-50/20 p-4 rounded-2xl animate-fade-in">
                  {/* Información de Cuenta Origen */}
                  {(() => {
                    const cuentaVista = cuentasSocio.find(c => c.tipo === 'AHORRO_VISTA' && c.estado === 'ACTIVA');
                    if (!cuentaVista) {
                      return (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2 items-center">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 font-bold" />
                          <p className="text-[9.5px] text-amber-800 font-bold leading-normal">
                            El socio no dispone de una cuenta de ahorros a la vista activa para realizar el débito. Debe aperturar una primero o desactivar el fondeo inmediato.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="flex justify-between items-center bg-white/70 border border-blue-50 p-2.5 rounded-xl text-[10px] font-bold text-slate-600 shadow-sm">
                        <div>
                          <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-black">Cuenta de Origen</span>
                          <span className="font-mono text-slate-700">{cuentaVista.numeroCuenta}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-black">Saldo Disponible</span>
                          <span className="text-[#0054A6] font-mono">${parseFloat(cuentaVista.saldo).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Input de Monto */}
                  <div>
                    <label id="lbl-monto" htmlFor="input-monto" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Monto de Apertura ($)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <input
                        id="input-monto"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={montoInicialApertura}
                        onChange={(e) => {
                          setMontoInicialApertura(e.target.value);
                          setAperturaError(null);
                        }}
                        className="w-full h-11 border border-slate-200 rounded-xl bg-white pl-8 pr-3.5 text-xs font-bold text-slate-700 font-mono focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje de Error */}
              {aperturaError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-2 items-start animate-fade-in">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-rose-700 font-bold leading-normal">
                    {aperturaError}
                  </p>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex gap-3 pt-2">
                <Button
                  id="btn-cancelar-apertura"
                  onClick={() => setIsAperturaModalOpen(false)}
                  variant="outline"
                  className="flex-1 border-slate-200 text-slate-500 hover:bg-slate-50 font-bold rounded-xl h-11 transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  id="btn-confirmar-apertura"
                  onClick={handleAperturarCuentaSubmit}
                  disabled={cargandoApertura}
                  className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl h-11 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-sm shadow-blue-500/10 disabled:opacity-50"
                >
                  {cargandoApertura ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Procesar Apertura'
                  )}
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Visor de Documentos */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in no-print"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] bg-white rounded-3xl p-3 shadow-2xl border border-slate-100/20 overflow-hidden flex flex-col items-center"
          >
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute right-4 top-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-full transition-all cursor-pointer z-10 animate-fade-in"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-slate-700 font-extrabold text-[10px] uppercase tracking-wider mb-2 pt-2 px-4 select-none">
              {lightboxImage.title}
            </div>
            <div className="overflow-auto max-h-[75vh] w-full flex justify-center items-center bg-slate-50 rounded-2xl p-4">
              <img 
                src={lightboxImage.url} 
                alt={lightboxImage.title} 
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md border border-slate-200/50"
              />
            </div>
          </div>
        </div>
      )}
      {/* Modal Visor de Pagaré */}
      {verPagare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setVerPagare(null)}
          />
          <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up flex flex-col h-[90vh]">
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Pagaré a la Orden
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Operación Nº {verPagare.cred.numeroCredito}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => descargarPagarePdf(verPagare.cred, selectedSocio)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#0054A6] rounded-full text-[13px] font-semibold transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Imprimir Pagaré
                </button>
                <button
                  onClick={() => setVerPagare(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all focus:outline-none cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Visor PDF */}
            <div className="flex-1 w-full bg-slate-100/50 p-4">
              <iframe 
                src={verPagare.url} 
                className="w-full h-full rounded-2xl border border-slate-200 bg-white shadow-sm"
                title="Pagaré Digital"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
