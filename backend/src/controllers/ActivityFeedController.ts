import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ActivityFeedService } from '../services/ActivityFeedService';
import { BaseModel } from '../models/Base';
import { TableModel } from '../models/Table';
import { RecordModel } from '../models/Record';

export class ActivityFeedController extends BaseController {
  private activityFeedService: ActivityFeedService;
  
  constructor() {
    super();
    this.activityFeedService = ActivityFeedService.getInstance();
  }
  
  /**
   * Get activity feed for a base
   */
  public getBaseActivityFeed = async (req: Request, res: Response): Promise<void> => {
    try {
      const { baseId } = req.params;
      const { limit = '50', offset = '0' } = req.query;
      const userId = req.user!.id;
      
      // Validate base exists and user has access
      const { hasAccess } = await BaseModel.checkUserAccess(baseId, userId);
      
      if (!hasAccess) {
        return this.sendForbiddenResponse(res, 'You do not have access to this base');
      }
      
      const result = await this.activityFeedService.getBaseActivityFeed(
        baseId,
        parseInt(limit as string, 10),
        parseInt(offset as string, 10)
      );
      
      this.sendSuccessResponse(res, result);
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Get activity feed for a table
   */
  public getTableActivityFeed = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableId } = req.params;
      const { limit = '50', offset = '0' } = req.query;
      const userId = req.user!.id;
      
      // Validate table exists
      const table = await TableModel.findById(tableId);
      
      if (!table) {
        return this.sendNotFoundResponse(res, 'Table not found');
      }
      
      // Check if user has access to the base
      const { hasAccess } = await BaseModel.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        return this.sendForbiddenResponse(res, 'You do not have access to this table');
      }
      
      const result = await this.activityFeedService.getTableActivityFeed(
        tableId,
        parseInt(limit as string, 10),
        parseInt(offset as string, 10)
      );
      
      this.sendSuccessResponse(res, result);
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Get activity feed for a record
   */
  public getRecordActivityFeed = async (req: Request, res: Response): Promise<void> => {
    try {
      const { recordId } = req.params;
      const { limit = '50', offset = '0' } = req.query;
      const userId = req.user!.id;
      
      // Validate record exists
      const record = await RecordModel.findById(recordId);
      
      if (!record) {
        return this.sendNotFoundResponse(res, 'Record not found');
      }
      
      // Check if user has access to the base
      const { hasAccess } = await BaseModel.checkUserAccess(record.base_id, userId);
      
      if (!hasAccess) {
        return this.sendForbiddenResponse(res, 'You do not have access to this record');
      }
      
      const result = await this.activityFeedService.getRecordActivityFeed(
        recordId,
        parseInt(limit as string, 10),
        parseInt(offset as string, 10)
      );
      
      this.sendSuccessResponse(res, result);
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Get activity feed for the authenticated user
   */
  public getUserActivityFeed = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = '50', offset = '0' } = req.query;
      const userId = req.user!.id;
      
      const result = await this.activityFeedService.getUserActivityFeed(
        userId,
        parseInt(limit as string, 10),
        parseInt(offset as string, 10)
      );
      
      this.sendSuccessResponse(res, result);
    } catch (error) {
      this.handleError(res, error);
    }
  };
}