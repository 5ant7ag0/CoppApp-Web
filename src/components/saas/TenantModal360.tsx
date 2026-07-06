import React, { useState, useEffect } from 'react';
import { X, Building2, ShieldAlert, KeyRound, Mail, AlertCircle, Loader2, Edit3, User, CreditCard, Check, Sliders } from 'lucide-react';
import api, { getAssetUrl } from '../../services/api';

export interface TenantModal360Props {
  tenantId: number;
  onClose: () => void;
  onUpdate: () => void;
}

export const TenantModal360: React.FC<TenantModal360Props> = ({ tenantId, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'QUOTAS' | 'SECURITY'>('GENERAL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [data, setData] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Custom Confirmation Modal states
  const [isConfirmingSuspension, setIsConfirmingSuspension] = useState(false);
  const [suspensionInput, setSuspensionInput] = useState('');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isConfirmingReactivation, setIsConfirmingReactivation] = useState(false);

  useEffect(() => {
    fetchTenantDetails();
  }, [tenantId]);

  const fetchTenantDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/superadmin/tenants/${tenantId}`);
      setData(res.data);
    } catch (error) {
      console.error('Error fetching tenant details:', error);
      alert('Error cargando los detalles del tenant.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleLimitsSave = async () => {
    setStatusMessage(null);
    try {
      setSaving(true);
      await api.put(`/superadmin/tenants/${tenantId}/limits`, {
        limiteUsuariosAdmin: data.limiteUsuariosAdmin,
        limiteSocios: data.limiteSocios
      });
      setStatusMessage({ type: 'success', text: 'Cuotas y límites actualizados exitosamente.' });
      setTimeout(() => setStatusMessage(null), 5000);
      setIsEditingLimits(false);
      onUpdate();
    } catch (err: any) {
      console.error(err);
      const errorText = typeof err.response?.data === 'string' 
        ? err.response.data 
        : (err.response?.data?.message || err.message || 'Error al actualizar cuotas');
      setStatusMessage({ type: 'error', text: errorText });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleResetManager = async () => {
    setStatusMessage(null);
    setIsConfirmingReset(false);
    try {
      setSaving(true);
      const res = await api.post(`/superadmin/tenants/${tenantId}/reset-manager`);
      const successText = typeof res.data === 'string' ? res.data : (res.data?.message || 'Enlace de acceso enviado correctamente.');
      setStatusMessage({ type: 'success', text: successText });
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error(err);
      const errorText = typeof err.response?.data === 'string' 
        ? err.response.data 
        : (err.response?.data?.message || err.message || 'Error al resetear contraseña');
      setStatusMessage({ type: 'error', text: errorText });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSuspensionConfirm = async () => {
    if (suspensionInput !== data.razonSocial) return;
    setStatusMessage(null);
    try {
      setSaving(true);
      const res = await api.post(`/superadmin/tenants/${tenantId}/suspend`);
      const successText = typeof res.data === 'string' ? res.data : (res.data?.message || 'Cooperativa suspendida exitosamente.');
      setStatusMessage({ type: 'success', text: successText });
      setIsConfirmingSuspension(false);
      setSuspensionInput('');
      setTimeout(() => setStatusMessage(null), 5000);
      fetchTenantDetails();
      onUpdate();
    } catch (err: any) {
      console.error(err);
      const errorText = typeof err.response?.data === 'string' 
        ? err.response.data 
        : (err.response?.data?.message || err.message || 'Error al suspender operaciones.');
      setStatusMessage({ type: 'error', text: errorText });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleReactivateConfirm = async () => {
    setStatusMessage(null);
    setIsConfirmingReactivation(false);
    try {
      setSaving(true);
      const res = await api.post(`/superadmin/tenants/${tenantId}/reactivate`);
      const successText = typeof res.data === 'string' ? res.data : (res.data?.message || 'Cooperativa reactivada exitosamente.');
      setStatusMessage({ type: 'success', text: successText });
      setTimeout(() => setStatusMessage(null), 5000);
      fetchTenantDetails();
      onUpdate();
    } catch (err: any) {
      console.error(err);
      const errorText = typeof err.response?.data === 'string' 
        ? err.response.data 
        : (err.response?.data?.message || err.message || 'Error al reactivar operaciones.');
      setStatusMessage({ type: 'error', text: errorText });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const calculatePercentage = (current: number, limit: number) => {
    if (!limit || limit === 0) return 0;
    const percentage = (current / limit) * 100;
    return Math.min(percentage, 100);
  };

  const getFullLogoUrl = (logoPath: string | null) => {
    return getAssetUrl(logoPath);
  };

  const switchTab = (tab: 'GENERAL' | 'QUOTAS' | 'SECURITY') => {
    setActiveTab(tab);
    setStatusMessage(null);
    setIsEditingLimits(false);
    setIsConfirmingSuspension(false);
    setIsConfirmingReset(false);
    setIsConfirmingReactivation(false);
    setSuspensionInput('');
  };

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Fixed height modal (680px) to prevent jumping, with full unified bg-[#f8fafc] */}
      <div className="bg-[#f8fafc] rounded-[32px] shadow-2xl w-full max-w-5xl h-[680px] overflow-hidden border border-slate-100 flex flex-col">
        
        {/* Header (Transparent bg and no divider lines) */}
        <div className="px-6 pt-6 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Logo/Avatar without background/border */}
            <div className="w-24 h-24 flex items-center justify-center shrink-0">
              {data.logoUrl ? (
                <img src={getFullLogoUrl(data.logoUrl) || ''} alt="Logo de la Cooperativa" className="w-full h-full object-contain" />
              ) : (
                <span className="text-3xl font-bold text-[#0054A6] tracking-tight">
                  {data.siglas || data.razonSocial?.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{data.razonSocial}</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 tracking-wide">
                RUC: {data.ruc} | SEPS: {data.codigoSeps || 'S/N'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="p-2.5 text-red-500 hover:text-red-400 hover:bg-red-50/60 rounded-full transition-all ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs Capsule (Transparent bg and no divider lines) */}
        <div className="px-6 py-2 flex justify-start">
          <div className="relative inline-flex bg-[#e2e8f0]/60 p-1 rounded-full w-[580px]">
            {/* Sliding blue indicator */}
            <div 
              className="absolute top-1 bottom-1 left-1 bg-[#0054A6] rounded-full transition-transform duration-300 ease-in-out shadow-sm"
              style={{
                width: 'calc(33.333% - 6px)',
                transform: `translateX(${
                  activeTab === 'GENERAL' 
                    ? '0%' 
                    : activeTab === 'QUOTAS' 
                    ? 'calc(100% + 6px)' 
                    : 'calc(200% + 12px)'
                })`
              }}
            />
            
            <button
              onClick={() => switchTab('GENERAL')}
              className={`relative z-10 flex-1 py-2 px-5 rounded-full flex items-center justify-center gap-2 text-xs font-bold transition-all duration-300 ${
                activeTab === 'GENERAL' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Información General
            </button>
            <button
              onClick={() => switchTab('QUOTAS')}
              className={`relative z-10 flex-1 py-2 px-5 rounded-full flex items-center justify-center gap-2 text-xs font-bold transition-all duration-300 ${
                activeTab === 'QUOTAS' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Cuotas y Consumo
            </button>
            <button
              onClick={() => switchTab('SECURITY')}
              className={`relative z-10 flex-1 py-2 px-5 rounded-full flex items-center justify-center gap-2 text-xs font-bold transition-all duration-300 ${
                activeTab === 'SECURITY' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Seguridad y Soporte
            </button>
          </div>
        </div>

        {/* Content Area (Inheriting background) */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'GENERAL' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Datos de Identidad */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm shadow-slate-100/50 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 pb-2.5">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Datos de Identidad</span>
                  </div>
                  
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Identificación (RUC)</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5">{data.ruc || 'No especificada'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Razón Social</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5">{data.razonSocial || 'No especificada'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nombre Comercial</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5">{data.nombreComercial || 'No especificado'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Código SEPS</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5">{data.codigoSeps || 'No especificado'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Segmento SEPS</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5">{data.segmentoSeps || 'No especificado'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Estado de la Cooperativa</span>
                      <span className={`inline-flex px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider mt-1.5 ${
                        data.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                        data.estado === 'SUSPENDIDO' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {data.estado}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Datos de Contacto */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm shadow-slate-100/50 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 pb-2.5">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>Datos de Contacto</span>
                  </div>
                  
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Teléfono Celular</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5">{data.telefono || 'No especificado'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Correo Electrónico</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5 text-ellipsis overflow-hidden whitespace-nowrap">{data.correoInstitucional || 'No especificado'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dirección Domiciliaria</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5 leading-relaxed">{data.direccion || 'No especificada'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Representante / Gerente */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm shadow-slate-100/50 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 pb-2.5">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Gerente General</span>
                  </div>
                  
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nombres Completos</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5">{data.representanteLegal || 'No especificado'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Cédula del Representante</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5">{data.cedulaRepresentante || 'No especificada'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Correo del Gerente</span>
                      <span className="text-sm font-bold text-slate-800 block mt-0.5 text-ellipsis overflow-hidden whitespace-nowrap">{data.correoGerente || 'No registrado'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'QUOTAS' && (
            <div className="max-w-xl mx-auto w-full space-y-4">
              {/* Consumo de Licencias Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm shadow-slate-100/50 space-y-6">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  <Sliders className="w-4 h-4 text-slate-400" />
                  <span>Consumo y Cuotas de Licencia</span>
                </div>

                {/* Admin Usage */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-600">Usuarios Administrativos</p>
                    <p className="text-sm font-black text-slate-800">
                      {data.totalUsuarios} <span className="text-slate-400 text-xs font-medium">/ {data.limiteUsuariosAdmin}</span>
                    </p>
                  </div>
                  
                  {isEditingLimits ? (
                    <div className="flex items-center gap-4 animate-in fade-in duration-150">
                      <input 
                        type="range" 
                        min={data.totalUsuarios} 
                        max={Math.max(100, data.limiteUsuariosAdmin * 2)} 
                        value={data.limiteUsuariosAdmin || 0}
                        onChange={(e) => setData({...data, limiteUsuariosAdmin: parseInt(e.target.value) || 0})}
                        className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0054A6]"
                      />
                      <input 
                        type="number" 
                        min={data.totalUsuarios}
                        value={data.limiteUsuariosAdmin || 0}
                        onChange={(e) => setData({...data, limiteUsuariosAdmin: parseInt(e.target.value) || 0})}
                        className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6]"
                      />
                    </div>
                  ) : (
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${calculatePercentage(data.totalUsuarios, data.limiteUsuariosAdmin) >= 90 ? 'bg-rose-500' : 'bg-[#0054A6]'}`} 
                        style={{ width: `${calculatePercentage(data.totalUsuarios, data.limiteUsuariosAdmin)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Socio Usage */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-600">Socios Registrados</p>
                    <p className="text-sm font-black text-slate-800">
                      {data.totalSocios} <span className="text-slate-400 text-xs font-medium">/ {data.limiteSocios}</span>
                    </p>
                  </div>

                  {isEditingLimits ? (
                    <div className="flex items-center gap-4 animate-in fade-in duration-150">
                      <input 
                        type="range" 
                        min={data.totalSocios} 
                        max={Math.max(5000, data.limiteSocios * 2)} 
                        value={data.limiteSocios || 0}
                        onChange={(e) => setData({...data, limiteSocios: parseInt(e.target.value) || 0})}
                        className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0054A6]"
                      />
                      <input 
                        type="number" 
                        min={data.totalSocios}
                        value={data.limiteSocios || 0}
                        onChange={(e) => setData({...data, limiteSocios: parseInt(e.target.value) || 0})}
                        className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6]"
                      />
                    </div>
                  ) : (
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${calculatePercentage(data.totalSocios, data.limiteSocios) >= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${calculatePercentage(data.totalSocios, data.limiteSocios)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Sutil Inline Status Alert */}
                {statusMessage && (
                  <div className={`p-3.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200 ${
                    statusMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    {statusMessage.type === 'success' ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{statusMessage.text}</span>
                  </div>
                )}

                {/* Edit limits controls */}
                <div className="border-t border-slate-50 pt-4 flex justify-end">
                  {isEditingLimits ? (
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => { setIsEditingLimits(false); setStatusMessage(null); fetchTenantDetails(); }}
                        className="border border-slate-200 hover:bg-slate-50 text-slate-500 px-5 py-2.5 rounded-full text-xs font-bold transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button" 
                        onClick={handleLimitsSave}
                        disabled={saving}
                        className="bg-[#0054A6] hover:bg-[#004285] text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-md shadow-blue-100 flex items-center gap-1.5"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => { setIsEditingLimits(true); setStatusMessage(null); }}
                      className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm"
                    >
                      <Edit3 className="w-4 h-4 text-slate-500" />
                      Editar Cuotas
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div className="space-y-6">
              {/* Sutil Inline Status Alert for Security actions */}
              {statusMessage && (
                <div className={`p-3.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200 ${
                  statusMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                  {statusMessage.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Ingresar como Soporte */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm shadow-slate-100/50 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 pb-2.5">
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      <span>Soporte e Impersonación</span>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-800">Ingresar como Soporte</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Suplantar sesión temporalmente para diagnosticar problemas directamente desde la cuenta de este tenant.</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 mt-6">
                    <button className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-full transition-all shadow-sm">
                      Impersonate Tenant
                    </button>
                    <p className="text-[10px] text-slate-400 text-center leading-relaxed px-2">
                      El acceso mediante soporte técnico es estrictamente monitoreado. Las acciones realizadas quedarán registradas en la bitácora de auditoría del sistema.
                    </p>
                  </div>
                </div>

                {/* Reseteo Asistido */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm shadow-slate-100/50 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 pb-2.5">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>Reseteo del Canal</span>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-800">Reseteo Asistido (Gerente)</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Enviar un enlace temporal seguro por correo electrónico para que el Gerente General restablezca sus accesos.</p>
                      
                      {/* Obfuscated target email display */}
                      <div className="mt-2.5 pt-2.5 border-t border-slate-50 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Destinatario:</span>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 select-all">
                          {data.correoGerente || 'No registrado'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setIsConfirmingReset(true); setStatusMessage(null); }} 
                    className="mt-6 w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-full transition-all border border-amber-100"
                  >
                    Enviar Enlace de Acceso
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white border border-rose-100 rounded-3xl overflow-hidden shadow-sm shadow-rose-50/50 mt-6">
                <div className="bg-rose-50/40 px-6 py-4 border-b border-rose-100 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <h4 className="font-bold text-rose-800 text-sm">
                    {data.estado === 'ACTIVO' ? 'Zona de Peligro (Kill Switch)' : 'Reactivación de Cooperativa'}
                  </h4>
                </div>
                <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                    {data.estado === 'ACTIVO' 
                      ? 'Suspender una cooperativa bloqueará inmediatamente el acceso a la API del SaaS, inhabilitará las conexiones a base de datos y revocará todas las sesiones activas en caliente.' 
                      : 'Reactivar esta cooperativa restaurará de inmediato su acceso completo a la API del SaaS, habilitará sus bases de datos y le permitirá operar con normalidad.'}
                  </p>
                  {data.estado === 'ACTIVO' ? (
                    <button 
                      onClick={() => { setIsConfirmingSuspension(true); setSuspensionInput(''); setStatusMessage(null); }}
                      className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-full text-xs font-bold transition-all shadow-md shadow-rose-200 flex items-center gap-2"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      Suspender Operaciones
                    </button>
                  ) : (
                    <button 
                      onClick={() => { setIsConfirmingReactivation(true); setStatusMessage(null); }}
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-xs font-bold transition-all shadow-md shadow-emerald-200 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Reactivar Operaciones
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Strict Confirmation Modal (AlertDialog) for Suspension */}
      {isConfirmingSuspension && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] border border-rose-100 shadow-2xl p-6 w-full max-w-md space-y-4 animate-in scale-in duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black uppercase tracking-wider">Confirmación Estricta</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Esta acción es de alto riesgo para el Core Bancario. Para suspender las operaciones de la cooperativa, escriba exactamente: 
              <strong className="block text-slate-800 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg mt-1 select-all font-mono text-center">
                {data.razonSocial}
              </strong>
            </p>

            <input
              type="text"
              placeholder="Nombre de la cooperativa"
              value={suspensionInput}
              onChange={(e) => setSuspensionInput(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setIsConfirmingSuspension(false); setSuspensionInput(''); }}
                className="border border-slate-200 hover:bg-slate-50 text-slate-500 px-4 py-2.5 rounded-full text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSuspensionConfirm}
                disabled={saving || suspensionInput !== data.razonSocial}
                className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md shadow-rose-200 flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                Suspender
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Reset Link */}
      {isConfirmingReset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4 animate-in scale-in duration-200">
            <div className="flex items-center gap-3 text-amber-500">
              <Mail className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black uppercase tracking-wider">Confirmar Acción</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              ¿Confirmas que deseas enviar un enlace temporal de restablecimiento seguro de accesos al Gerente General?
              <span className="block mt-2 font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg text-center select-all">
                Destinatario: {data.correoGerente || 'No registrado'}
              </span>
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingReset(false)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-500 px-4 py-2.5 rounded-full text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetManager}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md shadow-amber-100 flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Confirmar Envío
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Reactivation */}
      {isConfirmingReactivation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4 animate-in scale-in duration-200">
            <div className="flex items-center gap-3 text-emerald-600">
              <Check className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black uppercase tracking-wider">Confirmar Reactivación</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              ¿Confirmas que deseas reactivar las operaciones de la cooperativa <strong>{data.razonSocial}</strong>? Esto restaurará de inmediato su acceso completo a los canales digitales y la API del SaaS.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingReactivation(false)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-500 px-4 py-2.5 rounded-full text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReactivateConfirm}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md shadow-emerald-100 flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Reactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
