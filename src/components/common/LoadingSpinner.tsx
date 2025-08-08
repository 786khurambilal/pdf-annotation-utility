import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  message?: string;
  overlay?: boolean;
}

const spin = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
`;

const SpinnerContainerOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 1000;
`;

const Spinner = styled.div<{ size: 'small' | 'medium' | 'large'; color: string }>`
  border: 2px solid #f3f3f3;
  border-top: 2px solid ${props => props.color};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  ${spin}
  
  ${props => {
    switch (props.size) {
      case 'small':
        return `
          width: 20px;
          height: 20px;
          border-width: 2px;
        `;
      case 'medium':
        return `
          width: 40px;
          height: 40px;
          border-width: 3px;
        `;
      case 'large':
        return `
          width: 60px;
          height: 60px;
          border-width: 4px;
        `;
      default:
        return `
          width: 40px;
          height: 40px;
          border-width: 3px;
        `;
    }
  }}
`;

const LoadingMessage = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  color: ${theme.colors.gray600};
  text-align: center;
  font-size: ${props => {
    switch (props.size) {
      case 'small':
        return theme.fontSizes.sm;
      case 'large':
        return theme.fontSizes.lg;
      default:
        return theme.fontSizes.md;
    }
  }};
`;

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = theme.colors.primary,
  message,
  overlay = false,
}) => {
  const Container = overlay ? SpinnerContainerOverlay : SpinnerContainer;
  
  return (
    <Container>
      <Spinner size={size} color={color} />
      {message && <LoadingMessage size={size}>{message}</LoadingMessage>}
    </Container>
  );
};

// Specific loading components for common scenarios
export const PDFLoadingSpinner: React.FC<{ fileName?: string }> = ({ fileName }) => (
  <LoadingSpinner
    size="large"
    message={fileName ? `Loading ${fileName}...` : 'Loading PDF...'}
  />
);

export const PageLoadingSpinner: React.FC<{ pageNumber?: number }> = ({ pageNumber }) => (
  <LoadingSpinner
    size="medium"
    message={pageNumber ? `Loading page ${pageNumber}...` : 'Loading page...'}
  />
);

export const AnnotationLoadingSpinner: React.FC<{ operation?: string }> = ({ operation = 'annotation' }) => (
  <LoadingSpinner
    size="small"
    message={`Processing ${operation}...`}
    overlay={true}
  />
);