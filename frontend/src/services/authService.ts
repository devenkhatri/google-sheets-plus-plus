import axios from 'axios';

import { API_URL } from '../config';
const AUTH_TOKEN_KEY = 'auth_token';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication service
 */
export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    const { token, user } = response.data.data;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    return { token, user };
  },

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const { token, user } = response.data.data;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    return { token, user };
  },

  /**
   * Login with Google
   */
  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const response = await api.post('/auth/google', { token: idToken });
    const { token, user } = response.data.data;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    return { token, user };
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        return null;
      }
      
      const response = await api.get('/auth/me');
      return response.data.data;
    } catch (error) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(data: { name?: string; avatar_url?: string }): Promise<User> {
    const response = await api.put('/auth/profile', data);
    return response.data.data;
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Generate API key
   */
  async generateApiKey(name: string, description?: string): Promise<any> {
    const response = await api.post('/auth/api-keys', {
      name,
      description,
    });
    return response.data.data;
  },

  /**
   * Get API keys
   */
  async getApiKeys(): Promise<any[]> {
    const response = await api.get('/auth/api-keys');
    return response.data.data;
  },

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    await api.put(`/auth/api-keys/${keyId}/revoke`);
  },

  /**
   * Delete API key
   */
  async deleteApiKey(keyId: string): Promise<void> {
    await api.delete(`/auth/api-keys/${keyId}`);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  },

  /**
   * Get auth token
   */
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },
};