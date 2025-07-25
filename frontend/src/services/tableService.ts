import axios from 'axios';
import { authService } from './authService';
import { Table } from './baseService';
import { offlineStorageService } from './offlineStorageService';

import { API_URL } from '../config';
const API_VERSION = '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}${API_VERSION}/tables`,
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

export interface CreateTableRequest {
  name: string;
  description?: string;
  fields?: CreateFieldRequest[];
}

export interface CreateFieldRequest {
  name: string;
  type: string;
  options?: any;
  required?: boolean;
  description?: string;
}

export interface UpdateTableRequest {
  name?: string;
  description?: string;
}

export interface SyncTableRequest {
  direction: 'from' | 'to';
}

export interface SyncResult {
  message: string;
  records_count: number;
}

/**
 * Table service
 */
export const tableService = {
  /**
   * Create a new table
   */
  async createTable(baseId: string, data: CreateTableRequest): Promise<Table> {
    try {
      const response = await api.post(`/base/${baseId}`, data);
      
      // Save to offline storage
      await offlineStorageService.saveTable(response.data.data, 'synced');
      
      return response.data.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Create offline table
        const offlineTable: Table = {
          id: `offline-table-${Date.now()}`,
          base_id: baseId,
          name: data.name,
          description: data.description,
          google_sheet_id: 0,
          google_sheet_name: data.name,
          record_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        await offlineStorageService.saveTable(offlineTable, 'pending');
        await offlineStorageService.addPendingChange('create', 'table', offlineTable.id, offlineTable);
        
        return offlineTable;
      }
      throw error;
    }
  },

  /**
   * Get tables by base ID
   */
  async getTablesByBase(baseId: string): Promise<Table[]> {
    try {
      const response = await api.get(`/base/${baseId}`);
      
      // Save tables to offline storage
      for (const table of response.data.data) {
        await offlineStorageService.saveTable(table, 'synced');
      }
      
      return response.data.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Get from offline storage
        const offlineTables = await offlineStorageService.getTablesByBase(baseId);
        return offlineTables;
      }
      throw error;
    }
  },

  /**
   * Get tables by base ID (alias for backward compatibility)
   */
  async getTables(baseId: string): Promise<Table[]> {
    return tableService.getTablesByBase(baseId);
  },

  /**
   * Get table by ID
   */
  async getTable(tableId: string): Promise<Table> {
    try {
      const response = await api.get(`/${tableId}`);
      
      // Save to offline storage
      await offlineStorageService.saveTable(response.data.data, 'synced');
      
      return response.data.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Get from offline storage
        const offlineTable = await offlineStorageService.getTable(tableId);
        if (offlineTable) {
          return offlineTable;
        }
      }
      throw error;
    }
  },

  /**
   * Update table
   */
  async updateTable(tableId: string, data: UpdateTableRequest): Promise<Table> {
    try {
      const response = await api.put(`/${tableId}`, data);
      
      // Save to offline storage
      await offlineStorageService.saveTable(response.data.data, 'synced');
      
      return response.data.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Update offline table
        const existingTable = await offlineStorageService.getTable(tableId);
        if (existingTable) {
          const updatedTable = {
            ...existingTable,
            ...data,
            updatedAt: new Date().toISOString(),
            version: (existingTable.version || 1) + 1,
          };
          
          await offlineStorageService.saveTable(updatedTable, 'pending');
          await offlineStorageService.addPendingChange('update', 'table', tableId, updatedTable);
          
          return updatedTable;
        }
      }
      throw error;
    }
  },

  /**
   * Delete table
   */
  async deleteTable(tableId: string): Promise<void> {
    try {
      await api.delete(`/${tableId}`);
      
      // Remove from offline storage (this will be handled by the server response)
    } catch (error) {
      if (!navigator.onLine) {
        // Mark for deletion offline
        await offlineStorageService.addPendingChange('delete', 'table', tableId, { deleted: true });
      } else {
        throw error;
      }
    }
  },

  /**
   * Sync table with Google Sheets
   */
  async syncTable(tableId: string, data: SyncTableRequest): Promise<SyncResult> {
    const response = await api.post(`/${tableId}/sync`, data);
    return response.data.data;
  },
};