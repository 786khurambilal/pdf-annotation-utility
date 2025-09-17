import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

export interface ErrorDisplayProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
  showDetails?: boolean;
}

const ErrorContainer = styled.div<{ type: 'error' | 'warning' | 'info' }>`
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing.lg};
  margin: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid;
  
  ${props => {
    switch (props.type) {
      case 'error':
        return `
          background-color: #f8d7da;
          border-color: #f5c6cb;
          color: ${theme.colors.danger};
        `;
      case 'warning':
        return `
          background-color: #fff3cd;
          border-color: #ffeaa7;
          color: #856404;
        `;
      case 'info':
        return `
          background-color: #d1ecf1;
          border-color: #bee5eb;
          color: #0c5460;
        `;
      default:
        return `
          background-color: #f8d7da;
          border-color: #f5c6cb;
          color: ${theme.colors.danger};
        `;
    }
  }}

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.md};
    margin: ${theme.spacing.sm};
  }
`;

const ErrorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.md};
`;

const ErrorTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: 600;
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  font-size: ${theme.fontSizes.lg};
  cursor: pointer;
  padding: 0;
  margin-left: ${theme.spacing.md};
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
  }
  
  &:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;

const ErrorMessage = styled.p`
  margin: 0 0 ${theme.spacing.md} 0;
  font-size: ${theme.fontSizes.md};
  line-height: 1.5;
`;

const ErrorDetails = styled.details`
  margin-bottom: ${theme.spacing.md};
`;

const ErrorSummary = styled.summary`
  cursor: pointer;
  font-weight: 500;
  margin-bottom: ${theme.spacing.sm};
  
  &:hover {
    text-decoration: underline;
  }
`;

const ErrorDetailsContent = styled.pre`
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: ${theme.borderRadius.sm};
  padding: ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const RetryButton = styled.button`
  background-color: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  font-size: ${theme.fontSizes.md};
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${theme.colors.primaryDark};
  }

  &:focus {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Error',
  message,
  details,
  onRetry,
  onDismiss,
  type = 'error',
  showDetails = false,
}) => {
  return (
    <ErrorContainer type={type}>
      <ErrorHeader>
        <ErrorTitle>{title}</ErrorTitle>
        {onDismiss && (
          <DismissButton onClick={onDismiss} aria-label="Dismiss error">
            ×
          </DismissButton>
        )}
      </ErrorHeader>
      
      <ErrorMessage>{message}</ErrorMessage>
      
      {details && (showDetails || process.env.NODE_ENV === 'development') && (
        <ErrorDetails>
          <ErrorSummary>Technical Details</ErrorSummary>
          <ErrorDetailsContent>{details}</ErrorDetailsContent>
        </ErrorDetails>
      )}
      
      {onRetry && (
        <ButtonContainer>
          <RetryButton onClick={onRetry}>
            Try Again
          </RetryButton>
        </ButtonContainer>
      )}
    </ErrorContainer>
  );
};

// Specific error components for common scenarios
export const PDFLoadError: React.FC<{
  fileName?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  details?: string;
}> = ({ fileName, onRetry, onDismiss, details }) => (
  <ErrorDisplay
    title="PDF Load Error"
    message={
      fileName
        ? `Failed to load "${fileName}". The file may be corrupted or in an unsupported format.`
        : 'Failed to load PDF file. The file may be corrupted or in an unsupported format.'
    }
    details={details}
    onRetry={onRetry}
    onDismiss={onDismiss}
    type="error"
  />
);

export const AnnotationError: React.FC<{
  operation: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  details?: string;
}> = ({ operation, onRetry, onDismiss, details }) => (
  <ErrorDisplay
    title="Annotation Error"
    message={`Failed to ${operation}. Please try again.`}
    details={details}
    onRetry={onRetry}
    onDismiss={onDismiss}
    type="error"
  />
);

export const StorageError: React.FC<{
  onRetry?: () => void;
  onDismiss?: () => void;
  details?: string;
}> = ({ onRetry, onDismiss, details }) => (
  <ErrorDisplay
    title="Storage Error"
    message="Failed to save your changes. Your browser's storage may be full or unavailable."
    details={details}
    onRetry={onRetry}
    onDismiss={onDismiss}
    type="error"
  />
);

export const NetworkError: React.FC<{
  onRetry?: () => void;
  onDismiss?: () => void;
  details?: string;
}> = ({ onRetry, onDismiss, details }) => (
  <ErrorDisplay
    title="Network Error"
    message="Unable to connect to external resources. Please check your internet connection."
    details={details}
    onRetry={onRetry}
    onDismiss={onDismiss}
    type="warning"
  />
);