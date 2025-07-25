import { Request, Response } from 'express';
import { TemplateService } from '../services/TemplateService';

export class TemplateController {
  constructor(private templateService: TemplateService) {}

  private sendSuccess(res: Response, data: any, statusCode: number = 200): void {
    res.status(statusCode).json(data);
  }

  private sendError(res: Response, error: any, statusCode: number = 500): void {
    res.status(statusCode).json({
      error: error.message || 'Internal server error'
    });
  }

  getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = await this.templateService.getTemplateCategories();
      this.sendSuccess(res, categories);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  getTemplatesByCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const templates = await this.templateService.getTemplatesByCategory(categoryId);
      this.sendSuccess(res, templates);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  getTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;
      const template = await this.templateService.getTemplate(templateId);
      
      if (!template) {
        this.sendError(res, new Error('Template not found'), 404);
        return;
      }

      this.sendSuccess(res, template);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  createTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        this.sendError(res, new Error('User not authenticated'), 401);
        return;
      }

      const template = await this.templateService.createTemplateFromBase(userId, req.body);
      this.sendSuccess(res, template, 201);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  createBaseFromTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        this.sendError(res, new Error('User not authenticated'), 401);
        return;
      }

      const { templateId } = req.params;
      const { baseName } = req.body;

      const baseId = await this.templateService.createBaseFromTemplate(userId, templateId, baseName);
      this.sendSuccess(res, { baseId }, 201);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  searchTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q: query } = req.query;
      if (!query || typeof query !== 'string') {
        this.sendError(res, new Error('Search query is required'), 400);
        return;
      }

      const templates = await this.templateService.searchTemplates(query);
      this.sendSuccess(res, templates);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  getFeaturedTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const templates = await this.templateService.getFeaturedTemplates();
      this.sendSuccess(res, templates);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  getUserTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        this.sendError(res, new Error('User not authenticated'), 401);
        return;
      }

      const templates = await this.templateService.getUserTemplates(userId);
      this.sendSuccess(res, templates);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  exportTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;
      const exportData = await this.templateService.exportTemplate(templateId);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="template-${templateId}.json"`);
      res.send(exportData);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  importTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        this.sendError(res, new Error('User not authenticated'), 401);
        return;
      }

      const { templateData } = req.body;
      if (!templateData) {
        this.sendError(res, new Error('Template data is required'), 400);
        return;
      }

      const template = await this.templateService.importTemplate(userId, templateData);
      this.sendSuccess(res, template, 201);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  duplicateTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        this.sendError(res, new Error('User not authenticated'), 401);
        return;
      }

      const { templateId } = req.params;
      const { name } = req.body;

      const template = await this.templateService.duplicateTemplate(userId, templateId, name);
      this.sendSuccess(res, template, 201);
    } catch (error) {
      this.sendError(res, error);
    }
  };
}