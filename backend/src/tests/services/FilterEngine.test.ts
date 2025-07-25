import { FilterEngine } from '../../services/filterEngine/FilterEngine';
import { FilterConditionParser, FilterConfig, FilterCondition } from '../../services/filterEngine/FilterConditionParser';
import { SortingEngine, SortConfig } from '../../services/filterEngine/SortingEngine';
import { Field, FieldType } from '../../models/Field';

describe('FilterEngine', () => {
  // Mock fields for testing
  const mockFields: Field[] = [
    {
      id: 'field1',
      table_id: 'table1',
      name: 'Name',
      type: 'text',
      options: {},
      required: false,
      column_index: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'field2',
      table_id: 'table1',
      name: 'Age',
      type: 'number',
      options: {},
      required: false,
      column_index: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'field3',
      table_id: 'table1',
      name: 'Status',
      type: 'singleSelect',
      options: { choices: ['Active', 'Inactive', 'Pending'] },
      required: false,
      column_index: 2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'field4',
      table_id: 'table1',
      name: 'Tags',
      type: 'multiSelect',
      options: { choices: ['Important', 'Urgent', 'Review'] },
      required: false,
      column_index: 3,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'field5',
      table_id: 'table1',
      name: 'Created Date',
      type: 'date',
      options: {},
      required: false,
      column_index: 4,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'field6',
      table_id: 'table1',
      name: 'Is Active',
      type: 'checkbox',
      options: {},
      required: false,
      column_index: 5,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Mock records for testing
  const mockRecords = [
    {
      id: 'record1',
      table_id: 'table1',
      row_index: 1,
      fields: {
        field1: 'John Doe',
        field2: 25,
        field3: 'Active',
        field4: ['Important', 'Urgent'],
        field5: '2023-01-15',
        field6: true
      },
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'record2',
      table_id: 'table1',
      row_index: 2,
      fields: {
        field1: 'Jane Smith',
        field2: 30,
        field3: 'Inactive',
        field4: ['Review'],
        field5: '2023-02-20',
        field6: false
      },
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'record3',
      table_id: 'table1',
      row_index: 3,
      fields: {
        field1: 'Bob Johnson',
        field2: 35,
        field3: 'Pending',
        field4: ['Important'],
        field5: '2023-03-10',
        field6: true
      },
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  describe('filterRecords', () => {
    it('should filter records by text field equals', () => {
      const filters: FilterCondition[] = [
        { fieldId: 'field1', operator: 'equals', value: 'John Doe' }
      ];

      const result = FilterEngine.filterRecords(mockRecords, filters, mockFields);
      
      expect(result).toHaveLength(1);
      expect(result[0].fields.field1).toBe('John Doe');
    });

    it('should filter records by text field contains', () => {
      const filters: FilterCondition[] = [
        { fieldId: 'field1', operator: 'contains', value: 'John' }
      ];

      const result = FilterEngine.filterRecords(mockRecords, filters, mockFields);
      
      expect(result).toHaveLength(2);
      expect(result.map(r => r.fields.field1)).toContain('John Doe');
      expect(result.map(r => r.fields.field1)).toContain('Bob Johnson');
    });

    it('should filter records by number field greater than', () => {
      const filters: FilterCondition[] = [
        { fieldId: 'field2', operator: 'greaterThan', value: 28 }
      ];

      const result = FilterEngine.filterRecords(mockRecords, filters, mockFields);
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.fields.field2 > 28)).toBe(true);
    });

    it('should filter records by single select field', () => {
      const filters: FilterCondition[] = [
        { fieldId: 'field3', operator: 'hasOption', value: 'Active' }
      ];

      const result = FilterEngine.filterRecords(mockRecords, filters, mockFields);
      
      expect(result).toHaveLength(1);
      expect(result[0].fields.field3).toBe('Active');
    });

    it('should filter records by multi select field has any option', () => {
      const filters: FilterCondition[] = [
        { fieldId: 'field4', operator: 'hasAnyOption', value: ['Important'] }
      ];

      const result = FilterEngine.filterRecords(mockRecords, filters, mockFields);
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.fields.field4.includes('Important'))).toBe(true);
    });

    it('should filter records by checkbox field', () => {
      const filters: FilterCondition[] = [
        { fieldId: 'field6', operator: 'isChecked' }
      ];

      const result = FilterEngine.filterRecords(mockRecords, filters, mockFields);
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.fields.field6 === true)).toBe(true);
    });

    it('should filter records by date field before', () => {
      const filters: FilterCondition[] = [
        { fieldId: 'field5', operator: 'before', value: '2023-02-01' }
      ];

      const result = FilterEngine.filterRecords(mockRecords, filters, mockFields);
      
      expect(result).toHaveLength(1);
      expect(result[0].fields.field5).toBe('2023-01-15');
    });

    it('should handle multiple filters with AND logic', () => {
      const filters: FilterCondition[] = [
        { fieldId: 'field2', operator: 'greaterThan', value: 20 },
        { fieldId: 'field6', operator: 'isChecked' }
      ];

      const result = FilterEngine.filterRecords(mockRecords, filters, mockFields);
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.fields.field2 > 20 && r.fields.field6 === true)).toBe(true);
    });

    it('should handle empty filters', () => {
      const result = FilterEngine.filterRecords(mockRecords, [], mockFields);
      
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockRecords);
    });

    it('should handle invalid field IDs gracefully', () => {
      const filters: FilterCondition[] = [
        { fieldId: 'nonexistent', operator: 'equals', value: 'test' }
      ];

      const result = FilterEngine.filterRecords(mockRecords, filters, mockFields);
      
      expect(result).toHaveLength(3); // Should return all records when filter is invalid
    });
  });

  describe('filterAndSortRecords', () => {
    it('should filter and sort records', () => {
      const filters: FilterCondition[] = [
        { fieldId: 'field2', operator: 'greaterThan', value: 20 }
      ];
      const sorts: SortConfig[] = [
        { fieldId: 'field2', direction: 'desc' }
      ];

      const result = FilterEngine.filterAndSortRecords(mockRecords, filters, sorts, mockFields);
      
      expect(result).toHaveLength(3);
      expect(result[0].fields.field2).toBe(35);
      expect(result[1].fields.field2).toBe(30);
      expect(result[2].fields.field2).toBe(25);
    });

    it('should sort by multiple fields', () => {
      const sorts: SortConfig[] = [
        { fieldId: 'field6', direction: 'desc' }, // Sort by checkbox first (true first)
        { fieldId: 'field2', direction: 'asc' }   // Then by age ascending
      ];

      const result = FilterEngine.filterAndSortRecords(mockRecords, [], sorts, mockFields);
      
      expect(result).toHaveLength(3);
      // First should be John (true, 25), then Bob (true, 35), then Jane (false, 30)
      expect(result[0].fields.field1).toBe('John Doe');
      expect(result[1].fields.field1).toBe('Bob Johnson');
      expect(result[2].fields.field1).toBe('Jane Smith');
    });

    it('should handle default sorting when no sorts provided', () => {
      const result = FilterEngine.filterAndSortRecords(mockRecords, [], [], mockFields);
      
      expect(result).toHaveLength(3);
      // Should be sorted by row_index
      expect(result[0].row_index).toBe(1);
      expect(result[1].row_index).toBe(2);
      expect(result[2].row_index).toBe(3);
    });
  });

  describe('getFilterSuggestions', () => {
    it('should return suggestions for single select field', () => {
      const field = mockFields.find(f => f.type === 'singleSelect')!;
      const suggestions = FilterEngine.getFilterSuggestions(field);
      
      expect(suggestions).toEqual(['Active', 'Inactive', 'Pending']);
    });

    it('should return filtered suggestions for single select field', () => {
      const field = mockFields.find(f => f.type === 'singleSelect')!;
      const suggestions = FilterEngine.getFilterSuggestions(field, 'Act');
      
      expect(suggestions).toEqual(['Active', 'Inactive']);
    });

    it('should return empty array for text field without data', () => {
      const field = mockFields.find(f => f.type === 'text')!;
      const suggestions = FilterEngine.getFilterSuggestions(field);
      
      expect(suggestions).toEqual([]);
    });

    it('should return date suggestions for date field', () => {
      const field = mockFields.find(f => f.type === 'date')!;
      const suggestions = FilterEngine.getFilterSuggestions(field);
      
      expect(suggestions).toContain('Today');
      expect(suggestions).toContain('Tomorrow');
      expect(suggestions).toContain('Yesterday');
    });
  });

  describe('getAvailableOperators', () => {
    it('should return correct operators for text field', () => {
      const field = mockFields.find(f => f.type === 'text')!;
      const operators = FilterEngine.getAvailableOperators(field);
      
      expect(operators).toContain('equals');
      expect(operators).toContain('contains');
      expect(operators).toContain('startsWith');
      expect(operators).toContain('endsWith');
      expect(operators).toContain('isEmpty');
      expect(operators).toContain('isNotEmpty');
    });

    it('should return correct operators for number field', () => {
      const field = mockFields.find(f => f.type === 'number')!;
      const operators = FilterEngine.getAvailableOperators(field);
      
      expect(operators).toContain('equals');
      expect(operators).toContain('greaterThan');
      expect(operators).toContain('lessThan');
      expect(operators).toContain('greaterThanOrEqual');
      expect(operators).toContain('lessThanOrEqual');
    });

    it('should return correct operators for checkbox field', () => {
      const field = mockFields.find(f => f.type === 'checkbox')!;
      const operators = FilterEngine.getAvailableOperators(field);
      
      expect(operators).toEqual(['isChecked', 'isNotChecked']);
    });

    it('should return correct operators for single select field', () => {
      const field = mockFields.find(f => f.type === 'singleSelect')!;
      const operators = FilterEngine.getAvailableOperators(field);
      
      expect(operators).toContain('hasOption');
      expect(operators).toContain('hasNotOption');
      expect(operators).toContain('isEmpty');
      expect(operators).toContain('isNotEmpty');
    });

    it('should return correct operators for multi select field', () => {
      const field = mockFields.find(f => f.type === 'multiSelect')!;
      const operators = FilterEngine.getAvailableOperators(field);
      
      expect(operators).toContain('hasAnyOption');
      expect(operators).toContain('hasAllOptions');
      expect(operators).toContain('isEmpty');
      expect(operators).toContain('isNotEmpty');
    });
  });

  describe('getRecommendedSortFields', () => {
    it('should recommend single select fields first for kanban view', () => {
      const recommended = FilterEngine.getRecommendedSortFields(mockFields, 'kanban');
      
      expect(recommended[0].type).toBe('singleSelect');
    });

    it('should recommend date fields first for calendar view', () => {
      const recommended = FilterEngine.getRecommendedSortFields(mockFields, 'calendar');
      
      expect(recommended[0].type).toBe('date');
    });

    it('should return all fields for grid view', () => {
      const recommended = FilterEngine.getRecommendedSortFields(mockFields, 'grid');
      
      expect(recommended).toHaveLength(mockFields.length);
    });
  });
});