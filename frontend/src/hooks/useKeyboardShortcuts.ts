import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  target?: HTMLElement | Document;
}

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
  target = document,
}: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when user is typing in input fields
      const activeElement = document.activeElement;
      const isInputField = 
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.getAttribute('contenteditable') === 'true';

      if (isInputField) return;

      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey;
        const metaMatch = !!shortcut.metaKey === event.metaKey;
        const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
        const altMatch = !!shortcut.altKey === event.altKey;

        return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch;
      });

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault !== false) {
          event.preventDefault();
        }
        matchingShortcut.action();
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    target.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [handleKeyDown, enabled, target]);
};

// Common keyboard shortcuts
export const commonShortcuts = {
  save: { key: 's', ctrlKey: true, description: 'Save' },
  undo: { key: 'z', ctrlKey: true, description: 'Undo' },
  redo: { key: 'z', ctrlKey: true, shiftKey: true, description: 'Redo' },
  redoAlt: { key: 'y', ctrlKey: true, description: 'Redo (Alt)' }, // Alternative redo shortcut
  copy: { key: 'c', ctrlKey: true, description: 'Copy' },
  paste: { key: 'v', ctrlKey: true, description: 'Paste' },
  cut: { key: 'x', ctrlKey: true, description: 'Cut' },
  selectAll: { key: 'a', ctrlKey: true, description: 'Select All' },
  find: { key: 'f', ctrlKey: true, description: 'Find' },
  newRecord: { key: 'n', ctrlKey: true, description: 'New Record' },
  deleteRecord: { key: 'Delete', description: 'Delete Record' },
  escape: { key: 'Escape', description: 'Cancel/Close' },
  enter: { key: 'Enter', description: 'Confirm/Submit' },
  help: { key: '?', shiftKey: true, description: 'Show Help' },
  refresh: { key: 'r', ctrlKey: true, description: 'Refresh' },
};