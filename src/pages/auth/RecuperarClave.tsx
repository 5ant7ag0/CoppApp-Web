import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { KeyRound, ShieldAlert, ArrowRight, Loader2, Mail, CheckCircle2, ArrowLeft, X, Eye, EyeOff } from 'lucide-react';

export const RecuperarClave: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<number>(1);
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [identificacion, setIdentificacion] = useState<string>('');
  const [canal] = useState<string>('CORREO');
  const [correoEnmascarado, setCorreoEnmascarado] = useState<string>('');
  
  const [token, setToken] = useState<string>('');
  const [passwordNueva, setPasswordNueva] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isActivar, setIsActivar] = useState<boolean>(false);
  const [coopName, setCoopName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOtpLoading, setIsOtpLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    const idFromUrl = searchParams.get('identificacion') || searchParams.get('id');
    const tenantIdFromUrl = searchParams.get('tenantId') || searchParams.get('empresaId');
    const activarFromUrl = searchParams.get('activar') === 'true';

    if (tenantIdFromUrl) {
      localStorage.setItem('coop_tenant_id', tenantIdFromUrl);
      api.get('/auth/tenants')
        .then(res => {
          const list = res.data;
          if (Array.isArray(list)) {
            const matched = list.find((item: any) => String(item.id) === String(tenantIdFromUrl));
            if (matched && matched.name) {
              setCoopName(matched.name);
            }
          }
        })
        .catch(err => {
          console.error("Error al cargar cooperativas públicas:", err);
        });
    }

    if (activarFromUrl) {
      setIsActivar(true);
    }

    if (tokenFromUrl && idFromUrl) {
      setToken(tokenFromUrl);
      setIdentificacion(idFromUrl);
      setStep(2);
    }
  }, [searchParams]);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificacion.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.post('/auth/recuperar/solicitar', { identificacion, canal });
      setCorreoEnmascarado(data.correoEnmascarado || '');
      setToken('');
      setShowOtpModal(true);
    } catch (err: any) {
      let msg = 'Error al solicitar el código de recuperación.';
      if (err.response && err.response.data) {
        msg = typeof err.response.data === 'string' ? err.response.data : (err.response.data.message || msg);
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length !== 6) {
      setOtpError('El código OTP debe tener 6 dígitos.');
      return;
    }
    setOtpError(null);
    setIsOtpLoading(true);
    try {
      await api.post('/auth/recuperar/validar-token', {
        identificacion,
        token
      });
      setShowOtpModal(false);
      setStep(2);
    } catch (err: any) {
      let msg = 'Código OTP incorrecto o expirado.';
      if (err.response && err.response.data) {
        msg = typeof err.response.data === 'string' ? err.response.data : (err.response.data.message || msg);
      }
      setOtpError(msg);
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !passwordNueva.trim() || passwordNueva !== confirmPassword) {
      setError('Verifique que las contraseñas coincidan.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/recuperar/validar-cambiar', {
        identificacion,
        token,
        passwordNueva
      });
      setSuccessMsg(isActivar 
        ? 'Cuenta activada con éxito. Su usuario administrativo ya está listo para operar.' 
        : 'Contraseña restablecida con éxito. Ya puede iniciar sesión.');
      setStep(3);
    } catch (err: any) {
      let msg = 'Error al restablecer la contraseña.';
      if (err.response && err.response.data) {
        msg = typeof err.response.data === 'string' ? err.response.data : (err.response.data.message || msg);
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full flex justify-center">
      {/* Tarjeta de Recuperación - Blanco Puro, Apple Style */}
      <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,84,166,0.06)] transition-all duration-500 hover:shadow-[0_25px_60px_rgba(0,84,166,0.09)] z-10 relative">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-[#0054A6] flex items-center justify-center font-bold text-white shadow-md shadow-[#0054A6]/25 mb-3 transition-transform duration-300 hover:scale-105">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight text-center px-4">
            {isActivar 
              ? `Activar ${coopName || 'Banca Digital'}` 
              : 'Recuperar Contraseña'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 text-center">
            {isActivar 
              ? 'Establezca su contraseña para enrolarse digitalmente' 
              : 'Desbloqueo autónomo de cuenta digital'}
          </p>
        </div>

        {/* Step 1: Request Recovery */}
        {step === 1 && (
          <form onSubmit={handleRequestToken} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500/70 tracking-wider uppercase pl-1">
                Cédula / Identificación
              </label>
              <Input
                type="text"
                required
                placeholder="Ej: 1710034065"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                className="h-11 bg-slate-50/40 border border-slate-200/60 text-slate-800 rounded-xl focus:border-[#0054A6] focus:bg-white focus:ring-4 focus:ring-[#0054A6]/10 transition-all placeholder:text-slate-400/80"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50/5 border border-red-500/10 text-red-850 text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <p className="text-red-700/90">{error}</p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 transition-all cursor-pointer rounded-lg px-3 py-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Volver</span>
              </Button>

              <Button
                type="submit"
                disabled={isLoading || !identificacion}
                className="bg-[#0054A6] hover:bg-[#004080] text-white h-11 px-6 rounded-xl flex items-center justify-center gap-2 font-medium shadow-md shadow-[#0054A6]/10 hover:shadow-[#0054A6]/20 active:scale-98 transition-all duration-300 focus:scale-[1.01] cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Solicitar Código</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Change Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="p-4 rounded-2xl bg-[#0054A6]/5 border border-[#0054A6]/15 text-[#0054A6] text-xs leading-relaxed flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0054A6] mt-0.5" />
              <p className="text-slate-650">El código ha sido validado correctamente. Por favor, ingrese su nueva clave digital.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500/70 tracking-wider uppercase pl-1">
                Nueva Contraseña Digital
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  className="h-11 pr-10 bg-slate-50/40 border border-slate-200/60 text-slate-800 rounded-xl focus:border-[#0054A6] focus:bg-white focus:ring-4 focus:ring-[#0054A6]/10 transition-all placeholder:text-slate-400/80 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors p-1"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500/70 tracking-wider uppercase pl-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 pr-10 bg-slate-50/40 border border-slate-200/60 text-slate-800 rounded-xl focus:border-[#0054A6] focus:bg-white focus:ring-4 focus:ring-[#0054A6]/10 transition-all placeholder:text-slate-400/80 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50/5 border border-red-500/10 text-red-850 text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <p className="text-red-700/90">{error}</p>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isLoading || !passwordNueva || passwordNueva !== confirmPassword}
                className="w-full bg-[#0054A6] hover:bg-[#004080] text-white h-11 rounded-xl flex items-center justify-center gap-2 font-medium shadow-md shadow-[#0054A6]/10 hover:shadow-[#0054A6]/20 active:scale-98 transition-all duration-300 focus:scale-[1.01] cursor-pointer disabled:bg-slate-300"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{isActivar ? 'Activar Cuenta' : 'Restablecer Contraseña'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Success Screen */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800">
                {isActivar ? '¡Cuenta Activada!' : '¡Operación Completada!'}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{successMsg}</p>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-11 rounded-xl bg-[#0054A6] hover:bg-[#004080] text-white flex items-center justify-center gap-2 font-medium shadow-md shadow-[#0054A6]/10 hover:shadow-[#0054A6]/20 active:scale-98 transition-all duration-300 focus:scale-[1.01] cursor-pointer"
              >
                <span>Ir al Inicio de Sesión</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Exclusivo de OTP */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowOtpModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden relative z-50 p-8"
            >
              <button
                onClick={() => setShowOtpModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-6 mt-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Código de Verificación</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Ingresa el código de 6 dígitos enviado a:
                  <br />
                  <span className="font-bold text-slate-700 mt-1 block">{correoEnmascarado}</span>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                {otpError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center">
                    {otpError}
                  </div>
                )}
                
                <div>
                  <Input
                    type="text"
                    required
                    maxLength={6}
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="000000"
                    className="h-14 text-center text-3xl font-black tracking-[0.5em] bg-slate-50 border-slate-200 focus:bg-white rounded-2xl"
                    autoFocus
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isOtpLoading || token.length !== 6}
                  className="w-full h-12 bg-[#0054A6] hover:bg-[#004385] text-white rounded-xl font-bold cursor-pointer"
                >
                  {isOtpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Validar Código'}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
