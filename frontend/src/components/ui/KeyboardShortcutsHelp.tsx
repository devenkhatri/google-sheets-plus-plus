import React, { useState } from 'react';
import { useAvailableShortcuts } from '../../hooks/useGlobalKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutDisplayProps {
  shortcut: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    description: string;
    category: string;
  };
}

const ShortcutDisplay: React.FC<ShortcutDisplayProps> = ({ shortcut }) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  const formatKey = (key: string) => {
    const keyMap: { [key: string]: string } = {
      'Delete': 'Del',
      'Escape': 'Esc',
      'Enter': '↵',
      ' ': 'Space',
    };
    return keyMap[key] || key.toUpperCase();
  };

  const modifierKeys = [];
  
  if (shortcut.ctrlKey) {
    modifierKeys.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.metaKey) {
    modifierKeys.push('⌘');
  }
  if (shortcut.altKey) {
    modifierKeys.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shiftKey) {
    modifierKeys.push(isMac ? '⇧' : 'Shift');
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
      <span className="text-sm text-gray-700">{shortcut.description}</span>
      <div className="flex items-center space-x-1">
        {modifierKeys.map((modifier, index) => (
          <React.Fragment key={index}>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
              {modifier}
            </kbd>
            <span className="text-gray-400">+</span>
          </React.Fragment>
        ))}
        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
          {formatKey(shortcut.key)}
        </kbd>
      </div>
    </div>
  );
};

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  const shortcuts = useAvailableShortcuts();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  // Group shortcuts by category
  const categories = ['All', ...Array.from(new Set(shortcuts.map(s => s.category)))];
  const filteredShortcuts = selectedCategory === 'All' 
    ? shortcuts 
    : shortcuts.filter(s => s.category === selectedCategory);

  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as { [key: string]: typeof shortcuts });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="shortcuts-title" className="text-xl font-semibold text-gray-900">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close shortcuts help"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="overflow-y-auto max-h-96">
          {selectedCategory === 'All' ? (
            Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category} className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wide">
                  {category}
                </h3>
                <div className="space-y-1">
                  {categoryShortcuts.map((shortcut, index) => (
                    <ShortcutDisplay key={index} shortcut={shortcut} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4">
              <div className="space-y-1">
                {filteredShortcuts.map((shortcut, index) => (
                  <ShortcutDisplay key={index} shortcut={shortcut} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            Press <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">?</kbd> to toggle this help
          </p>
        </div>
      </div>
    </div>
  );
};

// Hook to manage the help modal
export const useKeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(!isOpen);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};