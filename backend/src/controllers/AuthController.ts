import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { UserModel } from '../models/User';
import { ApiKeyModel } from '../models/ApiKey';
import { AppError } from '../middleware/errorHandler';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, name, password } = req.body;
      
      // Validate input
      if (!email || !name || !password) {
        throw new AppError('Email, name, and password are required', 400);
      }
      
      // Register user
      const user = await AuthService.register({
        email,
        name,
        password,
      });
      
      // Remove password_hash from response
      const { password_hash, ...userWithoutPassword } = user;
      
      res.status(201).json({
        status: 'success',
        data: userWithoutPassword,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login with email and password
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }
      
      // Login user
      const { user, token } = await AuthService.login(email, password);
      
      // Remove password_hash from response
      const { password_hash, ...userWithoutPassword } = user;
      
      res.status(200).json({
        status: 'success',
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.token;
      
      if (token) {
        await AuthService.logout(token);
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      
      // Remove password_hash from response
      const { password_hash, ...userWithoutPassword } = user;
      
      res.status(200).json({
        status: 'success',
        data: userWithoutPassword,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { name, avatar_url } = req.body;
      
      // Update user
      const updatedUser = await UserModel.update(userId, {
        name,
        avatar_url,
      });
      
      if (!updatedUser) {
        throw new AppError('User not found', 404);
      }
      
      // Remove password_hash from response
      const { password_hash, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json({
        status: 'success',
        data: userWithoutPassword,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password are required', 400);
      }
      
      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Verify current password
      const isPasswordValid = await UserModel.verifyPassword(user, currentPassword);
      if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 401);
      }
      
      // Update password
      await UserModel.update(userId, {
        password: newPassword,
      });
      
      res.status(200).json({
        status: 'success',
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate API key
   */
  static async generateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { name, description } = req.body;
      
      // Validate input
      if (!name) {
        throw new AppError('API key name is required', 400);
      }
      
      // Generate API key
      const apiKey = await AuthService.generateApiKey(userId, name, description);
      
      res.status(201).json({
        status: 'success',
        data: apiKey,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API keys
   */
  static async getApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      
      // Get API keys
      const apiKeys = await ApiKeyModel.findByUserId(userId);
      
      res.status(200).json({
        status: 'success',
        data: apiKeys,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke API key
   */
  static async revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { keyId } = req.params;
      
      // Get API key
      const apiKey = await ApiKeyModel.findById(keyId);
      if (!apiKey) {
        throw new AppError('API key not found', 404);
      }
      
      // Check if API key belongs to user
      if (apiKey.user_id !== userId) {
        throw new AppError('Unauthorized', 403);
      }
      
      // Deactivate API key
      await ApiKeyModel.deactivate(keyId);
      
      res.status(200).json({
        status: 'success',
        message: 'API key revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete API key
   */
  static async deleteApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { keyId } = req.params;
      
      // Get API key
      const apiKey = await ApiKeyModel.findById(keyId);
      if (!apiKey) {
        throw new AppError('API key not found', 404);
      }
      
      // Check if API key belongs to user
      if (apiKey.user_id !== userId) {
        throw new AppError('Unauthorized', 403);
      }
      
      // Delete API key
      await ApiKeyModel.delete(keyId);
      
      res.status(200).json({
        status: 'success',
        message: 'API key deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}