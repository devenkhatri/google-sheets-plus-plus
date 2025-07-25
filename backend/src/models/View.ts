import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type ViewType = 'grid' | 'kanban' | 'calendar' | 'gallery';

export interface View {
  id: string;
  table_id: string;
  name: string;
  type: ViewType;
  configuration?: any;
  filters?: any;
  sorts?: any;
  field_visibility?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateViewDTO {
  table_id: string;
  name: string;
  type: ViewType;
  configuration?: any;
  filters?: any;
  sorts?: any;
  field_visibility?: any;
}

export interface UpdateViewDTO {
  name?: string;
  type?: ViewType;
  configuration?: any;
  filters?: any;
  sorts?: any;
  field_visibility?: any;
}

export class ViewModel {
  private static readonly tableName = 'views';

  /**
   * Create a new view
   */
  static async create(viewData: CreateViewDTO): Promise<View> {
    const view: Partial<View> = {
      ...viewData,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const [createdView] = await db(this.tableName).insert(view).returning('*');
    return createdView;
  }

  /**
   * Find view by ID
   */
  static async findById(id: string): Promise<View | null> {
    const view = await db(this.tableName).where({ id }).first();
    return view || null;
  }

  /**
   * Find views by table ID
   */
  static async findByTableId(tableId: string): Promise<View[]> {
    const views = await db(this.tableName).where({ table_id: tableId });
    return views;
  }

  /**
   * Update view
   */
  static async update(id: string, viewData: UpdateViewDTO): Promise<View | null> {
    const updateData: Partial<View> = {
      ...viewData,
      updated_at: new Date(),
    };
    
    const [updatedView] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedView || null;
  }

  /**
   * Delete view
   */
  static async delete(id: string): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }

  /**
   * Create default views for a table
   */
  static async createDefaultViews(tableId: string): Promise<View[]> {
    // Create a default grid view
    const gridView = await this.create({
      table_id: tableId,
      name: 'Grid View',
      type: 'grid',
      configuration: {
        frozenColumns: 1,
        rowHeight: 'medium',
      },
    });
    
    return [gridView];
  }

  /**
   * Update view filters
   */
  static async updateFilters(id: string, filters: any): Promise<View | null> {
    const [updatedView] = await db(this.tableName)
      .where({ id })
      .update({
        filters,
        updated_at: new Date(),
      })
      .returning('*');
      
    return updatedView || null;
  }

  /**
   * Update view sorts
   */
  static async updateSorts(id: string, sorts: any): Promise<View | null> {
    const [updatedView] = await db(this.tableName)
      .where({ id })
      .update({
        sorts,
        updated_at: new Date(),
      })
      .returning('*');
      
    return updatedView || null;
  }

  /**
   * Update view field visibility
   */
  static async updateFieldVisibility(id: string, fieldVisibility: any): Promise<View | null> {
    const [updatedView] = await db(this.tableName)
      .where({ id })
      .update({
        field_visibility: fieldVisibility,
        updated_at: new Date(),
      })
      .returning('*');
      
    return updatedView || null;
  }

  /**
   * Duplicate view
   */
  static async duplicate(id: string, newName: string): Promise<View | null> {
    const view = await this.findById(id);
    
    if (!view) {
      return null;
    }
    
    const duplicatedView = await this.create({
      table_id: view.table_id,
      name: newName,
      type: view.type,
      configuration: view.configuration,
      filters: view.filters,
      sorts: view.sorts,
      field_visibility: view.field_visibility,
    });
    
    return duplicatedView;
  }
}