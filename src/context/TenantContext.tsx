import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

export interface Cooperativa {
  id: number;
  name: string;
  ruc: string;
  logoBase64?: string;
  address?: string;
  contact?: string;
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
    const initTenant = async () => {
      const savedTenantId = localStorage.getItem('coop_tenant_id');
      let baseTenant = COOPERATIVAS[0];
      if (savedTenantId) {
        const id = parseInt(savedTenantId, 10);
        const found = COOPERATIVAS.find(c => c.id === id);
        if (found) baseTenant = { ...found };
      }

      try {
        const res = await api.get('/empresas/mi-perfil');
        if (res.data) {
          baseTenant.name = res.data.nombre || baseTenant.name;
          baseTenant.ruc = res.data.ruc || baseTenant.ruc;
          baseTenant.address = res.data.direccionMatriz || '';
          baseTenant.contact = res.data.correoElectronico || '';

          if (res.data.logoUrl) {
            let url = res.data.logoUrl;
            if (!url.startsWith('http')) {
              // Usar ruta relativa para que el proxy de Vite lo maneje y evite errores CORS en el canvas/fetch
              const path = url.replace(/^\/?(api\/v1\/)?/, '');
              url = `/api/v1/${path}`;
            }
            
            try {
              console.log('Fetching logo from (proxied):', url);
              // Usamos fetch nativo hacia el mismo dominio (localhost:5173) para que Vite proxycee a 8080
              const imgRes = await fetch(url);
              const blob = await imgRes.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                baseTenant.logoBase64 = reader.result as string;
                console.log('Logo loaded via proxy as Base64.');
                setActiveTenant({ ...baseTenant });
              };
              reader.readAsDataURL(blob);
              localStorage.setItem('coop_tenant_id', baseTenant.id.toString());
              return;
            } catch (imgErr) {
              console.error('Error fetching logo via proxy', imgErr);
            }
          }
        }
      } catch (e) {
        console.warn('Could not load dynamic tenant profile', e);
      }

      setActiveTenant({ ...baseTenant });
      localStorage.setItem('coop_tenant_id', baseTenant.id.toString());
    };

    initTenant();
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

