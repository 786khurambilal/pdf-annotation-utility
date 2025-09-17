import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NavigationControls } from './NavigationControls';

describe('NavigationControls', () => {
  const defaultProps = {
    currentPage: 5,
    totalPages: 10,
    onPageChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders navigation controls with correct page information', () => {
      render(<NavigationControls {...defaultProps} />);
      
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByText('of')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('displays correct page input attributes', () => {
      render(<NavigationControls {...defaultProps} />);
      
      const pageInput = screen.getByDisplayValue('5');
      expect(pageInput).toHaveAttribute('type', 'number');
      expect(pageInput).toHaveAttribute('min', '1');
      expect(pageInput).toHaveAttribute('max', '10');
      expect(pageInput).toHaveAttribute('aria-label', 'Current page, 5 of 10');
    });

    it('renders with single page document', () => {
      render(<NavigationControls currentPage={1} totalPages={1} onPageChange={jest.fn()} />);
      
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous page')).toBeDisabled();
      expect(screen.getByLabelText('Next page')).toBeDisabled();
    });
  });

  describe('Button States', () => {
    it('disables previous button on first page', () => {
      render(<NavigationControls currentPage={1} totalPages={10} onPageChange={jest.fn()} />);
      
      const previousButton = screen.getByLabelText('Previous page');
      expect(previousButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(<NavigationControls currentPage={10} totalPages={10} onPageChange={jest.fn()} />);
      
      const nextButton = screen.getByLabelText('Next page');
      expect(nextButton).toBeDisabled();
    });

    it('enables both buttons on middle page', () => {
      render(<NavigationControls {...defaultProps} />);
      
      const previousButton = screen.getByLabelText('Previous page');
      const nextButton = screen.getByLabelText('Next page');
      
      expect(previousButton).not.toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    it('disables all controls when disabled prop is true', () => {
      render(<NavigationControls {...defaultProps} disabled={true} />);
      
      const previousButton = screen.getByLabelText('Previous page');
      const nextButton = screen.getByLabelText('Next page');
      const pageInput = screen.getByDisplayValue('5');
      
      expect(previousButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
      expect(pageInput).toBeDisabled();
    });
  });

  describe('Navigation Functionality', () => {
    it('calls onPageChange with previous page when previous button is clicked', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls {...defaultProps} onPageChange={onPageChange} />);
      
      const previousButton = screen.getByLabelText('Previous page');
      await userEvent.click(previousButton);
      
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('calls onPageChange with next page when next button is clicked', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls {...defaultProps} onPageChange={onPageChange} />);
      
      const nextButton = screen.getByLabelText('Next page');
      await userEvent.click(nextButton);
      
      expect(onPageChange).toHaveBeenCalledWith(6);
    });

    it('does not call onPageChange when previous button is disabled', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls currentPage={1} totalPages={10} onPageChange={onPageChange} />);
      
      const previousButton = screen.getByLabelText('Previous page');
      await userEvent.click(previousButton);
      
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('does not call onPageChange when next button is disabled', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls currentPage={10} totalPages={10} onPageChange={onPageChange} />);
      
      const nextButton = screen.getByLabelText('Next page');
      await userEvent.click(nextButton);
      
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('Direct Page Navigation', () => {
    it('navigates to valid page number when Enter is pressed', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls {...defaultProps} onPageChange={onPageChange} />);
      
      const pageInput = screen.getByDisplayValue('5');
      await userEvent.clear(pageInput);
      await userEvent.type(pageInput, '8');
      await userEvent.keyboard('{Enter}');
      
      expect(onPageChange).toHaveBeenCalledWith(8);
    });

    it('navigates to valid page number when form is submitted', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls {...defaultProps} onPageChange={onPageChange} />);
      
      const pageInput = screen.getByDisplayValue('5');
      await userEvent.clear(pageInput);
      await userEvent.type(pageInput, '3');
      
      // Submit the form
      fireEvent.submit(pageInput.closest('form')!);
      
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('clamps page number to minimum when below range', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls {...defaultProps} onPageChange={onPageChange} />);
      
      const pageInput = screen.getByDisplayValue('5');
      await userEvent.clear(pageInput);
      await userEvent.type(pageInput, '0');
      await userEvent.keyboard('{Enter}');
      
      expect(onPageChange).toHaveBeenCalledWith(1);
      expect(pageInput).toHaveValue(1);
    });

    it('clamps page number to maximum when above range', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls {...defaultProps} onPageChange={onPageChange} />);
      
      const pageInput = screen.getByDisplayValue('5');
      await userEvent.clear(pageInput);
      await userEvent.type(pageInput, '15');
      await userEvent.keyboard('{Enter}');
      
      expect(onPageChange).toHaveBeenCalledWith(10);
      expect(pageInput).toHaveValue(10);
    });

    it('resets input value for invalid non-numeric input', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls {...defaultProps} onPageChange={onPageChange} />);
      
      const pageInput = screen.getByDisplayValue('5');
      await userEvent.clear(pageInput);
      await userEvent.type(pageInput, 'abc');
      await userEvent.keyboard('{Enter}');
      
      expect(onPageChange).not.toHaveBeenCalled();
      expect(pageInput).toHaveValue(5); // Reset to current page
    });

    it('does not navigate when same page number is entered', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls {...defaultProps} onPageChange={onPageChange} />);
      
      const pageInput = screen.getByDisplayValue('5');
      await userEvent.clear(pageInput);
      await userEvent.type(pageInput, '5');
      await userEvent.keyboard('{Enter}');
      
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('resets input value on Escape key', async () => {
      render(<NavigationControls {...defaultProps} />);
      
      const pageInput = screen.getByDisplayValue('5');
      await userEvent.clear(pageInput);
      await userEvent.type(pageInput, '8');
      await userEvent.keyboard('{Escape}');
      
      expect(pageInput).toHaveValue(5); // Reset to current page
    });

    it('resets input value on blur without submission', async () => {
      render(<NavigationControls {...defaultProps} />);
      
      const pageInput = screen.getByDisplayValue('5');
      await userEvent.clear(pageInput);
      await userEvent.type(pageInput, '8');
      await userEvent.tab(); // Blur the input
      
      expect(pageInput).toHaveValue(5); // Reset to current page
    });

    it('does not navigate when disabled', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls {...defaultProps} onPageChange={onPageChange} disabled={true} />);
      
      const pageInput = screen.getByDisplayValue('5');
      await userEvent.type(pageInput, '8');
      await userEvent.keyboard('{Enter}');
      
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('Input Synchronization', () => {
    it('updates input value when currentPage prop changes', () => {
      const { rerender } = render(<NavigationControls {...defaultProps} />);
      
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      
      rerender(<NavigationControls {...defaultProps} currentPage={7} />);
      
      expect(screen.getByDisplayValue('7')).toBeInTheDocument();
    });

    it('updates aria-label when currentPage changes', () => {
      const { rerender } = render(<NavigationControls {...defaultProps} />);
      
      expect(screen.getByLabelText('Current page, 5 of 10')).toBeInTheDocument();
      
      rerender(<NavigationControls {...defaultProps} currentPage={3} />);
      
      expect(screen.getByLabelText('Current page, 3 of 10')).toBeInTheDocument();
    });

    it('updates max attribute when totalPages changes', () => {
      const { rerender } = render(<NavigationControls {...defaultProps} />);
      
      const pageInput = screen.getByDisplayValue('5');
      expect(pageInput).toHaveAttribute('max', '10');
      
      rerender(<NavigationControls {...defaultProps} totalPages={20} />);
      
      expect(pageInput).toHaveAttribute('max', '20');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(<NavigationControls {...defaultProps} />);
      
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('has proper ARIA label for page input', () => {
      render(<NavigationControls {...defaultProps} />);
      
      expect(screen.getByLabelText('Current page, 5 of 10')).toBeInTheDocument();
    });

    it('has proper title attributes for tooltips', () => {
      render(<NavigationControls {...defaultProps} />);
      
      expect(screen.getByLabelText('Previous page')).toHaveAttribute('title', 'Previous page');
      expect(screen.getByLabelText('Next page')).toHaveAttribute('title', 'Next page');
      expect(screen.getByDisplayValue('5')).toHaveAttribute('title', 'Enter page number and press Enter');
    });

    it('supports keyboard navigation', async () => {
      const onPageChange = jest.fn();
      render(<NavigationControls {...defaultProps} onPageChange={onPageChange} />);
      
      // Tab to previous button and activate with space
      await userEvent.tab();
      await userEvent.keyboard(' ');
      expect(onPageChange).toHaveBeenCalledWith(4);
      
      onPageChange.mockClear();
      
      // Tab to next button and activate with Enter
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.keyboard('{Enter}');
      expect(onPageChange).toHaveBeenCalledWith(6);
    });
  });
});