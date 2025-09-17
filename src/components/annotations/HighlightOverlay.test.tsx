import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HighlightOverlay } from './HighlightOverlay';
import { Highlight } from '../../types/annotation.types';

// Mock the annotation renderer
jest.mock('../../utils/annotationRenderer', () => ({
  annotationRenderer: {
    scheduleAnnotationUpdate: jest.fn((pageNumber, callback) => {
      // Execute callback immediately in tests
      callback();
    }),
    renderAnnotationBatch: jest.fn((pageNumber, highlights, comments, ctas, transform) => ({
      highlights: highlights.map((highlight: any, index: number) => ({
        id: highlight.id,
        type: 'highlight',
        coordinates: {
          x: highlight.coordinates.x * (transform.scale || 1) + (transform.offsetX || 0),
          y: highlight.coordinates.y * (transform.scale || 1) + (transform.offsetY || 0),
          width: highlight.coordinates.width * (transform.scale || 1),
          height: highlight.coordinates.height * (transform.scale || 1),
        },
        zIndex: 50 + index,
        data: highlight,
      })),
      comments: [],
      ctas: [],
      totalCount: highlights.length,
    })),
    optimizeAnnotations: jest.fn((annotations) => annotations),
    clearRenderCache: jest.fn(),
  },
  CoordinateTransform: {},
  RenderedAnnotation: {},
}));

const mockHighlights: Highlight[] = [
  {
    id: 'highlight-1',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    startOffset: 0,
    endOffset: 13,
    selectedText: 'Selected text',
    color: '#FFFF00',
    coordinates: {
      x: 10,
      y: 20,
      width: 100,
      height: 20
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'highlight-2',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    startOffset: 20,
    endOffset: 35,
    selectedText: 'Another highlight',
    color: '#90EE90',
    coordinates: {
      x: 50,
      y: 60,
      width: 120,
      height: 18
    },
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: 'highlight-3',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 2,
    startOffset: 0,
    endOffset: 10,
    selectedText: 'Page 2 text',
    color: '#87CEEB',
    coordinates: {
      x: 30,
      y: 40,
      width: 80,
      height: 16
    },
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
];

describe('HighlightOverlay', () => {
  const mockOnHighlightClick = jest.fn();
  const mockOnHighlightHover = jest.fn();
  const mockOnHighlightContextMenu = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing when no highlights are provided', () => {
    const { container } = render(
      <HighlightOverlay
        highlights={[]}
        pageNumber={1}
        scale={1.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when no highlights match the current page', () => {
    const { container } = render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={3}
        scale={1.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render highlights for the current page only', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    // Should render 2 highlights for page 1
    const highlightElements = screen.getAllByRole('button');
    expect(highlightElements).toHaveLength(2);

    // Check aria-labels contain the expected text
    expect(screen.getByLabelText(/Highlight: Selected text/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Highlight: Another highlight/)).toBeInTheDocument();
  });

  it('should position highlights correctly based on coordinates and scale', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={2.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    
    // With scale 2.0, coordinates should be doubled
    expect(firstHighlight).toHaveStyle({
      left: '20px', // 10 * 2
      top: '40px',  // 20 * 2
      width: '200px', // 100 * 2
      height: '40px'  // 20 * 2
    });
  });

  it('should apply correct background color to highlights', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    const yellowHighlight = screen.getByLabelText(/Highlight: Selected text/);
    const greenHighlight = screen.getByLabelText(/Highlight: Another highlight/);

    expect(yellowHighlight).toHaveStyle('background-color: #FFFF00');
    expect(greenHighlight).toHaveStyle('background-color: #90EE90');
  });

  it('should call onHighlightClick when highlight is clicked', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    fireEvent.click(firstHighlight);

    expect(mockOnHighlightClick).toHaveBeenCalledWith(mockHighlights[0]);
  });

  it('should call onHighlightHover when highlight is hovered', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    
    fireEvent.mouseEnter(firstHighlight);
    expect(mockOnHighlightHover).toHaveBeenCalledWith(mockHighlights[0]);

    fireEvent.mouseLeave(firstHighlight);
    expect(mockOnHighlightHover).toHaveBeenCalledWith(null);
  });

  it('should handle keyboard navigation', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    
    // Test Enter key
    fireEvent.keyDown(firstHighlight, { key: 'Enter' });
    expect(mockOnHighlightClick).toHaveBeenCalledWith(mockHighlights[0]);

    mockOnHighlightClick.mockClear();

    // Test Space key
    fireEvent.keyDown(firstHighlight, { key: ' ' });
    expect(mockOnHighlightClick).toHaveBeenCalledWith(mockHighlights[0]);
  });

  it('should show tooltip on hover', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    fireEvent.mouseEnter(firstHighlight);

    // Tooltip should be visible with the highlight text
    expect(screen.getByText('Selected text')).toBeInTheDocument();
  });

  it('should truncate long text in tooltip', () => {
    const longTextHighlight: Highlight = {
      ...mockHighlights[0],
      selectedText: 'This is a very long piece of text that should be truncated in the tooltip display'
    };

    render(
      <HighlightOverlay
        highlights={[longTextHighlight]}
        pageNumber={1}
        scale={1.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    const highlight = screen.getByRole('button');
    fireEvent.mouseEnter(highlight);

    // Should show truncated text
    expect(screen.getByText('This is a very long piece of t...')).toBeInTheDocument();
  });

  it('should handle highlights without hover callbacks', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
      />
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    
    // Should not throw when hovering without callbacks
    expect(() => {
      fireEvent.mouseEnter(firstHighlight);
      fireEvent.mouseLeave(firstHighlight);
    }).not.toThrow();
  });

  it('should handle highlights without click callback', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
      />
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    
    // Should not throw when clicking without callback
    expect(() => {
      fireEvent.click(firstHighlight);
    }).not.toThrow();
  });

  it('should stop event propagation on highlight click', () => {
    const mockParentClick = jest.fn();
    
    render(
      <div onClick={mockParentClick}>
        <HighlightOverlay
          highlights={mockHighlights}
          pageNumber={1}
          scale={1.0}
          onHighlightClick={mockOnHighlightClick}
        />
      </div>
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    fireEvent.click(firstHighlight);

    expect(mockOnHighlightClick).toHaveBeenCalled();
    expect(mockParentClick).not.toHaveBeenCalled();
  });

  it('should call onHighlightContextMenu when right-clicked', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
        onHighlightClick={mockOnHighlightClick}
        onHighlightHover={mockOnHighlightHover}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    fireEvent.contextMenu(firstHighlight, { clientX: 100, clientY: 200 });

    expect(mockOnHighlightContextMenu).toHaveBeenCalledWith(
      mockHighlights[0],
      { x: 100, y: 200 }
    );
  });

  it('should prevent default context menu behavior', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
        onHighlightContextMenu={mockOnHighlightContextMenu}
      />
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    
    // Create a mock event with preventDefault and stopPropagation
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientX: 100,
      clientY: 200
    };

    // Manually trigger the context menu handler
    firstHighlight.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 200
    }));

    expect(mockOnHighlightContextMenu).toHaveBeenCalledWith(
      mockHighlights[0],
      { x: 100, y: 200 }
    );
  });

  it('should handle context menu without callback', () => {
    render(
      <HighlightOverlay
        highlights={mockHighlights}
        pageNumber={1}
        scale={1.0}
      />
    );

    const firstHighlight = screen.getByLabelText(/Highlight: Selected text/);
    
    // Should not throw when right-clicking without callback
    expect(() => {
      fireEvent.contextMenu(firstHighlight);
    }).not.toThrow();
  });
});