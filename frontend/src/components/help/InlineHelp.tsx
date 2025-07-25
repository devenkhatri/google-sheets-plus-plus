import React from 'react';
import { HelpTooltip, HelpContent } from '../ui/HelpTooltip';
import { Info, BookOpen, Zap, Users, Settings, Database } from 'lucide-react';

interface InlineHelpProps {
  topic: string;
  context?: 'field' | 'view' | 'operation' | 'collaboration' | 'general';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

// Extended help content with more detailed explanations
const ExtendedHelpContent = {
  // Base management
  createBase: (
    <div>
      <p className="mb-2">Create a new workspace to organize related tables and data.</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Each base gets its own Google Sheets document</li>
        <li>Choose descriptive names for easy identification</li>
        <li>Add descriptions to help team members understand the purpose</li>
      </ul>
    </div>
  ),
  
  shareBase: (
    <div>
      <p className="mb-2">Collaborate with team members by sharing your base.</p>
      <div className="space-y-2 text-xs">
        <div><strong>Viewer:</strong> Can see data but not edit</div>
        <div><strong>Commenter:</strong> Can add comments but not edit data</div>
        <div><strong>Editor:</strong> Can edit data and structure</div>
      </div>
    </div>
  ),

  // Table management
  createTable: (
    <div>
      <p className="mb-2">Tables organize your data into rows and columns.</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Start with basic field types and add complexity later</li>
        <li>Each table creates a new sheet in Google Sheets</li>
        <li>Plan your structure before adding lots of data</li>
      </ul>
    </div>
  ),

  addField: (
    <div>
      <p className="mb-2">Fields define what type of information you store in each column.</p>
      <div className="space-y-1 text-xs">
        <div><strong>Text:</strong> Names, descriptions, notes</div>
        <div><strong>Number:</strong> Quantities, prices, scores</div>
        <div><strong>Date:</strong> Deadlines, events, timestamps</div>
        <div><strong>Select:</strong> Status, priority, categories</div>
      </div>
    </div>
  ),

  // Views
  createView: (
    <div>
      <p className="mb-2">Views are different ways to look at the same data.</p>
      <div className="space-y-1 text-xs">
        <div><strong>Grid:</strong> Spreadsheet-like table</div>
        <div><strong>Kanban:</strong> Cards organized by status</div>
        <div><strong>Calendar:</strong> Records on a calendar</div>
        <div><strong>Gallery:</strong> Cards with image previews</div>
      </div>
    </div>
  ),

  // Filtering and sorting
  addFilter: (
    <div>
      <p className="mb-2">Show only records that match specific conditions.</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Combine multiple filters with AND/OR logic</li>
        <li>Use "contains" for partial text matches</li>
        <li>Date filters support relative dates like "today" or "this week"</li>
      </ul>
    </div>
  ),

  addSort: (
    <div>
      <p className="mb-2">Arrange records in a specific order.</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Primary sort is applied first</li>
        <li>Secondary sorts break ties</li>
        <li>Drag to reorder sort priority</li>
      </ul>
    </div>
  ),

  // Record operations
  addRecord: (
    <div>
      <p className="mb-2">Create new records to store your data.</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Required fields must be filled before saving</li>
        <li>Use Tab to move between fields quickly</li>
        <li>Press Enter to save and create another record</li>
      </ul>
    </div>
  ),

  bulkEdit: (
    <div>
      <p className="mb-2">Edit multiple records at once to save time.</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Select records using checkboxes</li>
        <li>Choose "Edit selected" from the toolbar</li>
        <li>Changes apply to all selected records</li>
      </ul>
    </div>
  ),

  // Import/Export
  importData: (
    <div>
      <p className="mb-2">Bring existing data into your table.</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Supports CSV, Excel, and Google Sheets</li>
        <li>Map columns to fields during import</li>
        <li>Preview data before final import</li>
      </ul>
    </div>
  ),

  exportData: (
    <div>
      <p className="mb-2">Download your data for backup or external use.</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Export respects current view filters</li>
        <li>Choose which fields to include</li>
        <li>Available formats: CSV, Excel, JSON</li>
      </ul>
    </div>
  ),

  // Collaboration
  addComment: (
    <div>
      <p className="mb-2">Communicate with team members about specific records.</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Use @mentions to notify team members</li>
        <li>Comments are visible to all collaborators</li>
        <li>Add context and ask questions about data</li>
      </ul>
    </div>
  ),

  // Advanced features
  createFormula: (
    <div>
      <p className="mb-2">Calculate values based on other fields.</p>
      <div className="space-y-1 text-xs">
        <div><strong>Math:</strong> {'{Price} * {Quantity}'}</div>
        <div><strong>Text:</strong> {'CONCATENATE({First}, " ", {Last})'}</div>
        <div><strong>Logic:</strong> {'IF({Status} = "Done", "✓", "○")'}</div>
      </div>
    </div>
  ),

  linkTables: (
    <div>
      <p className="mb-2">Connect records between tables to create relationships.</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Link customers to orders, tasks to projects</li>
        <li>Use lookup fields to display linked data</li>
        <li>Rollup fields aggregate linked values</li>
      </ul>
    </div>
  ),

  // Keyboard shortcuts
  keyboardShortcuts: (
    <div>
      <p className="mb-2">Speed up your workflow with keyboard shortcuts.</p>
      <div className="space-y-1 text-xs">
        <div><strong>Ctrl+Z:</strong> Undo last action</div>
        <div><strong>Ctrl+Y:</strong> Redo action</div>
        <div><strong>Ctrl+F:</strong> Search in table</div>
        <div><strong>Ctrl+/:</strong> Show all shortcuts</div>
      </div>
    </div>
  )
};

const getContextIcon = (context?: string) => {
  switch (context) {
    case 'field':
      return <Database size={14} />;
    case 'view':
      return <BookOpen size={14} />;
    case 'operation':
      return <Zap size={14} />;
    case 'collaboration':
      return <Users size={14} />;
    case 'general':
      return <Settings size={14} />;
    default:
      return <Info size={14} />;
  }
};

export const InlineHelp: React.FC<InlineHelpProps> = ({
  topic,
  context,
  placement = 'top',
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  // Get content from extended help or fall back to basic help
  const content = ExtendedHelpContent[topic as keyof typeof ExtendedHelpContent] || 
                  HelpContent[topic as keyof typeof HelpContent] ||
                  'Help information not available for this topic.';

  return (
    <HelpTooltip
      content={content}
      placement={placement}
      size={size}
      className={className}
    >
      {showIcon && (
        <div className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help">
          {getContextIcon(context)}
        </div>
      )}
    </HelpTooltip>
  );
};

// Specialized help components for common use cases
export const FieldTypeHelp: React.FC<{ fieldType: string; className?: string }> = ({ 
  fieldType, 
  className 
}) => (
  <InlineHelp
    topic={fieldType}
    context="field"
    className={className}
  />
);

export const ViewHelp: React.FC<{ viewType: string; className?: string }> = ({ 
  viewType, 
  className 
}) => (
  <InlineHelp
    topic={`${viewType}View`}
    context="view"
    className={className}
  />
);

export const OperationHelp: React.FC<{ operation: string; className?: string }> = ({ 
  operation, 
  className 
}) => (
  <InlineHelp
    topic={operation}
    context="operation"
    className={className}
  />
);

// Help panel component for more detailed help
interface HelpPanelProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ title, children, onClose }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center space-x-2">
        <Info className="text-blue-500" size={16} />
        <h4 className="font-medium text-blue-900">{title}</h4>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-blue-400 hover:text-blue-600"
          aria-label="Close help"
        >
          ×
        </button>
      )}
    </div>
    <div className="text-blue-800 text-sm">
      {children}
    </div>
  </div>
);

export default InlineHelp;