import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { UserModel } from '../models/User';
import { AppError } from './errorHandler';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const payload = await AuthService.verifyToken(token);
    
    // Get user
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Attach user and token to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authenticate API key
 */
export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw new AppError('No API key provided', 401);
    }
    
    // Verify API key
    const user = await AuthService.verifyApiKey(apiKey);
    
    // Attach user to request
    req.user = user;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authenticate with either JWT or API key
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for API key first
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const user = await AuthService.verifyApiKey(apiKey);
      req.user = {
        ...user,
        isApiKey: true
      };
      return next();
    }
    
    // Fall back to JWT authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const payload = await AuthService.verifyToken(token);
    
    // Get user
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Attach user and token to request
    req.user = {
      ...user,
      isApiKey: false
    };
    req.token = token;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware for API authentication with proper error responses
 * This is the main authentication middleware to use for API routes
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await authenticate(req, res, next);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Authentication failed'
      });
    }
  }
};