export interface AutomationRule {
  id: string;
  baseId: string;
  name: string;
  description?: string;
  enabled: boolean;
  triggerConfig: TriggerConfig;
  actionConfig: ActionConfig;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerConfig {
  type: TriggerType;
  tableId?: string;
  fieldId?: string;
  conditions?: TriggerCondition[];
  schedule?: ScheduleConfig;
}

export type TriggerType = 
  | 'record_created'
  | 'record_updated' 
  | 'record_deleted'
  | 'field_changed'
  | 'scheduled';

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface ScheduleConfig {
  type: 'once' | 'recurring';
  cronExpression?: string;
  runAt?: Date;
  timezone?: string;
}

export interface ActionConfig {
  type: ActionType;
  parameters: ActionParameters;
}

export type ActionType = 
  | 'create_record'
  | 'update_record'
  | 'delete_record'
  | 'send_email'
  | 'send_webhook'
  | 'run_script';

export interface ActionParameters {
  tableId?: string;
  recordId?: string;
  fieldUpdates?: { [fieldId: string]: any };
  emailConfig?: EmailConfig;
  webhookConfig?: WebhookConfig;
  scriptConfig?: ScriptConfig;
}

export interface EmailConfig {
  to: string[];
  subject: string;
  body: string;
  template?: string;
}

export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: { [key: string]: string };
  payload?: any;
}

export interface ScriptConfig {
  code: string;
  language: 'javascript' | 'python';
  timeout: number;
}

export interface AutomationExecution {
  id: string;
  automationRuleId: string;
  status: 'success' | 'failed' | 'running';
  triggerData?: any;
  executionResult?: any;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface ScheduledAutomation {
  id: string;
  automationRuleId: string;
  scheduleType: 'once' | 'recurring';
  cronExpression?: string;
  nextRunAt: Date;
  lastRunAt?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}