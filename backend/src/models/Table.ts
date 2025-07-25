import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { BaseModel } from './Base';

export interface Table {
  id: string;
  base_id: string;
  name: string;
  description?: string;
  google_sheet_id: number;
  google_sheet_name: string;
  record_count: number;
  settings?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTableDTO {
  base_id: string;
  name: string;
  description?: string;
  google_sheet_id?: number;
  google_sheet_name?: string;
  settings?: any;
}

export interface UpdateTableDTO {
  name?: string;
  description?: string;
  record_count?: number;
  settings?: any;
}

export class TableModel {
  private static readonly tableName = 'tables';

  /**
   * Create a new table
   */
  static async create(tableData: CreateTableDTO): Promise<Table> {
    // Get the base to access Google Sheets ID
    const base = await BaseModel.findById(tableData.base_id);
    if (!base) {
      throw new Error('Base not found');
    }
    
    let { google_sheet_id, google_sheet_name } = tableData;
    
    // If no Google Sheet ID or name is provided, create a new sheet
    if (!google_sheet_id || !google_sheet_name) {
      const sheetsService = GoogleSheetsService.getInstance();
      const sheetName = tableData.name;
      const sheetId = await sheetsService.createSheet(base.google_sheets_id, sheetName);
      
      google_sheet_id = sheetId;
      google_sheet_name = sheetName;
    }
    
    const table: Partial<Table> = {
      ...tableData,
      id: uuidv4(),
      google_sheet_id,
      google_sheet_name,
      record_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const [createdTable] = await db(this.tableName).insert(table).returning('*');
    return createdTable;
  }

  /**
   * Find table by ID
   */
  static async findById(id: string): Promise<Table | null> {
    const table = await db(this.tableName).where({ id }).first();
    return table || null;
  }

  /**
   * Find tables by base ID
   */
  static async findByBaseId(baseId: string): Promise<Table[]> {
    const tables = await db(this.tableName).where({ base_id: baseId });
    return tables;
  }

  /**
   * Update table
   */
  static async update(id: string, tableData: UpdateTableDTO): Promise<Table | null> {
    const updateData: Partial<Table> = {
      ...tableData,
      updated_at: new Date(),
    };
    
    const [updatedTable] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedTable || null;
  }

  /**
   * Delete table
   */
  static async delete(id: string): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }

  /**
   * Get table with fields
   */
  static async getTableWithFields(id: string): Promise<any> {
    const table = await db(this.tableName).where({ id }).first();
    
    if (!table) {
      return null;
    }
    
    const fields = await db('fields')
      .where({ table_id: id })
      .orderBy('column_index', 'asc');
    
    return {
      ...table,
      fields,
    };
  }

  /**
   * Update record count
   */
  static async updateRecordCount(id: string, count: number): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .update({
        record_count: count,
        updated_at: new Date(),
      });
  }

  /**
   * Increment record count
   */
  static async incrementRecordCount(id: string, increment: number = 1): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .increment('record_count', increment)
      .update({ updated_at: new Date() });
  }

  /**
   * Decrement record count
   */
  static async decrementRecordCount(id: string, decrement: number = 1): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .decrement('record_count', decrement)
      .update({ updated_at: new Date() });
  }
}