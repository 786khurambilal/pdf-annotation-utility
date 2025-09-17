import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Highlight, Comment, CallToAction } from '../../types/annotation.types';
import { HighlightOverlay } from './HighlightOverlay';
import { CommentOverlay } from './CommentOverlay';
import { CTAOverlay } from './CTAOverlay';

interface AnnotationOverlayProps {
  highlights: Highlight[];
  comments: Comment[];
  callToActions: CallToAction[];
  pageNumber: number;
  scale: number;
  onHighlightClick?: (highlight: Highlight) => void;
  onHighlightHover?: (highlight: Highlight | null) => void;
  onHighlightContextMenu?: (highlight: Highlight, position: { x: number; y: number }) => void;
  onCommentClick?: (comment: Comment) => void;
  onCommentHover?: (comment: Comment | null) => void;
  onCommentEdit?: (commentId: string, newContent: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCTAClick?: (cta: CallToAction) => void;
  onCTAEdit?: (cta: CallToAction) => void;
  onCTADelete?: (ctaId: string) => void;
  onAreaClick?: (coordinates: { x: number; y: number }) => void;
}

const OverlayContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
`;

const InteractionLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  z-index: 1;
`;

const HighlightLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
`;

const CommentLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 15;
`;

const CTALayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
`;

export const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  highlights,
  comments,
  callToActions,
  pageNumber,
  scale,
  onHighlightClick,
  onHighlightHover,
  onHighlightContextMenu,
  onCommentClick,
  onCommentHover,
  onCommentEdit,
  onCommentDelete,
  onCTAClick,
  onCTAEdit,
  onCTADelete,
  onAreaClick
}) => {
  // Filter annotations for current page
  const pageHighlights = useMemo(
    () => highlights.filter(highlight => highlight.pageNumber === pageNumber),
    [highlights, pageNumber]
  );

  const pageComments = useMemo(
    () => comments.filter(comment => comment.pageNumber === pageNumber),
    [comments, pageNumber]
  );

  const pageCTAs = useMemo(
    () => callToActions.filter(cta => cta.pageNumber === pageNumber),
    [callToActions, pageNumber]
  );

  // Handle area clicks for creating new annotations
  const handleAreaClick = useCallback((event: React.MouseEvent) => {
    // Only handle clicks that don't hit any annotation
    if (event.target === event.currentTarget && onAreaClick) {
      const rect = event.currentTarget.getBoundingClientRect();
      const coordinates = {
        x: (event.clientX - rect.left) / scale,
        y: (event.clientY - rect.top) / scale
      };
      onAreaClick(coordinates);
    }
  }, [onAreaClick, scale]);

  // Transform coordinates for current scale
  const transformCoordinates = useCallback((coords: { x: number; y: number; width?: number; height?: number }) => {
    return {
      x: coords.x * scale,
      y: coords.y * scale,
      width: coords.width ? coords.width * scale : undefined,
      height: coords.height ? coords.height * scale : undefined
    };
  }, [scale]);

  return (
    <OverlayContainer>
      {/* Interaction layer for area clicks */}
      <InteractionLayer onClick={handleAreaClick} />
      
      {/* Highlight layer - lowest z-index for annotations */}
      <HighlightLayer>
        <HighlightOverlay
          highlights={pageHighlights}
          pageNumber={pageNumber}
          scale={scale}
          onHighlightClick={onHighlightClick}
          onHighlightHover={onHighlightHover}
          onHighlightContextMenu={onHighlightContextMenu}
        />
      </HighlightLayer>

      {/* Comment layer - middle z-index */}
      <CommentLayer>
        <CommentOverlay
          comments={pageComments}
          pageNumber={pageNumber}
          scale={scale}
          onCommentClick={onCommentClick}
          onCommentHover={onCommentHover}
          onCommentEdit={onCommentEdit}
          onCommentDelete={onCommentDelete}
        />
      </CommentLayer>

      {/* CTA layer - highest z-index for annotations */}
      <CTALayer>
        <CTAOverlay
          callToActions={pageCTAs}
          pageNumber={pageNumber}
          onCTAClick={onCTAClick}
          onCTAEdit={onCTAEdit}
          onCTADelete={onCTADelete}
        />
      </CTALayer>
    </OverlayContainer>
  );
};