import { db } from '../config/database';
import { View, CreateViewDTO, UpdateViewDTO } from '../models/View';
import { logger } from '../utils/logger';

export class ViewRepository {
  private readonly tableName = 'views';

  /**
   * Create a new view
   */
  async create(viewData: CreateViewDTO): Promise<View> {
    try {
      const [view] = await db(this.tableName).insert(viewData).returning('*');
      return view;
    } catch (error) {
      logger.error('Error creating view:', error);
      throw error;
    }
  }

  /**
   * Find view by ID
   */
  async findById(id: string): Promise<View | null> {
    try {
      const view = await db(this.tableName).where({ id }).first();
      return view || null;
    } catch (error) {
      logger.error(`Error finding view with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find views by table ID
   */
  async findByTableId(tableId: string): Promise<View[]> {
    try {
      const views = await db(this.tableName).where({ table_id: tableId });
      return views;
    } catch (error) {
      logger.error(`Error finding views for table ${tableId}:`, error);
      throw error;
    }
  }

  /**
   * Update view
   */
  async update(id: string, viewData: UpdateViewDTO): Promise<View | null> {
    try {
      const [updatedView] = await db(this.tableName)
        .where({ id })
        .update(viewData)
        .returning('*');
      
      return updatedView || null;
    } catch (error) {
      logger.error(`Error updating view ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete view
   */
  async delete(id: string): Promise<boolean> {
    try {
      const deletedCount = await db(this.tableName).where({ id }).delete();
      return deletedCount > 0;
    } catch (error) {
      logger.error(`Error deleting view ${id}:`, error);
      throw error;
    }
  }

  /**
   * Check if view exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const view = await db(this.tableName).where({ id }).first();
      return !!view;
    } catch (error) {
      logger.error(`Error checking if view ${id} exists:`, error);
      throw error;
    }
  }

  /**
   * Count views for a table
   */
  async countByTableId(tableId: string): Promise<number> {
    try {
      const result = await db(this.tableName)
        .where({ table_id: tableId })
        .count('id as count')
        .first();
      
      return parseInt(result?.count as string, 10) || 0;
    } catch (error) {
      logger.error(`Error counting views for table ${tableId}:`, error);
      throw error;
    }
  }

  /**
   * Check if view name exists for a table
   */
  async nameExistsInTable(tableId: string, name: string, excludeViewId?: string): Promise<boolean> {
    try {
      const query = db(this.tableName)
        .where({ table_id: tableId })
        .whereRaw('LOWER(name) = LOWER(?)', [name]);
      
      if (excludeViewId) {
        query.whereNot({ id: excludeViewId });
      }
      
      const view = await query.first();
      return !!view;
    } catch (error) {
      logger.error(`Error checking if view name ${name} exists in table ${tableId}:`, error);
      throw error;
    }
  }
}