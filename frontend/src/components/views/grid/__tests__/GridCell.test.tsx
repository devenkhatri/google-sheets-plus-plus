import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GridCell from '../GridCell';

describe('GridCell Component', () => {
  const mockRecord = {
    id: 'rec1',
    table_id: 'table1',
    row_index: 0,
    fields: {
      field1: 'Test Value',
      field2: 42,
      field3: true,
      field4: '2023-01-15T00:00:00Z',
      field5: 'option1',
      field6: ['option1', 'option2'],
    },
    deleted: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockFields = {
    text: {
      id: 'field1',
      name: 'Text Field',
      type: 'text',
      required: false,
    },
    number: {
      id: 'field2',
      name: 'Number Field',
      type: 'number',
      required: false,
    },
    checkbox: {
      id: 'field3',
      name: 'Checkbox Field',
      type: 'checkbox',
      required: false,
    },
    date: {
      id: 'field4',
      name: 'Date Field',
      type: 'date',
      required: false,
    },
    singleSelect: {
      id: 'field5',
      name: 'Single Select Field',
      type: 'singleSelect',
      options: {
        choices: [
          { value: 'option1', label: 'Option 1', color: '#ff0000' },
          { value: 'option2', label: 'Option 2', color: '#00ff00' },
        ],
      },
      required: false,
    },
    multiSelect: {
      id: 'field6',
      name: 'Multi Select Field',
      type: 'multiSelect',
      options: {
        choices: [
          { value: 'option1', label: 'Option 1', color: '#ff0000' },
          { value: 'option2', label: 'Option 2', color: '#00ff00' },
        ],
      },
      required: false,
    },
  };

  const defaultProps = {
    rowIndex: 0,
    colIndex: 0,
    top: 0,
    left: 0,
    width: 200,
    height: 40,
    isSelected: false,
    isFrozen: false,
    onClick: jest.fn(),
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders text cell correctly', () => {
    render(
      <GridCell
        record={mockRecord}
        field={mockFields.text}
        {...defaultProps}
      />
    );
    
    expect(screen.getByText('Test Value')).toBeInTheDocument();
  });

  it('renders number cell correctly', () => {
    render(
      <GridCell
        record={mockRecord}
        field={mockFields.number}
        {...defaultProps}
      />
    );
    
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders checkbox cell correctly', () => {
    render(
      <GridCell
        record={mockRecord}
        field={mockFields.checkbox}
        {...defaultProps}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('handles checkbox click', () => {
    render(
      <GridCell
        record={mockRecord}
        field={mockFields.checkbox}
        {...defaultProps}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(defaultProps.onChange).toHaveBeenCalledWith('rec1', 'field3', false);
  });

  it('enters edit mode on double click', () => {
    render(
      <GridCell
        record={mockRecord}
        field={mockFields.text}
        {...defaultProps}
      />
    );
    
    const cell = screen.getByText('Test Value').parentElement?.parentElement;
    fireEvent.doubleClick(cell!);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Test Value');
  });

  it('calls onChange when editing is complete', () => {
    render(
      <GridCell
        record={mockRecord}
        field={mockFields.text}
        {...defaultProps}
      />
    );
    
    // Enter edit mode
    const cell = screen.getByText('Test Value').parentElement?.parentElement;
    fireEvent.doubleClick(cell!);
    
    // Change value
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Value' } });
    
    // Blur to save
    fireEvent.blur(input);
    
    expect(defaultProps.onChange).toHaveBeenCalledWith('rec1', 'field1', 'New Value');
  });

  it('calls onClick when cell is clicked', () => {
    render(
      <GridCell
        record={mockRecord}
        field={mockFields.text}
        {...defaultProps}
      />
    );
    
    const cell = screen.getByText('Test Value').parentElement?.parentElement;
    fireEvent.click(cell!);
    
    expect(defaultProps.onClick).toHaveBeenCalledWith(0, 0, expect.anything());
  });

  it('applies selected styling when isSelected is true', () => {
    render(
      <GridCell
        record={mockRecord}
        field={mockFields.text}
        {...defaultProps}
        isSelected={true}
      />
    );
    
    const cell = screen.getByText('Test Value').parentElement?.parentElement;
    expect(cell).toHaveStyle('background-color: var(--action-selected)');
  });

  it('applies frozen styling when isFrozen is true', () => {
    render(
      <GridCell
        record={mockRecord}
        field={mockFields.text}
        {...defaultProps}
        isFrozen={true}
      />
    );
    
    const cell = screen.getByText('Test Value').parentElement?.parentElement;
    expect(cell).toHaveStyle('z-index: 5');
  });
});