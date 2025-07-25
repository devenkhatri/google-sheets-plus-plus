import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { AuditService } from '../services/AuditService';
import { SecurityService } from '../services/SecurityService';
import { sanitizeInput, sanitizeSqlInput } from './inputSanitizer';
import { ddosProtection, rateLimiter } from './rateLimiter';
import { logger } from '../utils/logger';

// Initialize services
const auditService = AuditService.getInstance();
const securityService = SecurityService.getInstance();

/**
 * Apply security headers using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https://storage.googleapis.com'],
      connectSrc: ["'self'", 'https://api.example.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // May need to adjust based on requirements
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

/**
 * Configure CORS options
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Apply CORS middleware
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Log all API requests
 */
export const requestLogger = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Skip logging for health check and static assets
  if (req.path === '/api/health' || req.path.startsWith('/static/')) {
    return next();
  }
  
  // Log request start
  const startTime = Date.now();
  
  // Add response listener to log after completion
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    // Log to console
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    
    // Log to audit trail for non-GET requests or error responses
    if (req.method !== 'GET' || res.statusCode >= 400) {
      try {
        await auditService.log({
          user_id: req.user?.id,
          action: 'API_REQUEST',
          entity_type: 'API',
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            query: securityService.maskSensitiveData(req.query, ['token', 'key', 'password']),
          },
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
      } catch (error) {
        logger.error('Failed to log API request:', error);
      }
    }
  });
  
  next();
};

/**
 * Detect and block suspicious requests
 */
export const suspiciousRequestDetection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check for common attack patterns
  const url = req.originalUrl.toLowerCase();
  const body = JSON.stringify(req.body || {}).toLowerCase();
  
  // List of suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g, // Directory traversal
    /\/etc\/passwd/g, // Common Linux file access attempt
    /\/windows\/system32/g, // Windows system directory access attempt
    /<script>/g, // Basic XSS attempt
    /alert\s*\(/g, // JavaScript alert function
    /document\.cookie/g, // Cookie access attempt
    /eval\s*\(/g, // JavaScript eval function
    /execcommand/g, // JavaScript execCommand
    /onload=/g, // JavaScript event handler
    /onerror=/g, // JavaScript event handler
    /select.+from.+where/gi, // SQL query
    /union\s+select/gi, // SQL UNION attack
    /drop\s+table/gi, // SQL DROP TABLE
    /alter\s+table/gi, // SQL ALTER TABLE
    /delete\s+from/gi, // SQL DELETE FROM
    /insert\s+into/gi, // SQL INSERT INTO
    /exec\s*\(/gi, // SQL stored procedure execution
    /xp_cmdshell/gi, // SQL Server command execution
  ];
  
  // Check URL and body for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(body)) {
      // Log suspicious request
      await auditService.logSecurityEvent(req, 'SUSPICIOUS_REQUEST', {
        pattern: pattern.toString(),
        url: req.originalUrl,
        method: req.method,
      });
      
      // Return forbidden response
      res.status(403).json({
        status: 'error',
        message: 'Request blocked due to security concerns',
      });
      return;
    }
  }
  
  next();
};

/**
 * Apply all security middleware
 */
export const applySecurityMiddleware = (app: any): void => {
  // Apply security headers
  app.use(securityHeaders);
  
  // Apply CORS
  app.use(corsMiddleware);
  
  // Apply DDoS protection
  app.use(ddosProtection);
  
  // Apply rate limiting
  app.use(rateLimiter);
  
  // Log all requests
  app.use(requestLogger);
  
  // Apply input sanitization
  app.use(sanitizeInput);
  app.use(sanitizeSqlInput);
  
  // Detect suspicious requests
  app.use(suspiciousRequestDetection);
};