import { renderHook, act } from '@testing-library/react';
import { useQRNotifications, useQRScanningWorkflow } from './useQRNotifications';
import { useNotifications } from './useNotifications';
import { QRCodeScanResult } from '../utils/QRCodeScanner';
import { CallToAction } from '../types/annotation.types';

// Mock the useNotifications hook
jest.mock('./useNotifications', () => ({
  useNotifications: jest.fn(),
}));

const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

describe('useQRNotifications', () => {
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockShowWarning = jest.fn();
  const mockShowInfo = jest.fn();
  const mockAddNotification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseNotifications.mockReturnValue({
      notifications: [],
      addNotification: mockAddNotification,
      removeNotification: jest.fn(),
      clearNotifications: jest.fn(),
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      showWarning: mockShowWarning,
      showInfo: mockShowInfo,
    });

    // Mock return values for notification functions
    mockShowSuccess.mockReturnValue('success-id');
    mockShowError.mockReturnValue('error-id');
    mockShowWarning.mockReturnValue('warning-id');
    mockShowInfo.mockReturnValue('info-id');
    mockAddNotification.mockReturnValue('notification-id');
  });

  describe('showScanStarted', () => {
    it('shows info notification with correct message for single page', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanStarted(1);
      });

      expect(mockShowInfo).toHaveBeenCalledWith(
        'Starting QR code scan across 1 pages. This may take a few moments.',
        'QR Scan Started',
        4000
      );
    });

    it('shows info notification with correct message for multiple pages', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanStarted(25);
      });

      expect(mockShowInfo).toHaveBeenCalledWith(
        'Starting QR code scan across 25 pages. This may take a few moments.',
        'QR Scan Started',
        4000
      );
    });
  });

  describe('showScanCompleted', () => {
    it('shows success notification when QR codes are found', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanCompleted(3, 2, '2m 30s');
      });

      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Found 3 QR codes and created 2 call-to-actions in 2m 30s.',
        'QR Scan Completed',
        8000
      );
    });

    it('shows info notification when no QR codes are found', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanCompleted(0, 0, '1m 15s');
      });

      expect(mockShowInfo).toHaveBeenCalledWith(
        'Scan completed in 1m 15s. No QR codes were found in this document.',
        'QR Scan Completed',
        6000
      );
    });

    it('handles singular vs plural correctly', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanCompleted(1, 1, '30s');
      });

      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Found 1 QR code and created 1 call-to-action in 30s.',
        'QR Scan Completed',
        8000
      );
    });
  });

  describe('showScanPaused', () => {
    it('shows warning notification with persistent duration', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanPaused(5, 10);
      });

      expect(mockShowWarning).toHaveBeenCalledWith(
        'QR code scanning paused at page 5 of 10. Click Resume to continue.',
        'Scan Paused',
        0
      );
    });
  });

  describe('showScanResumed', () => {
    it('shows info notification', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanResumed();
      });

      expect(mockShowInfo).toHaveBeenCalledWith(
        'QR code scanning resumed.',
        'Scan Resumed',
        3000
      );
    });
  });

  describe('showScanStopped', () => {
    it('shows warning notification with default message', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanStopped();
      });

      expect(mockShowWarning).toHaveBeenCalledWith(
        'QR code scanning was stopped by user.',
        'Scan Stopped',
        5000
      );
    });

    it('shows warning notification with custom reason', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanStopped('Document was closed');
      });

      expect(mockShowWarning).toHaveBeenCalledWith(
        'QR code scanning stopped: Document was closed',
        'Scan Stopped',
        5000
      );
    });
  });

  describe('showQRCodeFound', () => {
    it('shows notification with action for HTTP URLs', () => {
      const { result } = renderHook(() => useQRNotifications());
      
      const mockQRCode: QRCodeScanResult = {
        data: 'https://example.com/page',
        coordinates: { x: 100, y: 200, width: 50, height: 50 },
        confidence: 0.95,
      };

      // Mock window.open
      const mockOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        value: mockOpen,
        writable: true,
      });

      act(() => {
        result.current.showQRCodeFound(mockQRCode, 5);
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'QR Code Found - Page 5',
        message: 'Found QR code linking to: https://example.com/page',
        duration: 6000,
        action: {
          label: 'View',
          onClick: expect.any(Function),
        },
      });

      // Test the action callback
      const call = mockAddNotification.mock.calls[0][0];
      call.action.onClick();
      expect(mockOpen).toHaveBeenCalledWith(
        'https://example.com/page',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('truncates long URLs in preview', () => {
      const { result } = renderHook(() => useQRNotifications());
      
      const longUrl = 'https://example.com/very/long/path/that/exceeds/fifty/characters/in/length';
      const mockQRCode: QRCodeScanResult = {
        data: longUrl,
        coordinates: { x: 100, y: 200, width: 50, height: 50 },
        confidence: 0.95,
      };

      act(() => {
        result.current.showQRCodeFound(mockQRCode, 3);
      });

      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Found QR code linking to: https://example.com/very/long/path/that/exceeds...',
        })
      );
    });
  });

  describe('showCTAGenerated', () => {
    it('shows success notification with CTA details', () => {
      const { result } = renderHook(() => useQRNotifications());
      
      const mockCTA: CallToAction = {
        id: 'cta-1',
        type: 'cta',
        pageNumber: 3,
        coordinates: { x: 100, y: 200, width: 150, height: 40 },
        label: 'Visit Website',
        url: 'https://example.com',
        userId: 'user-1',
        documentId: 'doc-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.showCTAGenerated(mockCTA, 3);
      });

      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Created call-to-action "Visit Website" on page 3.',
        'CTA Generated',
        5000
      );
    });
  });

  describe('showScanError', () => {
    it('shows error notification with page number', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanError('Failed to decode image', 7);
      });

      expect(mockShowError).toHaveBeenCalledWith(
        'Error scanning page 7: Failed to decode image',
        'Scan Error',
        8000
      );
    });

    it('shows error notification without page number', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanError('Network connection failed');
      });

      expect(mockShowError).toHaveBeenCalledWith(
        'QR scanning error: Network connection failed',
        'Scan Error',
        8000
      );
    });
  });

  describe('showQRProcessingError', () => {
    it('shows error notification with QR code details', () => {
      const { result } = renderHook(() => useQRNotifications());
      
      const mockQRCode: QRCodeScanResult = {
        data: 'https://example.com',
        coordinates: { x: 100, y: 200, width: 50, height: 50 },
        confidence: 0.95,
      };

      act(() => {
        result.current.showQRProcessingError(mockQRCode, 'Invalid URL format', 4);
      });

      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to process QR code "https://example.com" on page 4: Invalid URL format',
        'QR Processing Error',
        8000
      );
    });

    it('truncates long QR code data in error message', () => {
      const { result } = renderHook(() => useQRNotifications());
      
      const longData = 'https://example.com/very/long/url/path';
      const mockQRCode: QRCodeScanResult = {
        data: longData,
        coordinates: { x: 100, y: 200, width: 50, height: 50 },
        confidence: 0.95,
      };

      act(() => {
        result.current.showQRProcessingError(mockQRCode, 'Processing failed', 2);
      });

      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to process QR code "https://example.com/very/lo..." on page 2: Processing failed',
        'QR Processing Error',
        8000
      );
    });
  });

  describe('showBatchScanResults', () => {
    it('shows success notification when QR codes found without errors', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showBatchScanResults({
          foundQRCodes: 5,
          generatedCTAs: 4,
          errors: 0,
        });
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Batch Scan Results',
        message: 'Scan complete: 5 QR codes found, 4 CTAs created',
        duration: 10000,
      });
    });

    it('shows warning notification when errors exceed found QR codes', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showBatchScanResults({
          foundQRCodes: 2,
          generatedCTAs: 1,
          errors: 5,
        });
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Batch Scan Results',
        message: 'Scan complete: 2 QR codes found, 1 CTAs created, 5 errors',
        duration: 10000,
      });
    });

    it('shows info notification when no QR codes found', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showBatchScanResults({
          foundQRCodes: 0,
          generatedCTAs: 0,
          errors: 1,
        });
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Batch Scan Results',
        message: 'Scan complete: 0 QR codes found, 0 CTAs created, 1 error',
        duration: 10000,
      });
    });
  });

  describe('showScanProgress', () => {
    it('shows progress notification every 10 pages', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanProgress(10, 50, 0);
      });

      expect(mockShowInfo).toHaveBeenCalledWith(
        'Scanning page 10/50...',
        'Scan Progress',
        2000
      );
    });

    it('shows progress notification when QR codes are found', () => {
      const { result } = renderHook(() => useQRNotifications());

      act(() => {
        result.current.showScanProgress(7, 50, 2);
      });

      expect(mockShowInfo).toHaveBeenCalledWith(
        'Scanning page 7/50 - 2 QR codes found so far',
        'Scan Progress',
        2000
      );
    });

    it('does not show notification for non-milestone pages without QR codes', () => {
      const { result } = renderHook(() => useQRNotifications());

      const notificationId = result.current.showScanProgress(7, 50, 0);

      expect(notificationId).toBe('');
      expect(mockShowInfo).not.toHaveBeenCalled();
    });
  });
});

describe('useQRScanningWorkflow', () => {
  const mockShowError = jest.fn();
  const mockShowWarning = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseNotifications.mockReturnValue({
      notifications: [],
      addNotification: jest.fn(),
      removeNotification: jest.fn(),
      clearNotifications: jest.fn(),
      showSuccess: jest.fn(),
      showError: mockShowError,
      showWarning: mockShowWarning,
      showInfo: jest.fn(),
    });

    mockShowError.mockReturnValue('error-id');
    mockShowWarning.mockReturnValue('warning-id');
  });

  it('provides workflow-specific notification methods', () => {
    const { result } = renderHook(() => useQRScanningWorkflow());

    expect(typeof result.current.showSettingsRequired).toBe('function');
    expect(typeof result.current.showPermissionError).toBe('function');
    expect(typeof result.current.showUnsupportedBrowser).toBe('function');
    expect(typeof result.current.showDocumentRequired).toBe('function');
    expect(typeof result.current.showScanInProgress).toBe('function');
  });

  it('shows settings required warning', () => {
    const { result } = renderHook(() => useQRScanningWorkflow());

    act(() => {
      result.current.showSettingsRequired();
    });

    expect(mockShowWarning).toHaveBeenCalledWith(
      'QR code scanning requires configuration. Please check your settings.',
      'Settings Required',
      8000
    );
  });

  it('shows permission error', () => {
    const { result } = renderHook(() => useQRScanningWorkflow());

    act(() => {
      result.current.showPermissionError();
    });

    expect(mockShowError).toHaveBeenCalledWith(
      'Camera permission is required for QR code scanning. Please enable camera access.',
      'Permission Required',
      10000
    );
  });

  it('shows unsupported browser error', () => {
    const { result } = renderHook(() => useQRScanningWorkflow());

    act(() => {
      result.current.showUnsupportedBrowser();
    });

    expect(mockShowError).toHaveBeenCalledWith(
      'QR code scanning is not supported in this browser. Please use a modern browser.',
      'Browser Not Supported',
      10000
    );
  });

  it('shows document required warning', () => {
    const { result } = renderHook(() => useQRScanningWorkflow());

    act(() => {
      result.current.showDocumentRequired();
    });

    expect(mockShowWarning).toHaveBeenCalledWith(
      'Please load a PDF document before starting QR code scanning.',
      'Document Required',
      5000
    );
  });

  it('shows scan in progress warning', () => {
    const { result } = renderHook(() => useQRScanningWorkflow());

    act(() => {
      result.current.showScanInProgress();
    });

    expect(mockShowWarning).toHaveBeenCalledWith(
      'A QR code scan is already in progress. Please wait for it to complete or stop the current scan.',
      'Scan In Progress',
      5000
    );
  });
});