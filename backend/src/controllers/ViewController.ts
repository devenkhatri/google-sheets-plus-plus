import { Request, Response, NextFunction } from 'express';
import { ViewService } from '../services/ViewService';
import { AppError } from '../middleware/errorHandler';

export class ViewController {
  private viewService: ViewService;

  constructor() {
    this.viewService = new ViewService();
  }

  /**
   * Create a new view
   */
  async createView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableId } = req.params;
      const { name, type, configuration, filters, sorts, field_visibility } = req.body;
      const userId = req.user.id;
      
      if (!name || !type) {
        throw new AppError('View name and type are required', 400);
      }
      
      const view = await this.viewService.createView(tableId, userId, {
        name,
        type,
        configuration,
        filters,
        sorts,
        field_visibility,
      });
      
      res.status(201).json({
        status: 'success',
        data: view,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get view by ID
   */
  async getView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { viewId } = req.params;
      const userId = req.user.id;
      
      const view = await this.viewService.getView(viewId, userId);
      
      res.status(200).json({
        status: 'success',
        data: view,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get views by table ID
   */
  async getViewsByTableId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableId } = req.params;
      const userId = req.user.id;
      
      const views = await this.viewService.getViewsByTableId(tableId, userId);
      
      res.status(200).json({
        status: 'success',
        data: views,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update view
   */
  async updateView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { viewId } = req.params;
      const { name, type, configuration, filters, sorts, field_visibility } = req.body;
      const userId = req.user.id;
      
      const view = await this.viewService.updateView(viewId, userId, {
        name,
        type,
        configuration,
        filters,
        sorts,
        field_visibility,
      });
      
      res.status(200).json({
        status: 'success',
        data: view,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete view
   */
  async deleteView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { viewId } = req.params;
      const userId = req.user.id;
      
      await this.viewService.deleteView(viewId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'View deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Duplicate view
   */
  async duplicateView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { viewId } = req.params;
      const { name } = req.body;
      const userId = req.user.id;
      
      const view = await this.viewService.duplicateView(viewId, userId, name);
      
      res.status(201).json({
        status: 'success',
        data: view,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update view filters
   */
  async updateViewFilters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { viewId } = req.params;
      const { filters } = req.body;
      const userId = req.user.id;
      
      if (!filters) {
        throw new AppError('Filters are required', 400);
      }
      
      const view = await this.viewService.updateViewFilters(viewId, userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: view,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update view sorts
   */
  async updateViewSorts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { viewId } = req.params;
      const { sorts } = req.body;
      const userId = req.user.id;
      
      if (!sorts) {
        throw new AppError('Sorts are required', 400);
      }
      
      const view = await this.viewService.updateViewSorts(viewId, userId, sorts);
      
      res.status(200).json({
        status: 'success',
        data: view,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update view field visibility
   */
  async updateViewFieldVisibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { viewId } = req.params;
      const { field_visibility } = req.body;
      const userId = req.user.id;
      
      if (!field_visibility) {
        throw new AppError('Field visibility configuration is required', 400);
      }
      
      const view = await this.viewService.updateViewFieldVisibility(viewId, userId, field_visibility);
      
      res.status(200).json({
        status: 'success',
        data: view,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create view template
   */
  async createViewTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { viewId } = req.params;
      const { name } = req.body;
      const userId = req.user.id;
      
      if (!name) {
        throw new AppError('Template name is required', 400);
      }
      
      const template = await this.viewService.createViewTemplate(viewId, userId, name);
      
      res.status(201).json({
        status: 'success',
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Share view
   */
  async shareView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { viewId } = req.params;
      const { email, permissionLevel } = req.body;
      const userId = req.user.id;
      
      if (!email || !permissionLevel) {
        throw new AppError('Email and permission level are required', 400);
      }
      
      const shareResult = await this.viewService.shareView(viewId, userId, { email, permissionLevel });
      
      res.status(200).json({
        status: 'success',
        data: shareResult,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate view deep link
   */
  async generateViewDeepLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { viewId } = req.params;
      const userId = req.user.id;
      
      const deepLink = await this.viewService.generateViewDeepLink(viewId, userId);
      
      res.status(200).json({
        status: 'success',
        data: {
          deepLink,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}