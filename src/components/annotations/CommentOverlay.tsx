import React, { useCallback, useState, Fragment, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { Comment } from '../../types/annotation.types';
import { CommentPopup } from './CommentPopup';
import { annotationRenderer, CoordinateTransform, RenderedAnnotation } from '../../utils/annotationRenderer';

interface CommentOverlayProps {
  comments: Comment[];
  pageNumber: number;
  scale: number;
  pageWidth?: number;
  pageHeight?: number;
  offsetX?: number;
  offsetY?: number;
  onCommentEdit?: (commentId: string, newContent: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentClick?: (comment: Comment) => void;
  onCommentHover?: (comment: Comment | null) => void;
}

const OverlayContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 15;
`;

const CommentMarker = styled.div.withConfig({
  shouldForwardProp: (prop) => !['x', 'y', 'isActive', 'zIndex'].includes(prop)
})<{
  x: number;
  y: number;
  isActive: boolean;
  zIndex: number;
}>`
  position: absolute;
  left: ${props => props.x - 12}px;
  top: ${props => props.y - 12}px;
  width: 24px;
  height: 24px;
  background-color: ${props => props.isActive ? '#007bff' : '#ffc107'};
  border: 2px solid ${props => props.isActive ? '#0056b3' : '#e0a800'};
  border-radius: 50%;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: ${props => props.isActive ? 'white' : '#856404'};
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: ${props => props.zIndex};
  will-change: transform, opacity;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
    background-color: ${props => props.isActive ? '#0056b3' : '#e0a800'};
  }

  &:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  &::before {
    content: '💬';
    font-size: 10px;
  }
`;

const CommentTooltip = styled.div.withConfig({
  shouldForwardProp: (prop) => !['x', 'y', 'isVisible'].includes(prop)
})<{
  x: number;
  y: number;
  isVisible: boolean;
}>`
  position: absolute;
  left: ${props => props.x + 15}px;
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

export const CommentOverlay: React.FC<CommentOverlayProps> = ({
  comments,
  pageNumber,
  scale,
  pageWidth = 800,
  pageHeight = 1000,
  offsetX = 0,
  offsetY = 0,
  onCommentEdit,
  onCommentDelete,
  onCommentClick,
  onCommentHover
}) => {
  const [hoveredComment, setHoveredComment] = useState<Comment | null>(null);
  const [activeComment, setActiveComment] = useState<Comment | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [renderedComments, setRenderedComments] = useState<RenderedAnnotation[]>([]);

  // Create coordinate transform
  const transform = useMemo<CoordinateTransform>(() => ({
    scale,
    offsetX,
    offsetY,
    pageWidth,
    pageHeight,
  }), [scale, offsetX, offsetY, pageWidth, pageHeight]);

  // Filter comments for current page
  const pageComments = useMemo(() => {
    return comments.filter(comment => comment.pageNumber === pageNumber);
  }, [comments, pageNumber]);

  // Render comments with optimized coordinate transformation
  useEffect(() => {
    if (pageComments.length === 0) {
      setRenderedComments([]);
      return;
    }

    // Use debounced rendering for better performance
    annotationRenderer.scheduleAnnotationUpdate(
      pageNumber,
      () => {
        const batch = annotationRenderer.renderAnnotationBatch(
          pageNumber,
          [], // No highlights in comment overlay
          pageComments,
          [], // No CTAs in comment overlay
          transform
        );

        // Optimize and filter visible comments
        const optimizedComments = annotationRenderer.optimizeAnnotations(batch.comments);
        setRenderedComments(optimizedComments);
      },
      50 // 50ms debounce for smooth interaction
    );
  }, [pageComments, pageNumber, transform]);

  const handleCommentClick = useCallback((renderedComment: RenderedAnnotation, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const comment = renderedComment.data as Comment;
    
    // Calculate popup position relative to viewport
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.right + 10, // Position to the right of the marker
      y: rect.top
    };

    // Adjust position if popup would go off-screen
    const popupWidth = 350;
    const popupHeight = 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (position.x + popupWidth > viewportWidth) {
      position.x = rect.left - popupWidth - 10; // Position to the left instead
    }

    if (position.y + popupHeight > viewportHeight) {
      position.y = viewportHeight - popupHeight - 10;
    }

    if (position.y < 10) {
      position.y = 10;
    }

    setPopupPosition(position);
    setActiveComment(comment);
    onCommentClick?.(comment);
  }, [onCommentClick]);

  const handleCommentMouseEnter = useCallback((renderedComment: RenderedAnnotation) => {
    const comment = renderedComment.data as Comment;
    setHoveredComment(comment);
    onCommentHover?.(comment);
  }, [onCommentHover]);

  const handleCommentMouseLeave = useCallback(() => {
    setHoveredComment(null);
    onCommentHover?.(null);
  }, [onCommentHover]);

  const handleCommentKeyDown = useCallback((renderedComment: RenderedAnnotation, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const comment = renderedComment.data as Comment;
      const { x, y } = renderedComment.coordinates;
      
      // Simulate click event for keyboard interaction
      const syntheticEvent = {
        stopPropagation: () => {},
        currentTarget: {
          getBoundingClientRect: () => ({
            left: x,
            top: y,
            right: x + 24,
            bottom: y + 24
          })
        }
      } as any;
      handleCommentClick(renderedComment, syntheticEvent);
    }
  }, [handleCommentClick]);

  const handlePopupClose = useCallback(() => {
    setActiveComment(null);
  }, []);

  const handleCommentEdit = useCallback((commentId: string, newContent: string) => {
    onCommentEdit?.(commentId, newContent);
    setActiveComment(null);
  }, [onCommentEdit]);

  const handleCommentDelete = useCallback((commentId: string) => {
    onCommentDelete?.(commentId);
    setActiveComment(null);
  }, [onCommentDelete]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      annotationRenderer.clearRenderCache(pageNumber);
    };
  }, [pageNumber]);

  if (renderedComments.length === 0) {
    return null;
  }

  return (
    <>
      <OverlayContainer>
        {renderedComments.map((renderedComment) => {
          const comment = renderedComment.data as Comment;
          const { x, y } = renderedComment.coordinates;
          
          return (
            <Fragment key={renderedComment.id}>
              <CommentMarker
                x={x}
                y={y}
                zIndex={renderedComment.zIndex}
                isActive={activeComment?.id === comment.id}
                onClick={(e) => handleCommentClick(renderedComment, e)}
                onMouseEnter={() => handleCommentMouseEnter(renderedComment)}
                onMouseLeave={handleCommentMouseLeave}
                onKeyDown={(e) => handleCommentKeyDown(renderedComment, e)}
                tabIndex={0}
                role="button"
                aria-label={`Comment: ${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}`}
                title={comment.content}
              />
              
              {hoveredComment?.id === comment.id && !activeComment && (
                <CommentTooltip
                  x={x}
                  y={y}
                  isVisible={true}
                >
                  {comment.content.length > 30 
                    ? `${comment.content.substring(0, 30)}...` 
                    : comment.content}
                </CommentTooltip>
              )}
            </Fragment>
          );
        })}
      </OverlayContainer>

      {/* Comment popup */}
      {activeComment && (
        <CommentPopup
          comment={activeComment}
          isVisible={true}
          position={popupPosition}
          onEdit={handleCommentEdit}
          onDelete={handleCommentDelete}
          onClose={handlePopupClose}
        />
      )}
    </>
  );
};