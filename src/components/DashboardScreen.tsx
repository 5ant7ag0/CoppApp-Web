import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CajaVentanilla } from '../pages/admin/CajaVentanilla';
import { Navigate } from 'react-router-dom';

export const DashboardScreen: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  if (user.rol === 'OFICIAL_DE_CREDITO') {
    return <Navigate to="/admin/creditos" replace />;
  }

  if (user.rol === 'ASESOR' || user.rol === 'ASESOR_DE_SERVICIOS') {
    return <Navigate to="/admin/socios" replace />;
  }

  if (user.rol === 'CONTADOR') {
    return <Navigate to="/admin/contabilidad" replace />;
  }

  // Renderiza el módulo de Ventanilla/Caja directamente
  return <CajaVentanilla />;
};
