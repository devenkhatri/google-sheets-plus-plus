import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders correctly with default props', () => {
    renderWithProviders(<LoadingSpinner />);
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });
  
  it('displays message when provided', () => {
    const message = 'Loading data...';
    renderWithProviders(<LoadingSpinner message={message} />);
    
    expect(screen.getByText(message)).toBeInTheDocument();
  });
  
  it('applies different sizes correctly', () => {
    const { rerender } = renderWithProviders(<LoadingSpinner size="small" />);
    let spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveAttribute('aria-valuenow', '0');
    
    rerender(<LoadingSpinner size="large" />);
    spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveAttribute('aria-valuenow', '0');
  });
  
  it('applies fullScreen styles when specified', () => {
    const { container } = renderWithProviders(<LoadingSpinner fullScreen />);
    
    const spinnerContainer = container.firstChild as HTMLElement;
    expect(spinnerContainer).toHaveStyle('position: fixed');
    expect(spinnerContainer).toHaveStyle('top: 0');
    expect(spinnerContainer).toHaveStyle('left: 0');
    expect(spinnerContainer).toHaveStyle('right: 0');
    expect(spinnerContainer).toHaveStyle('bottom: 0');
  });
  
  it('applies overlay styles when specified', () => {
    const { container } = renderWithProviders(<LoadingSpinner overlay />);
    
    const spinnerContainer = container.firstChild as HTMLElement;
    expect(spinnerContainer).toHaveStyle('position: absolute');
    expect(spinnerContainer).toHaveStyle('top: 0');
    expect(spinnerContainer).toHaveStyle('left: 0');
    expect(spinnerContainer).toHaveStyle('right: 0');
    expect(spinnerContainer).toHaveStyle('bottom: 0');
  });
});