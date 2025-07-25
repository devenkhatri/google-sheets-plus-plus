/**
 * Utility functions for working with Google Sheets formulas
 */

/**
 * Convert a formula from our internal format to Google Sheets format
 */
export function convertToGoogleSheetsFormula(formula: string): string {
  // Replace field references with column references
  // Example: [Field Name] -> INDIRECT("RC[-2]", FALSE)
  const fieldRefPattern = /\[([^\]]+)\]/g;
  let googleSheetsFormula = formula.replace(fieldRefPattern, (match, fieldName) => {
    // In a real implementation, you would look up the column index for the field
    // For now, we'll just use a placeholder
    return `INDIRECT("RC[-2]", FALSE)`;
  });
  
  // Replace function names if needed
  // Example: SUM -> SUM
  const functionMappings: Record<string, string> = {
    // Add any function name mappings here
  };
  
  Object.entries(functionMappings).forEach(([ourFunction, googleSheetsFunction]) => {
    const functionPattern = new RegExp(`\\b${ourFunction}\\(`, 'g');
    googleSheetsFormula = googleSheetsFormula.replace(functionPattern, `${googleSheetsFunction}(`);
  });
  
  return googleSheetsFormula;
}

/**
 * Convert a formula from Google Sheets format to our internal format
 */
export function convertFromGoogleSheetsFormula(formula: string, fieldMap: Record<number, string>): string {
  // Replace column references with field references
  // Example: INDIRECT("RC[-2]", FALSE) -> [Field Name]
  const columnRefPattern = /INDIRECT\("RC\[(-?\d+)\]", FALSE\)/g;
  let internalFormula = formula.replace(columnRefPattern, (match, columnOffset) => {
    const columnIndex = -parseInt(columnOffset, 10);
    const fieldName = fieldMap[columnIndex] || `Column ${columnIndex}`;
    return `[${fieldName}]`;
  });
  
  // Replace function names if needed
  const functionMappings: Record<string, string> = {
    // Add any function name mappings here
  };
  
  Object.entries(functionMappings).forEach(([googleSheetsFunction, ourFunction]) => {
    const functionPattern = new RegExp(`\\b${googleSheetsFunction}\\(`, 'g');
    internalFormula = internalFormula.replace(functionPattern, `${ourFunction}(`);
  });
  
  return internalFormula;
}

/**
 * Create a Google Sheets formula for a lookup
 */
export function createLookupFormula(
  lookupTableName: string,
  lookupColumnName: string,
  lookupValue: string,
  returnColumnName: string
): string {
  return `=VLOOKUP(${lookupValue}, ${lookupTableName}!A:Z, MATCH("${returnColumnName}", ${lookupTableName}!1:1, 0), FALSE)`;
}

/**
 * Create a Google Sheets formula for a rollup
 */
export function createRollupFormula(
  lookupTableName: string,
  lookupColumnName: string,
  lookupValue: string,
  aggregateColumnName: string,
  aggregateFunction: 'SUM' | 'AVERAGE' | 'COUNT' | 'MIN' | 'MAX'
): string {
  return `=${aggregateFunction}(FILTER(${lookupTableName}!A:Z, ${lookupTableName}!A:A="${lookupValue}"))`;
}

/**
 * Validate a Google Sheets formula
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  // Check for balanced parentheses
  const stack: string[] = [];
  for (let i = 0; i < formula.length; i++) {
    if (formula[i] === '(') {
      stack.push('(');
    } else if (formula[i] === ')') {
      if (stack.length === 0) {
        return { valid: false, error: 'Unbalanced parentheses' };
      }
      stack.pop();
    }
  }
  
  if (stack.length > 0) {
    return { valid: false, error: 'Unbalanced parentheses' };
  }
  
  // Check for balanced quotes
  let inQuote = false;
  for (let i = 0; i < formula.length; i++) {
    if (formula[i] === '"') {
      inQuote = !inQuote;
    }
  }
  
  if (inQuote) {
    return { valid: false, error: 'Unbalanced quotes' };
  }
  
  // Check for valid function names
  const validFunctions = [
    'SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'IF', 'AND', 'OR', 'NOT',
    'VLOOKUP', 'HLOOKUP', 'MATCH', 'INDEX', 'FILTER', 'UNIQUE', 'SORT',
    'CONCATENATE', 'CONCAT', 'LEFT', 'RIGHT', 'MID', 'LEN', 'FIND', 'SEARCH',
    'UPPER', 'LOWER', 'PROPER', 'TRIM', 'SUBSTITUTE', 'REPLACE',
    'TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
    'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'INT', 'ABS', 'SQRT', 'POWER', 'MOD',
  ];
  
  const functionPattern = /([A-Z][A-Z0-9]*)\(/g;
  let match;
  while ((match = functionPattern.exec(formula)) !== null) {
    const functionName = match[1];
    if (!validFunctions.includes(functionName)) {
      return { valid: false, error: `Unknown function: ${functionName}` };
    }
  }
  
  return { valid: true };
}

/**
 * Extract dependencies from a formula
 */
export function extractDependencies(formula: string): string[] {
  const dependencies: string[] = [];
  
  // Extract field references
  const fieldRefPattern = /\[([^\]]+)\]/g;
  let match;
  while ((match = fieldRefPattern.exec(formula)) !== null) {
    dependencies.push(match[1]);
  }
  
  return [...new Set(dependencies)]; // Remove duplicates
}