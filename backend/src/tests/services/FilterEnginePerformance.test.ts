import { FilterEngine } from '../../services/filterEngine/FilterEngine';
import { FilterConditionParser, FilterConfig, FilterCondition } from '../../services/filterEngine/FilterConditionParser';
import { SortingEngine, SortConfig } from '../../services/filterEngine/SortingEngine';
import { Field, FieldType } from '../../models/Field';
import { performance } from 'perf_hooks';

describe('FilterEngine Performance Tests', () => {
  // Generate a large dataset for performance testing
  const generateLargeDataset = (size: number) => {
    const records: any[] = [];
    
    for (let i = 0; i < size; i++) {
      records.push({
        id: `record${i}`,
        table_id: 'table1',
        row_index: i,
        fields: {
          field1: `Name ${i}`,
          field2: Math.floor(Math.random() * 100),
          field3: ['Active', 'Inactive', 'Pending'][Math.floor(Math.random() * 3)],
          field4: i % 2 === 0 ? ['Important'] : ['Urgent'],
          field5: new Date(2023, 0, 1 + i % 365).toISOString().split('T')[0],
          field6: i % 3 === 0
        },
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    
    return records;
  };

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

  describe('Performance with large datasets', () => {
    it('should filter 10,000 records efficiently', () => {
      const records = generateLargeDataset(10000);
      const filters: FilterCondition[] = [
        { fieldId: 'field2', operator: 'greaterThan', value: 50 }
      ];

      const startTime = performance.now();
      const result = FilterEngine.filterRecords(records, filters, mockFields);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      console.log(`Filtered 10,000 records in ${executionTime.toFixed(2)}ms`);
      
      // Verify results
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(r => r.fields.field2 > 50)).toBe(true);
      
      // Performance assertion - should be reasonably fast
      expect(executionTime).toBeLessThan(500); // 500ms is a reasonable threshold
    });

    it('should sort 10,000 records efficiently', () => {
      const records = generateLargeDataset(10000);
      const sorts: SortConfig[] = [
        { fieldId: 'field2', direction: 'desc' }
      ];

      const startTime = performance.now();
      const result = SortingEngine.sortRecords(records, sorts, mockFields);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      console.log(`Sorted 10,000 records in ${executionTime.toFixed(2)}ms`);
      
      // Verify results
      expect(result.length).toBe(10000);
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].fields.field2 >= result[i + 1].fields.field2).toBe(true);
      }
      
      // Performance assertion - should be reasonably fast
      expect(executionTime).toBeLessThan(500); // 500ms is a reasonable threshold
    });

    it('should filter and sort 10,000 records efficiently', () => {
      const records = generateLargeDataset(10000);
      const filters: FilterCondition[] = [
        { fieldId: 'field3', operator: 'equals', value: 'Active' }
      ];
      const sorts: SortConfig[] = [
        { fieldId: 'field2', direction: 'asc' }
      ];

      const startTime = performance.now();
      const result = FilterEngine.filterAndSortRecords(records, filters, sorts, mockFields);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      console.log(`Filtered and sorted 10,000 records in ${executionTime.toFixed(2)}ms`);
      
      // Verify results
      expect(result.every(r => r.fields.field3 === 'Active')).toBe(true);
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].fields.field2 <= result[i + 1].fields.field2).toBe(true);
      }
      
      // Performance assertion - should be reasonably fast
      expect(executionTime).toBeLessThan(1000); // 1000ms is a reasonable threshold
    });
  });

  describe('Complex filter performance', () => {
    it('should handle complex nested filters efficiently', () => {
      const records = generateLargeDataset(5000);
      
      // Create a complex filter with nested AND/OR conditions
      const filterConfig: FilterConfig = {
        root: {
          logicalOperator: 'AND',
          conditions: [
            {
              logicalOperator: 'OR',
              conditions: [
                { fieldId: 'field2', operator: 'greaterThan', value: 70 },
                { fieldId: 'field2', operator: 'lessThan', value: 30 }
              ]
            },
            {
              logicalOperator: 'OR',
              conditions: [
                { fieldId: 'field3', operator: 'equals', value: 'Active' },
                { fieldId: 'field6', operator: 'isChecked' }
              ]
            }
          ]
        }
      };

      const startTime = performance.now();
      
      // Apply the filter
      const filteredRecords = records.filter(record => 
        FilterEngine.evaluateFilterGroup(record, filterConfig.root, mockFields)
      );
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      console.log(`Applied complex filter to 5,000 records in ${executionTime.toFixed(2)}ms`);
      
      // Verify results - each record should match the complex condition
      expect(filteredRecords.every(r => {
        const condition1 = r.fields.field2 > 70 || r.fields.field2 < 30;
        const condition2 = r.fields.field3 === 'Active' || r.fields.field6 === true;
        return condition1 && condition2;
      })).toBe(true);
      
      // Performance assertion
      expect(executionTime).toBeLessThan(500); // 500ms is a reasonable threshold
    });
  });

  describe('Multi-level sort performance', () => {
    it('should handle multi-level sorting efficiently', () => {
      const records = generateLargeDataset(5000);
      
      // Create a multi-level sort configuration
      const sorts: SortConfig[] = [
        { fieldId: 'field3', direction: 'asc', priority: 0 },
        { fieldId: 'field2', direction: 'desc', priority: 1 },
        { fieldId: 'field1', direction: 'asc', priority: 2 }
      ];

      const startTime = performance.now();
      const result = SortingEngine.sortRecords(records, sorts, mockFields);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      console.log(`Applied multi-level sort to 5,000 records in ${executionTime.toFixed(2)}ms`);
      
      // Verify results - check first level of sorting
      for (let i = 0; i < result.length - 1; i++) {
        if (result[i].fields.field3 === result[i + 1].fields.field3) {
          // If first level is equal, check second level
          if (result[i].fields.field2 === result[i + 1].fields.field2) {
            // If second level is equal, check third level
            expect(result[i].fields.field1 <= result[i + 1].fields.field1).toBe(true);
          } else {
            expect(result[i].fields.field2 >= result[i + 1].fields.field2).toBe(true);
          }
        } else {
          expect(result[i].fields.field3 <= result[i + 1].fields.field3).toBe(true);
        }
      }
      
      // Performance assertion
      expect(executionTime).toBeLessThan(500); // 500ms is a reasonable threshold
    });
  });

  describe('Filter suggestion performance', () => {
    it('should generate filter suggestions quickly', () => {
      const field = mockFields.find(f => f.type === 'singleSelect')!;
      
      const startTime = performance.now();
      
      // Generate suggestions 1000 times to simulate autocomplete
      for (let i = 0; i < 1000; i++) {
        const suggestions = FilterEngine.getFilterSuggestions(field, 'A');
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      console.log(`Generated 1000 filter suggestions in ${executionTime.toFixed(2)}ms`);
      
      // Performance assertion
      expect(executionTime).toBeLessThan(500); // 500ms is a reasonable threshold
    });
  });

  describe('Performance measurement utility', () => {
    it('should accurately measure filter and sort performance', () => {
      const records = generateLargeDataset(5000);
      const filters: FilterCondition[] = [
        { fieldId: 'field3', operator: 'equals', value: 'Active' }
      ];
      const sorts: SortConfig[] = [
        { fieldId: 'field2', direction: 'desc' }
      ];

      const performance = FilterEngine.measurePerformance(records, filters, sorts, mockFields);
      
      console.log(`Performance metrics:
        Filter time: ${performance.filterTime.toFixed(2)}ms
        Sort time: ${performance.sortTime.toFixed(2)}ms
        Total time: ${performance.totalTime.toFixed(2)}ms`);
      
      expect(performance.filterTime).toBeGreaterThan(0);
      expect(performance.sortTime).toBeGreaterThan(0);
      expect(performance.totalTime).toBeGreaterThanOrEqual(performance.filterTime + performance.sortTime);
    });
  });
});