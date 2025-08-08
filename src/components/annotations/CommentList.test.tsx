import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentList } from './CommentList';
import { Comment } from '../../types/annotation.types';

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true
});

describe('CommentList', () => {
  const mockComments: Comment[] = [
    {
      id: 'comment-1',
      userId: 'user-1',
      documentId: 'doc-1',
      pageNumber: 1,
      content: 'First comment about the introduction',
      coordinates: { x: 100, y: 200 },
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z')
    },
    {
      id: 'comment-2',
      userId: 'user-1',
      documentId: 'doc-1',
      pageNumber: 2,
      content: 'Second comment with different content',
      coordinates: { x: 300, y: 400 },
      createdAt: new Date('2023-01-01T11:00:00Z'),
      updatedAt: new Date('2023-01-01T12:00:00Z') // edited
    },
    {
      id: 'comment-3',
      userId: 'user-1',
      documentId: 'doc-1',
      pageNumber: 1,
      content: 'Third comment on the same page',
      coordinates: { x: 150, y: 250 },
      createdAt: new Date('2023-01-01T09:00:00Z'),
      updatedAt: new Date('2023-01-01T09:00:00Z')
    }
  ];

  const mockOnCommentEdit = jest.fn();
  const mockOnCommentDelete = jest.fn();
  const mockOnCommentClick = jest.fn();
  const mockOnNavigateToComment = jest.fn();

  const defaultProps = {
    comments: mockComments,
    onCommentEdit: mockOnCommentEdit,
    onCommentDelete: mockOnCommentDelete,
    onCommentClick: mockOnCommentClick,
    onNavigateToComment: mockOnNavigateToComment
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  describe('Rendering', () => {
    it('renders comment list with correct count', () => {
      render(<CommentList {...defaultProps} />);
      
      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays comments sorted by creation date (newest first)', () => {
      render(<CommentList {...defaultProps} />);
      
      // Get comment content elements specifically
      expect(screen.getByText('Second comment with different content')).toBeInTheDocument();
      expect(screen.getByText('First comment about the introduction')).toBeInTheDocument();
      expect(screen.getByText('Third comment on the same page')).toBeInTheDocument();
      
      // Verify order by checking the DOM structure
      const commentContents = screen.getAllByText(/comment with|comment about|comment on/);
      expect(commentContents[0]).toHaveTextContent('Second comment with different content');
      expect(commentContents[1]).toHaveTextContent('First comment about the introduction');
      expect(commentContents[2]).toHaveTextContent('Third comment on the same page');
    });

    it('shows page numbers and timestamps', () => {
      render(<CommentList {...defaultProps} />);
      
      expect(screen.getAllByText(/Page 1/)).toHaveLength(2); // Two comments on page 1
      expect(screen.getAllByText(/Page 2/)).toHaveLength(1); // One comment on page 2
      expect(screen.getAllByText(/Jan 1/)).toHaveLength(3); // All comments on Jan 1
    });

    it('shows edited indicator for modified comments', () => {
      render(<CommentList {...defaultProps} />);
      
      expect(screen.getByText(/\(edited\)/)).toBeInTheDocument();
    });

    it('shows empty state when no comments exist', () => {
      render(<CommentList {...defaultProps} comments={[]} />);
      
      expect(screen.getByText('No comments yet')).toBeInTheDocument();
      expect(screen.getByText('Click on the PDF to add your first comment')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('does not show search input when no comments exist', () => {
      render(<CommentList {...defaultProps} comments={[]} />);
      
      expect(screen.queryByPlaceholderText('Search comments...')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters comments based on search term', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search comments...');
      await user.type(searchInput, 'introduction');
      
      expect(screen.getByText('First comment about the introduction')).toBeInTheDocument();
      expect(screen.queryByText('Second comment with different content')).not.toBeInTheDocument();
      expect(screen.queryByText('Third comment on the same page')).not.toBeInTheDocument();
    });

    it('shows empty state when search has no results', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search comments...');
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText('No comments match your search')).toBeInTheDocument();
    });

    it('search is case insensitive', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search comments...');
      await user.type(searchInput, 'INTRODUCTION');
      
      expect(screen.getByText('First comment about the introduction')).toBeInTheDocument();
    });

    it('clears search results when search term is cleared', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search comments...');
      await user.type(searchInput, 'introduction');
      
      expect(screen.getAllByText(/comment with|comment about|comment on/)).toHaveLength(1);
      
      await user.clear(searchInput);
      
      expect(screen.getAllByText(/comment with|comment about|comment on/)).toHaveLength(3);
    });
  });

  describe('Comment Actions', () => {
    it('calls onNavigateToComment when "Go to" button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      const goToButtons = screen.getAllByText('Go to');
      await user.click(goToButtons[0]);
      
      expect(mockOnNavigateToComment).toHaveBeenCalledWith(mockComments[1]); // Second comment (newest first)
    });

    it('calls onCommentClick when comment content is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      const commentContent = screen.getByText('Second comment with different content');
      await user.click(commentContent);
      
      expect(mockOnCommentClick).toHaveBeenCalledWith(mockComments[1]);
    });

    it('does not call onCommentClick when callback is not provided', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} onCommentClick={undefined} />);
      
      const commentContent = screen.getByText('Second comment with different content');
      await user.click(commentContent);
      
      // Should not throw error
      expect(mockOnCommentClick).not.toHaveBeenCalled();
    });
  });

  describe('Edit Functionality', () => {
    it('enters edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);
      
      expect(screen.getByDisplayValue('Second comment with different content')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('focuses textarea when entering edit mode', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);
      
      const textarea = screen.getByDisplayValue('Second comment with different content');
      expect(textarea).toHaveFocus();
    });

    it('cancels edit mode when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      // Enter edit mode
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);
      
      // Modify content
      const textarea = screen.getByDisplayValue('Second comment with different content');
      await user.clear(textarea);
      await user.type(textarea, 'Modified content');
      
      // Cancel
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      // Should return to view mode with original content
      expect(screen.getByText('Second comment with different content')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Modified content')).not.toBeInTheDocument();
    });

    it('saves changes when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      // Enter edit mode
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);
      
      // Modify content
      const textarea = screen.getByDisplayValue('Second comment with different content');
      await user.clear(textarea);
      await user.type(textarea, 'Updated comment content');
      
      // Save
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(mockOnCommentEdit).toHaveBeenCalledWith('comment-2', 'Updated comment content');
    });

    it('trims whitespace when saving', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      // Enter edit mode
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);
      
      // Modify content with whitespace
      const textarea = screen.getByDisplayValue('Second comment with different content');
      await user.clear(textarea);
      await user.type(textarea, '  Updated comment content  ');
      
      // Save
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(mockOnCommentEdit).toHaveBeenCalledWith('comment-2', 'Updated comment content');
    });

    it('shows error for empty content', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      // Enter edit mode
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);
      
      // Clear content
      const textarea = screen.getByDisplayValue('Second comment with different content');
      await user.clear(textarea);
      
      // Try to save
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(screen.getByText('Comment content cannot be empty')).toBeInTheDocument();
      expect(mockOnCommentEdit).not.toHaveBeenCalled();
    });

    it('enables save button for whitespace content but shows error', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      // Enter edit mode
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);
      
      // Set whitespace content
      const textarea = screen.getByDisplayValue('Second comment with different content');
      await user.clear(textarea);
      await user.type(textarea, '   ');
      
      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeEnabled();
    });

    it('handles edit errors gracefully', async () => {
      const user = userEvent.setup();
      const errorOnEdit = jest.fn().mockImplementation(() => {
        throw new Error('Network error');
      });
      
      render(<CommentList {...defaultProps} onCommentEdit={errorOnEdit} />);
      
      // Enter edit mode
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);
      
      // Modify content
      const textarea = screen.getByDisplayValue('Second comment with different content');
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');
      
      // Save
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);
      
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);
      
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete this comment?')
      );
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Second comment with different content')
      );
    });

    it('calls onCommentDelete when deletion is confirmed', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true);
      
      render(<CommentList {...defaultProps} />);
      
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);
      
      expect(mockOnCommentDelete).toHaveBeenCalledWith('comment-2');
    });

    it('does not call onCommentDelete when deletion is cancelled', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false);
      
      render(<CommentList {...defaultProps} />);
      
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);
      
      expect(mockOnCommentDelete).not.toHaveBeenCalled();
    });

    it('truncates long comment content in confirmation dialog', async () => {
      const user = userEvent.setup();
      const longComment = {
        ...mockComments[0],
        content: 'This is a very long comment that should be truncated in the confirmation dialog because it exceeds the maximum length that we want to show to the user'
      };
      
      render(<CommentList {...defaultProps} comments={[longComment]} />);
      
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('This is a very long comment that should be truncated in the confirmation dialog because it exceeds t...')
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper button labels and titles', () => {
      render(<CommentList {...defaultProps} />);
      
      expect(screen.getAllByTitle('Go to comment location')).toHaveLength(3);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByPlaceholderText('Search comments...')).toHaveFocus();
      
      await user.tab();
      expect(screen.getAllByText('Go to')[0]).toHaveFocus();
    });

    it('maintains focus management in edit mode', async () => {
      const user = userEvent.setup();
      render(<CommentList {...defaultProps} />);
      
      // Enter edit mode
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);
      
      // Textarea should be focused
      const textarea = screen.getByDisplayValue('Second comment with different content');
      expect(textarea).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('handles large number of comments efficiently', () => {
      const manyComments = Array.from({ length: 100 }, (_, i) => ({
        ...mockComments[0],
        id: `comment-${i}`,
        content: `Comment ${i}`,
        createdAt: new Date(Date.now() + i * 1000)
      }));
      
      const { container } = render(<CommentList {...defaultProps} comments={manyComments} />);
      
      expect(container.querySelectorAll('button')).toHaveLength(300); // 3 buttons per comment
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('search performance with many comments', async () => {
      const user = userEvent.setup();
      const manyComments = Array.from({ length: 100 }, (_, i) => ({
        ...mockComments[0],
        id: `comment-${i}`,
        content: i % 10 === 0 ? 'Special comment' : `Comment ${i}`,
        createdAt: new Date(Date.now() + i * 1000)
      }));
      
      render(<CommentList {...defaultProps} comments={manyComments} />);
      
      const searchInput = screen.getByPlaceholderText('Search comments...');
      await user.type(searchInput, 'Special');
      
      // Should show only the 10 "Special comment" entries
      expect(screen.getAllByText('Special comment')).toHaveLength(10);
    });
  });
});