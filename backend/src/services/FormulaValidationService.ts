import { FormulaEngine, FormulaContext } from './FormulaEngine';
import { Field } from '../models/Field';
import { Record } from '../models/Record';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  dependencies?: string[];
}

export interface FormulaAutoComplete {
  suggestions: AutoCompleteSuggestion[];
  position: number;
}

export interface AutoCompleteSuggestion {
  type: 'function' | 'field' | 'operator';
  value: string;
  description: string;
  insertText: string;
}

export class FormulaValidationService {
  private formulaEngine: FormulaEngine;
  private functions: Map<string, FunctionDefinition>;

  constructor() {
    this.formulaEngine = new FormulaEngine();
    this.functions = this.initializeFunctions();
  }

  /**
   * Validate a formula comprehensively
   */
  validateFormula(formula: string, fields: Field[], sampleRecord?: Record): ValidationResult {
    const warnings: string[] = [];

    // Basic syntax validation
    const parseResult = this.formulaEngine.parseFormula(formula);
    if (!parseResult.valid) {
      return {
        valid: false,
        error: parseResult.error
      };
    }

    // Check field dependencies
    const dependencies = parseResult.dependencies || [];
    const fieldNames = fields.map(f => f.name);
    
    for (const dep of dependencies) {
      if (!fieldNames.includes(dep)) {
        return {
          valid: false,
          error: `Field "${dep}" not found`
        };
      }
    }

    // Check for circular dependencies
    const circularCheck = this.checkCircularDependencies(formula, fields);
    if (!circularCheck.valid) {
      return circularCheck;
    }

    // Test evaluation with sample data if provided
    if (sampleRecord) {
      try {
        const context: FormulaContext = {
          currentRecord: sampleRecord,
          allRecords: [sampleRecord],
          fields,
          tableId: sampleRecord.table_id
        };
        
        const result = this.formulaEngine.evaluateFormula(formula, context);
        if (result.type === 'error') {
          warnings.push(`Formula evaluation warning: ${result.error}`);
        }
      } catch (error) {
        warnings.push('Formula may have runtime issues with current data');
      }
    }

    // Performance warnings
    const performanceWarnings = this.checkPerformanceIssues(formula, dependencies);
    warnings.push(...performanceWarnings);

    return {
      valid: true,
      dependencies,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Get autocomplete suggestions for formula
   */
  getAutoComplete(formula: string, cursorPosition: number, fields: Field[]): FormulaAutoComplete {
    const suggestions: AutoCompleteSuggestion[] = [];
    
    // Get context around cursor
    const beforeCursor = formula.substring(0, cursorPosition);
    const afterCursor = formula.substring(cursorPosition);
    
    // Determine what type of suggestion to provide
    const lastToken = this.getLastToken(beforeCursor);
    
    if (this.shouldSuggestFunction(beforeCursor)) {
      suggestions.push(...this.getFunctionSuggestions(lastToken));
    }
    
    if (this.shouldSuggestField(beforeCursor)) {
      suggestions.push(...this.getFieldSuggestions(lastToken, fields));
    }
    
    if (this.shouldSuggestOperator(beforeCursor)) {
      suggestions.push(...this.getOperatorSuggestions());
    }

    return {
      suggestions,
      position: cursorPosition
    };
  }

  /**
   * Get syntax highlighting tokens
   */
  getSyntaxHighlighting(formula: string): SyntaxToken[] {
    const tokens: SyntaxToken[] = [];
    
    try {
      const parseResult = this.formulaEngine.parseFormula(formula);
      if (parseResult.ast) {
        this.extractSyntaxTokens(parseResult.ast, tokens);
      }
    } catch (error) {
      // If parsing fails, provide basic tokenization
      return this.getBasicSyntaxTokens(formula);
    }
    
    return tokens;
  }

  private checkCircularDependencies(formula: string, fields: Field[]): ValidationResult {
    // This would need to be implemented with the full field dependency graph
    // For now, we'll do a basic check
    const dependencies = this.formulaEngine.parseFormula(formula).dependencies || [];
    
    // Check if any dependency fields also have formulas that might reference back
    for (const dep of dependencies) {
      const field = fields.find(f => f.name === dep);
      if (field && field.type === 'formula' && field.options?.formula) {
        const depDependencies = this.formulaEngine.parseFormula(field.options.formula).dependencies || [];
        // This is a simplified check - in reality, we'd need to traverse the full graph
        if (depDependencies.some(d => d === field.name)) {
          return {
            valid: false,
            error: `Circular dependency detected involving field "${dep}"`
          };
        }
      }
    }
    
    return { valid: true };
  }

  private checkPerformanceIssues(formula: string, dependencies: string[]): string[] {
    const warnings: string[] = [];
    
    // Check for excessive dependencies
    if (dependencies.length > 10) {
      warnings.push('Formula references many fields, which may impact performance');
    }
    
    // Check for nested function calls
    const functionCount = (formula.match(/[A-Z]+\(/g) || []).length;
    if (functionCount > 5) {
      warnings.push('Formula contains many function calls, consider simplifying');
    }
    
    // Check for potentially expensive operations
    if (formula.includes('VLOOKUP') || formula.includes('HLOOKUP')) {
      warnings.push('Lookup functions may be slow with large datasets');
    }
    
    return warnings;
  }

  private shouldSuggestFunction(beforeCursor: string): boolean {
    return /[^a-zA-Z0-9_]$/.test(beforeCursor) || beforeCursor === '';
  }

  private shouldSuggestField(beforeCursor: string): boolean {
    return beforeCursor.endsWith('[') || /\[[^[\]]*$/.test(beforeCursor);
  }

  private shouldSuggestOperator(beforeCursor: string): boolean {
    return /[a-zA-Z0-9_\]\)]$/.test(beforeCursor);
  }

  private getLastToken(text: string): string {
    const match = text.match(/[a-zA-Z0-9_]*$/);
    return match ? match[0] : '';
  }

  private getFunctionSuggestions(prefix: string): AutoCompleteSuggestion[] {
    const suggestions: AutoCompleteSuggestion[] = [];
    
    for (const [name, def] of this.functions) {
      if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
        suggestions.push({
          type: 'function',
          value: name,
          description: def.description,
          insertText: `${name}(${def.parameters.map(p => p.name).join(', ')})`
        });
      }
    }
    
    return suggestions.sort((a, b) => a.value.localeCompare(b.value));
  }

  private getFieldSuggestions(prefix: string, fields: Field[]): AutoCompleteSuggestion[] {
    return fields
      .filter(field => field.name.toLowerCase().includes(prefix.toLowerCase()))
      .map(field => ({
        type: 'field' as const,
        value: field.name,
        description: `${field.type} field`,
        insertText: field.name
      }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }

  private getOperatorSuggestions(): AutoCompleteSuggestion[] {
    return [
      { type: 'operator', value: '+', description: 'Addition', insertText: ' + ' },
      { type: 'operator', value: '-', description: 'Subtraction', insertText: ' - ' },
      { type: 'operator', value: '*', description: 'Multiplication', insertText: ' * ' },
      { type: 'operator', value: '/', description: 'Division', insertText: ' / ' },
      { type: 'operator', value: '&', description: 'Concatenation', insertText: ' & ' },
      { type: 'operator', value: '==', description: 'Equals', insertText: ' == ' },
      { type: 'operator', value: '!=', description: 'Not equals', insertText: ' != ' },
      { type: 'operator', value: '<', description: 'Less than', insertText: ' < ' },
      { type: 'operator', value: '>', description: 'Greater than', insertText: ' > ' },
      { type: 'operator', value: '<=', description: 'Less than or equal', insertText: ' <= ' },
      { type: 'operator', value: '>=', description: 'Greater than or equal', insertText: ' >= ' },
    ];
  }

  private extractSyntaxTokens(ast: any, tokens: SyntaxToken[]): void {
    // This would traverse the AST and extract tokens with their positions
    // Implementation would depend on having position information in the AST
  }

  private getBasicSyntaxTokens(formula: string): SyntaxToken[] {
    const tokens: SyntaxToken[] = [];
    let i = 0;
    
    while (i < formula.length) {
      const char = formula[i];
      
      // Functions
      if (/[A-Z]/.test(char)) {
        let func = '';
        const start = i;
        while (i < formula.length && /[A-Z]/.test(formula[i])) {
          func += formula[i];
          i++;
        }
        if (i < formula.length && formula[i] === '(') {
          tokens.push({
            type: 'function',
            value: func,
            start,
            end: i
          });
        }
        continue;
      }
      
      // Field references
      if (char === '[') {
        const start = i;
        let field = '';
        i++; // Skip [
        while (i < formula.length && formula[i] !== ']') {
          field += formula[i];
          i++;
        }
        if (i < formula.length) {
          i++; // Skip ]
          tokens.push({
            type: 'field',
            value: field,
            start,
            end: i
          });
        }
        continue;
      }
      
      // Numbers
      if (/\d/.test(char)) {
        const start = i;
        let num = '';
        while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === '.')) {
          num += formula[i];
          i++;
        }
        tokens.push({
          type: 'number',
          value: num,
          start,
          end: i
        });
        continue;
      }
      
      // Strings
      if (char === '"') {
        const start = i;
        let str = '"';
        i++; // Skip opening quote
        while (i < formula.length && formula[i] !== '"') {
          str += formula[i];
          i++;
        }
        if (i < formula.length) {
          str += formula[i];
          i++; // Skip closing quote
        }
        tokens.push({
          type: 'string',
          value: str,
          start,
          end: i
        });
        continue;
      }
      
      // Operators
      if ('+-*/&<>=!'.includes(char)) {
        tokens.push({
          type: 'operator',
          value: char,
          start: i,
          end: i + 1
        });
      }
      
      i++;
    }
    
    return tokens;
  }

  private initializeFunctions(): Map<string, FunctionDefinition> {
    const functions = new Map<string, FunctionDefinition>();
    
    // Math functions
    functions.set('SUM', {
      name: 'SUM',
      description: 'Returns the sum of numbers',
      parameters: [{ name: 'numbers', type: 'number', required: true, variadic: true }],
      returnType: 'number'
    });
    
    functions.set('AVERAGE', {
      name: 'AVERAGE',
      description: 'Returns the average of numbers',
      parameters: [{ name: 'numbers', type: 'number', required: true, variadic: true }],
      returnType: 'number'
    });
    
    functions.set('MIN', {
      name: 'MIN',
      description: 'Returns the minimum value',
      parameters: [{ name: 'numbers', type: 'number', required: true, variadic: true }],
      returnType: 'number'
    });
    
    functions.set('MAX', {
      name: 'MAX',
      description: 'Returns the maximum value',
      parameters: [{ name: 'numbers', type: 'number', required: true, variadic: true }],
      returnType: 'number'
    });
    
    functions.set('ROUND', {
      name: 'ROUND',
      description: 'Rounds a number to specified decimal places',
      parameters: [
        { name: 'number', type: 'number', required: true },
        { name: 'digits', type: 'number', required: false }
      ],
      returnType: 'number'
    });
    
    functions.set('ABS', {
      name: 'ABS',
      description: 'Returns the absolute value',
      parameters: [{ name: 'number', type: 'number', required: true }],
      returnType: 'number'
    });
    
    // String functions
    functions.set('CONCATENATE', {
      name: 'CONCATENATE',
      description: 'Joins text strings',
      parameters: [{ name: 'texts', type: 'text', required: true, variadic: true }],
      returnType: 'text'
    });
    
    functions.set('LEFT', {
      name: 'LEFT',
      description: 'Returns leftmost characters',
      parameters: [
        { name: 'text', type: 'text', required: true },
        { name: 'count', type: 'number', required: true }
      ],
      returnType: 'text'
    });
    
    functions.set('RIGHT', {
      name: 'RIGHT',
      description: 'Returns rightmost characters',
      parameters: [
        { name: 'text', type: 'text', required: true },
        { name: 'count', type: 'number', required: true }
      ],
      returnType: 'text'
    });
    
    functions.set('MID', {
      name: 'MID',
      description: 'Returns characters from middle of text',
      parameters: [
        { name: 'text', type: 'text', required: true },
        { name: 'start', type: 'number', required: true },
        { name: 'length', type: 'number', required: true }
      ],
      returnType: 'text'
    });
    
    functions.set('LEN', {
      name: 'LEN',
      description: 'Returns length of text',
      parameters: [{ name: 'text', type: 'text', required: true }],
      returnType: 'number'
    });
    
    functions.set('UPPER', {
      name: 'UPPER',
      description: 'Converts text to uppercase',
      parameters: [{ name: 'text', type: 'text', required: true }],
      returnType: 'text'
    });
    
    functions.set('LOWER', {
      name: 'LOWER',
      description: 'Converts text to lowercase',
      parameters: [{ name: 'text', type: 'text', required: true }],
      returnType: 'text'
    });
    
    functions.set('TRIM', {
      name: 'TRIM',
      description: 'Removes leading and trailing spaces',
      parameters: [{ name: 'text', type: 'text', required: true }],
      returnType: 'text'
    });
    
    // Date functions
    functions.set('TODAY', {
      name: 'TODAY',
      description: 'Returns current date',
      parameters: [],
      returnType: 'date'
    });
    
    functions.set('NOW', {
      name: 'NOW',
      description: 'Returns current date and time',
      parameters: [],
      returnType: 'date'
    });
    
    functions.set('YEAR', {
      name: 'YEAR',
      description: 'Returns year from date',
      parameters: [{ name: 'date', type: 'date', required: true }],
      returnType: 'number'
    });
    
    functions.set('MONTH', {
      name: 'MONTH',
      description: 'Returns month from date',
      parameters: [{ name: 'date', type: 'date', required: true }],
      returnType: 'number'
    });
    
    functions.set('DAY', {
      name: 'DAY',
      description: 'Returns day from date',
      parameters: [{ name: 'date', type: 'date', required: true }],
      returnType: 'number'
    });
    
    // Logical functions
    functions.set('IF', {
      name: 'IF',
      description: 'Returns value based on condition',
      parameters: [
        { name: 'condition', type: 'boolean', required: true },
        { name: 'trueValue', type: 'any', required: true },
        { name: 'falseValue', type: 'any', required: false }
      ],
      returnType: 'any'
    });
    
    functions.set('AND', {
      name: 'AND',
      description: 'Returns true if all conditions are true',
      parameters: [{ name: 'conditions', type: 'boolean', required: true, variadic: true }],
      returnType: 'boolean'
    });
    
    functions.set('OR', {
      name: 'OR',
      description: 'Returns true if any condition is true',
      parameters: [{ name: 'conditions', type: 'boolean', required: true, variadic: true }],
      returnType: 'boolean'
    });
    
    functions.set('NOT', {
      name: 'NOT',
      description: 'Returns opposite boolean value',
      parameters: [{ name: 'condition', type: 'boolean', required: true }],
      returnType: 'boolean'
    });
    
    functions.set('COUNT', {
      name: 'COUNT',
      description: 'Counts non-empty values',
      parameters: [{ name: 'values', type: 'any', required: true, variadic: true }],
      returnType: 'number'
    });
    
    return functions;
  }
}

interface FunctionDefinition {
  name: string;
  description: string;
  parameters: FunctionParameter[];
  returnType: string;
}

interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  variadic?: boolean;
}

interface SyntaxToken {
  type: 'function' | 'field' | 'number' | 'string' | 'operator' | 'keyword';
  value: string;
  start: number;
  end: number;
}