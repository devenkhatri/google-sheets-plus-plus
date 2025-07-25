import request from 'supertest';
import { app } from '../../index';
import { db } from '../../config/database';
import { AuthService } from '../../services/AuthService';
import { ApiKeyModel } from '../../models/ApiKey';

describe('API Integration Tests', () => {
  let authToken: string;
  let apiKey: string;
  let userId: string;
  let baseId: string;
  let tableId: string;
  
  beforeAll(async () => {
    // Create test user
    const [user] = await db('users').insert({
      email: 'api-test@example.com',
      password: await AuthService.hashPassword('password123'),
      name: 'API Test User',
    }).returning('*');
    
    userId = user.id;
    
    // Generate JWT token
    authToken = await AuthService.generateToken(user);
    
    // Create API key
    const [apiKeyRecord] = await db('api_keys').insert({
      user_id: userId,
      key: `ak_${Math.random().toString(36).substring(2, 15)}`,
      name: 'Test API Key',
      active: true,
    }).returning('*');
    
    apiKey = apiKeyRecord.key;
    
    // Create test base
    const [base] = await db('bases').insert({
      name: 'API Test Base',
      owner_id: userId,
      google_sheets_id: 'test-sheets-id',
    }).returning('*');
    
    baseId = base.id;
    
    // Create test table
    const [table] = await db('tables').insert({
      name: 'API Test Table',
      base_id: baseId,
      google_sheet_id: 'test-sheet-id',
    }).returning('*');
    
    tableId = table.id;
  });
  
  afterAll(async () => {
    // Clean up test data
    await db('tables').where({ id: tableId }).delete();
    await db('bases').where({ id: baseId }).delete();
    await db('api_keys').where({ user_id: userId }).delete();
    await db('users').where({ id: userId }).delete();
  });
  
  describe('Authentication', () => {
    it('should authenticate with JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('api-test@example.com');
    });
    
    it('should authenticate with API key', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('X-API-Key', apiKey)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('api-test@example.com');
    });
    
    it('should return 401 with invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.status).toBe('error');
    });
    
    it('should return 401 with invalid API key', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('X-API-Key', 'invalid-api-key')
        .expect(401);
      
      expect(response.body.status).toBe('error');
    });
  });
  
  describe('API Versioning', () => {
    it('should accept version in URL path', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
    });
    
    it('should accept version in header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-API-Version', 'v1')
        .expect(200);
      
      expect(response.body.status).toBe('success');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should include rate limit headers in response', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });
  
  describe('API Documentation', () => {
    it('should serve Swagger UI', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);
      
      expect(response.text).toContain('swagger-ui');
    });
    
    it('should serve OpenAPI JSON spec', async () => {
      const response = await request(app)
        .get('/api/docs/json')
        .expect(200);
      
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
    });
  });
  
  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Cannot find');
    });
    
    it('should return 400 for invalid request data', async () => {
      const response = await request(app)
        .post('/api/v1/bases')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing required fields
        .expect(400);
      
      expect(response.body.status).toBe('error');
    });
  });
});