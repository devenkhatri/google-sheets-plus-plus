import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { AppError } from '../../middleware/errorHandler';

// Mock the googleapis module
jest.mock('googleapis', () => {
  const mockSheets = {
    spreadsheets: {
      create: jest.fn(),
      get: jest.fn(),
      batchUpdate: jest.fn(),
      values: {
        get: jest.fn(),
        update: jest.fn(),
        append: jest.fn(),
        batchGet: jest.fn(),
        batchUpdate: jest.fn(),
      },
    },
  };
  
  return {
    google: {
      sheets: jest.fn(() => mockSheets),
    },
  };
});

// Mock the redis client
jest.mock('../../config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  },
}));

describe('GoogleSheetsService', () => {
  let service: GoogleSheetsService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = GoogleSheetsService.getInstance();
  });
  
  describe('createSpreadsheet', () => {
    it('should create a spreadsheet', async () => {
      // Mock the response
      const mockResponse = {
        data: {
          spreadsheetId: 'mock-spreadsheet-id',
        },
      };
      
      // @ts-ignore - Mocked implementation
      service.sheets.spreadsheets.create.mockResolvedValue(mockResponse);
      
      // Call the method
      const spreadsheetId = await service.createSpreadsheet('Test Spreadsheet');
      
      // Verify the result
      expect(spreadsheetId).toBe('mock-spreadsheet-id');
      
      // Verify the API call
      expect(service.sheets.spreadsheets.create).toHaveBeenCalledWith({
        requestBody: {
          properties: {
            title: 'Test Spreadsheet',
          },
        },
      });
    });
    
    it('should throw an error if the API call fails', async () => {
      // Mock the error
      const mockError = new Error('API error');
      
      // @ts-ignore - Mocked implementation
      service.sheets.spreadsheets.create.mockRejectedValue(mockError);
      
      // Call the method and expect it to throw
      await expect(service.createSpreadsheet('Test Spreadsheet')).rejects.toThrow(AppError);
    });
  });
  
  describe('getValues', () => {
    it('should get values from a range', async () => {
      // Mock the response
      const mockResponse = {
        data: {
          values: [
            ['Header 1', 'Header 2'],
            ['Value 1', 'Value 2'],
          ],
        },
      };
      
      // @ts-ignore - Mocked implementation
      service.sheets.spreadsheets.values.get.mockResolvedValue(mockResponse);
      
      // Mock the redis client
      const mockRedisClient = require('../../config/redis').redisClient;
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      
      // Call the method
      const result = await service.getValues('mock-spreadsheet-id', 'Sheet1!A1:B2');
      
      // Verify the result
      expect(result).toEqual(mockResponse.data);
      
      // Verify the API call
      expect(service.sheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'mock-spreadsheet-id',
        range: 'Sheet1!A1:B2',
      });
      
      // Verify the cache
      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });
    
    it('should return cached values if available', async () => {
      // Mock the cached data
      const cachedData = JSON.stringify({
        values: [
          ['Cached Header 1', 'Cached Header 2'],
          ['Cached Value 1', 'Cached Value 2'],
        ],
      });
      
      // Mock the redis client
      const mockRedisClient = require('../../config/redis').redisClient;
      mockRedisClient.get.mockResolvedValue(cachedData);
      
      // Call the method
      const result = await service.getValues('mock-spreadsheet-id', 'Sheet1!A1:B2');
      
      // Verify the result
      expect(result).toEqual(JSON.parse(cachedData));
      
      // Verify that the API was not called
      expect(service.sheets.spreadsheets.values.get).not.toHaveBeenCalled();
    });
  });
  
  describe('updateValues', () => {
    it('should update values in a range', async () => {
      // Mock the response
      const mockResponse = {
        data: {
          updatedCells: 4,
        },
      };
      
      // @ts-ignore - Mocked implementation
      service.sheets.spreadsheets.values.update.mockResolvedValue(mockResponse);
      
      // Mock the redis client
      const mockRedisClient = require('../../config/redis').redisClient;
      mockRedisClient.del.mockResolvedValue(1);
      
      // Call the method
      const values = [
        ['New Value 1', 'New Value 2'],
        ['New Value 3', 'New Value 4'],
      ];
      const result = await service.updateValues('mock-spreadsheet-id', 'Sheet1!A1:B2', values);
      
      // Verify the result
      expect(result).toEqual(mockResponse.data);
      
      // Verify the API call
      expect(service.sheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'mock-spreadsheet-id',
        range: 'Sheet1!A1:B2',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values,
        },
      });
      
      // Verify the cache invalidation
      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });
});