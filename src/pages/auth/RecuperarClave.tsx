import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Select } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { KeyRound, ShieldAlert, ArrowRight, Loader2, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';

export const RecuperarClave: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [identificacion, setIdentificacion] = useState<string>('');
  const [canal, setCanal] = useState<string>('CORREO');
  
  const [token, setToken] = useState<string>('');
  const [passwordNueva, setPasswordNueva] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificacion.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/recuperar/solicitar', { identificacion, canal });
      setStep(2);
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !passwordNueva.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/recuperar/validar-cambiar', {
        identificacion,
        token,
        passwordNueva
      });
      setSuccessMsg('Contraseña restablecida con éxito. Ya puede iniciar sesión.');
      setStep(3);
    } catch (err: any) {
      let msg = 'Error al validar el código o restablecer la contraseña.';
      if (err.response && err.response.data) {
        msg = typeof err.response.data === 'string' ? err.response.data : (err.response.data.message || msg);
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Tarjeta de Recuperación - Blanco Puro, Apple Style */}
      <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,84,166,0.06)] transition-all duration-500 hover:shadow-[0_25px_60px_rgba(0,84,166,0.09)]">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-[#0054A6] flex items-center justify-center font-bold text-white shadow-md shadow-[#0054A6]/25 mb-3 transition-transform duration-300 hover:scale-105">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Recuperar Contraseña
          </h1>
          <p className="text-xs text-slate-500 mt-1">Desbloqueo autónomo de cuenta digital</p>
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

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500/70 tracking-wider uppercase pl-1">
                Canal de Entrega
              </label>
              <Select
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                className="bg-slate-50/40 text-slate-800 border-slate-200/60 focus:border-[#0054A6] focus:bg-white focus:ring-4 focus:ring-[#0054A6]/10 rounded-xl h-11"
              >
                <option value="CORREO" className="bg-white text-slate-800">Correo Electrónico</option>
                <option value="SMS" className="bg-white text-slate-800">Mensaje de Texto (SMS)</option>
              </Select>
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
                disabled={isLoading}
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

        {/* Step 2: Validate OTP & Change Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="p-4 rounded-2xl bg-[#0054A6]/5 border border-[#0054A6]/15 text-[#0054A6] text-xs leading-relaxed flex items-start gap-3">
              <Mail className="h-4 w-4 shrink-0 text-[#0054A6] mt-0.5" />
              <p className="text-slate-650">Hemos enviado un código/enlace de validación al canal seleccionado. Por favor, ingréselo a continuación junto con su nueva clave digital.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500/70 tracking-wider uppercase pl-1">
                Token / Código OTP
              </label>
              <Input
                type="text"
                required
                placeholder={canal === 'SMS' ? 'Código de 6 dígitos' : 'UUID o enlace'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="h-11 bg-slate-50/40 border border-slate-200/60 text-slate-800 rounded-xl focus:border-[#0054A6] focus:bg-white focus:ring-4 focus:ring-[#0054A6]/10 transition-all placeholder:text-slate-400/80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500/70 tracking-wider uppercase pl-1">
                Nueva Contraseña Digital
              </label>
              <Input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
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
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 transition-all cursor-pointer rounded-lg px-3 py-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Atrás</span>
              </Button>

              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#0054A6] hover:bg-[#004080] text-white h-11 px-6 rounded-xl flex items-center justify-center gap-2 font-medium shadow-md shadow-[#0054A6]/10 hover:shadow-[#0054A6]/20 active:scale-98 transition-all duration-300 focus:scale-[1.01] cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Restablecer y Desbloquear</span>
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
              <h3 className="text-lg font-bold text-slate-800">¡Operación Completada!</h3>
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
    </div>
  );
};
