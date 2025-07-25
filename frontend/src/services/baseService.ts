import axios from 'axios';
import { authService } from './authService';
import { offlineStorageService } from './offlineStorageService';

import { API_URL } from '../config';
const API_VERSION = '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}${API_VERSION}/bases`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface Base {
  id: string;
  name: string;
  description?: string;
  google_sheets_id: string;
  owner_id: string;
  permission_level: string;
  settings?: any;
  created_at: string;
  updated_at: string;
  tables?: Table[];
}

export interface Table {
  id: string;
  base_id: string;
  name: string;
  description?: string;
  google_sheet_id: number;
  google_sheet_name: string;
  record_count: number;
  settings?: any;
  created_at: string;
  updated_at: string;
  fields?: Field[];
  views?: View[];
}

export interface Field {
  id: string;
  table_id: string;
  name: string;
  type: string;
  options?: any;
  required: boolean;
  column_index: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface View {
  id: string;
  table_id: string;
  name: string;
  type: string;
  configuration?: any;
  filters?: any;
  sorts?: any;
  field_visibility?: any;
  created_at: string;
  updated_at: string;
}

export interface Collaborator {
  id: string;
  base_id: string;
  user_id: string;
  permission_level: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBaseRequest {
  name: string;
  description?: string;
}

export interface UpdateBaseRequest {
  name?: string;
  description?: string;
}

export interface ShareBaseRequest {
  email: string;
  permissionLevel: string;
}

export interface UpdateCollaboratorRequest {
  permissionLevel: string;
}

/**
 * Base service
 */
export const baseService = {
  /**
   * Create a new base
   */
  async createBase(data: CreateBaseRequest): Promise<Base> {
    try {
      const response = await api.post('/', data);
      
      // Save to offline storage
      await offlineStorageService.saveBase(response.data.data, 'synced');
      
      return response.data.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Create offline base
        const offlineBase: Base = {
          id: `offline-base-${Date.now()}`,
          name: data.name,
          description: data.description,
          google_sheets_id: `offline-sheets-${Date.now()}`,
          owner_id: 'offline-user',
          permission_level: 'owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        await offlineStorageService.saveBase(offlineBase, 'pending');
        await offlineStorageService.addPendingChange('create', 'base', offlineBase.id, offlineBase);
        
        return offlineBase;
      }
      throw error;
    }
  },

  /**
   * Get all bases
   */
  async getAllBases(): Promise<Base[]> {
    try {
      const response = await api.get('/');
      
      // Save bases to offline storage
      for (const base of response.data.data) {
        await offlineStorageService.saveBase(base, 'synced');
      }
      
      return response.data.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Get from offline storage
        const offlineBases = await offlineStorageService.getAllBases();
        return offlineBases;
      }
      throw error;
    }
  },

  /**
   * Get all bases (alias for backward compatibility)
   */
  async getBases(): Promise<Base[]> {
    return baseService.getAllBases();
  },

  /**
   * Get base by ID
   */
  async getBase(baseId: string): Promise<Base> {
    try {
      const response = await api.get(`/${baseId}`);
      
      // Save to offline storage
      await offlineStorageService.saveBase(response.data.data, 'synced');
      
      return response.data.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Get from offline storage
        const offlineBase = await offlineStorageService.getBase(baseId);
        if (offlineBase) {
          return offlineBase;
        }
      }
      throw error;
    }
  },

  /**
   * Update base
   */
  async updateBase(baseId: string, data: UpdateBaseRequest): Promise<Base> {
    try {
      const response = await api.put(`/${baseId}`, data);
      
      // Save to offline storage
      await offlineStorageService.saveBase(response.data.data, 'synced');
      
      return response.data.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Update offline base
        const existingBase = await offlineStorageService.getBase(baseId);
        if (existingBase) {
          const updatedBase = {
            ...existingBase,
            ...data,
            updatedAt: new Date().toISOString(),
            version: (existingBase.version || 1) + 1,
          };
          
          await offlineStorageService.saveBase(updatedBase, 'pending');
          await offlineStorageService.addPendingChange('update', 'base', baseId, updatedBase);
          
          return updatedBase;
        }
      }
      throw error;
    }
  },

  /**
   * Delete base
   */
  async deleteBase(baseId: string): Promise<void> {
    try {
      await api.delete(`/${baseId}`);
      
      // Remove from offline storage (this will be handled by the server response)
    } catch (error) {
      if (!navigator.onLine) {
        // Mark for deletion offline
        await offlineStorageService.addPendingChange('delete', 'base', baseId, { deleted: true });
      } else {
        throw error;
      }
    }
  },

  /**
   * Share base with user
   */
  async shareBase(baseId: string, data: ShareBaseRequest): Promise<Collaborator> {
    const response = await api.post(`/${baseId}/share`, data);
    return response.data.data;
  },

  /**
   * Get base collaborators
   */
  async getCollaborators(baseId: string): Promise<Collaborator[]> {
    const response = await api.get(`/${baseId}/collaborators`);
    return response.data.data;
  },

  /**
   * Update collaborator permission
   */
  async updateCollaboratorPermission(baseId: string, collaboratorId: string, data: UpdateCollaboratorRequest): Promise<Collaborator> {
    const response = await api.put(`/${baseId}/collaborators/${collaboratorId}`, data);
    return response.data.data;
  },

  /**
   * Remove collaborator
   */
  async removeCollaborator(baseId: string, collaboratorId: string): Promise<void> {
    await api.delete(`/${baseId}/collaborators/${collaboratorId}`);
  },
};