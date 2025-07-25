import { AutomationRule, AutomationExecution, ScheduledAutomation, TriggerConfig, ActionConfig, TriggerType } from '../models/AutomationRule';
import { RecordService } from './RecordService';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import * as cron from 'node-cron';
import axios from 'axios';

export class AutomationService {
  private recordService: RecordService;
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.recordService = new RecordService();
    this.initializeScheduledAutomations();
  }

  async createAutomationRule(ruleData: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AutomationRule> {
    try {
      const [rule] = await db('automation_rules')
        .insert({
          ...ruleData,
          trigger_config: JSON.stringify(ruleData.triggerConfig),
          action_config: JSON.stringify(ruleData.actionConfig),
          created_by: ruleData.createdBy,
          base_id: ruleData.baseId
        })
        .returning('*');

      const automationRule = this.mapDbRowToAutomationRule(rule);

      // Schedule if it's a time-based trigger
      if (automationRule.triggerConfig.type === 'scheduled') {
        await this.scheduleAutomation(automationRule);
      }

      // Log audit activity (simplified for now)
      logger.info(`Automation rule created: ${automationRule.name} by ${ruleData.createdBy}`);

      return automationRule;
    } catch (error) {
      logger.error('Error creating automation rule:', error);
      throw error;
    }
  }

  async getAutomationRules(baseId: string): Promise<AutomationRule[]> {
    try {
      const rules = await db('automation_rules')
        .where('base_id', baseId)
        .orderBy('created_at', 'desc');

      return rules.map(this.mapDbRowToAutomationRule);
    } catch (error) {
      logger.error('Error fetching automation rules:', error);
      throw error;
    }
  }

  async getAutomationRule(ruleId: string): Promise<AutomationRule | null> {
    try {
      const rule = await db('automation_rules')
        .where('id', ruleId)
        .first();

      return rule ? this.mapDbRowToAutomationRule(rule) : null;
    } catch (error) {
      logger.error('Error fetching automation rule:', error);
      throw error;
    }
  }

  async updateAutomationRule(ruleId: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    try {
      const updateData: any = { ...updates };
      
      if (updates.triggerConfig) {
        updateData.trigger_config = JSON.stringify(updates.triggerConfig);
        delete updateData.triggerConfig;
      }
      
      if (updates.actionConfig) {
        updateData.action_config = JSON.stringify(updates.actionConfig);
        delete updateData.actionConfig;
      }

      const [rule] = await db('automation_rules')
        .where('id', ruleId)
        .update(updateData)
        .returning('*');

      const automationRule = this.mapDbRowToAutomationRule(rule);

      // Reschedule if it's a time-based trigger
      if (automationRule.triggerConfig.type === 'scheduled') {
        await this.unscheduleAutomation(ruleId);
        await this.scheduleAutomation(automationRule);
      }

      return automationRule;
    } catch (error) {
      logger.error('Error updating automation rule:', error);
      throw error;
    }
  }

  async deleteAutomationRule(ruleId: string): Promise<void> {
    try {
      await this.unscheduleAutomation(ruleId);
      
      await db('automation_rules')
        .where('id', ruleId)
        .delete();

      logger.info(`Automation rule ${ruleId} deleted`);
    } catch (error) {
      logger.error('Error deleting automation rule:', error);
      throw error;
    }
  }

  async executeAutomation(ruleId: string, triggerData?: any): Promise<AutomationExecution> {
    const startTime = Date.now();
    const executionId = await this.createExecution(ruleId, triggerData);

    try {
      const rule = await this.getAutomationRule(ruleId);
      if (!rule || !rule.enabled) {
        throw new Error('Automation rule not found or disabled');
      }

      const result = await this.executeAction(rule.actionConfig, triggerData);

      const execution = await this.completeExecution(executionId, 'success', result, Date.now() - startTime);
      
      logger.info(`Automation ${ruleId} executed successfully`);
      return execution;
    } catch (error) {
      const execution = await this.completeExecution(executionId, 'failed', null, Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      logger.error(`Automation ${ruleId} execution failed:`, error);
      return execution;
    }
  }

  async triggerAutomations(triggerType: TriggerType, data: any): Promise<void> {
    try {
      const rules = await db('automation_rules')
        .where('enabled', true)
        .whereRaw("trigger_config->>'type' = ?", [triggerType]);

      for (const ruleRow of rules) {
        const rule = this.mapDbRowToAutomationRule(ruleRow);
        
        if (this.shouldTrigger(rule.triggerConfig, data)) {
          // Execute asynchronously to avoid blocking
          this.executeAutomation(rule.id, data).catch(error => {
            logger.error(`Failed to execute automation ${rule.id}:`, error);
          });
        }
      }
    } catch (error) {
      logger.error('Error triggering automations:', error);
    }
  }

  private async scheduleAutomation(rule: AutomationRule): Promise<void> {
    if (rule.triggerConfig.type !== 'scheduled' || !rule.triggerConfig.schedule) {
      return;
    }

    const { schedule } = rule.triggerConfig;
    
    if (schedule.type === 'once' && schedule.runAt) {
      // Schedule one-time execution
      const delay = schedule.runAt.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          this.executeAutomation(rule.id);
        }, delay);
      }
    } else if (schedule.type === 'recurring' && schedule.cronExpression) {
      // Schedule recurring execution
      const task = cron.schedule(schedule.cronExpression, () => {
        this.executeAutomation(rule.id);
      }, {
        timezone: schedule.timezone || 'UTC'
      });
      
      task.start();
      this.scheduledJobs.set(rule.id, task);

      // Store in database for persistence
      await db('scheduled_automations').insert({
        automation_rule_id: rule.id,
        schedule_type: schedule.type,
        cron_expression: schedule.cronExpression,
        next_run_at: this.getNextRunTime(schedule.cronExpression),
        active: true
      }).onConflict('automation_rule_id').merge();
    }
  }

  private async unscheduleAutomation(ruleId: string): Promise<void> {
    const task = this.scheduledJobs.get(ruleId);
    if (task) {
      task.stop();
      this.scheduledJobs.delete(ruleId);
    }

    await db('scheduled_automations')
      .where('automation_rule_id', ruleId)
      .update({ active: false });
  }

  private async initializeScheduledAutomations(): Promise<void> {
    try {
      const scheduledAutomations = await db('scheduled_automations')
        .join('automation_rules', 'scheduled_automations.automation_rule_id', 'automation_rules.id')
        .where('scheduled_automations.active', true)
        .where('automation_rules.enabled', true)
        .select('automation_rules.*', 'scheduled_automations.cron_expression');

      for (const automation of scheduledAutomations) {
        const rule = this.mapDbRowToAutomationRule(automation);
        await this.scheduleAutomation(rule);
      }

      logger.info(`Initialized ${scheduledAutomations.length} scheduled automations`);
    } catch (error) {
      logger.error('Error initializing scheduled automations:', error);
    }
  }

  private shouldTrigger(triggerConfig: TriggerConfig, data: any): boolean {
    if (!triggerConfig.conditions || triggerConfig.conditions.length === 0) {
      return true;
    }

    return triggerConfig.conditions.every(condition => {
      const fieldValue = data[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'not_contains':
          return !String(fieldValue).includes(String(condition.value));
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value);
        case 'less_than':
          return Number(fieldValue) < Number(condition.value);
        case 'is_empty':
          return !fieldValue || fieldValue === '';
        case 'is_not_empty':
          return fieldValue && fieldValue !== '';
        default:
          return false;
      }
    });
  }

  private async executeAction(actionConfig: ActionConfig, triggerData?: any): Promise<any> {
    switch (actionConfig.type) {
      case 'create_record':
        return await this.executeCreateRecord(actionConfig.parameters, triggerData);
      case 'update_record':
        return await this.executeUpdateRecord(actionConfig.parameters, triggerData);
      case 'delete_record':
        return await this.executeDeleteRecord(actionConfig.parameters, triggerData);
      case 'send_email':
        return await this.executeSendEmail(actionConfig.parameters, triggerData);
      case 'send_webhook':
        return await this.executeSendWebhook(actionConfig.parameters, triggerData);
      case 'run_script':
        return await this.executeScript(actionConfig.parameters, triggerData);
      default:
        throw new Error(`Unknown action type: ${actionConfig.type}`);
    }
  }

  private async executeCreateRecord(parameters: any, triggerData?: any): Promise<any> {
    if (!parameters.tableId || !parameters.fieldUpdates) {
      throw new Error('Missing required parameters for create_record action');
    }

    return await this.recordService.createRecord(parameters.tableId, parameters.fieldUpdates);
  }

  private async executeUpdateRecord(parameters: any, triggerData?: any): Promise<any> {
    if (!parameters.recordId || !parameters.fieldUpdates) {
      throw new Error('Missing required parameters for update_record action');
    }

    return await this.recordService.updateRecord(parameters.recordId, parameters.fieldUpdates);
  }

  private async executeDeleteRecord(parameters: any, triggerData?: any): Promise<any> {
    if (!parameters.recordId) {
      throw new Error('Missing required parameters for delete_record action');
    }

    return await this.recordService.softDeleteRecord(parameters.recordId);
  }

  private async executeSendEmail(parameters: any, triggerData?: any): Promise<any> {
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    logger.info('Email action executed (not implemented):', parameters);
    return { status: 'email_sent' };
  }

  private async executeSendWebhook(parameters: any, triggerData?: any): Promise<any> {
    if (!parameters.webhookConfig) {
      throw new Error('Missing webhook configuration');
    }

    const { url, method, headers, payload } = parameters.webhookConfig;
    
    const response = await axios({
      method: method || 'POST',
      url,
      headers: headers || {},
      data: payload || triggerData,
      timeout: 30000
    });

    return {
      status: response.status,
      data: response.data
    };
  }

  private async executeScript(parameters: any, triggerData?: any): Promise<any> {
    // This would execute user-provided scripts in a sandboxed environment
    logger.info('Script action executed (not implemented):', parameters);
    return { status: 'script_executed' };
  }

  private async createExecution(ruleId: string, triggerData?: any): Promise<string> {
    const [execution] = await db('automation_executions')
      .insert({
        automation_rule_id: ruleId,
        status: 'running',
        trigger_data: triggerData ? JSON.stringify(triggerData) : null,
        started_at: new Date()
      })
      .returning('id');

    return execution.id;
  }

  private async completeExecution(
    executionId: string, 
    status: 'success' | 'failed', 
    result?: any, 
    durationMs?: number,
    errorMessage?: string
  ): Promise<AutomationExecution> {
    const [execution] = await db('automation_executions')
      .where('id', executionId)
      .update({
        status,
        execution_result: result ? JSON.stringify(result) : null,
        error_message: errorMessage,
        completed_at: new Date(),
        duration_ms: durationMs
      })
      .returning('*');

    return this.mapDbRowToExecution(execution);
  }

  private getNextRunTime(cronExpression: string): Date {
    // This would use a cron parser to calculate the next run time
    // For now, return a placeholder
    return new Date(Date.now() + 60000); // 1 minute from now
  }

  private mapDbRowToAutomationRule(row: any): AutomationRule {
    return {
      id: row.id,
      baseId: row.base_id,
      name: row.name,
      description: row.description,
      enabled: row.enabled,
      triggerConfig: JSON.parse(row.trigger_config),
      actionConfig: JSON.parse(row.action_config),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapDbRowToExecution(row: any): AutomationExecution {
    return {
      id: row.id,
      automationRuleId: row.automation_rule_id,
      status: row.status,
      triggerData: row.trigger_data ? JSON.parse(row.trigger_data) : undefined,
      executionResult: row.execution_result ? JSON.parse(row.execution_result) : undefined,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms
    };
  }

  async getExecutionHistory(ruleId: string, limit: number = 50): Promise<AutomationExecution[]> {
    try {
      const executions = await db('automation_executions')
        .where('automation_rule_id', ruleId)
        .orderBy('started_at', 'desc')
        .limit(limit);

      return executions.map(this.mapDbRowToExecution);
    } catch (error) {
      logger.error('Error fetching execution history:', error);
      throw error;
    }
  }
}