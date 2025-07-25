import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * @swagger
 * components:
 *   schemas:
 *     Webhook:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the webhook
 *         base_id:
 *           type: string
 *           format: uuid
 *           description: ID of the base this webhook belongs to
 *         table_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Optional ID of the table this webhook is specific to
 *         name:
 *           type: string
 *           description: Name of the webhook
 *         url:
 *           type: string
 *           format: uri
 *           description: URL to send webhook events to
 *         events:
 *           type: array
 *           description: Array of events this webhook subscribes to
 *           items:
 *             type: string
 *             enum: [record.created, record.updated, record.deleted, base.updated, table.updated]
 *         secret:
 *           type: string
 *           nullable: true
 *           description: Secret used for webhook signature verification
 *         active:
 *           type: boolean
 *           description: Whether the webhook is active
 *         created_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID of the user who created the webhook
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the webhook was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: When the webhook was last updated
 *
 *     WebhookDelivery:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the webhook delivery
 *         webhook_id:
 *           type: string
 *           format: uuid
 *           description: ID of the webhook
 *         event:
 *           type: string
 *           description: Event type that triggered the webhook
 *         payload:
 *           type: object
 *           description: Payload sent to the webhook URL
 *         status_code:
 *           type: integer
 *           nullable: true
 *           description: HTTP status code of the webhook response
 *         response_body:
 *           type: string
 *           nullable: true
 *           description: Response body from the webhook URL
 *         success:
 *           type: boolean
 *           description: Whether the webhook delivery was successful
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the webhook delivery was created
 */
export interface Webhook {
  id: string;
  base_id: string;
  table_id?: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWebhookDTO {
  base_id: string;
  table_id?: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  created_by?: string;
}

export interface UpdateWebhookDTO {
  name?: string;
  url?: string;
  events?: string[];
  secret?: string;
  active?: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: any;
  status_code?: number;
  response_body?: string;
  success: boolean;
  created_at: Date;
}

export class WebhookModel {
  private static readonly tableName = 'webhooks';
  private static readonly deliveryTableName = 'webhook_deliveries';

  /**
   * Create a new webhook
   */
  static async create(webhookData: CreateWebhookDTO): Promise<Webhook> {
    // Generate a secret if not provided
    const secret = webhookData.secret || crypto.randomBytes(32).toString('hex');
    
    const webhook: Partial<Webhook> = {
      ...webhookData,
      id: uuidv4(),
      secret,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const [createdWebhook] = await db(this.tableName).insert(webhook).returning('*');
    return createdWebhook;
  }

  /**
   * Find webhook by ID
   */
  static async findById(id: string): Promise<Webhook | null> {
    const webhook = await db(this.tableName).where({ id }).first();
    return webhook || null;
  }

  /**
   * Find webhooks by base ID
   */
  static async findByBaseId(baseId: string): Promise<Webhook[]> {
    const webhooks = await db(this.tableName).where({ base_id: baseId });
    return webhooks;
  }

  /**
   * Find webhooks by table ID
   */
  static async findByTableId(tableId: string): Promise<Webhook[]> {
    const webhooks = await db(this.tableName).where({ table_id: tableId });
    return webhooks;
  }

  /**
   * Find webhooks for event
   */
  static async findForEvent(baseId: string, tableId: string | null, event: string): Promise<Webhook[]> {
    // Find webhooks for this base that are active and subscribed to this event
    const baseWebhooks = await db(this.tableName)
      .where({ base_id: baseId, active: true })
      .whereNull('table_id')
      .whereRaw(`? = ANY(events)`, [event]);
    
    // If table ID is provided, also find table-specific webhooks
    let tableWebhooks: Webhook[] = [];
    if (tableId) {
      tableWebhooks = await db(this.tableName)
        .where({ base_id: baseId, table_id: tableId, active: true })
        .whereRaw(`? = ANY(events)`, [event]);
    }
    
    return [...baseWebhooks, ...tableWebhooks];
  }

  /**
   * Update webhook
   */
  static async update(id: string, webhookData: UpdateWebhookDTO): Promise<Webhook | null> {
    const updateData: Partial<Webhook> = {
      ...webhookData,
      updated_at: new Date(),
    };
    
    const [updatedWebhook] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedWebhook || null;
  }

  /**
   * Delete webhook
   */
  static async delete(id: string): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }

  /**
   * Toggle webhook active status
   */
  static async toggleActive(id: string, active: boolean): Promise<Webhook | null> {
    const [updatedWebhook] = await db(this.tableName)
      .where({ id })
      .update({
        active,
        updated_at: new Date(),
      })
      .returning('*');
      
    return updatedWebhook || null;
  }

  /**
   * Record webhook delivery
   */
  static async recordDelivery(
    webhookId: string,
    event: string,
    payload: any,
    statusCode?: number,
    responseBody?: string,
    success: boolean = false
  ): Promise<WebhookDelivery> {
    const delivery = {
      id: uuidv4(),
      webhook_id: webhookId,
      event,
      payload,
      status_code: statusCode,
      response_body: responseBody,
      success,
      created_at: new Date(),
    };
    
    const [createdDelivery] = await db(this.deliveryTableName).insert(delivery).returning('*');
    return createdDelivery;
  }

  /**
   * Get webhook deliveries
   */
  static async getDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDelivery[]> {
    const deliveries = await db(this.deliveryTableName)
      .where({ webhook_id: webhookId })
      .orderBy('created_at', 'desc')
      .limit(limit);
    
    return deliveries;
  }

  /**
   * Generate signature for payload
   */
  static generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Verify signature
   */
  static verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}