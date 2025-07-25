import React, { useState } from 'react';
import { AutomationRule, AutomationExecution } from '../../types/automation';
import { automationService } from '../../services/automationService';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';

interface AutomationRuleCardProps {
  rule: AutomationRule;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (ruleId: string) => void;
  onToggle: (ruleId: string) => void;
  onExecute: (ruleId: string) => void;
}

export const AutomationRuleCard: React.FC<AutomationRuleCardProps> = ({
  rule,
  onEdit,
  onDelete,
  onToggle,
  onExecute
}) => {
  const [showExecutions, setShowExecutions] = useState(false);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);

  const getTriggerDescription = (rule: AutomationRule): string => {
    const { triggerConfig } = rule;
    
    switch (triggerConfig.type) {
      case 'record_created':
        return 'When a record is created';
      case 'record_updated':
        return 'When a record is updated';
      case 'record_deleted':
        return 'When a record is deleted';
      case 'field_changed':
        return 'When a field value changes';
      case 'scheduled':
        if (triggerConfig.schedule?.type === 'once') {
          return `Run once at ${triggerConfig.schedule.runAt?.toLocaleString()}`;
        } else if (triggerConfig.schedule?.cronExpression) {
          return `Run on schedule: ${triggerConfig.schedule.cronExpression}`;
        }
        return 'Scheduled trigger';
      default:
        return 'Unknown trigger';
    }
  };

  const getActionDescription = (rule: AutomationRule): string => {
    const { actionConfig } = rule;
    
    switch (actionConfig.type) {
      case 'create_record':
        return 'Create a new record';
      case 'update_record':
        return 'Update an existing record';
      case 'delete_record':
        return 'Delete a record';
      case 'send_email':
        return 'Send an email notification';
      case 'send_webhook':
        return 'Send a webhook request';
      case 'run_script':
        return 'Execute a custom script';
      default:
        return 'Unknown action';
    }
  };

  const loadExecutions = async () => {
    try {
      setLoadingExecutions(true);
      const executionHistory = await automationService.getExecutionHistory(rule.id);
      setExecutions(executionHistory);
      setShowExecutions(true);
    } catch (error) {
      console.error('Failed to load execution history:', error);
    } finally {
      setLoadingExecutions(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'running':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <>
      <div className={`border rounded-lg p-6 ${rule.enabled ? 'bg-white' : 'bg-gray-50'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {rule.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {rule.description && (
              <p className="text-gray-600 mb-3">{rule.description}</p>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <span className="font-medium text-gray-700 w-16">Trigger:</span>
                <span className="text-gray-600">{getTriggerDescription(rule)}</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium text-gray-700 w-16">Action:</span>
                <span className="text-gray-600">{getActionDescription(rule)}</span>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              Created {rule.createdAt.toLocaleDateString()} • Last updated {rule.updatedAt.toLocaleDateString()}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button
              onClick={() => onToggle(rule.id)}
              variant="secondary"
              size="sm"
            >
              {rule.enabled ? 'Disable' : 'Enable'}
            </Button>
            
            <Button
              onClick={() => onExecute(rule.id)}
              variant="secondary"
              size="sm"
              disabled={!rule.enabled}
            >
              Run Now
            </Button>
            
            <Button
              onClick={loadExecutions}
              variant="secondary"
              size="sm"
              disabled={loadingExecutions}
            >
              {loadingExecutions ? <LoadingSpinner size="sm" /> : 'History'}
            </Button>
            
            <Button
              onClick={() => onEdit(rule)}
              variant="secondary"
              size="sm"
            >
              Edit
            </Button>
            
            <Button
              onClick={() => onDelete(rule.id)}
              variant="danger"
              size="sm"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showExecutions}
        onClose={() => setShowExecutions(false)}
        title={`Execution History - ${rule.name}`}
        size="large"
      >
        <div className="space-y-4">
          {executions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No executions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map(execution => (
                <div key={execution.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {execution.startedAt.toLocaleString()}
                    </span>
                  </div>
                  
                  {execution.durationMs && (
                    <div className="text-sm text-gray-600 mb-2">
                      Duration: {execution.durationMs}ms
                    </div>
                  )}
                  
                  {execution.errorMessage && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      Error: {execution.errorMessage}
                    </div>
                  )}
                  
                  {execution.executionResult && (
                    <details className="mt-2">
                      <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                        Execution Result
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">
                        {JSON.stringify(execution.executionResult, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};