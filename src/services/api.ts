import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1';

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

export default api;
