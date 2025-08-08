import React, { useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import { CallToAction } from '../../types/annotation.types';

interface CTAOverlayProps {
  callToActions: CallToAction[];
  pageNumber: number;
  scale: number;
  onCTAClick?: (cta: CallToAction) => void;
  onCTAEdit?: (cta: CallToAction) => void;
  onCTADelete?: (ctaId: string) => void;
}

const OverlayContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'hasContextMenu'
})<{ hasContextMenu: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: ${props => props.hasContextMenu ? 'auto' : 'none'};
  z-index: 10;
`;

const CTAArea = styled.div.withConfig({
  shouldForwardProp: (prop) => !['x', 'y', 'width', 'height'].includes(prop)
})<{
  x: number;
  y: number;
  width: number;
  height: number;
}>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  width: ${props => props.width}px;
  height: ${props => props.height}px;
  pointer-events: auto;
  cursor: pointer;
  border: 2px solid #007bff;
  background-color: rgba(0, 123, 255, 0.1);
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: rgba(0, 123, 255, 0.2);
    border-color: #0056b3;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
  }

  &:active {
    background-color: rgba(0, 123, 255, 0.3);
    transform: scale(0.98);
  }
`;

const CTAIcon = styled.div`
  background-color: #007bff;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;

  ${CTAArea}:hover & {
    background-color: #0056b3;
    transform: scale(1.1);
  }
`;

const Tooltip = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isVisible', 'x', 'y'].includes(prop)
})<{
  isVisible: boolean;
  x: number;
  y: number;
}>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y - 40}px;
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 1000;
  pointer-events: none;
  opacity: ${props => props.isVisible ? 1 : 0};
  transform: translateY(${props => props.isVisible ? 0 : 10}px);
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #333;
  }
`;

const ContextMenu = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isVisible', 'x', 'y'].includes(prop)
})<{
  isVisible: boolean;
  x: number;
  y: number;
}>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  min-width: 120px;
  opacity: ${props => props.isVisible ? 1 : 0};
  transform: scale(${props => props.isVisible ? 1 : 0.95});
  transition: all 0.2s ease;
  pointer-events: ${props => props.isVisible ? 'auto' : 'none'};
`;

const ContextMenuItem = styled.button`
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f8f9fa;
  }

  &:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  &:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #eee;
  }
`;

export const CTAOverlay: React.FC<CTAOverlayProps> = ({
  callToActions,
  pageNumber,
  scale,
  onCTAClick,
  onCTAEdit,
  onCTADelete
}) => {
  const [hoveredCTA, setHoveredCTA] = useState<CallToAction | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    cta: CallToAction;
    x: number;
    y: number;
  } | null>(null);

  // Filter CTAs for the current page
  const pageCTAs = callToActions.filter(cta => cta.pageNumber === pageNumber);

  const handleCTAClick = useCallback((event: React.MouseEvent, cta: CallToAction) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Close context menu if open
    setContextMenu(null);
    
    // Open the URL in a new tab
    window.open(cta.url, '_blank', 'noopener,noreferrer');
    
    // Call the optional click handler
    onCTAClick?.(cta);
  }, [onCTAClick]);

  const handleCTAContextMenu = useCallback((event: React.MouseEvent, cta: CallToAction) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      cta,
      x: event.clientX,
      y: event.clientY
    });
  }, []);

  const handleCTAMouseEnter = useCallback((cta: CallToAction) => {
    setHoveredCTA(cta);
  }, []);

  const handleCTAMouseLeave = useCallback(() => {
    setHoveredCTA(null);
  }, []);

  const handleEditCTA = useCallback(() => {
    if (contextMenu) {
      onCTAEdit?.(contextMenu.cta);
      setContextMenu(null);
    }
  }, [contextMenu, onCTAEdit]);

  const handleDeleteCTA = useCallback(() => {
    if (contextMenu) {
      onCTADelete?.(contextMenu.cta.id);
      setContextMenu(null);
    }
  }, [contextMenu, onCTADelete]);

  const handleOverlayClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Close context menu on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  if (pageCTAs.length === 0) {
    return null;
  }

  return (
    <>
      <OverlayContainer hasContextMenu={!!contextMenu} onClick={handleOverlayClick}>
        {pageCTAs.map((cta) => (
          <CTAArea
            key={cta.id}
            x={cta.coordinates.x * scale}
            y={cta.coordinates.y * scale}
            width={cta.coordinates.width * scale}
            height={cta.coordinates.height * scale}
            onClick={(e) => handleCTAClick(e, cta)}
            onContextMenu={(e) => handleCTAContextMenu(e, cta)}
            onMouseEnter={() => handleCTAMouseEnter(cta)}
            onMouseLeave={handleCTAMouseLeave}
            title={`${cta.label} - ${cta.url}`}
            role="button"
            tabIndex={0}
            aria-label={`Call to action: ${cta.label}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCTAClick(e as any, cta);
              }
            }}
          >
            <CTAIcon>🔗</CTAIcon>
          </CTAArea>
        ))}

        {/* Tooltip */}
        {hoveredCTA && (
          <Tooltip
            isVisible={true}
            x={(hoveredCTA.coordinates.x + hoveredCTA.coordinates.width / 2) * scale}
            y={hoveredCTA.coordinates.y * scale}
          >
            {hoveredCTA.label}
          </Tooltip>
        )}
      </OverlayContainer>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          isVisible={true}
          x={contextMenu.x}
          y={contextMenu.y}
        >
          <ContextMenuItem onClick={handleEditCTA}>
            Edit CTA
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDeleteCTA}>
            Delete CTA
          </ContextMenuItem>
        </ContextMenu>
      )}
    </>
  );
};