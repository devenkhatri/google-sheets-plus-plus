import { ImportExportService } from '../../services/ImportExportService';
import { TableService } from '../../services/TableService';
import { RecordService } from '../../services/RecordService';
import { FieldService } from '../../services/FieldService';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock dependencies
jest.mock('../../services/TableService');
jest.mock('../../services/RecordService');
jest.mock('../../services/FieldService');
jest.mock('xlsx');
jest.mock('fs');
jest.mock('path');
jest.mock('os');

describe('ImportExportService', () => {
  let importExportService: ImportExportService;
  let mockTableService: jest.Mocked<TableService>;
  let mockRecordService: jest.Mocked<RecordService>;
  let mockFieldService: jest.Mocked<FieldService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mocks
    mockTableService = TableService.getInstance() as jest.Mocked<TableService>;
    mockRecordService = RecordService.getInstance() as jest.Mocked<RecordService>;
    mockFieldService = FieldService.getInstance() as jest.Mocked<FieldService>;
    
    // Mock os.tmpdir
    (os.tmpdir as jest.Mock).mockReturnValue('/tmp');
    
    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    
    // Mock fs.existsSync
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // Mock fs.mkdirSync
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    
    // Get service instance
    importExportService = ImportExportService.getInstance();
  });

  describe('importCsv', () => {
    it('should initialize import job and return job ID', async () => {
      // Mock XLSX.read
      (XLSX.read as jest.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      });
      
      // Mock XLSX.utils.sheet_to_json
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ]);
      
      // Mock table creation
      mockTableService.createTable.mockResolvedValue({
        id: 'table-1',
        baseId: 'base-1',
        name: 'Test Table',
        googleSheetId: 123,
        fields: [],
        views: [],
        recordCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Mock field creation
      mockFieldService.createField.mockResolvedValue({
        id: 'field-1',
        tableId: 'table-1',
        name: 'name',
        type: 'text',
        options: {},
        required: false,
        columnIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Call the method
      const jobId = await importExportService.importCsv(Buffer.from('test'), {
        detectFieldTypes: true,
        headerRow: true,
        createTable: true,
        baseId: 'base-1',
        tableName: 'Test Table'
      });
      
      // Assertions
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(XLSX.read).toHaveBeenCalledWith(Buffer.from('test'), { type: 'buffer' });
    });
  });

  describe('importExcel', () => {
    it('should initialize import job and return job ID', async () => {
      // Mock XLSX.read
      (XLSX.read as jest.Mock).mockReturnValue({
        SheetNames: ['Sheet1', 'Sheet2'],
        Sheets: {
          Sheet1: {},
          Sheet2: {}
        }
      });
      
      // Mock XLSX.utils.sheet_to_json
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ]);
      
      // Mock table service
      mockTableService.getTableById.mockResolvedValue({
        id: 'table-1',
        baseId: 'base-1',
        name: 'Test Table',
        googleSheetId: 123,
        fields: [],
        views: [],
        recordCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Mock field service
      mockFieldService.getFieldsByTableId.mockResolvedValue([
        {
          id: 'field-1',
          tableId: 'table-1',
          name: 'name',
          type: 'text',
          options: {},
          required: false,
          columnIndex: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'field-2',
          tableId: 'table-1',
          name: 'age',
          type: 'number',
          options: {},
          required: false,
          columnIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      
      // Call the method
      const jobId = await importExportService.importExcel(Buffer.from('test'), {
        detectFieldTypes: false,
        headerRow: true,
        sheetIndex: 1,
        createTable: false,
        tableId: 'table-1'
      });
      
      // Assertions
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(XLSX.read).toHaveBeenCalledWith(Buffer.from('test'), { type: 'buffer' });
    });
  });

  describe('exportData', () => {
    it('should export data to CSV format', async () => {
      // Mock table service
      mockTableService.getTableById.mockResolvedValue({
        id: 'table-1',
        baseId: 'base-1',
        name: 'Test Table',
        googleSheetId: 123,
        fields: [],
        views: [],
        recordCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Mock record service
      mockRecordService.getAllRecords.mockResolvedValue([
        {
          id: 'record-1',
          tableId: 'table-1',
          rowIndex: 0,
          fields: {
            'field-1': 'John',
            'field-2': 30
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          lastModifiedBy: 'user-1'
        },
        {
          id: 'record-2',
          tableId: 'table-1',
          rowIndex: 1,
          fields: {
            'field-1': 'Jane',
            'field-2': 25
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          lastModifiedBy: 'user-1'
        }
      ]);
      
      // Mock field service
      mockFieldService.getFieldsByTableId.mockResolvedValue([
        {
          id: 'field-1',
          tableId: 'table-1',
          name: 'name',
          type: 'text',
          options: {},
          required: false,
          columnIndex: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'field-2',
          tableId: 'table-1',
          name: 'age',
          type: 'number',
          options: {},
          required: false,
          columnIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      
      // Mock fs.writeFileSync
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      
      // Call the method
      const filePath = await importExportService.exportData('table-1', {
        format: 'json',
        includeHeaders: true
      });
      
      // Assertions
      expect(filePath).toBeDefined();
      expect(typeof filePath).toBe('string');
      expect(mockTableService.getTableById).toHaveBeenCalledWith('table-1');
      expect(mockRecordService.getAllRecords).toHaveBeenCalledWith('table-1');
      expect(mockFieldService.getFieldsByTableId).toHaveBeenCalledWith('table-1');
    });
  });

  describe('getImportProgress', () => {
    it('should return import progress for a valid job ID', async () => {
      // Setup
      const jobId = 'test-job-id';
      const progress = {
        totalRows: 10,
        processedRows: 5,
        status: 'processing' as const,
        errors: [],
        warnings: []
      };
      
      // @ts-ignore - accessing private property for testing
      importExportService.importJobs = new Map();
      // @ts-ignore - accessing private property for testing
      importExportService.importJobs.set(jobId, progress);
      
      // Call the method
      const result = importExportService.getImportProgress(jobId);
      
      // Assertions
      expect(result).toEqual(progress);
    });
    
    it('should return null for an invalid job ID', async () => {
      // Call the method
      const result = importExportService.getImportProgress('invalid-job-id');
      
      // Assertions
      expect(result).toBeNull();
    });
  });
});