import { Table } from '../models/Table';
import { Field } from '../models/Field';
import { Record } from '../models/Record';
import { TableService } from './TableService';
import { RecordService } from './RecordService';
import { FieldService } from './FieldService';
import { logger } from '../utils/logger';
import * as XLSX from 'xlsx';
import { Parser } from 'json2csv';
import { Readable } from 'stream';
import { createObjectCsvWriter } from 'csv-writer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { EventEmitter } from 'events';

// Define interfaces for import/export operations
export interface ImportProgress {
  totalRows: number;
  processedRows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  row: number;
  column: string;
  message: string;
}

export interface ImportWarning {
  row: number;
  column: string;
  message: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  includeHeaders: boolean;
  fileName?: string;
  viewId?: string; // If provided, export will respect view filters and field visibility
}

export interface ImportOptions {
  detectFieldTypes: boolean;
  headerRow: boolean;
  sheetIndex?: number; // For Excel imports with multiple sheets
  createTable?: boolean; // If true, create a new table; if false, import to existing table
  tableId?: string; // Required if createTable is false
  baseId?: string; // Required if createTable is true
  tableName?: string; // Required if createTable is true
}

export interface FieldTypeDetectionResult {
  name: string;
  type: string;
  options?: any;
}

/**
 * Service for handling import and export operations
 */
export class ImportExportService {
  private static instance: ImportExportService;
  private tableService: TableService;
  private recordService: RecordService;
  private fieldService: FieldService;
  private progressEmitter: EventEmitter;
  private importJobs: Map<string, ImportProgress>;
  private exportJobs: Map<string, any>;
  private tempDir: string;

  private constructor() {
    this.tableService = TableService.getInstance();
    this.recordService = RecordService.getInstance();
    this.fieldService = FieldService.getInstance();
    this.progressEmitter = new EventEmitter();
    this.importJobs = new Map();
    this.exportJobs = new Map();
    this.tempDir = path.join(os.tmpdir(), 'airtable-clone-temp');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  public static getInstance(): ImportExportService {
    if (!ImportExportService.instance) {
      ImportExportService.instance = new ImportExportService();
    }
    return ImportExportService.instance;
  }

  /**
   * Import data from a CSV file
   * @param file The CSV file buffer
   * @param options Import options
   * @returns Job ID for tracking progress
   */
  public async importCsv(file: Buffer, options: ImportOptions): Promise<string> {
    const jobId = uuidv4();
    
    // Initialize progress tracking
    this.importJobs.set(jobId, {
      totalRows: 0,
      processedRows: 0,
      status: 'pending',
      errors: [],
      warnings: []
    });

    // Process the import asynchronously
    this.processCsvImport(jobId, file, options).catch(error => {
      logger.error('CSV import failed:', error);
      const progress = this.importJobs.get(jobId);
      if (progress) {
        progress.status = 'failed';
        progress.errors.push({
          row: -1,
          column: '',
          message: `Import failed: ${error.message}`
        });
      }
    });

    return jobId;
  }

  /**
   * Import data from an Excel file
   * @param file The Excel file buffer
   * @param options Import options
   * @returns Job ID for tracking progress
   */
  public async importExcel(file: Buffer, options: ImportOptions): Promise<string> {
    const jobId = uuidv4();
    
    // Initialize progress tracking
    this.importJobs.set(jobId, {
      totalRows: 0,
      processedRows: 0,
      status: 'pending',
      errors: [],
      warnings: []
    });

    // Process the import asynchronously
    this.processExcelImport(jobId, file, options).catch(error => {
      logger.error('Excel import failed:', error);
      const progress = this.importJobs.get(jobId);
      if (progress) {
        progress.status = 'failed';
        progress.errors.push({
          row: -1,
          column: '',
          message: `Import failed: ${error.message}`
        });
      }
    });

    return jobId;
  }

  /**
   * Export data to a file
   * @param tableId The table ID to export
   * @param options Export options
   * @returns Path to the exported file
   */
  public async exportData(tableId: string, options: ExportOptions): Promise<string> {
    const table = await this.tableService.getTableById(tableId);
    if (!table) {
      throw new Error(`Table with ID ${tableId} not found`);
    }

    // Get records based on view if provided
    let records: Record[];
    let fields: Field[];
    
    if (options.viewId) {
      // Get records filtered by view
      const viewService = (await import('./ViewService')).ViewService.getInstance();
      const view = await viewService.getViewById(options.viewId);
      if (!view) {
        throw new Error(`View with ID ${options.viewId} not found`);
      }
      
      // Apply view filters and get visible fields
      records = await viewService.getRecordsForView(options.viewId);
      fields = await viewService.getVisibleFieldsForView(options.viewId);
    } else {
      // Get all records and fields
      records = await this.recordService.getAllRecords(tableId);
      fields = await this.fieldService.getFieldsByTableId(tableId);
    }

    // Generate filename if not provided
    const fileName = options.fileName || `${table.name}-export-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    
    // Export based on format
    switch (options.format) {
      case 'csv':
        return this.exportToCsv(table, fields, records, fileName, options);
      case 'xlsx':
        return this.exportToExcel(table, fields, records, fileName, options);
      case 'json':
        return this.exportToJson(table, fields, records, fileName, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Get the progress of an import job
   * @param jobId The job ID
   * @returns The current progress
   */
  public getImportProgress(jobId: string): ImportProgress | null {
    return this.importJobs.get(jobId) || null;
  }

  /**
   * Subscribe to import progress updates
   * @param jobId The job ID
   * @param callback The callback function
   */
  public subscribeToImportProgress(jobId: string, callback: (progress: ImportProgress) => void): void {
    this.progressEmitter.on(`import-progress-${jobId}`, callback);
  }

  /**
   * Unsubscribe from import progress updates
   * @param jobId The job ID
   * @param callback The callback function
   */
  public unsubscribeFromImportProgress(jobId: string, callback: (progress: ImportProgress) => void): void {
    this.progressEmitter.off(`import-progress-${jobId}`, callback);
  }

  /**
   * Process CSV import
   * @param jobId The job ID
   * @param file The CSV file buffer
   * @param options Import options
   */
  private async processCsvImport(jobId: string, file: Buffer, options: ImportOptions): Promise<void> {
    try {
      // Update status to processing
      const progress = this.importJobs.get(jobId);
      if (!progress) {
        throw new Error('Import job not found');
      }
      
      progress.status = 'processing';
      this.emitProgress(jobId, progress);

      // Parse CSV
      const workbook = XLSX.read(file, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        header: options.headerRow ? undefined : 1,
        defval: null
      });
      
      // Update total rows
      progress.totalRows = data.length;
      this.emitProgress(jobId, progress);

      // Process the data
      await this.processImportData(jobId, data, options);
      
      // Update status to completed
      progress.status = 'completed';
      this.emitProgress(jobId, progress);
    } catch (error) {
      logger.error('Error processing CSV import:', error);
      const progress = this.importJobs.get(jobId);
      if (progress) {
        progress.status = 'failed';
        progress.errors.push({
          row: -1,
          column: '',
          message: `Import failed: ${error.message}`
        });
        this.emitProgress(jobId, progress);
      }
    }
  }

  /**
   * Process Excel import
   * @param jobId The job ID
   * @param file The Excel file buffer
   * @param options Import options
   */
  private async processExcelImport(jobId: string, file: Buffer, options: ImportOptions): Promise<void> {
    try {
      // Update status to processing
      const progress = this.importJobs.get(jobId);
      if (!progress) {
        throw new Error('Import job not found');
      }
      
      progress.status = 'processing';
      this.emitProgress(jobId, progress);

      // Parse Excel
      const workbook = XLSX.read(file, { type: 'buffer' });
      
      // Determine which sheet to use
      const sheetIndex = options.sheetIndex || 0;
      if (sheetIndex >= workbook.SheetNames.length) {
        throw new Error(`Sheet index ${sheetIndex} out of bounds. Workbook has ${workbook.SheetNames.length} sheets.`);
      }
      
      const sheetName = workbook.SheetNames[sheetIndex];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        header: options.headerRow ? undefined : 1,
        defval: null
      });
      
      // Update total rows
      progress.totalRows = data.length;
      this.emitProgress(jobId, progress);

      // Process the data
      await this.processImportData(jobId, data, options);
      
      // Update status to completed
      progress.status = 'completed';
      this.emitProgress(jobId, progress);
    } catch (error) {
      logger.error('Error processing Excel import:', error);
      const progress = this.importJobs.get(jobId);
      if (progress) {
        progress.status = 'failed';
        progress.errors.push({
          row: -1,
          column: '',
          message: `Import failed: ${error.message}`
        });
        this.emitProgress(jobId, progress);
      }
    }
  }

  /**
   * Process import data
   * @param jobId The job ID
   * @param data The parsed data
   * @param options Import options
   */
  private async processImportData(jobId: string, data: any[], options: ImportOptions): Promise<void> {
    const progress = this.importJobs.get(jobId);
    if (!progress) {
      throw new Error('Import job not found');
    }

    // If no data, return early
    if (data.length === 0) {
      progress.status = 'completed';
      this.emitProgress(jobId, progress);
      return;
    }

    let table: Table;
    let fields: Field[];

    // Create new table or use existing one
    if (options.createTable) {
      if (!options.baseId || !options.tableName) {
        throw new Error('baseId and tableName are required when creating a new table');
      }

      // Detect field types if requested
      const fieldTypes = options.detectFieldTypes 
        ? this.detectFieldTypes(data)
        : this.createDefaultFieldTypes(data[0]);

      // Create table
      table = await this.tableService.createTable({
        baseId: options.baseId,
        name: options.tableName,
        description: `Imported table on ${new Date().toISOString()}`
      });

      // Create fields
      fields = [];
      for (const fieldType of fieldTypes) {
        const field = await this.fieldService.createField({
          tableId: table.id,
          name: fieldType.name,
          type: fieldType.type as any,
          options: fieldType.options,
          required: false
        });
        fields.push(field);
      }
    } else {
      if (!options.tableId) {
        throw new Error('tableId is required when importing to an existing table');
      }

      // Get existing table and fields
      table = await this.tableService.getTableById(options.tableId);
      if (!table) {
        throw new Error(`Table with ID ${options.tableId} not found`);
      }
      
      fields = await this.fieldService.getFieldsByTableId(options.tableId);
    }

    // Create records
    const fieldMap = new Map(fields.map(f => [f.name, f]));
    const batchSize = 100;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const records = batch.map(row => {
        const recordData: any = {};
        
        // Map row data to fields
        for (const [key, value] of Object.entries(row)) {
          const field = fieldMap.get(key);
          if (field) {
            // Validate and convert value based on field type
            try {
              recordData[field.id] = this.convertValueForFieldType(value, field.type);
            } catch (error) {
              progress.warnings.push({
                row: i + batch.indexOf(row) + 1,
                column: key,
                message: `Value conversion failed: ${error.message}. Using null instead.`
              });
              recordData[field.id] = null;
            }
          }
        }
        
        return {
          tableId: table.id,
          fields: recordData
        };
      });
      
      // Create records in batch
      try {
        await this.recordService.createRecords(table.id, records);
      } catch (error) {
        progress.errors.push({
          row: i + 1,
          column: '',
          message: `Failed to create records: ${error.message}`
        });
      }
      
      // Update progress
      progress.processedRows += batch.length;
      this.emitProgress(jobId, progress);
    }
  }

  /**
   * Export data to CSV
   * @param table The table
   * @param fields The fields
   * @param records The records
   * @param fileName The file name
   * @param options Export options
   * @returns Path to the exported file
   */
  private async exportToCsv(
    table: Table, 
    fields: Field[], 
    records: Record[], 
    fileName: string, 
    options: ExportOptions
  ): Promise<string> {
    // Create file path
    const filePath = path.join(this.tempDir, `${fileName}.csv`);
    
    // Prepare headers and data
    const headers = fields.map(field => ({
      id: field.id,
      title: field.name
    }));
    
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });
    
    // Prepare data
    const data = records.map(record => {
      const row: any = {};
      fields.forEach(field => {
        row[field.id] = this.formatValueForExport(record.fields[field.id], field.type);
      });
      return row;
    });
    
    // Write CSV
    await csvWriter.writeRecords(data);
    
    return filePath;
  }

  /**
   * Export data to Excel
   * @param table The table
   * @param fields The fields
   * @param records The records
   * @param fileName The file name
   * @param options Export options
   * @returns Path to the exported file
   */
  private async exportToExcel(
    table: Table, 
    fields: Field[], 
    records: Record[], 
    fileName: string, 
    options: ExportOptions
  ): Promise<string> {
    // Create file path
    const filePath = path.join(this.tempDir, `${fileName}.xlsx`);
    
    // Prepare headers and data
    const headers = fields.map(field => field.name);
    
    // Prepare data including headers if requested
    const data = records.map(record => {
      return fields.map(field => 
        this.formatValueForExport(record.fields[field.id], field.type)
      );
    });
    
    if (options.includeHeaders) {
      data.unshift(headers);
    }
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, table.name);
    
    // Write to file
    XLSX.writeFile(wb, filePath);
    
    return filePath;
  }

  /**
   * Export data to JSON
   * @param table The table
   * @param fields The fields
   * @param records The records
   * @param fileName The file name
   * @param options Export options
   * @returns Path to the exported file
   */
  private async exportToJson(
    table: Table, 
    fields: Field[], 
    records: Record[], 
    fileName: string, 
    options: ExportOptions
  ): Promise<string> {
    // Create file path
    const filePath = path.join(this.tempDir, `${fileName}.json`);
    
    // Prepare data
    const data = records.map(record => {
      const row: any = {};
      fields.forEach(field => {
        row[field.name] = record.fields[field.id];
      });
      return row;
    });
    
    // Write JSON
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    return filePath;
  }

  /**
   * Detect field types from data
   * @param data The data to analyze
   * @returns Detected field types
   */
  private detectFieldTypes(data: any[]): FieldTypeDetectionResult[] {
    if (data.length === 0) {
      return [];
    }
    
    // Get all possible keys from all rows
    const allKeys = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    
    // Analyze each column
    const fieldTypes: FieldTypeDetectionResult[] = [];
    
    allKeys.forEach(key => {
      // Get all non-null values for this key
      const values = data
        .map(row => row[key])
        .filter(value => value !== null && value !== undefined);
      
      // Detect type based on values
      const type = this.detectFieldType(values);
      
      fieldTypes.push({
        name: key,
        type,
        options: type === 'singleSelect' || type === 'multiSelect' 
          ? { choices: this.detectChoices(values) } 
          : undefined
      });
    });
    
    return fieldTypes;
  }

  /**
   * Create default field types from a data row
   * @param row The data row
   * @returns Default field types
   */
  private createDefaultFieldTypes(row: any): FieldTypeDetectionResult[] {
    if (!row) {
      return [];
    }
    
    return Object.keys(row).map(key => ({
      name: key,
      type: 'text'
    }));
  }

  /**
   * Detect field type from values
   * @param values The values to analyze
   * @returns Detected field type
   */
  private detectFieldType(values: any[]): string {
    if (values.length === 0) {
      return 'text';
    }
    
    // Check if all values are booleans
    const allBooleans = values.every(value => 
      typeof value === 'boolean' || 
      value === 'true' || 
      value === 'false' || 
      value === 1 || 
      value === 0 ||
      value === '1' ||
      value === '0'
    );
    
    if (allBooleans) {
      return 'checkbox';
    }
    
    // Check if all values are numbers
    const allNumbers = values.every(value => 
      !isNaN(Number(value)) && typeof value !== 'boolean'
    );
    
    if (allNumbers) {
      return 'number';
    }
    
    // Check if all values are dates
    const allDates = values.every(value => {
      const date = new Date(value);
      return !isNaN(date.getTime());
    });
    
    if (allDates) {
      return 'date';
    }
    
    // Check if values are from a limited set (potential single select)
    const uniqueValues = new Set(values);
    if (uniqueValues.size <= 10 && uniqueValues.size < values.length / 2) {
      return 'singleSelect';
    }
    
    // Default to text
    return 'text';
  }

  /**
   * Detect choices for select fields
   * @param values The values to analyze
   * @returns Detected choices
   */
  private detectChoices(values: any[]): { name: string; color: string }[] {
    const uniqueValues = [...new Set(values)];
    const colors = [
      '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
      '#536DFE', '#448AFF', '#40C4FF', '#18FFFF',
      '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41',
      '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
    ];
    
    return uniqueValues.map((value, index) => ({
      name: String(value),
      color: colors[index % colors.length]
    }));
  }

  /**
   * Convert value for field type
   * @param value The value to convert
   * @param fieldType The field type
   * @returns Converted value
   */
  private convertValueForFieldType(value: any, fieldType: string): any {
    if (value === null || value === undefined) {
      return null;
    }
    
    switch (fieldType) {
      case 'text':
        return String(value);
      
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Cannot convert "${value}" to number`);
        }
        return num;
      
      case 'checkbox':
        if (typeof value === 'boolean') {
          return value;
        }
        if (value === 'true' || value === '1' || value === 1) {
          return true;
        }
        if (value === 'false' || value === '0' || value === 0) {
          return false;
        }
        throw new Error(`Cannot convert "${value}" to boolean`);
      
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`Cannot convert "${value}" to date`);
        }
        return date.toISOString();
      
      case 'singleSelect':
        return String(value);
      
      case 'multiSelect':
        if (Array.isArray(value)) {
          return value.map(String);
        }
        return [String(value)];
      
      default:
        return value;
    }
  }

  /**
   * Format value for export
   * @param value The value to format
   * @param fieldType The field type
   * @returns Formatted value
   */
  private formatValueForExport(value: any, fieldType: string): any {
    if (value === null || value === undefined) {
      return '';
    }
    
    switch (fieldType) {
      case 'date':
        if (typeof value === 'string') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
        return value;
      
      case 'multiSelect':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value;
      
      default:
        return value;
    }
  }

  /**
   * Emit progress update
   * @param jobId The job ID
   * @param progress The progress
   */
  private emitProgress(jobId: string, progress: ImportProgress): void {
    this.progressEmitter.emit(`import-progress-${jobId}`, { ...progress });
  }

  /**
   * Clean up temporary files
   * @param filePath The file path to clean up
   */
  public async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      logger.error('Error cleaning up temp file:', error);
    }
  }
}