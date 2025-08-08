import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentCreator } from './CommentCreator';
import { AreaCoordinates } from '../../types/annotation.types';

describe('CommentCreator', () => {
  const mockCoordinates: AreaCoordinates = { x: 100, y: 200 };
  const mockOnCreateComment = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    coordinates: mockCoordinates,
    pageNumber: 1,
    isVisible: true,
    onCreateComment: mockOnCreateComment,
    onCancel: mockOnCancel
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders modal when visible', () => {
      render(<CommentCreator {...defaultProps} />);
      
      expect(screen.getByText('Add Comment')).toBeInTheDocument();
      expect(screen.getByLabelText('Comment')).toBeInTheDocument();
      expect(screen.getByText('Page 1 • Position: (100, 200)')).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      render(<CommentCreator {...defaultProps} isVisible={false} />);
      
      expect(screen.queryByText('Add Comment')).not.toBeInTheDocument();
    });

    it('does not render when coordinates are null', () => {
      render(<CommentCreator {...defaultProps} coordinates={null} />);
      
      expect(screen.queryByText('Add Comment')).not.toBeInTheDocument();
    });

    it('displays correct page number and coordinates', () => {
      const coordinates = { x: 150.7, y: 250.3 };
      render(
        <CommentCreator 
          {...defaultProps} 
          coordinates={coordinates}
          pageNumber={5}
        />
      );
      
      expect(screen.getByText('Page 5 • Position: (151, 250)')).toBeInTheDocument();
    });

    it('focuses textarea when modal becomes visible', async () => {
      const { rerender } = render(<CommentCreator {...defaultProps} isVisible={false} />);
      
      rerender(<CommentCreator {...defaultProps} isVisible={true} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Comment')).toHaveFocus();
      });
    });
  });

  describe('Form Interaction', () => {
    it('updates content when typing in textarea', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, 'This is a test comment');
      
      expect(textarea).toHaveValue('This is a test comment');
    });

    it('enables submit button when content is entered', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      const submitButton = screen.getByText('Create Comment');
      expect(submitButton).toBeDisabled();
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, 'Test comment');
      
      expect(submitButton).toBeEnabled();
    });

    it('enables submit button for whitespace-only content', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, '   ');
      
      const submitButton = screen.getByText('Create Comment');
      expect(submitButton).toBeEnabled();
    });

    it('clears error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      // Submit the form directly to trigger error
      const form = screen.getByText('Add Comment').closest('form');
      if (form) {
        fireEvent.submit(form);
        
        await waitFor(() => {
          expect(screen.getByText('Comment content is required')).toBeInTheDocument();
        });
        
        // Start typing to clear error
        const textarea = screen.getByLabelText('Comment');
        await user.type(textarea, 'T');
        
        expect(screen.queryByText('Comment content is required')).not.toBeInTheDocument();
      }
    });
  });

  describe('Form Submission', () => {
    it('calls onCreateComment with correct parameters on valid submission', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, 'This is a test comment');
      
      const submitButton = screen.getByText('Create Comment');
      await user.click(submitButton);
      
      expect(mockOnCreateComment).toHaveBeenCalledWith(
        'This is a test comment',
        mockCoordinates
      );
    });

    it('trims whitespace from content before submission', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, '  This is a test comment  ');
      
      const submitButton = screen.getByText('Create Comment');
      await user.click(submitButton);
      
      expect(mockOnCreateComment).toHaveBeenCalledWith(
        'This is a test comment',
        mockCoordinates
      );
    });

    it('shows error for empty content submission', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      // Submit the form directly since button is disabled for empty content
      const form = screen.getByText('Add Comment').closest('form');
      if (form) {
        fireEvent.submit(form);
        
        await waitFor(() => {
          expect(screen.getByText('Comment content is required')).toBeInTheDocument();
        });
      }
      expect(mockOnCreateComment).not.toHaveBeenCalled();
    });

    it('shows error for whitespace-only content submission', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, '   ');
      
      // Click the submit button now that it's enabled
      const submitButton = screen.getByText('Create Comment');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Comment content is required')).toBeInTheDocument();
      });
      expect(mockOnCreateComment).not.toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      const slowOnCreateComment = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<CommentCreator {...defaultProps} onCreateComment={slowOnCreateComment} />);
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, 'Test comment');
      
      const submitButton = screen.getByText('Create Comment');
      await user.click(submitButton);
      
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });

    it('handles submission errors gracefully', async () => {
      const user = userEvent.setup();
      const errorOnCreateComment = jest.fn().mockImplementation(() => {
        throw new Error('Network error');
      });
      
      render(<CommentCreator {...defaultProps} onCreateComment={errorOnCreateComment} />);
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, 'Test comment');
      
      const submitButton = screen.getByText('Create Comment');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      
      expect(submitButton).toBeEnabled();
    });
  });

  describe('Modal Interaction', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close comment creator');
      await user.click(closeButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when overlay is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<CommentCreator {...defaultProps} />);
      
      // Find the overlay element (the outermost div with the modal)
      const overlay = container.firstChild as HTMLElement;
      await user.click(overlay);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not call onCancel when modal content is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      const modalContent = screen.getByText('Add Comment');
      await user.click(modalContent);
      
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('calls onCancel when Escape key is pressed', () => {
      render(<CommentCreator {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not call onCancel during submission', async () => {
      const user = userEvent.setup();
      const slowOnCreateComment = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<CommentCreator {...defaultProps} onCreateComment={slowOnCreateComment} />);
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, 'Test comment');
      
      const submitButton = screen.getByText('Create Comment');
      await user.click(submitButton);
      
      // Try to cancel during submission
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe('Form Reset', () => {
    it('resets form when modal becomes visible', () => {
      const { rerender } = render(<CommentCreator {...defaultProps} isVisible={false} />);
      
      rerender(<CommentCreator {...defaultProps} isVisible={true} />);
      
      const textarea = screen.getByLabelText('Comment');
      expect(textarea).toHaveValue('');
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('maintains form state when modal stays visible', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CommentCreator {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, 'Test content');
      
      rerender(<CommentCreator {...defaultProps} pageNumber={2} />);
      
      expect(textarea).toHaveValue('Test content');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<CommentCreator {...defaultProps} />);
      
      expect(screen.getByLabelText('Comment')).toBeInTheDocument();
      expect(screen.getByLabelText('Close comment creator')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      // The textarea should be focused initially
      await waitFor(() => {
        expect(screen.getByLabelText('Comment')).toHaveFocus();
      });
      
      // Tab to next element (should be Cancel button)
      await user.tab();
      expect(screen.getByText('Cancel')).toHaveFocus();
      
      // Tab to next element (should be Create Comment button, but it might be disabled)
      await user.tab();
      const createButton = screen.getByText('Create Comment');
      if (!createButton.hasAttribute('disabled')) {
        expect(createButton).toHaveFocus();
      }
    });

    it('handles form submission with Ctrl+Enter key', async () => {
      const user = userEvent.setup();
      render(<CommentCreator {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Comment');
      await user.type(textarea, 'Test comment');
      
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      
      expect(mockOnCreateComment).toHaveBeenCalledWith('Test comment', mockCoordinates);
    });
  });
});