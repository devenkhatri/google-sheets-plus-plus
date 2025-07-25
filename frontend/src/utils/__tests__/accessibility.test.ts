import { vi } from 'vitest';
import { 
  getButtonAccessibility, 
  getInputAccessibility,
  getTableAccessibility,
  getDialogAccessibility,
  FocusManager,
  KeyboardNavigation 
} from '../accessibility';

describe('Accessibility Utilities', () => {
  describe('getButtonAccessibility', () => {
    it('should return basic button accessibility attributes', () => {
      const attrs = getButtonAccessibility('Save');
      
      expect(attrs).toEqual({
        'aria-label': 'Save',
        'aria-disabled': undefined,
        'aria-pressed': undefined,
        'aria-expanded': undefined,
        'aria-controls': undefined,
        'aria-describedby': undefined,
        role: 'button',
        tabIndex: 0,
      });
    });

    it('should handle disabled state', () => {
      const attrs = getButtonAccessibility('Save', { disabled: true });
      
      expect(attrs['aria-disabled']).toBe(true);
      expect(attrs.tabIndex).toBe(-1);
    });

    it('should handle pressed state', () => {
      const attrs = getButtonAccessibility('Toggle', { pressed: true });
      
      expect(attrs['aria-pressed']).toBe(true);
    });

    it('should handle expanded state', () => {
      const attrs = getButtonAccessibility('Menu', { expanded: true, controls: 'menu-list' });
      
      expect(attrs['aria-expanded']).toBe(true);
      expect(attrs['aria-controls']).toBe('menu-list');
    });
  });

  describe('getInputAccessibility', () => {
    it('should return basic input accessibility attributes', () => {
      const attrs = getInputAccessibility('Email');
      
      expect(attrs).toEqual({
        'aria-label': 'Email',
        'aria-required': undefined,
        'aria-invalid': undefined,
        'aria-readonly': undefined,
        'aria-describedby': undefined,
        placeholder: undefined,
      });
    });

    it('should handle required and invalid states', () => {
      const attrs = getInputAccessibility('Email', { 
        required: true, 
        invalid: true,
        describedBy: 'email-error'
      });
      
      expect(attrs['aria-required']).toBe(true);
      expect(attrs['aria-invalid']).toBe(true);
      expect(attrs['aria-describedby']).toBe('email-error');
    });
  });

  describe('getTableAccessibility', () => {
    it('should return table accessibility attributes', () => {
      const attrs = getTableAccessibility('Data table', {
        rowCount: 10,
        colCount: 5,
      });
      
      expect(attrs).toEqual({
        'aria-label': 'Data table',
        'aria-describedby': undefined,
        'aria-rowcount': 10,
        'aria-colcount': 5,
        role: 'table',
      });
    });
  });

  describe('getDialogAccessibility', () => {
    it('should return dialog accessibility attributes', () => {
      const attrs = getDialogAccessibility('Settings');
      
      expect(attrs).toEqual({
        'aria-label': 'Settings',
        'aria-describedby': undefined,
        'aria-modal': true,
        role: 'dialog',
        tabIndex: -1,
      });
    });

    it('should handle non-modal dialogs', () => {
      const attrs = getDialogAccessibility('Tooltip', { modal: false });
      
      expect(attrs['aria-modal']).toBe(false);
    });
  });

  describe('FocusManager', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <button>Button 1</button>
        <input type="text" />
        <button disabled>Disabled Button</button>
        <button>Button 2</button>
      `;
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    describe('getFocusableElements', () => {
      it('should find all focusable elements', () => {
        const focusable = FocusManager.getFocusableElements(container);
        
        expect(focusable).toHaveLength(3); // 2 enabled buttons + 1 input
        expect(focusable[0].tagName).toBe('BUTTON');
        expect(focusable[1].tagName).toBe('INPUT');
        expect(focusable[2].tagName).toBe('BUTTON');
      });
    });

    describe('focusFirst', () => {
      it('should focus the first focusable element', () => {
        const result = FocusManager.focusFirst(container);
        
        expect(result).toBe(true);
        expect(document.activeElement?.tagName).toBe('BUTTON');
        expect(document.activeElement?.textContent).toBe('Button 1');
      });

      it('should return false if no focusable elements', () => {
        const emptyContainer = document.createElement('div');
        const result = FocusManager.focusFirst(emptyContainer);
        
        expect(result).toBe(false);
      });
    });

    describe('focusLast', () => {
      it('should focus the last focusable element', () => {
        const result = FocusManager.focusLast(container);
        
        expect(result).toBe(true);
        expect(document.activeElement?.tagName).toBe('BUTTON');
        expect(document.activeElement?.textContent).toBe('Button 2');
      });
    });

    describe('announce', () => {
      it('should create and remove announcement element', (done) => {
        FocusManager.announce('Test message');
        
        // Check that announcement element was created
        const announcer = document.querySelector('[aria-live="polite"]');
        expect(announcer).toBeTruthy();
        expect(announcer?.textContent).toBe('Test message');
        
        // Check that it gets removed
        setTimeout(() => {
          const announcerAfter = document.querySelector('[aria-live="polite"]');
          expect(announcerAfter).toBeFalsy();
          done();
        }, 1100);
      });

      it('should handle assertive announcements', () => {
        FocusManager.announce('Urgent message', 'assertive');
        
        const announcer = document.querySelector('[aria-live="assertive"]');
        expect(announcer).toBeTruthy();
        expect(announcer?.textContent).toBe('Urgent message');
      });
    });
  });

  describe('KeyboardNavigation', () => {
    describe('handleListNavigation', () => {
      let items: HTMLElement[];
      let onSelect: any;

      beforeEach(() => {
        items = [
          document.createElement('div'),
          document.createElement('div'),
          document.createElement('div'),
        ];
        onSelect = vi.fn();
      });

      it('should handle arrow down navigation', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        const preventDefault = vi.spyOn(event, 'preventDefault');
        
        const newIndex = KeyboardNavigation.handleListNavigation(
          event as any,
          items,
          0,
          onSelect
        );
        
        expect(preventDefault).toHaveBeenCalled();
        expect(newIndex).toBe(1);
        expect(onSelect).toHaveBeenCalledWith(1);
      });

      it('should handle arrow up navigation', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        const preventDefault = vi.spyOn(event, 'preventDefault');
        
        const newIndex = KeyboardNavigation.handleListNavigation(
          event as any,
          items,
          1,
          onSelect
        );
        
        expect(preventDefault).toHaveBeenCalled();
        expect(newIndex).toBe(0);
        expect(onSelect).toHaveBeenCalledWith(0);
      });

      it('should wrap around when enabled', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        
        const newIndex = KeyboardNavigation.handleListNavigation(
          event as any,
          items,
          2, // last item
          onSelect,
          { wrap: true }
        );
        
        expect(newIndex).toBe(0); // wrapped to first
      });

      it('should not wrap when disabled', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        
        const newIndex = KeyboardNavigation.handleListNavigation(
          event as any,
          items,
          2, // last item
          onSelect,
          { wrap: false }
        );
        
        expect(newIndex).toBe(2); // stayed at last
      });

      it('should handle Enter key selection', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        const preventDefault = vi.spyOn(event, 'preventDefault');
        
        const newIndex = KeyboardNavigation.handleListNavigation(
          event as any,
          items,
          1,
          onSelect
        );
        
        expect(preventDefault).toHaveBeenCalled();
        expect(newIndex).toBe(1);
        expect(onSelect).toHaveBeenCalledWith(1);
      });

      it('should handle horizontal orientation', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        
        const newIndex = KeyboardNavigation.handleListNavigation(
          event as any,
          items,
          0,
          onSelect,
          { orientation: 'horizontal' }
        );
        
        expect(newIndex).toBe(1);
      });
    });

    describe('handleGridNavigation', () => {
      let onNavigate: any;

      beforeEach(() => {
        onNavigate = vi.fn();
      });

      it('should handle arrow key navigation', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        const preventDefault = vi.spyOn(event, 'preventDefault');
        
        const result = KeyboardNavigation.handleGridNavigation(
          event as any,
          3, // rows
          3, // cols
          0, // current row
          1, // current col
          onNavigate
        );
        
        expect(preventDefault).toHaveBeenCalled();
        expect(result).toEqual({ row: 1, col: 1 });
        expect(onNavigate).toHaveBeenCalledWith(1, 1);
      });

      it('should handle Home key', () => {
        const event = new KeyboardEvent('keydown', { key: 'Home' });
        
        const result = KeyboardNavigation.handleGridNavigation(
          event as any,
          3, 3, 1, 2,
          onNavigate
        );
        
        expect(result).toEqual({ row: 1, col: 0 });
      });

      it('should handle Ctrl+Home', () => {
        const event = new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true });
        
        const result = KeyboardNavigation.handleGridNavigation(
          event as any,
          3, 3, 1, 2,
          onNavigate
        );
        
        expect(result).toEqual({ row: 0, col: 0 });
      });

      it('should respect boundaries', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        
        const result = KeyboardNavigation.handleGridNavigation(
          event as any,
          3, 3, 0, 1, // already at top row
          onNavigate
        );
        
        expect(result).toEqual({ row: 0, col: 1 }); // stayed at top
      });
    });
  });
});