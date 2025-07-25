import { Request, Response } from 'express';
import { FieldService } from '../services/FieldService';
import { BaseController } from './BaseController';
import { AppError } from '../middleware/errorHandler';

export class FormulaController extends BaseController {
  private fieldService: FieldService;

  constructor() {
    super();
    this.fieldService = new FieldService();
  }

  /**
   * Validate a formula
   */
  validateFormula = async (req: Request, res: Response): Promise<void> => {
    try {
      const { formula } = req.body;
      const { tableId } = req.params;
      
      if (!formula || typeof formula !== 'string') {
        throw new AppError('Formula is required and must be a string', 400);
      }
      
      const validation = await this.fieldService.validateFormula(formula, tableId);
      
      this.sendResponse(res, 200, 'Formula validation completed', validation);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Get autocomplete suggestions for formula
   */
  getAutoComplete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { formula, cursorPosition } = req.body;
      const { tableId } = req.params;
      
      if (!formula || typeof formula !== 'string') {
        throw new AppError('Formula is required and must be a string', 400);
      }
      
      if (typeof cursorPosition !== 'number') {
        throw new AppError('Cursor position is required and must be a number', 400);
      }
      
      const suggestions = await this.fieldService.getFormulaAutoComplete(
        formula,
        cursorPosition,
        tableId
      );
      
      this.sendResponse(res, 200, 'Autocomplete suggestions retrieved', suggestions);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Get syntax highlighting for formula
   */
  getSyntaxHighlighting = async (req: Request, res: Response): Promise<void> => {
    try {
      const { formula } = req.body;
      
      if (!formula || typeof formula !== 'string') {
        throw new AppError('Formula is required and must be a string', 400);
      }
      
      const tokens = this.fieldService.getFormulaSyntaxHighlighting(formula);
      
      this.sendResponse(res, 200, 'Syntax highlighting retrieved', { tokens });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Evaluate formula for a specific record
   */
  evaluateFormula = async (req: Request, res: Response): Promise<void> => {
    try {
      const { formula, recordId } = req.body;
      const { tableId } = req.params;
      
      if (!formula || typeof formula !== 'string') {
        throw new AppError('Formula is required and must be a string', 400);
      }
      
      if (!recordId || typeof recordId !== 'string') {
        throw new AppError('Record ID is required and must be a string', 400);
      }
      
      const result = await this.fieldService.evaluateFormula(formula, recordId, tableId);
      
      this.sendResponse(res, 200, 'Formula evaluated', result);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Get formula dependencies
   */
  getDependencies = async (req: Request, res: Response): Promise<void> => {
    try {
      const { formula } = req.body;
      
      if (!formula || typeof formula !== 'string') {
        throw new AppError('Formula is required and must be a string', 400);
      }
      
      const dependencies = this.fieldService.getFormulaDependencies(formula);
      
      this.sendResponse(res, 200, 'Formula dependencies retrieved', { dependencies });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Get available functions for formulas
   */
  getFunctions = async (req: Request, res: Response): Promise<void> => {
    try {
      // Return list of available functions with their descriptions
      const functions = [
        {
          name: 'SUM',
          description: 'Returns the sum of numbers',
          syntax: 'SUM(number1, number2, ...)',
          category: 'Math'
        },
        {
          name: 'AVERAGE',
          description: 'Returns the average of numbers',
          syntax: 'AVERAGE(number1, number2, ...)',
          category: 'Math'
        },
        {
          name: 'MIN',
          description: 'Returns the minimum value',
          syntax: 'MIN(number1, number2, ...)',
          category: 'Math'
        },
        {
          name: 'MAX',
          description: 'Returns the maximum value',
          syntax: 'MAX(number1, number2, ...)',
          category: 'Math'
        },
        {
          name: 'ROUND',
          description: 'Rounds a number to specified decimal places',
          syntax: 'ROUND(number, digits)',
          category: 'Math'
        },
        {
          name: 'ABS',
          description: 'Returns the absolute value',
          syntax: 'ABS(number)',
          category: 'Math'
        },
        {
          name: 'SQRT',
          description: 'Returns the square root',
          syntax: 'SQRT(number)',
          category: 'Math'
        },
        {
          name: 'POWER',
          description: 'Returns number raised to power',
          syntax: 'POWER(number, power)',
          category: 'Math'
        },
        {
          name: 'CONCATENATE',
          description: 'Joins text strings',
          syntax: 'CONCATENATE(text1, text2, ...)',
          category: 'Text'
        },
        {
          name: 'LEFT',
          description: 'Returns leftmost characters',
          syntax: 'LEFT(text, count)',
          category: 'Text'
        },
        {
          name: 'RIGHT',
          description: 'Returns rightmost characters',
          syntax: 'RIGHT(text, count)',
          category: 'Text'
        },
        {
          name: 'MID',
          description: 'Returns characters from middle of text',
          syntax: 'MID(text, start, length)',
          category: 'Text'
        },
        {
          name: 'LEN',
          description: 'Returns length of text',
          syntax: 'LEN(text)',
          category: 'Text'
        },
        {
          name: 'UPPER',
          description: 'Converts text to uppercase',
          syntax: 'UPPER(text)',
          category: 'Text'
        },
        {
          name: 'LOWER',
          description: 'Converts text to lowercase',
          syntax: 'LOWER(text)',
          category: 'Text'
        },
        {
          name: 'TRIM',
          description: 'Removes leading and trailing spaces',
          syntax: 'TRIM(text)',
          category: 'Text'
        },
        {
          name: 'TODAY',
          description: 'Returns current date',
          syntax: 'TODAY()',
          category: 'Date'
        },
        {
          name: 'NOW',
          description: 'Returns current date and time',
          syntax: 'NOW()',
          category: 'Date'
        },
        {
          name: 'YEAR',
          description: 'Returns year from date',
          syntax: 'YEAR(date)',
          category: 'Date'
        },
        {
          name: 'MONTH',
          description: 'Returns month from date',
          syntax: 'MONTH(date)',
          category: 'Date'
        },
        {
          name: 'DAY',
          description: 'Returns day from date',
          syntax: 'DAY(date)',
          category: 'Date'
        },
        {
          name: 'IF',
          description: 'Returns value based on condition',
          syntax: 'IF(condition, trueValue, falseValue)',
          category: 'Logical'
        },
        {
          name: 'AND',
          description: 'Returns true if all conditions are true',
          syntax: 'AND(condition1, condition2, ...)',
          category: 'Logical'
        },
        {
          name: 'OR',
          description: 'Returns true if any condition is true',
          syntax: 'OR(condition1, condition2, ...)',
          category: 'Logical'
        },
        {
          name: 'NOT',
          description: 'Returns opposite boolean value',
          syntax: 'NOT(condition)',
          category: 'Logical'
        },
        {
          name: 'COUNT',
          description: 'Counts non-empty values',
          syntax: 'COUNT(value1, value2, ...)',
          category: 'Aggregate'
        }
      ];
      
      this.sendResponse(res, 200, 'Available functions retrieved', { functions });
    } catch (error) {
      this.handleError(res, error);
    }
  };
}