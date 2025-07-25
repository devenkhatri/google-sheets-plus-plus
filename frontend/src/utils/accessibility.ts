// Accessibility utilities and helpers

export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-controls'?: string;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-multiselectable'?: boolean;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-readonly'?: boolean;
  'aria-required'?: boolean;
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
  role?: string;
  tabIndex?: number;
}

/**
 * Generate accessible button attributes
 */
export const getButtonAccessibility = (
  label: string,
  options: {
    disabled?: boolean;
    pressed?: boolean;
    expanded?: boolean;
    controls?: string;
    describedBy?: string;
  } = {}
): AriaAttributes => ({
  'aria-label': label,
  'aria-disabled': options.disabled,
  'aria-pressed': options.pressed as any,
  'aria-expanded': options.expanded,
  'aria-controls': options.controls,
  'aria-describedby': options.describedBy,
  role: 'button',
  tabIndex: options.disabled ? -1 : 0,
});

/**
 * Generate accessible input attributes
 */
export const getInputAccessibility = (
  label: string,
  options: {
    required?: boolean;
    invalid?: boolean;
    readonly?: boolean;
    describedBy?: string;
    placeholder?: string;
  } = {}
): AriaAttributes => ({
  'aria-label': label,
  'aria-required': options.required,
  'aria-invalid': options.invalid,
  'aria-readonly': options.readonly,
  'aria-describedby': options.describedBy,
  placeholder: options.placeholder as any,
});

/**
 * Generate accessible list attributes
 */
export const getListAccessibility = (
  label: string,
  options: {
    multiselectable?: boolean;
    orientation?: 'horizontal' | 'vertical';
    activedescendant?: string;
  } = {}
): AriaAttributes => ({
  'aria-label': label,
  'aria-multiselectable': options.multiselectable,
  'aria-orientation': options.orientation || 'vertical',
  'aria-activedescendant': options.activedescendant as any,
  role: 'listbox',
});

/**
 * Generate accessible list item attributes
 */
export const getListItemAccessibility = (
  options: {
    selected?: boolean;
    disabled?: boolean;
    index?: number;
  } = {}
): AriaAttributes => ({
  'aria-selected': options.selected,
  'aria-disabled': options.disabled,
  'aria-posinset': (options.index !== undefined ? options.index + 1 : undefined) as any,
  role: 'option',
  tabIndex: options.selected ? 0 : -1,
});

/**
 * Generate accessible table attributes
 */
export const getTableAccessibility = (
  label: string,
  options: {
    describedBy?: string;
    rowCount?: number;
    colCount?: number;
  } = {}
): AriaAttributes => ({
  'aria-label': label,
  'aria-describedby': options.describedBy,
  'aria-rowcount': options.rowCount as any,
  'aria-colcount': options.colCount,
  role: 'table',
});

/**
 * Generate accessible table cell attributes
 */
export const getTableCellAccessibility = (
  options: {
    rowIndex?: number;
    colIndex?: number;
    selected?: boolean;
    readonly?: boolean;
    sort?: 'none' | 'ascending' | 'descending' | 'other';
  } = {}
): AriaAttributes => ({
  'aria-rowindex': options.rowIndex as any,
  'aria-colindex': options.colIndex,
  'aria-selected': options.selected,
  'aria-readonly': options.readonly,
  'aria-sort': options.sort,
  role: 'gridcell',
  tabIndex: options.selected ? 0 : -1,
});

/**
 * Generate accessible dialog attributes
 */
export const getDialogAccessibility = (
  label: string,
  options: {
    describedBy?: string;
    modal?: boolean;
  } = {}
): AriaAttributes => ({
  'aria-label': label,
  'aria-describedby': options.describedBy,
  'aria-modal': (options.modal !== false) as any,
  role: 'dialog',
  tabIndex: -1,
});

/**
 * Generate accessible status/alert attributes
 */
export const getStatusAccessibility = (
  options: {
    live?: 'off' | 'polite' | 'assertive';
    atomic?: boolean;
  } = {}
): AriaAttributes => ({
  'aria-live': options.live || 'polite',
  'aria-atomic': options.atomic !== false,
  role: 'status',
});

/**
 * Generate accessible navigation attributes
 */
export const getNavigationAccessibility = (
  label: string,
  options: {
    current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  } = {}
): AriaAttributes => ({
  'aria-label': label,
  'aria-current': options.current,
  role: 'navigation',
});

/**
 * Focus management utilities
 */
export class FocusManager {
  private static focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  /**
   * Get all focusable elements within a container
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(this.focusableSelectors));
  }

  /**
   * Focus the first focusable element in a container
   */
  static focusFirst(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
      return true;
    }
    return false;
  }

  /**
   * Focus the last focusable element in a container
   */
  static focusLast(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
      return true;
    }
    return false;
  }

  /**
   * Trap focus within a container (for modals, etc.)
   */
  static trapFocus(container: HTMLElement): () => void {
    const focusable = this.getFocusableElements(container);
    if (focusable.length === 0) return () => {};

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus the first element initially
    firstFocusable.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Announce text to screen readers
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';

    document.body.appendChild(announcer);
    announcer.textContent = message;

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigation {
  /**
   * Handle arrow key navigation in a list
   */
  static handleListNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onSelect: (index: number) => void,
    options: {
      wrap?: boolean;
      orientation?: 'horizontal' | 'vertical';
    } = {}
  ): number {
    const { wrap = true, orientation = 'vertical' } = options;
    let newIndex = currentIndex;

    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    switch (event.key) {
      case nextKey:
        event.preventDefault();
        newIndex = currentIndex + 1;
        if (newIndex >= items.length) {
          newIndex = wrap ? 0 : items.length - 1;
        }
        break;

      case prevKey:
        event.preventDefault();
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = wrap ? items.length - 1 : 0;
        }
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect(currentIndex);
        return currentIndex;

      default:
        return currentIndex;
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
      onSelect(newIndex);
    }

    return newIndex;
  }

  /**
   * Handle grid navigation (2D)
   */
  static handleGridNavigation(
    event: KeyboardEvent,
    rows: number,
    cols: number,
    currentRow: number,
    currentCol: number,
    onNavigate: (row: number, col: number) => void
  ): { row: number; col: number } {
    let newRow = currentRow;
    let newCol = currentCol;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        newRow = Math.max(0, currentRow - 1);
        break;

      case 'ArrowDown':
        event.preventDefault();
        newRow = Math.min(rows - 1, currentRow + 1);
        break;

      case 'ArrowLeft':
        event.preventDefault();
        newCol = Math.max(0, currentCol - 1);
        break;

      case 'ArrowRight':
        event.preventDefault();
        newCol = Math.min(cols - 1, currentCol + 1);
        break;

      case 'Home':
        event.preventDefault();
        if (event.ctrlKey) {
          newRow = 0;
          newCol = 0;
        } else {
          newCol = 0;
        }
        break;

      case 'End':
        event.preventDefault();
        if (event.ctrlKey) {
          newRow = rows - 1;
          newCol = cols - 1;
        } else {
          newCol = cols - 1;
        }
        break;

      case 'PageUp':
        event.preventDefault();
        newRow = Math.max(0, currentRow - 10);
        break;

      case 'PageDown':
        event.preventDefault();
        newRow = Math.min(rows - 1, currentRow + 10);
        break;

      default:
        return { row: currentRow, col: currentCol };
    }

    if (newRow !== currentRow || newCol !== currentCol) {
      onNavigate(newRow, newCol);
    }

    return { row: newRow, col: newCol };
  }
}