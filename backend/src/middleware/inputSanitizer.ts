import { Request, Response, NextFunction } from 'express';

// Simple sanitization function for testing
const sanitizeHtmlContent = (html: string): string => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, 'removed:');
};

/**
 * Middleware to sanitize request body, query parameters, and URL parameters
 * to prevent XSS attacks and other injection vulnerabilities
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Sanitize string values
      sanitized[key] = sanitizeHtmlContent(value);
    } else if (value === null) {
      // Keep null values
      sanitized[key] = null;
    } else if (typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value);
    } else {
      // Keep other primitive values as is
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Middleware to sanitize HTML content for specific fields
 * that are allowed to contain HTML (like rich text fields)
 */
export const sanitizeHtml = (fields: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.body) {
      return next();
    }

    for (const field of fields) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        // Allow certain HTML tags but remove potentially dangerous ones
        req.body[field] = sanitizeHtmlContent(req.body[field]);
      }
    }

    next();
  };
};

/**
 * Middleware to sanitize SQL queries in request parameters
 * to prevent SQL injection attacks
 */
export const sanitizeSqlInput = (req: Request, _res: Response, next: NextFunction): void => {
  const sqlRegex = /\b(select|insert|update|delete|drop|alter|create|truncate|declare|exec|union|where|or|and)\b|(['";])/gi;
  
  // Function to sanitize potential SQL injection
  const sanitizeSql = (value: string): string => {
    if (typeof value !== 'string') return value;
    
    // Replace SQL keywords and special characters
    return value.replace(sqlRegex, '');
  };

  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeSql(req.query[key] as string);
      }
    }
  }

  // Sanitize URL parameters
  if (req.params) {
    for (const key in req.params) {
      req.params[key] = sanitizeSql(req.params[key]);
    }
  }

  next();
};