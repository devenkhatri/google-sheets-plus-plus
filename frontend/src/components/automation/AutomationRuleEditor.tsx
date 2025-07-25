import React, { useState, useEffect } from 'react';
import { AutomationRule, TriggerConfig, ActionConfig, TriggerType, ActionType } from '../../types/automation';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface AutomationRuleEditorProps {
  baseId: string;
  rule?: AutomationRule | null;
  onSave: (ruleData: any) => void;
  onCancel: () => void;
}

export const AutomationRuleEditor: React.FC<AutomationRuleEditorProps> = ({
  baseId,
  rule,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: true,
    triggerConfig: {
      type: 'record_created' as TriggerType,
      conditions: []
    } as TriggerConfig,
    actionConfig: {
      type: 'create_record' as ActionType,
      parameters: {}
    } as ActionConfig
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || '',
        enabled: rule.enabled,
        triggerConfig: rule.triggerConfig,
        actionConfig: rule.actionConfig
      });
    }
  }, [rule]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleTriggerChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      triggerConfig: {
        ...prev.triggerConfig,
        [field]: value
      }
    }));
  };

  const handleActionChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      actionConfig: {
        ...prev.actionConfig,
        [field]: value
      }
    }));
  };

  const handleActionParameterChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      actionConfig: {
        ...prev.actionConfig,
        parameters: {
          ...prev.actionConfig.parameters,
          [field]: value
        }
      }
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.triggerConfig.type) {
      newErrors.triggerType = 'Trigger type is required';
    }

    if (!formData.actionConfig.type) {
      newErrors.actionType = 'Action type is required';
    }

    // Validate trigger-specific fields
    if (formData.triggerConfig.type === 'scheduled') {
      if (!formData.triggerConfig.schedule) {
        newErrors.schedule = 'Schedule configuration is required for scheduled triggers';
      }
    }

    // Validate action-specific fields
    if (formData.actionConfig.type === 'send_webhook') {
      if (!formData.actionConfig.parameters.webhookConfig?.url) {
        newErrors.webhookUrl = 'Webhook URL is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  const renderTriggerConfig = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trigger Type
          </label>
          <select
            value={formData.triggerConfig.type}
            onChange={(e) => handleTriggerChange('type', e.target.value as TriggerType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="record_created">Record Created</option>
            <option value="record_updated">Record Updated</option>
            <option value="record_deleted">Record Deleted</option>
            <option value="field_changed">Field Changed</option>
            <option value="scheduled">Scheduled</option>
          </select>
          {errors.triggerType && (
            <p className="mt-1 text-sm text-red-600">{errors.triggerType}</p>
          )}
        </div>

        {formData.triggerConfig.type === 'scheduled' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Type
              </label>
              <select
                value={formData.triggerConfig.schedule?.type || 'once'}
                onChange={(e) => handleTriggerChange('schedule', {
                  ...formData.triggerConfig.schedule,
                  type: e.target.value as 'once' | 'recurring'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="once">Run Once</option>
                <option value="recurring">Recurring</option>
              </select>
            </div>

            {formData.triggerConfig.schedule?.type === 'once' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Run At
                </label>
                <input
                  type="datetime-local"
                  value={formData.triggerConfig.schedule?.runAt ? 
                    new Date(formData.triggerConfig.schedule.runAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleTriggerChange('schedule', {
                    ...formData.triggerConfig.schedule,
                    runAt: new Date(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {formData.triggerConfig.schedule?.type === 'recurring' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cron Expression
                </label>
                <Input
                  value={formData.triggerConfig.schedule?.cronExpression || ''}
                  onChange={(e) => handleTriggerChange('schedule', {
                    ...formData.triggerConfig.schedule,
                    cronExpression: e.target.value
                  })}
                  placeholder="0 0 * * * (every day at midnight)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use cron format: minute hour day month weekday
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderActionConfig = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action Type
          </label>
          <select
            value={formData.actionConfig.type}
            onChange={(e) => handleActionChange('type', e.target.value as ActionType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="create_record">Create Record</option>
            <option value="update_record">Update Record</option>
            <option value="delete_record">Delete Record</option>
            <option value="send_email">Send Email</option>
            <option value="send_webhook">Send Webhook</option>
            <option value="run_script">Run Script</option>
          </select>
          {errors.actionType && (
            <p className="mt-1 text-sm text-red-600">{errors.actionType}</p>
          )}
        </div>

        {formData.actionConfig.type === 'send_webhook' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <Input
                value={formData.actionConfig.parameters.webhookConfig?.url || ''}
                onChange={(e) => handleActionParameterChange('webhookConfig', {
                  ...formData.actionConfig.parameters.webhookConfig,
                  url: e.target.value
                })}
                placeholder="https://example.com/webhook"
                error={errors.webhookUrl}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HTTP Method
              </label>
              <select
                value={formData.actionConfig.parameters.webhookConfig?.method || 'POST'}
                onChange={(e) => handleActionParameterChange('webhookConfig', {
                  ...formData.actionConfig.parameters.webhookConfig,
                  method: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>
        )}

        {formData.actionConfig.type === 'send_email' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Recipients (comma-separated)
              </label>
              <Input
                value={formData.actionConfig.parameters.emailConfig?.to?.join(', ') || ''}
                onChange={(e) => handleActionParameterChange('emailConfig', {
                  ...formData.actionConfig.parameters.emailConfig,
                  to: e.target.value.split(',').map(email => email.trim())
                })}
                placeholder="user@example.com, admin@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <Input
                value={formData.actionConfig.parameters.emailConfig?.subject || ''}
                onChange={(e) => handleActionParameterChange('emailConfig', {
                  ...formData.actionConfig.parameters.emailConfig,
                  subject: e.target.value
                })}
                placeholder="Automation notification"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Body
              </label>
              <textarea
                value={formData.actionConfig.parameters.emailConfig?.body || ''}
                onChange={(e) => handleActionParameterChange('emailConfig', {
                  ...formData.actionConfig.parameters.emailConfig,
                  body: e.target.value
                })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your automation has been triggered..."
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rule Name
          </label>
          <Input
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter automation rule name"
            error={errors.name}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe what this automation does..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) => handleInputChange('enabled', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
            Enable this automation rule
          </label>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Trigger Configuration</h3>
        {renderTriggerConfig()}
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Action Configuration</h3>
        {renderActionConfig()}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button type="button" onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {rule ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </form>
  );
};