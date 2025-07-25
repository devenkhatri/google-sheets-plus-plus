import { knex } from '../config/database';
import { Base } from '../models/Base';
import { Table } from '../models/Table';
import { Field } from '../models/Field';
import { Record } from '../models/Record';
import { logger } from '../utils/logger';

export interface SearchResult {
  id: string;
  type: 'base' | 'table' | 'record';
  title: string;
  context: string;
  baseId: string;
  baseName: string;
  tableId?: string;
  tableName?: string;
  recordId?: string;
  fieldId?: string;
  fieldName?: string;
  matchedText?: string;
  score: number;
  lastModified: Date;
}

export interface SearchOptions {
  userId: string;
  query: string;
  baseId?: string;
  tableId?: string;
  fieldIds?: string[];
  limit?: number;
  offset?: number;
  savedSearchId?: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string;
  baseId?: string;
  tableId?: string;
  fieldIds?: string[];
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class SearchService {
  /**
   * Perform a global search across all bases, tables, and records the user has access to
   */
  async search(options: SearchOptions): Promise<{ results: SearchResult[], total: number }> {
    const { userId, query, baseId, tableId, fieldIds, limit = 20, offset = 0 } = options;
    const startTime = Date.now();
    
    try {
      // Get bases the user has access to
      const accessibleBases = await this.getAccessibleBases(userId, baseId);
      
      if (accessibleBases.length === 0) {
        return { results: [], total: 0 };
      }
      
      const baseIds = accessibleBases.map(base => base.id);
      
      // Search results array
      let results: SearchResult[] = [];
      let total = 0;
      
      // 1. Search in base names and descriptions
      if (!tableId) {
        const baseResults = await this.searchBases(baseIds, query);
        results = results.concat(baseResults);
      }
      
      // 2. Search in table names and descriptions
      const tableResults = await this.searchTables(baseIds, query, tableId);
      results = results.concat(tableResults);
      
      // 3. Search in record data
      const recordResults = await this.searchRecords(baseIds, query, tableId, fieldIds);
      results = results.concat(recordResults);
      
      // Sort by relevance score
      results.sort((a, b) => b.score - a.score);
      
      total = results.length;
      
      // Apply pagination
      results = results.slice(offset, offset + limit);
      
      const endTime = Date.now();
      logger.info(`Search completed in ${endTime - startTime}ms. Query: "${query}", Results: ${total}`);
      
      return { results, total };
    } catch (error) {
      logger.error('Error in search service:', error);
      throw error;
    }
  }
  
  /**
   * Get bases that the user has access to
   */
  private async getAccessibleBases(userId: string, baseId?: string): Promise<Base[]> {
    try {
      let query = knex('bases')
        .select('bases.*')
        .where('bases.ownerId', userId)
        .orWhereExists(function() {
          this.select('collaborators.id')
            .from('collaborators')
            .whereRaw('collaborators.baseId = bases.id')
            .andWhere('collaborators.userId', userId);
        });
      
      if (baseId) {
        query = query.andWhere('bases.id', baseId);
      }
      
      return await query;
    } catch (error) {
      logger.error('Error getting accessible bases:', error);
      throw error;
    }
  }
  
  /**
   * Search in base names and descriptions
   */
  private async searchBases(baseIds: string[], query: string): Promise<SearchResult[]> {
    try {
      const bases = await knex('bases')
        .select('*')
        .whereIn('id', baseIds)
        .andWhere(function() {
          this.where('name', 'ilike', `%${query}%`)
            .orWhere('description', 'ilike', `%${query}%`);
        });
      
      return bases.map(base => {
        // Calculate relevance score
        let score = 0;
        let matchedText = '';
        
        if (base.name.toLowerCase().includes(query.toLowerCase())) {
          score += 10;
          matchedText = base.name;
        }
        
        if (base.description && base.description.toLowerCase().includes(query.toLowerCase())) {
          score += 5;
          matchedText = matchedText || base.description;
        }
        
        return {
          id: `base-${base.id}`,
          type: 'base',
          title: base.name,
          context: base.description || '',
          baseId: base.id,
          baseName: base.name,
          score,
          matchedText,
          lastModified: base.updatedAt
        };
      });
    } catch (error) {
      logger.error('Error searching bases:', error);
      throw error;
    }
  }
  
  /**
   * Search in table names and descriptions
   */
  private async searchTables(baseIds: string[], query: string, tableId?: string): Promise<SearchResult[]> {
    try {
      let tablesQuery = knex('tables')
        .select('tables.*', 'bases.name as baseName')
        .join('bases', 'tables.baseId', 'bases.id')
        .whereIn('tables.baseId', baseIds)
        .andWhere(function() {
          this.where('tables.name', 'ilike', `%${query}%`)
            .orWhere('tables.description', 'ilike', `%${query}%`);
        });
      
      if (tableId) {
        tablesQuery = tablesQuery.andWhere('tables.id', tableId);
      }
      
      const tables = await tablesQuery;
      
      return tables.map(table => {
        // Calculate relevance score
        let score = 0;
        let matchedText = '';
        
        if (table.name.toLowerCase().includes(query.toLowerCase())) {
          score += 8;
          matchedText = table.name;
        }
        
        if (table.description && table.description.toLowerCase().includes(query.toLowerCase())) {
          score += 4;
          matchedText = matchedText || table.description;
        }
        
        return {
          id: `table-${table.id}`,
          type: 'table',
          title: table.name,
          context: table.description || '',
          baseId: table.baseId,
          baseName: table.baseName,
          tableId: table.id,
          tableName: table.name,
          score,
          matchedText,
          lastModified: table.updatedAt
        };
      });
    } catch (error) {
      logger.error('Error searching tables:', error);
      throw error;
    }
  }
  
  /**
   * Search in record data
   */
  private async searchRecords(baseIds: string[], query: string, tableId?: string, fieldIds?: string[]): Promise<SearchResult[]> {
    try {
      // First get tables
      let tablesQuery = knex('tables')
        .select('tables.*')
        .whereIn('baseId', baseIds);
      
      if (tableId) {
        tablesQuery = tablesQuery.andWhere('id', tableId);
      }
      
      const tables = await tablesQuery;
      
      if (tables.length === 0) {
        return [];
      }
      
      const results: SearchResult[] = [];
      
      // For each table, search in its records
      for (const table of tables) {
        // Get fields for this table
        let fieldsQuery = knex('fields')
          .select('*')
          .where('tableId', table.id)
          .andWhere('type', 'in', ['text', 'singleSelect', 'multiSelect', 'email', 'url', 'phone']);
        
        if (fieldIds && fieldIds.length > 0) {
          fieldsQuery = fieldsQuery.andWhere('id', 'in', fieldIds);
        }
        
        const fields = await fieldsQuery;
        
        if (fields.length === 0) {
          continue;
        }
        
        // Get base name
        const base = await knex('bases')
          .select('name')
          .where('id', table.baseId)
          .first();
        
        // Search in records
        const records = await knex('records')
          .select('*')
          .where('tableId', table.id)
          .andWhere('deleted', false);
        
        for (const record of records) {
          const recordFields = record.fields || {};
          
          for (const field of fields) {
            const fieldValue = recordFields[field.id];
            
            if (fieldValue && typeof fieldValue === 'string' && 
                fieldValue.toLowerCase().includes(query.toLowerCase())) {
              
              // Calculate context - get surrounding text
              const matchIndex = fieldValue.toLowerCase().indexOf(query.toLowerCase());
              const startIndex = Math.max(0, matchIndex - 30);
              const endIndex = Math.min(fieldValue.length, matchIndex + query.length + 30);
              let context = fieldValue.substring(startIndex, endIndex);
              
              if (startIndex > 0) {
                context = '...' + context;
              }
              
              if (endIndex < fieldValue.length) {
                context = context + '...';
              }
              
              // Calculate score based on field type and match position
              let score = 5;
              
              // Title fields get higher score
              if (field.name.toLowerCase().includes('title') || 
                  field.name.toLowerCase().includes('name')) {
                score += 3;
              }
              
              // Exact matches get higher score
              if (fieldValue.toLowerCase() === query.toLowerCase()) {
                score += 2;
              }
              
              // Matches at beginning of field get higher score
              if (matchIndex === 0) {
                score += 1;
              }
              
              results.push({
                id: `record-${record.id}-${field.id}`,
                type: 'record',
                title: this.getRecordTitle(record, fields),
                context,
                baseId: table.baseId,
                baseName: base.name,
                tableId: table.id,
                tableName: table.name,
                recordId: record.id,
                fieldId: field.id,
                fieldName: field.name,
                matchedText: fieldValue,
                score,
                lastModified: record.updatedAt
              });
              
              // Only count one match per record-field combination
              break;
            }
          }
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error searching records:', error);
      throw error;
    }
  }
  
  /**
   * Get a title for a record based on its fields
   */
  private getRecordTitle(record: Record, fields: Field[]): string {
    const recordFields = record.fields || {};
    
    // Try to find a name or title field
    const titleField = fields.find(f => 
      f.name.toLowerCase().includes('name') || 
      f.name.toLowerCase().includes('title')
    );
    
    if (titleField && recordFields[titleField.id]) {
      return String(recordFields[titleField.id]);
    }
    
    // Otherwise use the first text field
    const firstTextField = fields.find(f => f.type === 'text');
    if (firstTextField && recordFields[firstTextField.id]) {
      return String(recordFields[firstTextField.id]);
    }
    
    // Fallback to record ID
    return `Record ${record.id}`;
  }
  
  /**
   * Save a search query
   */
  async saveSearch(savedSearch: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedSearch> {
    try {
      const [id] = await knex('saved_searches').insert({
        ...savedSearch,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning('id');
      
      return {
        ...savedSearch,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error saving search:', error);
      throw error;
    }
  }
  
  /**
   * Get saved searches for a user
   */
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    try {
      return await knex('saved_searches')
        .select('*')
        .where('userId', userId)
        .orderBy('updatedAt', 'desc');
    } catch (error) {
      logger.error('Error getting saved searches:', error);
      throw error;
    }
  }
  
  /**
   * Delete a saved search
   */
  async deleteSavedSearch(id: string, userId: string): Promise<void> {
    try {
      await knex('saved_searches')
        .where('id', id)
        .andWhere('userId', userId)
        .delete();
    } catch (error) {
      logger.error('Error deleting saved search:', error);
      throw error;
    }
  }
  
  /**
   * Update a saved search
   */
  async updateSavedSearch(id: string, userId: string, updates: Partial<SavedSearch>): Promise<SavedSearch> {
    try {
      const [updatedSearch] = await knex('saved_searches')
        .where('id', id)
        .andWhere('userId', userId)
        .update({
          ...updates,
          updatedAt: new Date()
        })
        .returning('*');
      
      return updatedSearch;
    } catch (error) {
      logger.error('Error updating saved search:', error);
      throw error;
    }
  }
  
  /**
   * Check saved searches for new results and send notifications
   */
  async checkSavedSearchesForNotifications(): Promise<void> {
    try {
      // Get all saved searches with notifications enabled
      const savedSearches = await knex('saved_searches')
        .select('*')
        .where('notificationsEnabled', true);
      
      for (const savedSearch of savedSearches) {
        // Get the last notification time for this search
        const lastNotification = await knex('search_notifications')
          .select('createdAt')
          .where('savedSearchId', savedSearch.id)
          .orderBy('createdAt', 'desc')
          .first();
        
        const lastNotificationTime = lastNotification ? lastNotification.createdAt : new Date(0);
        
        // Search for new results since the last notification
        const { results } = await this.search({
          userId: savedSearch.userId,
          query: savedSearch.query,
          baseId: savedSearch.baseId,
          tableId: savedSearch.tableId,
          fieldIds: savedSearch.fieldIds
        });
        
        // Filter for results that were updated after the last notification
        const newResults = results.filter(result => 
          new Date(result.lastModified) > new Date(lastNotificationTime)
        );
        
        if (newResults.length > 0) {
          // Create a notification
          await knex('notifications').insert({
            userId: savedSearch.userId,
            type: 'search',
            message: `${newResults.length} new results for saved search "${savedSearch.name}"`,
            data: {
              savedSearchId: savedSearch.id,
              resultCount: newResults.length
            },
            read: false,
            createdAt: new Date()
          });
          
          // Record that we sent a notification
          await knex('search_notifications').insert({
            savedSearchId: savedSearch.id,
            resultCount: newResults.length,
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      logger.error('Error checking saved searches for notifications:', error);
      throw error;
    }
  }
}

export default new SearchService();