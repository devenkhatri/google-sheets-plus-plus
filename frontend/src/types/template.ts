export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  structure: TemplateStructure;
  previewImage?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface TemplateStructure {
  base: {
    name: string;
    description?: string;
  };
  tables: TemplateTable[];
}

export interface TemplateTable {
  name: string;
  description?: string;
  fields: TemplateField[];
  sampleData?: Record<string, any>[];
  views?: TemplateView[];
}

export interface TemplateField {
  name: string;
  type: string;
  options?: any;
  required?: boolean;
  description?: string;
}

export interface TemplateView {
  name: string;
  type: 'grid' | 'kanban' | 'calendar' | 'gallery';
  configuration?: any;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: string;
  tags: string[];
  baseId: string;
  isPublic?: boolean;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templateCount: number;
}