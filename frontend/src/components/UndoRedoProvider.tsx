import React, { ReactNode } from 'react';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import { useUndoRedo } from '../hooks/useUndoRedo';

interface UndoRedoProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export const UndoRedoProvider: React.FC<UndoRedoProviderProps> = ({
  children,
  enabled = true,
}) => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  useKeyboardShortcuts({
    shortcuts: [
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
      // Alternative redo shortcut (Ctrl+Y)
      {
        key: 'y',
        ctrlKey: true,
        description: 'Redo (alternative)',
        action: () => {
          if (canRedo) {
            redo();
          }
        },
      },
    ],
    enabled,
  });

  return <>{children}</>;
};