import { FormulaEngine, FormulaParser, FormulaEvaluator, DependencyTracker, FormulaContext } from '../../services/FormulaEngine';
import { Field } from '../../models/Field';
import { Record } from '../../models/Record';

describe('FormulaEngine', () => {
  let formulaEngine: FormulaEngine;
  let mockFields: Field[];
  let mockRecord: Record;
  let mockContext: FormulaContext;

  beforeEach(() => {
    formulaEngine = new FormulaEngine();
    
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
      }
    ];

    mockRecord = {
      id: 'record1',
      table_id: 'table1',
      row_index: 0,
      fields: {
        field1: 10.50,
        field2: 3,
        field3: 'Test Product'
      },
      deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'user1',
      updated_by: 'user1'
    };

    mockContext = {
      currentRecord: mockRecord,
      allRecords: [mockRecord],
      fields: mockFields,
      tableId: 'table1'
    };
  });

  describe('parseFormula', () => {
    it('should parse simple arithmetic expressions', () => {
      const result = formulaEngine.parseFormula('2 + 3');
      expect(result.valid).toBe(true);
      expect(result.ast).toBeDefined();
    });

    it('should parse field references', () => {
      const result = formulaEngine.parseFormula('[Price] * [Quantity]');
      expect(result.valid).toBe(true);
      expect(result.dependencies).toEqual(['Price', 'Quantity']);
    });

    it('should parse function calls', () => {
      const result = formulaEngine.parseFormula('SUM([Price], [Quantity])');
      expect(result.valid).toBe(true);
      expect(result.dependencies).toEqual(['Price', 'Quantity']);
    });

    it('should handle invalid syntax', () => {
      const result = formulaEngine.parseFormula('2 + + 3');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unbalanced parentheses', () => {
      const result = formulaEngine.parseFormula('SUM(2, 3');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('evaluateFormula', () => {
    it('should evaluate simple arithmetic', () => {
      const result = formulaEngine.evaluateFormula('2 + 3', mockContext);
      expect(result.value).toBe(5);
      expect(result.type).toBe('number');
    });

    it('should evaluate field references', () => {
      const result = formulaEngine.evaluateFormula('[Price] * [Quantity]', mockContext);
      expect(result.value).toBe(31.5); // 10.50 * 3
      expect(result.type).toBe('number');
    });

    it('should evaluate string concatenation', () => {
      const result = formulaEngine.evaluateFormula('"Product: " & [Product Name]', mockContext);
      expect(result.value).toBe('Product: Test Product');
      expect(result.type).toBe('text');
    });

    it('should handle division by zero', () => {
      const result = formulaEngine.evaluateFormula('10 / 0', mockContext);
      expect(result.type).toBe('error');
      expect(result.error).toContain('Division by zero');
    });

    it('should handle missing fields', () => {
      const result = formulaEngine.evaluateFormula('[NonExistent]', mockContext);
      expect(result.type).toBe('error');
      expect(result.error).toContain('not found');
    });
  });

  describe('Math Functions', () => {
    it('should evaluate SUM function', () => {
      const result = formulaEngine.evaluateFormula('SUM(1, 2, 3, 4)', mockContext);
      expect(result.value).toBe(10);
      expect(result.type).toBe('number');
    });

    it('should evaluate AVERAGE function', () => {
      const result = formulaEngine.evaluateFormula('AVERAGE(2, 4, 6)', mockContext);
      expect(result.value).toBe(4);
      expect(result.type).toBe('number');
    });

    it('should evaluate MIN function', () => {
      const result = formulaEngine.evaluateFormula('MIN(5, 2, 8, 1)', mockContext);
      expect(result.value).toBe(1);
      expect(result.type).toBe('number');
    });

    it('should evaluate MAX function', () => {
      const result = formulaEngine.evaluateFormula('MAX(5, 2, 8, 1)', mockContext);
      expect(result.value).toBe(8);
      expect(result.type).toBe('number');
    });

    it('should evaluate ROUND function', () => {
      const result = formulaEngine.evaluateFormula('ROUND(3.14159, 2)', mockContext);
      expect(result.value).toBe(3.14);
      expect(result.type).toBe('number');
    });

    it('should evaluate ABS function', () => {
      const result = formulaEngine.evaluateFormula('ABS(-5)', mockContext);
      expect(result.value).toBe(5);
      expect(result.type).toBe('number');
    });

    it('should evaluate SQRT function', () => {
      const result = formulaEngine.evaluateFormula('SQRT(16)', mockContext);
      expect(result.value).toBe(4);
      expect(result.type).toBe('number');
    });

    it('should evaluate POWER function', () => {
      const result = formulaEngine.evaluateFormula('POWER(2, 3)', mockContext);
      expect(result.value).toBe(8);
      expect(result.type).toBe('number');
    });
  });

  describe('String Functions', () => {
    it('should evaluate CONCATENATE function', () => {
      const result = formulaEngine.evaluateFormula('CONCATENATE("Hello", " ", "World")', mockContext);
      expect(result.value).toBe('Hello World');
      expect(result.type).toBe('text');
    });

    it('should evaluate LEFT function', () => {
      const result = formulaEngine.evaluateFormula('LEFT("Hello World", 5)', mockContext);
      expect(result.value).toBe('Hello');
      expect(result.type).toBe('text');
    });

    it('should evaluate RIGHT function', () => {
      const result = formulaEngine.evaluateFormula('RIGHT("Hello World", 5)', mockContext);
      expect(result.value).toBe('World');
      expect(result.type).toBe('text');
    });

    it('should evaluate MID function', () => {
      const result = formulaEngine.evaluateFormula('MID("Hello World", 7, 5)', mockContext);
      expect(result.value).toBe('World');
      expect(result.type).toBe('text');
    });

    it('should evaluate LEN function', () => {
      const result = formulaEngine.evaluateFormula('LEN("Hello")', mockContext);
      expect(result.value).toBe(5);
      expect(result.type).toBe('number');
    });

    it('should evaluate UPPER function', () => {
      const result = formulaEngine.evaluateFormula('UPPER("hello")', mockContext);
      expect(result.value).toBe('HELLO');
      expect(result.type).toBe('text');
    });

    it('should evaluate LOWER function', () => {
      const result = formulaEngine.evaluateFormula('LOWER("HELLO")', mockContext);
      expect(result.value).toBe('hello');
      expect(result.type).toBe('text');
    });

    it('should evaluate TRIM function', () => {
      const result = formulaEngine.evaluateFormula('TRIM("  hello  ")', mockContext);
      expect(result.value).toBe('hello');
      expect(result.type).toBe('text');
    });
  });

  describe('Date Functions', () => {
    it('should evaluate TODAY function', () => {
      const result = formulaEngine.evaluateFormula('TODAY()', mockContext);
      expect(result.type).toBe('date');
      expect(typeof result.value).toBe('string');
    });

    it('should evaluate NOW function', () => {
      const result = formulaEngine.evaluateFormula('NOW()', mockContext);
      expect(result.type).toBe('date');
      expect(typeof result.value).toBe('string');
    });

    it('should evaluate YEAR function', () => {
      const result = formulaEngine.evaluateFormula('YEAR("2023-05-15")', mockContext);
      expect(result.value).toBe(2023);
      expect(result.type).toBe('number');
    });

    it('should evaluate MONTH function', () => {
      const result = formulaEngine.evaluateFormula('MONTH("2023-05-15")', mockContext);
      expect(result.value).toBe(5);
      expect(result.type).toBe('number');
    });

    it('should evaluate DAY function', () => {
      const result = formulaEngine.evaluateFormula('DAY("2023-05-15")', mockContext);
      expect(result.value).toBe(15);
      expect(result.type).toBe('number');
    });
  });

  describe('Logical Functions', () => {
    it('should evaluate IF function with true condition', () => {
      const result = formulaEngine.evaluateFormula('IF(5 > 3, "Yes", "No")', mockContext);
      expect(result.value).toBe('Yes');
      expect(result.type).toBe('text');
    });

    it('should evaluate IF function with false condition', () => {
      const result = formulaEngine.evaluateFormula('IF(5 < 3, "Yes", "No")', mockContext);
      expect(result.value).toBe('No');
      expect(result.type).toBe('text');
    });

    it('should evaluate AND function', () => {
      const result1 = formulaEngine.evaluateFormula('AND(true, true)', mockContext);
      expect(result1.value).toBe(true);
      
      const result2 = formulaEngine.evaluateFormula('AND(true, false)', mockContext);
      expect(result2.value).toBe(false);
    });

    it('should evaluate OR function', () => {
      const result1 = formulaEngine.evaluateFormula('OR(true, false)', mockContext);
      expect(result1.value).toBe(true);
      
      const result2 = formulaEngine.evaluateFormula('OR(false, false)', mockContext);
      expect(result2.value).toBe(false);
    });

    it('should evaluate NOT function', () => {
      const result1 = formulaEngine.evaluateFormula('NOT(true)', mockContext);
      expect(result1.value).toBe(false);
      
      const result2 = formulaEngine.evaluateFormula('NOT(false)', mockContext);
      expect(result2.value).toBe(true);
    });
  });

  describe('Complex Expressions', () => {
    it('should evaluate nested functions', () => {
      const result = formulaEngine.evaluateFormula('ROUND(SUM([Price], [Quantity]) / 2, 1)', mockContext);
      expect(result.value).toBe(6.8); // (10.5 + 3) / 2 = 6.75, rounded to 1 decimal = 6.8
      expect(result.type).toBe('number');
    });

    it('should evaluate complex conditional logic', () => {
      const result = formulaEngine.evaluateFormula(
        'IF(AND([Price] > 10, [Quantity] > 2), "High Value", "Low Value")',
        mockContext
      );
      expect(result.value).toBe('High Value');
      expect(result.type).toBe('text');
    });

    it('should handle operator precedence', () => {
      const result = formulaEngine.evaluateFormula('2 + 3 * 4', mockContext);
      expect(result.value).toBe(14); // Should be 2 + (3 * 4) = 14, not (2 + 3) * 4 = 20
      expect(result.type).toBe('number');
    });
  });

  describe('getDependencies', () => {
    it('should extract field dependencies', () => {
      const dependencies = formulaEngine.getDependencies('[Price] * [Quantity] + [Tax]');
      const fieldNames = dependencies.map(d => d.fieldName);
      expect(fieldNames).toEqual(['Price', 'Quantity', 'Tax']);
    });

    it('should handle no dependencies', () => {
      const dependencies = formulaEngine.getDependencies('2 + 3');
      expect(dependencies).toEqual([]);
    });

    it('should handle duplicate dependencies', () => {
      const dependencies = formulaEngine.getDependencies('[Price] + [Price] * 2');
      const fieldNames = dependencies.map(d => d.fieldName);
      expect(fieldNames).toEqual(['Price']);
    });
  });

  describe('validateFormula', () => {
    it('should validate correct formula with existing fields', () => {
      const result = formulaEngine.validateFormula('[Price] * [Quantity]', mockFields);
      expect(result.valid).toBe(true);
    });

    it('should reject formula with non-existent fields', () => {
      const result = formulaEngine.validateFormula('[NonExistent] * [Price]', mockFields);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject invalid syntax', () => {
      const result = formulaEngine.validateFormula('2 + + 3', mockFields);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('FormulaParser', () => {
  let parser: FormulaParser;

  beforeEach(() => {
    parser = new FormulaParser();
  });

  describe('tokenization', () => {
    it('should tokenize numbers', () => {
      const ast = parser.parse('42');
      expect(ast.type).toBe('Number');
      expect(ast.value).toBe(42);
    });

    it('should tokenize strings', () => {
      const ast = parser.parse('"hello"');
      expect(ast.type).toBe('String');
      expect(ast.value).toBe('hello');
    });

    it('should tokenize field references', () => {
      const ast = parser.parse('[Field Name]');
      expect(ast.type).toBe('Field');
      expect(ast.name).toBe('Field Name');
    });

    it('should tokenize functions', () => {
      const ast = parser.parse('SUM(1, 2)');
      expect(ast.type).toBe('Function');
      expect(ast.name).toBe('SUM');
      expect(ast.args).toHaveLength(2);
    });
  });

  describe('operator precedence', () => {
    it('should handle multiplication before addition', () => {
      const ast = parser.parse('2 + 3 * 4');
      expect(ast.type).toBe('BinaryOp');
      expect(ast.operator).toBe('+');
      expect(ast.left.type).toBe('Number');
      expect(ast.right.type).toBe('BinaryOp');
      expect(ast.right.operator).toBe('*');
    });

    it('should handle parentheses', () => {
      const ast = parser.parse('(2 + 3) * 4');
      expect(ast.type).toBe('BinaryOp');
      expect(ast.operator).toBe('*');
      expect(ast.left.type).toBe('BinaryOp');
      expect(ast.left.operator).toBe('+');
    });
  });
});

describe('DependencyTracker', () => {
  let tracker: DependencyTracker;

  beforeEach(() => {
    tracker = new DependencyTracker();
  });

  it('should extract dependencies from simple field reference', () => {
    const ast = { type: 'Field', name: 'Price' };
    const deps = tracker.extractDependencies(ast);
    expect(deps).toEqual(['Price']);
  });

  it('should extract dependencies from binary operations', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'Field', name: 'Price' },
      right: { type: 'Field', name: 'Tax' }
    };
    const deps = tracker.extractDependencies(ast);
    expect(deps.sort()).toEqual(['Price', 'Tax']);
  });

  it('should extract dependencies from function calls', () => {
    const ast = {
      type: 'Function',
      name: 'SUM',
      args: [
        { type: 'Field', name: 'Price' },
        { type: 'Field', name: 'Tax' }
      ]
    };
    const deps = tracker.extractDependencies(ast);
    expect(deps.sort()).toEqual(['Price', 'Tax']);
  });

  it('should handle nested expressions', () => {
    const ast = {
      type: 'Function',
      name: 'IF',
      args: [
        {
          type: 'BinaryOp',
          operator: '>',
          left: { type: 'Field', name: 'Price' },
          right: { type: 'Number', value: 100 }
        },
        { type: 'Field', name: 'HighValue' },
        { type: 'Field', name: 'LowValue' }
      ]
    };
    const deps = tracker.extractDependencies(ast);
    expect(deps.sort()).toEqual(['HighValue', 'LowValue', 'Price']);
  });
});

describe('Advanced Formula Functions', () => {
  let formulaEngine: FormulaEngine;
  let mockContext: FormulaContext;

  beforeEach(() => {
    formulaEngine = new FormulaEngine();
    
    const mockFields: Field[] = [
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
      }
    ];

    const mockRecord: Record = {
      id: 'record1',
      table_id: 'table1',
      row_index: 0,
      fields: {
        field1: 10.50
      },
      deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'user1',
      updated_by: 'user1'
    };

    mockContext = {
      currentRecord: mockRecord,
      allRecords: [mockRecord],
      fields: mockFields,
      tableId: 'table1'
    };
  });

  describe('Statistical Functions', () => {
    it('should calculate standard deviation (sample)', () => {
      const formula = 'STDEV(1, 2, 3, 4, 5)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeCloseTo(1.58, 2);
    });

    it('should calculate standard deviation (population)', () => {
      const formula = 'STDEVP(1, 2, 3, 4, 5)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeCloseTo(1.41, 2);
    });

    it('should calculate variance (sample)', () => {
      const formula = 'VAR(1, 2, 3, 4, 5)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeCloseTo(2.5, 1);
    });

    it('should calculate variance (population)', () => {
      const formula = 'VARP(1, 2, 3, 4, 5)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(2);
    });

    it('should calculate median', () => {
      const formula = 'MEDIAN(1, 2, 3, 4, 5)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(3);
    });

    it('should calculate median for even number of values', () => {
      const formula = 'MEDIAN(1, 2, 3, 4)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(2.5);
    });

    it('should calculate mode', () => {
      const formula = 'MODE(1, 2, 2, 3, 4)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(2);
    });

    it('should calculate percentile', () => {
      const formula = 'PERCENTILE(50, 1, 2, 3, 4, 5)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(3);
    });

    it('should calculate quartile', () => {
      const formula = 'QUARTILE(2, 1, 2, 3, 4, 5)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(3);
    });
  });

  describe('Advanced Text Functions', () => {
    it('should find text position', () => {
      const formula = 'FIND("world", "hello world")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(7);
    });

    it('should search text with wildcards', () => {
      const formula = 'SEARCH("w*d", "hello world")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(7);
    });

    it('should substitute text', () => {
      const formula = 'SUBSTITUTE("hello world", "world", "universe")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('text');
      expect(result.value).toBe('hello universe');
    });

    it('should replace text', () => {
      const formula = 'REPLACE("hello world", 7, 5, "universe")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('text');
      expect(result.value).toBe('hello universe');
    });

    it('should repeat text', () => {
      const formula = 'REPT("abc", 3)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('text');
      expect(result.value).toBe('abcabcabc');
    });

    it('should reverse text', () => {
      const formula = 'REVERSE("hello")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('text');
      expect(result.value).toBe('olleh');
    });

    it('should convert to proper case', () => {
      const formula = 'PROPER("hello WORLD")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('text');
      expect(result.value).toBe('Hello World');
    });

    it('should clean text', () => {
      const formula = 'CLEAN("hello\\x01world")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('text');
      expect(result.value).toBe('helloworld');
    });

    it('should check exact match', () => {
      const formula = 'EXACT("hello", "hello")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('boolean');
      expect(result.value).toBe(true);
    });

    it('should check exact match case sensitive', () => {
      const formula = 'EXACT("hello", "Hello")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('boolean');
      expect(result.value).toBe(false);
    });
  });

  describe('Advanced Date/Time Functions', () => {
    it('should add years to date', () => {
      const formula = 'DATEADD("2023-01-01", "years", 1)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('date');
      expect(result.value).toContain('2024-01-01');
    });

    it('should add months to date', () => {
      const formula = 'DATEADD("2023-01-01", "months", 6)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('date');
      expect(result.value).toContain('2023-07-01');
    });

    it('should add days to date', () => {
      const formula = 'DATEADD("2023-01-01", "days", 30)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('date');
      expect(result.value).toContain('2023-01-31');
    });

    it('should calculate date difference in days', () => {
      const formula = 'DATEDIFF("2023-01-01", "2023-01-31", "days")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(30);
    });

    it('should calculate date difference in months', () => {
      const formula = 'DATEDIFF("2023-01-01", "2023-07-01", "months")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(6);
    });

    it('should get weekday', () => {
      const formula = 'WEEKDAY("2023-01-01")'; // Sunday
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(1); // Sunday = 1 in default mode
    });

    it('should get week number', () => {
      const formula = 'WEEKNUM("2023-01-08")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeGreaterThan(0);
    });

    it('should get hour from datetime', () => {
      const formula = 'HOUR("2023-01-01T15:30:45")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(15);
    });

    it('should get minute from datetime', () => {
      const formula = 'MINUTE("2023-01-01T15:30:45")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(30);
    });

    it('should get second from datetime', () => {
      const formula = 'SECOND("2023-01-01T15:30:45")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(45);
    });

    it('should create time', () => {
      const formula = 'TIME(15, 30, 45)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('date');
      expect(result.value).toContain('15:30:45');
    });

    it('should get end of month', () => {
      const formula = 'EOMONTH("2023-01-15", 0)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('date');
      expect(result.value).toBe('2023-01-31');
    });

    it('should calculate year fraction', () => {
      const formula = 'YEARFRAC("2023-01-01", "2023-07-01")';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeCloseTo(0.5, 1);
    });
  });

  describe('Advanced Math Functions', () => {
    it('should calculate modulo', () => {
      const formula = 'MOD(10, 3)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(1);
    });

    it('should calculate ceiling', () => {
      const formula = 'CEILING(4.3)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(5);
    });

    it('should calculate floor', () => {
      const formula = 'FLOOR(4.7)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(4);
    });

    it('should truncate number', () => {
      const formula = 'TRUNC(4.7)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(4);
    });

    it('should get sign of number', () => {
      const formula = 'SIGN(-5)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(-1);
    });

    it('should generate random number', () => {
      const formula = 'RAND()';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
    });

    it('should generate random number between values', () => {
      const formula = 'RANDBETWEEN(1, 10)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(10);
    });

    it('should calculate GCD', () => {
      const formula = 'GCD(12, 18)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(6);
    });

    it('should calculate LCM', () => {
      const formula = 'LCM(12, 18)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(36);
    });

    it('should calculate factorial', () => {
      const formula = 'FACT(5)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(120);
    });

    it('should calculate logarithm', () => {
      const formula = 'LOG(100, 10)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(2);
    });

    it('should calculate natural logarithm', () => {
      const formula = 'LN(2.718281828)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeCloseTo(1, 5);
    });

    it('should calculate exponential', () => {
      const formula = 'EXP(1)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeCloseTo(2.718281828, 5);
    });

    it('should calculate sine', () => {
      const formula = 'SIN(0)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(0);
    });

    it('should calculate cosine', () => {
      const formula = 'COS(0)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(1);
    });

    it('should calculate tangent', () => {
      const formula = 'TAN(0)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(0);
    });

    it('should convert degrees to radians', () => {
      const formula = 'RADIANS(180)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeCloseTo(Math.PI, 5);
    });

    it('should convert radians to degrees', () => {
      const formula = 'DEGREES(3.14159265)';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBeCloseTo(180, 1);
    });

    it('should return PI constant', () => {
      const formula = 'PI()';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(Math.PI);
    });

    it('should return E constant', () => {
      const formula = 'E()';
      const result = formulaEngine.evaluateFormula(formula, mockContext);
      
      expect(result.type).toBe('number');
      expect(result.value).toBe(Math.E);
    });
  });
});