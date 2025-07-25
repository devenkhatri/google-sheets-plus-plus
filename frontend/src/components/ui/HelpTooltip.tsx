import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  title,
  placement = 'top',
  size = 'md',
  className = '',
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'w-48 text-xs',
    md: 'w-64 text-sm',
    lg: 'w-80 text-sm'
  };

  const placementClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800'
  };

  const showTooltip = isVisible || isHovered;

  return (
    <div className={`relative inline-block ${className}`}>
      {children ? (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => setIsVisible(!isVisible)}
          className="cursor-help"
        >
          {children}
        </div>
      ) : (
        <button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => setIsVisible(!isVisible)}
          className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help"
          aria-label="Help"
        >
          <HelpCircle size={16} />
        </button>
      )}

      {showTooltip && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-25 md:hidden"
            onClick={() => setIsVisible(false)}
          />
          
          {/* Tooltip */}
          <div
            className={`
              absolute z-50 px-3 py-2 bg-gray-800 text-white rounded-lg shadow-lg
              ${sizeClasses[size]}
              ${placementClasses[placement]}
              ${isVisible ? 'block' : 'hidden md:block'}
            `}
            role="tooltip"
          >
            {/* Close button for mobile */}
            {isVisible && (
              <button
                onClick={() => setIsVisible(false)}
                className="absolute top-1 right-1 p-1 text-gray-300 hover:text-white md:hidden"
                aria-label="Close help"
              >
                <X size={12} />
              </button>
            )}

            {/* Title */}
            {title && (
              <div className="font-semibold mb-1 pr-6 md:pr-0">
                {title}
              </div>
            )}

            {/* Content */}
            <div className="text-gray-100">
              {typeof content === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: content }} />
              ) : (
                content
              )}
            </div>

            {/* Arrow */}
            <div
              className={`absolute w-0 h-0 border-4 ${arrowClasses[placement]} hidden md:block`}
            />
          </div>
        </>
      )}
    </div>
  );
};

// Predefined help content for common UI elements
export const HelpContent = {
  // Field types
  textField: "Text fields store single-line or multi-line text. Use for names, descriptions, notes, and other textual information.",
  numberField: "Number fields store numeric values. Configure decimal places, formatting, and validation rules.",
  dateField: "Date fields store dates and times. Choose between date-only or date-time formats.",
  singleSelect: "Single select fields allow choosing one option from a predefined list. Great for status, priority, or category fields.",
  multiSelect: "Multi-select fields allow choosing multiple options from a predefined list. Perfect for tags, skills, or categories.",
  checkbox: "Checkbox fields store true/false values. Use for completion status, flags, or yes/no questions.",
  attachment: "Attachment fields store files and images. Supports multiple file types with preview capabilities.",
  formula: "Formula fields calculate values based on other fields using functions and expressions.",
  lookup: "Lookup fields display values from linked records in other tables.",
  rollup: "Rollup fields aggregate values from multiple linked records using functions like SUM, COUNT, or AVERAGE.",
  link: "Link fields connect records between tables, creating relationships in your data.",

  // Views
  gridView: "Grid view displays data in a spreadsheet-like table format. Best for data entry and detailed editing.",
  kanbanView: "Kanban view organizes records as cards in columns based on a single-select field. Perfect for workflow management.",
  calendarView: "Calendar view displays records on a calendar based on date fields. Great for scheduling and timeline management.",
  galleryView: "Gallery view shows records as cards with prominent image display. Ideal for visual content and portfolios.",

  // Operations
  filtering: "Filters show only records that match specific conditions. Combine multiple filters with AND/OR logic.",
  sorting: "Sorting arranges records in ascending or descending order. Use multiple sort levels for complex organization.",
  grouping: "Grouping organizes records into sections based on field values. Collapse groups to focus on specific data.",
  
  // Collaboration
  sharing: "Share bases with team members by setting appropriate permission levels: Viewer, Commenter, or Editor.",
  comments: "Add comments to records for team communication and context. Mention team members with @ to notify them.",
  
  // Advanced features
  automation: "Automation rules trigger actions when conditions are met. Set up workflows to save time and ensure consistency.",
  webhooks: "Webhooks send real-time notifications to external systems when data changes.",
  apiAccess: "API access allows external applications to read and write data programmatically using REST endpoints."
};

// Helper component for field-specific help
interface FieldHelpProps {
  fieldType: keyof typeof HelpContent;
  className?: string;
}

export const FieldHelp: React.FC<FieldHelpProps> = ({ fieldType, className }) => (
  <HelpTooltip
    content={HelpContent[fieldType]}
    className={className}
  />
);

export default HelpTooltip;