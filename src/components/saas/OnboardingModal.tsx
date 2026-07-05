import React, { useState } from 'react';
import { X, Building2, UserCircle, Settings2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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
    siglas: '',
    representanteLegal: '',
    cedulaRepresentante: '',
    correoInstitucional: '',
    telefono: '',
    direccion: '',
    adminUser: '',
    adminPassword: '',
    saldoMinimo: '10.00',
    cuotaAportacion: '5.00',
    limiteUsuariosAdmin: '5',
    limiteSocios: '500'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

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
          siglas: formData.siglas,
          representanteLegal: formData.representanteLegal,
          cedulaRepresentante: formData.cedulaRepresentante,
          correoInstitucional: formData.correoInstitucional,
          telefono: formData.telefono,
          direccion: formData.direccion,
          saldoMinimoApertura: parseFloat(formData.saldoMinimo),
          cuotaAportacionMensual: parseFloat(formData.cuotaAportacion),
          limiteUsuariosAdmin: parseInt(formData.limiteUsuariosAdmin, 10),
          limiteSocios: parseInt(formData.limiteSocios, 10),
          moneda: 'USD',
          estado: 'ACTIVO'
        },
        admin: {
          username: formData.adminUser,
          passwordHash: formData.adminPassword,
          rol: 'GERENTE_GENERAL',
          estado: 'ACTIVO',
          nombres: formData.representanteLegal
        }
      };

      await api.post('/superadmin/onboard', payload);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data || err.message || 'Error en el proceso de onboarding');
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
          isActive ? 'border-indigo-600 bg-indigo-50 text-indigo-600' :
          isCompleted ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
          'border-slate-200 bg-slate-50 text-slate-400'
        }`}>
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>
          {title}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Nueva Cooperativa (Tenant)</h2>
            <p className="text-xs text-slate-500 font-medium">Asistente de Onboarding Institucional</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-8 py-6 flex items-center justify-between relative border-b border-slate-100">
          <div className="absolute left-14 right-14 top-11 h-0.5 bg-slate-100 -z-10">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300"
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
                Se ha enviado un correo electrónico automático a <strong>{formData.correoInstitucional}</strong> con las credenciales del Administrador Principal.
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
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold">{error}</p>
                </div>
              )}

              {step === 1 && (
                <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">RUC (13 Dígitos)</label>
                    <input type="text" name="ruc" value={formData.ruc} onChange={handleChange} maxLength={13} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Razón Social Legal</label>
                    <input type="text" name="razonSocial" value={formData.razonSocial} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nombre Comercial</label>
                    <input type="text" name="nombreComercial" value={formData.nombreComercial} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Siglas</label>
                    <input type="text" name="siglas" value={formData.siglas} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código SEPS</label>
                    <input type="text" name="codigoSeps" value={formData.codigoSeps} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Representante Legal</label>
                    <input type="text" name="representanteLegal" value={formData.representanteLegal} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cédula Representante</label>
                    <input type="text" name="cedulaRepresentante" value={formData.cedulaRepresentante} onChange={handleChange} maxLength={10} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Teléfono / Celular</label>
                    <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Correo Institucional (Recepción de credenciales)</label>
                    <input type="email" name="correoInstitucional" value={formData.correoInstitucional} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Dirección Matriz</label>
                    <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4">
                  <div className="col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs text-amber-800 font-medium">Al completar este paso, el sistema creará automáticamente la cuenta del Administrador Principal y le enviará sus credenciales por correo electrónico.</p>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Usuario Administrador</label>
                    <input type="text" name="adminUser" value={formData.adminUser} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contraseña Temporal</label>
                    <input type="text" name="adminPassword" value={formData.adminPassword} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>

                  <div className="col-span-2 border-t border-slate-100 my-2"></div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cuota Aportación Mensual</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input type="number" name="cuotaAportacion" value={formData.cuotaAportacion} onChange={handleChange} className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Saldo Mínimo Apertura</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input type="number" name="saldoMinimo" value={formData.saldoMinimo} onChange={handleChange} className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Límite Usuarios Admin</label>
                    <input type="number" name="limiteUsuariosAdmin" value={formData.limiteUsuariosAdmin} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Límite Socios</label>
                    <input type="number" name="limiteSocios" value={formData.limiteSocios} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" />
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
              disabled={loading}
              className="flex items-center gap-2 bg-[#0054A6] hover:bg-[#004080] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#0054A6]/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 3 ? 'Finalizar Onboarding' : 'Siguiente Paso'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
