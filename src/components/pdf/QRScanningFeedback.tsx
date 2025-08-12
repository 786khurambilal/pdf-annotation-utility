import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import { QRScanningProgress } from '../common/QRScanningProgress';
import { QRScanningState, QRScanProgress } from '../../utils/QRScanningManager';
import { useQRNotifications } from '../../hooks/useQRNotifications';

interface QRScanningFeedbackProps {
  scanningState: QRScanningState;
  scanningProgress?: QRScanProgress | null;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  isVisible?: boolean;
  position?: 'overlay' | 'sidebar' | 'bottom';
}

const FeedbackContainer = styled.div<{ 
  position: 'overlay' | 'sidebar' | 'bottom';
  isVisible: boolean;
}>`
  ${props => {
    switch (props.position) {
      case 'overlay':
        return `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
          max-width: 500px;
          width: 90vw;
        `;
      case 'sidebar':
        return `
          position: sticky;
          top: ${theme.spacing.lg};
          width: 100%;
        `;
      case 'bottom':
        return `
          position: fixed;
          bottom: ${theme.spacing.lg};
          left: ${theme.spacing.lg};
          right: ${theme.spacing.lg};
          z-index: 100;
        `;
      default:
        return '';
    }
  }}
  
  opacity: ${props => props.isVisible ? 1 : 0};
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
  
  @media (max-width: ${theme.breakpoints.mobile}) {
    ${props => props.position === 'overlay' && `
      top: auto;
      bottom: ${theme.spacing.lg};
      transform: translateX(-50%);
      left: 50%;
    `}
  }
`;

const Backdrop = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: ${props => props.isVisible ? 1 : 0};
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const CompactProgress = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.white};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.lg};
  border: 1px solid ${theme.colors.gray200};
`;

const CompactInfo = styled.div`
  flex: 1;
`;

const CompactTitle = styled.div`
  font-weight: 600;
  color: ${theme.colors.gray800};
  margin-bottom: ${theme.spacing.xs};
`;

const CompactStatus = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.gray600};
`;

const CompactStats = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
`;

const CompactStat = styled.div`
  text-align: center;
`;

const CompactStatValue = styled.div`
  font-weight: 600;
  color: ${theme.colors.primary};
`;

const CompactStatLabel = styled.div`
  color: ${theme.colors.gray500};
  font-size: ${theme.fontSizes.xs};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: ${theme.colors.gray200};
  border-radius: 2px;
  overflow: hidden;
  margin: ${theme.spacing.xs} 0;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  background: ${theme.colors.primary};
  width: ${props => Math.min(100, Math.max(0, props.progress))}%;
  transition: width 0.3s ease;
`;

export const QRScanningFeedback: React.FC<QRScanningFeedbackProps> = ({
  scanningState,
  scanningProgress,
  onPause,
  onResume,
  onStop,
  isVisible = true,
  position = 'overlay',
}) => {
  const qrNotifications = useQRNotifications();
  const [lastNotifiedQRCount, setLastNotifiedQRCount] = useState(0);
  const [lastNotifiedCTACount, setLastNotifiedCTACount] = useState(0);
  const [scanStartNotificationId, setScanStartNotificationId] = useState<string | null>(null);

  // Handle scan lifecycle notifications
  useEffect(() => {
    if (scanningState.isScanning && scanningState.startedAt && !scanStartNotificationId) {
      const notificationId = qrNotifications.showScanStarted(scanningState.totalPages);
      setScanStartNotificationId(notificationId);
    }

    if (!scanningState.isScanning && scanningState.completedAt && scanStartNotificationId) {
      const duration = formatDuration(scanningState.startedAt, scanningState.completedAt);
      qrNotifications.showScanCompleted(
        scanningState.foundQRCodes,
        scanningState.generatedCTAs,
        duration
      );
      setScanStartNotificationId(null);
    }
  }, [
    scanningState.isScanning,
    scanningState.startedAt,
    scanningState.completedAt,
    scanningState.totalPages,
    scanningState.foundQRCodes,
    scanningState.generatedCTAs,
    scanStartNotificationId,
    qrNotifications
  ]);

  // Handle pause/resume notifications
  useEffect(() => {
    if (scanningState.isPaused) {
      qrNotifications.showScanPaused(scanningState.currentPage, scanningState.totalPages);
    }
  }, [scanningState.isPaused]); // Only trigger when pause state changes

  // Handle QR code and CTA notifications
  useEffect(() => {
    if (scanningProgress) {
      // Notify about new QR codes found
      if (scanningProgress.foundQRCodes.length > lastNotifiedQRCount) {
        const newQRCodes = scanningProgress.foundQRCodes.slice(lastNotifiedQRCount);
        newQRCodes.forEach(qrCode => {
          // Find the page number for this QR code (assuming it's in the coordinates)
          const pageNumber = scanningState.currentPage;
          qrNotifications.showQRCodeFound(qrCode, pageNumber);
        });
        setLastNotifiedQRCount(scanningProgress.foundQRCodes.length);
      }

      // Notify about new CTAs generated
      if (scanningProgress.generatedCTAs.length > lastNotifiedCTACount) {
        const newCTAs = scanningProgress.generatedCTAs.slice(lastNotifiedCTACount);
        newCTAs.forEach(cta => {
          qrNotifications.showCTAGenerated(cta, cta.pageNumber);
        });
        setLastNotifiedCTACount(scanningProgress.generatedCTAs.length);
      }
    }
  }, [
    scanningProgress,
    lastNotifiedQRCount,
    lastNotifiedCTACount,
    scanningState.currentPage,
    qrNotifications
  ]);

  // Handle error notifications
  useEffect(() => {
    if (scanningState.errors.length > 0) {
      const latestError = scanningState.errors[scanningState.errors.length - 1];
      qrNotifications.showScanError(latestError.error, latestError.pageNumber);
    }
  }, [scanningState.errors, qrNotifications]);

  const formatDuration = (startTime?: Date, endTime?: Date): string => {
    if (!startTime) return '0s';
    
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

  const getProgressPercentage = (): number => {
    if (scanningState.totalPages === 0) return 0;
    return (scanningState.currentPage / scanningState.totalPages) * 100;
  };

  const shouldShowFeedback = (): boolean => {
    return isVisible && (
      scanningState.isScanning ||
      scanningState.isPaused ||
      (scanningState.completedAt && Date.now() - scanningState.completedAt.getTime() < 5000)
    );
  };

  if (!shouldShowFeedback()) {
    return null;
  }

  const renderCompactView = () => (
    <CompactProgress>
      <CompactInfo>
        <CompactTitle>
          {scanningState.isPaused ? 'QR Scan Paused' : 
           scanningState.isScanning ? 'Scanning QR Codes' : 'Scan Complete'}
        </CompactTitle>
        <CompactStatus>
          Page {scanningState.currentPage} of {scanningState.totalPages}
        </CompactStatus>
        <ProgressBar>
          <ProgressFill progress={getProgressPercentage()} />
        </ProgressBar>
      </CompactInfo>
      
      <CompactStats>
        <CompactStat>
          <CompactStatValue>{scanningState.foundQRCodes}</CompactStatValue>
          <CompactStatLabel>QR Codes</CompactStatLabel>
        </CompactStat>
        <CompactStat>
          <CompactStatValue>{scanningState.generatedCTAs}</CompactStatValue>
          <CompactStatLabel>CTAs</CompactStatLabel>
        </CompactStat>
      </CompactStats>
    </CompactProgress>
  );

  const renderFullView = () => (
    <QRScanningProgress
      state={scanningState}
      onPause={onPause}
      onResume={onResume}
      onStop={onStop}
      showControls={position === 'overlay'}
    />
  );

  return (
    <>
      {position === 'overlay' && (
        <Backdrop isVisible={shouldShowFeedback()} />
      )}
      
      <FeedbackContainer position={position} isVisible={shouldShowFeedback()}>
        {position === 'bottom' ? renderCompactView() : renderFullView()}
      </FeedbackContainer>
    </>
  );
};