import React, { useState, useEffect } from 'react';
import { AutomationRule } from '../../types/automation';
import { automationService } from '../../services/automationService';
import { AutomationRuleCard } from './AutomationRuleCard';
import { AutomationRuleEditor } from './AutomationRuleEditor';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';

interface AutomationManagerProps {
  baseId: string;
}

export const AutomationManager: React.FC<AutomationManagerProps> = ({ baseId }) => {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  useEffect(() => {
    loadAutomationRules();
  }, [baseId]);

  const loadAutomationRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const rules = await automationService.getAutomationRules(baseId);
      setAutomationRules(rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowEditor(true);
  };

  const handleEditRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setShowEditor(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) {
      return;
    }

    try {
      await automationService.deleteAutomationRule(ruleId);
      setAutomationRules(rules => rules.filter(rule => rule.id !== ruleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete automation rule');
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      const updatedRule = await automationService.toggleAutomationRule(ruleId);
      setAutomationRules(rules => 
        rules.map(rule => rule.id === ruleId ? updatedRule : rule)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle automation rule');
    }
  };

  const handleExecuteRule = async (ruleId: string) => {
    try {
      await automationService.executeAutomation(ruleId);
      // Could show a success message or refresh execution history
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute automation rule');
    }
  };

  const handleSaveRule = async (ruleData: any) => {
    try {
      if (editingRule) {
        const updatedRule = await automationService.updateAutomationRule(editingRule.id, ruleData);
        setAutomationRules(rules => 
          rules.map(rule => rule.id === editingRule.id ? updatedRule : rule)
        );
      } else {
        const newRule = await automationService.createAutomationRule(baseId, ruleData);
        setAutomationRules(rules => [...rules, newRule]);
      }
      setShowEditor(false);
      setEditingRule(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save automation rule');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="automation-manager">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Automation Rules</h2>
          <p className="text-gray-600 mt-1">
            Automate workflows with triggers and actions
          </p>
        </div>
        <Button onClick={handleCreateRule} variant="primary">
          Create Automation
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {automationRules.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No automation rules</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first automation rule.
          </p>
          <div className="mt-6">
            <Button onClick={handleCreateRule} variant="primary">
              Create Automation
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {automationRules.map(rule => (
            <AutomationRuleCard
              key={rule.id}
              rule={rule}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              onToggle={handleToggleRule}
              onExecute={handleExecuteRule}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingRule(null);
        }}
        title={editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
        size="large"
      >
        <AutomationRuleEditor
          baseId={baseId}
          rule={editingRule}
          onSave={handleSaveRule}
          onCancel={() => {
            setShowEditor(false);
            setEditingRule(null);
          }}
        />
      </Modal>
    </div>
  );
};