import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import { ProgressIndicator } from './ProgressIndicator';
import { QRScanningState } from '../../utils/QRScanningManager';

interface QRScanningProgressProps {
  state: QRScanningState;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  showControls?: boolean;
}

const ProgressContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.white};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.md};
  border: 1px solid ${theme.colors.gray200};
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProgressTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: 600;
  color: ${theme.colors.gray800};
`;

const StatusBadge = styled.span<{ status: 'scanning' | 'paused' | 'completed' | 'error' }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${props => {
    switch (props.status) {
      case 'scanning':
        return `
          background-color: ${theme.colors.primary}20;
          color: ${theme.colors.primary};
        `;
      case 'paused':
        return `
          background-color: #ffc10720;
          color: #856404;
        `;
      case 'completed':
        return `
          background-color: ${theme.colors.success}20;
          color: ${theme.colors.success};
        `;
      case 'error':
        return `
          background-color: ${theme.colors.danger}20;
          color: ${theme.colors.danger};
        `;
      default:
        return `
          background-color: ${theme.colors.gray200};
          color: ${theme.colors.gray600};
        `;
    }
  }}
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const StatItem = styled.div`
  text-align: center;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.gray50};
  border-radius: ${theme.borderRadius.md};
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: 700;
  color: ${theme.colors.primary};
  margin-bottom: ${theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.gray600};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  justify-content: center;
  margin-top: ${theme.spacing.md};
`;

const ControlButton = styled.button<{ variant: 'primary' | 'secondary' | 'danger' }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: none;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background-color: ${theme.colors.primary};
          color: white;
          &:hover {
            background-color: ${theme.colors.primaryDark};
          }
        `;
      case 'secondary':
        return `
          background-color: ${theme.colors.gray200};
          color: ${theme.colors.gray700};
          &:hover {
            background-color: ${theme.colors.gray300};
          }
        `;
      case 'danger':
        return `
          background-color: ${theme.colors.danger};
          color: white;
          &:hover {
            background-color: ${theme.colors.dangerDark};
          }
        `;
      default:
        return '';
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorList = styled.div`
  margin-top: ${theme.spacing.md};
  max-height: 120px;
  overflow-y: auto;
`;

const ErrorItem = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.danger}10;
  border-left: 3px solid ${theme.colors.danger};
  margin-bottom: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.danger};
  border-radius: ${theme.borderRadius.sm};
`;

const TimeInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.gray600};
  margin-top: ${theme.spacing.sm};
`;

export const QRScanningProgress: React.FC<QRScanningProgressProps> = ({
  state,
  onPause,
  onResume,
  onStop,
  showControls = true,
}) => {
  const getStatus = (): 'scanning' | 'paused' | 'completed' | 'error' => {
    if (state.errors.length > 0 && !state.isScanning) return 'error';
    if (!state.isScanning && state.completedAt) return 'completed';
    if (state.isPaused) return 'paused';
    if (state.isScanning) return 'scanning';
    return 'completed';
  };

  const getStatusText = (): string => {
    const status = getStatus();
    switch (status) {
      case 'scanning':
        return 'Scanning';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  const getProgressPercentage = (): number => {
    if (state.totalPages === 0) return 0;
    return (state.currentPage / state.totalPages) * 100;
  };

  const getProgressMessage = (): string => {
    if (state.isPaused) {
      return `Scanning paused at page ${state.currentPage} of ${state.totalPages}`;
    }
    if (state.isScanning) {
      return `Scanning page ${state.currentPage} of ${state.totalPages}...`;
    }
    if (state.completedAt) {
      return `Scan completed - ${state.foundQRCodes} QR codes found, ${state.generatedCTAs} CTAs created`;
    }
    return 'Ready to scan';
  };

  const formatDuration = (startTime?: Date, endTime?: Date): string => {
    if (!startTime) return '--';
    
    const end = endTime || new Date();
    const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000);
    
    if (duration < 60) {
      return `${duration}s`;
    } else if (duration < 3600) {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <ProgressContainer>
      <ProgressHeader>
        <ProgressTitle>QR Code Scanning</ProgressTitle>
        <StatusBadge status={getStatus()}>
          {getStatusText()}
        </StatusBadge>
      </ProgressHeader>

      <ProgressIndicator
        progress={getProgressPercentage()}
        message={getProgressMessage()}
        size="large"
        color={state.isPaused ? '#ffc107' : theme.colors.primary}
      />

      <StatsGrid>
        <StatItem>
          <StatValue>{state.currentPage}</StatValue>
          <StatLabel>Current Page</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{state.totalPages}</StatValue>
          <StatLabel>Total Pages</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{state.foundQRCodes}</StatValue>
          <StatLabel>QR Codes Found</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{state.generatedCTAs}</StatValue>
          <StatLabel>CTAs Created</StatLabel>
        </StatItem>
      </StatsGrid>

      {showControls && (
        <ControlsContainer>
          {state.isScanning && !state.isPaused && (
            <ControlButton
              variant="secondary"
              onClick={onPause}
              disabled={!onPause}
            >
              Pause
            </ControlButton>
          )}
          
          {state.isPaused && (
            <ControlButton
              variant="primary"
              onClick={onResume}
              disabled={!onResume}
            >
              Resume
            </ControlButton>
          )}
          
          {state.isScanning && (
            <ControlButton
              variant="danger"
              onClick={onStop}
              disabled={!onStop}
            >
              Stop
            </ControlButton>
          )}
        </ControlsContainer>
      )}

      {state.errors.length > 0 && (
        <ErrorList>
          {state.errors.map((error, index) => (
            <ErrorItem key={index}>
              Page {error.pageNumber}: {error.error}
            </ErrorItem>
          ))}
        </ErrorList>
      )}

      <TimeInfo>
        <span>
          Started: {state.startedAt ? state.startedAt.toLocaleTimeString() : '--'}
        </span>
        <span>
          Duration: {formatDuration(state.startedAt, state.completedAt)}
        </span>
        <span>
          Completed: {state.completedAt ? state.completedAt.toLocaleTimeString() : '--'}
        </span>
      </TimeInfo>
    </ProgressContainer>
  );
};