import { AutomationRule, AutomationExecution, CreateAutomationRuleRequest, UpdateAutomationRuleRequest } from '../types/automation';

import { API_URL } from '../config';

const API_BASE_URL = API_URL;

class AutomationService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  async getAutomationRules(baseId: string): Promise<AutomationRule[]> {
    const response = await this.request<{ data: AutomationRule[] }>(`/bases/${baseId}/automations`);
    return response.data.map(rule => ({
      ...rule,
      createdAt: new Date(rule.createdAt),
      updatedAt: new Date(rule.updatedAt)
    }));
  }

  async getAutomationRule(ruleId: string): Promise<AutomationRule> {
    const response = await this.request<{ data: AutomationRule }>(`/automations/${ruleId}`);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt)
    };
  }

  async createAutomationRule(baseId: string, ruleData: CreateAutomationRuleRequest): Promise<AutomationRule> {
    const response = await this.request<{ data: AutomationRule }>(`/bases/${baseId}/automations`, {
      method: 'POST',
      body: JSON.stringify(ruleData),
    });
    
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt)
    };
  }

  async updateAutomationRule(ruleId: string, updates: UpdateAutomationRuleRequest): Promise<AutomationRule> {
    const response = await this.request<{ data: AutomationRule }>(`/automations/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt)
    };
  }

  async deleteAutomationRule(ruleId: string): Promise<void> {
    await this.request(`/automations/${ruleId}`, {
      method: 'DELETE',
    });
  }

  async executeAutomation(ruleId: string, triggerData?: any): Promise<AutomationExecution> {
    const response = await this.request<{ data: AutomationExecution }>(`/automations/${ruleId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ triggerData }),
    });
    
    return {
      ...response.data,
      startedAt: new Date(response.data.startedAt),
      completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined
    };
  }

  async getExecutionHistory(ruleId: string, limit: number = 50): Promise<AutomationExecution[]> {
    const response = await this.request<{ data: AutomationExecution[] }>(`/automations/${ruleId}/executions?limit=${limit}`);
    return response.data.map(execution => ({
      ...execution,
      startedAt: new Date(execution.startedAt),
      completedAt: execution.completedAt ? new Date(execution.completedAt) : undefined
    }));
  }

  async toggleAutomationRule(ruleId: string): Promise<AutomationRule> {
    const response = await this.request<{ data: AutomationRule }>(`/automations/${ruleId}/toggle`, {
      method: 'POST',
    });
    
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt)
    };
  }
}

export const automationService = new AutomationService();