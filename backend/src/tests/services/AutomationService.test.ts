import { AutomationService } from '../../services/AutomationService';
import { AutomationRule, TriggerType, ActionType } from '../../models/AutomationRule';
import { BaseRepository } from '../../repositories/BaseRepository';

// Mock dependencies
jest.mock('../../repositories/BaseRepository');
jest.mock('../../services/RecordService');
jest.mock('../../services/WebhookService');
jest.mock('../../services/AuditService');
jest.mock('../../utils/logger');
jest.mock('node-cron');
jest.mock('axios');

describe('AutomationService', () => {
  let automationService: AutomationService;
  let mockDb: jest.Mocked<any>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock database
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      first: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      onConflict: jest.fn().mockReturnThis(),
      merge: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis()
    };

    // Mock BaseRepository
    (BaseRepository as jest.MockedClass<typeof BaseRepository>).mockImplementation(() => ({
      db: mockDb
    } as any));

    automationService = new AutomationService();
  });

  describe('createAutomationRule', () => {
    it('should create a new automation rule', async () => {
      const ruleData = {
        baseId: 'base-123',
        name: 'Test Rule',
        description: 'Test automation rule',
        enabled: true,
        triggerConfig: {
          type: 'record_created' as TriggerType,
          tableId: 'table-123'
        },
        actionConfig: {
          type: 'send_webhook' as ActionType,
          parameters: {
            webhookConfig: {
              url: 'https://example.com/webhook',
              method: 'POST' as const
            }
          }
        },
        createdBy: 'user-123'
      };

      const mockRule = {
        id: 'rule-123',
        ...ruleData,
        trigger_config: JSON.stringify(ruleData.triggerConfig),
        action_config: JSON.stringify(ruleData.actionConfig),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.returning.mockResolvedValue([mockRule]);

      const result = await automationService.createAutomationRule(ruleData);

      expect(mockDb.insert).toHaveBeenCalledWith({
        ...ruleData,
        trigger_config: JSON.stringify(ruleData.triggerConfig),
        action_config: JSON.stringify(ruleData.actionConfig),
        created_by: ruleData.createdBy,
        base_id: ruleData.baseId
      });
      expect(result.id).toBe('rule-123');
      expect(result.name).toBe('Test Rule');
    });
  });

  describe('getAutomationRules', () => {
    it('should fetch automation rules for a base', async () => {
      const baseId = 'base-123';
      const mockRules = [
        {
          id: 'rule-1',
          base_id: baseId,
          name: 'Rule 1',
          enabled: true,
          trigger_config: JSON.stringify({ type: 'record_created' }),
          action_config: JSON.stringify({ type: 'send_webhook', parameters: {} }),
          created_by: 'user-123',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.orderBy.mockResolvedValue(mockRules);

      const result = await automationService.getAutomationRules(baseId);

      expect(mockDb.where).toHaveBeenCalledWith('base_id', baseId);
      expect(mockDb.orderBy).toHaveBeenCalledWith('created_at', 'desc');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Rule 1');
    });
  });

  describe('executeAutomation', () => {
    it('should execute an automation rule successfully', async () => {
      const ruleId = 'rule-123';
      const triggerData = { recordId: 'record-123' };

      const mockRule = {
        id: ruleId,
        enabled: true,
        actionConfig: {
          type: 'send_webhook' as ActionType,
          parameters: {
            webhookConfig: {
              url: 'https://example.com/webhook',
              method: 'POST' as const
            }
          }
        }
      };

      // Mock getAutomationRule
      jest.spyOn(automationService, 'getAutomationRule').mockResolvedValue(mockRule as any);

      // Mock execution creation and completion
      const executionId = 'execution-123';
      mockDb.returning.mockResolvedValueOnce([{ id: executionId }]); // createExecution
      mockDb.returning.mockResolvedValueOnce([{
        id: executionId,
        automation_rule_id: ruleId,
        status: 'success',
        started_at: new Date(),
        completed_at: new Date(),
        duration_ms: 100
      }]); // completeExecution

      const result = await automationService.executeAutomation(ruleId, triggerData);

      expect(result.status).toBe('success');
      expect(result.automationRuleId).toBe(ruleId);
    });

    it('should handle execution failure', async () => {
      const ruleId = 'rule-123';

      // Mock getAutomationRule to return null (rule not found)
      jest.spyOn(automationService, 'getAutomationRule').mockResolvedValue(null);

      const executionId = 'execution-123';
      mockDb.returning.mockResolvedValueOnce([{ id: executionId }]); // createExecution
      mockDb.returning.mockResolvedValueOnce([{
        id: executionId,
        automation_rule_id: ruleId,
        status: 'failed',
        error_message: 'Automation rule not found or disabled',
        started_at: new Date(),
        completed_at: new Date(),
        duration_ms: 50
      }]); // completeExecution

      const result = await automationService.executeAutomation(ruleId);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Automation rule not found or disabled');
    });
  });

  describe('triggerAutomations', () => {
    it('should trigger matching automation rules', async () => {
      const triggerType: TriggerType = 'record_created';
      const data = { recordId: 'record-123', tableId: 'table-123' };

      const mockRules = [
        {
          id: 'rule-1',
          enabled: true,
          trigger_config: JSON.stringify({ type: 'record_created', conditions: [] }),
          action_config: JSON.stringify({ type: 'send_webhook', parameters: {} })
        }
      ];

      mockDb.whereRaw.mockResolvedValue(mockRules);

      // Mock executeAutomation
      jest.spyOn(automationService, 'executeAutomation').mockResolvedValue({} as any);

      await automationService.triggerAutomations(triggerType, data);

      expect(mockDb.where).toHaveBeenCalledWith('enabled', true);
      expect(mockDb.whereRaw).toHaveBeenCalledWith("trigger_config->>'type' = ?", [triggerType]);
      expect(automationService.executeAutomation).toHaveBeenCalledWith('rule-1', data);
    });
  });

  describe('updateAutomationRule', () => {
    it('should update an automation rule', async () => {
      const ruleId = 'rule-123';
      const updates = {
        name: 'Updated Rule',
        enabled: false
      };

      const mockUpdatedRule = {
        id: ruleId,
        name: 'Updated Rule',
        enabled: false,
        trigger_config: JSON.stringify({ type: 'record_created' }),
        action_config: JSON.stringify({ type: 'send_webhook', parameters: {} }),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.returning.mockResolvedValue([mockUpdatedRule]);

      const result = await automationService.updateAutomationRule(ruleId, updates);

      expect(mockDb.where).toHaveBeenCalledWith('id', ruleId);
      expect(mockDb.update).toHaveBeenCalledWith(updates);
      expect(result.name).toBe('Updated Rule');
      expect(result.enabled).toBe(false);
    });
  });

  describe('deleteAutomationRule', () => {
    it('should delete an automation rule', async () => {
      const ruleId = 'rule-123';

      await automationService.deleteAutomationRule(ruleId);

      expect(mockDb.where).toHaveBeenCalledWith('id', ruleId);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});