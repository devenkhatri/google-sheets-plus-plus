import { Request, Response, NextFunction } from 'express';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { GoogleSheetsBatchService } from '../services/GoogleSheetsBatchService';
import { GoogleSheetsSyncService } from '../services/GoogleSheetsSyncService';
import { GoogleSheetsWebhookService } from '../services/GoogleSheetsWebhookService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class GoogleSheetsController {
  /**
   * Create a new spreadsheet
   */
  static async createSpreadsheet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title } = req.body;
      
      if (!title) {
        throw new AppError('Spreadsheet title is required', 400);
      }
      
      const sheetsService = GoogleSheetsService.getInstance();
      const spreadsheetId = await sheetsService.createSpreadsheet(title);
      
      res.status(201).json({
        status: 'success',
        data: {
          spreadsheetId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new sheet within a spreadsheet
   */
  static async createSheet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { spreadsheetId } = req.params;
      const { title } = req.body;
      
      if (!title) {
        throw new AppError('Sheet title is required', 400);
      }
      
      const sheetsService = GoogleSheetsService.getInstance();
      const sheetId = await sheetsService.createSheet(spreadsheetId, title);
      
      res.status(201).json({
        status: 'success',
        data: {
          sheetId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get spreadsheet metadata
   */
  static async getSpreadsheet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { spreadsheetId } = req.params;
      
      const sheetsService = GoogleSheetsService.getInstance();
      const spreadsheet = await sheetsService.getSpreadsheet(spreadsheetId);
      
      res.status(200).json({
        status: 'success',
        data: spreadsheet,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get values from a range in a spreadsheet
   */
  static async getValues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { spreadsheetId, range } = req.params;
      
      const sheetsService = GoogleSheetsService.getInstance();
      const values = await sheetsService.getValues(spreadsheetId, range);
      
      res.status(200).json({
        status: 'success',
        data: values,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update values in a range
   */
  static async updateValues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { spreadsheetId, range } = req.params;
      const { values } = req.body;
      
      if (!values || !Array.isArray(values)) {
        throw new AppError('Values must be a 2D array', 400);
      }
      
      const sheetsService = GoogleSheetsService.getInstance();
      const result = await sheetsService.updateValues(spreadsheetId, range, values);
      
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Append values to a range
   */
  static async appendValues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { spreadsheetId, range } = req.params;
      const { values } = req.body;
      
      if (!values || !Array.isArray(values)) {
        throw new AppError('Values must be a 2D array', 400);
      }
      
      const sheetsService = GoogleSheetsService.getInstance();
      const result = await sheetsService.appendValues(spreadsheetId, range, values);
      
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch update spreadsheet
   */
  static async batchUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { spreadsheetId } = req.params;
      const { requests } = req.body;
      
      if (!requests || !Array.isArray(requests)) {
        throw new AppError('Requests must be an array', 400);
      }
      
      const sheetsService = GoogleSheetsService.getInstance();
      const result = await sheetsService.batchUpdate(spreadsheetId, requests);
      
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Queue batch update
   */
  static async queueBatchUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { spreadsheetId } = req.params;
      const { requests } = req.body;
      
      if (!requests || !Array.isArray(requests)) {
        throw new AppError('Requests must be an array', 400);
      }
      
      const batchService = GoogleSheetsBatchService.getInstance();
      const batchId = await batchService.queueBatchUpdate(spreadsheetId, requests);
      
      res.status(202).json({
        status: 'success',
        data: {
          batchId,
          message: 'Batch update queued for processing',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process batch updates
   */
  static async processBatchUpdates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { spreadsheetId } = req.params;
      
      const batchService = GoogleSheetsBatchService.getInstance();
      await batchService.processBatchUpdates(spreadsheetId);
      
      res.status(200).json({
        status: 'success',
        message: 'Batch updates processed',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync from Google Sheets
   */
  static async syncFromGoogleSheets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { spreadsheetId } = req.params;
      const { sheetName, tableId } = req.body;
      
      if (!sheetName || !tableId) {
        throw new AppError('Sheet name and table ID are required', 400);
      }
      
      const syncService = GoogleSheetsSyncService.getInstance();
      const records = await syncService.syncFromGoogleSheets(spreadsheetId, sheetName, tableId);
      
      res.status(200).json({
        status: 'success',
        data: {
          records,
          count: records.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync to Google Sheets
   */
  static async syncToGoogleSheets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { spreadsheetId } = req.params;
      const { sheetName, tableId, records, fields } = req.body;
      
      if (!sheetName || !tableId || !records || !fields) {
        throw new AppError('Sheet name, table ID, records, and fields are required', 400);
      }
      
      if (!Array.isArray(records) || !Array.isArray(fields)) {
        throw new AppError('Records and fields must be arrays', 400);
      }
      
      const syncService = GoogleSheetsSyncService.getInstance();
      await syncService.syncToGoogleSheets(spreadsheetId, sheetName, tableId, records, fields);
      
      res.status(200).json({
        status: 'success',
        message: 'Data synced to Google Sheets',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sync status
   */
  static async getSyncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableId } = req.params;
      
      const syncService = GoogleSheetsSyncService.getInstance();
      const status = await syncService.getSyncStatus(tableId);
      
      res.status(200).json({
        status: 'success',
        data: status || { status: 'unknown', message: 'No sync status found' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle webhook
   */
  static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body;
      
      // Verify webhook signature (implementation depends on Google's webhook format)
      // This is a placeholder for actual verification logic
      
      const webhookService = GoogleSheetsWebhookService.getInstance();
      await webhookService.handleWebhook(payload);
      
      res.status(200).json({
        status: 'success',
        message: 'Webhook processed',
      });
    } catch (error) {
      logger.error('Error handling webhook:', error);
      
      // Always return 200 to Google to prevent retries
      res.status(200).json({
        status: 'error',
        message: 'Error processing webhook',
      });
    }
  }
}