import axios from 'axios';
import { API_URL } from '../config';
import { offlineStorageService } from './offlineStorageService';

/**
 * Service for interacting with the Record API
 */
export const recordService = {
  /**
   * Create a new record
   */
  createRecord: async (tableId: string, fields: any, syncToSheets: boolean = true) => {
    try {
      const response = await axios.post(`${API_URL}/tables/${tableId}/records`, {
        fields,
        syncToSheets
      });
      
      // Save to offline storage
      await offlineStorageService.saveRecord(response.data, tableId, 'synced');
      
      return response.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Create offline record
        const offlineRecord = {
          id: `offline-${Date.now()}`,
          tableId,
          fields,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        };
        
        await offlineStorageService.saveRecord(offlineRecord, tableId, 'pending');
        await offlineStorageService.addPendingChange('create', 'record', offlineRecord.id, offlineRecord);
        
        return offlineRecord;
      }
      throw error;
    }
  },

  /**
   * Get record by ID
   */
  getRecord: async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/records/${id}`);
      
      // Save to offline storage
      const tableId = response.data.tableId;
      await offlineStorageService.saveRecord(response.data, tableId, 'synced');
      
      return response.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Try to get from offline storage
        const offlineRecord = await offlineStorageService.getRecord(id);
        if (offlineRecord) {
          return offlineRecord;
        }
      }
      throw error;
    }
  },

  /**
   * Get record by ID (alias for backward compatibility)
   */
  getRecordById: async (id: string) => {
    return recordService.getRecord(id);
  },

  /**
   * Get records by table ID with filtering and pagination
   */
  getRecords: async (
    tableId: string,
    options: {
      limit?: number;
      offset?: number;
      filters?: any[];
      sorts?: any[];
      includeDeleted?: boolean;
    } = {}
  ) => {
    try {
      const { limit = 100, offset = 0, filters, sorts, includeDeleted } = options;
      
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      
      if (filters) {
        params.append('filters', JSON.stringify(filters));
      }
      
      if (sorts) {
        params.append('sorts', JSON.stringify(sorts));
      }
      
      if (includeDeleted !== undefined) {
        params.append('includeDeleted', includeDeleted.toString());
      }
      
      const response = await axios.get(`${API_URL}/tables/${tableId}/records?${params.toString()}`);
      
      // Save records to offline storage
      if (response.data.records) {
        for (const record of response.data.records) {
          await offlineStorageService.saveRecord(record, tableId, 'synced');
        }
      }
      
      return response.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Get from offline storage
        const offlineRecords = await offlineStorageService.getRecordsByTable(tableId);
        return {
          records: offlineRecords,
          total: offlineRecords.length,
          hasMore: false,
        };
      }
      throw error;
    }
  },

  /**
   * Get records by table ID (alias for backward compatibility)
   */
  getRecordsByTableId: async (
    tableId: string,
    options: {
      limit?: number;
      offset?: number;
      filters?: any[];
      sorts?: any[];
      includeDeleted?: boolean;
    } = {}
  ) => {
    return recordService.getRecords(tableId, options);
  },

  /**
   * Update record
   */
  updateRecord: async (id: string, updates: { fields?: any; deleted?: boolean }, syncToSheets: boolean = true) => {
    try {
      const response = await axios.patch(`${API_URL}/records/${id}`, {
        ...updates,
        syncToSheets
      });
      
      // Save to offline storage
      const tableId = response.data.tableId;
      await offlineStorageService.saveRecord(response.data, tableId, 'synced');
      
      return response.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Update offline record
        const existingRecord = await offlineStorageService.getRecord(id);
        if (existingRecord) {
          const updatedRecord = {
            ...existingRecord,
            ...updates,
            updatedAt: new Date().toISOString(),
            version: (existingRecord.version || 1) + 1,
          };
          
          await offlineStorageService.saveRecord(updatedRecord, existingRecord.tableId, 'pending');
          await offlineStorageService.addPendingChange('update', 'record', id, updatedRecord);
          
          return updatedRecord;
        }
      }
      throw error;
    }
  },

  /**
   * Delete record
   */
  deleteRecord: async (id: string, syncToSheets: boolean = true) => {
    try {
      const response = await axios.delete(`${API_URL}/records/${id}`, {
        data: { syncToSheets }
      });
      
      // Remove from offline storage
      await offlineStorageService.deleteRecord(id);
      
      return response.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Mark as deleted offline
        await offlineStorageService.deleteRecord(id);
        await offlineStorageService.addPendingChange('delete', 'record', id, { deleted: true });
        
        return { success: true };
      }
      throw error;
    }
  },

  /**
   * Soft delete record (alias for backward compatibility)
   */
  softDeleteRecord: async (id: string, syncToSheets: boolean = true) => {
    return recordService.deleteRecord(id, syncToSheets);
  },

  /**
   * Restore soft-deleted record
   */
  restoreRecord: async (id: string, syncToSheets: boolean = true) => {
    const response = await axios.post(`${API_URL}/records/${id}/restore`, {
      syncToSheets
    });
    return response.data;
  },

  /**
   * Bulk create records
   */
  bulkCreateRecords: async (tableId: string, records: { fields: any; rowIndex?: number }[], syncToSheets: boolean = true) => {
    const response = await axios.post(`${API_URL}/tables/${tableId}/records/bulk`, {
      records,
      syncToSheets
    });
    return response.data;
  },

  /**
   * Bulk update records
   */
  bulkUpdateRecords: async (
    updates: { id: string; fields?: any; deleted?: boolean }[],
    syncToSheets: boolean = true
  ) => {
    const response = await axios.patch(`${API_URL}/records/bulk`, {
      updates,
      syncToSheets
    });
    return response.data;
  },

  /**
   * Sync records from Google Sheets
   */
  syncFromGoogleSheets: async (tableId: string) => {
    const response = await axios.post(`${API_URL}/tables/${tableId}/records/sync/from-sheets`);
    return response.data;
  },

  /**
   * Sync records to Google Sheets
   */
  syncToGoogleSheets: async (tableId: string) => {
    const response = await axios.post(`${API_URL}/tables/${tableId}/records/sync/to-sheets`);
    return response.data;
  }
};