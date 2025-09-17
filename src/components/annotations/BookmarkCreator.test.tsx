import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarkCreator } from './BookmarkCreator';

describe('BookmarkCreator', () => {
  const defaultProps = {
    pageNumber: 5,
    onCreateBookmark: jest.fn(),
    onCancel: jest.fn(),
    isVisible: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when visible', () => {
    render(<BookmarkCreator {...defaultProps} />);
    
    expect(screen.getByRole('heading', { name: 'Create Bookmark' })).toBeInTheDocument();
    expect(screen.getByText('Page 5')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<BookmarkCreator {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByRole('heading', { name: 'Create Bookmark' })).not.toBeInTheDocument();
  });

  it('focuses on title input when opened', () => {
    render(<BookmarkCreator {...defaultProps} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toHaveFocus();
  });

  it('shows required indicator for title field', () => {
    render(<BookmarkCreator {...defaultProps} />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('disables create button when title is empty', () => {
    render(<BookmarkCreator {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: /create bookmark/i });
    expect(createButton).toBeDisabled();
  });

  it('enables create button when title is provided', async () => {
    const user = userEvent.setup();
    render(<BookmarkCreator {...defaultProps} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const createButton = screen.getByRole('button', { name: /create bookmark/i });
    
    await user.type(titleInput, 'Test Bookmark');
    
    expect(createButton).toBeEnabled();
  });

  it('calls onCreateBookmark with title only when description is empty', async () => {
    const user = userEvent.setup();
    const onCreateBookmark = jest.fn();
    render(<BookmarkCreator {...defaultProps} onCreateBookmark={onCreateBookmark} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const createButton = screen.getByRole('button', { name: /create bookmark/i });
    
    await user.type(titleInput, 'Test Bookmark');
    await user.click(createButton);
    
    expect(onCreateBookmark).toHaveBeenCalledWith('Test Bookmark', undefined);
  });

  it('calls onCreateBookmark with title and description when both provided', async () => {
    const user = userEvent.setup();
    const onCreateBookmark = jest.fn();
    render(<BookmarkCreator {...defaultProps} onCreateBookmark={onCreateBookmark} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const createButton = screen.getByRole('button', { name: /create bookmark/i });
    
    await user.type(titleInput, 'Test Bookmark');
    await user.type(descriptionInput, 'Test Description');
    await user.click(createButton);
    
    expect(onCreateBookmark).toHaveBeenCalledWith('Test Bookmark', 'Test Description');
  });

  it('trims whitespace from title and description', async () => {
    const user = userEvent.setup();
    const onCreateBookmark = jest.fn();
    render(<BookmarkCreator {...defaultProps} onCreateBookmark={onCreateBookmark} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const createButton = screen.getByRole('button', { name: /create bookmark/i });
    
    await user.type(titleInput, '  Test Bookmark  ');
    await user.type(descriptionInput, '  Test Description  ');
    await user.click(createButton);
    
    expect(onCreateBookmark).toHaveBeenCalledWith('Test Bookmark', 'Test Description');
  });

  it('passes undefined for description when only whitespace', async () => {
    const user = userEvent.setup();
    const onCreateBookmark = jest.fn();
    render(<BookmarkCreator {...defaultProps} onCreateBookmark={onCreateBookmark} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const createButton = screen.getByRole('button', { name: /create bookmark/i });
    
    await user.type(titleInput, 'Test Bookmark');
    await user.type(descriptionInput, '   ');
    await user.click(createButton);
    
    expect(onCreateBookmark).toHaveBeenCalledWith('Test Bookmark', undefined);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<BookmarkCreator {...defaultProps} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when overlay is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<BookmarkCreator {...defaultProps} onCancel={onCancel} />);
    
    const overlay = document.querySelector('.bookmark-creator-overlay');
    await user.click(overlay!);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not call onCancel when modal content is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<BookmarkCreator {...defaultProps} onCancel={onCancel} />);
    
    const modal = document.querySelector('.bookmark-creator-modal');
    await user.click(modal!);
    
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('clears form fields when cancelled', async () => {
    const user = userEvent.setup();
    render(<BookmarkCreator {...defaultProps} />);
    
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    
    await user.type(titleInput, 'Test Title');
    await user.type(descriptionInput, 'Test Description');
    await user.click(cancelButton);
    
    expect(titleInput.value).toBe('');
    expect(descriptionInput.value).toBe('');
  });

  it('clears form fields after successful creation', async () => {
    const user = userEvent.setup();
    const onCreateBookmark = jest.fn().mockResolvedValue(undefined);
    render(<BookmarkCreator {...defaultProps} onCreateBookmark={onCreateBookmark} />);
    
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    const createButton = screen.getByRole('button', { name: /create bookmark/i });
    
    await user.type(titleInput, 'Test Title');
    await user.type(descriptionInput, 'Test Description');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(titleInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
    });
  });

  it('shows loading state during creation', async () => {
    const user = userEvent.setup();
    let resolvePromise: () => void;
    const onCreateBookmark = jest.fn(() => new Promise<void>((resolve) => {
      resolvePromise = resolve;
    }));
    
    render(<BookmarkCreator {...defaultProps} onCreateBookmark={onCreateBookmark} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const createButton = screen.getByRole('button', { name: /create bookmark/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    
    await user.type(titleInput, 'Test Title');
    await user.click(createButton);
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(createButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(titleInput).toBeDisabled();
    
    resolvePromise!();
    await waitFor(() => {
      expect(screen.getByText('Create Bookmark')).toBeInTheDocument();
    });
  });

  it('handles creation errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onCreateBookmark = jest.fn().mockRejectedValue(new Error('Creation failed'));
    render(<BookmarkCreator {...defaultProps} onCreateBookmark={onCreateBookmark} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const createButton = screen.getByRole('button', { name: /create bookmark/i });
    
    await user.type(titleInput, 'Test Title');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Bookmark' })).toBeInTheDocument();
      expect(createButton).toBeEnabled();
    });
    
    consoleSpy.mockRestore();
  });

  it('enforces maximum length for title', () => {
    render(<BookmarkCreator {...defaultProps} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toHaveAttribute('maxLength', '100');
  });

  it('enforces maximum length for description', () => {
    render(<BookmarkCreator {...defaultProps} />);
    
    const descriptionInput = screen.getByLabelText(/description/i);
    expect(descriptionInput).toHaveAttribute('maxLength', '500');
  });

  it('submits form when Enter is pressed in title field', async () => {
    const user = userEvent.setup();
    const onCreateBookmark = jest.fn();
    render(<BookmarkCreator {...defaultProps} onCreateBookmark={onCreateBookmark} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    
    await user.type(titleInput, 'Test Title');
    await user.keyboard('{Enter}');
    
    expect(onCreateBookmark).toHaveBeenCalledWith('Test Title', undefined);
  });

  it('displays correct page number', () => {
    render(<BookmarkCreator {...defaultProps} pageNumber={42} />);
    
    expect(screen.getByText('Page 42')).toBeInTheDocument();
  });
});