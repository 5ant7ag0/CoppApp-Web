import React, { useState, useEffect } from 'react';
import { X, Building2, UserCircle, Settings2, Loader2, CheckCircle2, AlertCircle, ChevronDown, Lock, Sliders } from 'lucide-react';
import api from '../../services/api';

interface OnboardingModalProps {
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    codigoSeps: '',
    segmentoSeps: '',
    siglas: '',
    representanteLegal: '',
    cedulaRepresentante: '',
    correoInstitucional: '',
    correoGerente: '',
    telefono: '',
    direccion: '',
    adminUser: '',
    limiteUsuariosAdmin: '5',
    limiteSocios: '500'
  });

  // Real-time Validation States - Step 1
  const [isRucChecking, setIsRucChecking] = useState(false);
  const [rucExists, setRucExists] = useState(false);

  const [isSepsChecking, setIsSepsChecking] = useState(false);
  const [sepsExists, setSepsExists] = useState(false);

  // Real-time Validation States - Step 2 (Retiradas validaciones globales)

  // Toast Notification State
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'ruc') {
      const numericVal = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: numericVal }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  // Algoritmo de validación de Cédula Ecuatoriana (Módulo 10)
  const validarCedulaEcuatoriana = (ced: string): boolean => {
    if (ced.length !== 10) return false;
    const provincia = parseInt(ced.substring(0, 2), 10);
    if (provincia < 1 || provincia > 24) return false;
    const tercerDigito = parseInt(ced.substring(2, 3), 10);
    if (tercerDigito >= 6) return false;

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

  // Real-time RUC Checking
  useEffect(() => {
    const checkRucDuplicity = async () => {
      const cleanRuc = formData.ruc.trim();
      if (cleanRuc.length === 13 && cleanRuc.endsWith('001')) {
        setIsRucChecking(true);
        setRucExists(false);
        try {
          const { data } = await api.get(`/superadmin/tenants/check-ruc?ruc=${cleanRuc}`);
          setRucExists(data.exists);
          if (data.exists) {
            showToast("El RUC ingresado ya se encuentra registrado", "error");
          }
        } catch (err) {
          console.error("Error al validar el RUC en tiempo real", err);
        } finally {
          setIsRucChecking(false);
        }
      } else {
        setRucExists(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      checkRucDuplicity();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [formData.ruc]);

  // Real-time Código SEPS Checking
  useEffect(() => {
    const checkSepsDuplicity = async () => {
      const cleanSeps = formData.codigoSeps.trim();
      if (cleanSeps.length >= 3) {
        setIsSepsChecking(true);
        setSepsExists(false);
        try {
          const { data } = await api.get(`/superadmin/tenants/check-seps?codigoSeps=${cleanSeps}`);
          setSepsExists(data.exists);
          if (data.exists) {
            showToast("El Código SEPS ingresado ya se encuentra registrado", "error");
          }
        } catch (err) {
          console.error("Error al validar el Código SEPS en tiempo real", err);
        } finally {
          setIsSepsChecking(false);
        }
      } else {
        setSepsExists(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      checkSepsDuplicity();
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [formData.codigoSeps]);



  const isRucValid = formData.ruc.length === 13 && formData.ruc.endsWith('001') && !rucExists;

  const isStep1Valid = () => {
    return (
      isRucValid &&
      !isRucChecking &&
      !isSepsChecking &&
      formData.razonSocial.trim() !== '' &&
      formData.nombreComercial.trim() !== '' &&
      formData.codigoSeps.trim() !== '' &&
      !sepsExists &&
      formData.segmentoSeps.trim() !== ''
    );
  };

  const isInstitucionalEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correoInstitucional);
  const isGerenteEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correoGerente);
  const isPhoneValid = /^(09[0-9]{8}|0[2-7][0-9]{7})$/.test(formData.telefono);
  const isCedulaValid = validarCedulaEcuatoriana(formData.cedulaRepresentante);

  const isStep2Valid = () => {
    return (
      formData.direccion.trim() !== '' &&
      isPhoneValid &&
      isInstitucionalEmailValid &&
      formData.representanteLegal.trim() !== '' &&
      isCedulaValid &&
      isGerenteEmailValid &&
      formData.correoInstitucional.trim() !== formData.correoGerente.trim()
    );
  };

  const isStep3Valid = () => {
    const limUsers = parseInt(formData.limiteUsuariosAdmin, 10);
    const limSocios = parseInt(formData.limiteSocios, 10);
    return (
      formData.adminUser.trim().length >= 4 &&
      !isNaN(limUsers) && limUsers > 0 &&
      !isNaN(limSocios) && limSocios > 0
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        empresa: {
          ruc: formData.ruc,
          razonSocial: formData.razonSocial,
          nombreComercial: formData.nombreComercial,
          codigoSeps: formData.codigoSeps,
          segmentoSeps: formData.segmentoSeps,
          siglas: formData.siglas,
          representanteLegal: formData.representanteLegal,
          cedulaRepresentante: formData.cedulaRepresentante,
          correoInstitucional: formData.correoInstitucional,
          correoGerente: formData.correoGerente,
          telefono: formData.telefono,
          direccion: formData.direccion,
          limiteUsuariosAdmin: parseInt(formData.limiteUsuariosAdmin, 10),
          limiteSocios: parseInt(formData.limiteSocios, 10),
          moneda: 'USD',
          estado: 'ACTIVO'
        },
        admin: {
          username: formData.adminUser,
          rol: 'GERENTE_GENERAL',
          estado: 'ACTIVO'
        }
      };

      await api.post('/superadmin/onboard', payload);
      setSuccess(true);
    } catch (err: any) {
      if (err.response?.status === 409) {
        const errorText = typeof err.response.data === 'string' ? err.response.data : 'Esta cooperativa ya se encuentra registrada en el sistema';
        showToast(errorText, "error");
      } else {
        setError(err.response?.data || err.message || 'Error en el proceso de onboarding');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepIcon = (num: number, icon: React.ElementType, title: string) => {
    const isActive = step === num;
    const isCompleted = step > num;
    const Icon = icon;

    return (
      <div className="flex flex-col items-center gap-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
          isActive ? 'border-[#0054A6] bg-[#0054A6]/5 text-[#0054A6]' :
          isCompleted ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
          'border-slate-200 bg-slate-50 text-slate-400'
        }`}>
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-[#0054A6]' : 'text-slate-400'}`}>
          {title}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Nueva Cooperativa</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-8 py-6 flex items-center justify-between relative border-b border-slate-100">
          <div className="absolute left-14 right-14 top-11 h-0.5 bg-slate-100 -z-10">
            <div 
              className="h-full bg-[#0054A6] transition-all duration-300"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />
          </div>
          {renderStepIcon(1, Building2, 'Institucional')}
          {renderStepIcon(2, UserCircle, 'Representación')}
          {renderStepIcon(3, Settings2, 'Parámetros')}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¡Tenant Creado Exitosamente!</h3>
              <p className="text-sm text-slate-500 max-w-md">
                La cooperativa {formData.razonSocial} ha sido configurada. 
                Se ha enviado un correo electrónico automático a <strong>{formData.correoGerente}</strong> con el enlace seguro para configurar su contraseña digital de seguridad.
              </p>
              <button
                onClick={onClose}
                className="mt-8 bg-slate-900 hover:bg-slate-800 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                Cerrar y Volver al Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700 animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold">{error}</p>
                </div>
              )}

              {step === 1 && (
                <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4">
                  {/* Row 1: RUC (col-span-1) & Razón Social (col-span-1) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                        RUC
                        {isRucChecking && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#0054A6]" />}
                      </label>
                      <span className={`text-[9px] font-bold transition-colors duration-200 ${isRucValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formData.ruc.length}/13
                      </span>
                    </div>
                    <input 
                      type="text" 
                      name="ruc" 
                      value={formData.ruc} 
                      onChange={handleChange} 
                      maxLength={13} 
                      className={`w-full border rounded-xl px-3 py-2 text-sm font-bold outline-none transition-all duration-200 ${
                        formData.ruc.length === 0 ? 'border-slate-200 focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6]' :
                        rucExists ? 'border-rose-400 bg-rose-50/5 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-rose-700' :
                        isRucValid ? 'border-emerald-400 bg-emerald-50/5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-emerald-700' :
                        'border-rose-300 bg-rose-50/5 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 text-rose-750'
                      }`} 
                    />
                    {rucExists && (
                      <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5 animate-in fade-in">
                        <AlertCircle className="w-3 h-3" /> Este RUC ya está registrado
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Razón Social</label>
                    <input type="text" name="razonSocial" value={formData.razonSocial} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-[#0054A6] outline-none" />
                  </div>

                  {/* Row 2: Nombre Comercial (col-span-1) & Siglas (col-span-1) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nombre Comercial</label>
                    <input type="text" name="nombreComercial" value={formData.nombreComercial} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-[#0054A6] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Siglas (Opcional)</label>
                    <input type="text" name="siglas" value={formData.siglas} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-[#0054A6] outline-none" />
                  </div>

                  {/* Row 3: Código SEPS (col-span-1) & Segmento SEPS (col-span-1) */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código SEPS</label>
                      {isSepsChecking && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#0054A6]" />}
                    </div>
                    <input 
                      type="text" 
                      name="codigoSeps" 
                      value={formData.codigoSeps} 
                      onChange={handleChange} 
                      className={`w-full border rounded-xl px-3 py-2 text-sm font-bold outline-none transition-all duration-200 ${
                        formData.codigoSeps.trim().length === 0 ? 'border-slate-200 focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6]' :
                        sepsExists ? 'border-rose-400 bg-rose-50/5 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-rose-700' :
                        'border-slate-200 focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6]'
                      }`} 
                    />
                    {sepsExists && (
                      <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5 animate-in fade-in">
                        <AlertCircle className="w-3 h-3" /> Este Código SEPS ya está registrado
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Segmento SEPS</label>
                    <div className="relative">
                      <select 
                        name="segmentoSeps" 
                        value={formData.segmentoSeps} 
                        onChange={handleChange} 
                        className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm font-bold focus:border-[#0054A6] focus:ring-4 focus:ring-[#0054A6]/10 outline-none bg-white appearance-none cursor-pointer text-slate-700"
                      >
                        <option value="">Seleccione un segmento...</option>
                        <option value="Segmento 1">Segmento 1</option>
                        <option value="Segmento 2">Segmento 2</option>
                        <option value="Segmento 3">Segmento 3</option>
                        <option value="Segmento 4">Segmento 4</option>
                        <option value="Segmento 5">Segmento 5</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  {/* Grupo 1: Datos de la Entidad (Contacto Institucional) */}
                  <div className="bg-slate-50/30 border border-slate-100 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100/80 pb-2">
                      <Building2 className="w-4 h-4 text-[#0054A6]" />
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Contacto Institucional</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Dirección Matriz</label>
                        <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold focus:border-[#0054A6] outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Teléfono Institucional</label>
                        <input 
                          type="text" 
                          name="telefono" 
                          value={formData.telefono} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setFormData(prev => ({ ...prev, telefono: val }));
                          }} 
                          className={`w-full border rounded-xl px-3.5 py-2 text-sm font-bold outline-none transition-all duration-200 ${
                            formData.telefono.length === 0 ? 'border-slate-200 focus:border-[#0054A6]' :
                            isPhoneValid ? 'border-emerald-400 text-emerald-700 bg-emerald-50/5' :
                            'border-rose-300 text-rose-700 bg-rose-50/5'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Correo Electrónico Institucional</label>
                        <input 
                          type="email" 
                          name="correoInstitucional" 
                          value={formData.correoInstitucional} 
                          onChange={handleChange} 
                          className={`w-full border rounded-xl px-3.5 py-2 text-sm font-bold outline-none transition-all duration-200 ${
                            formData.correoInstitucional.length === 0 ? 'border-slate-200 focus:border-[#0054A6]' :
                            isInstitucionalEmailValid ? 'border-emerald-400 text-emerald-700 bg-emerald-50/5' :
                            'border-rose-300 text-rose-700 bg-rose-50/5'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grupo 2: Datos de la Autoridad (Representante Legal) */}
                  <div className="bg-slate-50/30 border border-slate-100 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100/80 pb-2">
                      <UserCircle className="w-4 h-4 text-[#0054A6]" />
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Representante Legal</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nombres Completos</label>
                        <input type="text" name="representanteLegal" value={formData.representanteLegal} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold focus:border-[#0054A6] outline-none" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            Cédula del Representante
                          </label>
                          <span className={`text-[9px] font-bold transition-colors duration-200 ${isCedulaValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {formData.cedulaRepresentante.length}/10
                          </span>
                        </div>
                        <input 
                          type="text" 
                          name="cedulaRepresentante" 
                          value={formData.cedulaRepresentante} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setFormData(prev => ({ ...prev, cedulaRepresentante: val }));
                          }} 
                          maxLength={10} 
                          className={`w-full border rounded-xl px-3.5 py-2 text-sm font-bold outline-none transition-all duration-200 ${
                            formData.cedulaRepresentante.length === 0 ? 'border-slate-200 focus:border-[#0054A6]' :
                            isCedulaValid ? 'border-emerald-400 text-emerald-700 bg-emerald-50/5' :
                            'border-rose-300 text-rose-700 bg-rose-50/5'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            Correo del Representante
                          </label>
                        </div>
                        <input 
                          type="email" 
                          name="correoGerente" 
                          value={formData.correoGerente} 
                          onChange={handleChange} 
                          className={`w-full border rounded-xl px-3.5 py-2 text-sm font-bold outline-none transition-all duration-200 ${
                            formData.correoGerente.length === 0 ? 'border-slate-200 focus:border-[#0054A6]' :
                            isGerenteEmailValid ? 'border-emerald-400 text-emerald-700 bg-emerald-50/5' :
                            'border-rose-300 text-rose-700 bg-rose-50/5'
                          }`}
                        />
                        {formData.correoInstitucional.trim() && formData.correoGerente.trim() && formData.correoInstitucional.trim() === formData.correoGerente.trim() && (
                          <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5 animate-in fade-in">
                            <AlertCircle className="w-3 h-3" /> Los correos no deben ser idénticos
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  {/* Grupo 1: Cuotas del Plan SaaS */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm shadow-slate-100/50 space-y-6">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 pb-2.5">
                      <Sliders className="w-4 h-4 text-slate-400" />
                      <span>Consumo y Cuotas de Licencia</span>
                    </div>

                    {/* Admin Limits */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-600">Usuarios Administrativos</p>
                        <p className="text-sm font-black text-[#0054A6]">
                          Límite: {formData.limiteUsuariosAdmin}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 animate-in fade-in duration-150">
                        <input 
                          type="range" 
                          min={1} 
                          max={100} 
                          value={parseInt(formData.limiteUsuariosAdmin, 10) || 5}
                          onChange={(e) => setFormData(prev => ({ ...prev, limiteUsuariosAdmin: e.target.value }))}
                          className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0054A6]"
                        />
                        <input 
                          type="number" 
                          min={1}
                          value={formData.limiteUsuariosAdmin}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1).toString();
                            setFormData(prev => ({ ...prev, limiteUsuariosAdmin: val }));
                          }}
                          className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6]"
                        />
                      </div>
                    </div>

                    {/* Socio Limits */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-600">Socios Registrados</p>
                        <p className="text-sm font-black text-emerald-600">
                          Límite: {formData.limiteSocios}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 animate-in fade-in duration-150">
                        <input 
                          type="range" 
                          min={10} 
                          max={10000} 
                          step={10}
                          value={parseInt(formData.limiteSocios, 10) || 500}
                          onChange={(e) => setFormData(prev => ({ ...prev, limiteSocios: e.target.value }))}
                          className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0054A6]"
                        />
                        <input 
                          type="number" 
                          min={10}
                          value={formData.limiteSocios}
                          onChange={(e) => {
                            const val = Math.max(10, parseInt(e.target.value, 10) || 10).toString();
                            setFormData(prev => ({ ...prev, limiteSocios: val }));
                          }}
                          className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grupo 2: Cuenta Maestra de Acceso */}
                  <div className="bg-slate-50/30 border border-slate-100 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100/80 pb-2">
                      <Lock className="w-4 h-4 text-[#0054A6]" />
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Acceso del Administrador Principal</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Usuario Administrador Principal</label>
                        <input 
                          type="text" 
                          name="adminUser" 
                          value={formData.adminUser} 
                          onChange={handleChange} 
                          placeholder="Ej: admin_gerente"
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold focus:border-[#0054A6] outline-none" 
                        />
                      </div>

                      {/* Banner Informativo Premium de Seguridad */}
                      <div className="p-4 bg-[#0054A6]/5 border border-[#0054A6]/10 rounded-2xl flex gap-3.5 items-start">
                        <div className="bg-[#0054A6]/10 p-2 rounded-xl text-[#0054A6] shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Seguridad de Acceso</p>
                          <p className="text-[10.5px] text-slate-500 font-bold leading-normal">
                            Al finalizar, el Representante Legal recibirá un enlace seguro y único en <span className="text-[#0054A6] font-extrabold">{formData.correoGerente}</span> para establecer su clave de forma privada.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!success && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <button
              onClick={step === 1 ? onClose : handlePrev}
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
            >
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>
            <button
              onClick={step === 3 ? handleSubmit : handleNext}
              disabled={
                loading || 
                (step === 1 && !isStep1Valid()) ||
                (step === 2 && !isStep2Valid()) ||
                (step === 3 && !isStep3Valid())
              }
              className="flex items-center gap-2 bg-[#0054A6] hover:bg-[#004080] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#0054A6]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 3 ? 'Finalizar Onboarding' : 'Siguiente Paso'}
            </button>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toast.show && (
          <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3.5 px-4 py-3 bg-white border border-rose-100 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-rose-50 p-1.5 rounded-full text-rose-500 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 leading-tight">Conflicto de Registro</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-slate-600 shrink-0 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
