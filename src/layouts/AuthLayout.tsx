import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    if (user.rol === 'SOCIO') {
      return <Navigate to="/socio/dashboard" replace />;
    } else {
      if (user.detalles?.cambiarPasswordProximoInicio) {
        return <Navigate to="/forzar-cambio-password" replace />;
      }
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden select-none">
      {/* Círculos difuminados de fondo orgánico estilo Apple muy sutiles */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-300/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-[#0054A6]/5 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
};
