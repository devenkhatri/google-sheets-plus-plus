import { Request, Response, NextFunction } from 'express';
import { BaseService } from '../services/BaseService';
import { AppError } from '../middleware/errorHandler';

export class BaseController {
  private baseService: BaseService;

  constructor() {
    this.baseService = new BaseService();
  }

  // Response helper methods
  protected sendResponse(res: Response, statusCode: number, message: string, data?: any): void {
    res.status(statusCode).json({
      success: statusCode < 400,
      message,
      data
    });
  }

  protected sendSuccessResponse(res: Response, data: any, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      data
    });
  }

  protected sendErrorResponse(res: Response, message: string, statusCode: number = 500, error?: any): void {
    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }

  protected sendNotFoundResponse(res: Response, message: string = 'Resource not found'): void {
    res.status(404).json({
      success: false,
      message
    });
  }

  protected sendForbiddenResponse(res: Response, message: string = 'Access forbidden'): void {
    res.status(403).json({
      success: false,
      message
    });
  }

  protected sendValidationError(res: Response, errors: any): void {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  protected handleError(res: Response, error: any): void {
    console.error('Controller error:', error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    this.sendErrorResponse(res, message, statusCode, error);
  }

  protected badRequest(res: Response, message: string): void {
    res.status(400).json({
      success: false,
      message
    });
  }

  protected ok(res: Response, data: any): void {
    res.status(200).json({
      success: true,
      data
    });
  }

  protected notFound(res: Response, message: string): void {
    res.status(404).json({
      success: false,
      message
    });
  }

  protected sendSuccess(res: Response, data: any, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      data
    });
  }

  protected sendError(res: Response, message: string, statusCode: number = 500): void {
    res.status(statusCode).json({
      success: false,
      message
    });
  }

  /**
   * Create a new base
   */
  async createBase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description } = req.body;
      const userId = req.user.id;
      
      if (!name) {
        throw new AppError('Base name is required', 400);
      }
      
      const base = await this.baseService.createBase(userId, name, description);
      
      res.status(201).json({
        status: 'success',
        data: base,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get base by ID
   */
  async getBase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baseId } = req.params;
      const userId = req.user.id;
      
      const base = await this.baseService.getBase(baseId, userId);
      
      res.status(200).json({
        status: 'success',
        data: base,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bases for user
   */
  async getBases(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      
      const bases = await this.baseService.getBases(userId);
      
      res.status(200).json({
        status: 'success',
        data: bases,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update base
   */
  async updateBase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baseId } = req.params;
      const { name, description } = req.body;
      const userId = req.user.id;
      
      const base = await this.baseService.updateBase(baseId, userId, { name, description });
      
      res.status(200).json({
        status: 'success',
        data: base,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete base
   */
  async deleteBase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baseId } = req.params;
      const userId = req.user.id;
      
      await this.baseService.deleteBase(baseId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'Base deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Share base with user
   */
  async shareBase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baseId } = req.params;
      const { email, permissionLevel } = req.body;
      const userId = req.user.id;
      
      if (!email || !permissionLevel) {
        throw new AppError('Email and permission level are required', 400);
      }
      
      const collaborator = await this.baseService.shareBase(baseId, userId, email, permissionLevel);
      
      res.status(200).json({
        status: 'success',
        data: collaborator,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get base collaborators
   */
  async getCollaborators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baseId } = req.params;
      const userId = req.user.id;
      
      const collaborators = await this.baseService.getCollaborators(baseId, userId);
      
      res.status(200).json({
        status: 'success',
        data: collaborators,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update collaborator permission
   */
  async updateCollaboratorPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baseId, collaboratorId } = req.params;
      const { permissionLevel } = req.body;
      const userId = req.user.id;
      
      if (!permissionLevel) {
        throw new AppError('Permission level is required', 400);
      }
      
      const collaborator = await this.baseService.updateCollaboratorPermission(
        baseId,
        userId,
        collaboratorId,
        permissionLevel
      );
      
      res.status(200).json({
        status: 'success',
        data: collaborator,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove collaborator
   */
  async removeCollaborator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baseId, collaboratorId } = req.params;
      const userId = req.user.id;
      
      await this.baseService.removeCollaborator(baseId, userId, collaboratorId);
      
      res.status(200).json({
        status: 'success',
        message: 'Collaborator removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}