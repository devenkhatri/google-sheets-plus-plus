import { Template, TemplateStructure, CreateTemplateRequest, TemplateCategory } from '../models/Template';
import { BaseService } from './BaseService';
import { TableService } from './TableService';
import { ViewService } from './ViewService';
import { db } from '../config/database';

export class TemplateService {
  constructor(
    private baseService: BaseService,
    private tableService: TableService,
    private viewService: ViewService
  ) {}

  private async initializeBuiltInTemplates(): Promise<void> {
    const existingTemplates = await db('templates').where('created_by', 'system').first();
    if (existingTemplates) return;

    const builtInTemplates = this.getBuiltInTemplatesData();
    await db('templates').insert(builtInTemplates);
  }

  async getTemplateCategories(): Promise<TemplateCategory[]> {
    await this.initializeBuiltInTemplates();
    
    const categories = await db('template_categories')
      .where('is_active', true)
      .orderBy('sort_order');

    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const templateCount = await db('templates')
          .where('category', category.id)
          .where('is_public', true)
          .count('* as count')
          .first();

        return {
          id: category.id,
          name: category.name,
          description: category.description,
          icon: category.icon,
          templateCount: parseInt(templateCount?.count as string) || 0
        };
      })
    );

    return categoriesWithCounts;
  }

  async getTemplatesByCategory(categoryId: string): Promise<Template[]> {
    await this.initializeBuiltInTemplates();
    
    const templates = await db('templates')
      .where('category', categoryId)
      .where('is_public', true)
      .orderBy('usage_count', 'desc');

    return templates.map(this.mapDbTemplateToModel);
  }

  async searchTemplates(query: string): Promise<Template[]> {
    await this.initializeBuiltInTemplates();
    
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const templates = await db('templates')
      .where('is_public', true)
      .where(function() {
        this.whereRaw('LOWER(name) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(description) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(tags::text) LIKE ?', [searchTerm]);
      })
      .orderBy('usage_count', 'desc');

    return templates.map(this.mapDbTemplateToModel);
  }

  async getFeaturedTemplates(): Promise<Template[]> {
    await this.initializeBuiltInTemplates();
    
    const templates = await db('templates')
      .where('is_public', true)
      .orderBy('usage_count', 'desc')
      .limit(6);

    return templates.map(this.mapDbTemplateToModel);
  }

  async getUserTemplates(userId: string): Promise<Template[]> {
    const templates = await db('templates')
      .where('created_by', userId)
      .orderBy('created_at', 'desc');

    return templates.map(this.mapDbTemplateToModel);
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    await this.initializeBuiltInTemplates();
    
    const template = await db('templates')
      .where('id', templateId)
      .first();

    return template ? this.mapDbTemplateToModel(template) : null;
  }

  async createTemplateFromBase(userId: string, request: CreateTemplateRequest): Promise<Template> {
    // Get the base structure
    const base = await this.baseService.getBase(request.baseId, userId);
    if (!base) {
      throw new Error('Base not found');
    }

    // Extract the structure
    const structure: TemplateStructure = {
      base: {
        name: base.name,
        description: base.description
      },
      tables: []
    };

    // Get all tables and their structure
    for (const table of base.tables) {
      const tableStructure = {
        name: table.name,
        description: table.description,
        fields: table.fields.map((field: any) => ({
          name: field.name,
          type: field.type,
          options: field.options,
          required: field.required,
          description: field.description
        })),
        views: table.views?.map((view: any) => ({
          name: view.name,
          type: view.type,
          configuration: view.configuration
        }))
      };

      structure.tables.push(tableStructure);
    }

    // Create the template
    const templateId = `template_${Date.now()}`;
    const templateData = {
      id: templateId,
      name: request.name,
      description: request.description,
      category: request.category,
      tags: JSON.stringify(request.tags),
      structure: JSON.stringify(structure),
      preview_image: null,
      is_public: request.isPublic || false,
      created_by: userId,
      usage_count: 0
    };

    await db('templates').insert(templateData);
    
    const savedTemplate = await db('templates').where('id', templateId).first();
    return this.mapDbTemplateToModel(savedTemplate);
  }

  async createBaseFromTemplate(userId: string, templateId: string, baseName?: string): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create the base
    const base = await this.baseService.createBase(
      userId,
      baseName || template.structure.base.name,
      template.structure.base.description
    );

    // Create tables from template
    for (const tableTemplate of template.structure.tables) {
      const table = await this.tableService.createTable(
        base.id,
        userId,
        tableTemplate.name,
        tableTemplate.description,
        tableTemplate.fields
      );

      // Create views if specified
      if (tableTemplate.views) {
        for (const viewTemplate of tableTemplate.views) {
          await this.viewService.createView(table.id, userId, {
            name: viewTemplate.name,
            type: viewTemplate.type,
            configuration: viewTemplate.configuration
          });
        }
      }

      // Add sample data if provided - this would need to be implemented in RecordService
      if (tableTemplate.sampleData) {
        // TODO: Implement record creation from sample data
        console.log('Sample data creation not yet implemented');
      }
    }

    // Increment usage count
    await db('templates')
      .where('id', templateId)
      .increment('usage_count', 1);

    return base.id;
  }

  async exportTemplate(templateId: string): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create a clean export format
    const exportData = {
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      structure: template.structure,
      version: '1.0',
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importTemplate(userId: string, templateData: string): Promise<Template> {
    try {
      const parsedData = JSON.parse(templateData);
      
      // Validate required fields
      if (!parsedData.name || !parsedData.structure) {
        throw new Error('Invalid template format: missing required fields');
      }

      // Create template from imported data
      const templateId = `template_${Date.now()}`;
      const templateDbData = {
        id: templateId,
        name: parsedData.name,
        description: parsedData.description || '',
        category: parsedData.category || 'custom',
        tags: JSON.stringify(parsedData.tags || []),
        structure: JSON.stringify(parsedData.structure),
        preview_image: null,
        is_public: false, // Imported templates are private by default
        created_by: userId,
        usage_count: 0
      };

      await db('templates').insert(templateDbData);
      
      const savedTemplate = await db('templates').where('id', templateId).first();
      return this.mapDbTemplateToModel(savedTemplate);
    } catch (error: any) {
      throw new Error('Failed to parse template data: ' + error.message);
    }
  }

  async duplicateTemplate(userId: string, templateId: string, newName?: string): Promise<Template> {
    const originalTemplate = await this.getTemplate(templateId);
    if (!originalTemplate) {
      throw new Error('Template not found');
    }

    const duplicatedTemplateId = `template_${Date.now()}`;
    const duplicatedTemplateData = {
      id: duplicatedTemplateId,
      name: newName || `${originalTemplate.name} (Copy)`,
      description: originalTemplate.description,
      category: originalTemplate.category,
      tags: JSON.stringify(originalTemplate.tags),
      structure: JSON.stringify(originalTemplate.structure),
      preview_image: originalTemplate.previewImage,
      is_public: false, // Duplicated templates are private by default
      created_by: userId,
      usage_count: 0
    };

    await db('templates').insert(duplicatedTemplateData);
    
    const savedTemplate = await db('templates').where('id', duplicatedTemplateId).first();
    return this.mapDbTemplateToModel(savedTemplate);
  }

  private mapDbTemplateToModel(dbTemplate: any): Template {
    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description || '',
      category: dbTemplate.category,
      tags: typeof dbTemplate.tags === 'string' ? JSON.parse(dbTemplate.tags) : dbTemplate.tags || [],
      structure: typeof dbTemplate.structure === 'string' ? JSON.parse(dbTemplate.structure) : dbTemplate.structure,
      previewImage: dbTemplate.preview_image,
      isPublic: dbTemplate.is_public,
      createdBy: dbTemplate.created_by,
      createdAt: new Date(dbTemplate.created_at),
      updatedAt: new Date(dbTemplate.updated_at),
      usageCount: dbTemplate.usage_count || 0
    };
  }

  private getBuiltInTemplatesData(): any[] {
    return [
      {
        id: 'project-tracker',
        name: 'Project Tracker',
        description: 'Track project tasks, deadlines, and team assignments',
        category: 'project-management',
        tags: JSON.stringify(['projects', 'tasks', 'deadlines']),
        structure: JSON.stringify({
          base: {
            name: 'Project Tracker',
            description: 'Manage your projects and tasks efficiently'
          },
          tables: [
            {
              name: 'Projects',
              fields: [
                { name: 'Project Name', type: 'text', required: true },
                { name: 'Status', type: 'singleSelect', options: { choices: ['Planning', 'In Progress', 'On Hold', 'Completed'] } },
                { name: 'Start Date', type: 'date' },
                { name: 'End Date', type: 'date' },
                { name: 'Project Manager', type: 'text' },
                { name: 'Budget', type: 'number', options: { format: 'currency' } },
                { name: 'Description', type: 'text' }
              ],
              views: [
                { name: 'All Projects', type: 'grid' },
                { name: 'By Status', type: 'kanban' }
              ]
            },
            {
              name: 'Tasks',
              fields: [
                { name: 'Task Name', type: 'text', required: true },
                { name: 'Project', type: 'link', options: { linkedTable: 'Projects' } },
                { name: 'Assignee', type: 'text' },
                { name: 'Status', type: 'singleSelect', options: { choices: ['To Do', 'In Progress', 'Review', 'Done'] } },
                { name: 'Priority', type: 'singleSelect', options: { choices: ['Low', 'Medium', 'High', 'Urgent'] } },
                { name: 'Due Date', type: 'date' },
                { name: 'Estimated Hours', type: 'number' },
                { name: 'Notes', type: 'text' }
              ],
              views: [
                { name: 'All Tasks', type: 'grid' },
                { name: 'Task Board', type: 'kanban' },
                { name: 'Calendar', type: 'calendar' }
              ]
            }
          ]
        }),
        preview_image: null,
        is_public: true,
        created_by: 'system',
        usage_count: 150,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      },
      {
        id: 'crm-contacts',
        name: 'CRM & Contacts',
        description: 'Manage customer relationships and sales pipeline',
        category: 'crm',
        tags: JSON.stringify(['crm', 'contacts', 'sales']),
        structure: JSON.stringify({
          base: {
            name: 'CRM & Contacts',
            description: 'Customer relationship management system'
          },
          tables: [
            {
              name: 'Contacts',
              fields: [
                { name: 'Full Name', type: 'text', required: true },
                { name: 'Company', type: 'text' },
                { name: 'Email', type: 'text' },
                { name: 'Phone', type: 'text' },
                { name: 'Status', type: 'singleSelect', options: { choices: ['Lead', 'Prospect', 'Customer', 'Inactive'] } },
                { name: 'Source', type: 'singleSelect', options: { choices: ['Website', 'Referral', 'Social Media', 'Cold Call'] } },
                { name: 'Last Contact', type: 'date' },
                { name: 'Notes', type: 'text' }
              ],
              views: [
                { name: 'All Contacts', type: 'grid' },
                { name: 'By Status', type: 'kanban' }
              ]
            },
            {
              name: 'Deals',
              fields: [
                { name: 'Deal Name', type: 'text', required: true },
                { name: 'Contact', type: 'link', options: { linkedTable: 'Contacts' } },
                { name: 'Value', type: 'number', options: { format: 'currency' } },
                { name: 'Stage', type: 'singleSelect', options: { choices: ['Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] } },
                { name: 'Probability', type: 'number', options: { format: 'percent' } },
                { name: 'Close Date', type: 'date' },
                { name: 'Notes', type: 'text' }
              ],
              views: [
                { name: 'All Deals', type: 'grid' },
                { name: 'Sales Pipeline', type: 'kanban' }
              ]
            }
          ]
        }),
        preview_image: null,
        is_public: true,
        created_by: 'system',
        usage_count: 89,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      },
      {
        id: 'inventory-tracker',
        name: 'Inventory Tracker',
        description: 'Track inventory levels, suppliers, and purchase orders',
        category: 'inventory',
        tags: JSON.stringify(['inventory', 'stock', 'suppliers']),
        structure: JSON.stringify({
          base: {
            name: 'Inventory Management',
            description: 'Comprehensive inventory tracking system'
          },
          tables: [
            {
              name: 'Products',
              fields: [
                { name: 'Product Name', type: 'text', required: true },
                { name: 'SKU', type: 'text', required: true },
                { name: 'Category', type: 'singleSelect', options: { choices: ['Electronics', 'Clothing', 'Books', 'Home & Garden'] } },
                { name: 'Current Stock', type: 'number' },
                { name: 'Minimum Stock', type: 'number' },
                { name: 'Unit Price', type: 'number', options: { format: 'currency' } },
                { name: 'Supplier', type: 'link', options: { linkedTable: 'Suppliers' } },
                { name: 'Last Restocked', type: 'date' }
              ],
              views: [
                { name: 'All Products', type: 'grid' },
                { name: 'Low Stock Alert', type: 'grid' },
                { name: 'By Category', type: 'kanban' }
              ]
            },
            {
              name: 'Suppliers',
              fields: [
                { name: 'Supplier Name', type: 'text', required: true },
                { name: 'Contact Person', type: 'text' },
                { name: 'Email', type: 'text' },
                { name: 'Phone', type: 'text' },
                { name: 'Address', type: 'text' },
                { name: 'Rating', type: 'singleSelect', options: { choices: ['Excellent', 'Good', 'Fair', 'Poor'] } },
                { name: 'Products', type: 'link', options: { linkedTable: 'Products' } }
              ]
            }
          ]
        }),
        preview_image: null,
        is_public: true,
        created_by: 'system',
        usage_count: 67,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      },
      {
        id: 'content-calendar',
        name: 'Content Calendar',
        description: 'Plan and track content creation and publishing schedule',
        category: 'content',
        tags: JSON.stringify(['content', 'marketing', 'social media']),
        structure: JSON.stringify({
          base: {
            name: 'Content Calendar',
            description: 'Organize your content strategy and publishing schedule'
          },
          tables: [
            {
              name: 'Content',
              fields: [
                { name: 'Title', type: 'text', required: true },
                { name: 'Type', type: 'singleSelect', options: { choices: ['Blog Post', 'Social Media', 'Video', 'Newsletter', 'Podcast'] } },
                { name: 'Status', type: 'singleSelect', options: { choices: ['Idea', 'In Progress', 'Review', 'Scheduled', 'Published'] } },
                { name: 'Author', type: 'text' },
                { name: 'Publish Date', type: 'date' },
                { name: 'Platform', type: 'multiSelect', options: { choices: ['Website', 'Facebook', 'Twitter', 'Instagram', 'LinkedIn', 'YouTube'] } },
                { name: 'Keywords', type: 'multiSelect' },
                { name: 'Notes', type: 'text' }
              ],
              views: [
                { name: 'All Content', type: 'grid' },
                { name: 'Content Pipeline', type: 'kanban' },
                { name: 'Publishing Calendar', type: 'calendar' }
              ]
            }
          ]
        }),
        preview_image: null,
        is_public: true,
        created_by: 'system',
        usage_count: 124,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      },
      {
        id: 'employee-directory',
        name: 'Employee Directory',
        description: 'Manage employee information and organizational structure',
        category: 'hr',
        tags: JSON.stringify(['hr', 'employees', 'directory']),
        structure: JSON.stringify({
          base: {
            name: 'Employee Directory',
            description: 'Comprehensive employee management system'
          },
          tables: [
            {
              name: 'Employees',
              fields: [
                { name: 'Full Name', type: 'text', required: true },
                { name: 'Employee ID', type: 'text', required: true },
                { name: 'Department', type: 'singleSelect', options: { choices: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'] } },
                { name: 'Position', type: 'text' },
                { name: 'Manager', type: 'link', options: { linkedTable: 'Employees' } },
                { name: 'Email', type: 'text' },
                { name: 'Phone', type: 'text' },
                { name: 'Start Date', type: 'date' },
                { name: 'Status', type: 'singleSelect', options: { choices: ['Active', 'On Leave', 'Terminated'] } }
              ],
              views: [
                { name: 'All Employees', type: 'grid' },
                { name: 'By Department', type: 'kanban' },
                { name: 'Directory', type: 'gallery' }
              ]
            }
          ]
        }),
        preview_image: null,
        is_public: true,
        created_by: 'system',
        usage_count: 45,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      }
    ];
  }

  private async getBuiltInTemplates(): Promise<Template[]> {
    // This method is kept for backward compatibility but templates are now stored in database
    const templates = await db('templates').where('created_by', 'system');
    return templates.map(this.mapDbTemplateToModel);
  }
}