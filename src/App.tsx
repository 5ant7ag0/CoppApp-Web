import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { AuthLayout } from './layouts/AuthLayout';
import { SocioLayout } from './layouts/SocioLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { SaasLayout } from './layouts/SaasLayout';
import { Login } from './pages/auth/Login';
import { RecuperarClave } from './pages/auth/RecuperarClave';
import { EstablecerPassword } from './pages/auth/EstablecerPassword';
import { RecuperarClaveSocio } from './pages/auth/RecuperarClaveSocio';
import { DashboardScreen } from './components/DashboardScreen';
import { Inicio } from './pages/socio/Inicio';
import { Transferencias } from './pages/socio/Transferencias';
import { Creditos } from './pages/socio/Creditos';
import { Perfil } from './pages/socio/Perfil';
import { Movimientos } from './pages/socio/Movimientos';
import { Inversiones } from './pages/socio/Inversiones';
import { AprobacionCreditos } from './pages/admin/AprobacionCreditos';
import { CreacionSocios } from './pages/admin/CreacionSocios';
import { ContabilidadDashboard } from './pages/admin/ContabilidadDashboard';
import { Parametrizacion } from './pages/admin/Parametrizacion';
import { GestionEquipo } from './pages/admin/GestionEquipo';
import { ForzarCambioPassword } from './pages/auth/ForzarCambioPassword';
import { SaasDashboard } from './pages/saas/SaasDashboard';
import { Loader2 } from 'lucide-react';

interface ProtectedAdminRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.rol)) {
    // Redirect to their default module based on role
    if (user.rol === 'CAJERO') return <Navigate to="/admin/dashboard" replace />;
    if (user.rol === 'OFICIAL_DE_CREDITO') return <Navigate to="/admin/creditos" replace />;
    if (user.rol === 'CONTADOR') return <Navigate to="/admin/contabilidad" replace />;
    if (user.rol === 'GERENTE_GENERAL' || user.rol === 'ADMINISTRADOR') {
      return <Navigate to="/admin/creditos" replace />;
    }
    if (user.rol === 'SUPER_ADMIN_SAAS') return <Navigate to="/saas/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol !== 'SUPER_ADMIN_SAAS') {
    // Si es un empleado normal, redirigirlo a su respectivo inicio o login.
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RootRouter: React.FC = () => {
  const { isInitializing, isAuthenticated, user } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-400 font-medium tracking-wide">Iniciando canales seguros...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas de Autenticación */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-clave" element={<RecuperarClave />} />
          <Route path="/establecer-password" element={<EstablecerPassword />} />
          <Route path="/recuperar-clave-socio" element={<RecuperarClaveSocio />} />
        </Route>

        {/* Ruta de cambio obligatorio de contraseña */}
        <Route 
          path="/forzar-cambio-password" 
          element={
            isAuthenticated && user && user.rol !== 'SOCIO' && user.detalles?.cambiarPasswordProximoInicio ? (
              <ForzarCambioPassword />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Rutas Protegidas del Socio */}
        <Route element={<SocioLayout />}>
          <Route path="/socio/dashboard" element={<Inicio />} />
          <Route path="/socio/movimientos" element={<Movimientos />} />
          <Route path="/socio/transferencias" element={<Transferencias />} />
          <Route path="/socio/inversiones" element={<Inversiones />} />
          <Route path="/socio/creditos" element={<Creditos />} />
          <Route path="/socio/perfil" element={<Perfil />} />
        </Route>

        {/* Rutas Privadas del SaaS Manager */}
        <Route element={<SaasLayout />}>
          <Route 
            path="/saas/dashboard" 
            element={
              <SuperAdminRoute>
                <SaasDashboard />
              </SuperAdminRoute>
            } 
          />
        </Route>

        {/* Rutas Protegidas de Administración */}
        <Route element={<AdminLayout />}>
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedAdminRoute allowedRoles={['CAJERO']}>
                <DashboardScreen />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin/creditos" 
            element={
              <ProtectedAdminRoute allowedRoles={['OFICIAL_DE_CREDITO', 'CONTADOR', 'GERENTE_GENERAL', 'ADMINISTRADOR']}>
                <AprobacionCreditos />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin/socios" 
            element={
              <ProtectedAdminRoute allowedRoles={['OFICIAL_DE_CREDITO', 'CONTADOR', 'GERENTE_GENERAL', 'ADMINISTRADOR']}>
                <CreacionSocios />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin/contabilidad" 
            element={
              <ProtectedAdminRoute allowedRoles={['CONTADOR', 'GERENTE_GENERAL', 'ADMINISTRADOR']}>
                <ContabilidadDashboard />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin/parametrizacion" 
            element={
              <ProtectedAdminRoute allowedRoles={['GERENTE_GENERAL', 'ADMINISTRADOR']}>
                <Parametrizacion />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin/gestion-equipo" 
            element={
              <ProtectedAdminRoute allowedRoles={['GERENTE_GENERAL', 'ADMINISTRADOR']}>
                <GestionEquipo />
              </ProtectedAdminRoute>
            } 
          />
        </Route>

        {/* Redirecciones Generales */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <RootRouter />
      </AuthProvider>
    </TenantProvider>
  );
}

export default App;
