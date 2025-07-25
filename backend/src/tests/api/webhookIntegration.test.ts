import request from 'supertest';
import { app } from '../../index';
import { db } from '../../config/database';
import { AuthService } from '../../services/AuthService';
import { WebhookService } from '../../services/WebhookService';
import { WebhookModel } from '../../models/Webhook';
import nock from 'nock';

describe('Webhook Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let baseId: string;
  let tableId: string;
  let webhookId: string;
  
  beforeAll(async () => {
    // Create test user
    const [user] = await db('users').insert({
      email: 'webhook-integration-test@example.com',
      password: await AuthService.hashPassword('password123'),
      name: 'Webhook Integration Test User',
    }).returning('*');
    
    userId = user.id;
    
    // Generate JWT token
    authToken = await AuthService.generateToken(user);
    
    // Create test base
    const [base] = await db('bases').insert({
      name: 'Webhook Integration Test Base',
      owner_id: userId,
      google_sheets_id: 'test-sheets-id',
    }).returning('*');
    
    baseId = base.id;
    
    // Create test table
    const [table] = await db('tables').insert({
      name: 'Webhook Integration Test Table',
      base_id: baseId,
      google_sheet_id: 'test-sheet-id',
    }).returning('*');
    
    tableId = table.id;
  });
  
  afterAll(async () => {
    // Clean up test data
    await db('webhook_deliveries').where({ webhook_id: webhookId }).delete();
    await db('webhooks').where({ id: webhookId }).delete();
    await db('tables').where({ id: tableId }).delete();
    await db('bases').where({ id: baseId }).delete();
    await db('users').where({ id: userId }).delete();
  });
  
  describe('Webhook CRUD Operations', () => {
    it('should create a webhook', async () => {
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
    
    it('should get a webhook by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.webhook).toBeDefined();
      expect(response.body.data.webhook.id).toBe(webhookId);
    });
    
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
  });
  
  describe('Webhook Delivery', () => {
    it('should deliver webhook events', async () => {
      // Mock webhook endpoint
      const webhookEndpoint = nock('https://example.com')
        .post('/webhook')
        .reply(200, { status: 'success' });
      
      // Create a test record to trigger webhook
      const recordData = {
        name: 'Test Record',
        description: 'This is a test record',
      };
      
      // Trigger webhook event
      await WebhookService.getInstance().triggerEvent(
        baseId,
        tableId,
        'record.created',
        {
          record_id: 'test-record-id',
          timestamp: new Date().toISOString(),
          data: recordData,
        }
      );
      
      // Process webhook queue
      await WebhookService.getInstance().processQueue();
      
      // Verify webhook was called
      expect(webhookEndpoint.isDone()).toBe(true);
      
      // Get webhook deliveries
      const response = await request(app)
        .get(`/api/v1/webhooks/${webhookId}/deliveries`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.deliveries).toBeDefined();
      expect(response.body.data.deliveries.length).toBeGreaterThan(0);
      expect(response.body.data.deliveries[0].webhook_id).toBe(webhookId);
      expect(response.body.data.deliveries[0].event).toBe('record.created');
      expect(response.body.data.deliveries[0].success).toBe(true);
    });
    
    it('should handle webhook delivery failures', async () => {
      // Mock webhook endpoint with failure
      const webhookEndpoint = nock('https://example.com')
        .post('/webhook')
        .reply(500, { status: 'error', message: 'Internal server error' });
      
      // Trigger webhook event
      await WebhookService.getInstance().triggerEvent(
        baseId,
        tableId,
        'record.updated',
        {
          record_id: 'test-record-id',
          timestamp: new Date().toISOString(),
          data: { status: 'updated' },
        }
      );
      
      // Process webhook queue
      await WebhookService.getInstance().processQueue();
      
      // Verify webhook was called
      expect(webhookEndpoint.isDone()).toBe(true);
      
      // Get webhook deliveries
      const response = await request(app)
        .get(`/api/v1/webhooks/${webhookId}/deliveries`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Find the failed delivery
      const failedDelivery = response.body.data.deliveries.find(
        (delivery: any) => delivery.event === 'record.updated'
      );
      
      expect(failedDelivery).toBeDefined();
      expect(failedDelivery.success).toBe(false);
      expect(failedDelivery.status_code).toBe(500);
    });
    
    it('should verify webhook signatures', async () => {
      // Get webhook to access secret
      const webhook = await WebhookModel.findById(webhookId);
      expect(webhook).toBeDefined();
      expect(webhook!.secret).toBeDefined();
      
      // Create payload
      const payload = {
        event: 'record.deleted',
        base_id: baseId,
        table_id: tableId,
        record_id: 'test-record-id',
        timestamp: new Date().toISOString(),
      };
      
      // Generate signature
      const signature = WebhookModel.generateSignature(payload, webhook!.secret!);
      
      // Verify signature
      const isValid = WebhookModel.verifySignature(payload, signature, webhook!.secret!);
      expect(isValid).toBe(true);
      
      // Verify with tampered payload
      const tamperedPayload = { ...payload, record_id: 'tampered-id' };
      const isInvalid = WebhookModel.verifySignature(tamperedPayload, signature, webhook!.secret!);
      expect(isInvalid).toBe(false);
    });
  });
});