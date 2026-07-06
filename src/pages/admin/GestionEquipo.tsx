import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User,
  Users, 
  Search, 
  Plus, 
  Edit3, 
  UserCheck, 
  Lock, 
  Unlock,
  Save, 
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
  UserX,
  Camera,
  Copy,
  Eye,
  Key,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Briefcase,
  CreditCard,
  ShieldAlert
} from 'lucide-react';
import api from '../../services/api';
import { validarCedulaEcuatoriana } from '../../utils/validators';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

// Avatares predefinidos elegantes
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
];

interface Empleado {
  id?: number;
  username: string;
  nombresCompletos: string;
  correo: string;
  rol: string;
  estado: string;
  identificacion: string;
  fotoPerfilUrl?: string;
  telefono?: string;
  direccion?: string;
  cambiarPasswordProximoInicio: boolean;
  cajaId?: number;
  limiteTransaccionMax: number;
  passwordHash?: string;
  ultimoAcceso?: string;
}

interface CajaVentanilla {
  id: number;
  nombre: string;
  estado: string;
}

interface LogAuditoria {
  id: number;
  fecha: string;
  accion: string;
  tablaAfectada: string;
  registroId: number;
  direccionIp: string;
  dispositivoInfo: string;
  valorAnterior?: any;
  valorNuevo?: any;
}

const getErrorMessage = (err: any): string => {
  if (err.response?.data) {
    if (typeof err.response.data === 'object' && err.response.data.message) {
      return err.response.data.message;
    }
    if (typeof err.response.data === 'string') {
      return err.response.data;
    }
  }
  return err.message || 'Error desconocido';
};

export const GestionEquipo: React.FC = () => {
  // Listas y Catálogos
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cajas, setCajas] = useState<CajaVentanilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRol, setSelectedRol] = useState<string>('TODOS');
  const [selectedEstado, setSelectedEstado] = useState('TODOS');
  
  // Auditoria states
  const [expandedLogs, setExpandedLogs] = useState<number[]>([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  // Estados del CRUD
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isFormEditable, setIsFormEditable] = useState(false);

  // Tabs de edición/detalle
  const [activeTab, setActiveTab] = useState<'info' | 'auditoria'>('info');
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Estados de formulario
  const [identificacion, setIdentificacion] = useState('');
  const [nombresCompletos, setNombresCompletos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState('');
  const [tempFile, setTempFile] = useState<File | null>(null);
  const [username, setUsername] = useState('');

  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('CAJERO');
  const [estado, setEstado] = useState('ACTIVO');
  const [cambiarPasswordProximoInicio, setCambiarPasswordProximoInicio] = useState(true);
  const [cajaId, setCajaId] = useState<number | ''>('');
  const [limiteTransaccionMax, setLimiteTransaccionMax] = useState<string>('0.00');
  const [tempPassword, setTempPassword] = useState('');

  // Errores de validación local
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);



  const fetchInitialData = async () => {
    setLoading(true);
    setErrorGeneral(null);
    try {
      const [resEmps, resCajas] = await Promise.all([
        api.get('/usuarios'),
        api.get('/usuarios/cajas-disponibles')
      ]);
      setEmpleados(resEmps.data || []);
      setCajas(resCajas.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorGeneral(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Reset page when dates change
  useEffect(() => {
    setPage(0);
  }, [fechaInicio, fechaFin]);

  // Cargar logs
  useEffect(() => {
    if (activeTab === 'auditoria' && selectedEmpleado?.id) {
      const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
          const params = new URLSearchParams({
            page: page.toString(),
            size: '10'
          });
          if (fechaInicio) params.append('fechaInicio', `${fechaInicio}T00:00:00`);
          if (fechaFin) params.append('fechaFin', `${fechaFin}T23:59:59`);
          
          const res = await api.get(`/usuarios/${selectedEmpleado.id}/auditoria?${params.toString()}`);
          setLogs(res.data?.content || []);
          setTotalPages(res.data?.totalPages || 0);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingLogs(false);
        }
      };
      fetchLogs();
    }
  }, [activeTab, selectedEmpleado, page, fechaInicio, fechaFin]);

  const handleExportCSV = async () => {
    if (!selectedEmpleado?.id) return;
    try {
      const params = new URLSearchParams({
        page: '0',
        size: '10000'
      });
      if (fechaInicio) params.append('fechaInicio', `${fechaInicio}T00:00:00`);
      if (fechaFin) params.append('fechaFin', `${fechaFin}T23:59:59`);
      
      const res = await api.get(`/usuarios/${selectedEmpleado.id}/auditoria?${params.toString()}`);
      const allLogs = res.data?.content || [];
      
      if (allLogs.length === 0) {
        alert("No hay registros para exportar en este rango.");
        return;
      }
      
      const csvHeader = "Fecha,Acción,Módulo / Origen,IP Origen,Cambios (Antes -> Después)\n";
      const csvRows = allLogs.map((log: any) => {
        const dateStr = new Date(log.fecha).toLocaleString('es-EC');
        const modulo = log.tablaAfectada || '-';
        let changesStr = "N/A";
        
        if (log.valorAnterior || log.valorNuevo) {
          const oldObj = typeof log.valorAnterior === 'string' ? JSON.parse(log.valorAnterior) : (log.valorAnterior || {});
          const newObj = typeof log.valorNuevo === 'string' ? JSON.parse(log.valorNuevo) : (log.valorNuevo || {});
          const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
          const changes = allKeys.map(k => {
             const o = oldObj[k];
             const n = newObj[k];
             if (JSON.stringify(o) === JSON.stringify(n)) return null;
             return `${k}: ${JSON.stringify(o)} -> ${JSON.stringify(n)}`;
          }).filter(Boolean);
          if(changes.length > 0) changesStr = changes.join(" | ");
        }
        
        const row = [
          `"${dateStr}"`, 
          `"${log.accion}"`, 
          `"${modulo}"`, 
          `"${log.direccionIp}"`, 
          `"${changesStr.replace(/"/g, '""')}"`
        ];
        return row.join(",");
      });
      
      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvHeader + csvRows.join("\n"));
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", `auditoria_${selectedEmpleado.username}_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al exportar la auditoría.");
    }
  };

  const handleSelectEmpleado = (emp: Empleado) => {
    setSelectedEmpleado(emp);
    setIsEditing(true);
    setIsCreating(false);
    setIsFormEditable(false);
    setActiveTab('info');
    setSubmitError(null);
    setSubmitSuccess(null);
    setValidationErrors({});

    // Cargar campos
    setIdentificacion(emp.identificacion);
    setNombresCompletos(emp.nombresCompletos);
    setTelefono(emp.telefono || '');
    setDireccion(emp.direccion || '');
    setFotoPerfilUrl(emp.fotoPerfilUrl || '');
    setUsername(emp.username);
    setCorreo(emp.correo);
    setRol(emp.rol);
    setEstado(emp.estado);
    setCambiarPasswordProximoInicio(emp.cambiarPasswordProximoInicio);
    setCajaId(emp.cajaId || '');
    setLimiteTransaccionMax(emp.limiteTransaccionMax ? emp.limiteTransaccionMax.toString() : '0.00');
    setTempPassword('');
  };

  const handleStartCreate = () => {
    setSelectedEmpleado(null);
    setIsCreating(true);
    setIsEditing(false);
    setIsFormEditable(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    setValidationErrors({});
    setActiveTab('info');
    setLogs([]);

    // Resetear campos
    setIdentificacion('');
    setNombresCompletos('');
    setTelefono('');
    setDireccion('');
    setFotoPerfilUrl('');
    setTempFile(null);
    setUsername('');

    setCorreo('');
    setRol('CAJERO');
    setEstado('ACTIVO');
    setCambiarPasswordProximoInicio(true);
    setCajaId('');
    setLimiteTransaccionMax('0.00');
    setTempPassword('');
  };

  // Cambiar estado del usuario (Bloquear / Revocar Acceso de forma persistente)
  const toggleEstadoEmpleado = async (emp: Empleado) => {
    const nuevoEstado = emp.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const payload = {
      ...emp,
      estado: nuevoEstado
    };
    try {
      await api.put(`/usuarios/${emp.id}`, payload);
      fetchInitialData();
      if (selectedEmpleado?.id === emp.id) {
        setEstado(nuevoEstado);
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEditing) {
      if (!identificacion.trim()) {
        errors.identificacion = 'La identificación es requerida.';
      } else if (!validarCedulaEcuatoriana(identificacion)) {
        errors.identificacion = 'Debe ser una cédula ecuatoriana válida.';
      }
      if (!tempPassword.trim()) {
        errors.tempPassword = 'La contraseña temporal es requerida.';
      } else if (tempPassword.length < 6) {
        errors.tempPassword = 'Mínimo 6 caracteres.';
      }
    }

    if (!nombresCompletos.trim()) {
      errors.nombresCompletos = 'Los nombres son requeridos.';
    } else if (nombresCompletos.trim().length < 3) {
      errors.nombresCompletos = 'Mínimo 3 caracteres.';
    }

    if (!username.trim()) {
      errors.username = 'El nombre de usuario es requerido.';
    } else if (username.trim().length < 4) {
      errors.username = 'Mínimo 4 caracteres.';
    }

    if (!telefono.trim()) {
      errors.telefono = 'El teléfono es requerido.';
    } else if (telefono.trim().length !== 10 || !telefono.trim().startsWith('09')) {
      errors.telefono = 'Debe tener 10 dígitos y empezar con 09.';
    }

    if (!direccion.trim()) {
      errors.direccion = 'La dirección es requerida.';
    } else if (direccion.trim().length < 5) {
      errors.direccion = 'Mínimo 5 caracteres.';
    }
    if (!correo.trim()) {
      errors.correo = 'El correo es requerido.';
    } else if (!/\S+@\S+\.\S+/.test(correo)) {
      errors.correo = 'Formato de correo inválido.';
    }

    if (rol === 'CAJERO') {
      if (!cajaId) {
        errors.cajaId = 'Asignación de caja obligatoria para cajeros.';
      }
      if (!limiteTransaccionMax || parseFloat(limiteTransaccionMax) < 0) {
        errors.limiteTransaccionMax = 'El límite transaccional debe ser mayor o igual a 0.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!validateForm()) return;

    let uploadedAvatarUrl = fotoPerfilUrl;

    try {
      if (tempFile && isEditing && selectedEmpleado?.id) {
        const formData = new FormData();
        formData.append('file', tempFile);
        const uploadRes = await api.post(`/usuarios/${selectedEmpleado.id}/avatar`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        uploadedAvatarUrl = uploadRes.data.avatarUrl;
      }

      const payload: Empleado = {
        username: username.trim(),
        nombresCompletos: nombresCompletos.trim(),
        correo: correo.trim().toLowerCase(),
        rol,
        estado,
        identificacion: identificacion.trim(),
        fotoPerfilUrl: uploadedAvatarUrl,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
        cambiarPasswordProximoInicio,
        cajaId: rol === 'CAJERO' && cajaId !== '' ? Number(cajaId) : undefined,
        limiteTransaccionMax: rol === 'CAJERO' ? Number(limiteTransaccionMax) : 0,
        passwordHash: tempPassword.trim() || undefined
      };

      if (isEditing && selectedEmpleado?.id) {
        await api.put(`/usuarios/${selectedEmpleado.id}`, payload);
        setSubmitSuccess('¡Empleado actualizado con éxito!');
      } else {
        const createRes = await api.post('/usuarios', payload);
        const newUser = createRes.data as Empleado;
        if (tempFile && newUser && newUser.id) {
          const formData = new FormData();
          formData.append('file', tempFile);
          const uploadRes = await api.post(`/usuarios/${newUser.id}/avatar`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          const newAvatarUrl = uploadRes.data.avatarUrl;
          await api.put(`/usuarios/${newUser.id}`, {
            ...payload,
            fotoPerfilUrl: newAvatarUrl
          });
        }
        setSubmitSuccess('¡Empleado creado con éxito!');
      }
      fetchInitialData();
      setTimeout(() => {
        setIsEditing(false);
        setIsCreating(false);
        setSelectedEmpleado(null);
        setSubmitSuccess(null);
        setTempFile(null);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setSubmitError(getErrorMessage(err));
    }
  };

  // Filtrado avanzado
  const filteredEmpleados = empleados.filter(emp => {
    const matchQuery = emp.nombresCompletos.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.identificacion.includes(searchQuery) ||
      emp.username.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchRol = selectedRol === 'TODOS' || emp.rol === selectedRol;
    const matchEstado = selectedEstado === 'TODOS' || emp.estado === selectedEstado;

    return matchQuery && matchRol && matchEstado;
  });

  // Estadísticas KPIs
  const totalEmpleados = empleados.length;
  const activosEmpleados = empleados.filter(emp => emp.estado === 'ACTIVO').length;
  const inactivosEmpleados = empleados.filter(emp => emp.estado === 'INACTIVO').length;

  const formatUltimoAcceso = (fechaStr?: string) => {
    if (!fechaStr) return 'Pendiente';
    try {
      const d = new Date(fechaStr);
      return d.toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Pendiente';
    }
  };

  const getRoleLabel = (rol: string) => {
    switch(rol) {
      case 'GERENTE_GENERAL': return 'Gerente General';
      case 'SUPER_ADMIN_SAAS': return 'Super Admin';
      case 'CONTADOR': return 'Contador';
      case 'OFICIAL_DE_CREDITO': return 'Oficial de Crédito';
      case 'CAJERO': return 'Cajero';
      case 'AUDITOR_INTERNO': return 'Auditor Interno';
      default: return rol;
    }
  };

  const isFilterActive = searchQuery.trim() !== '' || selectedRol !== 'TODOS' || selectedEstado !== 'TODOS';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRol('TODOS');
    setSelectedEstado('TODOS');
  };

  const generateSecurePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = 'CoopSF-';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pass);
    setCambiarPasswordProximoInicio(true);
  };
  
  const [showPassword, setShowPassword] = useState(false);

  const hasChanges = isCreating ? true : (
    identificacion !== (selectedEmpleado?.identificacion || '') ||
    nombresCompletos !== (selectedEmpleado?.nombresCompletos || '') ||
    telefono !== (selectedEmpleado?.telefono || '') ||
    direccion !== (selectedEmpleado?.direccion || '') ||
    fotoPerfilUrl !== (selectedEmpleado?.fotoPerfilUrl || PRESET_AVATARS[0]) ||
    username !== (selectedEmpleado?.username || '') ||
    correo !== (selectedEmpleado?.correo || '') ||
    rol !== (selectedEmpleado?.rol || 'CAJERO') ||
    estado !== (selectedEmpleado?.estado || 'ACTIVO') ||
    cambiarPasswordProximoInicio !== (selectedEmpleado?.cambiarPasswordProximoInicio ?? true) ||
    cajaId !== (selectedEmpleado?.cajaId || '') ||
    parseFloat(limiteTransaccionMax || '0') !== (selectedEmpleado?.limiteTransaccionMax || 0) ||
    tempPassword !== ''
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in p-1 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-slate-800 text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-[#0054A6]" />
            <span>Gestión de Equipo</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Administración del personal, asignación de roles (RBAC), control de ventanillas y límites operativos.
          </p>
        </div>

        {!isEditing && !isCreating && (
          <Button
            onClick={handleStartCreate}
            className="rounded-2xl h-10.5 px-5 bg-[#0054A6] hover:bg-[#004080] text-white text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Registrar Trabajador</span>
          </Button>
        )}
      </div>

      {/* 3 KPIs Balanceados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="text-left">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Empleados</p>
            <p className="text-slate-800 text-2xl font-black mt-1.5">{totalEmpleados}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#0054A6] flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="text-left">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Usuarios Activos</p>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-slate-800 text-2xl font-black">{activosEmpleados}</p>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse mt-1" />
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="text-left">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Accesos Revocados / Inactivos</p>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-slate-800 text-2xl font-black">{inactivosEmpleados}</p>
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400 mt-1" />
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <UserX className="h-6 w-6" />
          </div>
        </div>
      </div>

      {errorGeneral && (
        <div className="bg-red-50 border border-red-100 text-red-650 rounded-2xl p-4 text-xs font-semibold">
          {errorGeneral}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0054A6]" />
          <p className="text-slate-400 text-xs font-medium">Cargando base del personal...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            
            {/* Controles de Búsqueda y Filtros */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.01)] space-y-3 no-print">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-1 gap-2.5 items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Buscar por cédula, nombre o usuario..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450">
                      <Search className="h-4 w-4" />
                    </div>
                    {isFilterActive && (
                      <button
                        onClick={handleClearFilters}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Limpiar filtros"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2.5 items-center">
                    <select
                      value={selectedRol}
                      onChange={(e) => setSelectedRol(e.target.value)}
                      className="w-40 border border-slate-200 text-slate-650 font-bold rounded-2xl text-xs h-9.5 pl-3.5 pr-8 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
                    >
                      <option value="TODOS">Todos los Roles</option>
                      <option value="GERENTE_GENERAL">Gerente General</option>
                      <option value="CONTADOR">Contador</option>
                      <option value="OFICIAL_DE_CREDITO">Oficial de Crédito</option>
                      <option value="CAJERO">Cajero</option>
                      <option value="AUDITOR_INTERNO">Auditor Interno</option>
                    </select>

                    <select
                      value={selectedEstado}
                      onChange={(e) => setSelectedEstado(e.target.value)}
                      className="w-40 border border-slate-200 text-slate-650 font-bold rounded-2xl text-xs h-9.5 pl-3.5 pr-8 appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20"
                    >
                      <option value="TODOS">Todos los Estados</option>
                      <option value="ACTIVO">Activos</option>
                      <option value="INACTIVO">Inactivos</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Listado / Tabla Principal (Siempre Ancho Completo) */}
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-[0_10px_30px_rgba(0,84,166,0.02)]">
                {filteredEmpleados.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No se encontraron trabajadores que coincidan con la búsqueda o filtros.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="py-3.5 px-6">
                            <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 opacity-70" /> Empleado</div>
                          </th>
                          <th className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 opacity-70" /> Usuario</div>
                          </th>
                          <th className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 opacity-70" /> Cédula</div>
                          </th>
                          <th className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 opacity-70" /> Rol</div>
                          </th>
                          <th className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 opacity-70" /> Último Acceso</div>
                          </th>
                          <th className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 opacity-70" /> Estado de Acceso</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredEmpleados.map((emp) => {
                          const initials = emp.nombresCompletos.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
                          return (
                            <tr 
                              key={emp.id} 
                              onClick={() => handleSelectEmpleado(emp)}
                              className="hover:bg-slate-50/50 transition-colors text-xs text-slate-700 cursor-pointer"
                            >
                              {/* Empleado info */}
                              <td className="py-4 px-6 flex items-center gap-3">
                                {emp.fotoPerfilUrl ? (
                                  <img
                                    src={emp.fotoPerfilUrl}
                                    alt={emp.nombresCompletos}
                                    className="h-10 w-10 rounded-full object-cover border border-slate-100"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-[#0054A6]/10 text-[#0054A6] flex items-center justify-center font-black text-xs">
                                    {initials}
                                  </div>
                                )}
                                <div className="text-left">
                                  <p className="font-bold text-slate-800 leading-snug">{emp.nombresCompletos}</p>
                                  <p className="text-[10px] text-slate-400 font-medium leading-none mt-1">{emp.correo}</p>
                                </div>
                              </td>

                              {/* Usuario */}
                              <td className="py-4 px-4 font-medium text-slate-600">{emp.username}</td>

                              {/* Cédula */}
                              <td className="py-4 px-4 font-medium font-mono text-slate-600">{emp.identificacion}</td>

                              {/* Rol */}
                              <td className="py-4 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                                  emp.rol === 'GERENTE_GENERAL' || emp.rol === 'SUPER_ADMIN_SAAS'
                                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                    : emp.rol === 'CAJERO'
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                                }`}>
                                  {getRoleLabel(emp.rol)}
                                </span>
                              </td>

                              {/* Último Acceso */}
                              <td className="py-4 px-4">
                                <div className="text-slate-500">
                                  <span className={!emp.ultimoAcceso ? 'italic text-slate-400 font-medium' : 'font-medium'}>
                                    {formatUltimoAcceso(emp.ultimoAcceso)}
                                  </span>
                                </div>
                              </td>

                              {/* Estado (Toggle / Seguridad Switch) */}
                              <td className="py-4 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleEstadoEmpleado(emp);
                                  }}
                                  title={emp.estado === 'ACTIVO' ? 'Revocar Acceso' : 'Permitir Acceso'}
                                  className={`inline-flex items-center justify-center p-1 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                                    emp.estado === 'ACTIVO' 
                                      ? 'bg-emerald-50/70 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                                      : 'bg-rose-50/70 text-rose-650 border-rose-200 hover:bg-rose-100'
                                  }`}
                                >
                                  {emp.estado === 'ACTIVO' ? (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5">
                                      <Unlock className="h-3 w-3" />
                                      <span className="text-[10px] font-bold">Activo</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5">
                                      <Lock className="h-3 w-3" />
                                      <span className="text-[10px] font-bold">Bloqueado</span>
                                    </div>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
          </div>

          {/* Modal Overlay para Crear/Editar Empleado */}
          <AnimatePresence mode="wait">
            {(isEditing || isCreating) && (
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-6 px-4 sm:px-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col mb-16"
                >
                  <div className="flex-col w-full">
                  
                  {/* Form Header / Tabs */}
                  <div className="bg-slate-50/50 px-6 pt-5 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-slate-800 text-sm font-black flex items-center gap-2">
                        {isCreating ? (
                          <>
                            <UserCheck className="h-4.5 w-4.5 text-[#0054A6]" />
                            <span>Nuevo Empleado</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="h-4.5 w-4.5 text-[#0054A6]" />
                            <span>Ficha de Trabajador</span>
                          </>
                        )}
                      </h3>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setIsCreating(false);
                          setSelectedEmpleado(null);
                        }}
                        className="h-7 w-7 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Pill Tab Slider Indicator and Avatar */}
                    <div className="flex items-center gap-4 mt-3 mb-2">
                      {/* Avatar Upload */}
                      <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-slate-200 shrink-0 bg-slate-50 flex items-center justify-center group">
                        {fotoPerfilUrl ? (
                          <img 
                            src={fotoPerfilUrl} 
                            alt="Avatar" 
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <User className="h-7 w-7 text-slate-300" />
                        )}
                        {isFormEditable && (
                          <>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none">
                              <Camera className="h-4.5 w-4.5 text-white" />
                            </div>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 1024 * 1024) {
                                    alert('La imagen es demasiado grande. Elige una de menos de 1 MB.');
                                    return;
                                  }
                                  setTempFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFotoPerfilUrl(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </>
                        )}
                      </div>

                      {/* Tabs */}
                      {isEditing && (
                        <div className="bg-slate-50/50 p-1.5 rounded-full inline-flex border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative z-0">
                          <button
                            onClick={() => setActiveTab('info')}
                            className="relative px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-slate-500 hover:text-slate-800"
                          >
                            {activeTab === 'info' && (
                              <motion.div
                                layoutId="activeTabIndicatorEquipo"
                                className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <span className={`relative z-10 transition-colors duration-300 ${
                              activeTab === 'info' ? 'text-white' : 'text-slate-500'
                            }`}>
                              Información
                            </span>
                          </button>
                          <button
                            onClick={() => setActiveTab('auditoria')}
                            className="relative px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-slate-500 hover:text-slate-800"
                          >
                            {activeTab === 'auditoria' && (
                              <motion.div
                                layoutId="activeTabIndicatorEquipo"
                                className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <span className={`relative z-10 transition-colors duration-300 ${
                              activeTab === 'auditoria' ? 'text-white' : 'text-slate-500'
                            }`}>
                              Pista de Auditoría
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Content */}
                  <div className="p-6">
                    {submitError && (
                      <div className="flex items-start gap-2 bg-red-50 text-red-600 border border-red-100 rounded-2xl p-3.5 text-xs mb-5 animate-shake">
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {submitSuccess && (
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl p-3.5 text-xs mb-5">
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                        <span>{submitSuccess}</span>
                      </div>
                    )}

                    {activeTab === 'info' ? (
                      <form onSubmit={handleSubmit} className="space-y-6 text-left">
                        <fieldset disabled={!isFormEditable} className="contents space-y-6">
                        {/* A. IDENTIDAD */}
                        <div className="space-y-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block select-none border-b border-slate-50 pb-1">
                            A. Datos de Identidad
                          </span>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400">CÉDULA DE IDENTIDAD</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  maxLength={10}
                                  disabled={isEditing}
                                  placeholder="Ej: 1710034065"
                                  value={identificacion}
                                  onChange={(e) => {
                                    setIdentificacion(e.target.value.replace(/\D/g, ''));
                                    if (validationErrors.identificacion) {
                                      setValidationErrors(prev => ({ ...prev, identificacion: '' }));
                                    }
                                  }}
                                  className={`w-full h-10 px-3.5 pr-10 text-xs font-semibold text-slate-700 border rounded-xl focus:outline-none transition-colors ${
                                    isEditing 
                                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' 
                                      : identificacion.length === 10
                                        ? validarCedulaEcuatoriana(identificacion)
                                          ? 'bg-emerald-50/50 border-emerald-200 focus:ring-2 focus:ring-emerald-500/20'
                                          : 'bg-red-50/50 border-red-200 focus:ring-2 focus:ring-red-500/20'
                                        : 'bg-slate-50/50 border-slate-200 focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20'
                                  }`}
                                />
                                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                                  {isEditing ? (
                                    <Lock className="h-4 w-4 text-slate-400" />
                                  ) : identificacion.length === 10 ? (
                                    validarCedulaEcuatoriana(identificacion) ? (
                                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-red-400" />
                                    )
                                  ) : null}
                                </div>
                              </div>
                              {!isEditing && identificacion.length === 10 && !validarCedulaEcuatoriana(identificacion) && (
                                <p className="text-[10px] text-red-500 font-semibold mt-1">
                                  La cédula ingresada no es válida según el algoritmo ecuatoriano.
                                </p>
                              )}
                              {validationErrors.identificacion && (
                                <p className="text-[10px] text-red-500 font-semibold">{validationErrors.identificacion}</p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400">NOMBRES COMPLETOS</label>
                              <Input
                                type="text"
                                placeholder="Ej: Nombres y Apellidos"
                                value={nombresCompletos}
                                onChange={(e) => {
                                  setNombresCompletos(e.target.value);
                                  if (validationErrors.nombresCompletos) {
                                    setValidationErrors(prev => ({ ...prev, nombresCompletos: '' }));
                                  }
                                }}
                                className={`h-10 text-xs bg-slate-50/50 rounded-xl ${
                                  validationErrors.nombresCompletos ? 'border-red-500 focus:ring-red-100' : ''
                                }`}
                              />
                              {validationErrors.nombresCompletos && (
                                <p className="text-[10px] text-red-500 font-semibold">{validationErrors.nombresCompletos}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400">TELÉFONO DE CONTACTO</label>
                              <Input
                                type="text"
                                maxLength={10}
                                placeholder="Ej: 0991234567"
                                value={telefono}
                                onChange={(e) => {
                                  setTelefono(e.target.value.replace(/\D/g, ''));
                                  if (validationErrors.telefono) {
                                    setValidationErrors(prev => ({ ...prev, telefono: '' }));
                                  }
                                }}
                                className={`h-10 text-xs bg-slate-50/50 rounded-xl ${
                                  validationErrors.telefono ? 'border-red-500 focus:ring-red-100' : ''
                                }`}
                              />
                              {validationErrors.telefono && (
                                <p className="text-[10px] text-red-500 font-semibold">{validationErrors.telefono}</p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400">DIRECCIÓN DOMICILIARIA</label>
                              <Input
                                type="text"
                                placeholder="Ej: Av. Amazonas y Patria"
                                value={direccion}
                                onChange={(e) => {
                                  setDireccion(e.target.value);
                                  if (validationErrors.direccion) {
                                    setValidationErrors(prev => ({ ...prev, direccion: '' }));
                                  }
                                }}
                                className={`h-10 text-xs bg-slate-50/50 rounded-xl ${
                                  validationErrors.direccion ? 'border-red-500 focus:ring-red-100' : ''
                                }`}
                              />
                              {validationErrors.direccion && (
                                <p className="text-[10px] text-red-500 font-semibold">{validationErrors.direccion}</p>
                              )}
                            </div>
                          </div>


                        </div>

                        {/* B. SEGURIDAD Y ACCESO */}
                        <div className="space-y-4 pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block select-none border-b border-slate-50 pb-1">
                            B. Credenciales y Seguridad
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400">USUARIO (USERNAME)</label>
                              <Input
                                type="text"
                                placeholder="Ej: oficial_santiago"
                                value={username}
                                onChange={(e) => {
                                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                                  if (validationErrors.username) {
                                    setValidationErrors(prev => ({ ...prev, username: '' }));
                                  }
                                }}
                                className={`h-10 text-xs bg-slate-50/50 rounded-xl ${
                                  validationErrors.username ? 'border-red-500 focus:ring-red-100' : ''
                                }`}
                              />
                              {validationErrors.username && (
                                <p className="text-[10px] text-red-500 font-semibold">{validationErrors.username}</p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400">CORREO INSTITUCIONAL</label>
                              <Input
                                type="email"
                                placeholder="Ej: empleado@coop.com"
                                value={correo}
                                onChange={(e) => {
                                  setCorreo(e.target.value);
                                  if (validationErrors.correo) {
                                    setValidationErrors(prev => ({ ...prev, correo: '' }));
                                  }
                                }}
                                className={`h-10 text-xs bg-slate-50/50 rounded-xl ${
                                  validationErrors.correo ? 'border-red-500 focus:ring-red-100' : ''
                                }`}
                              />
                              {validationErrors.correo && (
                                <p className="text-[10px] text-red-500 font-semibold">{validationErrors.correo}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400">
                                {isEditing ? 'RESTABLECER CONTRASEÑA' : 'CONTRASEÑA TEMPORAL'}
                              </label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type={showPassword ? "text" : "password"}
                                    readOnly
                                    placeholder={isEditing ? 'Dejar intacto si no desea cambiar' : 'Presiona generar para crear'}
                                    value={tempPassword}
                                    className={`w-full h-10 px-3.5 text-xs font-mono bg-slate-50/80 border ${validationErrors.tempPassword ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:outline-none focus:border-[#0054A6] transition-colors`}
                                  />
                                  {tempPassword && (
                                    <button 
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={generateSecurePassword}
                                  disabled={!isFormEditable}
                                  className="h-10 px-3 shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Key className="h-4 w-4 text-[#0054A6]" />
                                  <span className="text-xs font-semibold">Generar</span>
                                </button>
                                {tempPassword && (
                                  <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(tempPassword)}
                                    title="Copiar contraseña"
                                    className="h-10 w-10 shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                              {validationErrors.tempPassword && (
                                <p className="text-[10px] text-red-500 font-semibold">{validationErrors.tempPassword}</p>
                              )}
                            </div>

                            <div className="space-y-1.5 flex flex-col justify-center">
                              <label className="text-[10px] font-bold text-slate-400">ESTADO DE ACCESO</label>
                              <div className="h-10 flex items-center gap-3 bg-slate-50/50 border border-slate-200 rounded-xl px-3.5">
                                <button
                                  type="button"
                                  disabled={!isFormEditable}
                                  onClick={() => setEstado(estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO')}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                      estado === 'ACTIVO' ? 'translate-x-[18px]' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                                <span className={`text-xs font-bold transition-colors ${estado === 'ACTIVO' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {estado === 'ACTIVO' ? 'Activo (Permitir Acceso)' : 'Bloqueado (Revocar Acceso)'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <input
                              type="checkbox"
                              id="change-pass-checkbox"
                              checked={cambiarPasswordProximoInicio}
                              onChange={(e) => setCambiarPasswordProximoInicio(e.target.checked)}
                              className="h-4.5 w-4.5 text-[#0054A6] focus:ring-[#0054A6] border-slate-300 rounded cursor-pointer"
                            />
                            <label htmlFor="change-pass-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                              Forzar cambio de contraseña en el próximo inicio de sesión
                            </label>
                          </div>
                        </div>

                        {/* C. ASIGNACIÓN DE ROL */}
                        <div className="space-y-4 pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block select-none border-b border-slate-50 pb-1">
                            C. Asignación de Rol
                          </span>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400">PERFIL/ROL OPERATIVO</label>
                            <select
                              value={rol}
                              onChange={(e) => {
                                setRol(e.target.value);
                                if (e.target.value !== 'CAJERO') {
                                  setValidationErrors(prev => {
                                    const next = { ...prev };
                                    delete next.cajaId;
                                    delete next.limiteTransaccionMax;
                                    return next;
                                  });
                                }
                              }}
                              className="w-full h-10 text-xs px-3.5 pr-8 font-bold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-[#0054A6] rounded-xl outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:ring-2 focus:ring-[#0054A6]/20 transition-all hover:bg-slate-50"
                            >
                              <option value="GERENTE_GENERAL">Gerente General</option>
                              <option value="CONTADOR">Contador</option>
                              <option value="OFICIAL_DE_CREDITO">Oficial de Crédito</option>
                              <option value="CAJERO">Cajero de Ventanilla</option>
                              <option value="AUDITOR_INTERNO">Auditor Interno</option>
                            </select>
                          </div>
                        </div>

                        {/* D. CAJAS Y LÍMITES */}
                        {rol === 'CAJERO' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 pt-2 overflow-hidden"
                          >
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block select-none border-b border-slate-50 pb-1">
                              D. Vinculación Bancaria de Ventanilla
                            </span>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400">ASIGNAR CAJA FÍSICA</label>
                                <select
                                  value={cajaId}
                                  onChange={(e) => {
                                    setCajaId(e.target.value !== '' ? Number(e.target.value) : '');
                                    if (validationErrors.cajaId) {
                                      setValidationErrors(prev => ({ ...prev, cajaId: '' }));
                                    }
                                  }}
                                  className={`w-full h-10 text-xs px-3.5 pr-8 font-bold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-[#0054A6] rounded-xl outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:ring-2 focus:ring-[#0054A6]/20 transition-all hover:bg-slate-50 ${
                                    validationErrors.cajaId ? 'border-red-500' : ''
                                  }`}
                                >
                                  <option value="">-- Seleccionar Caja --</option>
                                  {cajas.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.nombre}
                                    </option>
                                  ))}
                                </select>
                                {validationErrors.cajaId && (
                                  <p className="text-[10px] text-red-500 font-semibold">{validationErrors.cajaId}</p>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400">LÍMITE POR TRANSACCIÓN</label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                                    $
                                  </span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Ej: 5000.00"
                                    value={limiteTransaccionMax}
                                    onChange={(e) => {
                                      setLimiteTransaccionMax(e.target.value);
                                      if (validationErrors.limiteTransaccionMax) {
                                        setValidationErrors(prev => ({ ...prev, limiteTransaccionMax: '' }));
                                      }
                                    }}
                                    className={`w-full pl-8 h-10 text-xs font-mono font-semibold text-slate-700 bg-slate-50/50 border rounded-xl focus:outline-none transition-colors ${
                                      validationErrors.limiteTransaccionMax ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#0054A6]'
                                    }`}
                                  />
                                </div>
                                {validationErrors.limiteTransaccionMax && (
                                  <p className="text-[10px] text-red-500 font-semibold">{validationErrors.limiteTransaccionMax}</p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        </fieldset>

                        {/* Botones de acción */}
                        <div className="pt-4 flex items-center justify-end border-t border-slate-100">
                          <div className="flex gap-3">
                            {isFormEditable && (
                              <Button
                                type="button"
                                onClick={() => {
                                  if (isCreating) {
                                    setIsEditing(false);
                                    setIsCreating(false);
                                    setSelectedEmpleado(null);
                                  } else if (selectedEmpleado) {
                                    handleSelectEmpleado(selectedEmpleado);
                                  }
                                }}
                                className="rounded-xl h-10 px-4 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                              >
                                Cancelar
                              </Button>
                            )}
                            {isEditing && !isFormEditable ? (
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setIsFormEditable(true);
                                }}
                                className="rounded-xl h-10 px-5 bg-[#0054A6] hover:bg-[#004080] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
                              >
                                <Edit3 className="h-4.5 w-4.5" />
                                <span>Editar</span>
                              </Button>
                            ) : hasChanges ? (
                              <Button
                                type="submit"
                                className="rounded-xl h-10 px-5 bg-[#0054A6] hover:bg-[#004080] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
                              >
                                <Save className="h-4.5 w-4.5" />
                                <span>{isEditing ? 'Guardar Cambios' : 'Registrar'}</span>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </form>
                    ) : (
                      /* AUDIT LOG TAB */
                      <div className="space-y-4 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block select-none">
                            Acciones de Auditoría Registradas
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            Empleado: {selectedEmpleado?.nombresCompletos}
                          </span>
                        </div>
                        
                        {/* Filters & Export */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">Desde</label>
                              <input 
                                type="date" 
                                value={fechaInicio} 
                                onChange={e => setFechaInicio(e.target.value)} 
                                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0054A6] text-slate-600 font-medium"
                              />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">Hasta</label>
                              <input 
                                type="date" 
                                value={fechaFin} 
                                onChange={e => setFechaFin(e.target.value)} 
                                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0054A6] text-slate-600 font-medium"
                              />
                            </div>
                            {(fechaInicio || fechaFin) && (
                              <button onClick={() => { setFechaInicio(''); setFechaFin(''); }} className="mt-4 p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          
                          <Button 
                            type="button"
                            onClick={handleExportCSV}
                            className="h-8 px-4 bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm mt-4 md:mt-0"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Exportar</span>
                          </Button>
                        </div>

                        {loadingLogs ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
                            <p className="text-slate-400 text-[10px]">Cargando logs de auditoría...</p>
                          </div>
                        ) : logs.length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs">
                            No existen registros de auditoría para este empleado.
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                                  <th className="py-2.5 px-3">Fecha</th>
                                  <th className="py-2.5 px-3">Acción</th>
                                  <th className="py-2.5 px-3">Módulo / Origen</th>
                                  <th className="py-2.5 px-3">IP Origen</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {logs.map((log) => {
                                  const dateStr = new Date(log.fecha).toLocaleString('es-EC', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });
                                  
                                  const isExpanded = expandedLogs.includes(log.id);
                                  
                                  const getActionColor = (accion: string) => {
                                    const upper = accion.toUpperCase();
                                    if (upper.includes('ERROR') || upper.includes('FALLA') || upper.includes('BLOQUEO') || upper.includes('FAILED')) {
                                      return 'bg-red-50 text-red-600 border border-red-100';
                                    }
                                    if (upper.includes('PASSWORD') || upper.includes('CLAVE') || upper.includes('SEGURIDAD') || upper.includes('LLAVE')) {
                                      return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                                    }
                                    return 'bg-slate-100 text-slate-600 border border-slate-200';
                                  };

                                  const getModuleName = (tabla: string) => {
                                    const map: Record<string, string> = {
                                      'usuarios_admin': 'Gestión de Equipo (usuarios_admin)',
                                      'cajas_ventanilla': 'Cajas Ventanilla (cajas_ventanilla)',
                                      'socios': 'Gestión de Socios (socios)',
                                    };
                                    return map[tabla] || tabla;
                                  };

                                  const renderChanges = (oldVal: any, newVal: any) => {
                                    if (!oldVal && !newVal) return <p className="text-xs text-slate-500 italic">Sin detalle de cambios estructurales.</p>;
                                    
                                    const oldObj = typeof oldVal === 'string' ? JSON.parse(oldVal) : (oldVal || {});
                                    const newObj = typeof newVal === 'string' ? JSON.parse(newVal) : (newVal || {});
                                    
                                    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
                                    
                                    const changes = allKeys.map(key => {
                                      const o = oldObj[key];
                                      const n = newObj[key];
                                      if (JSON.stringify(o) === JSON.stringify(n)) return null;
                                      return { key, old: o, new: n };
                                    }).filter(Boolean) as {key: string, old: any, new: any}[];
                                  
                                    if (changes.length === 0) return <p className="text-xs text-slate-500 italic">No se detectaron diferencias a nivel de campos.</p>;
                                  
                                    return (
                                      <ul className="space-y-1.5 mt-2">
                                        {changes.map((c, i) => (
                                          <li key={i} className="text-[11px] font-mono flex items-center flex-wrap gap-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                            <span className="font-bold text-slate-700 min-w-[120px]">{c.key}:</span>
                                            <span className="text-red-500/90 bg-red-50 px-1.5 py-0.5 rounded break-all">{JSON.stringify(c.old ?? 'null')}</span>
                                            <span className="text-slate-300 mx-1">➔</span>
                                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded break-all">{JSON.stringify(c.new ?? 'null')}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    );
                                  };

                                  return (
                                    <React.Fragment key={log.id}>
                                      <tr 
                                        className="text-[11px] text-slate-650 hover:bg-slate-50/50 cursor-pointer transition-colors"
                                        onClick={() => setExpandedLogs(prev => prev.includes(log.id) ? prev.filter(id => id !== log.id) : [...prev, log.id])}
                                      >
                                        <td className="py-2.5 px-3">
                                          <div className="flex items-center gap-1.5">
                                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-[#0054A6]" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                                            <span className="font-semibold whitespace-nowrap">{dateStr}</span>
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-semibold ${getActionColor(log.accion)}`}>
                                            {log.accion}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 font-mono">{getModuleName(log.tablaAfectada || '-')}</td>
                                        <td className="py-2.5 px-3 font-mono">{log.direccionIp}</td>
                                      </tr>
                                      {isExpanded && (
                                        <tr className="bg-slate-50/30">
                                          <td colSpan={4} className="p-4 border-b border-slate-100">
                                            <div className="bg-slate-100/60 p-3.5 rounded-xl border border-slate-200/50 mx-2 shadow-inner">
                                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#0054A6]"></div>
                                                Desglose de Mutaciones de Datos
                                              </h4>
                                              {renderChanges(log.valorAnterior, log.valorNuevo)}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Pagination UI */}
                        {totalPages > 1 && !loadingLogs && logs.length > 0 && (
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] font-semibold text-slate-400">
                              Página {page + 1} de {totalPages}
                            </span>
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className={`h-7 w-7 flex items-center justify-center rounded-lg border ${page === 0 ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 cursor-pointer'}`}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page === totalPages - 1}
                                className={`h-7 w-7 flex items-center justify-center rounded-lg border ${page === totalPages - 1 ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 cursor-pointer'}`}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
