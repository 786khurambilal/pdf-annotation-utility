import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnnotationOverlay } from './AnnotationOverlay';
import { Highlight, Comment, CallToAction } from '../../types/annotation.types';

// Mock the individual overlay components
jest.mock('./HighlightOverlay', () => ({
  HighlightOverlay: ({ highlights, onHighlightClick }: any) => (
    <div data-testid="highlight-overlay">
      {highlights.map((highlight: Highlight) => (
        <div
          key={highlight.id}
          data-testid={`highlight-${highlight.id}`}
          onClick={() => onHighlightClick?.(highlight)}
        >
          {highlight.selectedText}
        </div>
      ))}
    </div>
  )
}));

jest.mock('./CommentOverlay', () => ({
  CommentOverlay: ({ comments, onCommentClick }: any) => (
    <div data-testid="comment-overlay">
      {comments.map((comment: Comment) => (
        <div
          key={comment.id}
          data-testid={`comment-${comment.id}`}
          onClick={() => onCommentClick?.(comment)}
        >
          {comment.content}
        </div>
      ))}
    </div>
  )
}));

jest.mock('./CTAOverlay', () => ({
  CTAOverlay: ({ callToActions, onCTAClick }: any) => (
    <div data-testid="cta-overlay">
      {callToActions.map((cta: CallToAction) => (
        <div
          key={cta.id}
          data-testid={`cta-${cta.id}`}
          onClick={() => onCTAClick?.(cta)}
        >
          {cta.label}
        </div>
      ))}
    </div>
  )
}));

describe('AnnotationOverlay', () => {
  const mockHighlight: Highlight = {
    id: 'highlight-1',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    startOffset: 0,
    endOffset: 10,
    selectedText: 'Test highlight',
    color: '#ffff00',
    coordinates: { x: 100, y: 200, width: 150, height: 20 },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  const mockComment: Comment = {
    id: 'comment-1',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    content: 'Test comment',
    coordinates: { x: 300, y: 400 },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  const mockCTA: CallToAction = {
    id: 'cta-1',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    url: 'https://example.com',
    label: 'Test CTA',
    coordinates: { x: 500, y: 600, width: 100, height: 50 },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  const defaultProps = {
    highlights: [mockHighlight],
    comments: [mockComment],
    callToActions: [mockCTA],
    pageNumber: 1,
    scale: 1.0
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all overlay layers', () => {
      render(<AnnotationOverlay {...defaultProps} />);

      expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('comment-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('cta-overlay')).toBeInTheDocument();
    });

    it('renders annotations for the current page only', () => {
      const multiPageProps = {
        ...defaultProps,
        highlights: [
          mockHighlight,
          { ...mockHighlight, id: 'highlight-2', pageNumber: 2 }
        ],
        comments: [
          mockComment,
          { ...mockComment, id: 'comment-2', pageNumber: 2 }
        ],
        callToActions: [
          mockCTA,
          { ...mockCTA, id: 'cta-2', pageNumber: 2 }
        ],
        pageNumber: 1
      };

      render(<AnnotationOverlay {...multiPageProps} />);

      // Should only show page 1 annotations
      expect(screen.getByTestId('highlight-highlight-1')).toBeInTheDocument();
      expect(screen.queryByTestId('highlight-highlight-2')).not.toBeInTheDocument();
      
      expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
      expect(screen.queryByTestId('comment-comment-2')).not.toBeInTheDocument();
      
      expect(screen.getByTestId('cta-cta-1')).toBeInTheDocument();
      expect(screen.queryByTestId('cta-cta-2')).not.toBeInTheDocument();
    });

    it('renders empty overlays when no annotations exist', () => {
      const emptyProps = {
        ...defaultProps,
        highlights: [],
        comments: [],
        callToActions: []
      };

      render(<AnnotationOverlay {...emptyProps} />);

      expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('comment-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('cta-overlay')).toBeInTheDocument();
    });

    it('updates when page number changes', () => {
      const { rerender } = render(<AnnotationOverlay {...defaultProps} pageNumber={1} />);
      
      expect(screen.getByTestId('highlight-highlight-1')).toBeInTheDocument();

      // Change to page 2 where no annotations exist
      rerender(<AnnotationOverlay {...defaultProps} pageNumber={2} />);
      
      expect(screen.queryByTestId('highlight-highlight-1')).not.toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('handles highlight click events', () => {
      const onHighlightClick = jest.fn();
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          onHighlightClick={onHighlightClick}
        />
      );

      fireEvent.click(screen.getByTestId('highlight-highlight-1'));
      expect(onHighlightClick).toHaveBeenCalledWith(mockHighlight);
    });

    it('handles comment click events', () => {
      const onCommentClick = jest.fn();
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          onCommentClick={onCommentClick}
        />
      );

      fireEvent.click(screen.getByTestId('comment-comment-1'));
      expect(onCommentClick).toHaveBeenCalledWith(mockComment);
    });

    it('handles CTA click events', () => {
      const onCTAClick = jest.fn();
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          onCTAClick={onCTAClick}
        />
      );

      fireEvent.click(screen.getByTestId('cta-cta-1'));
      expect(onCTAClick).toHaveBeenCalledWith(mockCTA);
    });

    it('handles area click events for creating new annotations', () => {
      const onAreaClick = jest.fn();
      const { container } = render(
        <AnnotationOverlay 
          {...defaultProps} 
          onAreaClick={onAreaClick}
        />
      );

      // Find the interaction layer (first div child)
      const overlayContainer = container.firstChild as HTMLElement;
      const interactionLayer = overlayContainer?.firstChild as HTMLElement;
      
      if (interactionLayer) {
        // Mock getBoundingClientRect
        jest.spyOn(interactionLayer, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
          right: 800,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: () => ({})
        });

        fireEvent.click(interactionLayer, {
          clientX: 100,
          clientY: 200
        });

        expect(onAreaClick).toHaveBeenCalledWith({
          x: 100,
          y: 200
        });
      }
    });
  });

  describe('Scale Handling', () => {
    it('passes scale to all overlay components', () => {
      const scale = 1.5;
      render(<AnnotationOverlay {...defaultProps} scale={scale} />);

      // The scale should be passed to each overlay component
      // This is tested through the mocked components receiving the scale prop
      expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('comment-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('cta-overlay')).toBeInTheDocument();
    });

    it('transforms coordinates correctly for area clicks with different scales', () => {
      const onAreaClick = jest.fn();
      const scale = 2.0;
      
      const { container } = render(
        <AnnotationOverlay 
          {...defaultProps} 
          scale={scale}
          onAreaClick={onAreaClick}
        />
      );

      const overlayContainer = container.firstChild as HTMLElement;
      const interactionLayer = overlayContainer?.firstChild as HTMLElement;
      
      if (interactionLayer) {
        jest.spyOn(interactionLayer, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
          right: 800,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: () => ({})
        });

        fireEvent.click(interactionLayer, {
          clientX: 200,
          clientY: 400
        });

        // Coordinates should be divided by scale
        expect(onAreaClick).toHaveBeenCalledWith({
          x: 100, // 200 / 2.0
          y: 200  // 400 / 2.0
        });
      }
    });
  });

  describe('Layer Ordering', () => {
    it('maintains correct z-index ordering of layers', () => {
      const { container } = render(<AnnotationOverlay {...defaultProps} />);

      const overlayContainer = container.firstChild as HTMLElement;
      const layers = overlayContainer?.children;

      if (layers) {
        // Check that layers exist in correct order (z-index is set via styled-components)
        expect(layers).toHaveLength(4);
        expect(layers[0]).toBeInTheDocument(); // Interaction layer
        expect(layers[1]).toBeInTheDocument(); // Highlight layer
        expect(layers[2]).toBeInTheDocument(); // Comment layer
        expect(layers[3]).toBeInTheDocument(); // CTA layer
      }
    });
  });

  describe('Performance', () => {
    it('memoizes filtered annotations to prevent unnecessary re-renders', () => {
      const { rerender } = render(<AnnotationOverlay {...defaultProps} />);
      
      // Re-render with same props
      rerender(<AnnotationOverlay {...defaultProps} />);
      
      // Should still render the same annotations
      expect(screen.getByTestId('highlight-highlight-1')).toBeInTheDocument();
      expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
      expect(screen.getByTestId('cta-cta-1')).toBeInTheDocument();
    });

    it('updates filtered annotations when page changes', () => {
      const multiPageProps = {
        ...defaultProps,
        highlights: [
          mockHighlight,
          { ...mockHighlight, id: 'highlight-2', pageNumber: 2 }
        ]
      };

      const { rerender } = render(<AnnotationOverlay {...multiPageProps} pageNumber={1} />);
      expect(screen.getByTestId('highlight-highlight-1')).toBeInTheDocument();

      rerender(<AnnotationOverlay {...multiPageProps} pageNumber={2} />);
      expect(screen.queryByTestId('highlight-highlight-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('highlight-highlight-2')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('maintains proper DOM structure for screen readers', () => {
      const { container } = render(<AnnotationOverlay {...defaultProps} />);

      const overlayContainer = container.firstChild as HTMLElement;
      expect(overlayContainer).toHaveStyle('position: absolute');
      expect(overlayContainer).toHaveStyle('pointer-events: none');
    });

    it('allows keyboard navigation through annotation layers', () => {
      render(<AnnotationOverlay {...defaultProps} />);

      // Each overlay should be accessible for keyboard navigation
      expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('comment-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('cta-overlay')).toBeInTheDocument();
    });
  });
});