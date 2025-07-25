import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Service for handling API versioning and backward compatibility
 */
export class ApiVersioningService {
  private static instance: ApiVersioningService;
  
  // Map of deprecated features and their removal versions
  private readonly deprecatedFeatures: Map<string, string> = new Map([
    // Example: ['old-endpoint', 'v2.0.0']
  ]);
  
  // Map of feature transformations for backward compatibility
  private readonly transformations: Map<string, (data: any) => any> = new Map();
  
  private constructor() {
    // Initialize transformations
    this.initializeTransformations();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ApiVersioningService {
    if (!ApiVersioningService.instance) {
      ApiVersioningService.instance = new ApiVersioningService();
    }
    return ApiVersioningService.instance;
  }
  
  /**
   * Initialize transformations for backward compatibility
   */
  private initializeTransformations(): void {
    // Example transformation for backward compatibility
    // this.transformations.set('user', (data) => {
    //   // If the response is for an older API version that expects 'username' instead of 'name'
    //   if (data.name && !data.username) {
    //     return { ...data, username: data.name };
    //   }
    //   return data;
    // });
  }
  
  /**
   * Middleware to handle API versioning
   */
  public versionMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Extract API version from URL or header
    const urlVersion = this.extractVersionFromUrl(req.path);
    const headerVersion = req.headers['x-api-version'] as string;
    
    // Use URL version first, then header version, then default to latest
    const apiVersion = urlVersion || headerVersion || 'v1';
    
    // Store API version in request for later use
    (req as any).apiVersion = apiVersion;
    
    // Check for deprecated features
    this.checkDeprecation(req, res);
    
    // Continue to the next middleware
    next();
  }
  
  /**
   * Extract version from URL path
   */
  private extractVersionFromUrl(path: string): string | null {
    const match = path.match(/^\/api\/(v[0-9]+(?:\.[0-9]+)*)/);
    return match ? match[1] : null;
  }
  
  /**
   * Check if requested feature is deprecated
   */
  private checkDeprecation(req: Request, res: Response): void {
    const path = req.path.replace(/^\/api\/v[0-9]+(?:\.[0-9]+)*/, '');
    
    // Check if this path is deprecated
    for (const [feature, removalVersion] of this.deprecatedFeatures.entries()) {
      if (path.includes(feature)) {
        // Add deprecation header
        res.setHeader('Deprecation', 'true');
        res.setHeader('Sunset', removalVersion);
        res.setHeader('Link', '<https://api.example.com/docs/api-upgrades>; rel="deprecation"');
        
        logger.warn(`Deprecated API feature accessed: ${feature}, will be removed in ${removalVersion}`);
        break;
      }
    }
  }
  
  /**
   * Transform response data for backward compatibility
   */
  public transformResponse(resource: string, data: any, apiVersion: string): any {
    const transform = this.transformations.get(resource);
    
    if (transform) {
      return transform(data);
    }
    
    return data;
  }
  
  /**
   * Middleware to transform response for backward compatibility
   */
  public transformResponseMiddleware(resource: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Store original json method
      const originalJson = res.json;
      
      // Override json method
      res.json = (body: any) => {
        const apiVersion = (req as any).apiVersion || 'v1';
        const transformedBody = this.transformResponse(resource, body, apiVersion);
        
        // Call original json method with transformed body
        return originalJson.call(res, transformedBody);
      };
      
      next();
    };
  }
}