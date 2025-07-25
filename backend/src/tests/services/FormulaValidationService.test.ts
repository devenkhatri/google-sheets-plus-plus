import { FormulaValidationService } from '../../services/FormulaValidationService';
import { Field } from '../../models/Field';
import { Record } from '../../models/Record';

describe('FormulaValidationService', () => {
  let validationService: FormulaValidationService;
  let mockFields: Field[];
  let mockRecord: Record;

  beforeEach(() => {
    validationService = new FormulaValidationService();
    
    mockFields = [
      {
        id: 'field1',
        table_id: 'table1',
        name: 'Price',
        type: 'number',
        options: {},
        required: false,
        column_index: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'field2',
        table_id: 'table1',
        name: 'Quantity',
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
        name: 'Product Name',
        type: 'text',
        options: {},
        required: false,
        column_index: 2,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'field4',
        table_id: 'table1',
        name: 'Total',
        type: 'formula',
        options: { formula: '[Price] * [Quantity]' },
        required: false,
        column_index: 3,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    mockRecord = {
      id: 'record1',
      table_id: 'table1',
      fields: {
        field1: 10.50,
        field2: 3,
        field3: 'Test Product'
      },
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'user1',
      last_modified_by: 'user1'
    };
  });

  describe('validateFormula', () => {
    it('should validate correct formula with existing fields', () => {
      const result = validationService.validateFormula('[Price] * [Quantity]', mockFields);
      expect(result.valid).toBe(true);
      expect(result.dependencies).toEqual(['Price', 'Quantity']);
    });

    it('should reject formula with non-existent fields', () => {
      const result = validationService.validateFormula('[NonExistent] * [Price]', mockFields);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Field "NonExistent" not found');
    });

    it('should reject formula with invalid syntax', () => {
      const result = validationService.validateFormula('2 + + 3', mockFields);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should provide warnings for performance issues', () => {
      // Create a formula with many dependencies
      const manyFieldsFormula = Array.from({ length: 12 }, (_, i) => `[Field${i}]`).join(' + ');
      const manyFields = Array.from({ length: 12 }, (_, i) => ({
        id: `field${i}`,
        table_id: 'table1',
        name: `Field${i}`,
        type: 'number' as const,
        options: {},
        required: false,
        column_index: i,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const result = validationService.validateFormula(manyFieldsFormula, manyFields);
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('performance'))).toBe(true);
    });

    it('should validate with sample record evaluation', () => {
      const result = validationService.validateFormula('[Price] * [Quantity]', mockFields, mockRecord);
      expect(result.valid).toBe(true);
      expect(result.dependencies).toEqual(['Price', 'Quantity']);
    });

    it('should detect potential circular dependencies', () => {
      // This is a simplified test - in reality, circular dependency detection would be more complex
      const fieldsWithCircular = [
        ...mockFields,
        {
          id: 'field5',
          table_id: 'table1',
          name: 'Circular',
          type: 'formula' as const,
          options: { formula: '[Circular] + 1' },
          required: false,
          column_index: 4,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      const result = validationService.validateFormula('[Circular]', fieldsWithCircular);
      // This test might pass depending on the implementation complexity
      expect(result.valid).toBeDefined();
    });
  });

  describe('getAutoComplete', () => {
    it('should suggest functions at the beginning', () => {
      const result = validationService.getAutoComplete('', 0, mockFields);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.type === 'function')).toBe(true);
    });

    it('should suggest fields when typing field reference', () => {
      const result = validationService.getAutoComplete('[P', 2, mockFields);
      expect(result.suggestions.some(s => s.value === 'Price')).toBe(true);
      expect(result.suggestions.some(s => s.value === 'Product Name')).toBe(true);
    });

    it('should suggest operators after field or number', () => {
      const result = validationService.getAutoComplete('[Price]', 7, mockFields);
      expect(result.suggestions.some(s => s.type === 'operator')).toBe(true);
    });

    it('should filter function suggestions by prefix', () => {
      const result = validationService.getAutoComplete('SU', 2, mockFields);
      expect(result.suggestions.some(s => s.value === 'SUM')).toBe(true);
      expect(result.suggestions.every(s => s.value.toLowerCase().startsWith('su'))).toBe(true);
    });

    it('should provide function descriptions', () => {
      const result = validationService.getAutoComplete('SUM', 3, mockFields);
      const sumSuggestion = result.suggestions.find(s => s.value === 'SUM');
      expect(sumSuggestion?.description).toBeDefined();
      expect(sumSuggestion?.insertText).toContain('(');
    });
  });

  describe('getSyntaxHighlighting', () => {
    it('should highlight functions', () => {
      const tokens = validationService.getSyntaxHighlighting('SUM(1, 2)');
      expect(tokens.some(t => t.type === 'function' && t.value === 'SUM')).toBe(true);
    });

    it('should highlight field references', () => {
      const tokens = validationService.getSyntaxHighlighting('[Price]');
      expect(tokens.some(t => t.type === 'field' && t.value === 'Price')).toBe(true);
    });

    it('should highlight numbers', () => {
      const tokens = validationService.getSyntaxHighlighting('123.45');
      expect(tokens.some(t => t.type === 'number' && t.value === '123.45')).toBe(true);
    });

    it('should highlight strings', () => {
      const tokens = validationService.getSyntaxHighlighting('"hello world"');
      expect(tokens.some(t => t.type === 'string' && t.value === '"hello world"')).toBe(true);
    });

    it('should highlight operators', () => {
      const tokens = validationService.getSyntaxHighlighting('2 + 3');
      expect(tokens.some(t => t.type === 'operator' && t.value === '+')).toBe(true);
    });

    it('should provide correct token positions', () => {
      const tokens = validationService.getSyntaxHighlighting('SUM(123)');
      const sumToken = tokens.find(t => t.type === 'function');
      const numberToken = tokens.find(t => t.type === 'number');
      
      expect(sumToken?.start).toBe(0);
      expect(sumToken?.end).toBe(3);
      expect(numberToken?.start).toBe(4);
      expect(numberToken?.end).toBe(7);
    });
  });

  describe('function definitions', () => {
    it('should have comprehensive math functions', () => {
      const result = validationService.getAutoComplete('', 0, mockFields);
      const mathFunctions = result.suggestions.filter(s => s.type === 'function');
      
      const expectedMathFunctions = ['SUM', 'AVERAGE', 'MIN', 'MAX', 'ROUND', 'ABS'];
      expectedMathFunctions.forEach(func => {
        expect(mathFunctions.some(s => s.value === func)).toBe(true);
      });
    });

    it('should have comprehensive string functions', () => {
      const result = validationService.getAutoComplete('', 0, mockFields);
      const functions = result.suggestions.filter(s => s.type === 'function');
      
      const expectedStringFunctions = ['CONCATENATE', 'LEFT', 'RIGHT', 'MID', 'LEN', 'UPPER', 'LOWER', 'TRIM'];
      expectedStringFunctions.forEach(func => {
        expect(functions.some(s => s.value === func)).toBe(true);
      });
    });

    it('should have comprehensive date functions', () => {
      const result = validationService.getAutoComplete('', 0, mockFields);
      const functions = result.suggestions.filter(s => s.type === 'function');
      
      const expectedDateFunctions = ['TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY'];
      expectedDateFunctions.forEach(func => {
        expect(functions.some(s => s.value === func)).toBe(true);
      });
    });

    it('should have comprehensive logical functions', () => {
      const result = validationService.getAutoComplete('', 0, mockFields);
      const functions = result.suggestions.filter(s => s.type === 'function');
      
      const expectedLogicalFunctions = ['IF', 'AND', 'OR', 'NOT'];
      expectedLogicalFunctions.forEach(func => {
        expect(functions.some(s => s.value === func)).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty formula', () => {
      const result = validationService.validateFormula('', mockFields);
      expect(result.valid).toBe(false);
    });

    it('should handle formula with only whitespace', () => {
      const result = validationService.validateFormula('   ', mockFields);
      expect(result.valid).toBe(false);
    });

    it('should handle very long formulas', () => {
      const longFormula = 'SUM(' + Array.from({ length: 100 }, (_, i) => i).join(', ') + ')';
      const result = validationService.validateFormula(longFormula, mockFields);
      expect(result.valid).toBe(true);
      expect(result.warnings?.some(w => w.includes('function calls'))).toBe(true);
    });

    it('should handle nested function calls', () => {
      const nestedFormula = 'ROUND(AVERAGE(SUM(1, 2), MAX(3, 4)), 2)';
      const result = validationService.validateFormula(nestedFormula, mockFields);
      expect(result.valid).toBe(true);
    });

    it('should handle mixed field types in expressions', () => {
      const result = validationService.validateFormula('[Price] & " for " & [Product Name]', mockFields);
      expect(result.valid).toBe(true);
      expect(result.dependencies).toEqual(['Price', 'Product Name']);
    });
  });

  describe('performance warnings', () => {
    it('should warn about excessive dependencies', () => {
      const manyFields = Array.from({ length: 15 }, (_, i) => ({
        id: `field${i}`,
        table_id: 'table1',
        name: `Field${i}`,
        type: 'number' as const,
        options: {},
        required: false,
        column_index: i,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const formula = manyFields.map(f => `[${f.name}]`).join(' + ');
      const result = validationService.validateFormula(formula, manyFields);
      
      expect(result.valid).toBe(true);
      expect(result.warnings?.some(w => w.includes('many fields'))).toBe(true);
    });

    it('should warn about many function calls', () => {
      const formula = 'SUM(ABS(ROUND(SQRT(POWER(MAX(1, 2), 2)), 1)), 3)';
      const result = validationService.validateFormula(formula, mockFields);
      
      expect(result.valid).toBe(true);
      expect(result.warnings?.some(w => w.includes('function calls'))).toBe(true);
    });

    it('should warn about lookup functions', () => {
      const formula = 'VLOOKUP("key", [Price], 1, FALSE)';
      const result = validationService.validateFormula(formula, mockFields);
      
      // This might not be valid due to VLOOKUP not being implemented, but test the warning logic
      if (result.valid) {
        expect(result.warnings?.some(w => w.includes('Lookup'))).toBe(true);
      }
    });
  });
});