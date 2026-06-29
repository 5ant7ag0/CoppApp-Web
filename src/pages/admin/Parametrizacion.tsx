import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { ECUADOR_GEODATA } from '../../utils/ecuadorGeodata';
import { SearchableCombobox } from '../../components/SearchableCombobox';
import { 
  Building2, 
  DollarSign, 
  Link2, 
  History, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  ChevronDown,
  X,
  UploadCloud,
  Wallet,
  TrendingUp,
  PieChart,
  Coins
} from 'lucide-react';

interface Account {
  id: number;
  codigoContable: string;
  nombreCuenta: string;
  tipoCuenta: string;
  esMovimiento: boolean;
}

interface CompanySettings {
  id?: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  codigoSeps: string;
  representanteLegal: string;
  cedulaRepresentante: string;
  logoUrl: string;
  moneda: string;
  estado: string;
  direccion: string;
  telefono: string;
  siglas: string;
  segmentoSeps: string;
  resolucionSeps: string;
  correoInstitucional: string;
  provincia: string;
  canton: string;
  
  // Financiero
  saldoMinimoApertura: number;
  montoMinimoCredito: number;
  montoMaximoCredito: number;
  tasaInteresAnual: number;
  tasaInteresMora: number;
  costoTramite: number;
  porcentajeSeguroDesgravamen: number;
  cuotaAportacionMensual: number;
  tasaInteresPasiva: number;
  diasGraciaMora: number;

  // Enlaces
  cuentaContableCartera: Account | null;
  cuentaContableSeguro: Account | null;
  cuentaContablePapeleria: Account | null;
  cuentaContableCaja: Account | null;
  cuentaContableObligaciones: Account | null;
  cuentaContableGastosIntereses: Account | null;
  cuentaContableIngresosIntereses: Account | null;
  cuentaContableMora: Account | null;
  cuentaContableAportaciones: Account | null;
}

interface AuditLog {
  id: number;
  fecha: string;
  accion: string;
  direccionIp: string;
  dispositivoInfo: string;
  valorAnterior: Record<string, string | null>;
  valorNuevo: Record<string, string>;
  usuarioAdmin?: {
    username: string;
    nombresCompletos: string;
    rol: string;
  };
}

interface ProductoAhorro {
  id?: number;
  nombre: string;
  tipoProducto: string; // 'AHORRO_VISTA', 'AHORRO_PROGRAMADO', 'PLAZO_FIJO', 'APORTACIONES'
  tasaInteresAnual: number;
  montoMinimoApertura: number;
  saldoMinimoRequerido: number;
  tipoRetiro: string; // 'LIBRE', 'PENALIZADO', 'RESTRINGIDO'
  tasaPenalizacionRetiro: number;
  cuentaContablePasivo: Account;
  cuentaContableGasto: Account;
  estado: string; // 'ACTIVO', 'INACTIVO'
}

interface Agencia {
  id: number;
  codigo: string;
  nombre: string;
  direccion: string;
  estado: string;
}

interface CajaVentanilla {
  id?: number;
  codigo: string;
  nombre: string;
  agenciaId: number;
  agenciaNombre?: string;
  saldoBase: number;
  saldoActual: number;
  limiteEfectivoMaximo: number;
  cuentaContableId: number;
  cuentaContableNombre?: string;
  estado: string;
  estadoOperativo?: string;
  cajeroAsignado?: string;
}

const tipoProductoOptions = [
  "Ahorro a la Vista",
  "Ahorro Programado",
  "Plazo Fijo",
  "Aportaciones Sociales"
];

const tipoProductoValueMap: Record<string, string> = {
  "AHORRO_VISTA": "Ahorro a la Vista",
  "AHORRO_PROGRAMADO": "Ahorro Programado",
  "PLAZO_FIJO": "Plazo Fijo",
  "APORTACIONES": "Aportaciones Sociales"
};

const tipoProductoKeyMap: Record<string, string> = {
  "Ahorro a la Vista": "AHORRO_VISTA",
  "Ahorro Programado": "AHORRO_PROGRAMADO",
  "Plazo Fijo": "PLAZO_FIJO",
  "Aportaciones Sociales": "APORTACIONES"
};

const tipoRetiroOptions = [
  "Libre Disponibilidad",
  "Penalizado con Comisión",
  "Restringido (Solo Fin de Plazo)"
];

const tipoRetiroValueMap: Record<string, string> = {
  "LIBRE": "Libre Disponibilidad",
  "PENALIZADO": "Penalizado con Comisión",
  "RESTRINGIDO": "Restringido (Solo Fin de Plazo)"
};

const tipoRetiroKeyMap: Record<string, string> = {
  "Libre Disponibilidad": "LIBRE",
  "Penalizado con Comisión": "PENALIZADO",
  "Restringido (Solo Fin de Plazo)": "RESTRINGIDO"
};

const estadoOptions = [
  "Activo",
  "Inactivo"
];

const estadoValueMap: Record<string, string> = {
  "ACTIVO": "Activo",
  "INACTIVO": "Inactivo"
};

const estadoKeyMap: Record<string, string> = {
  "Activo": "ACTIVO",
  "Inactivo": "INACTIVO"
};

export const Parametrizacion: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'institucional' | 'financiero' | 'contabilidad' | 'auditoria' | 'ahorro_productos' | 'cajas_financieras'>('institucional');
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<CompanySettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Productos de Ahorro
  const [productos, setProductos] = useState<ProductoAhorro[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoAhorro | null>(null);
  const [productForm, setProductForm] = useState({
    nombre: '',
    tipoProducto: 'AHORRO_VISTA',
    tasaInteresAnual: '0.00',
    montoMinimoApertura: '0.00',
    saldoMinimoRequerido: '0.00',
    tipoRetiro: 'LIBRE',
    tasaPenalizacionRetiro: '0.00',
    cuentaContablePasivoId: '',
    cuentaContableGastoId: '',
    estado: 'ACTIVO'
  });

  // Cajas Financieras
  const [cajas, setCajas] = useState<CajaVentanilla[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [loadingCajas, setLoadingCajas] = useState(false);
  const [isCajaModalOpen, setIsCajaModalOpen] = useState(false);
  const [cajaModalError, setCajaModalError] = useState<string | null>(null);
  const [editingCaja, setEditingCaja] = useState<CajaVentanilla | null>(null);
  const [cajaForm, setCajaForm] = useState({
    codigo: '',
    nombre: '',
    agenciaId: '',
    saldoBase: '0.00',
    limiteEfectivoMaximo: '0.00',
    cuentaContableId: '',
    estado: 'ACTIVA'
  });
  
  // Dropdown states for Caja Form
  const [cajaCuentaSearch, setCajaCuentaSearch] = useState('');
  const [cajaCuentaOpen, setCajaCuentaOpen] = useState(false);

  const [cajasSearchQuery, setCajasSearchQuery] = useState('');
  const [cajasStatusFilter, setCajasStatusFilter] = useState('TODOS');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados de Carga de Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Errores de Validación del Formulario
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // States for account Autocomplete Dropdowns
  const [carteraSearch, setCarteraSearch] = useState('');
  const [carteraOpen, setCarteraOpen] = useState(false);
  const [seguroSearch, setSeguroSearch] = useState('');
  const [seguroOpen, setSeguroOpen] = useState(false);
  const [papeleriaSearch, setPapeleriaSearch] = useState('');
  const [papeleriaOpen, setPapeleriaOpen] = useState(false);
  const [cajaSearch, setCajaSearch] = useState('');
  const [cajaOpen, setCajaOpen] = useState(false);
  const [obligacionesSearch, setObligacionesSearch] = useState('');
  const [obligacionesOpen, setObligacionesOpen] = useState(false);
  const [gastosInteresesSearch, setGastosInteresesSearch] = useState('');
  const [gastosInteresesOpen, setGastosInteresesOpen] = useState(false);
  const [ingresosInteresesSearch, setIngresosInteresesSearch] = useState('');
  const [ingresosInteresesOpen, setIngresosInteresesOpen] = useState(false);
  const [moraSearch, setMoraSearch] = useState('');
  const [moraOpen, setMoraOpen] = useState(false);
  const [aportacionesSearch, setAportacionesSearch] = useState('');
  const [aportacionesOpen, setAportacionesOpen] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/empresas/mi-perfil');
      setSettings(res.data);
      setOriginalSettings(res.data);
      if (res.data?.logoUrl) {
        // Resolver URL estática
        const url = res.data.logoUrl.startsWith('http') 
          ? res.data.logoUrl 
          : `http://localhost:8080/api/v1${res.data.logoUrl}`;
        setLogoPreview(url);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al cargar la parametrización gerencial: ' + (err.response?.data || err.message));
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/contabilidad/plan-cuentas');
      const allAccounts: Account[] = res.data || [];
      setAccounts(allAccounts.filter(acc => acc.esMovimiento));
    } catch (err) {
      console.error('Error fetching plan de cuentas:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/empresas/mi-perfil/logs-auditoria');
      setAuditLogs(res.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchAccounts()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'auditoria') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const fetchProductos = async () => {
    setLoadingProductos(true);
    try {
      const res = await api.get('/productos-ahorro');
      setProductos(res.data || []);
    } catch (err: any) {
      console.error('Error fetching productos:', err);
      setErrorMsg('Error al cargar catálogo de productos: ' + (err.response?.data || err.message));
    } finally {
      setLoadingProductos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ahorro_productos') {
      fetchProductos();
    }
  }, [activeTab]);

  const fetchCajasAndAgencias = async () => {
    setLoadingCajas(true);
    try {
      const [cajasRes, agenciasRes] = await Promise.all([
        api.get('/cajas-ventanilla'),
        api.get('/agencias')
      ]);
      setCajas(cajasRes.data || []);
      setAgencias(agenciasRes.data || []);
    } catch (err: any) {
      console.error('Error fetching cajas/agencias:', err);
      setErrorMsg('Error al cargar catálogo de cajas y agencias: ' + (err.response?.data || err.message));
    } finally {
      setLoadingCajas(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cajas_financieras') {
      fetchCajasAndAgencias();
    }
  }, [activeTab]);

  const handleOpenNewCaja = () => {
    setEditingCaja(null);
    setCajaForm({
      codigo: 'Autogenerado',
      nombre: '',
      agenciaId: '',
      saldoBase: '0.00',
      limiteEfectivoMaximo: '0.00',
      cuentaContableId: '',
      estado: 'ACTIVA'
    });
    setCajaCuentaSearch('');
    setCajaCuentaOpen(false);
    setCajaModalError(null);
    setIsCajaModalOpen(true);
  };

  const handleOpenEditCaja = (caja: CajaVentanilla) => {
    setEditingCaja(caja);
    
    // Find the account string for the dropdown
    const accStr = caja.cuentaContableId && caja.cuentaContableNombre 
        ? `${accounts.find(a => a.id === caja.cuentaContableId)?.codigoContable || ''} - ${caja.cuentaContableNombre}` 
        : '';
        
    setCajaForm({
      codigo: caja.codigo,
      nombre: caja.nombre,
      agenciaId: String(caja.agenciaId),
      saldoBase: String(caja.saldoBase),
      limiteEfectivoMaximo: String(caja.limiteEfectivoMaximo),
      cuentaContableId: accStr,
      estado: caja.estado
    });
    setCajaCuentaSearch('');
    setCajaCuentaOpen(false);
    setCajaModalError(null);
    setIsCajaModalOpen(true);
  };

  const handleSaveCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setCajaModalError(null);

    if (!cajaForm.codigo.trim() || !cajaForm.nombre.trim() || !cajaForm.agenciaId) {
      setCajaModalError('Código, Nombre y Agencia son obligatorios.');
      return;
    }

    let cuentaId: number | null = null;
    if (cajaForm.cuentaContableId) {
      const code = cajaForm.cuentaContableId.split(' - ')[0];
      const acc = accounts.find(a => a.codigoContable === code);
      if (acc) {
        cuentaId = acc.id;
      }
    }

    const payload = {
      codigo: cajaForm.codigo,
      nombre: cajaForm.nombre,
      agenciaId: Number(cajaForm.agenciaId),
      saldoBase: Number(cajaForm.saldoBase),
      limiteEfectivoMaximo: Number(cajaForm.limiteEfectivoMaximo),
      cuentaContableId: cuentaId,
      estado: cajaForm.estado
    };

    try {
      if (editingCaja && editingCaja.id) {
        await api.put(`/cajas-ventanilla/${editingCaja.id}`, payload);
        setSuccessMsg('¡Caja actualizada con éxito!');
      } else {
        await api.post('/cajas-ventanilla', payload);
        setSuccessMsg('¡Caja creada con éxito! El saldo inicial ha sido fijado en $0.00 de manera estricta.');
      }
      setIsCajaModalOpen(false);
      fetchCajasAndAgencias();
    } catch (err: any) {
      console.error(err);
      
      let errMsg = err.message || 'Error desconocido';
      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
           errMsg = err.response.data.message || 'El servidor rechazó la solicitud (Validación fallida).';
        } else {
           errMsg = err.response.data;
        }
      }
      
      setCajaModalError(`No se pudo guardar la caja: ${errMsg}`);
    }
  };

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProductForm({
      nombre: '',
      tipoProducto: 'AHORRO_VISTA',
      tasaInteresAnual: '0.00',
      montoMinimoApertura: '0.00',
      saldoMinimoRequerido: '0.00',
      tipoRetiro: 'LIBRE',
      tasaPenalizacionRetiro: '0.00',
      cuentaContablePasivoId: '',
      cuentaContableGastoId: '',
      estado: 'ACTIVO'
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: ProductoAhorro) => {
    setEditingProduct(prod);
    setProductForm({
      nombre: prod.nombre,
      tipoProducto: prod.tipoProducto,
      tasaInteresAnual: String(prod.tasaInteresAnual),
      montoMinimoApertura: String(prod.montoMinimoApertura),
      saldoMinimoRequerido: String(prod.saldoMinimoRequerido),
      tipoRetiro: prod.tipoRetiro,
      tasaPenalizacionRetiro: String(prod.tasaPenalizacionRetiro),
      cuentaContablePasivoId: prod.cuentaContablePasivo ? `${prod.cuentaContablePasivo.codigoContable} - ${prod.cuentaContablePasivo.nombreCuenta}` : '',
      cuentaContableGastoId: prod.cuentaContableGasto ? `${prod.cuentaContableGasto.codigoContable} - ${prod.cuentaContableGasto.nombreCuenta}` : '',
      estado: prod.estado
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!productForm.nombre.trim()) {
      alert('El nombre del producto es requerido.');
      return;
    }
    const pasivoCode = productForm.cuentaContablePasivoId.split(' - ')[0];
    const pasivoAcc = accounts.find(a => a.codigoContable === pasivoCode);
    if (!pasivoAcc) {
      alert('Debe seleccionar una cuenta contable de pasivo válida.');
      return;
    }

    const gastoCode = productForm.cuentaContableGastoId.split(' - ')[0];
    const gastoAcc = accounts.find(a => a.codigoContable === gastoCode);
    if (!gastoAcc) {
      alert('Debe seleccionar una cuenta contable de gasto válida.');
      return;
    }

    const payload = {
      nombre: productForm.nombre,
      tipoProducto: productForm.tipoProducto,
      tasaInteresAnual: Number(productForm.tasaInteresAnual),
      montoMinimoApertura: Number(productForm.montoMinimoApertura),
      saldoMinimoRequerido: Number(productForm.saldoMinimoRequerido),
      tipoRetiro: productForm.tipoRetiro,
      tasaPenalizacionRetiro: Number(productForm.tasaPenalizacionRetiro),
      cuentaContablePasivoId: pasivoAcc.id,
      cuentaContableGastoId: gastoAcc.id,
      estado: productForm.estado
    };

    try {
      if (editingProduct && editingProduct.id) {
        await api.put(`/productos-ahorro/${editingProduct.id}`, payload);
        setSuccessMsg('¡Producto de ahorro actualizado con éxito!');
      } else {
        await api.post('/productos-ahorro', payload);
        setSuccessMsg('¡Producto de ahorro creado con éxito!');
      }
      setIsProductModalOpen(false);
      fetchProductos();
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar producto: ' + (err.response?.data || err.message));
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea inactivar este producto de ahorro?')) {
      return;
    }
    try {
      await api.delete(`/productos-ahorro/${id}`);
      setSuccessMsg('¡Producto de ahorro inactivado con éxito!');
      fetchProductos();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al inactivar producto: ' + (err.response?.data || err.message));
    }
  };

  // Validaciones en tiempo real
  const validateField = (field: string, value: string, currentSettings?: CompanySettings) => {
    const errors = { ...validationErrors };
    const latestSettings = currentSettings || settings;

    if (field === 'ruc') {
      if (!/^\d+$/.test(value)) {
        errors.ruc = 'El RUC debe contener solo números.';
      } else if (value.length !== 13) {
        errors.ruc = `El RUC debe tener exactamente 13 dígitos (actual: ${value.length}).`;
      } else if (!value.endsWith('001')) {
        errors.ruc = 'El RUC de la cooperativa debe terminar obligatoriamente en "001".';
      } else {
        delete errors.ruc;
      }
    }

    if (field === 'telefono') {
      if (!/^\d+$/.test(value)) {
        errors.telefono = 'El teléfono debe contener solo números.';
      } else if (value.length !== 10 && value.length !== 9) {
        errors.telefono = 'El teléfono debe tener 10 dígitos (celular) o 9 dígitos (convencional con código de área).';
      } else {
        delete errors.telefono;
      }
    }

    if (field === 'cedulaRepresentante') {
      if (!/^\d+$/.test(value)) {
        errors.cedulaRepresentante = 'La cédula debe contener solo números.';
      } else if (value.length !== 10) {
        errors.cedulaRepresentante = 'La cédula debe tener exactamente 10 dígitos.';
      } else {
        delete errors.cedulaRepresentante;
      }
    }

    // Validación cruzada de montos de crédito
    if (field === 'montoMinimoCredito' || field === 'montoMaximoCredito') {
      const min = field === 'montoMinimoCredito' ? Number(value) : (latestSettings ? Number(latestSettings.montoMinimoCredito) : 0);
      const max = field === 'montoMaximoCredito' ? Number(value) : (latestSettings ? Number(latestSettings.montoMaximoCredito) : 0);
      
      if (!isNaN(min) && !isNaN(max) && min >= max) {
        errors.montoMinimoCredito = 'El monto mínimo de crédito debe ser inferior al monto máximo.';
      } else {
        delete errors.montoMinimoCredito;
      }
    }

    setValidationErrors(errors);
  };

  const hasChanges = (): boolean => {
    if (!settings || !originalSettings) return false;
    if (logoFile !== null) return true;
    
    const keysToCompare: (keyof CompanySettings)[] = [
      'ruc', 'razonSocial', 'nombreComercial', 'siglas', 'codigoSeps', 
      'segmentoSeps', 'resolucionSeps', 'representanteLegal', 'cedulaRepresentante', 
      'direccion', 'telefono', 'correoInstitucional', 'provincia', 'canton',
      'saldoMinimoApertura', 'montoMinimoCredito', 'montoMaximoCredito', 
      'tasaInteresAnual', 'tasaInteresMora', 'costoTramite', 
      'porcentajeSeguroDesgravamen', 'cuotaAportacionMensual', 'tasaInteresPasiva', 'diasGraciaMora'
    ];

    for (const key of keysToCompare) {
      const currentVal = settings[key];
      const originalVal = originalSettings[key];
      if (String(currentVal ?? '') !== String(originalVal ?? '')) {
        return true;
      }
    }

    if ((settings.cuentaContableCartera?.id || null) !== (originalSettings.cuentaContableCartera?.id || null)) return true;
    if ((settings.cuentaContableSeguro?.id || null) !== (originalSettings.cuentaContableSeguro?.id || null)) return true;
    if ((settings.cuentaContablePapeleria?.id || null) !== (originalSettings.cuentaContablePapeleria?.id || null)) return true;
    if ((settings.cuentaContableCaja?.id || null) !== (originalSettings.cuentaContableCaja?.id || null)) return true;
    if ((settings.cuentaContableObligaciones?.id || null) !== (originalSettings.cuentaContableObligaciones?.id || null)) return true;
    if ((settings.cuentaContableGastosIntereses?.id || null) !== (originalSettings.cuentaContableGastosIntereses?.id || null)) return true;
    if ((settings.cuentaContableIngresosIntereses?.id || null) !== (originalSettings.cuentaContableIngresosIntereses?.id || null)) return true;
    if ((settings.cuentaContableMora?.id || null) !== (originalSettings.cuentaContableMora?.id || null)) return true;
    if ((settings.cuentaContableAportaciones?.id || null) !== (originalSettings.cuentaContableAportaciones?.id || null)) return true;

    return false;
  };

  const handleCancelEdit = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      if (originalSettings.logoUrl) {
        const url = originalSettings.logoUrl.startsWith('http') 
          ? originalSettings.logoUrl 
          : `http://localhost:8080/api/v1${originalSettings.logoUrl}`;
        setLogoPreview(url);
      } else {
        setLogoPreview(null);
      }
    }
    setLogoFile(null);
    setValidationErrors({});
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof CompanySettings, value: any) => {
    if (!settings) return;
    
    // Si cambia provincia, resetear cantón
    if (field === 'provincia') {
      setSettings({
        ...settings,
        provincia: value,
        canton: ''
      });
      return;
    }

    const updatedSettings = {
      ...settings,
      [field]: value
    };

    setSettings(updatedSettings);

    if (['ruc', 'telefono', 'cedulaRepresentante', 'montoMinimoCredito', 'montoMaximoCredito'].includes(field as string)) {
      validateField(field as string, String(value), updatedSettings);
    }
  };

  // Drag and Drop Logo Handlers
  const handleDrag = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return;
    if (e.target.files && e.target.files[0]) {
      processLogoFile(e.target.files[0]);
    }
  };

  const processLogoFile = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Formato no permitido. Solo se aceptan imágenes en formato .png o .jpg/.jpeg');
      return;
    }
    
    setLogoFile(file);
    // Preview local instantánea
    setLogoPreview(URL.createObjectURL(file));
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    // Bloquear si hay errores activos de validación
    if (Object.keys(validationErrors).length > 0) {
      setErrorMsg('Por favor, corrija los errores de validación antes de guardar.');
      return;
    }

    // Validaciones de negocio antes del envío
    if (!settings.razonSocial.trim()) {
      setErrorMsg('La Razón Social es requerida.');
      return;
    }
    if (Number(settings.montoMinimoCredito) >= Number(settings.montoMaximoCredito)) {
      setErrorMsg('El monto mínimo de crédito debe ser inferior al monto máximo.');
      return;
    }
    if (Number(settings.tasaInteresAnual) <= 0 || Number(settings.tasaInteresAnual) > 100) {
      setErrorMsg('La Tasa de Interés Nominal Anual debe ser un porcentaje válido entre 0% y 100%.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let finalLogoUrl = settings.logoUrl;

      // 1. Si el usuario seleccionó un nuevo logo, subirlo primero mediante multipart/form-data
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);

        const resLogo = await api.post('/empresas/mi-perfil/logo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        finalLogoUrl = resLogo.data.logoUrl;
      }

      // 2. Guardar el resto de parámetros gerenciales
      const payload = {
        ...settings,
        logoUrl: finalLogoUrl,
        saldoMinimoApertura: Number(settings.saldoMinimoApertura),
        montoMinimoCredito: Number(settings.montoMinimoCredito),
        montoMaximoCredito: Number(settings.montoMaximoCredito),
        tasaInteresAnual: Number(settings.tasaInteresAnual),
        tasaInteresMora: Number(settings.tasaInteresMora),
        costoTramite: Number(settings.costoTramite),
        porcentajeSeguroDesgravamen: Number(settings.porcentajeSeguroDesgravamen),
        cuotaAportacionMensual: Number(settings.cuotaAportacionMensual),
        tasaInteresPasiva: Number(settings.tasaInteresPasiva),
        diasGraciaMora: Number(settings.diasGraciaMora)
      };

      const res = await api.put('/empresas/mi-perfil', payload);
      setSettings(res.data);
      setOriginalSettings(res.data);
      if (res.data?.logoUrl) {
        setLogoPreview(`http://localhost:8080/api/v1${res.data.logoUrl}`);
      }
      setLogoFile(null);
      setIsEditing(false);
      setSuccessMsg('¡Parámetros gerenciales y logo institucional guardados con éxito!');
      window.dispatchEvent(new CustomEvent('logo-updated', { detail: res.data?.logoUrl }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al guardar cambios: ' + (err.response?.data || err.message));
    } finally {
      setSaving(false);
    }
  };

  const formatParamName = (key: string): string => {
    const dict: Record<string, string> = {
      razonSocial: 'Razón Social',
      nombreComercial: 'Nombre Comercial',
      representanteLegal: 'Representante Legal',
      cedulaRepresentante: 'Cédula Representante',
      logoUrl: 'Logo Institucional (URL)',
      direccion: 'Dirección Principal',
      telefono: 'Teléfono',
      siglas: 'Siglas Cooperativa',
      segmentoSeps: 'Segmento SEPS',
      resolucionSeps: 'Resolución SEPS de Constitución',
      correoInstitucional: 'Correo Institucional',
      provincia: 'Provincia',
      canton: 'Cantón',
      saldoMinimoApertura: 'Saldo Mínimo Apertura Cuenta',
      montoMinimoCredito: 'Monto Mínimo Crédito',
      montoMaximoCredito: 'Monto Máximo Crédito',
      tasaInteresAnual: 'Tasa Nominal Crédito (%)',
      tasaInteresMora: 'Tasa de Mora (%)',
      costoTramite: 'Costo Operativo Trámites/Papelería',
      porcentajeSeguroDesgravamen: 'Porcentaje Seguro Desgravamen',
      cuotaAportacionMensual: 'Aportación Obligatoria Mensual',
      tasaInteresPasiva: 'Tasa Pasiva Ahorros (%)',
      diasGraciaMora: 'Días de Gracia para Mora',
      cuentaContableCartera: 'Cuenta Contable: Cartera de Créditos',
      cuentaContableSeguro: 'Cuenta Contable: Ingresos Seguro Desgravamen',
      cuentaContablePapeleria: 'Cuenta Contable: Ingresos Trámites/Papelería',
      cuentaContableCaja: 'Cuenta Contable: Caja General',
      cuentaContableObligaciones: 'Cuenta Contable: Obligaciones con el Público (Ahorros)',
      cuentaContableGastosIntereses: 'Cuenta Contable: Gastos por Intereses de Ahorros',
      cuentaContableIngresosIntereses: 'Cuenta Contable: Ingresos por Intereses (Tasa Activa)',
      cuentaContableMora: 'Cuenta Contable: Ingresos por Intereses de Mora',
      cuentaContableAportaciones: 'Cuenta Contable: Aportaciones Sociales'
    };
    return dict[key] || key;
  };

  const formatParamValue = (key: string, val: any): string => {
    if (val === null || val === undefined) return 'No configurado';
    if (typeof val === 'string' && val.trim() === '') return 'Vacío';
    if (['tasaInteresAnual', 'tasaInteresMora', 'porcentajeSeguroDesgravamen', 'tasaInteresPasiva'].includes(key)) {
      return `${val}%`;
    }
    if (['saldoMinimoApertura', 'montoMinimoCredito', 'montoMaximoCredito', 'costoTramite', 'cuotaAportacionMensual'].includes(key)) {
      return `$${Number(val).toFixed(2)} USD`;
    }
    if (key === 'diasGraciaMora') {
      return `${val} días`;
    }
    if (val && typeof val === 'object' && 'codigoContable' in val && 'nombreCuenta' in val) {
      return `${val.codigoContable} - ${val.nombreCuenta}`;
    }
    return String(val);
  };

  const getAuditRows = () => {
    const rows: { id: string; fecha: string; usuario: string; parametro: string; anterior: string; nuevo: string; ip: string }[] = [];
    auditLogs.forEach((log) => {
      const keys = Object.keys(log.valorNuevo || {});
      keys.forEach((key) => {
        rows.push({
          id: `${log.id}-${key}`,
          fecha: log.fecha,
          usuario: log.usuarioAdmin ? `${log.usuarioAdmin.nombresCompletos} (${log.usuarioAdmin.username})` : 'Sistema',
          parametro: formatParamName(key),
          anterior: formatParamValue(key, log.valorAnterior?.[key]),
          nuevo: formatParamValue(key, log.valorNuevo?.[key]),
          ip: log.direccionIp
        });
      });
    });
    return rows;
  };

  const renderAccountSelector = (
    label: string,
    field: keyof CompanySettings,
    isOpen: boolean,
    setOpen: (open: boolean) => void,
    searchVal: string,
    setSearchVal: (val: string) => void,
    filteredList: Account[]
  ) => {
    if (!settings) return null;
    const currentAccount = settings[field] as Account | null;
    return (
      <div className="space-y-2 relative bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
        <label className="text-[11px] font-extrabold text-[#0054A6] uppercase tracking-wider block">
          {label}
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Seleccione cuenta..."
            value={isOpen ? searchVal : (currentAccount ? `${currentAccount.codigoContable} - ${currentAccount.nombreCuenta}` : '')}
            onFocus={() => { if (isEditing) { setOpen(true); setSearchVal(''); } }}
            onChange={(e) => setSearchVal(e.target.value)}
            disabled={!isEditing}
            className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-16 py-3 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 top-3 flex items-center gap-1 text-slate-400">
            {currentAccount && isEditing && (
              <button type="button" onClick={() => handleInputChange(field, null)} className="hover:text-rose-500 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className="h-4 w-4 pointer-events-none" />
          </div>
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 top-[5.2rem] max-h-56 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-y-auto z-50 p-2 space-y-1">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1 px-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Filtrando Plan de Cuentas (Detalle)</span>
            </div>
            {filteredList.length === 0 ? (
              <div className="text-xs text-slate-400 p-3 text-center">No se encontraron cuentas de movimiento.</div>
            ) : (
              filteredList.map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    handleInputChange(field, acc);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs font-medium rounded-xl hover:bg-blue-50 hover:text-[#0054A6] transition-all flex items-start gap-1"
                >
                  <span className="font-mono font-bold text-slate-500 shrink-0">{acc.codigoContable}</span>
                  <span className="text-slate-700 font-bold ml-2 flex-1 text-left leading-normal break-words whitespace-normal">{acc.nombreCuenta}</span>
                </button>
              ))
            )}
          </div>
        )}
        {isOpen && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0054A6]" />
          <p className="text-sm font-semibold text-slate-400">Cargando parámetros del core financiero...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-rose-700 flex items-center gap-4">
        <AlertCircle className="h-6 w-6 shrink-0" />
        <span className="font-medium">No se pudo cargar la configuración de la cooperativa activa.</span>
      </div>
    );
  }

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const filterAccs = (search: string) => {
    return accounts.filter(acc => 
      acc.codigoContable.includes(search) || 
      acc.nombreCuenta.toLowerCase().includes(search.toLowerCase())
    );
  };
  const filteredCarteraAccounts = filterAccs(carteraSearch);
  const filteredSeguroAccounts = filterAccs(seguroSearch);
  const filteredPapeleriaAccounts = filterAccs(papeleriaSearch);
  const filteredCajaAccounts = filterAccs(cajaSearch);
  const filteredObligacionesAccounts = filterAccs(obligacionesSearch);
  const filteredGastosInteresesAccounts = filterAccs(gastosInteresesSearch);
  const filteredIngresosInteresesAccounts = filterAccs(ingresosInteresesSearch);
  const filteredMoraAccounts = filterAccs(moraSearch);
  const filteredAportacionesAccounts = filterAccs(aportacionesSearch);

  const renderActionButtons = () => {
    if (activeTab === 'auditoria') return null;

    return (
      <div className="flex items-center gap-2 shrink-0">
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-center gap-2 font-bold text-xs py-2 px-4 rounded-xl bg-[#0054A6] hover:bg-[#004080] text-white shadow-sm transition-all duration-300 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Editar Parámetros</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex items-center justify-center gap-2 font-bold text-xs py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 cursor-pointer border border-slate-200"
            >
              <span>Cancelar</span>
            </button>
            {hasChanges() && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || hasValidationErrors}
                className={`flex items-center justify-center gap-2 font-bold text-xs py-2 px-4 rounded-xl transition-all duration-300 shadow-sm cursor-pointer ${
                  hasValidationErrors
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Guardar Cambios</span>
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  const filteredCajas = cajas.filter(caja => {
    const searchLower = cajasSearchQuery.toLowerCase();
    const matchesSearch = !cajasSearchQuery || 
      caja.nombre.toLowerCase().includes(searchLower) ||
      caja.codigo.toLowerCase().includes(searchLower) ||
      (caja.agenciaNombre && caja.agenciaNombre.toLowerCase().includes(searchLower)) ||
      (caja.cajeroAsignado && caja.cajeroAsignado.toLowerCase().includes(searchLower));
      
    const matchesStatus = cajasStatusFilter === 'TODOS' || caja.estado === cajasStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Banner de Mensajes */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 rounded-[1.5rem] p-4 text-rose-700 flex items-center gap-3 animate-fade-in shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-[1.5rem] p-4 text-emerald-700 flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-xs font-bold">{successMsg}</span>
        </div>
      )}



      {/* Tabs Navigation */}
      <div className="flex bg-[#F1F3F6] p-1 rounded-full border border-slate-100/50 overflow-x-auto scrollbar-none gap-1">
        <button
          onClick={() => setActiveTab('institucional')}
          className="relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer text-slate-500 hover:text-slate-805"
        >
          {activeTab === 'institucional' && (
            <motion.div
              layoutId="activeTabParametrizacion"
              className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className={`relative z-10 flex items-center gap-2 transition-colors duration-300 ${
            activeTab === 'institucional' ? 'text-white' : 'text-slate-500'
          }`}>
            <Building2 className="h-4 w-4" />
            <span>Institucional</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('financiero')}
          className="relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer text-slate-500 hover:text-slate-805"
        >
          {activeTab === 'financiero' && (
            <motion.div
              layoutId="activeTabParametrizacion"
              className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className={`relative z-10 flex items-center gap-2 transition-colors duration-300 ${
            activeTab === 'financiero' ? 'text-white' : 'text-slate-500'
          }`}>
            <DollarSign className="h-4 w-4" />
            <span>Reglas Financieras</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('contabilidad')}
          className="relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer text-slate-500 hover:text-slate-850"
        >
          {activeTab === 'contabilidad' && (
            <motion.div
              layoutId="activeTabParametrizacion"
              className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className={`relative z-10 flex items-center gap-2 transition-colors duration-300 ${
            activeTab === 'contabilidad' ? 'text-white' : 'text-slate-500'
          }`}>
            <Link2 className="h-4 w-4" />
            <span>Enlaces Contables</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className="relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer text-slate-500 hover:text-slate-850"
        >
          {activeTab === 'auditoria' && (
            <motion.div
              layoutId="activeTabParametrizacion"
              className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className={`relative z-10 flex items-center gap-2 transition-colors duration-300 ${
            activeTab === 'auditoria' ? 'text-white' : 'text-slate-500'
          }`}>
            <History className="h-4 w-4" />
            <span>Pista de Auditoría (SEPS)</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ahorro_productos')}
          className="relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer text-slate-500 hover:text-slate-850"
        >
          {activeTab === 'ahorro_productos' && (
            <motion.div
              layoutId="activeTabParametrizacion"
              className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className={`relative z-10 flex items-center gap-2 transition-colors duration-300 ${
            activeTab === 'ahorro_productos' ? 'text-white' : 'text-slate-500'
          }`}>
            <TrendingUp className="h-4 w-4" />
            <span>Productos de Ahorro</span>
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('cajas_financieras')}
          className="relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer text-slate-500 hover:text-slate-850"
        >
          {activeTab === 'cajas_financieras' && (
            <motion.div
              layoutId="activeTabParametrizacion"
              className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className={`relative z-10 flex items-center gap-2 transition-colors duration-300 ${
            activeTab === 'cajas_financieras' ? 'text-white' : 'text-slate-500'
          }`}>
            <Coins className="h-4 w-4" />
            <span>Cajas Financieras</span>
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* TAB A: INSTITUCIONAL */}
          {activeTab === 'institucional' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0054A6]" />
                  Datos Legales y de Identificación (SRI / SEPS)
                </h2>
                {renderActionButtons()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">RUC de la Cooperativa</label>
                  <input
                    type="text"
                    maxLength={13}
                    value={settings.ruc}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('ruc', e.target.value.replace(/\D/g, ''))}
                    className={`w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all ${
                      validationErrors.ruc ? 'border-rose-350 focus:border-rose-500' : 'border-slate-100 focus:border-blue-500'
                    }`}
                  />
                  {validationErrors.ruc && (
                    <span className="text-[10px] text-rose-500 font-bold block animate-fade-in">{validationErrors.ruc}</span>
                  )}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Razón Social</label>
                  <input
                    type="text"
                    value={settings.razonSocial}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('razonSocial', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nombre Comercial</label>
                  <input
                    type="text"
                    value={settings.nombreComercial}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('nombreComercial', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Siglas</label>
                  <input
                    type="text"
                    placeholder="Ej: COOPAC"
                    value={settings.siglas || ''}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('siglas', e.target.value.toUpperCase())}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Código de Ente SEPS</label>
                  <input
                    type="text"
                    value={settings.codigoSeps}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('codigoSeps', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                {/* Segmento SEPS Searchable Combobox */}
                <SearchableCombobox
                  label="Segmento SEPS"
                  placeholder="Seleccione segmento..."
                  value={settings.segmentoSeps || ''}
                  onChange={(val) => handleInputChange('segmentoSeps', val)}
                  options={["Segmento 1", "Segmento 2", "Segmento 3", "Segmento 4", "Segmento 5"]}
                  disabled={!isEditing}
                />

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">N. Resolución de Constitución</label>
                  <input
                    type="text"
                    placeholder="Ej: SEPS-RO-2026-0042"
                    value={settings.resolucionSeps || ''}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('resolucionSeps', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Representante Legal</label>
                  <input
                    type="text"
                    value={settings.representanteLegal}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('representanteLegal', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cédula del Representante</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={settings.cedulaRepresentante}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('cedulaRepresentante', e.target.value.replace(/\D/g, ''))}
                    className={`w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all ${
                      validationErrors.cedulaRepresentante ? 'border-rose-350 focus:border-rose-500' : 'border-slate-100 focus:border-blue-500'
                    }`}
                  />
                  {validationErrors.cedulaRepresentante && (
                    <span className="text-[10px] text-rose-500 font-bold block animate-fade-in">{validationErrors.cedulaRepresentante}</span>
                  )}
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 pt-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0054A6]" />
                Datos de Contacto y Ubicación
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dirección Principal</label>
                  <input
                    type="text"
                    value={settings.direccion || ''}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Teléfono Institucional</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={settings.telefono || ''}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('telefono', e.target.value.replace(/\D/g, ''))}
                    className={`w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all ${
                      validationErrors.telefono ? 'border-rose-350 focus:border-rose-500' : 'border-slate-100 focus:border-blue-500'
                    }`}
                  />
                  {validationErrors.telefono && (
                    <span className="text-[10px] text-rose-500 font-bold block animate-fade-in">{validationErrors.telefono}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico Notificaciones</label>
                  <input
                    type="email"
                    value={settings.correoInstitucional || ''}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange('correoInstitucional', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                {/* Provincia Searchable Combobox */}
                <SearchableCombobox
                  label="Provincia"
                  placeholder="Buscar provincia..."
                  value={settings.provincia || ''}
                  onChange={(val) => handleInputChange('provincia', val)}
                  options={Object.keys(ECUADOR_GEODATA)}
                  disabled={!isEditing}
                />

                {/* Cantón Searchable Combobox */}
                <SearchableCombobox
                  label="Cantón / Ciudad"
                  placeholder={settings.provincia ? "Buscar cantón..." : "Seleccione primero una provincia"}
                  value={settings.canton || ''}
                  onChange={(val) => handleInputChange('canton', val)}
                  options={settings.provincia ? (ECUADOR_GEODATA[settings.provincia] || []) : []}
                  disabled={!isEditing || !settings.provincia}
                />
              </div>

              {/* Logo File Upload Component */}
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 pt-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0054A6]" />
                Logo Institucional
              </h2>

              <div className="w-full">
                {/* Drag and Drop Zone with embedded Preview */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`w-full border-2 border-dashed rounded-[1.5rem] p-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 relative ${
                    dragActive 
                      ? 'border-[#0054A6] bg-blue-50/30' 
                      : 'border-slate-200 hover:border-[#0054A6]/60 hover:bg-slate-50/30'
                  }`}
                >
                  <input
                    type="file"
                    id="logo-file-input"
                    accept=".png,.jpg,.jpeg"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  
                  {logoPreview ? (
                    <div className="flex flex-col items-center gap-4 w-full relative z-10 animate-fade-in">
                      <div className="relative group max-w-full flex items-center justify-center p-3 bg-slate-50/50 rounded-2xl border border-slate-100/60 shadow-sm">
                        <img 
                          src={logoPreview} 
                          alt="Logo Preview" 
                          className="max-h-32 max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        {/* Remove newly selected local file */}
                        {isEditing && (
                          logoFile ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setLogoFile(null);
                                if (settings.logoUrl) {
                                  setLogoPreview(`http://localhost:8080/api/v1${settings.logoUrl}`);
                                } else {
                                  setLogoPreview(null);
                                }
                              }}
                              className="absolute -top-2 -right-2 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-full p-1.5 transition-all cursor-pointer shadow-md"
                              title="Descartar nueva imagen seleccionada"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : (
                            /* Or, if the logo is already saved in database, allow clearing it from the form */
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSettings({
                                  ...settings,
                                  logoUrl: ''
                                });
                                setLogoPreview(null);
                              }}
                              className="absolute -top-2 -right-2 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-full p-1.5 transition-all cursor-pointer shadow-md"
                              title="Remover logo actual"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex gap-3">
                            <label 
                              htmlFor="logo-file-input" 
                              className="text-xs font-bold text-[#0054A6] hover:text-[#004080] cursor-pointer bg-blue-50 hover:bg-blue-100/80 px-4 py-2 rounded-xl transition-all"
                            >
                              Seleccionar otra imagen
                            </label>
                            
                            {(logoFile || (settings.logoUrl && logoPreview)) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (logoFile) {
                                    setLogoFile(null);
                                    if (settings.logoUrl) {
                                      setLogoPreview(`http://localhost:8080/api/v1${settings.logoUrl}`);
                                    } else {
                                      setLogoPreview(null);
                                    }
                                  } else {
                                    setSettings({
                                      ...settings,
                                      logoUrl: ''
                                    });
                                    setLogoPreview(null);
                                  }
                                }}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer bg-rose-50 hover:bg-rose-100/80 px-4 py-2 rounded-xl transition-all"
                              >
                                Remover Imagen
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] font-semibold text-slate-400">O arrastre una imagen aquí para reemplazarla (Max: 2MB)</p>
                        </div>
                      ) : (
                        <p className="text-[10px] font-semibold text-slate-400">Modo lectura - Presione "Editar Parámetros" para cambiar el logo</p>
                      )}
                    </div>
                  ) : (
                    isEditing ? (
                      <label 
                        htmlFor="logo-file-input" 
                        className="flex flex-col items-center justify-center gap-3 cursor-pointer w-full py-6 select-none"
                      >
                        <UploadCloud className="h-10 w-10 text-[#0054A6]/60 animate-pulse" />
                        <div className="text-center space-y-1">
                          <p className="text-xs font-bold text-slate-700">Arrastre su imagen aquí o haga clic para buscar</p>
                          <p className="text-[10px] font-semibold text-slate-400">Solo se admiten archivos .png y .jpg (Max: 2MB)</p>
                        </div>
                      </label>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 w-full py-6 select-none text-slate-400 animate-fade-in">
                        <Building2 className="h-10 w-10 text-slate-300" />
                        <div className="text-center space-y-1">
                          <p className="text-xs font-bold text-slate-500">Sin logo registrado</p>
                          <p className="text-[10px] font-semibold text-slate-400">Presione "Editar Parámetros" para cargar uno</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB B: REGLAS FINANCIERAS */}
          {activeTab === 'financiero' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0054A6]" />
                  Reglas de Negocio y Umbrales Financieros
                </h2>
                {renderActionButtons()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Saldo Mínimo de Apertura (Ahorro Vista)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-xs font-extrabold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.saldoMinimoApertura}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('saldoMinimoApertura', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-8 pr-4 py-3 text-xs font-black text-slate-700 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Monto inicial mínimo requerido para habilitar una cuenta de ahorros.</span>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Aportación Obligatoria Mensual
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-xs font-extrabold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.cuotaAportacionMensual}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('cuotaAportacionMensual', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-8 pr-4 py-3 text-xs font-black text-slate-700 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Alícuota ordinaria que capitaliza cada socio mensualmente.</span>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Originación de Créditos: Monto Mínimo
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-xs font-extrabold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.montoMinimoCredito}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('montoMinimoCredito', e.target.value)}
                      className={`w-full bg-white border rounded-xl pl-8 pr-4 py-3 text-xs font-black text-slate-700 outline-none transition-all ${
                        validationErrors.montoMinimoCredito ? 'border-rose-350 focus:border-rose-500' : 'border-slate-100 focus:border-[#0054A6]'
                      }`}
                    />
                  </div>
                  {validationErrors.montoMinimoCredito && (
                    <span className="text-[10px] text-rose-500 font-bold block animate-fade-in mt-1">{validationErrors.montoMinimoCredito}</span>
                  )}
                  <span className="text-[10px] text-slate-400 block mt-1">Límite inferior para la solicitud de préstamos.</span>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Originación de Créditos: Monto Máximo
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-xs font-extrabold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.montoMaximoCredito}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('montoMaximoCredito', e.target.value)}
                      className={`w-full bg-white border rounded-xl pl-8 pr-4 py-3 text-xs font-black text-slate-700 outline-none transition-all ${
                        validationErrors.montoMinimoCredito ? 'border-rose-350 focus:border-rose-500' : 'border-slate-100 focus:border-[#0054A6]'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Monto límite superior para aprobación de préstamos del tenant.</span>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Tasa de Interés Nominal Anual (%)
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-3 text-xs font-extrabold text-slate-400">%</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settings.tasaInteresAnual}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('tasaInteresAnual', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-8 py-3 text-xs font-black text-slate-700 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Tasa activa básica utilizada en la amortización de cartera.</span>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Tasa de Mora (%)
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-3 text-xs font-extrabold text-slate-400">%</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settings.tasaInteresMora}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('tasaInteresMora', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-8 py-3 text-xs font-black text-slate-700 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Interés penal aplicado a cuotas vencidas e impagas.</span>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Gastos Operativos Fijos (Papelería / Trámite)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-xs font-extrabold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.costoTramite}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('costoTramite', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-8 pr-4 py-3 text-xs font-black text-slate-700 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Costo retenido de la cuenta del socio para consultas de buró u originación.</span>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Porcentaje de Seguro de Desgravamen (%)
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-3 text-xs font-extrabold text-slate-400">%</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settings.porcentajeSeguroDesgravamen}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('porcentajeSeguroDesgravamen', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-8 py-3 text-xs font-black text-slate-700 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Porcentaje retenido al desembolsar créditos como póliza de seguro.</span>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Tasa de Interés Pasiva (Ahorros) (%)
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-3 text-xs font-extrabold text-slate-400">%</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settings.tasaInteresPasiva}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('tasaInteresPasiva', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-8 py-3 text-xs font-black text-slate-700 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Tasa pasiva pagada sobre ahorros de socios.</span>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Días de Gracia para Mora
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={settings.diasGraciaMora}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('diasGraciaMora', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Tolerancia en días calendario antes de aplicar el recargo de mora.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB C: ENLACES CONTABLES */}
          {activeTab === 'contabilidad' && (
            <div className="space-y-8">
              <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-[#0054A6]" />
                    Enlaces de Catalogación Contable (Integración Core)
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Configure el mapeo de cuentas contables específicas para la generación automática de asientos de diario en las operaciones de captaciones, colocaciones y patrimonio.
                  </p>
                </div>
                {renderActionButtons()}
              </div>

              {/* Tarjeta 1: 🏦 Gestión de Efectivo y Captaciones */}
              <div className="bg-white border border-slate-100/80 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-[#0054A6]">
                  <Wallet className="h-4.5 w-4.5" />
                  <h3 className="text-sm font-bold text-slate-700">Gestión de Efectivo y Captaciones</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderAccountSelector(
                    'Cuenta Contable Caja General',
                    'cuentaContableCaja',
                    cajaOpen,
                    setCajaOpen,
                    cajaSearch,
                    setCajaSearch,
                    filteredCajaAccounts
                  )}
                  {renderAccountSelector(
                    'Cuenta Contable Obligaciones con el Público (Ahorros)',
                    'cuentaContableObligaciones',
                    obligacionesOpen,
                    setObligacionesOpen,
                    obligacionesSearch,
                    setObligacionesSearch,
                    filteredObligacionesAccounts
                  )}
                  {renderAccountSelector(
                    'Cuenta Contable Gastos por Intereses de Ahorros',
                    'cuentaContableGastosIntereses',
                    gastosInteresesOpen,
                    setGastosInteresesOpen,
                    gastosInteresesSearch,
                    setGastosInteresesSearch,
                    filteredGastosInteresesAccounts
                  )}
                </div>
              </div>

              {/* Tarjeta 2: 📈 Colocación y Recuperación de Créditos */}
              <div className="bg-white border border-slate-100/80 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-[#0054A6]">
                  <TrendingUp className="h-4.5 w-4.5" />
                  <h3 className="text-sm font-bold text-slate-700">Colocación y Recuperación de Créditos</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderAccountSelector(
                    'Cuenta Contable Cartera de Créditos',
                    'cuentaContableCartera',
                    carteraOpen,
                    setCarteraOpen,
                    carteraSearch,
                    setCarteraSearch,
                    filteredCarteraAccounts
                  )}
                  {renderAccountSelector(
                    'Cuenta Contable Ingresos por Intereses (Tasa Activa)',
                    'cuentaContableIngresosIntereses',
                    ingresosInteresesOpen,
                    setIngresosInteresesOpen,
                    ingresosInteresesSearch,
                    setIngresosInteresesSearch,
                    filteredIngresosInteresesAccounts
                  )}
                  {renderAccountSelector(
                    'Cuenta Contable Ingresos por Intereses de Mora',
                    'cuentaContableMora',
                    moraOpen,
                    setMoraOpen,
                    moraSearch,
                    setMoraSearch,
                    filteredMoraAccounts
                  )}
                  {renderAccountSelector(
                    'Cuenta Contable Seguro Desgravamen',
                    'cuentaContableSeguro',
                    seguroOpen,
                    setSeguroOpen,
                    seguroSearch,
                    setSeguroSearch,
                    filteredSeguroAccounts
                  )}
                  {renderAccountSelector(
                    'Cuenta Contable Gastos/Ingresos por Papelería',
                    'cuentaContablePapeleria',
                    papeleriaOpen,
                    setPapeleriaOpen,
                    papeleriaSearch,
                    setPapeleriaSearch,
                    filteredPapeleriaAccounts
                  )}
                </div>
              </div>

              {/* Tarjeta 3: 📊 Estructura Patrimonial y Capital Social */}
              <div className="bg-white border border-slate-100/80 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-[#0054A6]">
                  <PieChart className="h-4.5 w-4.5" />
                  <h3 className="text-sm font-bold text-slate-700">Estructura Patrimonial y Capital Social</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderAccountSelector(
                    'Cuenta Contable Aportaciones Sociales',
                    'cuentaContableAportaciones',
                    aportacionesOpen,
                    setAportacionesOpen,
                    aportacionesSearch,
                    setAportacionesSearch,
                    filteredAportacionesAccounts
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB D: PISTA DE AUDITORÍA (SEPS) */}
          {activeTab === 'auditoria' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Historial de Cambios en Configuración (Audit Trail SEPS)
                </h2>
                <div className="px-3 py-1 bg-amber-50 rounded-full border border-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider shadow-sm select-none">
                  Registro Inmutable
                </div>
              </div>

              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Esta bitácora almacena en formato inmutable cada mutación de parámetros realizada por la gerencia. Exigido de acuerdo a las circulares de control interno de la SEPS.
              </p>

              <div className="overflow-x-auto border border-slate-100 rounded-3xl shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Usuario Ejecutor</th>
                      <th className="px-6 py-4">Parámetro Modificado</th>
                      <th className="px-6 py-4">Valor Anterior</th>
                      <th className="px-6 py-4">Valor Nuevo</th>
                      <th className="px-6 py-4">Dirección IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                    {getAuditRows().length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">
                          No se registran modificaciones de parámetros aún.
                        </td>
                      </tr>
                    ) : (
                      getAuditRows().map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-slate-400 text-[10px] whitespace-nowrap">
                            {new Date(row.fecha).toLocaleString('es-EC')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {row.usuario}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700">
                            {row.parametro}
                          </td>
                          <td className="px-6 py-4 text-slate-400 whitespace-nowrap max-w-[200px] truncate" title={row.anterior}>
                            {row.anterior}
                          </td>
                          <td className="px-6 py-4 text-[#0054A6] font-bold whitespace-nowrap max-w-[200px] truncate" title={row.nuevo}>
                            {row.nuevo}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-400 text-[10px] whitespace-nowrap">
                            {row.ip}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </form>

        {activeTab === 'ahorro_productos' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0054A6]" />
                Catálogo de Productos de Ahorro
              </h2>
              <button
                type="button"
                onClick={handleOpenNewProduct}
                className="flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-4 rounded-xl bg-[#0054A6] hover:bg-[#004080] text-white shadow-sm transition-all duration-300 cursor-pointer"
              >
                + Nuevo Producto
              </button>
            </div>

            {loadingProductos ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
              </div>
            ) : productos.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-3xl border border-slate-100">
                No hay productos de ahorro registrados. Cree uno para comenzar.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {productos.map((prod) => {
                  const isActivo = prod.estado === 'ACTIVO';
                  const borderLeftColor = !isActivo 
                    ? 'border-l-slate-300' 
                    : prod.tipoProducto === 'AHORRO_VISTA' 
                    ? 'border-l-[#0054A6]' 
                    : prod.tipoProducto === 'AHORRO_PROGRAMADO' 
                    ? 'border-l-emerald-500' 
                    : prod.tipoProducto === 'APORTACIONES' 
                    ? 'border-l-amber-500' 
                    : 'border-l-slate-300';

                  return (
                    <div 
                      key={prod.id} 
                      className={`bg-white border border-slate-100 border-l-4 ${borderLeftColor} rounded-3xl p-5 shadow-xs transition-all duration-300 flex flex-col justify-between h-full relative group hover:shadow-md hover:border-slate-200/60 ${
                        !isActivo ? 'opacity-60' : ''
                      }`}
                    >
                      <div>
                        {/* Línea Superior */}
                        <div className="flex justify-between items-start gap-4 mb-4">
                          <div>
                            <h3 className="text-sm font-black text-slate-800 tracking-tight leading-snug">{prod.nombre}</h3>
                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                              ID: {prod.id}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className={`p-1.5 rounded-lg ${
                              !isActivo ? 'bg-slate-100 text-slate-400' :
                              prod.tipoProducto === 'AHORRO_VISTA' ? 'bg-blue-50/50 text-[#0054A6]' :
                              prod.tipoProducto === 'AHORRO_PROGRAMADO' ? 'bg-emerald-50/50 text-emerald-600' :
                              'bg-amber-50/50 text-amber-600'
                            }`}>
                              {prod.tipoProducto === 'AHORRO_VISTA' && <Wallet className="h-4 w-4" />}
                              {prod.tipoProducto === 'AHORRO_PROGRAMADO' && <TrendingUp className="h-4 w-4" />}
                              {prod.tipoProducto === 'APORTACIONES' && <Coins className="h-4 w-4" />}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                              isActivo ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {prod.estado}
                            </span>
                          </div>
                        </div>

                        {/* Bloque Central (Indicadores Financieros) */}
                        <div className="flex items-center gap-4 py-4 border-t border-b border-slate-100/80 my-3">
                          <div className="flex flex-col shrink-0 items-center justify-center bg-slate-50/50 rounded-2xl p-3 border border-slate-100/50 min-w-[80px]">
                            <span className="text-2xl font-black text-[#0054A6] tracking-tight">{prod.tasaInteresAnual}%</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Tasa Anual</span>
                          </div>
                          
                          <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2 text-left">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Apertura Mín.</span>
                              <span className="text-xs font-extrabold text-slate-700 font-mono">${prod.montoMinimoApertura.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Saldo Mín.</span>
                              <span className="text-xs font-extrabold text-slate-700 font-mono">${prod.saldoMinimoRequerido.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col col-span-2">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tipo Retiro</span>
                              <span className={`text-[10px] font-black uppercase tracking-wide flex items-center gap-1 ${
                                prod.tipoRetiro === 'LIBRE' ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {prod.tipoRetiro}
                                {prod.tipoRetiro === 'PENALIZADO' && (
                                  <span className="text-[9px] font-extrabold text-rose-500 lowercase bg-rose-50 px-1.5 py-0.5 rounded-md">
                                    ({prod.tasaPenalizacionRetiro}% penal.)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bloque Inferior (Enlaces Contables) */}
                        <div className="space-y-2 mt-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Enlaces Contables</span>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-1.5 px-2.5">
                              <span className="text-[8px] font-black text-[#0054A6] uppercase tracking-wider bg-blue-50 px-1 py-0.5 rounded shrink-0">Pasivo</span>
                              <span className="text-[9px] text-slate-600 font-mono font-bold truncate flex-1" title={prod.cuentaContablePasivo ? `${prod.cuentaContablePasivo.codigoContable} - ${prod.cuentaContablePasivo.nombreCuenta}` : ''}>
                                {prod.cuentaContablePasivo ? `${prod.cuentaContablePasivo.codigoContable} - ${prod.cuentaContablePasivo.nombreCuenta}` : 'No enlazado'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-1.5 px-2.5">
                              <span className="text-[8px] font-black text-rose-600 uppercase tracking-wider bg-rose-50 px-1 py-0.5 rounded shrink-0">Gasto</span>
                              <span className="text-[9px] text-slate-600 font-mono font-bold truncate flex-1" title={prod.cuentaContableGasto ? `${prod.cuentaContableGasto.codigoContable} - ${prod.cuentaContableGasto.nombreCuenta}` : ''}>
                                {prod.cuentaContableGasto ? `${prod.cuentaContableGasto.codigoContable} - ${prod.cuentaContableGasto.nombreCuenta}` : 'No enlazado'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botones de Acción */}
                      <div className="flex gap-2 mt-5 pt-3 border-t border-slate-50">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(prod)}
                          className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-all cursor-pointer text-center"
                        >
                          Editar
                        </button>
                        {prod.estado === 'ACTIVO' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id!)}
                            className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-600 transition-all cursor-pointer"
                          >
                            Inactivar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}


            {/* Modal de Creación/Edición Productos */}
            {isProductModalOpen && (
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-6 px-4 sm:px-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto">
                <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-2xl max-w-2xl w-full flex flex-col mb-16 relative">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                    <h3 className="text-base font-bold text-slate-800">
                      {editingProduct ? 'Editar Producto de Ahorro' : 'Nuevo Producto de Ahorro'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsProductModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-6">
                    <form id="product-form" onSubmit={handleSaveProduct} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Producto</label>
                        <input
                          type="text"
                          required
                          value={productForm.nombre}
                          onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })}
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                          placeholder="Ej: Ahorro Vista Premium"
                        />
                      </div>

                      <div className="space-y-1.5 relative z-50">
                        <SearchableCombobox
                          label="Tipo de Producto"
                          value={tipoProductoValueMap[productForm.tipoProducto] || ""}
                          onChange={(val) => {
                            const key = tipoProductoKeyMap[val] || "AHORRO_VISTA";
                            setProductForm({ ...productForm, tipoProducto: key });
                          }}
                          options={tipoProductoOptions}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tasa de Interés Anual (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          required
                          value={productForm.tasaInteresAnual}
                          onChange={(e) => setProductForm({ ...productForm, tasaInteresAnual: e.target.value })}
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monto Mínimo Apertura ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={productForm.montoMinimoApertura}
                          onChange={(e) => setProductForm({ ...productForm, montoMinimoApertura: e.target.value })}
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Saldo Mínimo Requerido ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={productForm.saldoMinimoRequerido}
                          onChange={(e) => setProductForm({ ...productForm, saldoMinimoRequerido: e.target.value })}
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1.5 relative z-40">
                        <SearchableCombobox
                          label="Regla de Retiro"
                          value={tipoRetiroValueMap[productForm.tipoRetiro] || ""}
                          onChange={(val) => {
                            const key = tipoRetiroKeyMap[val] || "LIBRE";
                            setProductForm({ ...productForm, tipoRetiro: key });
                          }}
                          options={tipoRetiroOptions}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tasa Penalización Retiro (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          disabled={productForm.tipoRetiro !== 'PENALIZADO'}
                          value={productForm.tasaPenalizacionRetiro}
                          onChange={(e) => setProductForm({ ...productForm, tasaPenalizacionRetiro: e.target.value })}
                          className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all disabled:opacity-50"
                        />
                      </div>

                      <div className="col-span-2 relative z-30">
                        <SearchableCombobox
                          label="Cuenta Contable Obligaciones (Pasivo)"
                          placeholder="Buscar cuenta de pasivo..."
                          value={productForm.cuentaContablePasivoId}
                          onChange={(val) => setProductForm({ ...productForm, cuentaContablePasivoId: val })}
                          options={accounts.map(acc => `${acc.codigoContable} - ${acc.nombreCuenta}`)}
                        />
                      </div>

                      <div className="col-span-2 relative z-20">
                        <SearchableCombobox
                          label="Cuenta Contable Gasto por Intereses (Gasto)"
                          placeholder="Buscar cuenta de gasto..."
                          value={productForm.cuentaContableGastoId}
                          onChange={(val) => setProductForm({ ...productForm, cuentaContableGastoId: val })}
                          options={accounts.map(acc => `${acc.codigoContable} - ${acc.nombreCuenta}`)}
                        />
                      </div>

                      <div className="space-y-1.5 relative z-10">
                        <SearchableCombobox
                          label="Estado del Producto"
                          value={estadoValueMap[productForm.estado] || ""}
                          onChange={(val) => {
                            const key = estadoKeyMap[val] || "ACTIVO";
                            setProductForm({ ...productForm, estado: key });
                          }}
                          options={estadoOptions}
                        />
                      </div>

                    </div>
                  </form>
                </div>

                {(() => {
                  const hasProductChanges = !editingProduct ||
                    productForm.nombre !== editingProduct.nombre ||
                    productForm.tipoProducto !== editingProduct.tipoProducto ||
                    productForm.tasaInteresAnual !== String(editingProduct.tasaInteresAnual) ||
                    productForm.montoMinimoApertura !== String(editingProduct.montoMinimoApertura) ||
                    productForm.saldoMinimoRequerido !== String(editingProduct.saldoMinimoRequerido) ||
                    productForm.tipoRetiro !== editingProduct.tipoRetiro ||
                    productForm.tasaPenalizacionRetiro !== String(editingProduct.tasaPenalizacionRetiro) ||
                    productForm.cuentaContablePasivoId !== (editingProduct.cuentaContablePasivo ? `${editingProduct.cuentaContablePasivo.codigoContable} - ${editingProduct.cuentaContablePasivo.nombreCuenta}` : '') ||
                    productForm.cuentaContableGastoId !== (editingProduct.cuentaContableGasto ? `${editingProduct.cuentaContableGasto.codigoContable} - ${editingProduct.cuentaContableGasto.nombreCuenta}` : '') ||
                    productForm.estado !== editingProduct.estado;

                  return (
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsProductModalOpen(false)}
                        className="py-2.5 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      {hasProductChanges && (
                        <button
                          type="submit"
                          form="product-form"
                          className="py-2.5 px-5 rounded-xl bg-[#0054A6] hover:bg-[#004080] text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            )}
          </div>
        )}

        {/* TAB E: CAJAS FINANCIERAS */}
        {activeTab === 'cajas_financieras' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0054A6]" />
                  Gestión de Cajas Financieras
                </h2>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-3xl">
                  Configure las ventanillas físicas (cajas) de la cooperativa. Esto habilita el origen de la infraestructura para operaciones en efectivo, estableciendo límites operativos y saldos de bóveda de manera contable estricta.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenNewCaja}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0054A6] text-white text-xs font-bold hover:bg-[#004385] transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  + Nueva Caja
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar caja, cajero, código o agencia..."
                  value={cajasSearchQuery}
                  onChange={(e) => setCajasSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-2xl pl-11 pr-12 py-3 text-xs font-semibold text-slate-700 outline-none transition-all shadow-sm focus:shadow-md"
                />
                {cajasSearchQuery && (
                  <button 
                    onClick={() => setCajasSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {(cajasSearchQuery || cajasStatusFilter !== 'TODOS') && (
                <button
                  type="button"
                  onClick={() => { setCajasSearchQuery(''); setCajasStatusFilter('TODOS'); }}
                  className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-rose-50 text-rose-600 text-[11px] font-bold hover:bg-rose-100 hover:text-rose-700 transition-colors uppercase tracking-wider shrink-0"
                >
                  <X className="h-3.5 w-3.5" /> Limpiar
                </button>
              )}

              <div className="w-full md:w-56 relative shrink-0">
                <select
                  value={cajasStatusFilter}
                  onChange={(e) => setCajasStatusFilter(e.target.value)}
                  className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-2xl pl-4 pr-10 py-3 text-xs font-bold text-slate-600 outline-none transition-all shadow-sm focus:shadow-md appearance-none cursor-pointer"
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="ACTIVA">Activas</option>
                  <option value="INACTIVA">Inactivas</option>
                  <option value="ABIERTA">Abiertas</option>
                  <option value="CERRADA">Cerradas</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {loadingCajas ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
              </div>
            ) : cajas.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 border-dashed rounded-3xl p-12 text-center">
                <Coins className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">No hay Cajas Financieras registradas</p>
                <p className="text-xs text-slate-400 mt-1">Cree la primera caja para comenzar a operar ventanillas.</p>
              </div>
            ) : filteredCajas.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 border-dashed rounded-3xl p-12 text-center">
                <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">No se encontraron resultados</p>
                <p className="text-xs text-slate-400 mt-1">Intente ajustar los términos de búsqueda o filtros.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredCajas.map(caja => {
                  let statusColor = 'bg-slate-400';
                  let statusBg = 'bg-slate-50 text-slate-600';
                  let displayStatus = caja.estadoOperativo || caja.estado;

                  if (displayStatus === 'ABIERTA') {
                    statusColor = 'bg-emerald-500';
                    statusBg = 'bg-emerald-50 text-emerald-700';
                  } else if (displayStatus === 'CERRADA') {
                    statusColor = 'bg-blue-500 bg-[url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg\")]';
                    statusBg = 'bg-blue-50 text-blue-700';
                  }
                  
                  return (
                    <div key={caja.id} className="relative bg-white rounded-[1.5rem] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden flex flex-col group">
                      {/* Indicador de Estado Lateral Fino */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor} opacity-90`} />
                      
                      <div className="p-5 flex-1 flex flex-col relative z-10 pl-6">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-sm font-black text-slate-800 leading-tight">{caja.nombre}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{caja.codigo}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${statusBg}`}>
                            {displayStatus}
                          </span>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Saldo Físico Actual</p>
                          <p className="text-2xl font-black text-slate-800 tracking-tight">${caja.saldoActual?.toFixed(2) || '0.00'}</p>
                        </div>
                        
                        <div className="space-y-3 flex-1 mb-5">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">{caja.agenciaNombre}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Fondo Inicial</span>
                            <span className="text-[11px] font-bold text-slate-500">${caja.saldoBase.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Límite Max.</span>
                            <span className="text-[11px] font-bold text-slate-500">${caja.limiteEfectivoMaximo.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Cajero</span>
                            <span className="text-[11px] font-bold text-slate-500">{caja.cajeroAsignado || 'Sin Asignar'}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-auto pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCaja(caja)}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-[#0054A6] text-xs font-bold text-slate-600 border border-slate-100 transition-all cursor-pointer text-center"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Creación/Edición Cajas */}
      {isCajaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-6 px-4 sm:px-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-2xl max-w-2xl w-full flex flex-col mb-16 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Coins className="h-5 w-5 text-[#0054A6]" />
                {editingCaja ? 'Configurar Caja Financiera' : 'Nueva Caja Financiera'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCajaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cajaModalError && (
              <div className="mt-5 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 animate-fade-in shadow-sm">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <p className="text-xs font-semibold text-rose-700 leading-relaxed">{cajaModalError}</p>
              </div>
            )}

            <div className="mt-6">
              <form id="caja-form" onSubmit={handleSaveCaja} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Código Interno</label>
                    <input
                      type="text"
                      required
                      value={cajaForm.codigo}
                      onChange={(e) => setCajaForm({ ...cajaForm, codigo: e.target.value })}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-500 outline-none cursor-not-allowed"
                      placeholder="Autogenerado"
                      disabled={true}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nombre / Identificador</label>
                    <input
                      type="text"
                      required
                      value={cajaForm.nombre}
                      onChange={(e) => setCajaForm({ ...cajaForm, nombre: e.target.value })}
                      className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                      placeholder="Ej: Ventanilla 1 - Depósitos"
                    />
                  </div>
                  
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Agencia Asignada</label>
                    <div className="relative">
                      <select
                        required
                        value={cajaForm.agenciaId}
                        onChange={(e) => setCajaForm({ ...cajaForm, agenciaId: e.target.value })}
                        className="w-full appearance-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-10 py-3 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                      >
                        <option value="" disabled>Seleccione una agencia...</option>
                        {agencias.map(ag => (
                          <option key={ag.id} value={ag.id}>{ag.codigo} - {ag.nombre}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Límite Max. Efectivo ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={cajaForm.limiteEfectivoMaximo}
                      onChange={(e) => setCajaForm({ ...cajaForm, limiteEfectivoMaximo: e.target.value })}
                      className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                    />
                  </div>

                  <div className="md:col-span-2 relative z-60 bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Estado Operativo de Caja</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                        {cajaForm.estado === 'ACTIVA' ? 'La ventanilla podrá recibir transacciones.' : 'La ventanilla estará deshabilitada.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCajaForm({ ...cajaForm, estado: cajaForm.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA' })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        cajaForm.estado === 'ACTIVA' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          cajaForm.estado === 'ACTIVA' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-1.5 md:col-span-2 relative z-50">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cuenta Contable de Caja
                    </label>
                    <div className="relative">
                      <input 
                         type="text" 
                         value={cajaCuentaOpen ? cajaCuentaSearch : (cajaForm.cuentaContableId || '')}
                         onChange={(e) => setCajaCuentaSearch(e.target.value)}
                         onFocus={() => { setCajaCuentaOpen(true); setCajaCuentaSearch(''); }}
                         placeholder="Seleccione cuenta contable..."
                         className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-10 py-3 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                      />
                      <div className="absolute right-3 top-3 flex items-center gap-1 text-slate-400">
                        {cajaForm.cuentaContableId && !cajaCuentaOpen && (
                          <button type="button" onClick={() => setCajaForm({...cajaForm, cuentaContableId: ''})} className="hover:text-rose-500 cursor-pointer">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <ChevronDown className="h-4 w-4 pointer-events-none" />
                      </div>
                    </div>
                    {cajaCuentaOpen && (
                      <div className="absolute left-0 right-0 top-[4.5rem] max-h-48 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-y-auto p-2 space-y-1" style={{ zIndex: 9999 }}>
                        {accounts.filter(a => a.nombreCuenta.toLowerCase().includes(cajaCuentaSearch.toLowerCase()) || a.codigoContable.includes(cajaCuentaSearch)).map(acc => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setCajaForm({...cajaForm, cuentaContableId: `${acc.codigoContable} - ${acc.nombreCuenta}`});
                              setCajaCuentaOpen(false);
                            }}
                            className="w-full text-left px-3 py-2.5 text-xs font-medium rounded-xl hover:bg-blue-50 hover:text-[#0054A6] transition-all flex items-start gap-1 cursor-pointer"
                          >
                            <span className="font-mono font-bold text-slate-500 shrink-0">{acc.codigoContable}</span>
                            <span className="text-slate-700 font-bold ml-2 flex-1 text-left leading-normal break-words whitespace-normal">{acc.nombreCuenta}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {(() => {
              const hasCajaChanges = !editingCaja ||
                cajaForm.nombre !== editingCaja.nombre ||
                cajaForm.agenciaId !== String(editingCaja.agenciaId) ||
                cajaForm.limiteEfectivoMaximo !== String(editingCaja.limiteEfectivoMaximo) ||
                cajaForm.estado !== editingCaja.estado ||
                cajaForm.cuentaContableId !== (editingCaja.cuentaContableId ? `${accounts.find(a => a.id === editingCaja.cuentaContableId)?.codigoContable} - ${accounts.find(a => a.id === editingCaja.cuentaContableId)?.nombreCuenta}` : '');

              return (
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCajaModalOpen(false)}
                    className="py-2.5 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  {hasCajaChanges && (
                    <button
                      type="submit"
                      form="caja-form"
                      className="py-2.5 px-5 rounded-xl bg-[#0054A6] hover:bg-[#004080] text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      {editingCaja ? 'Guardar Cambios' : 'Crear Caja'}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};
