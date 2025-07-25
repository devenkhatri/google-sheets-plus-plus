import { Field } from '../models/Field';
import { Record } from '../models/Record';

export interface FormulaContext {
  currentRecord: Record;
  allRecords: Record[];
  fields: Field[];
  tableId: string;
}

export interface FormulaResult {
  value: any;
  type: 'text' | 'number' | 'date' | 'boolean' | 'error';
  error?: string;
}

export interface FormulaDependency {
  fieldId: string;
  fieldName: string;
  type: 'direct' | 'indirect';
}

export class FormulaEngine {
  private parser: FormulaParser;
  private evaluator: FormulaEvaluator;
  private dependencyTracker: DependencyTracker;

  constructor() {
    this.parser = new FormulaParser();
    this.evaluator = new FormulaEvaluator();
    this.dependencyTracker = new DependencyTracker();
  }

  /**
   * Parse and validate a formula
   */
  parseFormula(formula: string): { valid: boolean; ast?: any; error?: string; dependencies?: string[] } {
    try {
      const ast = this.parser.parse(formula);
      const dependencies = this.dependencyTracker.extractDependencies(ast);
      return {
        valid: true,
        ast,
        dependencies
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }

  /**
   * Evaluate a formula with given context
   */
  evaluateFormula(formula: string, context: FormulaContext): FormulaResult {
    try {
      const parseResult = this.parseFormula(formula);
      if (!parseResult.valid || !parseResult.ast) {
        return {
          value: null,
          type: 'error',
          error: parseResult.error || 'Invalid formula'
        };
      }

      const result = this.evaluator.evaluate(parseResult.ast, context);
      return result;
    } catch (error) {
      return {
        value: null,
        type: 'error',
        error: error instanceof Error ? error.message : 'Evaluation error'
      };
    }
  }

  /**
   * Get all dependencies for a formula
   */
  getDependencies(formula: string): FormulaDependency[] {
    try {
      const parseResult = this.parseFormula(formula);
      if (!parseResult.valid || !parseResult.ast) {
        return [];
      }

      return this.dependencyTracker.getDependencies(parseResult.ast);
    } catch (error) {
      return [];
    }
  }

  /**
   * Validate formula syntax and dependencies
   */
  validateFormula(formula: string, availableFields: Field[]): { valid: boolean; error?: string } {
    const parseResult = this.parseFormula(formula);
    if (!parseResult.valid) {
      return parseResult;
    }

    // Check if all referenced fields exist
    const dependencies = parseResult.dependencies || [];
    const fieldNames = availableFields.map(f => f.name);
    
    for (const dep of dependencies) {
      if (!fieldNames.includes(dep)) {
        return {
          valid: false,
          error: `Field "${dep}" not found`
        };
      }
    }

    return { valid: true };
  }
}

/**
 * Formula Parser - converts formula string to AST
 */
export class FormulaParser {
  private tokens: Token[] = [];
  private current = 0;

  parse(formula: string): any {
    this.tokens = this.tokenize(formula);
    this.current = 0;
    return this.parseExpression();
  }

  private tokenize(formula: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < formula.length) {
      const char = formula[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers
      if (/\d/.test(char)) {
        let num = '';
        while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === '.')) {
          num += formula[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(num) });
        continue;
      }

      // Strings
      if (char === '"') {
        let str = '';
        i++; // Skip opening quote
        while (i < formula.length && formula[i] !== '"') {
          str += formula[i];
          i++;
        }
        if (i >= formula.length) {
          throw new Error('Unterminated string');
        }
        i++; // Skip closing quote
        tokens.push({ type: 'STRING', value: str });
        continue;
      }

      // Field references [Field Name]
      if (char === '[') {
        let fieldName = '';
        i++; // Skip opening bracket
        while (i < formula.length && formula[i] !== ']') {
          fieldName += formula[i];
          i++;
        }
        if (i >= formula.length) {
          throw new Error('Unterminated field reference');
        }
        i++; // Skip closing bracket
        tokens.push({ type: 'FIELD', value: fieldName });
        continue;
      }

      // Functions and identifiers
      if (/[a-zA-Z_]/.test(char)) {
        let identifier = '';
        while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
          identifier += formula[i];
          i++;
        }
        
        // Check if it's followed by parentheses (function)
        if (i < formula.length && formula[i] === '(') {
          tokens.push({ type: 'FUNCTION', value: identifier.toUpperCase() });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: identifier });
        }
        continue;
      }

      // Operators and punctuation
      switch (char) {
        case '+':
          tokens.push({ type: 'PLUS', value: '+' });
          break;
        case '-':
          tokens.push({ type: 'MINUS', value: '-' });
          break;
        case '*':
          tokens.push({ type: 'MULTIPLY', value: '*' });
          break;
        case '/':
          tokens.push({ type: 'DIVIDE', value: '/' });
          break;
        case '(':
          tokens.push({ type: 'LPAREN', value: '(' });
          break;
        case ')':
          tokens.push({ type: 'RPAREN', value: ')' });
          break;
        case ',':
          tokens.push({ type: 'COMMA', value: ',' });
          break;
        case '=':
          if (i + 1 < formula.length && formula[i + 1] === '=') {
            tokens.push({ type: 'EQUALS', value: '==' });
            i++;
          } else {
            tokens.push({ type: 'ASSIGN', value: '=' });
          }
          break;
        case '!':
          if (i + 1 < formula.length && formula[i + 1] === '=') {
            tokens.push({ type: 'NOT_EQUALS', value: '!=' });
            i++;
          } else {
            tokens.push({ type: 'NOT', value: '!' });
          }
          break;
        case '<':
          if (i + 1 < formula.length && formula[i + 1] === '=') {
            tokens.push({ type: 'LESS_EQUALS', value: '<=' });
            i++;
          } else {
            tokens.push({ type: 'LESS', value: '<' });
          }
          break;
        case '>':
          if (i + 1 < formula.length && formula[i + 1] === '=') {
            tokens.push({ type: 'GREATER_EQUALS', value: '>=' });
            i++;
          } else {
            tokens.push({ type: 'GREATER', value: '>' });
          }
          break;
        case '&':
          tokens.push({ type: 'CONCAT', value: '&' });
          break;
        default:
          throw new Error(`Unexpected character: ${char}`);
      }
      i++;
    }

    return tokens;
  }

  private parseExpression(): any {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): any {
    let left = this.parseLogicalAnd();

    while (this.match('IDENTIFIER') && this.previous().value === 'OR') {
      const operator = this.previous();
      const right = this.parseLogicalAnd();
      left = { type: 'BinaryOp', operator: operator.value, left, right };
    }

    return left;
  }

  private parseLogicalAnd(): any {
    let left = this.parseEquality();

    while (this.match('IDENTIFIER') && this.previous().value === 'AND') {
      const operator = this.previous();
      const right = this.parseEquality();
      left = { type: 'BinaryOp', operator: operator.value, left, right };
    }

    return left;
  }

  private parseEquality(): any {
    let left = this.parseComparison();

    while (this.match('EQUALS', 'NOT_EQUALS')) {
      const operator = this.previous();
      const right = this.parseComparison();
      left = { type: 'BinaryOp', operator: operator.value, left, right };
    }

    return left;
  }

  private parseComparison(): any {
    let left = this.parseConcatenation();

    while (this.match('GREATER', 'GREATER_EQUALS', 'LESS', 'LESS_EQUALS')) {
      const operator = this.previous();
      const right = this.parseConcatenation();
      left = { type: 'BinaryOp', operator: operator.value, left, right };
    }

    return left;
  }

  private parseConcatenation(): any {
    let left = this.parseAddition();

    while (this.match('CONCAT')) {
      const operator = this.previous();
      const right = this.parseAddition();
      left = { type: 'BinaryOp', operator: operator.value, left, right };
    }

    return left;
  }

  private parseAddition(): any {
    let left = this.parseMultiplication();

    while (this.match('PLUS', 'MINUS')) {
      const operator = this.previous();
      const right = this.parseMultiplication();
      left = { type: 'BinaryOp', operator: operator.value, left, right };
    }

    return left;
  }

  private parseMultiplication(): any {
    let left = this.parseUnary();

    while (this.match('MULTIPLY', 'DIVIDE')) {
      const operator = this.previous();
      const right = this.parseUnary();
      left = { type: 'BinaryOp', operator: operator.value, left, right };
    }

    return left;
  }

  private parseUnary(): any {
    if (this.match('NOT', 'MINUS')) {
      const operator = this.previous();
      const right = this.parseUnary();
      return { type: 'UnaryOp', operator: operator.value, operand: right };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): any {
    if (this.match('NUMBER')) {
      return { type: 'Number', value: this.previous().value };
    }

    if (this.match('STRING')) {
      return { type: 'String', value: this.previous().value };
    }

    if (this.match('FIELD')) {
      return { type: 'Field', name: this.previous().value };
    }

    if (this.match('FUNCTION')) {
      const functionName = this.previous().value;
      this.consume('LPAREN', 'Expected "(" after function name');
      
      const args: any[] = [];
      if (!this.check('RPAREN')) {
        do {
          args.push(this.parseExpression());
        } while (this.match('COMMA'));
      }
      
      this.consume('RPAREN', 'Expected ")" after function arguments');
      return { type: 'Function', name: functionName, args };
    }

    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', 'Expected ")" after expression');
      return expr;
    }

    throw new Error(`Unexpected token: ${this.peek().type}`);
  }

  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: null };
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: string, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(message);
  }
}

interface Token {
  type: string;
  value: any;
}

/**
 * Formula Evaluator - evaluates AST with context
 */
export class FormulaEvaluator {
  evaluate(ast: any, context: FormulaContext): FormulaResult {
    try {
      const value = this.evaluateNode(ast, context);
      return {
        value,
        type: this.getValueType(value)
      };
    } catch (error) {
      return {
        value: null,
        type: 'error',
        error: error instanceof Error ? error.message : 'Evaluation error'
      };
    }
  }

  private evaluateNode(node: any, context: FormulaContext): any {
    switch (node.type) {
      case 'Number':
        return node.value;
      
      case 'String':
        return node.value;
      
      case 'Field':
        return this.getFieldValue(node.name, context);
      
      case 'BinaryOp':
        return this.evaluateBinaryOp(node, context);
      
      case 'UnaryOp':
        return this.evaluateUnaryOp(node, context);
      
      case 'Function':
        return this.evaluateFunction(node, context);
      
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private getFieldValue(fieldName: string, context: FormulaContext): any {
    const field = context.fields.find(f => f.name === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    const fieldValue = context.currentRecord.fields[field.id];
    return fieldValue;
  }

  private evaluateBinaryOp(node: any, context: FormulaContext): any {
    const left = this.evaluateNode(node.left, context);
    const right = this.evaluateNode(node.right, context);

    switch (node.operator) {
      case '+':
        return this.coerceToNumber(left) + this.coerceToNumber(right);
      case '-':
        return this.coerceToNumber(left) - this.coerceToNumber(right);
      case '*':
        return this.coerceToNumber(left) * this.coerceToNumber(right);
      case '/':
        const rightNum = this.coerceToNumber(right);
        if (rightNum === 0) throw new Error('Division by zero');
        return this.coerceToNumber(left) / rightNum;
      case '&':
        return String(left) + String(right);
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '<':
        return this.coerceToNumber(left) < this.coerceToNumber(right);
      case '<=':
        return this.coerceToNumber(left) <= this.coerceToNumber(right);
      case '>':
        return this.coerceToNumber(left) > this.coerceToNumber(right);
      case '>=':
        return this.coerceToNumber(left) >= this.coerceToNumber(right);
      case 'AND':
        return this.coerceToBoolean(left) && this.coerceToBoolean(right);
      case 'OR':
        return this.coerceToBoolean(left) || this.coerceToBoolean(right);
      default:
        throw new Error(`Unknown binary operator: ${node.operator}`);
    }
  }

  private evaluateUnaryOp(node: any, context: FormulaContext): any {
    const operand = this.evaluateNode(node.operand, context);

    switch (node.operator) {
      case '-':
        return -this.coerceToNumber(operand);
      case '!':
      case 'NOT':
        return !this.coerceToBoolean(operand);
      default:
        throw new Error(`Unknown unary operator: ${node.operator}`);
    }
  }

  private evaluateFunction(node: any, context: FormulaContext): any {
    const args = node.args.map((arg: any) => this.evaluateNode(arg, context));
    
    switch (node.name) {
      // Math functions
      case 'SUM':
        return args.reduce((sum: number, val: any) => sum + this.coerceToNumber(val), 0);
      case 'AVERAGE':
        if (args.length === 0) return 0;
        return args.reduce((sum: number, val: any) => sum + this.coerceToNumber(val), 0) / args.length;
      case 'MIN':
        return Math.min(...args.map((val: any) => this.coerceToNumber(val)));
      case 'MAX':
        return Math.max(...args.map((val: any) => this.coerceToNumber(val)));
      case 'ROUND':
        const roundNum = this.coerceToNumber(args[0]);
        const digits = args[1] ? this.coerceToNumber(args[1]) : 0;
        return Math.round(roundNum * Math.pow(10, digits)) / Math.pow(10, digits);
      case 'ABS':
        return Math.abs(this.coerceToNumber(args[0]));
      case 'SQRT':
        return Math.sqrt(this.coerceToNumber(args[0]));
      case 'POWER':
        return Math.pow(this.coerceToNumber(args[0]), this.coerceToNumber(args[1]));
      
      // String functions
      case 'CONCATENATE':
      case 'CONCAT':
        return args.map((arg: any) => String(arg)).join('');
      case 'LEFT':
        const leftStr = String(args[0]);
        const leftCount = this.coerceToNumber(args[1]);
        return leftStr.substring(0, leftCount);
      case 'RIGHT':
        const rightStr = String(args[0]);
        const rightCount = this.coerceToNumber(args[1]);
        return rightStr.substring(rightStr.length - rightCount);
      case 'MID':
        const midStr = String(args[0]);
        const start = this.coerceToNumber(args[1]) - 1; // 1-based to 0-based
        const length = this.coerceToNumber(args[2]);
        return midStr.substring(start, start + length);
      case 'LEN':
        return String(args[0]).length;
      case 'UPPER':
        return String(args[0]).toUpperCase();
      case 'LOWER':
        return String(args[0]).toLowerCase();
      case 'TRIM':
        return String(args[0]).trim();
      
      // Date functions
      case 'TODAY':
        return new Date().toISOString().split('T')[0];
      case 'NOW':
        return new Date().toISOString();
      case 'YEAR':
        return new Date(args[0]).getFullYear();
      case 'MONTH':
        return new Date(args[0]).getMonth() + 1; // 0-based to 1-based
      case 'DAY':
        return new Date(args[0]).getDate();
      
      // Logical functions
      case 'IF':
        const condition = this.coerceToBoolean(args[0]);
        return condition ? args[1] : (args[2] || '');
      case 'AND':
        return args.every((arg: any) => this.coerceToBoolean(arg));
      case 'OR':
        return args.some((arg: any) => this.coerceToBoolean(arg));
      case 'NOT':
        return !this.coerceToBoolean(args[0]);
      
      // Aggregate functions
      case 'COUNT':
        return args.filter((arg: any) => arg != null && arg !== '').length;
      
      // Statistical functions
      case 'STDEV':
      case 'STDEVP':
        return this.calculateStandardDeviation(args, node.name === 'STDEVP');
      case 'VAR':
      case 'VARP':
        return this.calculateVariance(args, node.name === 'VARP');
      case 'MEDIAN':
        return this.calculateMedian(args);
      case 'MODE':
        return this.calculateMode(args);
      case 'PERCENTILE':
        return this.calculatePercentile(args.slice(1), this.coerceToNumber(args[0]));
      case 'QUARTILE':
        return this.calculateQuartile(args.slice(1), this.coerceToNumber(args[0]));
      case 'COVAR':
        return this.calculateCovariance(args[0], args[1]);
      case 'CORREL':
        return this.calculateCorrelation(args[0], args[1]);
      
      // Advanced text functions
      case 'FIND':
        return this.findText(String(args[0]), String(args[1]), args[2] ? this.coerceToNumber(args[2]) : 1);
      case 'SEARCH':
        return this.searchText(String(args[0]), String(args[1]), args[2] ? this.coerceToNumber(args[2]) : 1);
      case 'SUBSTITUTE':
        return this.substituteText(String(args[0]), String(args[1]), String(args[2]), args[3] ? this.coerceToNumber(args[3]) : undefined);
      case 'REPLACE':
        return this.replaceText(String(args[0]), this.coerceToNumber(args[1]), this.coerceToNumber(args[2]), String(args[3]));
      case 'REPT':
        return String(args[0]).repeat(this.coerceToNumber(args[1]));
      case 'REVERSE':
        return String(args[0]).split('').reverse().join('');
      case 'PROPER':
        return this.toProperCase(String(args[0]));
      case 'CLEAN':
        return this.cleanText(String(args[0]));
      case 'EXACT':
        return String(args[0]) === String(args[1]);
      case 'SPLIT':
        return String(args[0]).split(String(args[1]));
      case 'JOIN':
        return Array.isArray(args[0]) ? args[0].join(String(args[1])) : String(args[0]);
      
      // Advanced date/time functions
      case 'DATEADD':
        return this.dateAdd(args[0], String(args[1]), this.coerceToNumber(args[2]));
      case 'DATEDIFF':
        return this.dateDiff(args[0], args[1], String(args[2] || 'days'));
      case 'WEEKDAY':
        return this.getWeekday(args[0], args[1] ? this.coerceToNumber(args[1]) : 1);
      case 'WEEKNUM':
        return this.getWeekNumber(args[0], args[1] ? this.coerceToNumber(args[1]) : 1);
      case 'HOUR':
        return new Date(args[0]).getHours();
      case 'MINUTE':
        return new Date(args[0]).getMinutes();
      case 'SECOND':
        return new Date(args[0]).getSeconds();
      case 'TIME':
        return this.createTime(this.coerceToNumber(args[0]), this.coerceToNumber(args[1]), this.coerceToNumber(args[2]));
      case 'TIMEVALUE':
        return this.parseTime(String(args[0]));
      case 'DATEVALUE':
        return this.parseDate(String(args[0]));
      case 'EOMONTH':
        return this.endOfMonth(args[0], this.coerceToNumber(args[1]));
      case 'WORKDAY':
        return this.calculateWorkday(args[0], this.coerceToNumber(args[1]), args[2]);
      case 'NETWORKDAYS':
        return this.calculateNetworkDays(args[0], args[1], args[2]);
      case 'YEARFRAC':
        return this.calculateYearFraction(args[0], args[1], args[2] ? this.coerceToNumber(args[2]) : 0);
      
      // Additional math functions
      case 'MOD':
        return this.coerceToNumber(args[0]) % this.coerceToNumber(args[1]);
      case 'CEILING':
        return Math.ceil(this.coerceToNumber(args[0]));
      case 'FLOOR':
        return Math.floor(this.coerceToNumber(args[0]));
      case 'TRUNC':
        return Math.trunc(this.coerceToNumber(args[0]));
      case 'SIGN':
        const signNum = this.coerceToNumber(args[0]);
        return signNum > 0 ? 1 : signNum < 0 ? -1 : 0;
      case 'RAND':
        return Math.random();
      case 'RANDBETWEEN':
        const min = this.coerceToNumber(args[0]);
        const max = this.coerceToNumber(args[1]);
        return Math.floor(Math.random() * (max - min + 1)) + min;
      case 'GCD':
        return this.calculateGCD(args.map((arg: any) => this.coerceToNumber(arg)));
      case 'LCM':
        return this.calculateLCM(args.map((arg: any) => this.coerceToNumber(arg)));
      case 'FACT':
        return this.factorial(this.coerceToNumber(args[0]));
      case 'LOG':
        const base = args[1] ? this.coerceToNumber(args[1]) : 10;
        return Math.log(this.coerceToNumber(args[0])) / Math.log(base);
      case 'LN':
        return Math.log(this.coerceToNumber(args[0]));
      case 'EXP':
        return Math.exp(this.coerceToNumber(args[0]));
      case 'SIN':
        return Math.sin(this.coerceToNumber(args[0]));
      case 'COS':
        return Math.cos(this.coerceToNumber(args[0]));
      case 'TAN':
        return Math.tan(this.coerceToNumber(args[0]));
      case 'ASIN':
        return Math.asin(this.coerceToNumber(args[0]));
      case 'ACOS':
        return Math.acos(this.coerceToNumber(args[0]));
      case 'ATAN':
        return Math.atan(this.coerceToNumber(args[0]));
      case 'ATAN2':
        return Math.atan2(this.coerceToNumber(args[0]), this.coerceToNumber(args[1]));
      case 'DEGREES':
        return this.coerceToNumber(args[0]) * (180 / Math.PI);
      case 'RADIANS':
        return this.coerceToNumber(args[0]) * (Math.PI / 180);
      case 'PI':
        return Math.PI;
      case 'E':
        return Math.E;
      
      default:
        throw new Error(`Unknown function: ${node.name}`);
    }
  }

  private coerceToNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return 0;
  }

  private coerceToBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value !== '';
    return value != null;
  }

  private getValueType(value: any): 'text' | 'number' | 'date' | 'boolean' | 'error' {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      return 'date';
    }
    return 'text';
  }

  // Statistical function implementations
  private calculateStandardDeviation(values: any[], isPopulation: boolean = false): number {
    const numbers = values.map((v: any) => this.coerceToNumber(v)).filter((n: number) => !isNaN(n));
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (isPopulation ? numbers.length : numbers.length - 1);
    
    return Math.sqrt(variance);
  }

  private calculateVariance(values: any[], isPopulation: boolean = false): number {
    const numbers = values.map((v: any) => this.coerceToNumber(v)).filter((n: number) => !isNaN(n));
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (isPopulation ? numbers.length : numbers.length - 1);
  }

  private calculateMedian(values: any[]): number {
    const numbers = values.map((v: any) => this.coerceToNumber(v)).filter((n: number) => !isNaN(n)).sort((a: number, b: number) => a - b);
    if (numbers.length === 0) return 0;
    
    const mid = Math.floor(numbers.length / 2);
    return numbers.length % 2 === 0 
      ? (numbers[mid - 1] + numbers[mid]) / 2 
      : numbers[mid];
  }

  private calculateMode(values: any[]): number {
    const numbers = values.map((v: any) => this.coerceToNumber(v)).filter((n: number) => !isNaN(n));
    if (numbers.length === 0) return 0;
    
    const frequency: { [key: number]: number } = {};
    numbers.forEach(n => frequency[n] = (frequency[n] || 0) + 1);
    
    let maxFreq = 0;
    let mode = 0;
    for (const [num, freq] of Object.entries(frequency)) {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = parseFloat(num);
      }
    }
    
    return mode;
  }

  private calculatePercentile(values: any, percentile: number): number {
    if (!Array.isArray(values)) values = [values];
    const numbers = values.map((v: any) => this.coerceToNumber(v)).filter((n: number) => !isNaN(n)).sort((a: number, b: number) => a - b);
    if (numbers.length === 0) return 0;
    
    const index = (percentile / 100) * (numbers.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) return numbers[lower];
    
    const weight = index - lower;
    return numbers[lower] * (1 - weight) + numbers[upper] * weight;
  }

  private calculateQuartile(values: any, quartile: number): number {
    const percentiles = [0, 25, 50, 75, 100];
    if (quartile < 0 || quartile > 4) throw new Error('Quartile must be between 0 and 4');
    return this.calculatePercentile(values, percentiles[quartile]);
  }

  private calculateCovariance(values1: any, values2: any): number {
    if (!Array.isArray(values1)) values1 = [values1];
    if (!Array.isArray(values2)) values2 = [values2];
    
    const nums1 = values1.map((v: any) => this.coerceToNumber(v)).filter((n: number) => !isNaN(n));
    const nums2 = values2.map((v: any) => this.coerceToNumber(v)).filter((n: number) => !isNaN(n));
    
    if (nums1.length !== nums2.length || nums1.length === 0) return 0;
    
    const mean1 = nums1.reduce((sum: number, n: number) => sum + n, 0) / nums1.length;
    const mean2 = nums2.reduce((sum: number, n: number) => sum + n, 0) / nums2.length;
    
    const covariance = nums1.reduce((sum: number, n1: number, i: number) => {
      return sum + (n1 - mean1) * (nums2[i] - mean2);
    }, 0) / (nums1.length - 1);
    
    return covariance;
  }

  private calculateCorrelation(values1: any, values2: any): number {
    const covariance = this.calculateCovariance(values1, values2);
    const stdev1 = this.calculateStandardDeviation(Array.isArray(values1) ? values1 : [values1]);
    const stdev2 = this.calculateStandardDeviation(Array.isArray(values2) ? values2 : [values2]);
    
    if (stdev1 === 0 || stdev2 === 0) return 0;
    return covariance / (stdev1 * stdev2);
  }

  // Text function implementations
  private findText(findText: string, withinText: string, startNum: number = 1): number {
    const index = withinText.indexOf(findText, startNum - 1);
    if (index === -1) throw new Error('Text not found');
    return index + 1; // Convert to 1-based indexing
  }

  private searchText(findText: string, withinText: string, startNum: number = 1): number {
    // Case-insensitive search with wildcards
    const pattern = findText.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(pattern, 'i');
    const searchText = withinText.substring(startNum - 1);
    const match = searchText.match(regex);
    
    if (!match) throw new Error('Text not found');
    return (match.index || 0) + startNum;
  }

  private substituteText(text: string, oldText: string, newText: string, instanceNum?: number): string {
    if (instanceNum === undefined) {
      return text.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newText);
    } else {
      let count = 0;
      return text.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (match) => {
        count++;
        return count === instanceNum ? newText : match;
      });
    }
  }

  private replaceText(oldText: string, startNum: number, numChars: number, newText: string): string {
    const start = startNum - 1; // Convert to 0-based indexing
    return oldText.substring(0, start) + newText + oldText.substring(start + numChars);
  }

  private toProperCase(text: string): string {
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  private cleanText(text: string): string {
    // Remove non-printable characters including escaped sequences
    return text.replace(/[\x00-\x1F\x7F]|\\x[0-9A-Fa-f]{2}/g, '');
  }

  // Date/time function implementations
  private dateAdd(date: any, interval: string, number: number): string {
    const d = new Date(date);
    
    switch (interval.toLowerCase()) {
      case 'years':
      case 'year':
      case 'y':
        d.setFullYear(d.getFullYear() + number);
        break;
      case 'months':
      case 'month':
      case 'm':
        d.setMonth(d.getMonth() + number);
        break;
      case 'days':
      case 'day':
      case 'd':
        d.setDate(d.getDate() + number);
        break;
      case 'hours':
      case 'hour':
      case 'h':
        d.setHours(d.getHours() + number);
        break;
      case 'minutes':
      case 'minute':
      case 'min':
        d.setMinutes(d.getMinutes() + number);
        break;
      case 'seconds':
      case 'second':
      case 's':
        d.setSeconds(d.getSeconds() + number);
        break;
      default:
        throw new Error(`Invalid interval: ${interval}`);
    }
    
    return d.toISOString();
  }

  private dateDiff(date1: any, date2: any, interval: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffMs = d2.getTime() - d1.getTime();
    
    switch (interval.toLowerCase()) {
      case 'years':
      case 'year':
      case 'y':
        return d2.getFullYear() - d1.getFullYear();
      case 'months':
      case 'month':
      case 'm':
        return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
      case 'days':
      case 'day':
      case 'd':
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      case 'hours':
      case 'hour':
      case 'h':
        return Math.floor(diffMs / (1000 * 60 * 60));
      case 'minutes':
      case 'minute':
      case 'min':
        return Math.floor(diffMs / (1000 * 60));
      case 'seconds':
      case 'second':
      case 's':
        return Math.floor(diffMs / 1000);
      default:
        throw new Error(`Invalid interval: ${interval}`);
    }
  }

  private getWeekday(date: any, returnType: number = 1): number {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    switch (returnType) {
      case 1: // 1 = Sunday, 2 = Monday, etc.
        return day + 1;
      case 2: // 1 = Monday, 2 = Tuesday, etc.
        return day === 0 ? 7 : day;
      case 3: // 0 = Monday, 1 = Tuesday, etc.
        return day === 0 ? 6 : day - 1;
      default:
        return day + 1;
    }
  }

  private getWeekNumber(date: any, returnType: number = 1): number {
    const d = new Date(date);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekStart = returnType === 2 ? 1 : 0; // Monday vs Sunday
    
    // Calculate the week number
    const dayOfYear = Math.floor((d.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const jan1Day = yearStart.getDay();
    const weekNum = Math.ceil((dayOfYear + jan1Day - weekStart) / 7);
    
    return weekNum;
  }

  private createTime(hour: number, minute: number, second: number): string {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    const s = String(second).padStart(2, '0');
    return `1970-01-01T${h}:${m}:${s}.000Z`;
  }

  private parseTime(timeString: string): string {
    const d = new Date(`1970-01-01T${timeString}`);
    return d.toISOString();
  }

  private parseDate(dateString: string): string {
    const d = new Date(dateString);
    return d.toISOString();
  }

  private endOfMonth(date: any, monthsToAdd: number): string {
    const d = new Date(date);
    d.setMonth(d.getMonth() + monthsToAdd + 1, 0); // Set to last day of target month
    return d.toISOString().split('T')[0];
  }

  private calculateWorkday(startDate: any, days: number, holidays?: any[]): string {
    const d = new Date(startDate);
    const holidaySet = new Set((holidays || []).map(h => new Date(h).toDateString()));
    let workdaysAdded = 0;
    
    while (workdaysAdded < Math.abs(days)) {
      d.setDate(d.getDate() + (days > 0 ? 1 : -1));
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (d.getDay() !== 0 && d.getDay() !== 6 && !holidaySet.has(d.toDateString())) {
        workdaysAdded++;
      }
    }
    
    return d.toISOString().split('T')[0];
  }

  private calculateNetworkDays(startDate: any, endDate: any, holidays?: any[]): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const holidaySet = new Set((holidays || []).map(h => new Date(h).toDateString()));
    
    let workdays = 0;
    const current = new Date(start);
    
    while (current <= end) {
      if (current.getDay() !== 0 && current.getDay() !== 6 && !holidaySet.has(current.toDateString())) {
        workdays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workdays;
  }

  private calculateYearFraction(startDate: any, endDate: any, basis: number = 0): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    switch (basis) {
      case 0: // 30/360 US
        return diffDays / 360;
      case 1: // Actual/actual
        const year = start.getFullYear();
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        return diffDays / (isLeapYear ? 366 : 365);
      case 2: // Actual/360
        return diffDays / 360;
      case 3: // Actual/365
        return diffDays / 365;
      case 4: // 30/360 European
        return diffDays / 360;
      default:
        return diffDays / 365;
    }
  }

  // Math function implementations
  private calculateGCD(numbers: number[]): number {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    return numbers.reduce((acc, num) => gcd(acc, Math.abs(Math.floor(num))));
  }

  private calculateLCM(numbers: number[]): number {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const lcm = (a: number, b: number): number => Math.abs(a * b) / gcd(a, b);
    return numbers.reduce((acc, num) => lcm(acc, Math.abs(Math.floor(num))));
  }

  private factorial(n: number): number {
    n = Math.floor(Math.abs(n));
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }
}

/**
 * Dependency Tracker - tracks field dependencies in formulas
 */
export class DependencyTracker {
  extractDependencies(ast: any): string[] {
    const dependencies = new Set<string>();
    this.traverseAST(ast, dependencies);
    return Array.from(dependencies);
  }

  getDependencies(ast: any): FormulaDependency[] {
    const fieldNames = this.extractDependencies(ast);
    return fieldNames.map(name => ({
      fieldId: '', // Will be resolved by the service
      fieldName: name,
      type: 'direct' as const
    }));
  }

  private traverseAST(node: any, dependencies: Set<string>): void {
    if (!node) return;

    if (node.type === 'Field') {
      dependencies.add(node.name);
    }

    // Recursively traverse child nodes
    if (node.left) this.traverseAST(node.left, dependencies);
    if (node.right) this.traverseAST(node.right, dependencies);
    if (node.operand) this.traverseAST(node.operand, dependencies);
    if (node.args) {
      node.args.forEach((arg: any) => this.traverseAST(arg, dependencies));
    }
  }
}