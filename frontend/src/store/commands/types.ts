// Command pattern types for undo/redo functionality

export interface Command {
  id: string;
  type: string;
  timestamp: number;
  description: string;
  execute(): Promise<void> | void;
  undo(): Promise<void> | void;
  canUndo(): boolean;
  canRedo(): boolean;
}

export interface CommandContext {
  dispatch: any;
  getState: () => any;
}

export interface UndoRedoState {
  undoStack: Command[];
  redoStack: Command[];
  maxStackSize: number;
  isExecuting: boolean;
}

export interface CommandResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Base command class
export abstract class BaseCommand implements Command {
  public readonly id: string;
  public readonly type: string;
  public readonly timestamp: number;
  public readonly description: string;
  protected context: CommandContext;

  constructor(
    type: string,
    description: string,
    context: CommandContext
  ) {
    this.id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.description = description;
    this.timestamp = Date.now();
    this.context = context;
  }

  abstract execute(): Promise<void> | void;
  abstract undo(): Promise<void> | void;

  canUndo(): boolean {
    return true;
  }

  canRedo(): boolean {
    return true;
  }
}