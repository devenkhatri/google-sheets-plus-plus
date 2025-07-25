import jwt from 'jsonwebtoken';
import { UserModel, User, CreateUserDTO } from '../models/User';
import { ApiKeyModel, ApiKey } from '../models/ApiKey';
import { AppError } from '../middleware/errorHandler';
import { redisClient } from '../config/redis';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface LoginResult {
  user: User;
  token: string;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly TOKEN_BLACKLIST_PREFIX = 'token_blacklist:';

  /**
   * Register a new user
   */
  static async register(userData: CreateUserDTO): Promise<User> {
    // Check if user already exists
    const existingUser = await UserModel.findByEmail(userData.email);
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }
    
    // Create user
    const user = await UserModel.create(userData);
    return user;
  }

  /**
   * Login with email and password
   */
  static async login(email: string, password: string): Promise<LoginResult> {
    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }
    
    // Verify password
    const isPasswordValid = await UserModel.verifyPassword(user, password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }
    
    // Update last login
    await UserModel.updateLastLogin(user.id);
    
    // Generate token
    const token = this.generateToken(user);
    
    return { user, token };
  }

  /**
   * Login or register with Google
   */
  static async googleAuth(googleId: string, email: string, name: string, avatarUrl?: string): Promise<LoginResult> {
    // Find user by Google ID or email
    let user = await UserModel.findByGoogleId(googleId);
    
    if (!user) {
      // Check if user exists with this email
      user = await UserModel.findByEmail(email);
      
      if (user) {
        // Update existing user with Google ID
        user = await UserModel.update(user.id, {
          google_id: googleId,
          avatar_url: avatarUrl || user.avatar_url,
          email_verified: true,
        });
      } else {
        // Create new user
        user = await UserModel.create({
          email,
          name,
          google_id: googleId,
          avatar_url: avatarUrl,
          email_verified: true,
        });
      }
    }
    
    // Update last login
    await UserModel.updateLastLogin(user.id);
    
    // Generate token
    const token = this.generateToken(user);
    
    return { user, token };
  }

  /**
   * Logout user
   */
  static async logout(token: string): Promise<void> {
    try {
      // Verify token to get payload
      const payload = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      
      // Get token expiration
      const decoded = jwt.decode(token) as { exp: number };
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      
      // Add token to blacklist
      if (expiresIn > 0) {
        await redisClient.set(
          `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
          'true',
          { EX: expiresIn }
        );
      }
    } catch (error) {
      // Token is invalid, no need to blacklist
    }
  }

  /**
   * Generate JWT token
   */
  static generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };
    
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<TokenPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await redisClient.get(`${this.TOKEN_BLACKLIST_PREFIX}${token}`);
      if (isBlacklisted) {
        throw new AppError('Token has been revoked', 401);
      }
      
      // Verify token
      const payload = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      return payload;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Invalid or expired token', 401);
    }
  }

  /**
   * Generate API key
   */
  static async generateApiKey(userId: string, name: string, description?: string): Promise<ApiKey> {
    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Create API key
    const apiKey = await ApiKeyModel.create({
      user_id: userId,
      name,
      description,
    });
    
    return apiKey;
  }

  /**
   * Verify API key
   */
  static async verifyApiKey(key: string): Promise<User> {
    // Find API key
    const apiKey = await ApiKeyModel.findByKey(key);
    if (!apiKey) {
      throw new AppError('Invalid API key', 401);
    }
    
    // Check if API key is active
    if (!apiKey.active) {
      throw new AppError('API key is inactive', 401);
    }
    
    // Check if API key is expired
    if (apiKey.expires_at && apiKey.expires_at < new Date()) {
      throw new AppError('API key has expired', 401);
    }
    
    // Find user
    const user = await UserModel.findById(apiKey.user_id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Update last used
    await ApiKeyModel.updateLastUsed(apiKey.id);
    
    return user;
  }
}