import { ViewRepository } from '../repositories/ViewRepository';
import { TableRepository } from '../repositories/TableRepository';
import { BaseRepository } from '../repositories/BaseRepository';
import { View, CreateViewDTO, UpdateViewDTO, ViewType, ViewModel } from '../models/View';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { FilterEngine } from '../services/filterEngine/FilterEngine';
import { FilterConditionParser } from '../services/filterEngine/FilterConditionParser';

export class ViewService {
  private viewRepository: ViewRepository;
  private tableRepository: TableRepository;
  private baseRepository: BaseRepository;

  constructor() {
    this.viewRepository = new ViewRepository();
    this.tableRepository = new TableRepository();
    this.baseRepository = new BaseRepository();
  }

  /**
   * Create a new view
   */
  async createView(tableId: string, userId: string, viewData: Omit<CreateViewDTO, 'table_id'>): Promise<View> {
    try {
      logger.info(`Creating view "${viewData.name}" in table ${tableId} for user ${userId}`);
      
      // Get table
      const table = await this.tableRepository.findById(tableId);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this table', 403);
      }
      
      // Only owner or editor can create views
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to create views in this table', 403);
      }
      
      // Check if view name already exists in this table
      const nameExists = await this.viewRepository.nameExistsInTable(tableId, viewData.name);
      
      if (nameExists) {
        throw new AppError(`A view with the name "${viewData.name}" already exists in this table`, 400);
      }
      
      // Create view
      const view = await this.viewRepository.create({
        ...viewData,
        table_id: tableId,
      });
      
      logger.info(`View created with ID ${view.id}`);
      
      return view;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Error creating view:', error);
      throw new AppError('Failed to create view', 500);
    }
  }

  /**
   * Get view by ID
   */
  async getView(viewId: string, userId: string): Promise<View> {
    try {
      // Get view
      const view = await this.viewRepository.findById(viewId);
      
      if (!view) {
        throw new AppError('View not found', 404);
      }
      
      // Get table
      const table = await this.tableRepository.findById(view.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this view', 403);
      }
      
      return view;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error getting view ${viewId}:`, error);
      throw new AppError('Failed to get view', 500);
    }
  }

  /**
   * Get views by table ID
   */
  async getViewsByTableId(tableId: string, userId: string): Promise<View[]> {
    try {
      // Get table
      const table = await this.tableRepository.findById(tableId);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this table', 403);
      }
      
      // Get views
      return this.viewRepository.findByTableId(tableId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error getting views for table ${tableId}:`, error);
      throw new AppError('Failed to get views', 500);
    }
  }

  /**
   * Update view
   */
  async updateView(viewId: string, userId: string, viewData: UpdateViewDTO): Promise<View> {
    try {
      // Get view
      const view = await this.viewRepository.findById(viewId);
      
      if (!view) {
        throw new AppError('View not found', 404);
      }
      
      // Get table
      const table = await this.tableRepository.findById(view.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this view', 403);
      }
      
      // Only owner or editor can update views
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to update this view', 403);
      }
      
      // Check if view name already exists in this table
      if (viewData.name && viewData.name !== view.name) {
        const nameExists = await this.viewRepository.nameExistsInTable(view.table_id, viewData.name, viewId);
        
        if (nameExists) {
          throw new AppError(`A view with the name "${viewData.name}" already exists in this table`, 400);
        }
      }
      
      // Update view
      const updatedView = await this.viewRepository.update(viewId, viewData);
      
      if (!updatedView) {
        throw new AppError('Failed to update view', 500);
      }
      
      return updatedView;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error updating view ${viewId}:`, error);
      throw new AppError('Failed to update view', 500);
    }
  }

  /**
   * Delete view
   */
  async deleteView(viewId: string, userId: string): Promise<void> {
    try {
      // Get view
      const view = await this.viewRepository.findById(viewId);
      
      if (!view) {
        throw new AppError('View not found', 404);
      }
      
      // Get table
      const table = await this.tableRepository.findById(view.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this view', 403);
      }
      
      // Only owner or editor can delete views
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to delete this view', 403);
      }
      
      // Count views in table
      const viewCount = await this.viewRepository.countByTableId(view.table_id);
      
      // Don't allow deleting the last view
      if (viewCount <= 1) {
        throw new AppError('Cannot delete the last view in a table', 400);
      }
      
      // Delete view
      const deleted = await this.viewRepository.delete(viewId);
      
      if (!deleted) {
        throw new AppError('Failed to delete view', 500);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error deleting view ${viewId}:`, error);
      throw new AppError('Failed to delete view', 500);
    }
  }

  /**
   * Duplicate view
   */
  async duplicateView(viewId: string, userId: string, newName?: string): Promise<View> {
    try {
      // Get view
      const view = await this.viewRepository.findById(viewId);
      
      if (!view) {
        throw new AppError('View not found', 404);
      }
      
      // Get table
      const table = await this.tableRepository.findById(view.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this view', 403);
      }
      
      // Only owner or editor can duplicate views
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to duplicate this view', 403);
      }
      
      // Generate new name if not provided
      const duplicateName = newName || `${view.name} (Copy)`;
      
      // Check if view name already exists in this table
      const nameExists = await this.viewRepository.nameExistsInTable(view.table_id, duplicateName);
      
      if (nameExists) {
        throw new AppError(`A view with the name "${duplicateName}" already exists in this table`, 400);
      }
      
      // Create new view with same configuration
      const duplicatedView = await this.viewRepository.create({
        table_id: view.table_id,
        name: duplicateName,
        type: view.type,
        configuration: view.configuration,
        filters: view.filters,
        sorts: view.sorts,
        field_visibility: view.field_visibility,
      });
      
      return duplicatedView;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error duplicating view ${viewId}:`, error);
      throw new AppError('Failed to duplicate view', 500);
    }
  }

  /**
   * Update view filters
   */
  async updateViewFilters(viewId: string, userId: string, filters: any): Promise<View> {
    try {
      // Get view
      const view = await this.viewRepository.findById(viewId);
      
      if (!view) {
        throw new AppError('View not found', 404);
      }
      
      // Get table
      const table = await this.tableRepository.findById(view.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this view', 403);
      }
      
      // Only owner or editor can update view filters
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to update this view', 403);
      }
      
      // Validate filter configuration
      if (filters && filters.root) {
        // Get fields for validation
        const fields = await db('fields').where({ table_id: view.table_id });
        
        // Validate filter config
        const isValid = FilterConditionParser.validateFilterConfig(filters, fields);
        
        if (!isValid) {
          throw new AppError('Invalid filter configuration', 400);
        }
        
        // Optimize filter config for performance
        filters = FilterEngine.optimizeFilterConfig(filters);
      }
      
      // Update filters
      const updatedView = await this.viewRepository.update(viewId, { filters });
      
      if (!updatedView) {
        throw new AppError('Failed to update view filters', 500);
      }
      
      return updatedView;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error updating filters for view ${viewId}:`, error);
      throw new AppError('Failed to update view filters', 500);
    }
  }

  /**
   * Update view sorts
   */
  async updateViewSorts(viewId: string, userId: string, sorts: any): Promise<View> {
    try {
      // Get view
      const view = await this.viewRepository.findById(viewId);
      
      if (!view) {
        throw new AppError('View not found', 404);
      }
      
      // Get table
      const table = await this.tableRepository.findById(view.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this view', 403);
      }
      
      // Only owner or editor can update view sorts
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to update this view', 403);
      }
      
      // Validate sort configuration
      if (sorts && sorts.sorts) {
        // Get fields for validation
        const fields = await db('fields').where({ table_id: view.table_id });
        
        // Validate and optimize sort configs
        sorts.sorts = FilterEngine.optimizeSortConfigs(sorts.sorts, fields);
      }
      
      // Update sorts
      const updatedView = await this.viewRepository.update(viewId, { sorts });
      
      if (!updatedView) {
        throw new AppError('Failed to update view sorts', 500);
      }
      
      return updatedView;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error updating sorts for view ${viewId}:`, error);
      throw new AppError('Failed to update view sorts', 500);
    }
  }

  /**
   * Update view field visibility
   */
  async updateViewFieldVisibility(viewId: string, userId: string, fieldVisibility: any): Promise<View> {
    try {
      // Get view
      const view = await this.viewRepository.findById(viewId);
      
      if (!view) {
        throw new AppError('View not found', 404);
      }
      
      // Get table
      const table = await this.tableRepository.findById(view.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this view', 403);
      }
      
      // Only owner or editor can update view field visibility
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to update this view', 403);
      }
      
      // Update field visibility
      const updatedView = await this.viewRepository.update(viewId, { field_visibility: fieldVisibility });
      
      if (!updatedView) {
        throw new AppError('Failed to update view field visibility', 500);
      }
      
      return updatedView;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error updating field visibility for view ${viewId}:`, error);
      throw new AppError('Failed to update view field visibility', 500);
    }
  }

  /**
   * Create view template
   * This creates a template from an existing view that can be used to create new views
   */
  async createViewTemplate(viewId: string, userId: string, templateName: string): Promise<any> {
    try {
      // Get view
      const view = await this.viewRepository.findById(viewId);
      
      if (!view) {
        throw new AppError('View not found', 404);
      }
      
      // Get table
      const table = await this.tableRepository.findById(view.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this view', 403);
      }
      
      // Only owner or editor can create view templates
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to create view templates', 403);
      }
      
      // Create template object
      const template = {
        id: uuidv4(),
        name: templateName,
        type: view.type,
        configuration: view.configuration,
        filters: view.filters,
        sorts: view.sorts,
        field_visibility: view.field_visibility,
        created_by: userId,
        created_at: new Date(),
      };
      
      // In a real implementation, we would store this template in a database table
      // For now, we'll just return the template object
      
      return template;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error creating template from view ${viewId}:`, error);
      throw new AppError('Failed to create view template', 500);
    }
  }

  /**
   * Share view with specific users
   * This would typically involve creating a shareable link or adding permissions
   */
  async shareView(viewId: string, userId: string, shareConfig: { email: string; permissionLevel: string }): Promise<any> {
    try {
      // Get view
      const view = await this.viewRepository.findById(viewId);
      
      if (!view) {
        throw new AppError('View not found', 404);
      }
      
      // Get table
      const table = await this.tableRepository.findById(view.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this view', 403);
      }
      
      // Only owner or editor can share views
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to share this view', 403);
      }
      
      // In a real implementation, we would store view sharing permissions in a database table
      // For now, we'll just return a success message
      
      return {
        message: `View shared with ${shareConfig.email} successfully`,
        shareId: uuidv4(),
        viewId,
        sharedWith: shareConfig.email,
        permissionLevel: shareConfig.permissionLevel,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error sharing view ${viewId}:`, error);
      throw new AppError('Failed to share view', 500);
    }
  }

  /**
   * Generate a deep link to a specific view
   */
  async generateViewDeepLink(viewId: string, userId: string): Promise<string> {
    try {
      // Get view
      const view = await this.viewRepository.findById(viewId);
      
      if (!view) {
        throw new AppError('View not found', 404);
      }
      
      // Get table
      const table = await this.tableRepository.findById(view.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess } = await this.baseRepository.checkUserAccess(table.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this view', 403);
      }
      
      // Generate deep link
      // In a real implementation, this might include additional parameters or tokens
      const deepLink = `/bases/${table.base_id}/tables/${table.id}/views/${viewId}`;
      
      return deepLink;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Error generating deep link for view ${viewId}:`, error);
      throw new AppError('Failed to generate view deep link', 500);
    }
  }
}