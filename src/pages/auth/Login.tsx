import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { Select } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Lock, User, ShieldAlert, ArrowRight, Loader2, UserPlus, Shield } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, error, isLoading, isBlocked, clearError } = useAuth();
  const { activeTenant, changeTenant, cooperativas } = useTenant();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>('socio');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  // Estados para errores de validación local
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeTenant(parseInt(e.target.value, 10));
    clearError();
    setUsernameError(null);
    setPasswordError(null);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setUsername('');
    setPassword('');
    clearError();
    setUsernameError(null);
    setPasswordError(null);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsernameError(null);
    clearError();
    let val = e.target.value;
    if (activeTab === 'socio') {
      // Filtrar en tiempo real: sólo números y máximo 10 caracteres
      val = val.replace(/\D/g, '').slice(0, 10);
    }
    setUsername(val);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordError(null);
    clearError();
    setPassword(e.target.value);
  };

  const getDisplayError = (errMsg: string) => {
    const msg = errMsg.toLowerCase();
    if (
      msg.includes('credenciales') ||
      msg.includes('invalidas') ||
      msg.includes('inválidas') ||
      msg.includes('no encontrado') ||
      msg.includes('incorrecta') ||
      msg.includes('incorrecto') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('bad credentials') ||
      msg.includes('401') ||
      msg.includes('autentica') ||
      msg.includes('denegad') ||
      msg.includes('firma')
    ) {
      return {
        title: "Usuario o contraseña incorrecto",
        detail: "Por favor verifica y vuelve a intentar"
      };
    }
    return {
      title: "Operación Denegada",
      detail: errMsg
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setUsernameError(null);
    setPasswordError(null);

    let hasValidationError = false;

    // Validación del campo de identificación
    if (!username.trim()) {
      setUsernameError(activeTab === 'socio' ? 'La identificación es requerida' : 'El usuario es requerido');
      hasValidationError = true;
    } else if (activeTab === 'socio') {
      const cleanCedula = username.replace(/\D/g, '');
      if (cleanCedula.length !== 10) {
        setUsernameError('La cédula debe tener 10 dígitos numéricos');
        hasValidationError = true;
      }
    }

    // Validación del campo de contraseña
    if (!password.trim()) {
      setPasswordError('La contraseña es requerida');
      hasValidationError = true;
    }

    if (hasValidationError || !activeTenant) return;

    try {
      const isSocio = activeTab === 'socio';
      await login(username, password, isSocio, activeTenant.id);
    } catch (err) {
      console.error('Login request failed:', err);
    }
  };

  return (
    <div className="relative w-full">
      {/* Tarjeta de Login (El Contenedor) - Blanco Puro, Apple Style */}
      <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,84,166,0.06)] transition-all duration-500 hover:shadow-[0_25px_60px_rgba(0,84,166,0.09)]">
        
        {/* Header con Iniciar Sesión estilo Apple */}
        <h2 className="text-[#0054A6] text-2xl font-bold tracking-tight mb-6 text-left">
          Iniciar Sesión
        </h2>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          
          {/* Selector de Cooperativa (Tenant) */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500/70 tracking-wider uppercase pl-0">
              INSTITUCIÓN FINANCIERA
            </label>
            <Select
              value={activeTenant?.id || ''}
              onChange={handleTenantChange}
              className="bg-white text-slate-800 border-slate-200 focus:border-[#0054A6] focus:ring-[#0054A6] rounded-xl h-11"
            >
              {cooperativas.map((coop) => (
                <option key={coop.id} value={coop.id} className="bg-white text-slate-800">
                  {coop.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Alertas de error del Backend (Renderizado de forma elegante entre selector de Tenant e Inputs) */}
          {error && (() => {
            const disp = getDisplayError(error);
            return (
              <div className="flex items-start gap-3 bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm leading-relaxed animate-shake">
                <ShieldAlert className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-xs mb-0.5">{disp.title}</p>
                  <p className="text-red-650 text-xs">{disp.detail}</p>
                </div>
              </div>
            );
          })()}

          {/* Selector de Canal / Rol */}
          {/* Selector de Canal / Rol */}
          <div className="grid grid-cols-2 p-1 bg-[#F1F3F6] border border-slate-100/50 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => handleTabChange('socio')}
              className="relative py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5"
            >
              {activeTab === 'socio' && (
                <motion.div
                  layoutId="activeTabIndicatorLogin"
                  className="absolute inset-0 bg-[#0054A6] rounded-xl shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                activeTab === 'socio' ? 'text-white font-extrabold' : 'text-slate-500'
              }`}>
                <User className="h-4 w-4" />
                <span>Socio</span>
              </span>
            </button>
            
            <button
              type="button"
              onClick={() => handleTabChange('admin')}
              className="relative py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5"
            >
              {activeTab === 'admin' && (
                <motion.div
                  layoutId="activeTabIndicatorLogin"
                  className="absolute inset-0 bg-[#0054A6] rounded-xl shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                activeTab === 'admin' ? 'text-white font-extrabold' : 'text-slate-500'
              }`}>
                <Shield className="h-4 w-4" />
                <span>Funcionario</span>
              </span>
            </button>
          </div>

          {/* Inputs de Credenciales */}
          <div className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500/70 tracking-wider uppercase pl-0">
                  {activeTab === 'socio' ? 'CÉDULA / IDENTIFICACIÓN' : 'USUARIO'}
                </label>
                <div className="relative group">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${usernameError ? 'text-red-500' : 'text-slate-400 group-focus-within:text-[#0054A6]'}`}>
                    <User className="h-5 w-5" />
                  </span>
                  <Input
                    type="text"
                    required
                    placeholder={activeTab === 'socio' ? 'Ej: 1712345678' : 'Ej: cajero_test'}
                    value={username}
                    onChange={handleUsernameChange}
                    disabled={isBlocked}
                    maxLength={activeTab === 'socio' ? 10 : undefined}
                    className={`pl-10 h-12 bg-slate-50/50 border text-slate-800 focus:ring-1 rounded-xl transition-all duration-200 placeholder:text-slate-400/70 shadow-sm ${
                      usernameError 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50/30' 
                        : 'border-slate-200 focus:border-[#0054A6] focus:ring-[#0054A6] hover:bg-white'
                    }`}
                  />
                </div>
                {usernameError && (
                  <p className="text-xs text-red-500 font-medium mt-1 pl-0 leading-none">{usernameError}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500/70 tracking-wider uppercase pl-0">
                  CONTRASEÑA
                </label>
                <div className="relative group">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${passwordError ? 'text-red-500' : 'text-slate-400 group-focus-within:text-[#0054A6]'}`}>
                    <Lock className="h-5 w-5" />
                  </span>
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={isBlocked}
                    className={`pl-10 h-12 bg-slate-50/50 border text-slate-800 focus:ring-1 rounded-xl transition-all duration-200 placeholder:text-slate-400/70 shadow-sm ${
                      passwordError 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50/30' 
                        : 'border-slate-200 focus:border-[#0054A6] focus:ring-[#0054A6] hover:bg-white'
                    }`}
                  />
                </div>
                {passwordError && (
                  <p className="text-xs text-red-500 font-medium mt-1 pl-0 leading-none">{passwordError}</p>
                )}
              </div>
            </div>

          {/* Botón de Enviar o Acción de Recuperación (Manejador de Bloqueo) */}
          <div className="pt-2">
            {isBlocked ? (
              <Button
                type="button"
                variant="destructive"
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2 font-semibold shadow-md shadow-red-600/10 active:scale-95 transition-all duration-200 cursor-pointer"
                onClick={() => navigate('/recuperar-clave')}
              >
                <span>Desbloquear Cuenta con OTP</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-[#0054A6] hover:bg-[#004080] text-white font-medium shadow-md shadow-[#0054A6]/10 hover:shadow-[#0054A6]/20 active:scale-98 transition-all duration-200 focus:scale-[1.01] cursor-pointer flex items-center justify-center gap-2 text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Validando Firma Digital...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </form>

        {/* Separador sutil */}
        <div className="border-t border-slate-100 my-6"></div>

        {/* Tarjetas inferiores: Crear Usuario y Desbloquear Usuario */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className="flex items-center gap-3 border border-slate-100 rounded-2xl p-4 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:bg-slate-50/80 transition-all duration-250 cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#0054A6]/30"
            onClick={() => navigate('/registro')}
          >
            <UserPlus className="h-6 w-6 text-slate-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium leading-none">Crear</span>
              <span className="text-sm font-bold text-slate-700 mt-1 leading-none">Usuario</span>
            </div>
          </button>

          <button
            type="button"
            className="flex items-center gap-3 border border-slate-100 rounded-2xl p-4 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:bg-slate-50/80 transition-all duration-250 cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#0054A6]/30"
            onClick={() => navigate('/recuperar-clave')}
          >
            <Lock className="h-6 w-6 text-slate-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium leading-none">Desbloquear</span>
              <span className="text-sm font-bold text-slate-700 mt-1 leading-none">Usuario</span>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};
