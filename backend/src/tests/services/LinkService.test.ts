import { LinkService } from '../../services/LinkService';
import { FieldModel } from '../../models/Field';
import { TableModel } from '../../models/Table';
import { RecordModel } from '../../models/Record';
import { db } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

// Mock dependencies
jest.mock('../../models/Field');
jest.mock('../../models/Table');
jest.mock('../../models/Record');
jest.mock('../../config/database');

describe('LinkService', () => {
  let linkService: LinkService;
  let mockDb: any;

  beforeEach(() => {
    linkService = new LinkService();
    mockDb = db as jest.Mocked<typeof db>;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (mockDb as any).mockImplementation(() => mockDb);
    mockDb.where = jest.fn().mockReturnThis();
    mockDb.orWhere = jest.fn().mockReturnThis();
    mockDb.first = jest.fn().mockResolvedValue({});
    mockDb.insert = jest.fn().mockReturnThis();
    mockDb.delete = jest.fn().mockResolvedValue(1);
    mockDb.returning = jest.fn().mockResolvedValue([{ id: 'test-link-id' }]);
    mockDb.select = jest.fn().mockReturnThis();
  });

  describe('createLink', () => {
    it('should create a link between two fields', async () => {
      // Mock field data
      const sourceField = {
        id: 'source-field-id',
        table_id: 'source-table-id',
        type: 'link',
      };
      const targetField = {
        id: 'target-field-id',
        table_id: 'target-table-id',
        type: 'link',
      };
      
      // Setup mocks
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'source-field-id') return Promise.resolve(sourceField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Mock circular reference check
      jest.spyOn(linkService as any, 'wouldCreateCircularReference').mockResolvedValue(false);
      
      // Call the method
      const result = await linkService.createLink('source-field-id', 'target-field-id');
      
      // Assertions
      expect(result).toEqual({ id: 'test-link-id' });
      expect(FieldModel.findById).toHaveBeenCalledWith('source-field-id');
      expect(FieldModel.findById).toHaveBeenCalledWith('target-field-id');
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
    });

    it('should throw an error if fields are in the same table', async () => {
      // Mock field data
      const sourceField = {
        id: 'source-field-id',
        table_id: 'same-table-id',
        type: 'link',
      };
      const targetField = {
        id: 'target-field-id',
        table_id: 'same-table-id',
        type: 'link',
      };
      
      // Setup mocks
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'source-field-id') return Promise.resolve(sourceField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Call the method and expect error
      await expect(linkService.createLink('source-field-id', 'target-field-id'))
        .rejects
        .toThrow('Cannot link fields in the same table');
    });

    it('should throw an error if fields are not of type link', async () => {
      // Mock field data
      const sourceField = {
        id: 'source-field-id',
        table_id: 'source-table-id',
        type: 'text', // Not a link field
      };
      const targetField = {
        id: 'target-field-id',
        table_id: 'target-table-id',
        type: 'link',
      };
      
      // Setup mocks
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'source-field-id') return Promise.resolve(sourceField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Call the method and expect error
      await expect(linkService.createLink('source-field-id', 'target-field-id'))
        .rejects
        .toThrow('Source field must be of type "link"');
    });

    it('should throw an error if creating a circular reference', async () => {
      // Mock field data
      const sourceField = {
        id: 'source-field-id',
        table_id: 'source-table-id',
        type: 'link',
      };
      const targetField = {
        id: 'target-field-id',
        table_id: 'target-table-id',
        type: 'link',
      };
      
      // Setup mocks
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'source-field-id') return Promise.resolve(sourceField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Mock circular reference check
      jest.spyOn(linkService as any, 'wouldCreateCircularReference').mockResolvedValue(true);
      
      // Call the method and expect error
      await expect(linkService.createLink('source-field-id', 'target-field-id'))
        .rejects
        .toThrow('This link would create a circular reference');
    });
  });

  describe('getLinksForField', () => {
    it('should return links for a field', async () => {
      // Mock data
      const mockLinks = [
        { id: 'link-1', source_field_id: 'field-id', target_field_id: 'other-field-id' },
        { id: 'link-2', source_field_id: 'other-field-id', target_field_id: 'field-id' },
      ];
      
      // Setup mocks
      mockDb.where.mockReturnThis();
      mockDb.orWhere.mockReturnThis();
      mockDb.mockResolvedValue(mockLinks);
      
      // Call the method
      const result = await linkService.getLinksForField('field-id');
      
      // Assertions
      expect(result).toEqual(mockLinks);
      expect(mockDb.where).toHaveBeenCalledWith({ source_field_id: 'field-id' });
      expect(mockDb.orWhere).toHaveBeenCalledWith({ target_field_id: 'field-id' });
    });
  });

  describe('linkRecords', () => {
    it('should link two records', async () => {
      // Mock data
      const mockLink = {
        id: 'link-id',
        source_field_id: 'source-field-id',
        target_field_id: 'target-field-id',
      };
      
      const sourceRecord = {
        id: 'source-record-id',
        table_id: 'source-table-id',
        fields: {},
      };
      
      const targetRecord = {
        id: 'target-record-id',
        table_id: 'target-table-id',
        fields: {},
      };
      
      const sourceField = {
        id: 'source-field-id',
        table_id: 'source-table-id',
        type: 'link',
      };
      
      const targetField = {
        id: 'target-field-id',
        table_id: 'target-table-id',
        type: 'link',
      };
      
      // Setup mocks
      mockDb.where.mockImplementation((query) => {
        if (query.id === 'link-id') {
          mockDb.first.mockResolvedValue(mockLink);
        }
        return mockDb;
      });
      
      (RecordModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'source-record-id') return Promise.resolve(sourceRecord);
        if (id === 'target-record-id') return Promise.resolve(targetRecord);
        return Promise.resolve(null);
      });
      
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'source-field-id') return Promise.resolve(sourceField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Mock updateRecordFieldsForLink
      jest.spyOn(linkService as any, 'updateRecordFieldsForLink').mockResolvedValue(undefined);
      
      // Call the method
      const result = await linkService.linkRecords('link-id', 'source-record-id', 'target-record-id');
      
      // Assertions
      expect(result).toEqual({ id: 'test-link-id' });
      expect(mockDb.where).toHaveBeenCalledWith({ id: 'link-id' });
      expect(mockDb.insert).toHaveBeenCalled();
      expect((linkService as any).updateRecordFieldsForLink).toHaveBeenCalled();
    });

    it('should throw an error if records do not belong to the correct tables', async () => {
      // Mock data
      const mockLink = {
        id: 'link-id',
        source_field_id: 'source-field-id',
        target_field_id: 'target-field-id',
      };
      
      const sourceRecord = {
        id: 'source-record-id',
        table_id: 'wrong-table-id', // Wrong table
        fields: {},
      };
      
      const targetRecord = {
        id: 'target-record-id',
        table_id: 'target-table-id',
        fields: {},
      };
      
      const sourceField = {
        id: 'source-field-id',
        table_id: 'source-table-id',
        type: 'link',
      };
      
      const targetField = {
        id: 'target-field-id',
        table_id: 'target-table-id',
        type: 'link',
      };
      
      // Setup mocks
      mockDb.where.mockImplementation((query) => {
        if (query.id === 'link-id') {
          mockDb.first.mockResolvedValue(mockLink);
        }
        return mockDb;
      });
      
      (RecordModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'source-record-id') return Promise.resolve(sourceRecord);
        if (id === 'target-record-id') return Promise.resolve(targetRecord);
        return Promise.resolve(null);
      });
      
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'source-field-id') return Promise.resolve(sourceField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Call the method and expect error
      await expect(linkService.linkRecords('link-id', 'source-record-id', 'target-record-id'))
        .rejects
        .toThrow('Source record does not belong to the source table');
    });
  });

  describe('getLookupValue', () => {
    it('should return lookup value for a record and field', async () => {
      // Mock data
      const lookupField = {
        id: 'lookup-field-id',
        type: 'lookup',
        options: {
          linkFieldId: 'link-field-id',
          targetFieldId: 'target-field-id',
        },
      };
      
      const linkField = {
        id: 'link-field-id',
        type: 'link',
      };
      
      const targetField = {
        id: 'target-field-id',
        type: 'text',
      };
      
      const linkedRecords = [
        {
          id: 'linked-record-id',
          fields: {
            'target-field-id': 'Lookup Value',
          },
        },
      ];
      
      // Setup mocks
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'lookup-field-id') return Promise.resolve(lookupField);
        if (id === 'link-field-id') return Promise.resolve(linkField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Mock getLinkedRecords
      jest.spyOn(linkService, 'getLinkedRecords').mockResolvedValue(linkedRecords);
      
      // Call the method
      const result = await linkService.getLookupValue('record-id', 'lookup-field-id');
      
      // Assertions
      expect(result).toBe('Lookup Value');
      expect(FieldModel.findById).toHaveBeenCalledWith('lookup-field-id');
      expect(linkService.getLinkedRecords).toHaveBeenCalledWith('record-id', 'link-field-id');
    });

    it('should return null if no linked records', async () => {
      // Mock data
      const lookupField = {
        id: 'lookup-field-id',
        type: 'lookup',
        options: {
          linkFieldId: 'link-field-id',
          targetFieldId: 'target-field-id',
        },
      };
      
      const linkField = {
        id: 'link-field-id',
        type: 'link',
      };
      
      const targetField = {
        id: 'target-field-id',
        type: 'text',
      };
      
      // Setup mocks
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'lookup-field-id') return Promise.resolve(lookupField);
        if (id === 'link-field-id') return Promise.resolve(linkField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Mock getLinkedRecords
      jest.spyOn(linkService, 'getLinkedRecords').mockResolvedValue([]);
      
      // Call the method
      const result = await linkService.getLookupValue('record-id', 'lookup-field-id');
      
      // Assertions
      expect(result).toBeNull();
    });
  });

  describe('getRollupValue', () => {
    it('should calculate sum rollup value', async () => {
      // Mock data
      const rollupField = {
        id: 'rollup-field-id',
        type: 'rollup',
        options: {
          linkFieldId: 'link-field-id',
          targetFieldId: 'target-field-id',
          function: 'sum',
        },
      };
      
      const linkField = {
        id: 'link-field-id',
        type: 'link',
      };
      
      const targetField = {
        id: 'target-field-id',
        type: 'number',
      };
      
      const linkedRecords = [
        {
          id: 'linked-record-1',
          fields: {
            'target-field-id': 10,
          },
        },
        {
          id: 'linked-record-2',
          fields: {
            'target-field-id': 20,
          },
        },
      ];
      
      // Setup mocks
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'rollup-field-id') return Promise.resolve(rollupField);
        if (id === 'link-field-id') return Promise.resolve(linkField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Mock getLinkedRecords
      jest.spyOn(linkService, 'getLinkedRecords').mockResolvedValue(linkedRecords);
      
      // Call the method
      const result = await linkService.getRollupValue('record-id', 'rollup-field-id');
      
      // Assertions
      expect(result).toBe(30); // 10 + 20
      expect(FieldModel.findById).toHaveBeenCalledWith('rollup-field-id');
      expect(linkService.getLinkedRecords).toHaveBeenCalledWith('record-id', 'link-field-id');
    });

    it('should calculate average rollup value', async () => {
      // Mock data
      const rollupField = {
        id: 'rollup-field-id',
        type: 'rollup',
        options: {
          linkFieldId: 'link-field-id',
          targetFieldId: 'target-field-id',
          function: 'avg',
        },
      };
      
      const linkField = {
        id: 'link-field-id',
        type: 'link',
      };
      
      const targetField = {
        id: 'target-field-id',
        type: 'number',
      };
      
      const linkedRecords = [
        {
          id: 'linked-record-1',
          fields: {
            'target-field-id': 10,
          },
        },
        {
          id: 'linked-record-2',
          fields: {
            'target-field-id': 20,
          },
        },
      ];
      
      // Setup mocks
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'rollup-field-id') return Promise.resolve(rollupField);
        if (id === 'link-field-id') return Promise.resolve(linkField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Mock getLinkedRecords
      jest.spyOn(linkService, 'getLinkedRecords').mockResolvedValue(linkedRecords);
      
      // Call the method
      const result = await linkService.getRollupValue('record-id', 'rollup-field-id');
      
      // Assertions
      expect(result).toBe(15); // (10 + 20) / 2
    });

    it('should calculate count rollup value', async () => {
      // Mock data
      const rollupField = {
        id: 'rollup-field-id',
        type: 'rollup',
        options: {
          linkFieldId: 'link-field-id',
          targetFieldId: 'target-field-id',
          function: 'count',
        },
      };
      
      const linkField = {
        id: 'link-field-id',
        type: 'link',
      };
      
      const targetField = {
        id: 'target-field-id',
        type: 'text', // Can be any type for count
      };
      
      const linkedRecords = [
        {
          id: 'linked-record-1',
          fields: {
            'target-field-id': 'Value 1',
          },
        },
        {
          id: 'linked-record-2',
          fields: {
            'target-field-id': 'Value 2',
          },
        },
        {
          id: 'linked-record-3',
          fields: {
            'target-field-id': 'Value 3',
          },
        },
      ];
      
      // Setup mocks
      (FieldModel.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'rollup-field-id') return Promise.resolve(rollupField);
        if (id === 'link-field-id') return Promise.resolve(linkField);
        if (id === 'target-field-id') return Promise.resolve(targetField);
        return Promise.resolve(null);
      });
      
      // Mock getLinkedRecords
      jest.spyOn(linkService, 'getLinkedRecords').mockResolvedValue(linkedRecords);
      
      // Call the method
      const result = await linkService.getRollupValue('record-id', 'rollup-field-id');
      
      // Assertions
      expect(result).toBe(3); // Count of linked records
    });
  });
});