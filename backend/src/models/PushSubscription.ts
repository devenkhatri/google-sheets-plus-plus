import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePushSubscriptionDTO {
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
}

export class PushSubscriptionModel {
  private static readonly tableName = 'push_subscriptions';

  /**
   * Create a new push subscription
   */
  static async create(subscriptionData: CreatePushSubscriptionDTO): Promise<PushSubscription> {
    const subscription: Partial<PushSubscription> = {
      ...subscriptionData,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const [createdSubscription] = await db(this.tableName).insert(subscription).returning('*');
    return createdSubscription;
  }

  /**
   * Find subscription by user ID and endpoint
   */
  static async findByUserAndEndpoint(userId: string, endpoint: string): Promise<PushSubscription | null> {
    const subscription = await db(this.tableName)
      .where({ user_id: userId, endpoint })
      .first();
    return subscription || null;
  }

  /**
   * Find all subscriptions for a user
   */
  static async findByUserId(userId: string): Promise<PushSubscription[]> {
    return await db(this.tableName).where({ user_id: userId });
  }

  /**
   * Update or create subscription (upsert)
   */
  static async upsert(subscriptionData: CreatePushSubscriptionDTO): Promise<PushSubscription> {
    const existing = await this.findByUserAndEndpoint(subscriptionData.user_id, subscriptionData.endpoint);
    
    if (existing) {
      // Update existing subscription
      const [updatedSubscription] = await db(this.tableName)
        .where({ id: existing.id })
        .update({
          p256dh_key: subscriptionData.p256dh_key,
          auth_key: subscriptionData.auth_key,
          user_agent: subscriptionData.user_agent,
          updated_at: new Date()
        })
        .returning('*');
      return updatedSubscription;
    } else {
      // Create new subscription
      return await this.create(subscriptionData);
    }
  }

  /**
   * Delete subscription by user ID and endpoint
   */
  static async deleteByUserAndEndpoint(userId: string, endpoint: string): Promise<boolean> {
    const deletedCount = await db(this.tableName)
      .where({ user_id: userId, endpoint })
      .delete();
    return deletedCount > 0;
  }

  /**
   * Delete all subscriptions for a user
   */
  static async deleteByUserId(userId: string): Promise<number> {
    return await db(this.tableName).where({ user_id: userId }).delete();
  }

  /**
   * Delete subscription by ID
   */
  static async delete(id: string): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }

  /**
   * Clean up expired subscriptions (those that haven't been updated in 30 days)
   */
  static async cleanupExpired(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return await db(this.tableName)
      .where('updated_at', '<', thirtyDaysAgo)
      .delete();
  }
}