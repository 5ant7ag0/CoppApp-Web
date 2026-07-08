import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Lock, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

export const ForzarCambioPassword: React.FC = () => {
  const { refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordNueva.trim()) {
      setError('La nueva contraseña es requerida.');
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

    setLoading(true);
    try {
      await api.post('/usuarios/cambiar-password-inicio', { passwordNueva });
      setSuccess(true);
      
      // Esperar un segundo, refrescar sesión y navegar al dashboard
      setTimeout(async () => {
        try {
          await refreshUser();
          navigate('/admin/dashboard', { replace: true });
        } catch (err) {
          console.error(err);
          navigate('/login', { replace: true });
        }
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data || 'Error al actualizar la contraseña. Inténtelo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden select-none">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-350/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-[#0054A6]/5 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,84,166,0.06)]">
          <div className="text-center space-y-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-slate-800 text-xl font-extrabold tracking-tight">Cambio de Clave Obligatorio</h2>
            <p className="text-slate-400 text-xs px-4">
              Por razones de seguridad, debes actualizar tu contraseña temporal antes de poder acceder al sistema.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 text-red-600 border border-red-150 rounded-xl p-3 text-xs leading-relaxed mb-5 animate-shake">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-xl p-3.5 text-xs font-semibold leading-relaxed mb-5">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>¡Contraseña actualizada! Redirigiendo al sistema...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase pl-0">
                NUEVA CONTRASEÑA
              </label>
              <div className="relative group">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0054A6] transition-colors">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type={showNewPassword ? "text" : "password"}
                  required
                  disabled={loading || success}
                  placeholder="Mínimo 6 caracteres"
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  className="pl-7 pr-7 h-10 bg-transparent border-t-0 border-x-0 border-b border-slate-200 focus:border-b-2 focus:border-[#0054A6] text-slate-800 focus:ring-0 rounded-none text-xs placeholder:text-slate-400/70"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors p-1"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase pl-0">
                CONFIRMAR CONTRASEÑA
              </label>
              <div className="relative group">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0054A6] transition-colors">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  disabled={loading || success}
                  placeholder="Repite tu contraseña"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  className="pl-7 pr-7 h-10 bg-transparent border-t-0 border-x-0 border-b border-slate-200 focus:border-b-2 focus:border-[#0054A6] text-slate-800 focus:ring-0 rounded-none text-xs placeholder:text-slate-400/70"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button
                type="submit"
                disabled={loading || success}
                className="w-full h-11 rounded-xl bg-[#0054A6] hover:bg-[#004080] text-white text-xs font-bold shadow-md shadow-blue-500/10 active:scale-98 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando Nueva Contraseña...</span>
                  </>
                ) : (
                  <span>Actualizar Contraseña y Continuar</span>
                )}
              </Button>

              <button
                type="button"
                onClick={logout}
                disabled={loading || success}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-650 transition-colors font-semibold cursor-pointer"
              >
                Cancelar y Salir
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
