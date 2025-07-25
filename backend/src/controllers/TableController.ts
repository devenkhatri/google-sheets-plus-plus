import { Request, Response, NextFunction } from 'express';
import { TableService } from '../services/TableService';
import { AppError } from '../middleware/errorHandler';

export class TableController {
  private tableService: TableService;

  constructor() {
    this.tableService = new TableService();
  }

  /**
   * Create a new table
   */
  async createTable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baseId } = req.params;
      const { name, description, fields } = req.body;
      const userId = req.user.id;
      
      if (!name) {
        throw new AppError('Table name is required', 400);
      }
      
      const table = await this.tableService.createTable(baseId, userId, name, description, fields);
      
      res.status(201).json({
        status: 'success',
        data: table,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get table by ID
   */
  async getTable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableId } = req.params;
      const userId = req.user.id;
      
      const table = await this.tableService.getTable(tableId, userId);
      
      res.status(200).json({
        status: 'success',
        data: table,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tables by base ID
   */
  async getTables(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baseId } = req.params;
      const userId = req.user.id;
      
      const tables = await this.tableService.getTables(baseId, userId);
      
      res.status(200).json({
        status: 'success',
        data: tables,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update table
   */
  async updateTable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableId } = req.params;
      const { name, description } = req.body;
      const userId = req.user.id;
      
      const table = await this.tableService.updateTable(tableId, userId, { name, description });
      
      res.status(200).json({
        status: 'success',
        data: table,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete table
   */
  async deleteTable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableId } = req.params;
      const userId = req.user.id;
      
      await this.tableService.deleteTable(tableId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'Table deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync table with Google Sheets
   */
  async syncTable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableId } = req.params;
      const { direction = 'from' } = req.body;
      const userId = req.user.id;
      
      if (!['from', 'to'].includes(direction)) {
        throw new AppError('Invalid sync direction. Must be "from" or "to"', 400);
      }
      
      const result = await this.tableService.syncTable(tableId, userId, direction as 'from' | 'to');
      
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}