import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

export interface UserProfile {
  username: string;
  nombresCompletos: string;
  rol: string;
  empresaId: number;
  detalles: any;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  isBlocked: boolean; // Bandera para reaccionar al bloqueo
  login: (username: string, password: string, isSocio: boolean, tenantId: number) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);

  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = localStorage.getItem('coop_token');
      const savedTenantId = localStorage.getItem('coop_tenant_id');

      if (savedToken && savedTenantId) {
        setToken(savedToken);
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          console.error('Error restaurando sesión:', err);
          logoutLocal();
        }
      }
      setIsInitializing(false);
    };

    restoreSession();
  }, []);

  const logoutLocal = () => {
    // Barrido de seguridad de todos los datos de sesión en localStorage que tengan el prefijo 'coop_'
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('coop_') && key !== 'coop_tenant_id') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    setUser(null);
    setToken(null);
    setError(null);
    setIsBlocked(false);
  };

  useEffect(() => {
    const handleSessionExpired = (e: Event) => {
      logoutLocal();
      const customEvent = e as CustomEvent;
      const status = customEvent.detail;
      setError(
        status === 403 
          ? 'Acceso denegado: No tiene permisos suficientes para realizar esta acción.' 
          : 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.'
      );
    };

    window.addEventListener('coop_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('coop_session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (username: string, password: string, isSocio: boolean, tenantId: number) => {
    setIsLoading(true);
    setError(null);
    setIsBlocked(false);

    // Guardar el tenant ID provisional en localStorage para que el interceptor lo inyecte
    localStorage.setItem('coop_tenant_id', tenantId.toString());

    try {
      const endpoint = isSocio ? '/auth/socio/login' : '/auth/admin/login';
      const res = await api.post(endpoint, { username, password });

      const { token: receivedToken } = res.data;

      // Guardar sesión
      localStorage.setItem('coop_token', receivedToken);
      setToken(receivedToken);

      // Obtener perfil
      const meRes = await api.get('/auth/me');
      setUser(meRes.data);

    } catch (err: any) {
      let msg = 'Error en la autenticación.';
      if (err.response) {
        msg = typeof err.response.data === 'string' ? err.response.data : (err.response.data.message || msg);
        
        // Detectar si la cuenta está BLOQUEADA
        if (msg.includes('BLOQUEADA') || msg.toLowerCase().includes('bloqueada') || msg.toLowerCase().includes('bloqueado')) {
          setIsBlocked(true);
        }
      } else if (err.message) {
        msg = err.message;
      }
      
      logoutLocal();
      setError(msg); // Establecer el error después de limpiar el estado para evitar que se borre
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Error al notificar cierre de sesión al backend:', err);
    } finally {
      logoutLocal();
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
    setIsBlocked(false);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Error refrescando perfil de usuario:', err);
    }
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        isInitializing,
        error,
        isBlocked,
        login,
        logout,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
