import axios from 'axios';
import { WebhookModel } from '../models/Webhook';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export class WebhookService {
  private static instance: WebhookService;
  private readonly WEBHOOK_QUEUE_KEY = 'webhook_delivery_queue';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 60000; // 1 minute

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Trigger webhooks for an event
   */
  public async triggerEvent(baseId: string, tableId: string | null, event: string, payload: any): Promise<void> {
    try {
      // Find all webhooks that should be triggered for this event
      const webhooks = await WebhookModel.findForEvent(baseId, tableId, event);
      
      if (webhooks.length === 0) {
        return;
      }
      
      logger.info(`Triggering ${webhooks.length} webhooks for event ${event}`);
      
      // Queue webhook deliveries
      for (const webhook of webhooks) {
        await this.queueDelivery(webhook.id, event, {
          event,
          base_id: baseId,
          table_id: tableId,
          ...payload,
        });
      }
    } catch (error) {
      logger.error('Error triggering webhooks:', error);
    }
  }

  /**
   * Queue a webhook delivery
   */
  private async queueDelivery(webhookId: string, event: string, payload: any): Promise<void> {
    try {
      const deliveryData = {
        webhook_id: webhookId,
        event,
        payload,
        attempt: 1,
        timestamp: Date.now(),
      };
      
      await redisClient.rPush(this.WEBHOOK_QUEUE_KEY, JSON.stringify(deliveryData));
    } catch (error) {
      logger.error('Error queueing webhook delivery:', error);
    }
  }

  /**
   * Process webhook delivery queue
   * This should be called by a background job processor
   */
  public async processQueue(batchSize: number = 10): Promise<void> {
    try {
      // Process a batch of webhook deliveries
      for (let i = 0; i < batchSize; i++) {
        const deliveryJson = await redisClient.lPop(this.WEBHOOK_QUEUE_KEY);
        
        if (!deliveryJson) {
          // Queue is empty
          break;
        }
        
        const delivery = JSON.parse(deliveryJson);
        await this.processDelivery(delivery);
      }
    } catch (error) {
      logger.error('Error processing webhook queue:', error);
    }
  }

  /**
   * Process a webhook delivery
   */
  private async processDelivery(delivery: any): Promise<void> {
    try {
      const { webhook_id, event, payload, attempt } = delivery;
      
      // Get webhook details
      const webhook = await WebhookModel.findById(webhook_id);
      
      if (!webhook || !webhook.active) {
        // Webhook doesn't exist or is inactive
        return;
      }
      
      // Generate signature if secret is available
      const signature = webhook.secret 
        ? WebhookModel.generateSignature(payload, webhook.secret)
        : undefined;
      
      // Send webhook
      try {
        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
            'X-Webhook-Id': webhook_id,
            'X-Webhook-Signature': signature,
          },
          timeout: 10000, // 10 seconds timeout
        });
        
        // Record successful delivery
        await WebhookModel.recordDelivery(
          webhook_id,
          event,
          payload,
          response.status,
          JSON.stringify(response.data),
          true
        );
        
        logger.info(`Webhook delivery successful: ${webhook_id}, event: ${event}, status: ${response.status}`);
      } catch (error: any) {
        // Handle delivery failure
        const statusCode = error.response?.status;
        const responseBody = error.response?.data ? JSON.stringify(error.response.data) : undefined;
        
        // Record failed delivery
        await WebhookModel.recordDelivery(
          webhook_id,
          event,
          payload,
          statusCode,
          responseBody,
          false
        );
        
        logger.warn(`Webhook delivery failed: ${webhook_id}, event: ${event}, status: ${statusCode || 'unknown'}`);
        
        // Retry if appropriate
        if (attempt < this.MAX_RETRIES) {
          await this.scheduleRetry(delivery);
        }
      }
    } catch (error) {
      logger.error('Error processing webhook delivery:', error);
    }
  }

  /**
   * Schedule a retry for a failed webhook delivery
   */
  private async scheduleRetry(delivery: any): Promise<void> {
    try {
      const retryDelivery = {
        ...delivery,
        attempt: delivery.attempt + 1,
        timestamp: Date.now() + this.RETRY_DELAY_MS * delivery.attempt,
      };
      
      // Add to delayed queue
      await redisClient.zAdd('webhook_retry_queue', {
        score: retryDelivery.timestamp,
        value: JSON.stringify(retryDelivery),
      });
      
      logger.info(`Scheduled retry ${retryDelivery.attempt} for webhook ${retryDelivery.webhook_id}`);
    } catch (error) {
      logger.error('Error scheduling webhook retry:', error);
    }
  }

  /**
   * Process webhook retry queue
   * This should be called periodically by a scheduler
   */
  public async processRetryQueue(): Promise<void> {
    try {
      const now = Date.now();
      
      // Get all deliveries that are due for retry
      const retries = await redisClient.zRangeByScore('webhook_retry_queue', 0, now);
      
      if (retries.length === 0) {
        return;
      }
      
      logger.info(`Processing ${retries.length} webhook retries`);
      
      // Process each retry
      for (const retryJson of retries) {
        // Remove from retry queue
        await redisClient.zRem('webhook_retry_queue', retryJson);
        
        // Process the delivery
        const retry = JSON.parse(retryJson);
        await this.processDelivery(retry);
      }
    } catch (error) {
      logger.error('Error processing webhook retry queue:', error);
    }
  }
}