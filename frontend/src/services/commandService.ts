import { store } from '../store';
import { Command, CommandContext } from '../store/commands/types';
import {
  executeCommand,
  setExecuting,
  undoCommand,
  redoCommand,
  selectCanUndo,
  selectCanRedo,
  selectLastCommand,
  selectNextRedoCommand,
} from '../store/slices/undoRedoSlice';

class CommandService {
  private context: CommandContext;

  constructor() {
    this.context = {
      dispatch: store.dispatch,
      getState: () => store.getState(),
    };
  }

  /**
   * Execute a command and add it to the undo stack
   */
  async executeCommand(command: Command): Promise<void> {
    const state = store.getState();
    if (state.undoRedo.isExecuting) {
      throw new Error('Another command is currently executing');
    }

    store.dispatch(setExecuting(true));

    try {
      await command.execute();
      store.dispatch(executeCommand(command));
    } catch (error) {
      console.error('Command execution failed:', error);
      throw error;
    } finally {
      store.dispatch(setExecuting(false));
    }
  }

  /**
   * Undo the last command
   */
  async undo(): Promise<void> {
    const state = store.getState();
    
    if (!selectCanUndo(state)) {
      throw new Error('Cannot undo: No commands available or currently executing');
    }

    const command = selectLastCommand(state);
    if (!command || !command.canUndo()) {
      throw new Error('Cannot undo: Command is not undoable');
    }

    store.dispatch(setExecuting(true));

    try {
      await command.undo();
      store.dispatch(undoCommand());
    } catch (error) {
      console.error('Undo failed:', error);
      throw error;
    } finally {
      store.dispatch(setExecuting(false));
    }
  }

  /**
   * Redo the last undone command
   */
  async redo(): Promise<void> {
    const state = store.getState();
    
    if (!selectCanRedo(state)) {
      throw new Error('Cannot redo: No commands available or currently executing');
    }

    const command = selectNextRedoCommand(state);
    if (!command || !command.canRedo()) {
      throw new Error('Cannot redo: Command is not redoable');
    }

    store.dispatch(setExecuting(true));

    try {
      await command.execute();
      store.dispatch(redoCommand());
    } catch (error) {
      console.error('Redo failed:', error);
      throw error;
    } finally {
      store.dispatch(setExecuting(false));
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return selectCanUndo(store.getState());
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return selectCanRedo(store.getState());
  }

  /**
   * Get the command context for creating new commands
   */
  getContext(): CommandContext {
    return this.context;
  }

  /**
   * Get description of the last command that can be undone
   */
  getUndoDescription(): string | null {
    const state = store.getState();
    const command = selectLastCommand(state);
    return command ? command.description : null;
  }

  /**
   * Get description of the next command that can be redone
   */
  getRedoDescription(): string | null {
    const state = store.getState();
    const command = selectNextRedoCommand(state);
    return command ? command.description : null;
  }
}

export const commandService = new CommandService();