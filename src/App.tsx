import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { AuthLayout } from './layouts/AuthLayout';
import { SocioLayout } from './layouts/SocioLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { Login } from './pages/auth/Login';
import { RecuperarClave } from './pages/auth/RecuperarClave';
import { EstablecerPassword } from './pages/auth/EstablecerPassword';
import { DashboardScreen } from './components/DashboardScreen';
import { Inicio } from './pages/socio/Inicio';
import { Transferencias } from './pages/socio/Transferencias';
import { Creditos } from './pages/socio/Creditos';
import { Perfil } from './pages/socio/Perfil';
import { Movimientos } from './pages/socio/Movimientos';
import { AprobacionCreditos } from './pages/admin/AprobacionCreditos';
import { CreacionSocios } from './pages/admin/CreacionSocios';
import { ContabilidadDashboard } from './pages/admin/ContabilidadDashboard';
import { Parametrizacion } from './pages/admin/Parametrizacion';
import { Loader2 } from 'lucide-react';

const RootRouter: React.FC = () => {
  const { isInitializing } = useAuth();

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
        </Route>

        {/* Rutas Protegidas del Socio */}
        <Route element={<SocioLayout />}>
          <Route path="/socio/dashboard" element={<Inicio />} />
          <Route path="/socio/movimientos" element={<Movimientos />} />
          <Route path="/socio/transferencias" element={<Transferencias />} />
          <Route path="/socio/creditos" element={<Creditos />} />
          <Route path="/socio/perfil" element={<Perfil />} />
        </Route>

        {/* Rutas Protegidas de Administración */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<DashboardScreen />} />
          <Route path="/admin/creditos" element={<AprobacionCreditos />} />
          <Route path="/admin/socios" element={<CreacionSocios />} />
          <Route path="/admin/contabilidad" element={<ContabilidadDashboard />} />
          <Route path="/admin/parametrizacion" element={<Parametrizacion />} />
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
