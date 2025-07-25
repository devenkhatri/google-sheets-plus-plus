import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import SearchService from '../services/SearchService';
import { BaseController } from './BaseController';
import { logger } from '../utils/logger';

class SearchController extends BaseController {
  /**
   * Search across bases, tables, and records
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        this.sendValidationError(res, errors);
        return;
      }
      
      const { query, baseId, tableId, fieldIds, limit, offset, savedSearchId } = req.query;
      const userId = req.user!.id;
      
      const searchOptions = {
        userId,
        query: query as string,
        baseId: baseId as string | undefined,
        tableId: tableId as string | undefined,
        fieldIds: fieldIds ? (fieldIds as string).split(',') : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        savedSearchId: savedSearchId as string | undefined
      };
      
      const { results, total } = await SearchService.search(searchOptions);
      
      this.sendSuccess(res, {
        results,
        total,
        limit: searchOptions.limit || 20,
        offset: searchOptions.offset || 0
      });
    } catch (error) {
      logger.error('Error in search controller:', error);
      this.sendError(res, 'An error occurred while searching', 500);
    }
  }
  
  /**
   * Save a search query
   */
  async saveSearch(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        this.sendValidationError(res, errors);
        return;
      }
      
      const { name, query, baseId, tableId, fieldIds, notificationsEnabled } = req.body;
      const userId = req.user!.id;
      
      const savedSearch = await SearchService.saveSearch({
        userId,
        name,
        query,
        baseId,
        tableId,
        fieldIds,
        notificationsEnabled: notificationsEnabled || false
      });
      
      this.sendSuccess(res, savedSearch);
    } catch (error) {
      logger.error('Error in save search controller:', error);
      this.sendError(res, 'An error occurred while saving the search', 500);
    }
  }
  
  /**
   * Get saved searches for the current user
   */
  async getSavedSearches(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      
      const savedSearches = await SearchService.getSavedSearches(userId);
      
      this.sendSuccess(res, savedSearches);
    } catch (error) {
      logger.error('Error in get saved searches controller:', error);
      this.sendError(res, 'An error occurred while retrieving saved searches', 500);
    }
  }
  
  /**
   * Delete a saved search
   */
  async deleteSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      await SearchService.deleteSavedSearch(id, userId);
      
      this.sendSuccess(res, { message: 'Saved search deleted successfully' });
    } catch (error) {
      logger.error('Error in delete saved search controller:', error);
      this.sendError(res, 'An error occurred while deleting the saved search', 500);
    }
  }
  
  /**
   * Update a saved search
   */
  async updateSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        this.sendValidationError(res, errors);
        return;
      }
      
      const { id } = req.params;
      const { name, query, baseId, tableId, fieldIds, notificationsEnabled } = req.body;
      const userId = req.user!.id;
      
      const updatedSearch = await SearchService.updateSavedSearch(id, userId, {
        name,
        query,
        baseId,
        tableId,
        fieldIds,
        notificationsEnabled
      });
      
      this.sendSuccess(res, updatedSearch);
    } catch (error) {
      logger.error('Error in update saved search controller:', error);
      this.sendError(res, 'An error occurred while updating the saved search', 500);
    }
  }
}

export default new SearchController();