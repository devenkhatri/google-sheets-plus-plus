import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { TableModel } from './Table';

export interface Record {
  id: string;
  table_id: string;
  row_index: number;
  fields: any;
  deleted: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRecordDTO {
  table_id: string;
  row_index?: number;
  fields: any;
  created_by?: string;
}

export interface UpdateRecordDTO {
  fields?: any;
  deleted?: boolean;
  updated_by?: string;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  filters?: any[];
  sorts?: any[];
  includeDeleted?: boolean;
}

export class RecordModel {
  private static readonly tableName = 'records';

  /**
   * Create a new record
   */
  static async create(recordData: CreateRecordDTO): Promise<Record> {
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
  }

  /**
   * Find record by ID
   */
  static async findById(id: string): Promise<Record | null> {
    const record = await db(this.tableName).where({ id }).first();
    return record || null;
  }

  /**
   * Find records by table ID with options
   */
  static async findByTableId(tableId: string, options: QueryOptions = {}): Promise<Record[]> {
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
  }

  /**
   * Count records by table ID with filters
   */
  static async countByTableId(tableId: string, filters: any[] = [], includeDeleted: boolean = false): Promise<number> {
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
  }

  /**
   * Update record
   */
  static async update(id: string, recordData: UpdateRecordDTO): Promise<Record | null> {
    const updateData: Partial<Record> = {
      ...recordData,
      updated_at: new Date(),
    };
    
    const [updatedRecord] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedRecord || null;
  }

  /**
   * Soft delete record
   */
  static async softDelete(id: string, userId?: string): Promise<boolean> {
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
  }

  /**
   * Hard delete record
   */
  static async hardDelete(id: string): Promise<boolean> {
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
  }

  /**
   * Restore soft-deleted record
   */
  static async restore(id: string, userId?: string): Promise<Record | null> {
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
  }

  /**
   * Bulk create records
   */
  static async bulkCreate(records: CreateRecordDTO[]): Promise<Record[]> {
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
  }

  /**
   * Bulk update records
   */
  static async bulkUpdate(updates: { id: string; data: UpdateRecordDTO }[]): Promise<Record[]> {
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
  }

  /**
   * Apply filters to query
   * This is a legacy method that will be replaced by FilterEngine
   */
  private static applyFilters(query: any, filters: any[]): any {
    // Import FilterEngine dynamically to avoid circular dependencies
    const { FilterEngine } = require('../services/filterEngine/FilterEngine');
    
    // We need to get fields for the table to properly validate filters
    // Since we don't have access to fields here, we'll use a simplified approach
    return FilterEngine.applyFiltersToQuery(query, filters, []);
  }

  /**
   * Apply sorts to query
   * This is a legacy method that will be replaced by FilterEngine
   */
  private static applySorts(query: any, sorts: any[]): any {
    // Import FilterEngine dynamically to avoid circular dependencies
    const { FilterEngine } = require('../services/filterEngine/FilterEngine');
    
    // We need to get fields for the table to properly validate sorts
    // Since we don't have access to fields here, we'll use a simplified approach
    return FilterEngine.applySortsToQuery(query, sorts, []);
  }
}