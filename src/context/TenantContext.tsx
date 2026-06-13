import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface Cooperativa {
  id: number;
  name: string;
  ruc: string;
}

// Cooperativas predefinidas de las semillas del backend
export const COOPERATIVAS: Cooperativa[] = [
  { id: 1, name: 'Cooperativa de Ahorro y Crédito ITQ', ruc: '1791234567001' },
  { id: 10, name: 'Cooperativa Progreso Ltda', ruc: '1792233445001' },
  { id: 11, name: 'Coop Crecer', ruc: '1799999999001' },
  { id: 12, name: 'Cooperativa Quito', ruc: '1799999991001' }
];

interface TenantContextType {
  activeTenant: Cooperativa | null;
  changeTenant: (id: number) => void;
  cooperativas: Cooperativa[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant debe usarse dentro de un TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [activeTenant, setActiveTenant] = useState<Cooperativa | null>(null);

  useEffect(() => {
    const savedTenantId = localStorage.getItem('coop_tenant_id');
    if (savedTenantId) {
      const id = parseInt(savedTenantId, 10);
      const found = COOPERATIVAS.find(c => c.id === id);
      if (found) {
        setActiveTenant(found);
      } else {
        setActiveTenant(COOPERATIVAS[0]);
        localStorage.setItem('coop_tenant_id', COOPERATIVAS[0].id.toString());
      }
    } else {
      setActiveTenant(COOPERATIVAS[0]);
      localStorage.setItem('coop_tenant_id', COOPERATIVAS[0].id.toString());
    }
  }, []);

  const changeTenant = (id: number) => {
    const found = COOPERATIVAS.find(c => c.id === id);
    if (found) {
      setActiveTenant(found);
      localStorage.setItem('coop_tenant_id', id.toString());
    }
  };

  return (
    <TenantContext.Provider value={{ activeTenant, changeTenant, cooperativas: COOPERATIVAS }}>
      {children}
    </TenantContext.Provider>
  );
};
