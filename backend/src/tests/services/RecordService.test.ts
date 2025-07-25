import { RecordService } from '../../services/RecordService';
import { RecordRepository } from '../../repositories/RecordRepository';
import { TableModel } from '../../models/Table';
import { GoogleSheetsSyncService } from '../../services/GoogleSheetsSyncService';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { AppError } from '../../middleware/errorHandler';

// Mock dependencies
jest.mock('../../repositories/RecordRepository');
jest.mock('../../models/Table');
jest.mock('../../services/GoogleSheetsSyncService');
jest.mock('../../services/GoogleSheetsService');
jest.mock('../../config/redis', () => ({
  redisClient: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock('../../index', () => ({
  io: {
    to: jest.fn().mockReturnValue({
      emit: jest.fn(),
    }),
  },
}));

describe('RecordService', () => {
  let recordService: RecordService;
  let mockRecordRepository: jest.Mocked<RecordRepository>;
  let mockGoogleSheetsSyncService: jest.Mocked<GoogleSheetsSyncService>;
  
  const mockTable = {
    id: 'table-123',
    base_id: 'base-123',
    name: 'Test Table',
    google_sheet_id: 123,
    google_sheet_name: 'TestSheet',
    record_count: 0,
  };
  
  const mockBase = {
    id: 'base-123',
    name: 'Test Base',
    google_sheets_id: 'sheets-123',
    fields: [
      { id: 'field-1', name: 'Name', type: 'text' },
      { id: 'field-2', name: 'Age', type: 'number' },
    ],
  };
  
  const mockRecord = {
    id: 'record-123',
    table_id: 'table-123',
    row_index: 1,
    fields: { 'field-1': 'John', 'field-2': 30 },
    deleted: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockRecordRepository = new RecordRepository() as jest.Mocked<RecordRepository>;
    (RecordRepository as jest.Mock).mockImplementation(() => mockRecordRepository);
    
    mockGoogleSheetsSyncService = GoogleSheetsSyncService.getInstance() as jest.Mocked<GoogleSheetsSyncService>;
    
    // Mock TableModel methods
    (TableModel.findById as jest.Mock).mockResolvedValue(mockTable);
    (TableModel.getTableWithFields as jest.Mock).mockResolvedValue(mockBase);
    
    // Mock RecordRepository methods
    mockRecordRepository.create.mockResolvedValue(mockRecord);
    mockRecordRepository.findById.mockResolvedValue(mockRecord);
    mockRecordRepository.findByTableId.mockResolvedValue([mockRecord]);
    mockRecordRepository.countByTableId.mockResolvedValue(1);
    mockRecordRepository.update.mockResolvedValue(mockRecord);
    mockRecordRepository.softDelete.mockResolvedValue(true);
    mockRecordRepository.restore.mockResolvedValue(mockRecord);
    mockRecordRepository.bulkCreate.mockResolvedValue([mockRecord]);
    mockRecordRepository.bulkUpdate.mockResolvedValue([mockRecord]);
    
    // Mock GoogleSheetsSyncService methods
    (mockGoogleSheetsSyncService.createRecord as jest.Mock).mockResolvedValue(1);
    (mockGoogleSheetsSyncService.updateRecord as jest.Mock).mockResolvedValue(undefined);
    (mockGoogleSheetsSyncService.syncFromGoogleSheets as jest.Mock).mockResolvedValue([
      { rowIndex: 1, Name: 'John', Age: 30 },
    ]);
    (mockGoogleSheetsSyncService.syncToGoogleSheets as jest.Mock).mockResolvedValue(undefined);
    
    // Initialize service
    recordService = new RecordService();
  });

  describe('createRecord', () => {
    it('should create a record and sync to Google Sheets', async () => {
      const recordData = {
        table_id: 'table-123',
        fields: { 'field-1': 'John', 'field-2': 30 },
      };
      
      const result = await recordService.createRecord(recordData);
      
      expect(mockRecordRepository.create).toHaveBeenCalledWith(recordData);
      expect(mockGoogleSheetsSyncService.createRecord).toHaveBeenCalledWith(
        'sheets-123',
        'TestSheet',
        mockBase.fields,
        recordData.fields
      );
      expect(result).toEqual(mockRecord);
    });
    
    it('should create a record without syncing to Google Sheets when syncToSheets is false', async () => {
      const recordData = {
        table_id: 'table-123',
        fields: { 'field-1': 'John', 'field-2': 30 },
      };
      
      await recordService.createRecord(recordData, false);
      
      expect(mockRecordRepository.create).toHaveBeenCalledWith(recordData);
      expect(mockGoogleSheetsSyncService.createRecord).not.toHaveBeenCalled();
    });
    
    it('should throw an error if table is not found', async () => {
      (TableModel.findById as jest.Mock).mockResolvedValueOnce(null);
      
      const recordData = {
        table_id: 'table-123',
        fields: { 'field-1': 'John', 'field-2': 30 },
      };
      
      await expect(recordService.createRecord(recordData)).rejects.toThrow('Table not found');
    });
  });

  describe('getRecordById', () => {
    it('should return a record by ID', async () => {
      const result = await recordService.getRecordById('record-123');
      
      expect(mockRecordRepository.findById).toHaveBeenCalledWith('record-123');
      expect(result).toEqual(mockRecord);
    });
    
    it('should throw an error if record is not found', async () => {
      mockRecordRepository.findById.mockResolvedValueOnce(null);
      
      await expect(recordService.getRecordById('record-123')).rejects.toThrow('Record not found');
    });
  });

  describe('getRecordsByTableId', () => {
    it('should return records by table ID with pagination', async () => {
      const options = {
        limit: 10,
        offset: 0,
        filters: [{ fieldId: 'field-1', operator: 'equals', value: 'John' }],
        sorts: [{ fieldId: 'field-2', direction: 'asc' }],
      };
      
      const result = await recordService.getRecordsByTableId('table-123', options);
      
      expect(mockRecordRepository.findByTableId).toHaveBeenCalledWith('table-123', options);
      expect(mockRecordRepository.countByTableId).toHaveBeenCalledWith('table-123', options.filters, false);
      expect(result).toEqual({ records: [mockRecord], total: 1 });
    });
  });

  describe('updateRecord', () => {
    it('should update a record and sync to Google Sheets', async () => {
      const recordData = {
        fields: { 'field-1': 'Updated John', 'field-2': 31 },
      };
      
      const result = await recordService.updateRecord('record-123', recordData);
      
      expect(mockRecordRepository.update).toHaveBeenCalledWith('record-123', recordData);
      expect(mockGoogleSheetsSyncService.updateRecord).toHaveBeenCalledWith(
        'sheets-123',
        'TestSheet',
        mockRecord.row_index,
        mockBase.fields,
        mockRecord.fields
      );
      expect(result).toEqual(mockRecord);
    });
    
    it('should update a record without syncing to Google Sheets when syncToSheets is false', async () => {
      const recordData = {
        fields: { 'field-1': 'Updated John', 'field-2': 31 },
      };
      
      await recordService.updateRecord('record-123', recordData, false);
      
      expect(mockRecordRepository.update).toHaveBeenCalledWith('record-123', recordData);
      expect(mockGoogleSheetsSyncService.updateRecord).not.toHaveBeenCalled();
    });
    
    it('should throw an error if record is not found', async () => {
      mockRecordRepository.findById.mockResolvedValueOnce(null);
      
      const recordData = {
        fields: { 'field-1': 'Updated John', 'field-2': 31 },
      };
      
      await expect(recordService.updateRecord('record-123', recordData)).rejects.toThrow('Record not found');
    });
  });

  describe('softDeleteRecord', () => {
    it('should soft delete a record and update Google Sheets', async () => {
      const result = await recordService.softDeleteRecord('record-123', 'user-123');
      
      expect(mockRecordRepository.softDelete).toHaveBeenCalledWith('record-123', 'user-123');
      expect(mockGoogleSheetsSyncService.updateRecord).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should soft delete a record without updating Google Sheets when syncToSheets is false', async () => {
      await recordService.softDeleteRecord('record-123', 'user-123', false);
      
      expect(mockRecordRepository.softDelete).toHaveBeenCalledWith('record-123', 'user-123');
      expect(mockGoogleSheetsSyncService.updateRecord).not.toHaveBeenCalled();
    });
    
    it('should throw an error if record is not found', async () => {
      mockRecordRepository.findById.mockResolvedValueOnce(null);
      
      await expect(recordService.softDeleteRecord('record-123', 'user-123')).rejects.toThrow('Record not found');
    });
  });

  describe('restoreRecord', () => {
    it('should restore a soft-deleted record and update Google Sheets', async () => {
      const mockDeletedRecord = { ...mockRecord, deleted: true };
      mockRecordRepository.findById.mockResolvedValueOnce(mockDeletedRecord);
      
      const result = await recordService.restoreRecord('record-123', 'user-123');
      
      expect(mockRecordRepository.restore).toHaveBeenCalledWith('record-123', 'user-123');
      expect(mockGoogleSheetsSyncService.updateRecord).toHaveBeenCalled();
      expect(result).toEqual(mockRecord);
    });
    
    it('should throw an error if record is not deleted', async () => {
      await expect(recordService.restoreRecord('record-123', 'user-123')).rejects.toThrow('Record is not deleted');
    });
  });

  describe('bulkCreateRecords', () => {
    it('should bulk create records and sync to Google Sheets', async () => {
      const recordsData = [
        {
          table_id: 'table-123',
          fields: { 'field-1': 'John', 'field-2': 30 },
        },
        {
          table_id: 'table-123',
          fields: { 'field-1': 'Jane', 'field-2': 25 },
        },
      ];
      
      const result = await recordService.bulkCreateRecords(recordsData);
      
      expect(mockRecordRepository.bulkCreate).toHaveBeenCalledWith(recordsData);
      expect(mockGoogleSheetsSyncService.syncToGoogleSheets).toHaveBeenCalled();
      expect(result).toEqual([mockRecord]);
    });
  });

  describe('bulkUpdateRecords', () => {
    it('should bulk update records and sync to Google Sheets', async () => {
      const updates = [
        {
          id: 'record-123',
          data: {
            fields: { 'field-1': 'Updated John', 'field-2': 31 },
          },
        },
      ];
      
      const result = await recordService.bulkUpdateRecords(updates);
      
      expect(mockRecordRepository.bulkUpdate).toHaveBeenCalledWith(updates);
      expect(mockGoogleSheetsSyncService.updateRecord).toHaveBeenCalled();
      expect(result).toEqual([mockRecord]);
    });
  });

  describe('syncFromGoogleSheets', () => {
    it('should sync records from Google Sheets to the application', async () => {
      const result = await recordService.syncFromGoogleSheets('table-123');
      
      expect(mockGoogleSheetsSyncService.syncFromGoogleSheets).toHaveBeenCalledWith(
        'sheets-123',
        'TestSheet',
        'table-123'
      );
      expect(mockRecordRepository.bulkCreate).toHaveBeenCalled();
      expect(result).toEqual({ added: 1, updated: 0, deleted: 0 });
    });
  });

  describe('syncToGoogleSheets', () => {
    it('should sync records from the application to Google Sheets', async () => {
      await recordService.syncToGoogleSheets('table-123');
      
      expect(mockRecordRepository.findByTableId).toHaveBeenCalledWith('table-123', { limit: 10000 });
      expect(mockGoogleSheetsSyncService.syncToGoogleSheets).toHaveBeenCalledWith(
        'sheets-123',
        'TestSheet',
        'table-123',
        [mockRecord],
        mockBase.fields
      );
    });
  });
});