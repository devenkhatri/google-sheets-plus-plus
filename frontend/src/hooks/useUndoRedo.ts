import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { commandService } from '../services/commandService';
import {
  selectCanUndo,
  selectCanRedo,
  selectUndoStackSize,
  selectRedoStackSize,
  selectIsExecuting,
} from '../store/slices/undoRedoSlice';

export interface UseUndoRedoReturn {
  canUndo: boolean;
  canRedo: boolean;
  undoStackSize: number;
  redoStackSize: number;
  isExecuting: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
}

export const useUndoRedo = (): UseUndoRedoReturn => {
  const canUndo = useSelector((state: RootState) => selectCanUndo(state));
  const canRedo = useSelector((state: RootState) => selectCanRedo(state));
  const undoStackSize = useSelector((state: RootState) => selectUndoStackSize(state));
  const redoStackSize = useSelector((state: RootState) => selectRedoStackSize(state));
  const isExecuting = useSelector((state: RootState) => selectIsExecuting(state));

  const undo = useCallback(async () => {
    try {
      await commandService.undo();
    } catch (error) {
      console.error('Undo failed:', error);
      // You might want to show a toast notification here
    }
  }, []);

  const redo = useCallback(async () => {
    try {
      await commandService.redo();
    } catch (error) {
      console.error('Redo failed:', error);
      // You might want to show a toast notification here
    }
  }, []);

  const getUndoDescription = useCallback(() => {
    return commandService.getUndoDescription();
  }, []);

  const getRedoDescription = useCallback(() => {
    return commandService.getRedoDescription();
  }, []);

  return {
    canUndo,
    canRedo,
    undoStackSize,
    redoStackSize,
    isExecuting,
    undo,
    redo,
    getUndoDescription,
    getRedoDescription,
  };
};