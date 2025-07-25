import { Request, Response, NextFunction } from 'express';
import { ApiVersioningService } from '../services/ApiVersioningService';

/**
 * Middleware for handling API versioning
 */
export const apiVersionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const apiVersioningService = ApiVersioningService.getInstance();
  apiVersioningService.versionMiddleware(req, res, next);
};

/**
 * Middleware for transforming responses for backward compatibility
 * @param resource Resource type for transformation
 */
export const transformResponseMiddleware = (resource: string) => {
  const apiVersioningService = ApiVersioningService.getInstance();
  return apiVersioningService.transformResponseMiddleware(resource);
};