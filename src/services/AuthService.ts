const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export interface LoginRequest {
  username: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  nombresCompletos: string;
  rol: string;
  empresaId: number;
}

export interface UserProfile {
  username: string;
  nombresCompletos: string;
  rol: string;
  empresaId: number;
  detalles: any; // Socio o UsuariosAdmin
}

export class AuthService {
  /**
   * Realiza la autenticación administrativa (Backoffice)
   */
  static async loginAdmin(request: LoginRequest, tenantId: number): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId.toString(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(errorMsg || 'Error al iniciar sesión como administrador.');
    }

    return response.json();
  }

  /**
   * Realiza la autenticación del socio (Canales Digitales)
   */
  static async loginSocio(request: LoginRequest, tenantId: number): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/socio/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId.toString(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(errorMsg || 'Error al iniciar sesión como socio.');
    }

    return response.json();
  }

  /**
   * Obtiene la información del perfil del usuario autenticado actual
   */
  static async getProfile(token: string, tenantId: number): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId.toString(),
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(errorMsg || 'Error al obtener el perfil del usuario.');
    }

    return response.json();
  }

  /**
   * Registra las credenciales de acceso digital para un socio
   */
  static async registrarSocio(identificacion: string, password: string, tenantId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/socio/registrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId.toString(),
      },
      body: JSON.stringify({ identificacion, password }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(errorMsg || 'Error en el registro digital del socio.');
    }
  }

  /**
   * Realiza el cierre de sesión e invalida el token JWT en el backend
   */
  static async logout(token: string, tenantId: number): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId.toString(),
        },
      });
    } catch (error) {
      console.error('Error al notificar cierre de sesión en backend:', error);
    }
  }
}
