import React, { useState, useEffect } from 'react';
import { Template, TemplateCategory } from '../../types/template';
import { templateService } from '../../services/templateService';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

interface TemplateGalleryProps {
  onSelectTemplate: (templateId: string, baseName?: string) => void;
  onClose: () => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onSelectTemplate,
  onClose
}) => {
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [baseName, setBaseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadTemplates(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const categoriesData = await templateService.getCategories();
      setCategories(categoriesData);
      if (categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load template categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async (categoryId: string) => {
    try {
      setLoading(true);
      const templatesData = await templateService.getTemplatesByCategory(categoryId);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate.id, baseName || undefined);
      onClose();
    }
  };

  if (loading && categories.length === 0) {
    return (
      <Modal isOpen onClose={onClose} title="Choose a Template">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Choose a Template" size="large">
      <div className="flex h-96">
        {/* Categories Sidebar */}
        <div className="w-1/4 border-r border-gray-200 pr-4">
          <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
          <div className="space-y-1">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">{category.name}</div>
                <div className="text-xs text-gray-500">
                  {category.templateCount} templates
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 pl-4">
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-h-80 overflow-y-auto">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {template.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {template.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
                    Used {template.usageCount} times
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Preview and Actions */}
      {selectedTemplate && (
        <div className="mt-6 border-t pt-4">
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              {selectedTemplate.name}
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              {selectedTemplate.description}
            </p>
            <div className="text-sm text-gray-500">
              <strong>Includes:</strong>
              <ul className="list-disc list-inside mt-1">
                {selectedTemplate.structure.tables.map(table => (
                  <li key={table.name}>
                    {table.name} ({table.fields.length} fields)
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Base name (optional)"
                value={baseName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseName(e.target.value)}
              />
            </div>
            <Button onClick={handleUseTemplate} variant="primary">
              Use Template
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};