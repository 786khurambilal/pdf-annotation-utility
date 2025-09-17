import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HighlightEditor } from './HighlightEditor';
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

describe('HighlightEditor', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders editor when visible', () => {
    render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    expect(screen.getByText('Edit Highlight')).toBeInTheDocument();
    expect(screen.getByText('"Test highlight text"')).toBeInTheDocument();
    expect(screen.getByText('Page 1 • Created 1/1/2023')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={false}
      />
    );

    expect(screen.queryByText('Edit Highlight')).not.toBeInTheDocument();
  });

  it('does not render when highlight is null', () => {
    render(
      <HighlightEditor
        highlight={null}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    expect(screen.queryByText('Edit Highlight')).not.toBeInTheDocument();
  });

  it('initializes with current highlight color selected', () => {
    render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    // Yellow should be selected (default color in mock)
    const yellowOption = screen.getByRole('button', { name: /yellow/i });
    expect(yellowOption).toHaveStyle('border: 2px solid #007bff');
  });

  it('allows color selection', () => {
    render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const greenOption = screen.getByRole('button', { name: /green/i });
    fireEvent.click(greenOption);

    expect(greenOption).toHaveStyle('border: 2px solid #007bff');
  });

  it('disables save button when no changes made', () => {
    render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when color is changed', () => {
    render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const greenOption = screen.getByRole('button', { name: /green/i });
    fireEvent.click(greenOption);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  it('calls onSave with updated color when save is clicked', () => {
    render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const greenOption = screen.getByRole('button', { name: /green/i });
    fireEvent.click(greenOption);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(mockHighlight, { color: '#90EE90' });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onCancel when clicking outside modal', () => {
    const { container } = render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    // Click on the overlay (outside the modal)
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows updated date when highlight was modified', () => {
    const updatedHighlight = {
      ...mockHighlight,
      updatedAt: new Date('2023-01-15')
    };

    render(
      <HighlightEditor
        highlight={updatedHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    expect(screen.getByText('Page 1 • Created 1/1/2023 • Updated 1/15/2023')).toBeInTheDocument();
  });

  it('renders all available color options', () => {
    render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    expect(screen.getByText('Yellow')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Pink')).toBeInTheDocument();
    expect(screen.getByText('Orange')).toBeInTheDocument();
    expect(screen.getByText('Purple')).toBeInTheDocument();
  });

  it('updates color selection when highlight prop changes', () => {
    const { rerender } = render(
      <HighlightEditor
        highlight={mockHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    // Initially yellow should be selected
    expect(screen.getByRole('button', { name: /yellow/i })).toHaveStyle('border: 2px solid #007bff');

    // Change highlight to green
    const greenHighlight = { ...mockHighlight, color: '#90EE90' };
    rerender(
      <HighlightEditor
        highlight={greenHighlight}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    // Now green should be selected
    expect(screen.getByRole('button', { name: /green/i })).toHaveStyle('border: 2px solid #007bff');
  });
});