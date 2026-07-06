import React, { useRef, useState, useEffect } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  FileText,
  Trash2,
  Calendar,
  UserCheck,
  Check
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import api, { getAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

export const Perfil: React.FC = () => {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de carga y error locales
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [tempFile, setTempFile] = useState<File | null>(null);

  // Campos del Formulario de Contacto
  const [direccion, setDireccion] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [correo, setCorreo] = useState<string>('');
  const [contactoError, setContactoError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const isDirty = user && user.detalles ? (
    direccion.trim() !== (user.detalles.direccion || '').trim() ||
    telefono.trim() !== (user.detalles.telefono || '').trim() ||
    correo.trim() !== (user.detalles.correo || '').trim()
  ) : false;

  const handleCancelEdit = () => {
    if (user && user.detalles) {
      setDireccion(user.detalles.direccion || '');
      setTelefono(user.detalles.telefono || '');
      setCorreo(user.detalles.correo || '');
    }
    setIsEditing(false);
    setContactoError(null);
  };

  // Campos del Formulario de Cambio de Clave con OTP
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');
  const [correoEnmascarado, setCorreoEnmascarado] = useState<string>('');
  const [passwordNueva, setPasswordNueva] = useState<string>('');
  const [passwordConfirmar, setPasswordConfirmar] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);


  // Estado del Toast Global
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success'
  });

  // Mostrar Notificación Toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({
      show: true,
      message,
      type
    });
    // Auto-ocultar después de 4 segundos
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Cargar datos iniciales del socio
  useEffect(() => {
    if (user && user.detalles) {
      setDireccion(user.detalles.direccion || '');
      setTelefono(user.detalles.telefono || '');
      setCorreo(user.detalles.correo || '');
      
      setAvatarUrl(user.detalles.fotoPerfilUrl);
    }
  }, [user]);

  const getFullAvatarUrl = (url: string | null) => {
    return getAssetUrl(url);
  };

  // Manejar el cambio de foto de perfil (guarda en estado temporal)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      showToast('El archivo seleccionado debe ser una imagen.', 'error');
      return;
    }

    // Validar tamaño máximo (1MB)
    if (file.size > 1024 * 1024) {
      showToast('La imagen es demasiado grande. Elige una de menos de 1 MB.', 'error');
      return;
    }

    setTempFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      if (base64Str) {
        setTempAvatar(base64Str);
      }
    };
    reader.readAsDataURL(file);
  };

  // Confirmar y guardar la foto de perfil
  const handleSaveTempPhoto = async () => {
    if (tempFile && user?.detalles?.id) {
      setUpdateLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', tempFile);

        const res = await api.post(`/socios/${user.detalles.id}/avatar`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const { avatarUrl: newAvatarUrl } = res.data;
        
        await refreshUser(); // Refrescar el contexto global
        
        setAvatarUrl(newAvatarUrl);
        setTempAvatar(null);
        setTempFile(null);
        // Notificar a toda la interfaz del cambio
        window.dispatchEvent(new Event('avatar-changed'));
        showToast('Foto de perfil actualizada correctamente.', 'success');
      } catch (err: any) {
        console.error('Error al subir avatar:', err);
        showToast('Error al actualizar la foto de perfil en el servidor.', 'error');
      } finally {
        setUpdateLoading(false);
      }
    }
  };

  // Cancelar la foto seleccionada temporal
  const handleCancelTempPhoto = () => {
    setTempAvatar(null);
    setTempFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Eliminar la foto de perfil
  const handleRemovePhoto = async () => {
    if (user?.detalles?.id) {
      setUpdateLoading(true);
      try {
        await api.delete(`/socios/${user.detalles.id}/avatar`);
        await refreshUser();
        setAvatarUrl(null);
        setTempAvatar(null);
        setTempFile(null);
        window.dispatchEvent(new Event('avatar-changed'));
        showToast('Foto de perfil eliminada.', 'success');
      } catch (err: any) {
        console.error('Error al eliminar avatar:', err);
        showToast('Error al eliminar la foto de perfil.', 'error');
      } finally {
        setUpdateLoading(false);
      }
    }
  };

  // Enviar Cambios de Contacto al Servidor
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactoError(null);

    if (!user || !user.detalles) {
      setContactoError('Sesión de usuario no válida.');
      return;
    }

    // Validaciones
    if (!direccion.trim()) {
      setContactoError('La dirección de domicilio es obligatoria.');
      return;
    }

    const telRegex = /^09\d{8}$/;
    if (!telRegex.test(telefono)) {
      setContactoError('El número de celular debe empezar con 09 y tener exactamente 10 dígitos.');
      return;
    }

    if (!correo.trim()) {
      setContactoError('El correo electrónico es obligatorio.');
      return;
    }

    setUpdateLoading(true);

    try {
      // Re-armar el SocioRequestDTO con los valores existentes y los editados
      const payload = {
        tipoIdentificacion: user.detalles.tipoIdentificacion,
        identificacion: user.detalles.identificacion,
        nombresCompletos: user.detalles.nombresCompletos,
        direccion: direccion.trim(),
        telefono: telefono.trim(),
        correo: correo.trim(),
        actividadEconomica: user.detalles.actividadEconomica,
        ingresosMensuales: user.detalles.ingresosMensuales,
        gastosMensuales: user.detalles.gastosMensuales,
        deudasActuales: user.detalles.deudasActuales,
        fotoPerfilUrl: user.detalles.fotoPerfilUrl,
        fotoCedulaFrontalUrl: user.detalles.fotoCedulaFrontalUrl,
        fotoCedulaPosteriorUrl: user.detalles.fotoCedulaPosteriorUrl,
        esPep: user.detalles.esPep,
        estado: user.detalles.estado
      };

      await api.put(`/socios/${user.detalles.id}`, payload);
      await refreshUser(); // Refrescar el contexto global
      setIsEditing(false);
      showToast('Información de contacto actualizada correctamente.', 'success');
    } catch (err: any) {
      console.error('Error actualizando socio:', err);
      setContactoError(err.response?.data || 'No se pudo actualizar la información. Inténtalo de nuevo.');
      showToast('Error al actualizar datos de contacto.', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Solicitar OTP para Cambio de Clave
  const handleSolicitarOtp = async () => {
    if (!user?.detalles?.identificacion) return;
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const { data } = await api.post('/auth/recuperar/solicitar', {
        identificacion: user.detalles.identificacion,
        canal: 'CORREO'
      });
      setCorreoEnmascarado(data.correoEnmascarado || '');
      setOtp('');
      setPasswordNueva('');
      setPasswordConfirmar('');
      setIsPasswordFormOpen(true);
      showToast('Se ha enviado un código de seguridad a tu correo electrónico.', 'success');
    } catch (err: any) {
      console.error('Error al solicitar OTP:', err);
      const errMsg = err.response?.data || 'No se pudo enviar el código de seguridad. Inténtalo más tarde.';
      setPasswordError(typeof errMsg === 'string' ? errMsg : (errMsg.message || 'Error al enviar código.'));
      showToast('Error al enviar el código al correo.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Enviar Cambio de Clave al Servidor con OTP
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!user?.detalles?.identificacion) {
      setPasswordError('Error de sesión: No se pudo identificar al socio.');
      return;
    }

    if (!otp.trim() || !passwordNueva.trim() || !passwordConfirmar.trim()) {
      setPasswordError('Todos los campos son obligatorios.');
      return;
    }

    if (otp.trim().length !== 6) {
      setPasswordError('El código OTP debe tener exactamente 6 dígitos.');
      return;
    }

    if (passwordNueva.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (passwordNueva !== passwordConfirmar) {
      setPasswordError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setPasswordLoading(true);

    try {
      await api.post('/auth/recuperar/validar-cambiar', {
        identificacion: user.detalles.identificacion,
        token: otp.trim(),
        passwordNueva: passwordNueva.trim()
      });

      // Limpiar campos
      setOtp('');
      setPasswordNueva('');
      setPasswordConfirmar('');
      setIsPasswordFormOpen(false);
      showToast('Contraseña digital actualizada correctamente.', 'success');
    } catch (err: any) {
      console.error('Error al cambiar clave con OTP:', err);
      const errMsg = err.response?.data || 'Código OTP incorrecto o expirado.';
      setPasswordError(typeof errMsg === 'string' ? errMsg : (errMsg.message || 'Error al cambiar contraseña.'));
      showToast('Error al actualizar contraseña.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Formateador de Fecha de Registro
  const formatRegisterDate = (dateStr: string) => {
    try {
      const cleanDate = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
      const date = new Date(cleanDate);
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateStr || '-';
    }
  };

  // Renderizar Skeletons de Carga
  if (authLoading || !user || !user.detalles) {
    return (
      <div className="space-y-8 animate-pulse p-4 md:p-0 select-none">
        <div className="space-y-2">
          <div className="h-9 bg-slate-200 rounded-2xl w-64 md:w-96" />
          <div className="h-4 bg-slate-100 rounded-lg w-40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-44 w-44 rounded-full bg-slate-200 mx-auto" />
            <div className="h-64 bg-slate-200 rounded-3xl" />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <div className="h-80 bg-slate-200 rounded-3xl" />
            <div className="h-32 bg-slate-200 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  const { detalles } = user;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-0 select-none relative">
      
      {/* Cabecera */}
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Mi Perfil Financiero</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestiona tus datos de contacto personales y actualiza la contraseña de tu firma digital.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* Columna Izquierda: Foto y Ficha Inmutable (Col-span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tarjeta de Avatar Interactivo */}
          <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] flex flex-col items-center">
            <div className="relative group">
              <div className="h-40 w-40 rounded-full bg-[#0054A6]/10 text-[#0054A6] flex items-center justify-center overflow-hidden font-black text-4xl border-4 border-white shadow-md relative transition-transform duration-500 hover:scale-[1.02]">
                {tempAvatar ? (
                  <img src={tempAvatar} alt="Vista previa" className="h-full w-full object-cover opacity-80" />
                ) : avatarUrl ? (
                  <img src={getFullAvatarUrl(avatarUrl) || undefined} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  detalles.nombresCompletos ? detalles.nombresCompletos.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'US'
                )}
              </div>
              
              {/* Botón flotante para subir foto - Disponible siempre que no haya foto temporal pendiente */}
              {!tempAvatar && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-3 bg-[#0054A6] hover:bg-[#004080] text-white rounded-full border-2 border-white shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer animate-scale-up"
                  title="Cambiar foto de perfil"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
              )}
            </div>

            {/* Iconos de Visto y X para Confirmar o Cancelar la subida */}
            {tempAvatar && (
              <div className="mt-4 flex items-center gap-3 animate-scale-up">
                <button
                  onClick={handleSaveTempPhoto}
                  className="flex items-center justify-center h-9 w-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/10 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Confirmar foto de perfil"
                >
                  <Check className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={handleCancelTempPhoto}
                  className="flex items-center justify-center h-9 w-9 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/10 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Cancelar"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            )}

            {/* Input de archivo oculto */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              className="hidden"
            />

            <h3 className="text-base font-bold text-slate-800 mt-4 leading-none">{detalles.nombresCompletos}</h3>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-2">Socio Cooperativa</p>

            {avatarUrl && !tempAvatar && (
              <button
                onClick={handleRemovePhoto}
                className="mt-4 flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-all cursor-pointer bg-rose-50/50 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100/50 animate-scale-up"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar Foto
              </button>
            )}
          </Card>

          {/* Información Personal */}
          <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.015)] space-y-5">
            <div className="pb-3 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-[#0054A6]" />
                <h3 className="text-sm font-bold text-slate-800">Información Personal</h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest">
                <UserCheck className="h-3 w-3 text-emerald-600" />
                {detalles.estado}
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Nombres Completos</span>
                <span className="font-bold text-slate-800 text-sm block">{detalles.nombresCompletos}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Cédula de Identidad</span>
                <span className="font-mono font-bold text-slate-700 text-sm block">{detalles.identificacion}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Código Único de Socio</span>
                <span className="font-mono font-bold text-[#0054A6] text-sm block">SOC-{String(detalles.id).padStart(6, '0')}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Fecha de Registro Oficial</span>
                <span className="font-bold text-slate-700 text-sm block flex items-center gap-1.5">
                  <Calendar className="h-4.5 w-4.5 text-slate-400" />
                  {formatRegisterDate(detalles.createdAt)}
                </span>
              </div>
            </div>
          </Card>

        </div>

        {/* Columna Derecha: Contactabilidad y Seguridad (Col-span 3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Card Formulario Contacto */}
          <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)]">
            <div className="pb-4 border-b border-slate-50 mb-6 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <Mail className="h-5 w-5 text-[#0054A6]" />
                <h3 className="text-base font-bold text-slate-800">Contacto y Dirección</h3>
              </div>
              
              {/* Botón Editar / Cancelar */}
              {!isEditing ? (
                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="border border-slate-200 text-[#0054A6] hover:bg-slate-50 font-bold rounded-2xl h-10 px-4 transition-all cursor-pointer text-xs"
                >
                  Editar
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold rounded-2xl h-10 px-4 transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </Button>
              )}
            </div>

            {contactoError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2 mb-6 animate-fade-in font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{contactoError}</span>
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-6">
              {/* Celular */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. 0987654321"
                    maxLength={10}
                    disabled={!isEditing || updateLoading}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="Ej. correo@ejemplo.com"
                    disabled={!isEditing || updateLoading}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Dirección Domiciliaria */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500">Dirección de Domicilio</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej. Av. Amazonas N32-123 y La Niña"
                    disabled={!isEditing || updateLoading}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Botón de envío - Solo si está editando y hay cambios */}
              {isEditing && isDirty && (
                <div className="pt-2 animate-fade-in">
                  <Button
                    type="submit"
                    disabled={updateLoading}
                    className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-11 px-6 shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs animate-scale-up"
                  >
                    {updateLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        Actualizando información...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-white" />
                        Actualizar Información
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </Card>

          {/* Card de Seguridad Cambio de Contraseña */}
          <Card className="rounded-[2.2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.02)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[#0054A6]" />
                <div>
                  <h3 className="text-base font-bold text-slate-800">Acceso y Seguridad Digital</h3>
                </div>
              </div>

              <Button
                onClick={() => {
                  if (isPasswordFormOpen) {
                    setIsPasswordFormOpen(false);
                    setPasswordError(null);
                  } else {
                    handleSolicitarOtp();
                  }
                }}
                disabled={passwordLoading}
                variant="outline"
                className="border border-slate-200 text-[#0054A6] hover:bg-slate-50 font-bold rounded-2xl h-10 px-4 transition-all cursor-pointer text-xs"
              >
                {passwordLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#0054A6]" />
                ) : isPasswordFormOpen ? (
                  'Cancelar'
                ) : (
                  'Cambiar contraseña'
                )}
              </Button>

            </div>

            {isPasswordFormOpen && (
              <div className="mt-6 border-t border-slate-50 pt-6 animate-slide-down">
                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2 mb-4 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  {correoEnmascarado && (
                    <p className="text-[11px] font-semibold text-slate-500 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                      Código de seguridad enviado al correo: <span className="text-[#0054A6] font-bold">{correoEnmascarado}</span>. Por favor ingrésalo a continuación.
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Código OTP */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500">Código de Seguridad (OTP)</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          type="text"
                          value={otp}
                          maxLength={6}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          disabled={passwordLoading}
                          className="pl-10 font-mono text-base"
                        />
                      </div>
                    </div>

                    {/* Nueva Clave */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500">Nueva Contraseña</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          type="password"
                          value={passwordNueva}
                          onChange={(e) => setPasswordNueva(e.target.value)}
                          placeholder="••••••••"
                          disabled={passwordLoading}
                          className="pl-10 font-mono text-base"
                        />
                      </div>
                    </div>

                    {/* Confirmar Nueva Clave */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500">Confirmar Nueva Contraseña</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          type="password"
                          value={passwordConfirmar}
                          onChange={(e) => setPasswordConfirmar(e.target.value)}
                          placeholder="••••••••"
                          disabled={passwordLoading}
                          className="pl-10 font-mono text-base"
                        />
                      </div>
                    </div>
                  </div>

                  {otp.trim() && passwordNueva.trim() && passwordConfirmar.trim() && (
                    <div className="pt-2 flex justify-end animate-fade-in">
                      <Button
                        type="submit"
                        disabled={passwordLoading}
                        className="bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-11 px-6 shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs animate-scale-up"
                      >
                        {passwordLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            Actualizando contraseña...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 text-white" />
                            Actualizar contraseña
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </Card>

        </div>

      </div>

      {/* Alerta flotante tipo Toast */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-white rounded-2xl border border-slate-100 shadow-2xl flex items-center gap-3 animate-slide-up max-w-sm">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800">
              {toast.type === 'success' ? 'Operación Exitosa' : 'Ocurrió un Error'}
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, show: false }))}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

    </div>
  );
};

export default Perfil;
