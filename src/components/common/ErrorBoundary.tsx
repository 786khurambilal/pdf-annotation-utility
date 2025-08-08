import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  margin: ${theme.spacing.md};
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.danger};
  text-align: center;
  min-height: 200px;

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.md};
    margin: ${theme.spacing.sm};
  }
`;

const ErrorTitle = styled.h2`
  margin: 0 0 ${theme.spacing.md} 0;
  font-size: ${theme.fontSizes.xl};
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  margin: 0 0 ${theme.spacing.lg} 0;
  font-size: ${theme.fontSizes.md};
  line-height: 1.5;
  max-width: 600px;
`;

const ErrorDetails = styled.details`
  margin-top: ${theme.spacing.md};
  text-align: left;
  width: 100%;
  max-width: 800px;
`;

const ErrorSummary = styled.summary`
  cursor: pointer;
  font-weight: 500;
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.primary};
  
  &:hover {
    text-decoration: underline;
  }
`;

const ErrorStack = styled.pre`
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: ${theme.borderRadius.sm};
  padding: ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: #495057;
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
  margin-top: ${theme.spacing.md};

  &:hover {
    background-color: ${theme.colors.primaryDark};
  }

  &:focus {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorContainer>
          <ErrorTitle>Something went wrong</ErrorTitle>
          <ErrorMessage>
            An unexpected error occurred while rendering this component. 
            Please try refreshing the page or contact support if the problem persists.
          </ErrorMessage>
          
          <RetryButton onClick={this.handleRetry}>
            Try Again
          </RetryButton>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <ErrorDetails>
              <ErrorSummary>Error Details (Development Mode)</ErrorSummary>
              <ErrorStack>
                <strong>Error:</strong> {this.state.error.message}
                {this.state.error.stack && (
                  <>
                    <br /><br />
                    <strong>Stack Trace:</strong>
                    <br />
                    {this.state.error.stack}
                  </>
                )}
                {this.state.errorInfo && (
                  <>
                    <br /><br />
                    <strong>Component Stack:</strong>
                    <br />
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </ErrorStack>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;