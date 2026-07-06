import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar headers de Tenant y JWT Bearer Token a cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('coop_token');
    const tenantId = localStorage.getItem('coop_tenant_id');

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar expiración de token de forma global (401/403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const isAuthUrl = error.config && (
        error.config.url?.includes('/auth/admin/login') || 
        error.config.url?.includes('/auth/socio/login')
      );
      
      const hasToken = !!localStorage.getItem('coop_token');

      if (status === 401 && !isAuthUrl && hasToken) {
        // Disparar evento personalizado para cerrar sesión en el AuthContext
        window.dispatchEvent(new CustomEvent('coop_session_expired', { detail: status }));
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Helper global para construir URLs absolutas de assets/imágenes.
 * Convierte paths relativos a la URL base de la API.
 */
export const getAssetUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Si el path ya contiene /api/v1, lo unimos al host base (removiendo el /api/v1 del final del host base)
  if (cleanPath.startsWith('/api/v1')) {
    const hostOnly = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return `${hostOnly}${cleanPath}`;
  }
  return `${API_BASE_URL}${cleanPath}`;
};

export default api;
