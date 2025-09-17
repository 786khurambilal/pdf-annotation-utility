import { useCallback } from 'react';
import { useNotifications } from './useNotifications';
import { QRCodeScanResult } from '../utils/QRCodeScanner';
import { CallToAction } from '../types/annotation.types';

export interface UseQRNotificationsReturn {
  showScanStarted: (totalPages: number) => string;
  showScanCompleted: (foundQRCodes: number, generatedCTAs: number, duration: string) => string;
  showScanPaused: (currentPage: number, totalPages: number) => string;
  showScanResumed: () => string;
  showScanStopped: (reason?: string) => string;
  showQRCodeFound: (qrCode: QRCodeScanResult, pageNumber: number) => string;
  showCTAGenerated: (cta: CallToAction, pageNumber: number) => string;
  showScanError: (error: string, pageNumber?: number) => string;
  showQRProcessingError: (qrCode: QRCodeScanResult, error: string, pageNumber: number) => string;
  showBatchScanResults: (results: { foundQRCodes: number; generatedCTAs: number; errors: number }) => string;
  showScanProgress: (currentPage: number, totalPages: number, foundQRCodes: number) => string;
}

export const useQRNotifications = (): UseQRNotificationsReturn => {
  const { showSuccess, showError, showWarning, showInfo, addNotification } = useNotifications();

  const showScanStarted = useCallback((totalPages: number): string => {
    return showInfo(
      `Starting QR code scan across ${totalPages} pages. This may take a few moments.`,
      'QR Scan Started',
      4000
    );
  }, [showInfo]);

  const showScanCompleted = useCallback((
    foundQRCodes: number,
    generatedCTAs: number,
    duration: string
  ): string => {
    const message = foundQRCodes > 0
      ? `Found ${foundQRCodes} QR code${foundQRCodes !== 1 ? 's' : ''} and created ${generatedCTAs} call-to-action${generatedCTAs !== 1 ? 's' : ''} in ${duration}.`
      : `Scan completed in ${duration}. No QR codes were found in this document.`;

    return foundQRCodes > 0
      ? showSuccess(message, 'QR Scan Completed', 8000)
      : showInfo(message, 'QR Scan Completed', 6000);
  }, [showSuccess, showInfo]);

  const showScanPaused = useCallback((currentPage: number, totalPages: number): string => {
    return showWarning(
      `QR code scanning paused at page ${currentPage} of ${totalPages}. Click Resume to continue.`,
      'Scan Paused',
      0 // Persistent until dismissed
    );
  }, [showWarning]);

  const showScanResumed = useCallback((): string => {
    return showInfo('QR code scanning resumed.', 'Scan Resumed', 3000);
  }, [showInfo]);

  const showScanStopped = useCallback((reason?: string): string => {
    const message = reason
      ? `QR code scanning stopped: ${reason}`
      : 'QR code scanning was stopped by user.';
    
    return showWarning(message, 'Scan Stopped', 5000);
  }, [showWarning]);

  const showQRCodeFound = useCallback((qrCode: QRCodeScanResult, pageNumber: number): string => {
    const urlPreview = qrCode.data.length > 50 
      ? `${qrCode.data.substring(0, 47)}...`
      : qrCode.data;

    return addNotification({
      type: 'success',
      title: `QR Code Found - Page ${pageNumber}`,
      message: `Found QR code linking to: ${urlPreview}`,
      duration: 6000,
      action: {
        label: 'View',
        onClick: () => {
          if (qrCode.data.startsWith('http')) {
            window.open(qrCode.data, '_blank', 'noopener,noreferrer');
          }
        }
      }
    });
  }, [addNotification]);

  const showCTAGenerated = useCallback((cta: CallToAction, pageNumber: number): string => {
    return showSuccess(
      `Created call-to-action "${cta.label}" on page ${pageNumber}.`,
      'CTA Generated',
      5000
    );
  }, [showSuccess]);

  const showScanError = useCallback((error: string, pageNumber?: number): string => {
    const message = pageNumber
      ? `Error scanning page ${pageNumber}: ${error}`
      : `QR scanning error: ${error}`;
    
    return showError(message, 'Scan Error', 8000);
  }, [showError]);

  const showQRProcessingError = useCallback((
    qrCode: QRCodeScanResult,
    error: string,
    pageNumber: number
  ): string => {
    const urlPreview = qrCode.data.length > 30 
      ? `${qrCode.data.substring(0, 27)}...`
      : qrCode.data;

    return showError(
      `Failed to process QR code "${urlPreview}" on page ${pageNumber}: ${error}`,
      'QR Processing Error',
      8000
    );
  }, [showError]);

  const showBatchScanResults = useCallback((results: {
    foundQRCodes: number;
    generatedCTAs: number;
    errors: number;
  }): string => {
    const { foundQRCodes, generatedCTAs, errors } = results;
    
    let message = `Scan complete: ${foundQRCodes} QR codes found, ${generatedCTAs} CTAs created`;
    if (errors > 0) {
      message += `, ${errors} error${errors !== 1 ? 's' : ''}`;
    }

    const notificationType = errors > foundQRCodes ? 'warning' : 
                           foundQRCodes > 0 ? 'success' : 'info';

    return addNotification({
      type: notificationType,
      title: 'Batch Scan Results',
      message,
      duration: 10000
    });
  }, [addNotification]);

  const showScanProgress = useCallback((
    currentPage: number,
    totalPages: number,
    foundQRCodes: number
  ): string => {
    // Only show progress notifications every 10 pages or when QR codes are found
    if (currentPage % 10 !== 0 && foundQRCodes === 0) {
      return '';
    }

    const message = foundQRCodes > 0
      ? `Scanning page ${currentPage}/${totalPages} - ${foundQRCodes} QR codes found so far`
      : `Scanning page ${currentPage}/${totalPages}...`;

    return showInfo(message, 'Scan Progress', 2000);
  }, [showInfo]);

  return {
    showScanStarted,
    showScanCompleted,
    showScanPaused,
    showScanResumed,
    showScanStopped,
    showQRCodeFound,
    showCTAGenerated,
    showScanError,
    showQRProcessingError,
    showBatchScanResults,
    showScanProgress,
  };
};

// Hook for QR scanning workflow notifications
export const useQRScanningWorkflow = () => {
  const qrNotifications = useQRNotifications();
  const { showError, showWarning } = useNotifications();

  return {
    ...qrNotifications,
    
    showSettingsRequired: () =>
      showWarning(
        'QR code scanning requires configuration. Please check your settings.',
        'Settings Required',
        8000
      ),
    
    showPermissionError: () =>
      showError(
        'Camera permission is required for QR code scanning. Please enable camera access.',
        'Permission Required',
        10000
      ),
    
    showUnsupportedBrowser: () =>
      showError(
        'QR code scanning is not supported in this browser. Please use a modern browser.',
        'Browser Not Supported',
        10000
      ),
    
    showDocumentRequired: () =>
      showWarning(
        'Please load a PDF document before starting QR code scanning.',
        'Document Required',
        5000
      ),
    
    showScanInProgress: () =>
      showWarning(
        'A QR code scan is already in progress. Please wait for it to complete or stop the current scan.',
        'Scan In Progress',
        5000
      ),
  };
};