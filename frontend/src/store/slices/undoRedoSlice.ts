import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Command, UndoRedoState } from '../commands/types';

const initialState: UndoRedoState = {
  undoStack: [],
  redoStack: [],
  maxStackSize: 50,
  isExecuting: false,
};

const undoRedoSlice = createSlice({
  name: 'undoRedo',
  initialState,
  reducers: {
    executeCommand: (state, action: PayloadAction<Command>) => {
      // Clear redo stack when a new command is executed
      state.redoStack = [];
      
      // Add command to undo stack
      state.undoStack.push(action.payload);
      
      // Maintain max stack size
      if (state.undoStack.length > state.maxStackSize) {
        state.undoStack.shift();
      }
    },
    
    setExecuting: (state, action: PayloadAction<boolean>) => {
      state.isExecuting = action.payload;
    },
    
    undoCommand: (state) => {
      if (state.undoStack.length === 0) return;
      
      const command = state.undoStack.pop();
      if (command) {
        state.redoStack.push(command);
        
        // Maintain max stack size for redo
        if (state.redoStack.length > state.maxStackSize) {
          state.redoStack.shift();
        }
      }
    },
    
    redoCommand: (state) => {
      if (state.redoStack.length === 0) return;
      
      const command = state.redoStack.pop();
      if (command) {
        state.undoStack.push(command);
        
        // Maintain max stack size for undo
        if (state.undoStack.length > state.maxStackSize) {
          state.undoStack.shift();
        }
      }
    },
    
    clearHistory: (state) => {
      state.undoStack = [];
      state.redoStack = [];
    },
    
    setMaxStackSize: (state, action: PayloadAction<number>) => {
      state.maxStackSize = action.payload;
      
      // Trim stacks if they exceed new max size
      if (state.undoStack.length > state.maxStackSize) {
        state.undoStack = state.undoStack.slice(-state.maxStackSize);
      }
      if (state.redoStack.length > state.maxStackSize) {
        state.redoStack = state.redoStack.slice(-state.maxStackSize);
      }
    },
  },
});

export const {
  executeCommand,
  setExecuting,
  undoCommand,
  redoCommand,
  clearHistory,
  setMaxStackSize,
} = undoRedoSlice.actions;

export default undoRedoSlice.reducer;

// Selectors
export const selectCanUndo = (state: { undoRedo: UndoRedoState }) => 
  state.undoRedo.undoStack.length > 0 && !state.undoRedo.isExecuting;

export const selectCanRedo = (state: { undoRedo: UndoRedoState }) => 
  state.undoRedo.redoStack.length > 0 && !state.undoRedo.isExecuting;

export const selectUndoStackSize = (state: { undoRedo: UndoRedoState }) => 
  state.undoRedo.undoStack.length;

export const selectRedoStackSize = (state: { undoRedo: UndoRedoState }) => 
  state.undoRedo.redoStack.length;

export const selectLastCommand = (state: { undoRedo: UndoRedoState }) => 
  state.undoRedo.undoStack[state.undoRedo.undoStack.length - 1];

export const selectNextRedoCommand = (state: { undoRedo: UndoRedoState }) => 
  state.undoRedo.redoStack[state.undoRedo.redoStack.length - 1];

export const selectIsExecuting = (state: { undoRedo: UndoRedoState }) => 
  state.undoRedo.isExecuting;