import { Request, Response, NextFunction } from 'express';
import { RecordService } from '../services/RecordService';
import { BaseController } from './BaseController';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Controller for Record operations
 */
export class RecordController extends BaseController {
  private recordService: RecordService;

  constructor() {
    super();
    this.recordService = new RecordService();
  }

  /**
   * Create a new record
   */
  public createRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tableId } = req.params;
      const { fields, syncToSheets = true } = req.body;
      const userId = req.user?.id;

      // Validate required fields
      if (!tableId) {
        throw new AppError('Table ID is required', 400);
      }

      if (!fields || typeof fields !== 'object') {
        throw new AppError('Fields are required and must be an object', 400);
      }

      // Create record
      const record = await this.recordService.createRecord(
        {
          table_id: tableId,
          fields,
          created_by: userId
        },
        syncToSheets
      );

      this.sendResponse(res, 201, 'Record created successfully', { record });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get record by ID
   */
  public getRecordById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Get record
      const record = await this.recordService.getRecordById(id);

      this.sendResponse(res, 200, 'Record retrieved successfully', { record });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get records by table ID with filtering and pagination
   */
  public getRecordsByTableId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tableId } = req.params;
      const { 
        limit = 100, 
        offset = 0, 
        filters, 
        sorts, 
        includeDeleted = false 
      } = req.query;

      // Parse query parameters
      const options = {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        filters: filters ? JSON.parse(filters as string) : [],
        sorts: sorts ? JSON.parse(sorts as string) : [],
        includeDeleted: includeDeleted === 'true'
      };

      // Get records
      const { records, total } = await this.recordService.getRecordsByTableId(tableId, options);

      this.sendResponse(res, 200, 'Records retrieved successfully', { 
        records,
        pagination: {
          total,
          limit: options.limit,
          offset: options.offset,
          hasMore: total > options.offset + records.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update record
   */
  public updateRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { fields, deleted, syncToSheets = true } = req.body;
      const userId = req.user?.id;

      // Validate request
      if (!fields && deleted === undefined) {
        throw new AppError('No updates provided', 400);
      }

      // Update record
      const record = await this.recordService.updateRecord(
        id,
        {
          fields,
          deleted,
          updated_by: userId
        },
        syncToSheets
      );

      this.sendResponse(res, 200, 'Record updated successfully', { record });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Soft delete record
   */
  public softDeleteRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { syncToSheets = true } = req.body;
      const userId = req.user?.id;

      // Delete record
      const deleted = await this.recordService.softDeleteRecord(id, userId, syncToSheets);

      if (deleted) {
        this.sendResponse(res, 200, 'Record deleted successfully');
      } else {
        throw new AppError('Record not found', 404);
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Restore soft-deleted record
   */
  public restoreRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { syncToSheets = true } = req.body;
      const userId = req.user?.id;

      // Restore record
      const record = await this.recordService.restoreRecord(id, userId, syncToSheets);

      if (record) {
        this.sendResponse(res, 200, 'Record restored successfully', { record });
      } else {
        throw new AppError('Record not found or not deleted', 404);
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk create records
   */
  public bulkCreateRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tableId } = req.params;
      const { records, syncToSheets = true } = req.body;
      const userId = req.user?.id;

      // Validate request
      if (!Array.isArray(records) || records.length === 0) {
        throw new AppError('Records must be a non-empty array', 400);
      }

      // Prepare records with table ID and user ID
      const recordsToCreate = records.map(record => ({
        table_id: tableId,
        fields: record.fields,
        row_index: record.rowIndex,
        created_by: userId
      }));

      // Create records
      const createdRecords = await this.recordService.bulkCreateRecords(recordsToCreate, syncToSheets);

      this.sendResponse(res, 201, 'Records created successfully', { 
        records: createdRecords,
        count: createdRecords.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk update records
   */
  public bulkUpdateRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { updates, syncToSheets = true } = req.body;
      const userId = req.user?.id;

      // Validate request
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new AppError('Updates must be a non-empty array', 400);
      }

      // Prepare updates with user ID
      const updatesToApply = updates.map(update => ({
        id: update.id,
        data: {
          fields: update.fields,
          deleted: update.deleted,
          updated_by: userId
        }
      }));

      // Update records
      const updatedRecords = await this.recordService.bulkUpdateRecords(updatesToApply, syncToSheets);

      this.sendResponse(res, 200, 'Records updated successfully', { 
        records: updatedRecords,
        count: updatedRecords.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Sync records from Google Sheets
   */
  public syncFromGoogleSheets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tableId } = req.params;

      // Sync records
      const result = await this.recordService.syncFromGoogleSheets(tableId);

      this.sendResponse(res, 200, 'Records synced successfully from Google Sheets', result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Sync records to Google Sheets
   */
  public syncToGoogleSheets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tableId } = req.params;

      // Sync records
      await this.recordService.syncToGoogleSheets(tableId);

      this.sendResponse(res, 200, 'Records synced successfully to Google Sheets');
    } catch (error) {
      next(error);
    }
  };
}