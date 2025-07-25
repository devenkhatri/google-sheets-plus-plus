import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  getTableAccessibility, 
  getTableCellAccessibility, 
  KeyboardNavigation,
  FocusManager 
} from '../../utils/accessibility';

interface GridColumn {
  id: string;
  label: string;
  width?: number;
  sortable?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean';
}

interface GridRow {
  id: string;
  [key: string]: any;
}

interface AccessibleGridProps {
  columns: GridColumn[];
  rows: GridRow[];
  onCellEdit?: (rowId: string, columnId: string, value: any) => void;
  onRowSelect?: (rowId: string) => void;
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  selectedRows?: string[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const AccessibleGrid: React.FC<AccessibleGridProps> = ({
  columns,
  rows,
  onCellEdit,
  onRowSelect,
  onSort,
  selectedRows = [],
  sortColumn,
  sortDirection,
  className = '',
  'aria-label': ariaLabel = 'Data grid',
  'aria-describedby': ariaDescribedBy,
}) => {
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const cellRefs = useRef<(HTMLTableCellElement | null)[][]>([]);

  // Initialize cell refs
  useEffect(() => {
    cellRefs.current = rows.map(() => new Array(columns.length).fill(null));
  }, [rows.length, columns.length]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (editingCell) {
      // Handle editing mode
      if (event.key === 'Escape') {
        setEditingCell(null);
        const cell = cellRefs.current[focusedCell.row]?.[focusedCell.col];
        cell?.focus();
      } else if (event.key === 'Enter') {
        setEditingCell(null);
        const cell = cellRefs.current[focusedCell.row]?.[focusedCell.col];
        cell?.focus();
      }
      return;
    }

    // Handle navigation mode
    const newPosition = KeyboardNavigation.handleGridNavigation(
      event,
      rows.length,
      columns.length,
      focusedCell.row,
      focusedCell.col,
      (row, col) => {
        setFocusedCell({ row, col });
        const cell = cellRefs.current[row]?.[col];
        cell?.focus();
        
        // Announce cell content
        const rowData = rows[row];
        const column = columns[col];
        const cellValue = rowData[column.id];
        FocusManager.announce(
          `${column.label}: ${cellValue || 'empty'}, row ${row + 1} of ${rows.length}, column ${col + 1} of ${columns.length}`
        );
      }
    );

    setFocusedCell(newPosition);

    // Handle cell editing
    if (event.key === 'Enter' || event.key === 'F2') {
      if (onCellEdit) {
        event.preventDefault();
        setEditingCell({ row: focusedCell.row, col: focusedCell.col });
      }
    }

    // Handle row selection
    if (event.key === ' ' && event.ctrlKey) {
      event.preventDefault();
      const rowId = rows[focusedCell.row]?.id;
      if (rowId && onRowSelect) {
        onRowSelect(rowId);
        FocusManager.announce(
          selectedRows.includes(rowId) ? 'Row deselected' : 'Row selected'
        );
      }
    }
  }, [focusedCell, editingCell, rows, columns, onCellEdit, onRowSelect, selectedRows]);

  const handleCellClick = useCallback((rowIndex: number, colIndex: number) => {
    setFocusedCell({ row: rowIndex, col: colIndex });
    const cell = cellRefs.current[rowIndex]?.[colIndex];
    cell?.focus();
  }, []);

  const handleCellDoubleClick = useCallback((rowIndex: number, colIndex: number) => {
    if (onCellEdit) {
      setEditingCell({ row: rowIndex, col: colIndex });
    }
  }, [onCellEdit]);

  const handleSort = useCallback((columnId: string) => {
    if (!onSort) return;
    
    const newDirection = sortColumn === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnId, newDirection);
    
    FocusManager.announce(
      `Sorted by ${columns.find(c => c.id === columnId)?.label} ${newDirection}ending`
    );
  }, [sortColumn, sortDirection, onSort, columns]);

  const tableAccessibility = getTableAccessibility(ariaLabel, {
    describedBy: ariaDescribedBy,
    rowCount: rows.length + 1, // +1 for header
    colCount: columns.length,
  });

  return (
    <div className={`accessible-grid ${className}`}>
      <table
        {...tableAccessibility}
        ref={gridRef}
        className="w-full border-collapse"
        onKeyDown={handleKeyDown}
      >
        <thead>
          <tr role="row">
            {columns.map((column, colIndex) => (
              <th
                key={column.id}
                role="columnheader"
                aria-sort={
                  sortColumn === column.id
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : column.sortable
                    ? 'none'
                    : undefined
                }
                className="border border-gray-300 p-2 bg-gray-50 font-medium text-left"
                style={{ width: column.width }}
              >
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.id)}
                    className="w-full text-left hover:bg-gray-100 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`Sort by ${column.label}`}
                  >
                    {column.label}
                    {sortColumn === column.id && (
                      <span aria-hidden="true" className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.id}
              role="row"
              aria-selected={selectedRows.includes(row.id)}
              className={`
                ${selectedRows.includes(row.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                ${focusedCell.row === rowIndex ? 'ring-2 ring-blue-500' : ''}
              `}
            >
              {columns.map((column, colIndex) => {
                const cellValue = row[column.id];
                const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                const isFocused = focusedCell.row === rowIndex && focusedCell.col === colIndex;
                
                const cellAccessibility = getTableCellAccessibility({
                  rowIndex: rowIndex + 2, // +2 for 1-based indexing and header
                  colIndex: colIndex + 1,
                  selected: isFocused,
                  readonly: !onCellEdit,
                });

                return (
                  <td
                    key={`${row.id}-${column.id}`}
                    {...cellAccessibility}
                    ref={(el) => {
                      if (cellRefs.current[rowIndex]) {
                        cellRefs.current[rowIndex][colIndex] = el;
                      }
                    }}
                    className={`
                      border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${isFocused ? 'bg-blue-100' : ''}
                    `}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                    aria-label={`${column.label}: ${cellValue || 'empty'}`}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        defaultValue={cellValue}
                        className="w-full border-none outline-none bg-transparent"
                        autoFocus
                        onBlur={(e) => {
                          setEditingCell(null);
                          if (onCellEdit && e.target.value !== cellValue) {
                            onCellEdit(row.id, column.id, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setEditingCell(null);
                            if (onCellEdit && e.currentTarget.value !== cellValue) {
                              onCellEdit(row.id, column.id, e.currentTarget.value);
                            }
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                          }
                        }}
                        aria-label={`Edit ${column.label}`}
                      />
                    ) : (
                      <span>{cellValue || ''}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Screen reader instructions */}
      <div className="sr-only" aria-live="polite" id="grid-instructions">
        Use arrow keys to navigate. Press Enter or F2 to edit a cell. 
        Press Ctrl+Space to select a row. Press Escape to cancel editing.
      </div>
    </div>
  );
};