import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { KeyRound, ShieldAlert, ArrowRight, Loader2, CheckCircle2, User, Key } from 'lucide-react';

export const EstablecerPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenParam = searchParams.get('token') || '';
  const identificacionParam = searchParams.get('identificacion') || '';

  const [identificacion, setIdentificacion] = useState<string>(identificacionParam);
  const [token, setToken] = useState<string>(tokenParam);
  const [passwordNueva, setPasswordNueva] = useState<string>('');
  const [confirmarPassword, setConfirmarPassword] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    // If params change or are provided, update local states
    if (identificacionParam) setIdentificacion(identificacionParam);
    if (tokenParam) setToken(tokenParam);
  }, [identificacionParam, tokenParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificacion.trim() || !token.trim() || !passwordNueva.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    if (passwordNueva.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (passwordNueva !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/recuperar/validar-cambiar', {
        identificacion: identificacion.trim(),
        token: token.trim(),
        passwordNueva: passwordNueva
      });
      setSuccessMsg('Tu contraseña digital ha sido establecida con éxito. Tu cuenta de Banca Digital ya está activa.');
      setIsSuccess(true);
    } catch (err: any) {
      let msg = 'Error al activar tu cuenta o establecer la contraseña. El token podría estar vencido o ser inválido.';
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
      {/* Tarjeta de Establecimiento de Password - Blanco Puro, Apple Style */}
      <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,84,166,0.06)] transition-all duration-500 hover:shadow-[0_25px_60px_rgba(0,84,166,0.09)] mx-auto">
        
        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-[#0054A6] flex items-center justify-center font-bold text-white shadow-md shadow-[#0054A6]/25 mb-3 transition-transform duration-300 hover:scale-105">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Activar Banca Digital
              </h1>
              <p className="text-xs text-slate-500 mt-1">Establezca su contraseña para enrolarse digitalmente</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Identificación (Bloqueada) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-450 tracking-wider uppercase pl-1">
                  Identificación / Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    required
                    disabled
                    value={identificacion}
                    className="h-11 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl pl-9.5 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Token de Activación (Bloqueado) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-450 tracking-wider uppercase pl-1">
                  Token de Activación
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    required
                    disabled
                    value={token}
                    className="h-11 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl pl-9.5 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Nueva Contraseña */}
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

              {/* Confirmar Contraseña */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500/70 tracking-wider uppercase pl-1">
                  Confirmar Contraseña
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Repita la nueva contraseña"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  className="h-11 bg-slate-50/40 border border-slate-200/60 text-slate-800 rounded-xl focus:border-[#0054A6] focus:bg-white focus:ring-4 focus:ring-[#0054A6]/10 transition-all placeholder:text-slate-400/80"
                />
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50/5 border border-red-500/10 text-red-850 text-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <p className="text-red-700/90">{error}</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={isLoading || !identificacion || !token}
                  className="w-full bg-[#0054A6] hover:bg-[#004080] text-white h-11 rounded-xl flex items-center justify-center gap-2 font-medium shadow-md shadow-[#0054A6]/10 hover:shadow-[#0054A6]/20 active:scale-98 transition-all duration-300 focus:scale-[1.01] cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Activar mi Banca Digital</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800">¡Banca Digital Activa!</h3>
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
