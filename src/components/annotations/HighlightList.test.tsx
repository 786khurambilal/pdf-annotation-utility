import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HighlightList } from './HighlightList';
import { Highlight } from '../../types/annotation.types';

const mockHighlights: Highlight[] = [
  {
    id: 'highlight-1',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    startOffset: 0,
    endOffset: 10,
    selectedText: 'First highlight text',
    color: '#FFFF00',
    coordinates: { x: 100, y: 200, width: 150, height: 20 },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: 'highlight-2',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 2,
    startOffset: 50,
    endOffset: 70,
    selectedText: 'Second highlight text',
    color: '#90EE90',
    coordinates: { x: 200, y: 300, width: 180, height: 25 },
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02')
  },
  {
    id: 'highlight-3',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    startOffset: 100,
    endOffset: 120,
    selectedText: 'Third highlight text',
    color: '#87CEEB',
    coordinates: { x: 150, y: 250, width: 160, height: 22 },
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03')
  }
];

describe('HighlightList', () => {
  const mockOnHighlightClick = jest.fn();
  const mockOnHighlightEdit = jest.fn();
  const mockOnHighlightDelete = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders highlight list when visible', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Highlights')).toBeInTheDocument();
    expect(screen.getByText('3 of 3 highlights')).toBeInTheDocument();
    expect(screen.getByText('"First highlight text"')).toBeInTheDocument();
    expect(screen.getByText('"Second highlight text"')).toBeInTheDocument();
    expect(screen.getByText('"Third highlight text"')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Highlights')).not.toBeInTheDocument();
  });

  it('shows empty state when no highlights', () => {
    render(
      <HighlightList
        highlights={[]}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('No highlights found. Start highlighting text to see them here.')).toBeInTheDocument();
  });

  it('sorts highlights by page number by default', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    const highlightItems = screen.getAllByText(/Page \d+/);
    expect(highlightItems[0]).toHaveTextContent('Page 1');
    expect(highlightItems[1]).toHaveTextContent('Page 1');
    expect(highlightItems[2]).toHaveTextContent('Page 2');
  });

  it('sorts highlights by date when selected', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    const sortSelect = screen.getByDisplayValue('Page');
    fireEvent.change(sortSelect, { target: { value: 'date' } });

    // Should be sorted by date (newest first)
    const dateElements = screen.getAllByText(/1\/\d+\/2023/);
    expect(dateElements[0]).toHaveTextContent('1/3/2023');
    expect(dateElements[1]).toHaveTextContent('1/2/2023');
    expect(dateElements[2]).toHaveTextContent('1/1/2023');
  });

  it('filters highlights by color', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    const filterSelect = screen.getByDisplayValue('All colors');
    fireEvent.change(filterSelect, { target: { value: '#FFFF00' } });

    expect(screen.getByText('1 of 3 highlights')).toBeInTheDocument();
    expect(screen.getByText('"First highlight text"')).toBeInTheDocument();
    expect(screen.queryByText('"Second highlight text"')).not.toBeInTheDocument();
  });

  it('searches highlights by text content', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search highlight text...');
    fireEvent.change(searchInput, { target: { value: 'Second' } });

    expect(screen.getByText('1 of 3 highlights')).toBeInTheDocument();
    expect(screen.getByText('"Second highlight text"')).toBeInTheDocument();
    expect(screen.queryByText('"First highlight text"')).not.toBeInTheDocument();
  });

  it('shows filtered empty state when no matches', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search highlight text...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No highlights match your current filters.')).toBeInTheDocument();
  });

  it('calls onHighlightClick when highlight text is clicked', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('"First highlight text"'));

    expect(mockOnHighlightClick).toHaveBeenCalledWith(mockHighlights[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onHighlightEdit when edit button is clicked', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(mockOnHighlightEdit).toHaveBeenCalledWith(mockHighlights[0]);
  });

  it('calls onHighlightDelete when delete button is clicked', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(mockOnHighlightDelete).toHaveBeenCalledWith(mockHighlights[0]);
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByLabelText('Close'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking outside panel', () => {
    const { container } = render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    // Click on the overlay (outside the panel)
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays correct page and date information', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getAllByText('Page 1')).toHaveLength(2); // Two highlights on page 1
    expect(screen.getByText('Page 2')).toBeInTheDocument();
    expect(screen.getByText('1/1/2023')).toBeInTheDocument();
    expect(screen.getByText('1/2/2023')).toBeInTheDocument();
    expect(screen.getByText('1/3/2023')).toBeInTheDocument();
  });

  it('shows color filter options based on available colors', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    const filterSelect = screen.getByDisplayValue('All colors');
    fireEvent.click(filterSelect);

    expect(screen.getByText('Yellow')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
  });

  it('combines search and filter correctly', () => {
    render(
      <HighlightList
        highlights={mockHighlights}
        onHighlightClick={mockOnHighlightClick}
        onHighlightEdit={mockOnHighlightEdit}
        onHighlightDelete={mockOnHighlightDelete}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    // Filter by yellow color
    const filterSelect = screen.getByDisplayValue('All colors');
    fireEvent.change(filterSelect, { target: { value: '#FFFF00' } });

    // Search for "First"
    const searchInput = screen.getByPlaceholderText('Search highlight text...');
    fireEvent.change(searchInput, { target: { value: 'First' } });

    expect(screen.getByText('1 of 3 highlights')).toBeInTheDocument();
    expect(screen.getByText('"First highlight text"')).toBeInTheDocument();
  });
});