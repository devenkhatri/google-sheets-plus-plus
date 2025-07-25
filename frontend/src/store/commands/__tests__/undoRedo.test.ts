import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import undoRedoReducer, {
  executeCommand,
  undoCommand,
  redoCommand,
  clearHistory,
  selectCanUndo,
  selectCanRedo,
  selectUndoStackSize,
  selectRedoStackSize,
  selectLastCommand,
  selectNextRedoCommand,
} from '../../slices/undoRedoSlice';
import { 
  CreateRecordCommand,
  UpdateRecordCommand,
  // DeleteRecordCommand,
  // BulkUpdateCommand,
  // BulkCreateCommand,
} from '../recordCommands';
import { 
  CreateTableCommand,
  // UpdateTableCommand,
  // DeleteTableCommand,
} from '../tableCommands';
// import { 
//   CreateFieldCommand,
//   UpdateFieldCommand,
//   DeleteFieldCommand,
// } from '../fieldCommands';

// Mock command for testing
class MockCommand {
  id = 'test-command';
  type = 'MOCK';
  timestamp = Date.now();
  description = 'Mock command';
  executed = false;
  undone = false;

  execute() {
    this.executed = true;
  }

  undo() {
    this.undone = true;
  }

  canUndo() {
    return true;
  }

  canRedo() {
    return true;
  }
}

describe('Undo/Redo Functionality', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        undoRedo: undoRedoReducer,
      },
    });
  });

  describe('Command Execution', () => {
    it('should add command to undo stack when executed', () => {
      const command = new MockCommand();
      
      store.dispatch(executeCommand(command));
      
      const state = store.getState();
      expect(state.undoRedo.undoStack).toHaveLength(1);
      expect(state.undoRedo.undoStack[0]).toBe(command);
      expect(state.undoRedo.redoStack).toHaveLength(0);
    });

    it('should clear redo stack when new command is executed', () => {
      const command1 = new MockCommand();
      const command2 = new MockCommand();
      
      // Execute and undo first command
      store.dispatch(executeCommand(command1));
      store.dispatch(undoCommand());
      
      // Verify redo stack has the command
      expect(store.getState().undoRedo.redoStack).toHaveLength(1);
      
      // Execute new command
      store.dispatch(executeCommand(command2));
      
      // Redo stack should be cleared
      const state = store.getState();
      expect(state.undoRedo.redoStack).toHaveLength(0);
      expect(state.undoRedo.undoStack).toHaveLength(1);
      expect(state.undoRedo.undoStack[0]).toBe(command2);
    });
  });

  describe('Undo Functionality', () => {
    it('should move command from undo to redo stack', () => {
      const command = new MockCommand();
      
      store.dispatch(executeCommand(command));
      store.dispatch(undoCommand());
      
      const state = store.getState();
      expect(state.undoRedo.undoStack).toHaveLength(0);
      expect(state.undoRedo.redoStack).toHaveLength(1);
      expect(state.undoRedo.redoStack[0]).toBe(command);
    });

    it('should not undo when stack is empty', () => {
      const initialState = store.getState();
      
      store.dispatch(undoCommand());
      
      const state = store.getState();
      expect(state).toEqual(initialState);
    });
  });

  describe('Redo Functionality', () => {
    it('should move command from redo to undo stack', () => {
      const command = new MockCommand();
      
      // Execute, undo, then redo
      store.dispatch(executeCommand(command));
      store.dispatch(undoCommand());
      store.dispatch(redoCommand());
      
      const state = store.getState();
      expect(state.undoRedo.undoStack).toHaveLength(1);
      expect(state.undoRedo.undoStack[0]).toBe(command);
      expect(state.undoRedo.redoStack).toHaveLength(0);
    });

    it('should not redo when stack is empty', () => {
      const initialState = store.getState();
      
      store.dispatch(redoCommand());
      
      const state = store.getState();
      expect(state).toEqual(initialState);
    });
  });

  describe('Stack Size Management', () => {
    it('should maintain max stack size', () => {
      const maxSize = 3;
      
      // Create a new store with smaller max size for testing
      const testStore = configureStore({
        reducer: {
          undoRedo: undoRedoReducer,
        },
        preloadedState: {
          undoRedo: {
            undoStack: [],
            redoStack: [],
            maxStackSize: maxSize,
            isExecuting: false,
          },
        },
      });
      
      // Add more commands than max size
      for (let i = 0; i < maxSize + 2; i++) {
        const command = new MockCommand();
        command.id = `command-${i}`;
        testStore.dispatch(executeCommand(command));
      }
      
      const state = testStore.getState();
      expect(state.undoRedo.undoStack.length).toBeLessThanOrEqual(maxSize);
    });
  });

  describe('Selectors', () => {
    it('should correctly determine if undo is available', () => {
      let state = store.getState();
      expect(selectCanUndo(state)).toBe(false);
      
      const command = new MockCommand();
      store.dispatch(executeCommand(command));
      
      state = store.getState();
      expect(selectCanUndo(state)).toBe(true);
    });

    it('should correctly determine if redo is available', () => {
      let state = store.getState();
      expect(selectCanRedo(state)).toBe(false);
      
      const command = new MockCommand();
      store.dispatch(executeCommand(command));
      store.dispatch(undoCommand());
      
      state = store.getState();
      expect(selectCanRedo(state)).toBe(true);
    });

    it('should prevent undo/redo when executing', () => {
      const command = new MockCommand();
      store.dispatch(executeCommand(command));
      
      // Simulate execution state
      store.dispatch({ type: 'undoRedo/setExecuting', payload: true });
      
      const state = store.getState();
      expect(selectCanUndo(state)).toBe(false);
      expect(selectCanRedo(state)).toBe(false);
    });
  });

  describe('Clear History', () => {
    it('should clear both stacks', () => {
      const command1 = new MockCommand();
      const command2 = new MockCommand();
      
      store.dispatch(executeCommand(command1));
      store.dispatch(executeCommand(command2));
      store.dispatch(undoCommand());
      
      // Verify both stacks have content
      let state = store.getState();
      expect(state.undoRedo.undoStack.length).toBeGreaterThan(0);
      expect(state.undoRedo.redoStack.length).toBeGreaterThan(0);
      
      store.dispatch(clearHistory());
      
      state = store.getState();
      expect(state.undoRedo.undoStack).toHaveLength(0);
      expect(state.undoRedo.redoStack).toHaveLength(0);
    });
  });

  describe('Additional Selectors', () => {
    it('should return correct stack sizes', () => {
      const command1 = new MockCommand();
      const command2 = new MockCommand();
      
      store.dispatch(executeCommand(command1));
      store.dispatch(executeCommand(command2));
      
      let state = store.getState();
      expect(selectUndoStackSize(state)).toBe(2);
      expect(selectRedoStackSize(state)).toBe(0);
      
      store.dispatch(undoCommand());
      
      state = store.getState();
      expect(selectUndoStackSize(state)).toBe(1);
      expect(selectRedoStackSize(state)).toBe(1);
    });

    it('should return correct last and next commands', () => {
      const command1 = new MockCommand();
      command1.description = 'First command';
      const command2 = new MockCommand();
      command2.description = 'Second command';
      
      store.dispatch(executeCommand(command1));
      store.dispatch(executeCommand(command2));
      
      let state = store.getState();
      expect(selectLastCommand(state)).toBe(command2);
      expect(selectNextRedoCommand(state)).toBeUndefined();
      
      store.dispatch(undoCommand());
      
      state = store.getState();
      expect(selectLastCommand(state)).toBe(command1);
      expect(selectNextRedoCommand(state)).toBe(command2);
    });
  });

  describe('Command Integration Tests', () => {
    let mockContext: any;

    beforeEach(() => {
      const mockDispatch = vi.fn().mockImplementation(() => ({
        unwrap: vi.fn().mockResolvedValue({ data: { record: { id: 'test-id' }, table: { id: 'new-table-id' } } })
      }));
      
      mockContext = {
        dispatch: mockDispatch,
        getState: () => ({
          records: { records: [{ id: 'test-id', table_id: 'table-1' }] },
          tables: { tables: [{ id: 'table-1', base_id: 'base-1', name: 'Test Table' }] },
        }),
      };
    });

    it('should handle CreateRecordCommand execution and undo', async () => {
      const command = new CreateRecordCommand('table-1', { name: 'Test' }, mockContext);
      
      await command.execute();
      expect(mockContext.dispatch).toHaveBeenCalled();
      
      await command.undo();
      expect(mockContext.dispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle UpdateRecordCommand execution and undo', async () => {
      const command = new UpdateRecordCommand(
        'record-1',
        { name: 'New Name' },
        { name: 'Old Name' },
        mockContext
      );
      
      await command.execute();
      expect(mockContext.dispatch).toHaveBeenCalled();
      
      await command.undo();
      expect(mockContext.dispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle CreateTableCommand execution and undo', async () => {
      const command = new CreateTableCommand('base-1', { name: 'New Table' }, mockContext);
      
      await command.execute();
      expect(mockContext.dispatch).toHaveBeenCalled();
      
      await command.undo();
      expect(mockContext.dispatch).toHaveBeenCalledTimes(2);
    });
  });
});