import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarkPanel } from './BookmarkPanel';
import { Bookmark } from '../../types/annotation.types';

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true
});

describe('BookmarkPanel', () => {
  const mockBookmarks: Bookmark[] = [
    {
      id: '1',
      userId: 'user1',
      documentId: 'doc1',
      pageNumber: 5,
      title: 'Important Chapter',
      description: 'This chapter covers key concepts',
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z')
    },
    {
      id: '2',
      userId: 'user1',
      documentId: 'doc1',
      pageNumber: 12,
      title: 'Summary',
      createdAt: new Date('2023-01-02T15:30:00Z'),
      updatedAt: new Date('2023-01-02T15:30:00Z')
    }
  ];

  const defaultProps = {
    bookmarks: mockBookmarks,
    onBookmarkClick: jest.fn(),
    onBookmarkEdit: jest.fn(),
    onBookmarkDelete: jest.fn(),
    isVisible: true,
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  it('renders when visible', () => {
    render(<BookmarkPanel {...defaultProps} />);
    
    expect(screen.getByRole('heading', { name: 'Bookmarks' })).toBeInTheDocument();
    expect(screen.getByText('Important Chapter')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<BookmarkPanel {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByRole('heading', { name: 'Bookmarks' })).not.toBeInTheDocument();
  });

  it('displays empty state when no bookmarks', () => {
    render(<BookmarkPanel {...defaultProps} bookmarks={[]} />);
    
    expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
    expect(screen.getByText('Create bookmarks to quickly navigate to important pages')).toBeInTheDocument();
  });

  it('displays bookmark information correctly', () => {
    render(<BookmarkPanel {...defaultProps} />);
    
    // First bookmark
    expect(screen.getByText('Important Chapter')).toBeInTheDocument();
    expect(screen.getByText('This chapter covers key concepts')).toBeInTheDocument();
    expect(screen.getByText('Page 5')).toBeInTheDocument();
    
    // Second bookmark (no description)
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Page 12')).toBeInTheDocument();
  });

  it('calls onBookmarkClick when bookmark is clicked', async () => {
    const user = userEvent.setup();
    const onBookmarkClick = jest.fn();
    render(<BookmarkPanel {...defaultProps} onBookmarkClick={onBookmarkClick} />);
    
    const bookmarkMain = screen.getByText('Important Chapter').closest('.bookmark-main');
    await user.click(bookmarkMain!);
    
    expect(onBookmarkClick).toHaveBeenCalledWith(mockBookmarks[0]);
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<BookmarkPanel {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close bookmarks panel');
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<BookmarkPanel {...defaultProps} onClose={onClose} />);
    
    const overlay = document.querySelector('.bookmark-panel-overlay');
    await user.click(overlay!);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when panel content is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<BookmarkPanel {...defaultProps} onClose={onClose} />);
    
    const panel = document.querySelector('.bookmark-panel');
    await user.click(panel!);
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookmarkPanel {...defaultProps} />);
    
    const editButtons = screen.getAllByLabelText('Edit bookmark');
    await user.click(editButtons[0]);
    
    expect(screen.getByDisplayValue('Important Chapter')).toBeInTheDocument();
    expect(screen.getByDisplayValue('This chapter covers key concepts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('saves edited bookmark when save button is clicked', async () => {
    const user = userEvent.setup();
    const onBookmarkEdit = jest.fn();
    render(<BookmarkPanel {...defaultProps} onBookmarkEdit={onBookmarkEdit} />);
    
    const editButtons = screen.getAllByLabelText('Edit bookmark');
    await user.click(editButtons[0]);
    
    const titleInput = screen.getByDisplayValue('Important Chapter');
    const descriptionInput = screen.getByDisplayValue('This chapter covers key concepts');
    
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Chapter');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated description');
    
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);
    
    expect(onBookmarkEdit).toHaveBeenCalledWith({
      ...mockBookmarks[0],
      title: 'Updated Chapter',
      description: 'Updated description'
    });
  });

  it('trims whitespace when saving edited bookmark', async () => {
    const user = userEvent.setup();
    const onBookmarkEdit = jest.fn();
    render(<BookmarkPanel {...defaultProps} onBookmarkEdit={onBookmarkEdit} />);
    
    const editButtons = screen.getAllByLabelText('Edit bookmark');
    await user.click(editButtons[0]);
    
    const titleInput = screen.getByDisplayValue('Important Chapter');
    const descriptionInput = screen.getByDisplayValue('This chapter covers key concepts');
    
    await user.clear(titleInput);
    await user.type(titleInput, '  Updated Chapter  ');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, '  Updated description  ');
    
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);
    
    expect(onBookmarkEdit).toHaveBeenCalledWith({
      ...mockBookmarks[0],
      title: 'Updated Chapter',
      description: 'Updated description'
    });
  });

  it('sets description to undefined when empty after trimming', async () => {
    const user = userEvent.setup();
    const onBookmarkEdit = jest.fn();
    render(<BookmarkPanel {...defaultProps} onBookmarkEdit={onBookmarkEdit} />);
    
    const editButtons = screen.getAllByLabelText('Edit bookmark');
    await user.click(editButtons[0]);
    
    const titleInput = screen.getByDisplayValue('Important Chapter');
    const descriptionInput = screen.getByDisplayValue('This chapter covers key concepts');
    
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Chapter');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, '   ');
    
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);
    
    expect(onBookmarkEdit).toHaveBeenCalledWith({
      ...mockBookmarks[0],
      title: 'Updated Chapter',
      description: undefined
    });
  });

  it('disables save button when title is empty', async () => {
    const user = userEvent.setup();
    render(<BookmarkPanel {...defaultProps} />);
    
    const editButtons = screen.getAllByLabelText('Edit bookmark');
    await user.click(editButtons[0]);
    
    const titleInput = screen.getByDisplayValue('Important Chapter');
    await user.clear(titleInput);
    
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();
  });

  it('cancels edit mode when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookmarkPanel {...defaultProps} />);
    
    const editButtons = screen.getAllByLabelText('Edit bookmark');
    await user.click(editButtons[0]);
    
    const titleInput = screen.getByDisplayValue('Important Chapter');
    await user.clear(titleInput);
    await user.type(titleInput, 'Changed Title');
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);
    
    expect(screen.queryByDisplayValue('Changed Title')).not.toBeInTheDocument();
    expect(screen.getByText('Important Chapter')).toBeInTheDocument();
  });

  it('shows confirmation dialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookmarkPanel {...defaultProps} />);
    
    const deleteButtons = screen.getAllByLabelText('Delete bookmark');
    await user.click(deleteButtons[0]);
    
    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this bookmark?');
  });

  it('calls onBookmarkDelete when deletion is confirmed', async () => {
    const user = userEvent.setup();
    const onBookmarkDelete = jest.fn();
    mockConfirm.mockReturnValue(true);
    render(<BookmarkPanel {...defaultProps} onBookmarkDelete={onBookmarkDelete} />);
    
    const deleteButtons = screen.getAllByLabelText('Delete bookmark');
    await user.click(deleteButtons[0]);
    
    expect(onBookmarkDelete).toHaveBeenCalledWith('1');
  });

  it('does not call onBookmarkDelete when deletion is cancelled', async () => {
    const user = userEvent.setup();
    const onBookmarkDelete = jest.fn();
    mockConfirm.mockReturnValue(false);
    render(<BookmarkPanel {...defaultProps} onBookmarkDelete={onBookmarkDelete} />);
    
    const deleteButtons = screen.getAllByLabelText('Delete bookmark');
    await user.click(deleteButtons[0]);
    
    expect(onBookmarkDelete).not.toHaveBeenCalled();
  });

  it('formats dates correctly', () => {
    render(<BookmarkPanel {...defaultProps} />);
    
    // The exact format may vary based on locale, but we can check that dates are displayed
    expect(screen.getByText(/Jan 1/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 2/)).toBeInTheDocument();
  });

  it('enforces maximum length for title input', async () => {
    const user = userEvent.setup();
    render(<BookmarkPanel {...defaultProps} />);
    
    const editButtons = screen.getAllByLabelText('Edit bookmark');
    await user.click(editButtons[0]);
    
    const titleInput = screen.getByDisplayValue('Important Chapter');
    expect(titleInput).toHaveAttribute('maxLength', '100');
  });

  it('enforces maximum length for description input', async () => {
    const user = userEvent.setup();
    render(<BookmarkPanel {...defaultProps} />);
    
    const editButtons = screen.getAllByLabelText('Edit bookmark');
    await user.click(editButtons[0]);
    
    const descriptionInput = screen.getByDisplayValue('This chapter covers key concepts');
    expect(descriptionInput).toHaveAttribute('maxLength', '500');
  });

  it('focuses on title input when entering edit mode', async () => {
    const user = userEvent.setup();
    render(<BookmarkPanel {...defaultProps} />);
    
    const editButtons = screen.getAllByLabelText('Edit bookmark');
    await user.click(editButtons[0]);
    
    const titleInput = screen.getByDisplayValue('Important Chapter');
    expect(titleInput).toHaveFocus();
  });

  it('handles bookmarks without description', () => {
    const bookmarkWithoutDescription = {
      ...mockBookmarks[1],
      description: undefined
    };
    
    render(<BookmarkPanel {...defaultProps} bookmarks={[bookmarkWithoutDescription]} />);
    
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Page 12')).toBeInTheDocument();
    expect(screen.queryByText('This chapter covers key concepts')).not.toBeInTheDocument();
  });

  it('displays bookmarks in the order provided', () => {
    render(<BookmarkPanel {...defaultProps} />);
    
    const bookmarkItems = document.querySelectorAll('.bookmark-item');
    expect(bookmarkItems).toHaveLength(2);
    
    expect(bookmarkItems[0]).toHaveTextContent('Important Chapter');
    expect(bookmarkItems[1]).toHaveTextContent('Summary');
  });
});