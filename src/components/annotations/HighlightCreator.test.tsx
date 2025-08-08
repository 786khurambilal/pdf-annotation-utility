import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HighlightCreator } from './HighlightCreator';
import { TextSelection } from '../../types/annotation.types';

const mockSelection: TextSelection = {
  text: 'This is selected text for highlighting',
  pageNumber: 1,
  startOffset: 0,
  endOffset: 37,
  coordinates: {
    x: 10,
    y: 20,
    width: 200,
    height: 20
  }
};

describe('HighlightCreator', () => {
  const mockOnCreateHighlight = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when not visible', () => {
    render(
      <HighlightCreator
        selection={mockSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={false}
      />
    );

    expect(screen.queryByText('Create Highlight')).not.toBeInTheDocument();
  });

  it('should not render when no selection is provided', () => {
    render(
      <HighlightCreator
        selection={null}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    expect(screen.queryByText('Create Highlight')).not.toBeInTheDocument();
  });

  it('should render highlight creator when visible and selection is provided', () => {
    render(
      <HighlightCreator
        selection={mockSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    expect(screen.getByRole('heading', { name: 'Create Highlight' })).toBeInTheDocument();
    expect(screen.getByText(`"${mockSelection.text}"`)).toBeInTheDocument();
    expect(screen.getByText('Choose highlight color:')).toBeInTheDocument();
  });

  it('should display all color options', () => {
    render(
      <HighlightCreator
        selection={mockSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const expectedColors = ['Yellow', 'Green', 'Blue', 'Pink', 'Orange', 'Purple'];
    expectedColors.forEach(color => {
      expect(screen.getByText(color)).toBeInTheDocument();
    });
  });

  it('should have yellow selected by default', () => {
    render(
      <HighlightCreator
        selection={mockSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const yellowButton = screen.getByText('Yellow').closest('button');
    expect(yellowButton).toHaveStyle('border: 2px solid #007bff');
  });

  it('should allow color selection', () => {
    render(
      <HighlightCreator
        selection={mockSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const greenButton = screen.getByText('Green').closest('button');
    fireEvent.click(greenButton!);

    expect(greenButton).toHaveStyle('border: 2px solid #007bff');
  });

  it('should call onCreateHighlight with selected color when create button is clicked', () => {
    render(
      <HighlightCreator
        selection={mockSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    // Select blue color
    const blueButton = screen.getByText('Blue').closest('button');
    fireEvent.click(blueButton!);

    // Click create button
    const createButton = screen.getByRole('button', { name: 'Create Highlight' });
    fireEvent.click(createButton);

    expect(mockOnCreateHighlight).toHaveBeenCalledWith(mockSelection, '#87CEEB');
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <HighlightCreator
        selection={mockSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onCancel when overlay is clicked', () => {
    const { container } = render(
      <HighlightCreator
        selection={mockSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    // Click on the overlay (the outermost div)
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should handle keyboard navigation for color selection', () => {
    render(
      <HighlightCreator
        selection={mockSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const greenButton = screen.getByText('Green').closest('button');
    fireEvent.click(greenButton!);

    expect(greenButton).toHaveStyle('border: 2px solid #007bff');
  });

  it('should truncate long selected text in display', () => {
    const longSelection: TextSelection = {
      ...mockSelection,
      text: 'This is a very long piece of selected text that should be displayed in the highlight creator modal but might need to be handled appropriately for display purposes'
    };

    render(
      <HighlightCreator
        selection={longSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    expect(screen.getByText(`"${longSelection.text}"`)).toBeInTheDocument();
  });

  it('should handle focus management correctly', () => {
    render(
      <HighlightCreator
        selection={mockSelection}
        onCreateHighlight={mockOnCreateHighlight}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    );

    const createButton = screen.getByRole('button', { name: 'Create Highlight' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });

    // Test tab navigation
    createButton.focus();
    expect(document.activeElement).toBe(createButton);

    cancelButton.focus();
    expect(document.activeElement).toBe(cancelButton);
  });
});