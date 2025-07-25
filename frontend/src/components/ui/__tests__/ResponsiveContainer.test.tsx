import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils';
import ResponsiveContainer from '../ResponsiveContainer';

describe('ResponsiveContainer', () => {
  it('renders children correctly', () => {
    renderWithProviders(
      <ResponsiveContainer>
        <div data-testid="test-child">Test Content</div>
      </ResponsiveContainer>
    );
    
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
  
  it('applies maxWidth correctly', () => {
    const { container } = renderWithProviders(
      <ResponsiveContainer maxWidth="sm">
        <div>Test Content</div>
      </ResponsiveContainer>
    );
    
    const boxElement = container.firstChild as HTMLElement;
    expect(boxElement).toHaveStyle('max-width: 600px');
  });
  
  it('disables gutters when specified', () => {
    const { container } = renderWithProviders(
      <ResponsiveContainer disableGutters>
        <div>Test Content</div>
      </ResponsiveContainer>
    );
    
    const boxElement = container.firstChild as HTMLElement;
    expect(boxElement).toHaveStyle('padding-left: 0px');
    expect(boxElement).toHaveStyle('padding-right: 0px');
  });
  
  it('passes additional props to Box component', () => {
    const { container } = renderWithProviders(
      <ResponsiveContainer bgcolor="primary.main" data-testid="custom-container">
        <div>Test Content</div>
      </ResponsiveContainer>
    );
    
    const boxElement = screen.getByTestId('custom-container');
    expect(boxElement).toBeInTheDocument();
    expect(boxElement).toHaveStyle('background-color: #2563eb');
  });
});