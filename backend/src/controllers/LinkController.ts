import { Request, Response, NextFunction } from 'express';
import { LinkService } from '../services/LinkService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class LinkController {
  private linkService: LinkService;
  
  constructor() {
    this.linkService = new LinkService();
  }
  
  /**
   * Create a link between two fields
   */
  public createLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sourceFieldId, targetFieldId } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }
      
      if (!sourceFieldId || !targetFieldId) {
        throw new AppError('Source field ID and target field ID are required', 400);
      }
      
      const link = await this.linkService.createLink(sourceFieldId, targetFieldId);
      
      res.status(201).json({
        success: true,
        data: link,
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Delete a link
   */
  public deleteLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      const success = await this.linkService.deleteLink(id);
      
      if (!success) {
        throw new AppError('Link not found', 404);
      }
      
      res.status(200).json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get links for a field
   */
  public getLinksForField = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fieldId } = req.params;
      
      const links = await this.linkService.getLinksForField(fieldId);
      
      res.status(200).json({
        success: true,
        data: links,
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Link two records
   */
  public linkRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { linkId, sourceRecordId, targetRecordId } = req.body;
      
      if (!linkId || !sourceRecordId || !targetRecordId) {
        throw new AppError('Link ID, source record ID, and target record ID are required', 400);
      }
      
      const linkRecord = await this.linkService.linkRecords(linkId, sourceRecordId, targetRecordId);
      
      res.status(201).json({
        success: true,
        data: linkRecord,
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Unlink two records
   */
  public unlinkRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { linkId, sourceRecordId, targetRecordId } = req.body;
      
      if (!linkId || !sourceRecordId || !targetRecordId) {
        throw new AppError('Link ID, source record ID, and target record ID are required', 400);
      }
      
      const success = await this.linkService.unlinkRecords(linkId, sourceRecordId, targetRecordId);
      
      if (!success) {
        throw new AppError('Link record not found', 404);
      }
      
      res.status(200).json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get linked records for a record and field
   */
  public getLinkedRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordId, fieldId } = req.params;
      
      const linkedRecords = await this.linkService.getLinkedRecords(recordId, fieldId);
      
      res.status(200).json({
        success: true,
        data: linkedRecords,
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get lookup value for a record and field
   */
  public getLookupValue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordId, fieldId } = req.params;
      
      const lookupValue = await this.linkService.getLookupValue(recordId, fieldId);
      
      res.status(200).json({
        success: true,
        data: lookupValue,
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get rollup value for a record and field
   */
  public getRollupValue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordId, fieldId } = req.params;
      
      const rollupValue = await this.linkService.getRollupValue(recordId, fieldId);
      
      res.status(200).json({
        success: true,
        data: rollupValue,
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Update dependent fields for a record
   */
  public updateDependentFields = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordId } = req.params;
      
      await this.linkService.updateDependentFields(recordId);
      
      res.status(200).json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
}