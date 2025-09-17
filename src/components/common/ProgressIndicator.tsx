import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

interface ProgressIndicatorProps {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const ProgressContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  width: 100%;
`;

const ProgressMessage = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  color: ${theme.colors.gray700};
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
  text-align: center;
`;

const ProgressBarContainer = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  width: 100%;
  background-color: ${theme.colors.gray200};
  border-radius: ${theme.borderRadius.sm};
  overflow: hidden;
  height: ${props => {
    switch (props.size) {
      case 'small':
        return '6px';
      case 'large':
        return '12px';
      default:
        return '8px';
    }
  }};
`;

const ProgressBar = styled.div<{ progress: number; color: string }>`
  height: 100%;
  background-color: ${props => props.color};
  width: ${props => Math.min(100, Math.max(0, props.progress))}%;
  transition: width 0.3s ease;
  border-radius: inherit;
`;

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.gray600};
`;

const ProgressPercentage = styled.span`
  font-weight: 500;
`;

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  message,
  showPercentage = true,
  size = 'medium',
  color = theme.colors.primary,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <ProgressContainer>
      {message && (
        <ProgressMessage size={size}>{message}</ProgressMessage>
      )}
      
      <ProgressBarContainer size={size}>
        <ProgressBar progress={clampedProgress} color={color} />
      </ProgressBarContainer>
      
      {showPercentage && (
        <ProgressInfo>
          <span>Progress</span>
          <ProgressPercentage>{Math.round(clampedProgress)}%</ProgressPercentage>
        </ProgressInfo>
      )}
    </ProgressContainer>
  );
};

// Specific progress components for common scenarios
export const FileUploadProgress: React.FC<{
  progress: number;
  fileName?: string;
  fileSize?: number;
}> = ({ progress, fileName, fileSize }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ProgressIndicator
      progress={progress}
      message={
        fileName
          ? `Uploading ${fileName}${fileSize ? ` (${formatFileSize(fileSize)})` : ''}...`
          : 'Uploading file...'
      }
      size="medium"
      color={theme.colors.success}
    />
  );
};

export const PDFProcessingProgress: React.FC<{
  progress: number;
  currentPage?: number;
  totalPages?: number;
}> = ({ progress, currentPage, totalPages }) => {
  const message = currentPage && totalPages
    ? `Processing PDF... (Page ${currentPage} of ${totalPages})`
    : 'Processing PDF...';

  return (
    <ProgressIndicator
      progress={progress}
      message={message}
      size="large"
      color={theme.colors.primary}
    />
  );
};