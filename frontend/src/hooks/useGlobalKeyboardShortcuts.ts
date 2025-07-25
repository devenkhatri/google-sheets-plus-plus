import { useEffect } from 'react';
import { useUndoRedo } from './useUndoRedo';
import { useKeyboardShortcuts, commonShortcuts } from './useKeyboardShortcuts';

interface UseGlobalKeyboardShortcutsOptions {
  enabled?: boolean;
  onSave?: () => void;
  onRefresh?: () => void;
  onFind?: () => void;
  onNewRecord?: () => void;
  onHelp?: () => void;
}

export const useGlobalKeyboardShortcuts = ({
  enabled = true,
  onSave,
  onRefresh,
  onFind,
  onNewRecord,
  onHelp,
}: UseGlobalKeyboardShortcutsOptions = {}) => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  const shortcuts = [
    // Undo/Redo shortcuts
    {
      ...commonShortcuts.undo,
      action: () => {
        if (canUndo) {
          undo();
        }
      },
    },
    {
      ...commonShortcuts.redo,
      action: () => {
        if (canRedo) {
          redo();
        }
      },
    },
    {
      ...commonShortcuts.redoAlt,
      action: () => {
        if (canRedo) {
          redo();
        }
      },
    },
    
    // Other global shortcuts
    ...(onSave ? [{
      ...commonShortcuts.save,
      action: onSave,
    }] : []),
    
    ...(onRefresh ? [{
      ...commonShortcuts.refresh,
      action: onRefresh,
      preventDefault: false, // Allow browser refresh as fallback
    }] : []),
    
    ...(onFind ? [{
      ...commonShortcuts.find,
      action: onFind,
    }] : []),
    
    ...(onNewRecord ? [{
      ...commonShortcuts.newRecord,
      action: onNewRecord,
    }] : []),
    
    ...(onHelp ? [{
      ...commonShortcuts.help,
      action: onHelp,
    }] : []),
  ];

  useKeyboardShortcuts({
    shortcuts,
    enabled,
  });

  // Return current state for components that need it
  return {
    canUndo,
    canRedo,
    undo,
    redo,
  };
};

// Hook for getting all available shortcuts (for help modal)
export const useAvailableShortcuts = () => {
  return [
    { ...commonShortcuts.undo, category: 'Editing' },
    { ...commonShortcuts.redo, category: 'Editing' },
    { ...commonShortcuts.redoAlt, category: 'Editing' },
    { ...commonShortcuts.save, category: 'File' },
    { ...commonShortcuts.copy, category: 'Editing' },
    { ...commonShortcuts.paste, category: 'Editing' },
    { ...commonShortcuts.cut, category: 'Editing' },
    { ...commonShortcuts.selectAll, category: 'Selection' },
    { ...commonShortcuts.find, category: 'Navigation' },
    { ...commonShortcuts.newRecord, category: 'Data' },
    { ...commonShortcuts.deleteRecord, category: 'Data' },
    { ...commonShortcuts.escape, category: 'Navigation' },
    { ...commonShortcuts.enter, category: 'Navigation' },
    { ...commonShortcuts.help, category: 'Help' },
    { ...commonShortcuts.refresh, category: 'Navigation' },
  ];
};