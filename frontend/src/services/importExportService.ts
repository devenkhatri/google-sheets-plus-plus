import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Service for handling import and export operations
 */
export const importExportService = {
  /**
   * Import data from a file
   * @param file The file to import
   * @param options Import options
   * @returns Job ID for tracking progress
   */
  async importData(file: File, options: {
    detectFieldTypes: boolean;
    headerRow: boolean;
    sheetIndex?: number;
    createTable: boolean;
    tableId?: string;
    baseId?: string;
    tableName?: string;
  }): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add options to form data
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });
    
    const response = await axios.post(`${API_BASE_URL}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.jobId;
  },
  
  /**
   * Get import progress
   * @param jobId The job ID
   * @returns Import progress
   */
  async getImportProgress(jobId: string): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/import/${jobId}/progress`);
    return response.data;
  },
  
  /**
   * Export data to a file
   * @param tableId The table ID
   * @param options Export options
   */
  exportData(tableId: string, options: {
    format: 'csv' | 'xlsx' | 'json';
    includeHeaders?: boolean;
    fileName?: string;
    viewId?: string;
  }): void {
    // Build query string
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    
    // Create download URL
    const downloadUrl = `${API_BASE_URL}/export/${tableId}?${queryParams.toString()}`;
    
    // Trigger file download
    window.open(downloadUrl, '_blank');
  }
};