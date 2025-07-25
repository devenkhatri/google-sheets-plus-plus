import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils';
import Input from '../Input';
import SearchIcon from '@mui/icons-material/Search';

describe('Input Component', () => {
  it('renders input field', () => {
    renderWithProviders(<Input label="Test Input" />);
    expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    renderWithProviders(
      <Input label="Test Input" value="" onChange={handleChange} />
    );
    
    const input = screen.getByLabelText('Test Input');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays start icon', () => {
    renderWithProviders(
      <Input label="Search" startIcon={<SearchIcon data-testid="search-icon" />} />
    );
    
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('displays end icon', () => {
    renderWithProviders(
      <Input label="Search" endIcon={<SearchIcon data-testid="search-icon" />} />
    );
    
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderWithProviders(
      <Input label="Test Input" error helperText="This field is required" />
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('supports different variants', () => {
    const { rerender } = renderWithProviders(<Input label="Test" variant="outlined" />);
    expect(screen.getByLabelText('Test')).toBeInTheDocument();
    
    rerender(<Input label="Test" variant="filled" />);
    expect(screen.getByLabelText('Test')).toBeInTheDocument();
  });

  it('supports multiline', () => {
    renderWithProviders(<Input label="Description" multiline rows={4} />);
    
    const textarea = screen.getByLabelText('Description');
    expect(textarea.tagName).toBe('TEXTAREA');
  });
});