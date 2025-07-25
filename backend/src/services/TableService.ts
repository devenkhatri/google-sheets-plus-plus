import { TableRepository } from '../repositories/TableRepository';
import { BaseRepository } from '../repositories/BaseRepository';
import { GoogleSheetsService } from './GoogleSheetsService';
import { GoogleSheetsSyncService } from './GoogleSheetsSyncService';
import { FieldModel, Field, CreateFieldDTO } from '../models/Field';
import { ViewModel } from '../models/View';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class TableService {
  private tableRepository: TableRepository;
  private baseRepository: BaseRepository;
  private sheetsService: GoogleSheetsService;
  private syncService: GoogleSheetsSyncService;

  constructor() {
    this.tableRepository = new TableRepository();
    this.baseRepository = new BaseRepository();
    this.sheetsService = GoogleSheetsService.getInstance();
    this.syncService = GoogleSheetsSyncService.getInstance();
  }

  /**
   * Create a new table
   */
  async createTable(baseId: string, userId: string, name: string, description?: string, fields?: CreateFieldDTO[]): Promise<any> {
    try {
      logger.info(`Creating table "${name}" in base ${baseId} for user ${userId}`);
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(baseId, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this base', 403);
      }
      
      // Only owner or editor can create tables
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to create tables in this base', 403);
      }
      
      // Get base
      const base = await this.baseRepository.findById(baseId);
      
      if (!base) {
        throw new AppError('Base not found', 404);
      }
      
      // Create a new sheet in Google Sheets
      const sheetId = await this.sheetsService.createSheet(base.google_sheets_id, name);
      
      // Create table in database
      const table = await this.tableRepository.create({
        base_id: baseId,
        name,
        description,
        google_sheet_id: sheetId,
        google_sheet_name: name,
      });
      
      // Create default fields if not provided
      const createdFields = await this.createInitialFields(table.id, fields);
      
      // Format header row in Google Sheets
      await this.formatHeaderRow(base.google_sheets_id, name, createdFields);
      
      logger.info(`Table created with ID ${table.id} and sheet ID ${sheetId}`);
      
      // Get table with fields and views
      const tableWithDetails = await this.tableRepository.getTableWithFieldsAndViews(table.id);
      
      return tableWithDetails;
    } catch (error) {
      logger.error('Error creating table:', error);
      throw new AppError('Failed to create table', 500);
    }
  }

  /**
   * Get table by ID
   */
  async getTable(tableId: string, userId: string): Promise<any> {
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
    
    // Get table with fields and views
    return this.tableRepository.getTableWithFieldsAndViews(tableId);
  }

  /**
   * Get tables by base ID
   */
  async getTables(baseId: string, userId: string): Promise<any[]> {
    // Check if user has access to base
    const { hasAccess } = await this.baseRepository.checkUserAccess(baseId, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this base', 403);
    }
    
    // Get tables
    return this.tableRepository.findByBaseId(baseId);
  }

  /**
   * Update table
   */
  async updateTable(tableId: string, userId: string, data: { name?: string; description?: string }): Promise<any> {
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
    
    // Only owner or editor can update table
    if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
      throw new AppError('You do not have permission to update this table', 403);
    }
    
    // Get base
    const base = await this.baseRepository.findById(table.base_id);
    
    if (!base) {
      throw new AppError('Base not found', 404);
    }
    
    // Update table
    const updatedTable = await this.tableRepository.update(tableId, data);
    
    // If name is updated, also update Google Sheets sheet name
    if (data.name && data.name !== table.name) {
      try {
        await this.sheetsService.batchUpdate(base.google_sheets_id, [
          {
            updateSheetProperties: {
              properties: {
                sheetId: table.google_sheet_id,
                title: data.name,
              },
              fields: 'title',
            },
          },
        ]);
        
        // Update google_sheet_name in database
        await this.tableRepository.update(tableId, { 
          ...data,
          google_sheet_name: data.name 
        });
      } catch (error) {
        logger.error(`Error updating sheet name for table ${tableId}:`, error);
        // Continue even if Google Sheets update fails
      }
    }
    
    // Get updated table with fields and views
    return this.tableRepository.getTableWithFieldsAndViews(tableId);
  }

  /**
   * Delete table
   */
  async deleteTable(tableId: string, userId: string): Promise<void> {
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
    
    // Only owner or editor can delete table
    if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
      throw new AppError('You do not have permission to delete this table', 403);
    }
    
    // Delete table
    await this.tableRepository.delete(tableId);
    
    // We don't delete the Google Sheets sheet to prevent data loss
    // Instead, we could implement a soft delete mechanism or archive functionality
  }

  /**
   * Sync table with Google Sheets
   */
  async syncTable(tableId: string, userId: string, direction: 'from' | 'to'): Promise<any> {
    // Get table
    const table = await this.tableRepository.getTableWithFields(tableId);
    
    if (!table) {
      throw new AppError('Table not found', 404);
    }
    
    // Check if user has access to base
    const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(table.base_id, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this table', 403);
    }
    
    // Only owner or editor can sync table
    if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
      throw new AppError('You do not have permission to sync this table', 403);
    }
    
    // Get base
    const base = await this.baseRepository.findById(table.base_id);
    
    if (!base) {
      throw new AppError('Base not found', 404);
    }
    
    if (direction === 'from') {
      // Sync from Google Sheets
      const records = await this.syncService.syncFromGoogleSheets(
        base.google_sheets_id,
        table.google_sheet_name,
        tableId
      );
      
      return {
        message: 'Table synced from Google Sheets',
        records_count: records.length,
      };
    } else {
      // Sync to Google Sheets
      const { RecordModel } = await import('../models/Record');
      const records = await RecordModel.findByTableId(tableId, { includeDeleted: false });
      
      await this.syncService.syncToGoogleSheets(
        base.google_sheets_id,
        table.google_sheet_name,
        tableId,
        records,
        table.fields
      );
      
      return {
        message: 'Table synced to Google Sheets',
        records_count: records.length,
      };
    }
  }

  /**
   * Create initial fields for a table
   */
  private async createInitialFields(tableId: string, fields?: CreateFieldDTO[]): Promise<Field[]> {
    if (fields && fields.length > 0) {
      // Create provided fields
      const createdFields: Field[] = [];
      
      for (let i = 0; i < fields.length; i++) {
        const field = await FieldModel.create({
          ...fields[i],
          table_id: tableId,
          column_index: i,
        });
        
        createdFields.push(field);
      }
      
      return createdFields;
    } else {
      // Create default fields
      const nameField = await FieldModel.create({
        table_id: tableId,
        name: 'Name',
        type: 'text',
        required: true,
        column_index: 0,
      });
      
      const notesField = await FieldModel.create({
        table_id: tableId,
        name: 'Notes',
        type: 'text',
        required: false,
        column_index: 1,
      });
      
      return [nameField, notesField];
    }
  }

  /**
   * Format header row in Google Sheets
   */
  private async formatHeaderRow(spreadsheetId: string, sheetName: string, fields: Field[]): Promise<void> {
    try {
      // Create header row
      const headerRow = fields.map((field) => field.name);
      
      // Update header row
      await this.sheetsService.updateValues(
        spreadsheetId,
        `${sheetName}!A1:${this.columnIndexToLetter(fields.length)}1`,
        [headerRow]
      );
      
      // Format header row
      await this.sheetsService.batchUpdate(spreadsheetId, [
        {
          repeatCell: {
            range: {
              sheetId: fields[0].column_index, // Assuming sheetId is the same as the first field's column_index
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: fields.length,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId: fields[0].column_index,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ]);
    } catch (error) {
      logger.error(`Error formatting header row for sheet ${sheetName}:`, error);
      // Continue even if formatting fails
    }
  }

  /**
   * Convert column index to letter (e.g., 0 -> A, 25 -> Z, 26 -> AA)
   */
  private columnIndexToLetter(index: number): string {
    let letter = '';
    
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    
    return letter;
  }
}