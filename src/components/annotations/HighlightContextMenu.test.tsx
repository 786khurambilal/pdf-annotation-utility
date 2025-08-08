import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HighlightContextMenu } from './HighlightContextMenu';
import { Highlight } from '../../types/annotation.types';

const mockHighlight: Highlight = {
  id: 'test-highlight-1',
  userId: 'user-1',
  documentId: 'doc-1',
  pageNumber: 1,
  startOffset: 0,
  endOffset: 10,
  selectedText: 'Test highlight text',
  color: '#FFFF00',
  coordinates: { x: 100, y: 200, width: 150, height: 20 },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

const mockPosition = { x: 300, y: 400 };

describe('HighlightContextMenu', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders context menu when visible', () => {
    render(
      <HighlightContextMenu
        highlight={mockHighlight}
        position={mockPosition}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    expect(screen.getByText('Edit Highlight')).toBeInTheDocument();
    expect(screen.getByText('Delete Highlight')).toBeInTheDocument();
    expect(screen.getByText('"Test highlight text"')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(
      <HighlightContextMenu
        highlight={mockHighlight}
        position={mockPosition}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        isVisible={false}
      />
    );

    expect(screen.queryByText('Edit Highlight')).not.toBeInTheDocument();
  });

  it('does not render when highlight is null', () => {
    render(
      <HighlightContextMenu
        highlight={null}
        position={mockPosition}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    expect(screen.queryByText('Edit Highlight')).not.toBeInTheDocument();
  });

  it('does not render when position is null', () => {
    render(
      <HighlightContextMenu
        highlight={mockHighlight}
        position={null}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    expect(screen.queryByText('Edit Highlight')).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <HighlightContextMenu
        highlight={mockHighlight}
        position={mockPosition}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    fireEvent.click(screen.getByText('Edit Highlight'));

    expect(mockOnEdit).toHaveBeenCalledWith(mockHighlight);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <HighlightContextMenu
        highlight={mockHighlight}
        position={mockPosition}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    fireEvent.click(screen.getByText('Delete Highlight'));

    expect(mockOnDelete).toHaveBeenCalledWith(mockHighlight);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes menu when Escape key is pressed', async () => {
    render(
      <HighlightContextMenu
        highlight={mockHighlight}
        position={mockPosition}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('closes menu when clicking outside', async () => {
    render(
      <div>
        <div data-testid="outside">Outside element</div>
        <HighlightContextMenu
          highlight={mockHighlight}
          position={mockPosition}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onClose={mockOnClose}
          isVisible={true}
        />
      </div>
    );

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('truncates long highlight text in preview', () => {
    const longHighlight = {
      ...mockHighlight,
      selectedText: 'This is a very long highlight text that should be truncated when displayed in the context menu preview'
    };

    render(
      <HighlightContextMenu
        highlight={longHighlight}
        position={mockPosition}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    expect(screen.getByText('"This is a very long highlight ..."')).toBeInTheDocument();
  });

  it('positions menu at correct coordinates', () => {
    const { container } = render(
      <HighlightContextMenu
        highlight={mockHighlight}
        position={mockPosition}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        isVisible={true}
      />
    );

    const menu = container.firstChild as HTMLElement;
    expect(menu).toHaveStyle({
      left: '300px',
      top: '400px'
    });
  });
});