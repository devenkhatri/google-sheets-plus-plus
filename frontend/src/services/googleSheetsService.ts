import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { authService } from './authService';

import { API_URL } from '../config';
const API_VERSION = '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}${API_VERSION}/sheets`,
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

// Socket.io connection
let socket: Socket | null = null;

/**
 * Initialize Socket.io connection
 */
function initializeSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      auth: {
        token: authService.getToken(),
      },
    });
    
    socket.on('connect', () => {
      console.log('Socket connected');
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }
  
  return socket;
}

/**
 * Google Sheets service
 */
export const googleSheetsService = {
  /**
   * Create a new spreadsheet
   */
  async createSpreadsheet(title: string): Promise<string> {
    const response = await api.post('/', { title });
    return response.data.data.spreadsheetId;
  },

  /**
   * Create a new sheet within a spreadsheet
   */
  async createSheet(spreadsheetId: string, title: string): Promise<number> {
    const response = await api.post(`/${spreadsheetId}/sheets`, { title });
    return response.data.data.sheetId;
  },

  /**
   * Get spreadsheet metadata
   */
  async getSpreadsheet(spreadsheetId: string): Promise<any> {
    const response = await api.get(`/${spreadsheetId}`);
    return response.data.data;
  },

  /**
   * Get values from a range in a spreadsheet
   */
  async getValues(spreadsheetId: string, range: string): Promise<any> {
    const response = await api.get(`/${spreadsheetId}/values/${encodeURIComponent(range)}`);
    return response.data.data;
  },

  /**
   * Update values in a range
   */
  async updateValues(spreadsheetId: string, range: string, values: any[][]): Promise<any> {
    const response = await api.put(`/${spreadsheetId}/values/${encodeURIComponent(range)}`, { values });
    return response.data.data;
  },

  /**
   * Append values to a range
   */
  async appendValues(spreadsheetId: string, range: string, values: any[][]): Promise<any> {
    const response = await api.post(`/${spreadsheetId}/values/${encodeURIComponent(range)}`, { values });
    return response.data.data;
  },

  /**
   * Batch update spreadsheet
   */
  async batchUpdate(spreadsheetId: string, requests: any[]): Promise<any> {
    const response = await api.post(`/${spreadsheetId}/batchUpdate`, { requests });
    return response.data.data;
  },

  /**
   * Queue batch update
   */
  async queueBatchUpdate(spreadsheetId: string, requests: any[]): Promise<string> {
    const response = await api.post(`/${spreadsheetId}/queueBatchUpdate`, { requests });
    return response.data.data.batchId;
  },

  /**
   * Process batch updates
   */
  async processBatchUpdates(spreadsheetId: string): Promise<void> {
    await api.post(`/${spreadsheetId}/processBatchUpdates`);
  },

  /**
   * Sync from Google Sheets
   */
  async syncFromGoogleSheets(spreadsheetId: string, sheetName: string, tableId: string): Promise<any[]> {
    const response = await api.post(`/${spreadsheetId}/syncFrom`, { sheetName, tableId });
    return response.data.data.records;
  },

  /**
   * Sync to Google Sheets
   */
  async syncToGoogleSheets(spreadsheetId: string, sheetName: string, tableId: string, records: any[], fields: any[]): Promise<void> {
    await api.post(`/${spreadsheetId}/syncTo`, { sheetName, tableId, records, fields });
  },

  /**
   * Get sync status
   */
  async getSyncStatus(tableId: string): Promise<any> {
    const response = await api.get(`/syncStatus/${tableId}`);
    return response.data.data;
  },

  /**
   * Subscribe to spreadsheet changes
   */
  subscribeToSpreadsheet(spreadsheetId: string, callback: (data: any) => void): () => void {
    const socket = initializeSocket();
    
    // Subscribe to spreadsheet changes
    socket.emit('subscribe_to_spreadsheet', spreadsheetId);
    
    // Listen for changes
    const handler = (data: any) => {
      if (data.spreadsheetId === spreadsheetId) {
        callback(data);
      }
    };
    
    socket.on('google_sheets_change', handler);
    
    // Return unsubscribe function
    return () => {
      socket.off('google_sheets_change', handler);
      socket.emit('unsubscribe_from_spreadsheet', spreadsheetId);
    };
  },

  /**
   * Subscribe to table sync status
   */
  subscribeToTableSyncStatus(tableId: string, callback: (data: any) => void): () => void {
    const socket = initializeSocket();
    
    // Subscribe to table sync status
    socket.emit('subscribe_to_table', tableId);
    
    // Listen for sync status updates
    const handler = (data: any) => {
      callback(data);
    };
    
    socket.on('sync_status', handler);
    
    // Return unsubscribe function
    return () => {
      socket.off('sync_status', handler);
      socket.emit('unsubscribe_from_table', tableId);
    };
  },

  /**
   * Close socket connection
   */
  closeSocket(): void {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },
};