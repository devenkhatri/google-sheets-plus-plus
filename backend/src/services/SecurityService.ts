import crypto from 'crypto';
import { logger } from '../utils/logger';
import { AuditLogModel } from '../models/AuditLog';
import { Request } from 'express';

/**
 * Service for handling security-related operations
 */
export class SecurityService {
  private static instance: SecurityService;
  private encryptionKey: Buffer;
  private encryptionIV: Buffer;
  
  private constructor() {
    // Get encryption key from environment or use a fixed key for testing
    const key = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const iv = process.env.ENCRYPTION_IV || '0123456789abcdef';
    
    this.encryptionKey = Buffer.from(key, 'hex');
    this.encryptionIV = Buffer.from(iv, 'hex');
    
    // Log warning if using default keys in production
    if ((!process.env.ENCRYPTION_KEY || !process.env.ENCRYPTION_IV) && process.env.NODE_ENV === 'production') {
      logger.warn('Using default encryption keys in production. This is insecure and should be changed.');
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }
  
  /**
   * Encrypt sensitive data
   * @param data Data to encrypt
   * @returns Encrypted data as hex string
   */
  public encrypt(data: string): string {
    try {
      const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, this.encryptionIV);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt sensitive data
   * @param encryptedData Encrypted data as hex string
   * @returns Decrypted data
   */
  public decrypt(encryptedData: string): string {
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, this.encryptionIV);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Hash data using SHA-256
   * @param data Data to hash
   * @returns Hashed data
   */
  public hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Generate a secure random token
   * @param length Token length in bytes (default: 32)
   * @returns Random token as hex string
   */
  public generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Log security event
   * @param req Express request object
   * @param action Security action
   * @param entityType Entity type
   * @param entityId Entity ID
   * @param metadata Additional metadata
   */
  public async logSecurityEvent(
    req: Request,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await AuditLogModel.create({
        user_id: req.user?.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }
  
  /**
   * Mask sensitive data for logging
   * @param data Object containing sensitive data
   * @param sensitiveFields Array of sensitive field names
   * @returns Object with sensitive fields masked
   */
  public maskSensitiveData(data: any, sensitiveFields: string[]): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const masked = { ...data };
    
    for (const field of sensitiveFields) {
      if (masked[field]) {
        if (typeof masked[field] === 'string') {
          // Mask all but first and last characters
          const value = masked[field] as string;
          if (value.length <= 4) {
            masked[field] = '****';
          } else {
            masked[field] = value.charAt(0) + '****' + value.charAt(value.length - 1);
          }
        } else if (typeof masked[field] === 'object' && masked[field] !== null) {
          // Recursively mask nested objects
          masked[field] = this.maskSensitiveData(masked[field], sensitiveFields);
        } else {
          masked[field] = '****';
        }
      }
      
      // Handle nested objects
      if (typeof masked[field] === 'object' && masked[field] !== null) {
        for (const nestedField in masked[field]) {
          if (sensitiveFields.includes(nestedField)) {
            const value = masked[field][nestedField];
            if (typeof value === 'string') {
              if (value.length <= 4) {
                masked[field][nestedField] = '****';
              } else {
                masked[field][nestedField] = value.charAt(0) + '****' + value.charAt(value.length - 1);
              }
            } else if (value !== null && typeof value === 'object') {
              masked[field][nestedField] = this.maskSensitiveData(value, sensitiveFields);
            } else {
              masked[field][nestedField] = '****';
            }
          }
        }
      }
    }
    
    return masked;
  }
  
  /**
   * Check if a password meets security requirements
   * @param password Password to check
   * @returns Object with validation result and message
   */
  public validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }
    
    return { valid: true };
  }
  
  /**
   * Generate a secure password hash using bcrypt
   * @param password Password to hash
   * @returns Hashed password
   */
  public async hashPassword(password: string): Promise<string> {
    // In a real implementation, use bcrypt or argon2
    // For simplicity, we're using a basic hash + salt method here
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }
  
  /**
   * Verify a password against a hash
   * @param password Password to verify
   * @param storedHash Stored password hash
   * @returns Whether the password is valid
   */
  public async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    // In a real implementation, use bcrypt or argon2
    // For simplicity, we're using a basic hash + salt method here
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }
}