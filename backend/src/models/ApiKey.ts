import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiKey:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the API key
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user who owns this API key
 *         key:
 *           type: string
 *           description: The API key value
 *         name:
 *           type: string
 *           description: Name of the API key
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional description of the API key
 *         active:
 *           type: boolean
 *           description: Whether the API key is active
 *         last_used:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the API key was last used
 *         expires_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the API key expires
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the API key was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: When the API key was last updated
 */
export interface ApiKey {
  id: string;
  user_id: string;
  key: string;
  name: string;
  description?: string;
  active: boolean;
  last_used?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateApiKeyDTO {
  user_id: string;
  name: string;
  description?: string;
  expires_at?: Date;
}

export interface UpdateApiKeyDTO {
  name?: string;
  description?: string;
  active?: boolean;
  expires_at?: Date;
}

export class ApiKeyModel {
  private static readonly tableName = 'api_keys';

  /**
   * Generate a secure API key
   */
  private static generateKey(): string {
    return `ak_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Create a new API key
   */
  static async create(apiKeyData: CreateApiKeyDTO): Promise<ApiKey> {
    const apiKey: Partial<ApiKey> = {
      ...apiKeyData,
      id: uuidv4(),
      key: this.generateKey(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const [createdApiKey] = await db(this.tableName).insert(apiKey).returning('*');
    return createdApiKey;
  }

  /**
   * Find API key by ID
   */
  static async findById(id: string): Promise<ApiKey | null> {
    const apiKey = await db(this.tableName).where({ id }).first();
    return apiKey || null;
  }

  /**
   * Find API key by key
   */
  static async findByKey(key: string): Promise<ApiKey | null> {
    const apiKey = await db(this.tableName).where({ key }).first();
    return apiKey || null;
  }

  /**
   * Find API keys by user ID
   */
  static async findByUserId(userId: string): Promise<ApiKey[]> {
    const apiKeys = await db(this.tableName).where({ user_id: userId });
    return apiKeys;
  }

  /**
   * Update API key
   */
  static async update(id: string, apiKeyData: UpdateApiKeyDTO): Promise<ApiKey | null> {
    const updateData: Partial<ApiKey> = {
      ...apiKeyData,
      updated_at: new Date(),
    };
    
    const [updatedApiKey] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedApiKey || null;
  }

  /**
   * Update last used timestamp
   */
  static async updateLastUsed(id: string): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .update({
        last_used: new Date(),
        updated_at: new Date(),
      });
  }

  /**
   * Deactivate API key
   */
  static async deactivate(id: string): Promise<ApiKey | null> {
    const [updatedApiKey] = await db(this.tableName)
      .where({ id })
      .update({
        active: false,
        updated_at: new Date(),
      })
      .returning('*');
      
    return updatedApiKey || null;
  }

  /**
   * Delete API key
   */
  static async delete(id: string): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }
}