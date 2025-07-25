import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useKeyboardShortcuts, commonShortcuts } from '../useKeyboardShortcuts';
import { useGlobalKeyboardShortcuts } from '../useGlobalKeyboardShortcuts';

// Mock the useUndoRedo hook
jest.mock('../useUndoRedo', () => ({
  useUndoRedo: () => ({
    undo: jest.fn(),
    redo: jest.fn(),
    canUndo: true,
    canRedo: true,
  }),
}));

// Test component that uses keyboard shortcuts
const TestComponent: React.FC<{ onSave?: () => void; onUndo?: () => void }> = ({ 
  onSave, 
  onUndo 
}) => {
  const shortcuts = [
    ...(onSave ? [{
      ...commonShortcuts.save,
      action: onSave,
    }] : []),
    ...(onUndo ? [{
      ...commonShortcuts.undo,
      action: onUndo,
    }] : []),
  ];

  useKeyboardShortcuts({ shortcuts });

  return <div>Test Component</div>;
};

// Test component that uses global shortcuts
const GlobalShortcutsTestComponent: React.FC<{
  onSave?: () => void;
  onHelp?: () => void;
}> = ({ onSave, onHelp }) => {
  useGlobalKeyboardShortcuts({
    onSave,
    onHelp,
  });

  return <div>Global Shortcuts Test Component</div>;
};

describe('useKeyboardShortcuts', () => {
  it('should trigger save action on Ctrl+S', () => {
    const onSave = jest.fn();
    render(<TestComponent onSave={onSave} />);

    fireEvent.keyDown(document, {
      key: 's',
      ctrlKey: true,
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should trigger undo action on Ctrl+Z', () => {
    const onUndo = jest.fn();
    render(<TestComponent onUndo={onUndo} />);

    fireEvent.keyDown(document, {
      key: 'z',
      ctrlKey: true,
    });

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('should not trigger shortcuts when typing in input fields', () => {
    const onSave = jest.fn();
    render(
      <div>
        <TestComponent onSave={onSave} />
        <input data-testid="text-input" />
      </div>
    );

    const input = screen.getByTestId('text-input');
    input.focus();

    fireEvent.keyDown(input, {
      key: 's',
      ctrlKey: true,
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should not trigger shortcuts when disabled', () => {
    const onSave = jest.fn();
    
    const DisabledShortcutsComponent = () => {
      useKeyboardShortcuts({
        shortcuts: [{
          ...commonShortcuts.save,
          action: onSave,
        }],
        enabled: false,
      });
      return <div>Disabled Shortcuts</div>;
    };

    render(<DisabledShortcutsComponent />);

    fireEvent.keyDown(document, {
      key: 's',
      ctrlKey: true,
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should handle modifier key combinations correctly', () => {
    const onRedo = jest.fn();
    
    const RedoTestComponent = () => {
      useKeyboardShortcuts({
        shortcuts: [{
          ...commonShortcuts.redo,
          action: onRedo,
        }],
      });
      return <div>Redo Test</div>;
    };

    render(<RedoTestComponent />);

    // Test Ctrl+Shift+Z
    fireEvent.keyDown(document, {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
    });

    expect(onRedo).toHaveBeenCalledTimes(1);
  });
});

describe('useGlobalKeyboardShortcuts', () => {
  it('should integrate undo/redo shortcuts', () => {
    const onSave = jest.fn();
    render(<GlobalShortcutsTestComponent onSave={onSave} />);

    // Test save shortcut
    fireEvent.keyDown(document, {
      key: 's',
      ctrlKey: true,
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should handle help shortcut', () => {
    const onHelp = jest.fn();
    render(<GlobalShortcutsTestComponent onHelp={onHelp} />);

    fireEvent.keyDown(document, {
      key: '?',
      shiftKey: true,
    });

    expect(onHelp).toHaveBeenCalledTimes(1);
  });

  it('should prevent default behavior by default', () => {
    const onSave = jest.fn();
    render(<GlobalShortcutsTestComponent onSave={onSave} />);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });
    
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    
    fireEvent(document, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

describe('commonShortcuts', () => {
  it('should contain all expected shortcuts', () => {
    expect(commonShortcuts).toHaveProperty('save');
    expect(commonShortcuts).toHaveProperty('undo');
    expect(commonShortcuts).toHaveProperty('redo');
    expect(commonShortcuts).toHaveProperty('redoAlt');
    expect(commonShortcuts).toHaveProperty('copy');
    expect(commonShortcuts).toHaveProperty('paste');
    expect(commonShortcuts).toHaveProperty('cut');
    expect(commonShortcuts).toHaveProperty('selectAll');
    expect(commonShortcuts).toHaveProperty('find');
    expect(commonShortcuts).toHaveProperty('newRecord');
    expect(commonShortcuts).toHaveProperty('deleteRecord');
    expect(commonShortcuts).toHaveProperty('escape');
    expect(commonShortcuts).toHaveProperty('enter');
    expect(commonShortcuts).toHaveProperty('help');
    expect(commonShortcuts).toHaveProperty('refresh');
  });

  it('should have correct key combinations', () => {
    expect(commonShortcuts.save).toEqual({
      key: 's',
      ctrlKey: true,
      description: 'Save',
    });

    expect(commonShortcuts.undo).toEqual({
      key: 'z',
      ctrlKey: true,
      description: 'Undo',
    });

    expect(commonShortcuts.redo).toEqual({
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      description: 'Redo',
    });
  });
});