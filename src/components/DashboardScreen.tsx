import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { LogOut, AlertTriangle } from 'lucide-react';
import { CajaVentanilla } from '../pages/admin/CajaVentanilla';
import { Navigate } from 'react-router-dom';

export const DashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  if (user.rol === 'OFICIAL_DE_CREDITO') {
    return <Navigate to="/admin/creditos" replace />;
  }

  if (user.rol === 'CAJERO') {
    return <CajaVentanilla />;
  }

  // Función para obtener el mensaje de bienvenida según el rol del usuario
  const getWelcomeMessage = () => {
    switch (user.rol) {
      case 'SOCIO':
        return 'Bienvenido Usuario';
      case 'ADMIN':
        return 'Bienvenido Admin';
      case 'SUPER_ADMIN':
      case 'SUPER_ADMIN_SAAS':
        return 'Bienvenido Super Admin';
      default:
        return `Bienvenido ${user.rol || 'Usuario'}`;
    }
  };

  // Perfil de SOCIO
  const renderSocioDetails = (socio: any) => {
    return (
      <div className="space-y-6">
        
        {/* Basic Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Identificación</span>
            <p className="text-sm font-bold text-neutral-800 mt-1">{socio.identificacion}</p>
          </div>
          <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Celular</span>
            <p className="text-sm font-bold text-neutral-800 mt-1">{socio.telefono}</p>
          </div>
          <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Correo Electrónico</span>
            <p className="text-sm font-bold text-neutral-800 mt-1 break-all">{socio.correo}</p>
          </div>
        </div>

        {/* Address and Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Dirección Domiciliaria</span>
            <p className="text-sm text-neutral-700 mt-1">{socio.direccion}</p>
          </div>
          <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Actividad Económica</span>
            <p className="text-sm text-neutral-700 mt-1">{socio.actividadEconomica}</p>
          </div>
        </div>

        {/* Financial Details */}
        <div className="border-t border-neutral-200 pt-4">
          {/* <h3 className="text-xs font-semibold text-[#0054A6] uppercase tracking-wider mb-3 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-[#0054A6]" />Situación Financiera Declarada</h3> */}
          {/*
          // Datos de Situación Financiera Declarada
          */}
        </div> 

        {/* Pep Check */}
        {socio.esPep && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Este socio ha sido calificado como Persona Expuesta Políticamente (PEP) y sus operaciones requieren aprobación de cumplimiento.</span>
          </div>
        )}
      </div>
    );
  };

  // Perfil de ADMINISTRADOR
  const renderAdminDetails = (admin: any) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Usuario</span>
          <p className="text-sm font-bold text-neutral-800 mt-1">{admin.username}</p>
        </div>
        <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Correo</span>
          <p className="text-sm font-bold text-neutral-800 mt-1">{admin.correo}</p>
        </div>
        <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Rol Administrativo</span>
          <p className="text-sm font-bold text-neutral-800 mt-1">{admin.rol}</p>
        </div>
        <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Estado de Operación</span>
          <p className="text-sm font-bold text-neutral-800 mt-1">{admin.estado}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F6F9] p-4 font-sans select-none transition-colors duration-500">
      
      <div className="relative z-10 w-full max-w-[720px] animate-fade-in">
        
        {/* Main Dashboard Card */}
        <Card className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-neutral-200">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-[#0054A6]">
                {getWelcomeMessage()}
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500 font-medium">
                {user.nombresCompletos}
              </CardDescription>
            </div>
            
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="rounded-lg border border-neutral-200 text-[#0054A6] hover:bg-[#F4F6F9] hover:text-[#003B75] transition-all flex items-center gap-1.5 font-semibold"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar Sesión
            </Button>
          </CardHeader>

          <CardContent className="pt-6">
            {user.rol === 'SOCIO' ? (
              renderSocioDetails(user.detalles)
            ) : (
              renderAdminDetails(user.detalles)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
