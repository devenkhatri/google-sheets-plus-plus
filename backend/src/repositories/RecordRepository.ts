import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { TableModel } from '../models/Table';
import { Record, CreateRecordDTO, UpdateRecordDTO, QueryOptions } from '../models/Record';
import { logger } from '../utils/logger';

/**
 * Repository for Record operations
 */
export class RecordRepository {
  private readonly tableName = 'records';

  /**
   * Create a new record
   */
  public async create(recordData: CreateRecordDTO): Promise<Record> {
    try {
      // If row index is not provided, get the next available index
      if (recordData.row_index === undefined) {
        const maxIndexResult = await db(this.tableName)
          .where({ table_id: recordData.table_id })
          .max('row_index as max_index')
          .first();
        
        const maxIndex = maxIndexResult?.max_index ?? -1;
        recordData.row_index = maxIndex + 1;
      }
      
      const record: Partial<Record> = {
        ...recordData,
        id: uuidv4(),
        deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const [createdRecord] = await db(this.tableName).insert(record).returning('*');
      
      // Update record count in table
      await TableModel.incrementRecordCount(recordData.table_id);
      
      return createdRecord;
    } catch (error) {
      logger.error('Error creating record:', error);
      throw error;
    }
  }

  /**
   * Find record by ID
   */
  public async findById(id: string): Promise<Record | null> {
    try {
      const record = await db(this.tableName).where({ id }).first();
      return record || null;
    } catch (error) {
      logger.error(`Error finding record by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find records by table ID with options
   */
  public async findByTableId(tableId: string, options: QueryOptions = {}): Promise<Record[]> {
    try {
      const {
        limit = 100,
        offset = 0,
        filters = [],
        sorts = [],
        includeDeleted = false,
      } = options;
      
      // Start query
      let query = db(this.tableName)
        .where({ table_id: tableId })
        .limit(limit)
        .offset(offset);
      
      // Apply deleted filter
      if (!includeDeleted) {
        query = query.where({ deleted: false });
      }
      
      // Apply filters
      if (filters.length > 0) {
        query = this.applyFilters(query, filters);
      }
      
      // Apply sorts
      if (sorts.length > 0) {
        query = this.applySorts(query, sorts);
      } else {
        // Default sort by row index
        query = query.orderBy('row_index', 'asc');
      }
      
      const records = await query;
      return records;
    } catch (error) {
      logger.error(`Error finding records by table ID ${tableId}:`, error);
      throw error;
    }
  }

  /**
   * Count records by table ID with filters
   */
  public async countByTableId(tableId: string, filters: any[] = [], includeDeleted: boolean = false): Promise<number> {
    try {
      // Start query
      let query = db(this.tableName)
        .where({ table_id: tableId })
        .count('id as count');
      
      // Apply deleted filter
      if (!includeDeleted) {
        query = query.where({ deleted: false });
      }
      
      // Apply filters
      if (filters.length > 0) {
        query = this.applyFilters(query, filters);
      }
      
      const result = await query.first();
      return parseInt(result?.count.toString() || '0', 10);
    } catch (error) {
      logger.error(`Error counting records by table ID ${tableId}:`, error);
      throw error;
    }
  }

  /**
   * Update record
   */
  public async update(id: string, recordData: UpdateRecordDTO): Promise<Record | null> {
    try {
      const updateData: Partial<Record> = {
        ...recordData,
        updated_at: new Date(),
      };
      
      const [updatedRecord] = await db(this.tableName)
        .where({ id })
        .update(updateData)
        .returning('*');
        
      return updatedRecord || null;
    } catch (error) {
      logger.error(`Error updating record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Soft delete record
   */
  public async softDelete(id: string, userId?: string): Promise<boolean> {
    try {
      const record = await this.findById(id);
      
      if (!record) {
        return false;
      }
      
      await db(this.tableName)
        .where({ id })
        .update({
          deleted: true,
          updated_by: userId,
          updated_at: new Date(),
        });
      
      // Update record count in table
      await TableModel.decrementRecordCount(record.table_id);
      
      return true;
    } catch (error) {
      logger.error(`Error soft deleting record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Hard delete record
   */
  public async hardDelete(id: string): Promise<boolean> {
    try {
      const record = await this.findById(id);
      
      if (!record) {
        return false;
      }
      
      const deletedCount = await db(this.tableName).where({ id }).delete();
      
      if (deletedCount > 0 && !record.deleted) {
        // Update record count in table only if the record wasn't already soft-deleted
        await TableModel.decrementRecordCount(record.table_id);
      }
      
      return deletedCount > 0;
    } catch (error) {
      logger.error(`Error hard deleting record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Restore soft-deleted record
   */
  public async restore(id: string, userId?: string): Promise<Record | null> {
    try {
      const record = await this.findById(id);
      
      if (!record || !record.deleted) {
        return null;
      }
      
      const [restoredRecord] = await db(this.tableName)
        .where({ id })
        .update({
          deleted: false,
          updated_by: userId,
          updated_at: new Date(),
        })
        .returning('*');
      
      // Update record count in table
      await TableModel.incrementRecordCount(record.table_id);
      
      return restoredRecord;
    } catch (error) {
      logger.error(`Error restoring record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Bulk create records
   */
  public async bulkCreate(records: CreateRecordDTO[]): Promise<Record[]> {
    try {
      if (records.length === 0) {
        return [];
      }
      
      // Group records by table ID
      const recordsByTable: { [tableId: string]: CreateRecordDTO[] } = {};
      
      for (const record of records) {
        if (!recordsByTable[record.table_id]) {
          recordsByTable[record.table_id] = [];
        }
        recordsByTable[record.table_id].push(record);
      }
      
      const createdRecords: Record[] = [];
      
      // Process each table's records
      for (const [tableId, tableRecords] of Object.entries(recordsByTable)) {
        // Get the next available row index
        const maxIndexResult = await db(this.tableName)
          .where({ table_id: tableId })
          .max('row_index as max_index')
          .first();
        
        let nextRowIndex = (maxIndexResult?.max_index ?? -1) + 1;
        
        // Prepare records for insertion
        const recordsToInsert = tableRecords.map((record) => {
          const rowIndex = record.row_index ?? nextRowIndex++;
          
          return {
            id: uuidv4(),
            table_id: record.table_id,
            row_index: rowIndex,
            fields: record.fields,
            deleted: false,
            created_by: record.created_by,
            updated_by: record.created_by,
            created_at: new Date(),
            updated_at: new Date(),
          };
        });
        
        // Insert records
        const insertedRecords = await db(this.tableName)
          .insert(recordsToInsert)
          .returning('*');
        
        createdRecords.push(...insertedRecords);
        
        // Update record count in table
        await TableModel.incrementRecordCount(tableId, insertedRecords.length);
      }
      
      return createdRecords;
    } catch (error) {
      logger.error('Error bulk creating records:', error);
      throw error;
    }
  }

  /**
   * Bulk update records
   */
  public async bulkUpdate(updates: { id: string; data: UpdateRecordDTO }[]): Promise<Record[]> {
    try {
      if (updates.length === 0) {
        return [];
      }
      
      const updatedRecords: Record[] = [];
      
      // Process each update
      for (const update of updates) {
        const { id, data } = update;
        
        const updateData: Partial<Record> = {
          ...data,
          updated_at: new Date(),
        };
        
        const [updatedRecord] = await db(this.tableName)
          .where({ id })
          .update(updateData)
          .returning('*');
        
        if (updatedRecord) {
          updatedRecords.push(updatedRecord);
        }
      }
      
      return updatedRecords;
    } catch (error) {
      logger.error('Error bulk updating records:', error);
      throw error;
    }
  }

  /**
   * Apply filters to query
   */
  private applyFilters(query: any, filters: any[]): any {
    for (const filter of filters) {
      const { fieldId, operator, value } = filter;
      
      // Handle different operators
      switch (operator) {
        case 'equals':
          query = query.whereRaw(`fields->>'${fieldId}' = ?`, [value]);
          break;
        case 'notEquals':
          query = query.whereRaw(`fields->>'${fieldId}' != ? OR fields->>'${fieldId}' IS NULL`, [value]);
          break;
        case 'contains':
          query = query.whereRaw(`fields->>'${fieldId}' ILIKE ?`, [`%${value}%`]);
          break;
        case 'notContains':
          query = query.whereRaw(`fields->>'${fieldId}' NOT ILIKE ? OR fields->>'${fieldId}' IS NULL`, [`%${value}%`]);
          break;
        case 'isEmpty':
          query = query.whereRaw(`fields->>'${fieldId}' IS NULL OR fields->>'${fieldId}' = ''`);
          break;
        case 'isNotEmpty':
          query = query.whereRaw(`fields->>'${fieldId}' IS NOT NULL AND fields->>'${fieldId}' != ''`);
          break;
        case 'greaterThan':
          query = query.whereRaw(`(fields->>'${fieldId}')::numeric > ?`, [value]);
          break;
        case 'lessThan':
          query = query.whereRaw(`(fields->>'${fieldId}')::numeric < ?`, [value]);
          break;
        case 'greaterThanOrEqual':
          query = query.whereRaw(`(fields->>'${fieldId}')::numeric >= ?`, [value]);
          break;
        case 'lessThanOrEqual':
          query = query.whereRaw(`(fields->>'${fieldId}')::numeric <= ?`, [value]);
          break;
        case 'before':
          query = query.whereRaw(`fields->>'${fieldId}' < ?`, [value]);
          break;
        case 'after':
          query = query.whereRaw(`fields->>'${fieldId}' > ?`, [value]);
          break;
        case 'onOrBefore':
          query = query.whereRaw(`fields->>'${fieldId}' <= ?`, [value]);
          break;
        case 'onOrAfter':
          query = query.whereRaw(`fields->>'${fieldId}' >= ?`, [value]);
          break;
      }
    }
    
    return query;
  }

  /**
   * Apply sorts to query
   */
  private applySorts(query: any, sorts: any[]): any {
    for (const sort of sorts) {
      const { fieldId, direction } = sort;
      
      query = query.orderByRaw(`fields->>'${fieldId}' ${direction === 'desc' ? 'DESC' : 'ASC'} NULLS LAST`);
    }
    
    return query;
  }
}