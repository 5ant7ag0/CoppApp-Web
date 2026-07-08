import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Lock, KeyRound, ArrowRight, Loader2, CheckCircle2, X, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export const RecuperarClaveSocio = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1); // 1: Identificación, 2: Nueva Contraseña, 3: Éxito
  const [showOtpModal, setShowOtpModal] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpError, setOtpError] = useState('');

  // Form State
  const [identificacion, setIdentificacion] = useState('');
  const [correoEnmascarado, setCorreoEnmascarado] = useState('');
  const [otp, setOtp] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    const idFromUrl = searchParams.get('id') || searchParams.get('identificacion');
    const tenantIdFromUrl = searchParams.get('tenantId') || searchParams.get('empresaId');
    if (tenantIdFromUrl) {
      localStorage.setItem('coop_tenant_id', tenantIdFromUrl);
    }
    if (tokenFromUrl && idFromUrl) {
      setOtp(tokenFromUrl);
      setIdentificacion(idFromUrl);
      setStep(2); // Jump directly to password reset
    }
  }, [searchParams]);

  const handleIdentificacionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/recuperar/solicitar', {
        identificacion,
        canal: 'CORREO'
      });
      setCorreoEnmascarado(data.correoEnmascarado);
      setOtp('');
      setShowOtpModal(true);
    } catch (err: any) {
      setError(err.response?.data || 'Error al validar la identificación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setOtpError('El código OTP debe tener 6 dígitos.');
      return;
    }
    setOtpError('');
    setIsOtpLoading(true);
    try {
      // Endpoint para solo validar sin quemar el token
      await api.post('/auth/recuperar/validar-token', {
        identificacion,
        token: otp
      });
      setShowOtpModal(false);
      setStep(2); // Avanzar a nueva contraseña
    } catch (err: any) {
      setOtpError(err.response?.data || 'Código OTP incorrecto o expirado.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordNueva !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await api.post('/auth/recuperar/validar-cambiar', {
        identificacion,
        token: otp,
        passwordNueva
      });
      setStep(3); // Éxito
    } catch (err: any) {
      setError(err.response?.data || 'Error al restablecer la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            key="step1"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-[#0054A6] mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Recuperar Contraseña</h2>
              <p className="text-sm text-slate-500 mt-2">
                Ingresa tu número de identificación para comenzar el proceso seguro.
              </p>
            </div>

            <form onSubmit={handleIdentificacionSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-center">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Identificación (Cédula/RUC)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <Input
                    type="text"
                    required
                    value={identificacion}
                    onChange={(e) => setIdentificacion(e.target.value)}
                    placeholder="17xxxxxxxx"
                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !identificacion}
                className="w-full h-12 bg-[#0054A6] hover:bg-[#004385] text-white rounded-xl font-bold cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Solicitar Código'}
              </Button>
            </form>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            key="step2"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Nueva Contraseña</h2>
              <p className="text-sm text-slate-500 mt-2">
                El código ha sido validado. Ingresa y confirma tu nueva contraseña segura.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={passwordNueva}
                    onChange={(e) => setPasswordNueva(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pr-10 bg-slate-50 border-slate-200 focus:bg-white rounded-xl font-mono text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors p-1"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pr-10 bg-slate-50 border-slate-200 focus:bg-white rounded-xl font-mono text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors p-1"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !passwordNueva || !confirmPassword || passwordNueva !== confirmPassword}
                className="w-full h-12 bg-[#0054A6] hover:bg-[#004385] text-white rounded-xl font-bold mt-2 cursor-pointer disabled:bg-slate-300"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Restablecer Contraseña'}
              </Button>
            </form>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
            key="step3"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Contraseña Restablecida!</h2>
            <p className="text-slate-500 mb-8">
              Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión en tu cuenta.
            </p>
            <Button
              onClick={() => navigate('/login-socio')}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
            >
              Ir a Iniciar Sesión <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-8 shadow-sm border border-slate-100 rounded-3xl z-10 relative">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>
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
              className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden relative z-10 p-8"
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
                  Ingresa el código de 6 dígitos que enviamos a tu correo:
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
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="000000"
                    className="h-14 text-center text-3xl font-black tracking-[0.5em] bg-slate-50 border-slate-200 focus:bg-white rounded-2xl"
                    autoFocus
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isOtpLoading || otp.length !== 6}
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

