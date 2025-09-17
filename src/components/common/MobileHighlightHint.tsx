import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useResponsive } from '../../hooks/useResponsive';
import { theme } from '../../styles/theme';

const HintContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isVisible'].includes(prop)
})<{ isVisible: boolean }>`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.sm};
  text-align: center;
  z-index: 1000;
  max-width: 300px;
  opacity: ${props => props.isVisible ? 1 : 0};
  transition: opacity 0.3s ease;
  pointer-events: ${props => props.isVisible ? 'auto' : 'none'};

  @media (max-width: ${theme.breakpoints.mobile}) {
    bottom: 10px;
    left: 10px;
    right: 10px;
    transform: none;
    max-width: none;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  position: absolute;
  top: 5px;
  right: 10px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 0.7;
  }
`;

export const MobileHighlightHint: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const responsive = useResponsive();

  useEffect(() => {
    // Only show on mobile devices and only once per session
    if (responsive.isMobile && !hasBeenShown) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setHasBeenShown(true);
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [responsive.isMobile, hasBeenShown]);

  useEffect(() => {
    // Auto-hide after 8 seconds
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!responsive.isMobile) {
    return null;
  }

  return (
    <HintContainer isVisible={isVisible}>
      <CloseButton onClick={handleClose}>×</CloseButton>
      <div>
        <strong>💡 Tip:</strong> To highlight text, press and hold to select text, then choose a highlight color.
      </div>
    </HintContainer>
  );
};