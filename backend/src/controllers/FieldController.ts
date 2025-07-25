import { Request, Response, NextFunction } from 'express';
import { FieldService } from '../services/FieldService';
import { AppError } from '../middleware/errorHandler';

export class FieldController {
  private fieldService: FieldService;

  constructor() {
    this.fieldService = new FieldService();
  }

  /**
   * Create a new field
   */
  async createField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableId } = req.params;
      const userId = req.user.id;
      const fieldData = req.body;
      
      if (!fieldData.name || !fieldData.type) {
        throw new AppError('Field name and type are required', 400);
      }
      
      const field = await this.fieldService.createField(tableId, userId, {
        ...fieldData,
        table_id: tableId,
      });
      
      res.status(201).json({
        status: 'success',
        data: field,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get field by ID
   */
  async getField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fieldId } = req.params;
      const userId = req.user.id;
      
      const field = await this.fieldService.getField(fieldId, userId);
      
      res.status(200).json({
        status: 'success',
        data: field,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get fields by table ID
   */
  async getFields(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableId } = req.params;
      const userId = req.user.id;
      
      const fields = await this.fieldService.getFields(tableId, userId);
      
      res.status(200).json({
        status: 'success',
        data: fields,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update field
   */
  async updateField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fieldId } = req.params;
      const userId = req.user.id;
      const fieldData = req.body;
      
      const field = await this.fieldService.updateField(fieldId, userId, fieldData);
      
      res.status(200).json({
        status: 'success',
        data: field,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete field
   */
  async deleteField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fieldId } = req.params;
      const userId = req.user.id;
      
      await this.fieldService.deleteField(fieldId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'Field deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder fields
   */
  async reorderFields(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableId } = req.params;
      const { fieldIds } = req.body;
      const userId = req.user.id;
      
      if (!fieldIds || !Array.isArray(fieldIds)) {
        throw new AppError('Field IDs array is required', 400);
      }
      
      await this.fieldService.reorderFields(tableId, userId, fieldIds);
      
      res.status(200).json({
        status: 'success',
        message: 'Fields reordered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create link between fields
   */
  async createLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceFieldId, targetFieldId } = req.params;
      const userId = req.user.id;
      
      const link = await this.fieldService.createLink(sourceFieldId, targetFieldId, userId);
      
      res.status(201).json({
        status: 'success',
        data: link,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete link between fields
   */
  async deleteLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceFieldId, targetFieldId } = req.params;
      const userId = req.user.id;
      
      await this.fieldService.deleteLink(sourceFieldId, targetFieldId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'Link deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}