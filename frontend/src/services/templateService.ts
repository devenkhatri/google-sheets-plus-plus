import { Template, TemplateCategory, CreateTemplateRequest } from '../types/template';

class TemplateService {
  private baseUrl = '/api/templates';

  async getCategories(): Promise<TemplateCategory[]> {
    const response = await fetch(`${this.baseUrl}/categories`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch template categories' }));
      throw new Error(error.error || 'Failed to fetch template categories');
    }
    return response.json();
  }

  async getTemplatesByCategory(categoryId: string): Promise<Template[]> {
    const response = await fetch(`${this.baseUrl}/category/${categoryId}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch templates' }));
      throw new Error(error.error || 'Failed to fetch templates');
    }
    return response.json();
  }

  async getTemplate(templateId: string): Promise<Template> {
    const response = await fetch(`${this.baseUrl}/${templateId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch template');
    }
    return response.json();
  }

  async createTemplate(request: CreateTemplateRequest): Promise<Template> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create template');
    }
    return response.json();
  }

  async createBaseFromTemplate(templateId: string, baseName?: string): Promise<{ baseId: string }> {
    const response = await fetch(`${this.baseUrl}/${templateId}/create-base`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ baseName }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create base from template' }));
      throw new Error(error.error || 'Failed to create base from template');
    }
    return response.json();
  }

  async searchTemplates(query: string): Promise<Template[]> {
    const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search templates');
    }
    return response.json();
  }

  async getFeaturedTemplates(): Promise<Template[]> {
    const response = await fetch(`${this.baseUrl}/featured`);
    if (!response.ok) {
      throw new Error('Failed to fetch featured templates');
    }
    return response.json();
  }

  async getMyTemplates(): Promise<Template[]> {
    const response = await fetch(`${this.baseUrl}/my-templates`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch user templates' }));
      throw new Error(error.error || 'Failed to fetch user templates');
    }
    return response.json();
  }

  async exportTemplate(templateId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${templateId}/export`);
    if (!response.ok) {
      throw new Error('Failed to export template');
    }
    return response.blob();
  }

  async importTemplate(templateData: string): Promise<Template> {
    const response = await fetch(`${this.baseUrl}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ templateData }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to import template' }));
      throw new Error(error.error || 'Failed to import template');
    }
    return response.json();
  }

  async duplicateTemplate(templateId: string, name?: string): Promise<Template> {
    const response = await fetch(`${this.baseUrl}/${templateId}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ name }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to duplicate template' }));
      throw new Error(error.error || 'Failed to duplicate template');
    }
    return response.json();
  }

  downloadTemplateFile(templateId: string, templateName: string): void {
    const link = document.createElement('a');
    link.href = `${this.baseUrl}/${templateId}/export?token=${localStorage.getItem('token')}`;
    link.download = `${templateName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const templateService = new TemplateService();