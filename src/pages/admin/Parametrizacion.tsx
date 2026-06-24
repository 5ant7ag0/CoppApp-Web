import React, { useState, useEffect } from 'react';
import api from '../../services/api';
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
  X
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

  // Enlaces
  cuentaContableCartera: Account | null;
  cuentaContableSeguro: Account | null;
  cuentaContablePapeleria: Account | null;
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

export const Parametrizacion: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'institucional' | 'financiero' | 'contabilidad' | 'auditoria'>('institucional');
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States for account Autocomplete Dropdowns
  const [carteraSearch, setCarteraSearch] = useState('');
  const [carteraOpen, setCarteraOpen] = useState(false);
  const [seguroSearch, setSeguroSearch] = useState('');
  const [seguroOpen, setSeguroOpen] = useState(false);
  const [papeleriaSearch, setPapeleriaSearch] = useState('');
  const [papeleriaOpen, setPapeleriaOpen] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/empresas/mi-perfil');
      setSettings(res.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al cargar la parametrización gerencial: ' + (err.response?.data || err.message));
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/contabilidad/plan-cuentas');
      const allAccounts: Account[] = res.data || [];
      // Filtrar solo cuentas de movimiento (nivel detalle) para evitar errores contables
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

  const handleInputChange = (field: keyof CompanySettings, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: value
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

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
    if (Number(settings.porcentajeSeguroDesgravamen) < 0 || Number(settings.porcentajeSeguroDesgravamen) > 100) {
      setErrorMsg('El Porcentaje de Seguro de Desgravamen debe estar entre 0% y 100%.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        ...settings,
        // Forzar casting numérico para campos decimales
        saldoMinimoApertura: Number(settings.saldoMinimoApertura),
        montoMinimoCredito: Number(settings.montoMinimoCredito),
        montoMaximoCredito: Number(settings.montoMaximoCredito),
        tasaInteresAnual: Number(settings.tasaInteresAnual),
        tasaInteresMora: Number(settings.tasaInteresMora),
        costoTramite: Number(settings.costoTramite),
        porcentajeSeguroDesgravamen: Number(settings.porcentajeSeguroDesgravamen),
        cuotaAportacionMensual: Number(settings.cuotaAportacionMensual)
      };

      const res = await api.put('/empresas/mi-perfil', payload);
      setSettings(res.data);
      setSuccessMsg('¡Parámetros gerenciales actualizados con éxito en base de datos!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al guardar cambios: ' + (err.response?.data || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Helper para traducir llaves técnicas a labels humanos
  const formatParamName = (key: string): string => {
    const dict: Record<string, string> = {
      razonSocial: 'Razón Social',
      nombreComercial: 'Nombre Comercial',
      representanteLegal: 'Representante Legal',
      cedulaRepresentante: 'Cédula Representante',
      logoUrl: 'URL de Logo',
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
      cuentaContableCartera: 'Cuenta Contable: Cartera de Créditos',
      cuentaContableSeguro: 'Cuenta Contable: Ingresos Seguro Desgravamen',
      cuentaContablePapeleria: 'Cuenta Contable: Ingresos Trámites/Papelería'
    };
    return dict[key] || key;
  };

  // Helper para dar formato estético a los valores anteriores y nuevos
  const formatParamValue = (key: string, val: any): string => {
    if (val === null || val === undefined) return 'No configurado';
    if (typeof val === 'string' && val.trim() === '') return 'Vacío';
    
    // Si es una tasa
    if (['tasaInteresAnual', 'tasaInteresMora', 'porcentajeSeguroDesgravamen'].includes(key)) {
      return `${val}%`;
    }
    // Si es un valor financiero
    if (['saldoMinimoApertura', 'montoMinimoCredito', 'montoMaximoCredito', 'costoTramite', 'cuotaAportacionMensual'].includes(key)) {
      return `$${Number(val).toFixed(2)} USD`;
    }
    return String(val);
  };

  // Listar todas las modificaciones desglosadas por cada parámetro modificado de forma individual
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

  // Filtrado de cuentas contables para Autocompletado
  const filteredCarteraAccounts = accounts.filter(acc => 
    acc.codigoContable.includes(carteraSearch) || 
    acc.nombreCuenta.toLowerCase().includes(carteraSearch.toLowerCase())
  );

  const filteredSeguroAccounts = accounts.filter(acc => 
    acc.codigoContable.includes(seguroSearch) || 
    acc.nombreCuenta.toLowerCase().includes(seguroSearch.toLowerCase())
  );

  const filteredPapeleriaAccounts = accounts.filter(acc => 
    acc.codigoContable.includes(papeleriaSearch) || 
    acc.nombreCuenta.toLowerCase().includes(papeleriaSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
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

      {/* Header Panel */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Parametrización Gerencial
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Reglas de negocio y enlaces contables globales para la cooperativa
          </p>
        </div>

        {activeTab !== 'auditoria' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-[#0054A6] hover:bg-[#004080] text-white font-bold text-xs py-3.5 px-6 rounded-2xl transition-all duration-300 shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shrink-0"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Guardar Cambios</span>
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-[1.5rem] border border-slate-100 overflow-x-auto scrollbar-none gap-1">
        <button
          onClick={() => setActiveTab('institucional')}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'institucional'
              ? 'bg-white text-[#0054A6] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Institucional</span>
        </button>

        <button
          onClick={() => setActiveTab('financiero')}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'financiero'
              ? 'bg-white text-[#0054A6] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Reglas Financieras</span>
        </button>

        <button
          onClick={() => setActiveTab('contabilidad')}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'contabilidad'
              ? 'bg-white text-[#0054A6] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Link2 className="h-4 w-4" />
          <span>Enlaces Contables</span>
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'auditoria'
              ? 'bg-white text-[#0054A6] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Pista de Auditoría (SEPS)</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* TAB A: INSTITUCIONAL */}
          {activeTab === 'institucional' && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0054A6]" />
                Datos Legales y de Identificación (SRI / SEPS)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">RUC de la Cooperativa</label>
                  <input
                    type="text"
                    value={settings.ruc}
                    readOnly
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-500 cursor-not-allowed outline-none"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Razón Social</label>
                  <input
                    type="text"
                    value={settings.razonSocial}
                    onChange={(e) => handleInputChange('razonSocial', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nombre Comercial</label>
                  <input
                    type="text"
                    value={settings.nombreComercial}
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
                    onChange={(e) => handleInputChange('siglas', e.target.value.toUpperCase())}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Código de Ente SEPS</label>
                  <input
                    type="text"
                    value={settings.codigoSeps}
                    onChange={(e) => handleInputChange('codigoSeps', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Segmento SEPS</label>
                  <select
                    value={settings.segmentoSeps || ''}
                    onChange={(e) => handleInputChange('segmentoSeps', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Segmento 1">Segmento 1 (Grande)</option>
                    <option value="Segmento 2">Segmento 2</option>
                    <option value="Segmento 3">Segmento 3 (Mediano)</option>
                    <option value="Segmento 4">Segmento 4</option>
                    <option value="Segmento 5">Segmento 5 (Pequeño)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">N. Resolución de Constitución</label>
                  <input
                    type="text"
                    placeholder="Ej: SEPS-RO-2026-0042"
                    value={settings.resolucionSeps || ''}
                    onChange={(e) => handleInputChange('resolucionSeps', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Representante Legal</label>
                  <input
                    type="text"
                    value={settings.representanteLegal}
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
                    onChange={(e) => handleInputChange('cedulaRepresentante', e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
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
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Teléfono Institucional</label>
                  <input
                    type="text"
                    value={settings.telefono || ''}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico Notificaciones</label>
                  <input
                    type="email"
                    value={settings.correoInstitucional || ''}
                    onChange={(e) => handleInputChange('correoInstitucional', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Provincia</label>
                  <input
                    type="text"
                    value={settings.provincia || ''}
                    onChange={(e) => handleInputChange('provincia', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cantón / Ciudad</label>
                  <input
                    type="text"
                    value={settings.canton || ''}
                    onChange={(e) => handleInputChange('canton', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5 col-span-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">URL del Logo Institucional</label>
                  <input
                    type="text"
                    value={settings.logoUrl || ''}
                    onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB B: REGLAS FINANCIERAS */}
          {activeTab === 'financiero' && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0054A6]" />
                Reglas de Negocio y Umbrales Financieros
              </h2>

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
                      onChange={(e) => handleInputChange('montoMinimoCredito', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-8 pr-4 py-3 text-xs font-black text-slate-700 outline-none transition-all"
                    />
                  </div>
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
                      onChange={(e) => handleInputChange('montoMaximoCredito', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-8 pr-4 py-3 text-xs font-black text-slate-700 outline-none transition-all"
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
                      onChange={(e) => handleInputChange('porcentajeSeguroDesgravamen', e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-8 py-3 text-xs font-black text-slate-700 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Porcentaje retenido al desembolsar créditos como póliza de seguro.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB C: ENLACES CONTABLES */}
          {activeTab === 'contabilidad' && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0054A6]" />
                Enlaces de Catalogación Contable (Integración Core)
              </h2>

              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Asigne a qué cuenta contable específica (cuenta de movimiento con código y nombre) se deben asentar de forma automática los débitos y créditos del libro diario en los desembolsos de préstamos y cobro de trámites.
              </p>

              <div className="space-y-6">
                
                {/* Selector 1: Cartera de Créditos */}
                <div className="space-y-2 relative bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-[#0054A6] uppercase tracking-wider block">
                    Cuenta Contable: Cartera de Créditos (Activo)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Seleccione cuenta..."
                      value={carteraOpen ? carteraSearch : (settings.cuentaContableCartera ? `${settings.cuentaContableCartera.codigoContable} - ${settings.cuentaContableCartera.nombreCuenta}` : '')}
                      onFocus={() => { setCarteraOpen(true); setCarteraSearch(''); }}
                      onChange={(e) => setCarteraSearch(e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-10 py-3 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                    />
                    <div className="absolute right-3 top-3 flex items-center gap-1 text-slate-400">
                      {settings.cuentaContableCartera && (
                        <button type="button" onClick={() => handleInputChange('cuentaContableCartera', null)} className="hover:text-rose-500 cursor-pointer">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <ChevronDown className="h-4 w-4 pointer-events-none" />
                    </div>
                  </div>

                  {carteraOpen && (
                    <div className="absolute left-5 right-5 top-[5.2rem] max-h-56 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-y-auto z-50 p-2 space-y-1">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1 px-2">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Filtrando Plan de Cuentas (Detalle)</span>
                      </div>
                      {filteredCarteraAccounts.length === 0 ? (
                        <div className="text-xs text-slate-400 p-3 text-center">No se encontraron cuentas de movimiento.</div>
                      ) : (
                        filteredCarteraAccounts.map(acc => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              handleInputChange('cuentaContableCartera', acc);
                              setCarteraOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium rounded-xl hover:bg-blue-50 hover:text-[#0054A6] transition-all flex items-center justify-between"
                          >
                            <span className="font-mono font-bold text-slate-500">{acc.codigoContable}</span>
                            <span className="truncate text-slate-700 font-bold ml-3 flex-1">{acc.nombreCuenta}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {carteraOpen && <div className="fixed inset-0 z-40" onClick={() => setCarteraOpen(false)} />}
                </div>

                {/* Selector 2: Seguro de Desgravamen */}
                <div className="space-y-2 relative bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-[#0054A6] uppercase tracking-wider block">
                    Cuenta Contable: Seguro de Desgravamen (Ingreso)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Seleccione cuenta..."
                      value={seguroOpen ? seguroSearch : (settings.cuentaContableSeguro ? `${settings.cuentaContableSeguro.codigoContable} - ${settings.cuentaContableSeguro.nombreCuenta}` : '')}
                      onFocus={() => { setSeguroOpen(true); setSeguroSearch(''); }}
                      onChange={(e) => setSeguroSearch(e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-10 py-3 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                    />
                    <div className="absolute right-3 top-3 flex items-center gap-1 text-slate-400">
                      {settings.cuentaContableSeguro && (
                        <button type="button" onClick={() => handleInputChange('cuentaContableSeguro', null)} className="hover:text-rose-500 cursor-pointer">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <ChevronDown className="h-4 w-4 pointer-events-none" />
                    </div>
                  </div>

                  {seguroOpen && (
                    <div className="absolute left-5 right-5 top-[5.2rem] max-h-56 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-y-auto z-50 p-2 space-y-1">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1 px-2">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Filtrando Plan de Cuentas (Detalle)</span>
                      </div>
                      {filteredSeguroAccounts.length === 0 ? (
                        <div className="text-xs text-slate-400 p-3 text-center">No se encontraron cuentas de movimiento.</div>
                      ) : (
                        filteredSeguroAccounts.map(acc => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              handleInputChange('cuentaContableSeguro', acc);
                              setSeguroOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium rounded-xl hover:bg-blue-50 hover:text-[#0054A6] transition-all flex items-center justify-between"
                          >
                            <span className="font-mono font-bold text-slate-500">{acc.codigoContable}</span>
                            <span className="truncate text-slate-700 font-bold ml-3 flex-1">{acc.nombreCuenta}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {seguroOpen && <div className="fixed inset-0 z-40" onClick={() => setSeguroOpen(false)} />}
                </div>

                {/* Selector 3: Costo de Papelería / Trámite */}
                <div className="space-y-2 relative bg-slate-50 p-5 rounded-2xl border border-slate-100/60">
                  <label className="text-[11px] font-extrabold text-[#0054A6] uppercase tracking-wider block">
                    Cuenta Contable: Costos Operativos de Trámites/Papelería (Ingreso)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Seleccione cuenta..."
                      value={papeleriaOpen ? papeleriaSearch : (settings.cuentaContablePapeleria ? `${settings.cuentaContablePapeleria.codigoContable} - ${settings.cuentaContablePapeleria.nombreCuenta}` : '')}
                      onFocus={() => { setPapeleriaOpen(true); setPapeleriaSearch(''); }}
                      onChange={(e) => setPapeleriaSearch(e.target.value)}
                      className="w-full bg-white border border-slate-100 focus:border-[#0054A6] rounded-xl pl-4 pr-10 py-3 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                    />
                    <div className="absolute right-3 top-3 flex items-center gap-1 text-slate-400">
                      {settings.cuentaContablePapeleria && (
                        <button type="button" onClick={() => handleInputChange('cuentaContablePapeleria', null)} className="hover:text-rose-500 cursor-pointer">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <ChevronDown className="h-4 w-4 pointer-events-none" />
                    </div>
                  </div>

                  {papeleriaOpen && (
                    <div className="absolute left-5 right-5 top-[5.2rem] max-h-56 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-y-auto z-50 p-2 space-y-1">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1 px-2">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Filtrando Plan de Cuentas (Detalle)</span>
                      </div>
                      {filteredPapeleriaAccounts.length === 0 ? (
                        <div className="text-xs text-slate-400 p-3 text-center">No se encontraron cuentas de movimiento.</div>
                      ) : (
                        filteredPapeleriaAccounts.map(acc => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              handleInputChange('cuentaContablePapeleria', acc);
                              setPapeleriaOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium rounded-xl hover:bg-blue-50 hover:text-[#0054A6] transition-all flex items-center justify-between"
                          >
                            <span className="font-mono font-bold text-slate-500">{acc.codigoContable}</span>
                            <span className="truncate text-slate-700 font-bold ml-3 flex-1">{acc.nombreCuenta}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {papeleriaOpen && <div className="fixed inset-0 z-40" onClick={() => setPapeleriaOpen(false)} />}
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
      </div>

    </div>
  );
};
