import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import GridHeader from '../GridHeader';

// Mock the virtualizer
const mockVirtualizer = {
  getVirtualItems: () => [
    { index: 0, start: 0, end: 150, size: 150, key: '0' },
    { index: 1, start: 150, end: 300, size: 150, key: '1' },
  ],
  getTotalSize: () => 300,
};

// Mock fields
const mockFields = [
  {
    id: 'field1',
    name: 'Text Field',
    type: 'text',
    required: false,
  },
  {
    id: 'field2',
    name: 'Number Field',
    type: 'number',
    required: false,
  },
];

// Mock column widths
const mockColumnWidths = {
  field1: 150,
  field2: 150,
};

describe('GridHeader Component', () => {
  const headerRef = React.createRef<HTMLDivElement>();
  const mockOnColumnResize = jest.fn();
  const mockOnColumnReorder = jest.fn();
  const mockOnToggleColumnFreeze = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header columns correctly', () => {
    render(
      <DndProvider backend={HTML5Backend}>
        <GridHeader
          fields={mockFields}
          columnVirtualizer={mockVirtualizer as any}
          columnWidths={mockColumnWidths}
          frozenColumns={1}
          onColumnResize={mockOnColumnResize}
          onColumnReorder={mockOnColumnReorder}
          onToggleColumnFreeze={mockOnToggleColumnFreeze}
          headerRef={headerRef}
        />
      </DndProvider>
    );

    // Check that field names are rendered
    expect(screen.getByText('Text Field')).toBeInTheDocument();
    expect(screen.getByText('Number Field')).toBeInTheDocument();
  });

  it('shows field type indicators', () => {
    render(
      <DndProvider backend={HTML5Backend}>
        <GridHeader
          fields={mockFields}
          columnVirtualizer={mockVirtualizer as any}
          columnWidths={mockColumnWidths}
          frozenColumns={1}
          onColumnResize={mockOnColumnResize}
          onColumnReorder={mockOnColumnReorder}
          onToggleColumnFreeze={mockOnToggleColumnFreeze}
          headerRef={headerRef}
        />
      </DndProvider>
    );

    // Check for field type indicators (emojis)
    expect(screen.getAllByText(/📝|🔢/)).toHaveLength(2); // Text and Number field icons
  });

  it('shows frozen column indicator for frozen columns', () => {
    render(
      <DndProvider backend={HTML5Backend}>
        <GridHeader
          fields={mockFields}
          columnVirtualizer={mockVirtualizer as any}
          columnWidths={mockColumnWidths}
          frozenColumns={1}
          onColumnResize={mockOnColumnResize}
          onColumnReorder={mockOnColumnReorder}
          onToggleColumnFreeze={mockOnToggleColumnFreeze}
          headerRef={headerRef}
        />
      </DndProvider>
    );

    // First column should have a lock icon (frozen)
    const lockIcons = document.querySelectorAll('svg[data-testid="LockIcon"]');
    expect(lockIcons.length).toBeGreaterThan(0);
  });

  // Note: Testing drag and drop functionality is complex in unit tests
  // and would be better covered in integration tests
});