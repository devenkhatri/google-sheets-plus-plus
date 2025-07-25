import { Request, Response, NextFunction } from 'express';
import { verifyGoogleIdToken } from '../config/googleOAuth';
import { AuthService } from '../services/AuthService';
import { AppError } from '../middleware/errorHandler';

export class GoogleAuthController {
  /**
   * Handle Google OAuth callback
   */
  static async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      
      // Validate input
      if (!token) {
        throw new AppError('Google ID token is required', 400);
      }
      
      // Verify Google ID token
      const { googleId, email, name, picture } = await verifyGoogleIdToken(token);
      
      // Login or register user with Google
      const { user, token: authToken } = await AuthService.googleAuth(googleId, email, name, picture);
      
      // Remove password_hash from response
      const { password_hash, ...userWithoutPassword } = user;
      
      res.status(200).json({
        status: 'success',
        data: {
          user: userWithoutPassword,
          token: authToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}