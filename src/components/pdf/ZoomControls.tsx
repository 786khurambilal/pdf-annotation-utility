import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useResponsive } from '../../hooks/useResponsive';
import { theme } from '../../styles/theme';

export type ZoomMode = 'custom' | 'fit-width' | 'fit-page';

interface ZoomControlsProps {
  scale: number;
  zoomMode: ZoomMode;
  onScaleChange: (scale: number) => void;
  onZoomModeChange: (mode: ZoomMode) => void;
  disabled?: boolean;
  minScale?: number;
  maxScale?: number;
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${theme.colors.light};
  border: 1px solid ${theme.colors.gray300};
  border-radius: ${theme.borderRadius.sm};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  @media (max-width: ${theme.breakpoints.tablet}) {
    gap: ${theme.spacing.xs};
    padding: ${theme.spacing.sm};
    flex-wrap: wrap;
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    justify-content: center;
  }
`;

const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => !['active'].includes(prop),
})<{ disabled?: boolean; active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.sm};
  background-color: ${props => {
    if (props.disabled) return theme.colors.gray200;
    if (props.active) return theme.colors.primaryHover;
    return theme.colors.primary;
  }};
  color: ${props => props.disabled ? theme.colors.gray600 : theme.colors.white};
  border: none;
  border-radius: ${theme.borderRadius.sm};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: ${theme.fontSizes.sm};
  font-weight: 500;
  transition: background-color ${theme.transitions.normal};
  min-width: ${theme.touch.minSize};
  min-height: ${theme.touch.minSize};
  white-space: nowrap;
  touch-action: manipulation;

  &:hover:not(:disabled) {
    background-color: ${props => props.active ? '#004085' : theme.colors.primaryHover};
  }

  &:focus {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    background-color: ${theme.colors.gray200};
    color: ${theme.colors.gray600};
    cursor: not-allowed;
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    font-size: ${theme.fontSizes.xs};
    padding: ${theme.spacing.sm};
    min-width: 40px;
    min-height: 40px;
  }
`;

const ZoomDisplay = styled.div`
  display: flex;
  align-items: center;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.gray700};
  font-weight: 500;
  min-width: 4rem;
  text-align: center;

  @media (max-width: ${theme.breakpoints.mobile}) {
    font-size: ${theme.fontSizes.xs};
    min-width: 3rem;
  }
`;

const Separator = styled.div`
  width: 1px;
  height: 1.5rem;
  background-color: ${theme.colors.gray300};
  margin: 0 ${theme.spacing.xs};

  @media (max-width: ${theme.breakpoints.mobile}) {
    display: none;
  }
`;

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  zoomMode,
  onScaleChange,
  onZoomModeChange,
  disabled = false,
  minScale = 0.25,
  maxScale = 3.0
}) => {
  const responsive = useResponsive();
  const handleZoomIn = useCallback(() => {
    if (disabled) return;
    
    const newScale = Math.min(scale * 1.25, maxScale);
    onScaleChange(newScale);
    onZoomModeChange('custom');
  }, [scale, maxScale, onScaleChange, onZoomModeChange, disabled]);

  const handleZoomOut = useCallback(() => {
    if (disabled) return;
    
    const newScale = Math.max(scale / 1.25, minScale);
    onScaleChange(newScale);
    onZoomModeChange('custom');
  }, [scale, minScale, onScaleChange, onZoomModeChange, disabled]);

  const handleFitWidth = useCallback(() => {
    if (disabled) return;
    onZoomModeChange('fit-width');
  }, [onZoomModeChange, disabled]);

  const handleFitPage = useCallback(() => {
    if (disabled) return;
    onZoomModeChange('fit-page');
  }, [onZoomModeChange, disabled]);

  const handleReset = useCallback(() => {
    if (disabled) return;
    onScaleChange(1.0);
    onZoomModeChange('custom');
  }, [onScaleChange, onZoomModeChange, disabled]);

  const isZoomInDisabled = disabled || scale >= maxScale;
  const isZoomOutDisabled = disabled || scale <= minScale;
  const displayPercentage = Math.round(scale * 100);

  return (
    <Container>
      <Button
        onClick={handleZoomOut}
        disabled={isZoomOutDisabled}
        aria-label="Zoom out"
        title="Zoom out"
      >
        −
      </Button>
      
      <ZoomDisplay
        aria-label={`Current zoom level: ${displayPercentage}%`}
        title="Current zoom level"
      >
        {displayPercentage}%
      </ZoomDisplay>
      
      <Button
        onClick={handleZoomIn}
        disabled={isZoomInDisabled}
        aria-label="Zoom in"
        title="Zoom in"
      >
        +
      </Button>

      <Separator />

      <Button
        onClick={handleReset}
        disabled={disabled}
        active={zoomMode === 'custom' && scale === 1.0}
        aria-label="Reset zoom to 100%"
        title="Reset zoom to 100%"
      >
        {responsive.isMobile ? '100' : '100%'}
      </Button>

      <Button
        onClick={handleFitWidth}
        disabled={disabled}
        active={zoomMode === 'fit-width'}
        aria-label="Fit to width"
        title="Fit to width"
      >
        {responsive.isMobile ? 'Width' : 'Fit Width'}
      </Button>

      <Button
        onClick={handleFitPage}
        disabled={disabled}
        active={zoomMode === 'fit-page'}
        aria-label="Fit to page"
        title="Fit to page"
      >
        {responsive.isMobile ? 'Page' : 'Fit Page'}
      </Button>
    </Container>
  );
};