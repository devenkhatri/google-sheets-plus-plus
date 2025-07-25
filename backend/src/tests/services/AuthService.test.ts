import { AuthService } from '../../services/AuthService';
import { UserModel } from '../../models/User';
import { ApiKeyModel } from '../../models/ApiKey';
import { AppError } from '../../middleware/errorHandler';

describe('AuthService', () => {
  describe('register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123',
      };
      
      const user = await AuthService.register(userData);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.password_hash).toBeDefined();
    });
    
    it('should throw an error if email is already in use', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'Test User',
        password: 'Password123',
      };
      
      // Register first user
      await AuthService.register(userData);
      
      // Try to register with same email
      await expect(AuthService.register(userData)).rejects.toThrow(AppError);
    });
  });
  
  describe('login', () => {
    it('should login a user with valid credentials', async () => {
      const userData = {
        email: 'login@example.com',
        name: 'Login User',
        password: 'Password123',
      };
      
      // Register user
      await AuthService.register(userData);
      
      // Login
      const { user, token } = await AuthService.login(userData.email, userData.password);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(token).toBeDefined();
    });
    
    it('should throw an error with invalid email', async () => {
      await expect(AuthService.login('invalid@example.com', 'Password123')).rejects.toThrow(AppError);
    });
    
    it('should throw an error with invalid password', async () => {
      const userData = {
        email: 'password@example.com',
        name: 'Password User',
        password: 'Password123',
      };
      
      // Register user
      await AuthService.register(userData);
      
      // Try to login with wrong password
      await expect(AuthService.login(userData.email, 'WrongPassword123')).rejects.toThrow(AppError);
    });
  });
  
  describe('generateApiKey', () => {
    it('should generate an API key for a user', async () => {
      const userData = {
        email: 'apikey@example.com',
        name: 'API Key User',
        password: 'Password123',
      };
      
      // Register user
      const user = await AuthService.register(userData);
      
      // Generate API key
      const apiKey = await AuthService.generateApiKey(user.id, 'Test API Key', 'For testing');
      
      expect(apiKey).toBeDefined();
      expect(apiKey.user_id).toBe(user.id);
      expect(apiKey.name).toBe('Test API Key');
      expect(apiKey.description).toBe('For testing');
      expect(apiKey.key).toBeDefined();
      expect(apiKey.active).toBe(true);
    });
    
    it('should throw an error if user does not exist', async () => {
      await expect(AuthService.generateApiKey('non-existent-id', 'Test API Key')).rejects.toThrow(AppError);
    });
  });
  
  describe('verifyApiKey', () => {
    it('should verify a valid API key', async () => {
      const userData = {
        email: 'verifykey@example.com',
        name: 'Verify Key User',
        password: 'Password123',
      };
      
      // Register user
      const user = await AuthService.register(userData);
      
      // Generate API key
      const apiKey = await AuthService.generateApiKey(user.id, 'Verify API Key');
      
      // Verify API key
      const verifiedUser = await AuthService.verifyApiKey(apiKey.key);
      
      expect(verifiedUser).toBeDefined();
      expect(verifiedUser.id).toBe(user.id);
    });
    
    it('should throw an error for invalid API key', async () => {
      await expect(AuthService.verifyApiKey('invalid-api-key')).rejects.toThrow(AppError);
    });
    
    it('should throw an error for inactive API key', async () => {
      const userData = {
        email: 'inactivekey@example.com',
        name: 'Inactive Key User',
        password: 'Password123',
      };
      
      // Register user
      const user = await AuthService.register(userData);
      
      // Generate API key
      const apiKey = await AuthService.generateApiKey(user.id, 'Inactive API Key');
      
      // Deactivate API key
      await ApiKeyModel.deactivate(apiKey.id);
      
      // Try to verify inactive API key
      await expect(AuthService.verifyApiKey(apiKey.key)).rejects.toThrow(AppError);
    });
  });
});