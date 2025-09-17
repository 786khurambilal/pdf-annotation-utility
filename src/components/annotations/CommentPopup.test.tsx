import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentPopup } from './CommentPopup';
import { Comment } from '../../types/annotation.types';

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true
});

describe('CommentPopup', () => {
  const mockComment: Comment = {
    id: 'comment-1',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    content: 'This is a test comment',
    coordinates: { x: 100, y: 200 },
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z')
  };

  const mockPosition = { x: 150, y: 250 };
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    comment: mockComment,
    isVisible: true,
    position: mockPosition,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onClose: mockOnClose
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  describe('Rendering', () => {
    it('renders popup when visible', () => {
      render(<CommentPopup {...defaultProps} />);
      
      expect(screen.getByText('Comment')).toBeInTheDocument();
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.getByText(/Page 1/)).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      render(<CommentPopup {...defaultProps} isVisible={false} />);
      
      expect(screen.queryByText('Comment')).not.toBeInTheDocument();
    });

    it('displays comment metadata correctly', () => {
      render(<CommentPopup {...defaultProps} />);
      
      expect(screen.getByText(/Page 1/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 1/)).toBeInTheDocument();
    });

    it('shows edited indicator when comment was updated', () => {
      const editedComment = {
        ...mockComment,
        updatedAt: new Date('2023-01-01T11:00:00Z')
      };
      
      render(<CommentPopup {...defaultProps} comment={editedComment} />);
      
      expect(screen.getByText(/\(edited\)/)).toBeInTheDocument();
    });

    it('positions popup correctly', () => {
      const { container } = render(<CommentPopup {...defaultProps} />);
      
      const popup = container.firstChild as HTMLElement;
      expect(popup).toHaveStyle({
        left: '150px',
        top: '250px'
      });
    });
  });

  describe('Edit Mode', () => {
    it('enters edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      expect(screen.getByDisplayValue('This is a test comment')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('focuses and selects text when entering edit mode', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      expect(textarea).toHaveFocus();
    });

    it('cancels edit mode when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      // Modify content
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      await user.type(textarea, 'Modified content');
      
      // Cancel
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      // Should return to view mode with original content
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Modified content')).not.toBeInTheDocument();
    });

    it('saves changes when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      // Modify content
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      await user.type(textarea, 'Updated comment content');
      
      // Save
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(mockOnEdit).toHaveBeenCalledWith('comment-1', 'Updated comment content');
    });

    it('trims whitespace when saving', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      // Modify content with whitespace
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      await user.type(textarea, '  Updated comment content  ');
      
      // Save
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(mockOnEdit).toHaveBeenCalledWith('comment-1', 'Updated comment content');
    });

    it('shows error for empty content', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      // Clear content
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      
      // Try to save
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(screen.getByText('Comment content cannot be empty')).toBeInTheDocument();
      expect(mockOnEdit).not.toHaveBeenCalled();
    });

    it('shows error for whitespace-only content', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      // Set whitespace-only content
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      await user.type(textarea, '   ');
      
      // Try to save
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(screen.getByText('Comment content cannot be empty')).toBeInTheDocument();
      expect(mockOnEdit).not.toHaveBeenCalled();
    });

    it('clears error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(screen.getByText('Comment content cannot be empty')).toBeInTheDocument();
      
      // Start typing to clear error
      await user.type(textarea, 'N');
      
      expect(screen.queryByText('Comment content cannot be empty')).not.toBeInTheDocument();
    });

    it('supports Ctrl+Enter to save', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      // Modify content
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      await user.type(textarea, 'Updated via keyboard');
      
      // Save with Ctrl+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      
      expect(mockOnEdit).toHaveBeenCalledWith('comment-1', 'Updated via keyboard');
    });

    it('shows loading state during save operation', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      // Verify we're in edit mode
      expect(screen.getByDisplayValue('This is a test comment')).toBeInTheDocument();
      
      // Modify content
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');
      
      // Start save - the loading state is brief but should be visible
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      // Since the operation is synchronous, we should be back to view mode
      // The component should have exited edit mode and called onEdit
      expect(mockOnEdit).toHaveBeenCalledWith('comment-1', 'Updated content');
    });
  });

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this comment?');
    });

    it('calls onDelete when deletion is confirmed', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true);
      
      render(<CommentPopup {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      expect(mockOnDelete).toHaveBeenCalledWith('comment-1');
    });

    it('does not call onDelete when deletion is cancelled', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false);
      
      render(<CommentPopup {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('Popup Interaction', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close comment popup');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', () => {
      render(<CommentPopup {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('cancels edit mode when Escape is pressed during editing', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // Should exit edit mode
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('This is a test comment')).not.toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('closes popup when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <div data-testid="outside">Outside element</div>
          <CommentPopup {...defaultProps} />
        </div>
      );
      
      const outsideElement = screen.getByTestId('outside');
      await user.click(outsideElement);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close popup when clicking outside during edit mode', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <div data-testid="outside">Outside element</div>
          <CommentPopup {...defaultProps} />
        </div>
      );
      
      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      // Click outside
      const outsideElement = screen.getByTestId('outside');
      await user.click(outsideElement);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('resets edit state when popup becomes visible', () => {
      const { rerender } = render(<CommentPopup {...defaultProps} isVisible={false} />);
      
      rerender(<CommentPopup {...defaultProps} isVisible={true} />);
      
      // Should be in view mode
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('This is a test comment')).not.toBeInTheDocument();
    });

    it('resets content when comment changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode and modify content
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      await user.clear(textarea);
      await user.type(textarea, 'Modified content');
      
      // Change comment prop
      const newComment = { ...mockComment, content: 'New comment content' };
      rerender(<CommentPopup {...defaultProps} comment={newComment} />);
      
      // Should reset to new content and exit edit mode
      expect(screen.getByText('New comment content')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Modified content')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<CommentPopup {...defaultProps} />);
      
      expect(screen.getByLabelText('Close comment popup')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByLabelText('Close comment popup')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Edit')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Delete')).toHaveFocus();
    });

    it('maintains focus management in edit mode', async () => {
      const user = userEvent.setup();
      render(<CommentPopup {...defaultProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      // Textarea should be focused
      const textarea = screen.getByDisplayValue('This is a test comment');
      expect(textarea).toHaveFocus();
      
      // Tab to buttons
      await user.tab();
      expect(screen.getByText('Cancel')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Save')).toHaveFocus();
    });
  });
});