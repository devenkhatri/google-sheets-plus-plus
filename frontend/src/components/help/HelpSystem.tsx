import React, { useState, useEffect } from 'react';
import { HelpCircle, Book, Search, X, ExternalLink, ChevronRight } from 'lucide-react';
import { InlineHelp } from './InlineHelp';
import { HelpTooltip } from '../ui/HelpTooltip';

interface HelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  url?: string;
}

const helpArticles: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started Guide',
    category: 'Basics',
    content: 'Learn how to create your first base and add data.',
    tags: ['beginner', 'setup', 'base', 'table'],
    url: '/docs/user-guide/getting-started'
  },
  {
    id: 'field-types',
    title: 'Understanding Field Types',
    category: 'Data Management',
    content: 'Complete guide to all available field types and their uses.',
    tags: ['fields', 'data', 'types'],
    url: '/docs/user-guide/tables-and-fields#field-types'
  },
  {
    id: 'views',
    title: 'Working with Views',
    category: 'Views',
    content: 'Learn about Grid, Kanban, Calendar, and Gallery views.',
    tags: ['views', 'grid', 'kanban', 'calendar', 'gallery'],
    url: '/docs/user-guide/views'
  },
  {
    id: 'collaboration',
    title: 'Collaboration Features',
    category: 'Teamwork',
    content: 'Share bases, add comments, and work with team members.',
    tags: ['sharing', 'comments', 'team', 'permissions'],
    url: '/docs/user-guide/collaboration'
  },
  {
    id: 'formulas',
    title: 'Formula Field Guide',
    category: 'Advanced',
    content: 'Create calculations and automated values with formulas.',
    tags: ['formulas', 'calculations', 'advanced'],
    url: '/docs/user-guide/formulas'
  },
  {
    id: 'import-export',
    title: 'Import and Export Data',
    category: 'Data Management',
    content: 'Bring in existing data and export your work.',
    tags: ['import', 'export', 'csv', 'excel'],
    url: '/docs/user-guide/import-export'
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    category: 'Productivity',
    content: 'Speed up your workflow with keyboard shortcuts.',
    tags: ['shortcuts', 'productivity', 'keyboard'],
    url: '/docs/user-guide/keyboard-shortcuts'
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting Guide',
    category: 'Support',
    content: 'Solutions to common issues and problems.',
    tags: ['help', 'problems', 'issues', 'support'],
    url: '/docs/user-guide/troubleshooting'
  },
  {
    id: 'api-docs',
    title: 'API Documentation',
    category: 'Developers',
    content: 'Complete API reference for developers.',
    tags: ['api', 'developers', 'integration'],
    url: '/docs/developer-guide/api-reference'
  }
];

const categories = ['All', 'Basics', 'Data Management', 'Views', 'Teamwork', 'Advanced', 'Productivity', 'Support', 'Developers'];

export const HelpSystem: React.FC<HelpSystemProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredArticles, setFilteredArticles] = useState(helpArticles);

  useEffect(() => {
    let filtered = helpArticles;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(term) ||
        article.content.toLowerCase().includes(term) ||
        article.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    setFilteredArticles(filtered);
  }, [searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Book className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold">Help Center</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close help"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Categories</h3>
                <div className="space-y-1">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === category
                          ? 'bg-blue-100 text-blue-700'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Quick Links</h3>
                <div className="space-y-1">
                  <a
                    href="/docs/user-guide/getting-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Getting Started
                    <ExternalLink size={14} />
                  </a>
                  <a
                    href="/docs/user-guide/keyboard-shortcuts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Keyboard Shortcuts
                    <ExternalLink size={14} />
                  </a>
                  <a
                    href="/docs/developer-guide/api-reference"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    API Documentation
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <Search className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
                <p className="text-gray-600">Try adjusting your search terms or category filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    {selectedCategory === 'All' ? 'All Articles' : selectedCategory}
                    <span className="ml-2 text-sm text-gray-500">({filteredArticles.length})</span>
                  </h3>
                </div>

                <div className="grid gap-4">
                  {filteredArticles.map(article => (
                    <div
                      key={article.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-gray-900">{article.title}</h4>
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              {article.category}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{article.content}</p>
                          <div className="flex flex-wrap gap-1">
                            {article.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        {article.url && (
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            aria-label={`Open ${article.title}`}
                          >
                            <ChevronRight size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Need more help? <a href="mailto:support@airtable-clone.com" className="text-blue-600 hover:underline">Contact Support</a>
            </div>
            <div>
              Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+/</kbd> for keyboard shortcuts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Help button component for triggering the help system
interface HelpButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const HelpButton: React.FC<HelpButtonProps> = ({ className = '', size = 'md' }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20
  };

  return (
    <>
      <button
        onClick={() => setIsHelpOpen(true)}
        className={`
          inline-flex items-center justify-center rounded-full
          bg-blue-600 text-white hover:bg-blue-700 transition-colors
          ${sizeClasses[size]} ${className}
        `}
        aria-label="Open help"
        title="Help & Documentation"
      >
        <HelpCircle size={iconSizes[size]} />
      </button>

      <HelpSystem
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
};

// Context-aware help component
interface ContextualHelpProps {
  context: 'base' | 'table' | 'field' | 'view' | 'record';
  action?: string;
  className?: string;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ 
  context, 
  action, 
  className = '' 
}) => {
  const getHelpContent = () => {
    const key = action ? `${action}${context.charAt(0).toUpperCase() + context.slice(1)}` : context;
    
    const contextHelp = {
      base: 'Bases are workspaces that contain related tables. Each base connects to a Google Sheets document.',
      table: 'Tables organize your data into rows (records) and columns (fields). Think of them like spreadsheet tabs.',
      field: 'Fields define what type of information you store in each column of your table.',
      view: 'Views are different ways to display and organize the same data with filters, sorts, and layouts.',
      record: 'Records are individual entries in your table, like rows in a spreadsheet.',
      createBase: 'Create a new workspace to organize related tables and data.',
      createTable: 'Add a new table to organize a specific type of data in your base.',
      addField: 'Add a new column to define what type of information you want to store.',
      createView: 'Create a new way to display your data with specific filters and layouts.',
      addRecord: 'Add a new entry to your table with information for each field.'
    };

    return contextHelp[key as keyof typeof contextHelp] || contextHelp[context];
  };

  return (
    <HelpTooltip
      content={getHelpContent()}
      size="md"
      className={className}
    />
  );
};

export default HelpSystem;