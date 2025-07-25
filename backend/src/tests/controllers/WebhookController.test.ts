import request from 'supertest';
import { app } from '../../index';
import { WebhookModel } from '../../models/Webhook';
import { db } from '../../config/database';
import jwt from 'jsonwebtoken';

describe('WebhookController', () => {
  let authToken: string;
  let baseId: string;
  let tableId: string;
  let webhookId: string;
  
  beforeAll(async () => {
    // Create a test user
    const [user] = await db('users').insert({
      email: 'webhook-test@example.com',
      password: 'hashed-password',
      name: 'Webhook Test User',
    }).returning('*');
    
    // Generate auth token
    authToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    // Create a test base
    const [base] = await db('bases').insert({
      name: 'Webhook Test Base',
      owner_id: user.id,
      google_sheets_id: 'test-sheets-id',
    }).returning('*');
    
    baseId = base.id;
    
    // Create a test table
    const [table] = await db('tables').insert({
      name: 'Webhook Test Table',
      base_id: baseId,
      google_sheet_id: 'test-sheet-id',
    }).returning('*');
    
    tableId = table.id;
  });
  
  afterAll(async () => {
    // Clean up test data
    await db('webhooks').delete();
    await db('tables').where({ id: tableId }).delete();
    await db('bases').where({ id: baseId }).delete();
    await db('users').where({ email: 'webhook-test@example.com' }).delete();
  });
  
  describe('POST /api/v1/webhooks', () => {
    it('should create a new webhook', async () => {
      const webhookData = {
        base_id: baseId,
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['record.created', 'record.updated'],
      };
      
      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData)
        .expect(201);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.webhook).toBeDefined();
      expect(response.body.data.webhook.name).toBe(webhookData.name);
      expect(response.body.data.webhook.url).toBe(webhookData.url);
      expect(response.body.data.webhook.events).toEqual(expect.arrayContaining(webhookData.events));
      expect(response.body.data.webhook.secret).toBeDefined();
      
      webhookId = response.body.data.webhook.id;
    });
    
    it('should return 400 for invalid webhook URL', async () => {
      const webhookData = {
        base_id: baseId,
        name: 'Invalid URL Webhook',
        url: 'not-a-valid-url',
        events: ['record.created'],
      };
      
      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData)
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid webhook URL');
    });
    
    it('should return 400 for empty events array', async () => {
      const webhookData = {
        base_id: baseId,
        name: 'Empty Events Webhook',
        url: 'https://example.com/webhook',
        events: [],
      };
      
      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData)
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Events must be a non-empty array');
    });
  });
  
  describe('GET /api/v1/webhooks/:id', () => {
    it('should get a webhook by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.webhook).toBeDefined();
      expect(response.body.data.webhook.id).toBe(webhookId);
    });
    
    it('should return 404 for non-existent webhook', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/v1/webhooks/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Webhook not found');
    });
  });
  
  describe('GET /api/v1/webhooks/base/:baseId', () => {
    it('should get webhooks by base ID', async () => {
      const response = await request(app)
        .get(`/api/v1/webhooks/base/${baseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.webhooks).toBeDefined();
      expect(Array.isArray(response.body.data.webhooks)).toBe(true);
      expect(response.body.data.webhooks.length).toBeGreaterThan(0);
      expect(response.body.data.webhooks[0].base_id).toBe(baseId);
    });
  });
  
  describe('PATCH /api/v1/webhooks/:id', () => {
    it('should update a webhook', async () => {
      const updateData = {
        name: 'Updated Webhook Name',
        events: ['record.created', 'record.deleted'],
      };
      
      const response = await request(app)
        .patch(`/api/v1/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.webhook).toBeDefined();
      expect(response.body.data.webhook.name).toBe(updateData.name);
      expect(response.body.data.webhook.events).toEqual(expect.arrayContaining(updateData.events));
    });
    
    it('should return 400 for invalid URL in update', async () => {
      const updateData = {
        url: 'not-a-valid-url',
      };
      
      const response = await request(app)
        .patch(`/api/v1/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid webhook URL');
    });
  });
  
  describe('PATCH /api/v1/webhooks/:id/active', () => {
    it('should toggle webhook active status', async () => {
      const response = await request(app)
        .patch(`/api/v1/webhooks/${webhookId}/active`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ active: false })
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.webhook).toBeDefined();
      expect(response.body.data.webhook.active).toBe(false);
      
      // Toggle back to active
      const responseToggleBack = await request(app)
        .patch(`/api/v1/webhooks/${webhookId}/active`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ active: true })
        .expect(200);
      
      expect(responseToggleBack.body.data.webhook.active).toBe(true);
    });
    
    it('should return 400 for non-boolean active value', async () => {
      const response = await request(app)
        .patch(`/api/v1/webhooks/${webhookId}/active`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ active: 'not-a-boolean' })
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Active status must be a boolean');
    });
  });
  
  describe('GET /api/v1/webhooks/:id/deliveries', () => {
    it('should get webhook deliveries', async () => {
      // Create a test delivery
      await WebhookModel.recordDelivery(
        webhookId,
        'record.created',
        { id: 'test-record-id', name: 'Test Record' },
        200,
        '{"status":"success"}',
        true
      );
      
      const response = await request(app)
        .get(`/api/v1/webhooks/${webhookId}/deliveries`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.deliveries).toBeDefined();
      expect(Array.isArray(response.body.data.deliveries)).toBe(true);
      expect(response.body.data.deliveries.length).toBeGreaterThan(0);
      expect(response.body.data.deliveries[0].webhook_id).toBe(webhookId);
      expect(response.body.data.deliveries[0].event).toBe('record.created');
    });
  });
  
  describe('DELETE /api/v1/webhooks/:id', () => {
    it('should delete a webhook', async () => {
      const response = await request(app)
        .delete(`/api/v1/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeNull();
      
      // Verify webhook is deleted
      const getResponse = await request(app)
        .get(`/api/v1/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(getResponse.body.status).toBe('error');
    });
  });
});