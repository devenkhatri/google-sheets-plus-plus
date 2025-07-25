import { Request, Response, NextFunction } from 'express';
import { WebhookModel, CreateWebhookDTO, UpdateWebhookDTO } from '../models/Webhook';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class WebhookController {
  /**
   * Create a new webhook
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const webhookData: CreateWebhookDTO = {
        ...req.body,
        created_by: userId,
      };
      
      // Validate webhook URL
      try {
        new URL(webhookData.url);
      } catch (error) {
        throw new AppError('Invalid webhook URL', 400);
      }
      
      // Validate events
      if (!Array.isArray(webhookData.events) || webhookData.events.length === 0) {
        throw new AppError('Events must be a non-empty array', 400);
      }
      
      const webhook = await WebhookModel.create(webhookData);
      
      res.status(201).json({
        status: 'success',
        data: {
          webhook,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get webhook by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const webhook = await WebhookModel.findById(id);
      
      if (!webhook) {
        throw new AppError('Webhook not found', 404);
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          webhook,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get webhooks by base ID
   */
  static async getByBaseId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baseId } = req.params;
      const webhooks = await WebhookModel.findByBaseId(baseId);
      
      res.status(200).json({
        status: 'success',
        data: {
          webhooks,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update webhook
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const webhookData: UpdateWebhookDTO = req.body;
      
      // Validate URL if provided
      if (webhookData.url) {
        try {
          new URL(webhookData.url);
        } catch (error) {
          throw new AppError('Invalid webhook URL', 400);
        }
      }
      
      // Validate events if provided
      if (webhookData.events && (!Array.isArray(webhookData.events) || webhookData.events.length === 0)) {
        throw new AppError('Events must be a non-empty array', 400);
      }
      
      const webhook = await WebhookModel.update(id, webhookData);
      
      if (!webhook) {
        throw new AppError('Webhook not found', 404);
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          webhook,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete webhook
   */
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await WebhookModel.delete(id);
      
      if (!deleted) {
        throw new AppError('Webhook not found', 404);
      }
      
      res.status(200).json({
        status: 'success',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle webhook active status
   */
  static async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { active } = req.body;
      
      if (typeof active !== 'boolean') {
        throw new AppError('Active status must be a boolean', 400);
      }
      
      const webhook = await WebhookModel.toggleActive(id, active);
      
      if (!webhook) {
        throw new AppError('Webhook not found', 404);
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          webhook,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get webhook deliveries
   */
  static async getDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Check if webhook exists
      const webhook = await WebhookModel.findById(id);
      
      if (!webhook) {
        throw new AppError('Webhook not found', 404);
      }
      
      const deliveries = await WebhookModel.getDeliveries(id, limit);
      
      res.status(200).json({
        status: 'success',
        data: {
          deliveries,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}