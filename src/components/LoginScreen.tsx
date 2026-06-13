import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Shield, User, Lock, ArrowRight, Loader2, UserPlus, LockOpen } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, error, clearError } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState<number>(1);
  const [isSocio, setIsSocio] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cooperatives = [
    { id: 1, name: 'Cooperativa Financiera San Francisco', code: 'SF1' },
    { id: 2, name: 'Cooperativa Progreso y Bienestar', code: 'PB2' },
    { id: 3, name: 'Cooperativa Integral del Ecuador', code: 'IE3' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!username.trim()) {
      setFormError('Por favor, ingrese su identificación o usuario.');
      return;
    }
    if (!password.trim()) {
      setFormError('Por favor, ingrese su contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password, isSocio, tenantId);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F6F9] p-4 font-sans select-none transition-colors duration-500">
      
      <div className="relative z-10 w-full max-w-[440px] animate-fade-in">
        
        {/* Card Container */}
        <Card className="rounded-xl border border-neutral-200 bg-white shadow-sm transition-all">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-[#0054A6]">
               Iniciar Sesión
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Selector de Cooperativa (Tenant) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Institución Financiera
                </label>
                <div className="relative">
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(Number(e.target.value))}
                    className="w-full h-10 pl-3 pr-8 rounded-lg border border-neutral-200 bg-white text-[#1A1A1A] text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0054A6] focus:border-[#0054A6] appearance-none"
                  >
                    {cooperatives.map((coop) => (
                      <option key={coop.id} value={coop.id} className="text-[#1A1A1A] bg-white">
                        {coop.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Selector de Canal / Rol (Socio vs Administrativo) */}
              <div className="p-1 grid grid-cols-2 gap-1 rounded-lg bg-neutral-50 border border-neutral-200 mt-2">
                <button
                  type="button"
                  onClick={() => setIsSocio(true)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    isSocio
                      ? 'bg-[#0054A6] text-white shadow-sm'
                      : 'bg-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  Socio
                </button>
                <button
                  type="button"
                  onClick={() => setIsSocio(false)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    !isSocio
                      ? 'bg-[#0054A6] text-white shadow-sm'
                      : 'bg-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Funcionario
                </button>
              </div>

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  {isSocio ? 'Cédula / Identificación' : 'Nombre de Usuario'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                    <User className="h-4 w-4" />
                  </span>
                  <Input
                    type="text"
                    placeholder={isSocio ? 'Ej: 1712345678' : 'Ej: admin12'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Errors Display */}
              {(formError || error) && (
                <div className="p-3 text-xs rounded-lg border border-red-200 bg-red-50 text-red-600 animate-shake">
                  {formError || error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0054A6] hover:bg-[#003B75] text-white disabled:bg-neutral-200 disabled:text-neutral-400 font-semibold h-10 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    Ingresar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Auxiliar Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* Crear usuario card-button */}
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-[#0054A6] hover:shadow-md active:scale-[0.98]"
                >
                  <UserPlus className="h-6 w-6 flex-shrink-0 text-neutral-500" strokeWidth={1.6} />
                  <div>
                    <p className="text-[10px] font-normal text-neutral-400 leading-tight">Crear</p>
                    <p className="text-sm font-semibold text-neutral-800 leading-tight">Usuario</p>
                  </div>
                </button>

                {/* Desbloquear usuario card-button */}
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-[#0054A6] hover:shadow-md active:scale-[0.98]"
                >
                  <LockOpen className="h-6 w-6 flex-shrink-0 text-neutral-500" strokeWidth={1.6} />
                  <div>
                    <p className="text-[10px] font-normal text-neutral-400 leading-tight">Desbloquear</p>
                    <p className="text-sm font-semibold text-neutral-800 leading-tight">Usuario</p>
                  </div>
                </button>
              </div>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-center border-t border-neutral-100 pt-4 pb-6">

          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
