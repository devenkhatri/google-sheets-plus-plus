import React, { useState, useEffect } from 'react';
import { Template, TemplateCategory } from '../../types/template';
import { templateService } from '../../services/templateService';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

interface TemplateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (baseId: string) => void;
}

type WizardStep = 'category' | 'template' | 'customize' | 'creating';

export const TemplateWizard: React.FC<TemplateWizardProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('category');
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [baseName, setBaseName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const categoriesData = await templateService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      setError('Failed to load template categories');
      console.error('Failed to load template categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async (categoryId: string) => {
    try {
      setLoading(true);
      setError(null);
      const templatesData = await templateService.getTemplatesByCategory(categoryId);
      setTemplates(templatesData);
    } catch (error) {
      setError('Failed to load templates');
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (category: TemplateCategory) => {
    setSelectedCategory(category);
    await loadTemplates(category.id);
    setCurrentStep('template');
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setBaseName(template.structure.base.name);
    setCurrentStep('customize');
  };

  const handleCreateBase = async () => {
    if (!selectedTemplate) return;

    try {
      setCurrentStep('creating');
      setError(null);
      const result = await templateService.createBaseFromTemplate(
        selectedTemplate.id,
        baseName || undefined
      );
      onComplete(result.baseId);
      handleClose();
    } catch (error) {
      setError('Failed to create base from template');
      console.error('Failed to create base from template:', error);
      setCurrentStep('customize');
    }
  };

  const handleClose = () => {
    setCurrentStep('category');
    setSelectedCategory(null);
    setSelectedTemplate(null);
    setBaseName('');
    setError(null);
    onClose();
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'template':
        setCurrentStep('category');
        setSelectedCategory(null);
        break;
      case 'customize':
        setCurrentStep('template');
        setSelectedTemplate(null);
        break;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'category':
        return 'Choose a Category';
      case 'template':
        return 'Select a Template';
      case 'customize':
        return 'Customize Your Base';
      case 'creating':
        return 'Creating Your Base';
      default:
        return 'Template Wizard';
    }
  };

  const renderCategoryStep = () => (
    <div className="space-y-4">
      <p className="text-gray-600 mb-6">
        What type of base would you like to create?
      </p>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category)}
              className="p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-semibold">
                    {category.icon}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">{category.description}</p>
              <p className="text-xs text-gray-500">
                {category.templateCount} templates available
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderTemplateStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">{selectedCategory?.name}</h3>
          <p className="text-sm text-gray-600">{selectedCategory?.description}</p>
        </div>
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {templates.map(template => (
            <div
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <h4 className="font-semibold text-gray-900 mb-2">{template.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              
              <div className="text-sm text-gray-500 mb-3">
                <strong>Includes:</strong>
                <ul className="list-disc list-inside mt-1">
                  {template.structure.tables.slice(0, 3).map(table => (
                    <li key={table.name}>
                      {table.name} ({table.fields.length} fields)
                    </li>
                  ))}
                  {template.structure.tables.length > 3 && (
                    <li>...and {template.structure.tables.length - 3} more tables</li>
                  )}
                </ul>
              </div>

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
  );

  const renderCustomizeStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">{selectedTemplate?.name}</h3>
          <p className="text-sm text-gray-600">{selectedTemplate?.description}</p>
        </div>
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Template Preview</h4>
        <div className="space-y-2">
          {selectedTemplate?.structure.tables.map(table => (
            <div key={table.name} className="flex items-center justify-between py-2">
              <div>
                <span className="font-medium text-gray-700">{table.name}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ({table.fields.length} fields)
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {table.views?.length || 0} views
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Base Name
        </label>
        <Input
          type="text"
          value={baseName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseName(e.target.value)}
          placeholder="Enter a name for your new base"
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          You can change this later if needed
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
        <Button 
          variant="primary" 
          onClick={handleCreateBase}
          disabled={!baseName.trim()}
        >
          Create Base
        </Button>
      </div>
    </div>
  );

  const renderCreatingStep = () => (
    <div className="text-center py-8">
      <LoadingSpinner size="large" />
      <h3 className="font-semibold text-gray-900 mt-4 mb-2">Creating Your Base</h3>
      <p className="text-gray-600">
        Setting up your new base with the selected template...
      </p>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={getStepTitle()}
      size="large"
    >
      <div className="min-h-96">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {currentStep === 'category' && renderCategoryStep()}
        {currentStep === 'template' && renderTemplateStep()}
        {currentStep === 'customize' && renderCustomizeStep()}
        {currentStep === 'creating' && renderCreatingStep()}
      </div>
    </Modal>
  );
};