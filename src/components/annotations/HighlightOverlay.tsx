import React, { useCallback, useState, Fragment, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { Highlight } from '../../types/annotation.types';
import { annotationRenderer, CoordinateTransform, RenderedAnnotation } from '../../utils/annotationRenderer';

interface HighlightOverlayProps {
  highlights: Highlight[];
  pageNumber: number;
  scale: number;
  pageWidth?: number;
  pageHeight?: number;
  offsetX?: number;
  offsetY?: number;
  onHighlightClick?: (highlight: Highlight) => void;
  onHighlightHover?: (highlight: Highlight | null) => void;
  onHighlightContextMenu?: (highlight: Highlight, position: { x: number; y: number }) => void;
}

const OverlayContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  overflow: visible;
`;

const HighlightElement = styled.div.withConfig({
  shouldForwardProp: (prop) => !['x', 'y', 'width', 'height', 'color', 'zIndex'].includes(prop)
})<{
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  zIndex: number;
}>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  width: ${props => Math.max(props.width, 1)}px;
  height: ${props => Math.max(props.height, 1)}px;
  background-color: ${props => props.color};
  opacity: 0.4;
  pointer-events: auto;
  cursor: pointer;
  transition: opacity 0.2s ease;
  border-radius: 2px;
  z-index: ${props => props.zIndex};
  will-change: transform, opacity;
  box-sizing: border-box;

  &:hover {
    opacity: 0.6;
  }

  &:focus {
    outline: 2px solid #007bff;
    outline-offset: 1px;
  }
`;

const HighlightTooltip = styled.div.withConfig({
  shouldForwardProp: (prop) => !['x', 'y', 'isVisible'].includes(prop)
})<{
  x: number;
  y: number;
  isVisible: boolean;
}>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y - 35}px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 20;
  opacity: ${props => props.isVisible ? 1 : 0};
  transition: opacity 0.2s ease;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 10px;
    border: 4px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.8);
  }
`;

export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  highlights,
  pageNumber,
  scale,
  pageWidth = 800,
  pageHeight = 1000,
  offsetX = 0,
  offsetY = 0,
  onHighlightClick,
  onHighlightHover,
  onHighlightContextMenu
}) => {
  const [hoveredHighlight, setHoveredHighlight] = useState<Highlight | null>(null);
  const [renderedHighlights, setRenderedHighlights] = useState<RenderedAnnotation[]>([]);

  // Create coordinate transform
  const transform = useMemo<CoordinateTransform>(() => ({
    scale,
    offsetX,
    offsetY,
    pageWidth,
    pageHeight,
  }), [scale, offsetX, offsetY, pageWidth, pageHeight]);

  // Filter highlights for current page
  const pageHighlights = useMemo(() => {
    return highlights.filter(highlight => highlight.pageNumber === pageNumber);
  }, [highlights, pageNumber]);

  // Render highlights with direct coordinate transformation
  useEffect(() => {
    if (pageHighlights.length === 0) {
      setRenderedHighlights([]);
      return;
    }

    // console.log('HighlightOverlay: Rendering highlights for page', pageNumber, pageHighlights);

    // Transform coordinates directly
    const rendered = pageHighlights.map((highlight, index) => {
      const transformedCoords = {
        x: Math.max(0, highlight.coordinates.x * scale + offsetX),
        y: Math.max(0, highlight.coordinates.y * scale + offsetY),
        width: Math.max(1, highlight.coordinates.width * scale),
        height: Math.max(1, highlight.coordinates.height * scale),
      };

      // console.log('HighlightOverlay: Transforming highlight', {
      //   id: highlight.id,
      //   originalCoords: highlight.coordinates,
      //   transformedCoords,
      //   scale,
      //   offsetX,
      //   offsetY
      // });

      return {
        id: highlight.id,
        type: 'highlight' as const,
        coordinates: transformedCoords,
        zIndex: 100 + index * 10, // Ensure significant z-index differences
        data: highlight,
      };
    });

    // console.log('HighlightOverlay: Setting rendered highlights', rendered.length, 'highlights');
    setRenderedHighlights(rendered);
  }, [pageHighlights, pageNumber, scale, offsetX, offsetY]);

  const handleHighlightClick = useCallback((renderedHighlight: RenderedAnnotation, event: React.MouseEvent) => {
    event.stopPropagation();
    const highlight = renderedHighlight.data as Highlight;
    onHighlightClick?.(highlight);
  }, [onHighlightClick]);

  const handleHighlightContextMenu = useCallback((renderedHighlight: RenderedAnnotation, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (onHighlightContextMenu) {
      const highlight = renderedHighlight.data as Highlight;
      const position = {
        x: event.clientX,
        y: event.clientY
      };
      onHighlightContextMenu(highlight, position);
    }
  }, [onHighlightContextMenu]);

  const handleHighlightMouseEnter = useCallback((renderedHighlight: RenderedAnnotation) => {
    const highlight = renderedHighlight.data as Highlight;
    setHoveredHighlight(highlight);
    onHighlightHover?.(highlight);
  }, [onHighlightHover]);

  const handleHighlightMouseLeave = useCallback(() => {
    setHoveredHighlight(null);
    onHighlightHover?.(null);
  }, [onHighlightHover]);

  const handleHighlightKeyDown = useCallback((renderedHighlight: RenderedAnnotation, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const highlight = renderedHighlight.data as Highlight;
      onHighlightClick?.(highlight);
    }
  }, [onHighlightClick]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      annotationRenderer.clearRenderCache(pageNumber);
    };
  }, [pageNumber]);

  if (renderedHighlights.length === 0) {
    return null;
  }

  // console.log('HighlightOverlay: Rendering', renderedHighlights.length, 'highlights');

  return (
    <OverlayContainer>
      {renderedHighlights.map((renderedHighlight, mapIndex) => {
        const highlight = renderedHighlight.data as Highlight;
        const { x, y, width = 0, height = 0 } = renderedHighlight.coordinates;
        
        // console.log(`HighlightOverlay: Rendering highlight element ${mapIndex + 1}/${renderedHighlights.length}`, {
        //   id: renderedHighlight.id,
        //   x, y, width, height,
        //   color: highlight.color,
        //   zIndex: renderedHighlight.zIndex,
        //   text: highlight.selectedText.substring(0, 20) + '...'
        // });
        
        return (
          <Fragment key={`highlight-${renderedHighlight.id}-${mapIndex}`}>
            <HighlightElement
              x={x}
              y={y}
              width={width}
              height={height}
              color={highlight.color}
              zIndex={renderedHighlight.zIndex}
              data-highlight-id={highlight.id}
              onClick={(e) => handleHighlightClick(renderedHighlight, e)}
              onContextMenu={(e) => handleHighlightContextMenu(renderedHighlight, e)}
              onMouseEnter={() => handleHighlightMouseEnter(renderedHighlight)}
              onMouseLeave={handleHighlightMouseLeave}
              onKeyDown={(e) => handleHighlightKeyDown(renderedHighlight, e)}
              tabIndex={0}
              role="button"
              aria-label={`Highlight: ${highlight.selectedText.substring(0, 50)}${highlight.selectedText.length > 50 ? '...' : ''}`}
              title={highlight.selectedText}
            />
            
            {hoveredHighlight?.id === highlight.id && (
              <HighlightTooltip
                x={x}
                y={y}
                isVisible={true}
              >
                {highlight.selectedText.length > 30 
                  ? `${highlight.selectedText.substring(0, 30)}...` 
                  : highlight.selectedText}
              </HighlightTooltip>
            )}
          </Fragment>
        );
      })}
    </OverlayContainer>
  );
};