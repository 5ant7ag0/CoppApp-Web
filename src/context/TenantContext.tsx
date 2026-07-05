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
  const [cooperativasList, setCooperativasList] = useState<Cooperativa[]>(COOPERATIVAS);

  useEffect(() => {
    const initTenant = async () => {
      // 1. Fetch dynamic tenants first to have the latest list
      let latestList = COOPERATIVAS;
      try {
        const tenantsRes = await api.get('/auth/tenants');
        if (tenantsRes.data && Array.isArray(tenantsRes.data) && tenantsRes.data.length > 0) {
          latestList = tenantsRes.data;
          setCooperativasList(tenantsRes.data);
        }
      } catch (err) {
        console.warn('Could not load dynamic public tenants, falling back to static list.', err);
      }

      const savedTenantId = localStorage.getItem('coop_tenant_id');
      let baseTenant = latestList[0];
      if (savedTenantId) {
        const id = parseInt(savedTenantId, 10);
        const found = latestList.find(c => c.id === id);
        if (found) baseTenant = { ...found };
      }

      try {
        const res = await api.get('/empresas/mi-perfil');
        if (res.data) {
          baseTenant.name = res.data.nombreComercial || res.data.razonSocial || res.data.nombre || baseTenant.name;
          baseTenant.ruc = res.data.ruc || baseTenant.ruc;
          baseTenant.address = res.data.direccion || res.data.direccionMatriz || '';
          
          const tel = res.data.telefono || '';
          const email = res.data.correoInstitucional || res.data.correoElectronico || '';
          if (tel || email) {
            baseTenant.contact = `Contacto: ${tel} ${tel && email ? '|' : ''} ${email}`.trim();
          } else {
            baseTenant.contact = '';
          }

          if (res.data.logoUrl) {
            let url = res.data.logoUrl;
            if (!url.startsWith('http')) {
              const path = url.replace(/^\/?(api\/v1\/)?/, '');
              url = `/api/v1/${path}`;
            }
            
            try {
              console.log('Fetching logo from (proxied):', url);
              const imgRes = await fetch(url);
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                baseTenant.logoBase64 = base64;
                console.log('Logo loaded successfully.');
              } else {
                console.error('Fetch returned non-OK status:', imgRes.status);
              }
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

    const handleLogoUpdate = () => {
      initTenant();
    };
    
    window.addEventListener('logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('logo-updated', handleLogoUpdate);
  }, []);

  const changeTenant = (id: number) => {
    const found = cooperativasList.find(c => c.id === id);
    if (found) {
      setActiveTenant(found);
      localStorage.setItem('coop_tenant_id', id.toString());
    }
  };

  return (
    <TenantContext.Provider value={{ activeTenant, changeTenant, cooperativas: cooperativasList }}>
      {children}
    </TenantContext.Provider>
  );
};

