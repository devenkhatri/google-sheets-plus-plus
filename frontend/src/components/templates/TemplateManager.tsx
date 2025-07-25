import React, { useState, useEffect } from 'react';
import { Template } from '../../types/template';
import { templateService } from '../../services/templateService';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (templateId: string) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [duplicateName, setDuplicateName] = useState('');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const userTemplates = await templateService.getMyTemplates();
      setTemplates(userTemplates);
    } catch (error) {
      setError('Failed to load templates');
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (template: Template) => {
    try {
      templateService.downloadTemplateFile(template.id, template.name);
    } catch (error) {
      setError('Failed to export template');
      console.error('Failed to export template:', error);
    }
  };

  const handleImport = async () => {
    try {
      setError(null);
      await templateService.importTemplate(importData);
      setShowImportDialog(false);
      setImportData('');
      await loadTemplates();
    } catch (error) {
      setError('Failed to import template');
      console.error('Failed to import template:', error);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplate) return;

    try {
      setError(null);
      await templateService.duplicateTemplate(selectedTemplate.id, duplicateName);
      setShowDuplicateDialog(false);
      setDuplicateName('');
      setSelectedTemplate(null);
      await loadTemplates();
    } catch (error) {
      setError('Failed to duplicate template');
      console.error('Failed to duplicate template:', error);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Template Manager" size="large">
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">My Templates</h3>
            <Button 
              variant="primary" 
              onClick={() => setShowImportDialog(true)}
            >
              Import Template
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No templates found</p>
              <p className="text-sm text-gray-400 mt-2">
                Create templates from your bases or import existing ones
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleExport(template)}
                      >
                        Export
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setDuplicateName(`${template.name} (Copy)`);
                          setShowDuplicateDialog(true);
                        }}
                      >
                        Duplicate
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 mb-3">
                    <strong>Tables:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {template.structure.tables.slice(0, 3).map(table => (
                        <li key={table.name}>
                          {table.name} ({table.fields.length} fields)
                        </li>
                      ))}
                      {template.structure.tables.length > 3 && (
                        <li>...and {template.structure.tables.length - 3} more</li>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Used {template.usageCount} times</span>
                    <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                  </div>

                  {onSelectTemplate && (
                    <div className="mt-3">
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => onSelectTemplate(template.id)}
                        className="w-full"
                      >
                        Use Template
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Import Dialog */}
      <Modal
        isOpen={showImportDialog}
        onClose={() => {
          setShowImportDialog(false);
          setImportData('');
        }}
        title="Import Template"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Template File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Paste Template Data
            </label>
            <textarea
              value={importData}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setImportData(e.target.value)}
              placeholder="Paste template JSON data here..."
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowImportDialog(false);
                setImportData('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!importData.trim()}
            >
              Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Duplicate Dialog */}
      <Modal
        isOpen={showDuplicateDialog}
        onClose={() => {
          setShowDuplicateDialog(false);
          setDuplicateName('');
          setSelectedTemplate(null);
        }}
        title="Duplicate Template"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <Input
              type="text"
              value={duplicateName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateName(e.target.value)}
              placeholder="Enter name for duplicated template"
              className="w-full"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDuplicateDialog(false);
                setDuplicateName('');
                setSelectedTemplate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDuplicate}
              disabled={!duplicateName.trim()}
            >
              Duplicate
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};