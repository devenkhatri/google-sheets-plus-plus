import { GoogleSheetsService } from './GoogleSheetsService';
import { GoogleSheetsBatchService } from './GoogleSheetsBatchService';
import { GoogleSheetsWebhookService } from './GoogleSheetsWebhookService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { redisClient } from '../config/redis';
import { io } from '../index';

/**
 * Service for synchronizing data between the application and Google Sheets
 */
export class GoogleSheetsSyncService {
  private static instance: GoogleSheetsSyncService;
  private sheetsService: GoogleSheetsService;
  private batchService: GoogleSheetsBatchService;
  private webhookService: GoogleSheetsWebhookService;
  private readonly SYNC_LOCK_PREFIX = 'google_sheets_sync_lock:';
  private readonly SYNC_LOCK_TTL = 60; // 60 seconds
  private readonly SYNC_STATUS_PREFIX = 'google_sheets_sync_status:';

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.sheetsService = GoogleSheetsService.getInstance();
    this.batchService = GoogleSheetsBatchService.getInstance();
    this.webhookService = GoogleSheetsWebhookService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): GoogleSheetsSyncService {
    if (!GoogleSheetsSyncService.instance) {
      GoogleSheetsSyncService.instance = new GoogleSheetsSyncService();
    }
    return GoogleSheetsSyncService.instance;
  }

  /**
   * Sync data from Google Sheets to the application
   */
  public async syncFromGoogleSheets(
    spreadsheetId: string,
    sheetName: string,
    tableId: string
  ): Promise<any[]> {
    try {
      // Acquire sync lock
      const lockKey = `${this.SYNC_LOCK_PREFIX}${spreadsheetId}:${sheetName}`;
      const lockAcquired = await redisClient.set(lockKey, '1', { EX: this.SYNC_LOCK_TTL, NX: true });
      
      if (!lockAcquired) {
        throw new AppError('Sync already in progress', 409);
      }
      
      try {
        // Update sync status
        await this.updateSyncStatus(tableId, 'in_progress', 'Fetching data from Google Sheets');
        
        // Get data from Google Sheets
        const range = `${sheetName}!A1:ZZ`;
        const response = await this.sheetsService.getValues(spreadsheetId, range);
        
        if (!response.values || response.values.length === 0) {
          await this.updateSyncStatus(tableId, 'completed', 'No data found in Google Sheets');
          return [];
        }
        
        // Extract headers and data
        const headers = response.values[0];
        const rows = response.values.slice(1);
        
        // Convert to records
        const records = rows.map((row, index) => {
          const record: any = { rowIndex: index + 1 };
          
          headers.forEach((header, colIndex) => {
            if (header) {
              record[header.toString()] = colIndex < row.length ? row[colIndex] : null;
            }
          });
          
          return record;
        });
        
        // Update sync status
        await this.updateSyncStatus(
          tableId,
          'completed',
          `Successfully synced ${records.length} records from Google Sheets`
        );
        
        return records;
      } finally {
        // Release lock
        await redisClient.del(lockKey);
      }
    } catch (error) {
      logger.error(
        `Error syncing from Google Sheets ${spreadsheetId}, sheet ${sheetName}:`,
        error
      );
      
      // Update sync status
      await this.updateSyncStatus(
        tableId,
        'failed',
        `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      
      throw error;
    }
  }

  /**
   * Sync data from the application to Google Sheets
   */
  public async syncToGoogleSheets(
    spreadsheetId: string,
    sheetName: string,
    tableId: string,
    records: any[],
    fields: any[]
  ): Promise<void> {
    try {
      // Acquire sync lock
      const lockKey = `${this.SYNC_LOCK_PREFIX}${spreadsheetId}:${sheetName}`;
      const lockAcquired = await redisClient.set(lockKey, '1', { EX: this.SYNC_LOCK_TTL, NX: true });
      
      if (!lockAcquired) {
        throw new AppError('Sync already in progress', 409);
      }
      
      try {
        // Update sync status
        await this.updateSyncStatus(tableId, 'in_progress', 'Preparing data for Google Sheets');
        
        // Prepare headers
        const headers = fields.map(field => field.name);
        
        // Prepare data rows
        const rows = records.map(record => {
          return fields.map(field => {
            const value = record.fields[field.id];
            
            // Format value based on field type
            switch (field.type) {
              case 'date':
                return value ? new Date(value).toISOString().split('T')[0] : '';
              case 'checkbox':
                return value ? 'TRUE' : 'FALSE';
              case 'multiSelect':
                return Array.isArray(value) ? value.join(', ') : '';
              default:
                return value !== undefined && value !== null ? value.toString() : '';
            }
          });
        });
        
        // Combine headers and rows
        const values = [headers, ...rows];
        
        // Update sync status
        await this.updateSyncStatus(tableId, 'in_progress', 'Uploading data to Google Sheets');
        
        // Clear existing data
        const range = `${sheetName}!A1:ZZ`;
        await this.sheetsService.updateValues(spreadsheetId, range, values);
        
        // Format header row
        await this.sheetsService.formatCells(
          spreadsheetId,
          0, // Assuming sheetId is 0, should be retrieved from spreadsheet metadata
          0,
          1,
          0,
          headers.length,
          {
            textFormat: { bold: true },
            backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
          }
        );
        
        // Update sync status
        await this.updateSyncStatus(
          tableId,
          'completed',
          `Successfully synced ${records.length} records to Google Sheets`
        );
      } finally {
        // Release lock
        await redisClient.del(lockKey);
      }
    } catch (error) {
      logger.error(
        `Error syncing to Google Sheets ${spreadsheetId}, sheet ${sheetName}:`,
        error
      );
      
      // Update sync status
      await this.updateSyncStatus(
        tableId,
        'failed',
        `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      
      throw error;
    }
  }

  /**
   * Update a single record in Google Sheets
   */
  public async updateRecord(
    spreadsheetId: string,
    sheetName: string,
    rowIndex: number,
    fields: any[],
    recordData: any
  ): Promise<void> {
    try {
      // Prepare row data
      const rowData = fields.map(field => {
        const value = recordData[field.id];
        
        // Format value based on field type
        switch (field.type) {
          case 'date':
            return value ? new Date(value).toISOString().split('T')[0] : '';
          case 'checkbox':
            return value ? 'TRUE' : 'FALSE';
          case 'multiSelect':
            return Array.isArray(value) ? value.join(', ') : '';
          default:
            return value !== undefined && value !== null ? value.toString() : '';
        }
      });
      
      // Update row in Google Sheets
      const range = `${sheetName}!A${rowIndex + 1}:${this.columnIndexToLetter(fields.length)}${rowIndex + 1}`;
      await this.sheetsService.updateValues(spreadsheetId, range, [rowData]);
    } catch (error) {
      logger.error(
        `Error updating record in Google Sheets ${spreadsheetId}, sheet ${sheetName}, row ${rowIndex}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create a new record in Google Sheets
   */
  public async createRecord(
    spreadsheetId: string,
    sheetName: string,
    fields: any[],
    recordData: any
  ): Promise<number> {
    try {
      // Prepare row data
      const rowData = fields.map(field => {
        const value = recordData[field.id];
        
        // Format value based on field type
        switch (field.type) {
          case 'date':
            return value ? new Date(value).toISOString().split('T')[0] : '';
          case 'checkbox':
            return value ? 'TRUE' : 'FALSE';
          case 'multiSelect':
            return Array.isArray(value) ? value.join(', ') : '';
          default:
            return value !== undefined && value !== null ? value.toString() : '';
        }
      });
      
      // Append row to Google Sheets
      const range = `${sheetName}!A:${this.columnIndexToLetter(fields.length)}`;
      const response = await this.sheetsService.appendValues(spreadsheetId, range, [rowData]);
      
      // Extract row index from updated range
      const updatedRange = response.updates?.updatedRange;
      if (!updatedRange) {
        throw new AppError('Failed to get updated range', 500);
      }
      
      const match = updatedRange.match(/(\d+):/);
      if (!match || !match[1]) {
        throw new AppError('Failed to extract row index from updated range', 500);
      }
      
      return parseInt(match[1], 10);
    } catch (error) {
      logger.error(
        `Error creating record in Google Sheets ${spreadsheetId}, sheet ${sheetName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete a record in Google Sheets
   */
  public async deleteRecord(
    spreadsheetId: string,
    sheetId: number,
    rowIndex: number
  ): Promise<void> {
    try {
      // Delete row in Google Sheets
      await this.sheetsService.deleteRows(spreadsheetId, sheetId, rowIndex, rowIndex + 1);
    } catch (error) {
      logger.error(
        `Error deleting record in Google Sheets ${spreadsheetId}, sheet ${sheetId}, row ${rowIndex}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(
    tableId: string,
    status: 'in_progress' | 'completed' | 'failed',
    message: string
  ): Promise<void> {
    const statusKey = `${this.SYNC_STATUS_PREFIX}${tableId}`;
    const statusData = {
      status,
      message,
      timestamp: Date.now(),
    };
    
    // Store in Redis with 1 hour expiry
    await redisClient.set(statusKey, JSON.stringify(statusData), { EX: 3600 });
    
    // Emit event to clients
    io.to(`table:${tableId}`).emit('sync_status', statusData);
  }

  /**
   * Get sync status
   */
  public async getSyncStatus(tableId: string): Promise<any | null> {
    const statusKey = `${this.SYNC_STATUS_PREFIX}${tableId}`;
    const statusData = await redisClient.get(statusKey);
    
    if (!statusData) {
      return null;
    }
    
    return JSON.parse(statusData);
  }

  /**
   * Convert column index to letter (e.g., 0 -> A, 25 -> Z, 26 -> AA)
   */
  private columnIndexToLetter(index: number): string {
    let letter = '';
    
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    
    return letter;
  }
}