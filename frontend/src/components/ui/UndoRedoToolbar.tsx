import React, { useState } from 'react';
import { useUndoRedo } from '../../hooks/useUndoRedo';

interface UndoRedoToolbarProps {
  className?: string;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
  orientation?: 'horizontal' | 'vertical';
  showTooltips?: boolean;
  showStackInfo?: boolean;
}

export const UndoRedoToolbar: React.FC<UndoRedoToolbarProps> = ({
  className = '',
  showLabels = false,
  size = 'medium',
  orientation = 'horizontal',
  showTooltips = true,
  showStackInfo = false,
}) => {
  const {
    canUndo,
    canRedo,
    undo,
    redo,
    getUndoDescription,
    getRedoDescription,
    isExecuting,
    undoStackSize,
    redoStackSize,
  } = useUndoRedo();

  const [showUndoTooltip, setShowUndoTooltip] = useState(false);
  const [showRedoTooltip, setShowRedoTooltip] = useState(false);

  const sizeClasses = {
    small: 'h-6 w-6 text-xs',
    medium: 'h-8 w-8 text-sm',
    large: 'h-10 w-10 text-base',
  };

  const buttonClass = `
    relative inline-flex items-center justify-center
    ${sizeClasses[size]}
    border border-gray-300 rounded
    bg-white hover:bg-gray-50 active:bg-gray-100
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    transition-all duration-200
    group
  `;

  const containerClass = orientation === 'vertical' 
    ? `flex flex-col items-center space-y-1 ${className}`
    : `flex items-center space-x-1 ${className}`;

  const undoTooltip = showTooltips ? (getUndoDescription() || 'Undo (Ctrl+Z)') : undefined;
  const redoTooltip = showTooltips ? (getRedoDescription() || 'Redo (Ctrl+Shift+Z)') : undefined;

  return (
    <div className={containerClass} role="toolbar" aria-label="Undo/Redo actions">
      {/* Undo Button */}
      <div className="relative">
        <button
          onClick={undo}
          disabled={!canUndo || isExecuting}
          className={buttonClass}
          title={undoTooltip}
          aria-label={`Undo: ${getUndoDescription() || 'No action to undo'}`}
          onMouseEnter={() => setShowUndoTooltip(true)}
          onMouseLeave={() => setShowUndoTooltip(false)}
          onFocus={() => setShowUndoTooltip(true)}
          onBlur={() => setShowUndoTooltip(false)}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
          {showLabels && <span className="ml-1">Undo</span>}
          
          {/* Stack size indicator */}
          {showStackInfo && undoStackSize > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {undoStackSize > 9 ? '9+' : undoStackSize}
            </span>
          )}
        </button>

        {/* Tooltip */}
        {showUndoTooltip && undoTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
            {undoTooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>

      {/* Redo Button */}
      <div className="relative">
        <button
          onClick={redo}
          disabled={!canRedo || isExecuting}
          className={buttonClass}
          title={redoTooltip}
          aria-label={`Redo: ${getRedoDescription() || 'No action to redo'}`}
          onMouseEnter={() => setShowRedoTooltip(true)}
          onMouseLeave={() => setShowRedoTooltip(false)}
          onFocus={() => setShowRedoTooltip(true)}
          onBlur={() => setShowRedoTooltip(false)}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
            />
          </svg>
          {showLabels && <span className="ml-1">Redo</span>}
          
          {/* Stack size indicator */}
          {showStackInfo && redoStackSize > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {redoStackSize > 9 ? '9+' : redoStackSize}
            </span>
          )}
        </button>

        {/* Tooltip */}
        {showRedoTooltip && redoTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
            {redoTooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>

      {/* Execution Status */}
      {isExecuting && (
        <div className="flex items-center ml-2" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" aria-hidden="true"></div>
          <span className="ml-1 text-sm text-gray-600">Processing...</span>
        </div>
      )}
    </div>
  );
};