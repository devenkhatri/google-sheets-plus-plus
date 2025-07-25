import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils';
import Modal from '../Modal';
import Button from '../Button';

describe('Modal Component', () => {
  it('renders when open', () => {
    renderWithProviders(
      <Modal open onClose={() => {}} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    renderWithProviders(
      <Modal open onClose={handleClose} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders actions when provided', () => {
    const actions = (
      <>
        <Button>Cancel</Button>
        <Button variant="contained">Save</Button>
      </>
    );
    
    renderWithProviders(
      <Modal open onClose={() => {}} title="Test Modal" actions={actions}>
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders without title', () => {
    renderWithProviders(
      <Modal open onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.getByText('Modal content')).toBeInTheDocument();
    expect(screen.queryByLabelText('close')).not.toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = jest.fn();
    renderWithProviders(
      <Modal open onClose={handleClose} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );
    
    // Click on backdrop (the overlay behind the modal)
    const backdrop = screen.getByRole('presentation').firstChild;
    fireEvent.click(backdrop as Element);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when backdrop click is disabled', () => {
    const handleClose = jest.fn();
    renderWithProviders(
      <Modal open onClose={handleClose} title="Test Modal" disableBackdropClick>
        <div>Modal content</div>
      </Modal>
    );
    
    // Click on backdrop
    const backdrop = screen.getByRole('presentation').firstChild;
    fireEvent.click(backdrop as Element);
    
    expect(handleClose).not.toHaveBeenCalled();
  });
});