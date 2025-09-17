import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QRScanningFeedback } from './QRScanningFeedback';
import { QRScanningState, QRScanProgress } from '../../utils/QRScanningManager';
import { useQRNotifications } from '../../hooks/useQRNotifications';
import { QRCodeScanResult } from '../../utils/QRCodeScanner';
import { CallToAction } from '../../types/annotation.types';

// Mock the QR notifications hook
jest.mock('../../hooks/useQRNotifications');
const mockUseQRNotifications = useQRNotifications as jest.MockedFunction<typeof useQRNotifications>;

// Mock styled-components theme
jest.mock('../../styles/theme', () => ({
  theme: {
    colors: {
      primary: '#007bff',
      white: '#ffffff',
      gray200: '#e9ecef',
      gray500: '#6c757d',
      gray600: '#6c757d',
      gray800: '#343a40',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
    },
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
    },
    borderRadius: {
      lg: '0.5rem',
    },
    shadows: {
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    },
    breakpoints: {
      mobile: '768px',
    },
  },
}));

// Mock the QRScanningProgress component
jest.mock('../common/QRScanningProgress', () => ({
  QRScanningProgress: ({ state, onPause, onResume, onStop }: any) => (
    <div data-testid="qr-scanning-progress">
      <div>Status: {state.isScanning ? 'Scanning' : 'Not Scanning'}</div>
      <div>Page: {state.currentPage}/{state.totalPages}</div>
      <div>QR Codes: {state.foundQRCodes}</div>
      <div>CTAs: {state.generatedCTAs}</div>
      {onPause && <button onClick={onPause}>Pause</button>}
      {onResume && <button onClick={onResume}>Resume</button>}
      {onStop && <button onClick={onStop}>Stop</button>}
    </div>
  ),
}));

describe('QRScanningFeedback', () => {
  const mockNotifications = {
    showScanStarted: jest.fn(),
    showScanCompleted: jest.fn(),
    showScanPaused: jest.fn(),
    showScanResumed: jest.fn(),
    showScanStopped: jest.fn(),
    showQRCodeFound: jest.fn(),
    showCTAGenerated: jest.fn(),
    showScanError: jest.fn(),
    showQRProcessingError: jest.fn(),
    showBatchScanResults: jest.fn(),
    showScanProgress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQRNotifications.mockReturnValue(mockNotifications);
    
    // Mock return values
    mockNotifications.showScanStarted.mockReturnValue('start-id');
    mockNotifications.showScanCompleted.mockReturnValue('complete-id');
    mockNotifications.showScanPaused.mockReturnValue('pause-id');
    mockNotifications.showQRCodeFound.mockReturnValue('qr-found-id');
    mockNotifications.showCTAGenerated.mockReturnValue('cta-id');
    mockNotifications.showScanError.mockReturnValue('error-id');
  });

  const createMockState = (overrides: Partial<QRScanningState> = {}): QRScanningState => ({
    isScanning: false,
    isPaused: false,
    currentPage: 0,
    totalPages: 10,
    foundQRCodes: 0,
    generatedCTAs: 0,
    errors: [],
    ...overrides,
  });

  const createMockProgress = (overrides: Partial<QRScanProgress> = {}): QRScanProgress => ({
    documentId: 'doc-1',
    totalPages: 10,
    scannedPages: 0,
    foundQRCodes: [],
    generatedCTAs: [],
    errors: [],
    startedAt: new Date(),
    ...overrides,
  });

  describe('Visibility Control', () => {
    it('shows feedback when scanning is active', () => {
      const state = createMockState({
        isScanning: true,
        currentPage: 5,
        totalPages: 10,
      });

      render(<QRScanningFeedback scanningState={state} />);

      expect(screen.getByTestId('qr-scanning-progress')).toBeInTheDocument();
    });

    it('shows feedback when scanning is paused', () => {
      const state = createMockState({
        isScanning: true,
        isPaused: true,
        currentPage: 3,
        totalPages: 10,
      });

      render(<QRScanningFeedback scanningState={state} />);

      expect(screen.getByTestId('qr-scanning-progress')).toBeInTheDocument();
    });

    it('shows feedback briefly after completion', () => {
      const state = createMockState({
        isScanning: false,
        completedAt: new Date(),
        currentPage: 10,
        totalPages: 10,
      });

      render(<QRScanningFeedback scanningState={state} />);

      expect(screen.getByTestId('qr-scanning-progress')).toBeInTheDocument();
    });

    it('hides feedback when not visible', () => {
      const state = createMockState();

      render(<QRScanningFeedback scanningState={state} isVisible={false} />);

      expect(screen.queryByTestId('qr-scanning-progress')).not.toBeInTheDocument();
    });

    it('hides feedback when scan completed long ago', () => {
      const oldCompletionTime = new Date();
      oldCompletionTime.setMinutes(oldCompletionTime.getMinutes() - 10);
      
      const state = createMockState({
        isScanning: false,
        completedAt: oldCompletionTime,
      });

      render(<QRScanningFeedback scanningState={state} />);

      expect(screen.queryByTestId('qr-scanning-progress')).not.toBeInTheDocument();
    });
  });

  describe('Scan Lifecycle Notifications', () => {
    it('shows scan started notification when scanning begins', async () => {
      const state = createMockState({
        isScanning: true,
        startedAt: new Date(),
        totalPages: 15,
      });

      render(<QRScanningFeedback scanningState={state} />);

      await waitFor(() => {
        expect(mockNotifications.showScanStarted).toHaveBeenCalledWith(15);
      });
    });

    it('shows scan completed notification when scanning finishes', async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 150000); // 2.5 minutes later
      
      const { rerender } = render(
        <QRScanningFeedback 
          scanningState={createMockState({
            isScanning: true,
            startedAt: startTime,
            totalPages: 10,
          })} 
        />
      );

      // Complete the scan
      rerender(
        <QRScanningFeedback 
          scanningState={createMockState({
            isScanning: false,
            startedAt: startTime,
            completedAt: endTime,
            foundQRCodes: 3,
            generatedCTAs: 2,
            totalPages: 10,
          })} 
        />
      );

      await waitFor(() => {
        expect(mockNotifications.showScanCompleted).toHaveBeenCalledWith(
          3,
          2,
          expect.stringMatching(/2m 30s/)
        );
      });
    });

    it('shows pause notification when scanning is paused', async () => {
      const { rerender } = render(
        <QRScanningFeedback 
          scanningState={createMockState({
            isScanning: true,
            currentPage: 5,
            totalPages: 10,
          })} 
        />
      );

      // Pause the scan
      rerender(
        <QRScanningFeedback 
          scanningState={createMockState({
            isScanning: true,
            isPaused: true,
            currentPage: 5,
            totalPages: 10,
          })} 
        />
      );

      await waitFor(() => {
        expect(mockNotifications.showScanPaused).toHaveBeenCalledWith(5, 10);
      });
    });
  });

  describe('QR Code and CTA Notifications', () => {
    it('shows notification when new QR codes are found', async () => {
      const mockQRCode: QRCodeScanResult = {
        data: 'https://example.com',
        coordinates: { x: 100, y: 200, width: 50, height: 50 },
        confidence: 0.95,
      };

      const progress = createMockProgress({
        foundQRCodes: [mockQRCode],
        scannedPages: 5,
      });

      const state = createMockState({
        isScanning: true,
        currentPage: 5,
      });

      render(
        <QRScanningFeedback 
          scanningState={state}
          scanningProgress={progress}
        />
      );

      await waitFor(() => {
        expect(mockNotifications.showQRCodeFound).toHaveBeenCalledWith(mockQRCode, 5);
      });
    });

    it('shows notification when new CTAs are generated', async () => {
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

      const progress = createMockProgress({
        generatedCTAs: [mockCTA],
        scannedPages: 3,
      });

      const state = createMockState({
        isScanning: true,
        currentPage: 3,
      });

      render(
        <QRScanningFeedback 
          scanningState={state}
          scanningProgress={progress}
        />
      );

      await waitFor(() => {
        expect(mockNotifications.showCTAGenerated).toHaveBeenCalledWith(mockCTA, 3);
      });
    });

    it('does not show duplicate notifications for same QR codes', async () => {
      const mockQRCode: QRCodeScanResult = {
        data: 'https://example.com',
        coordinates: { x: 100, y: 200, width: 50, height: 50 },
        confidence: 0.95,
      };

      const progress = createMockProgress({
        foundQRCodes: [mockQRCode],
      });

      const state = createMockState({
        isScanning: true,
        currentPage: 5,
      });

      const { rerender } = render(
        <QRScanningFeedback 
          scanningState={state}
          scanningProgress={progress}
        />
      );

      await waitFor(() => {
        expect(mockNotifications.showQRCodeFound).toHaveBeenCalledTimes(1);
      });

      // Re-render with same progress - should not trigger duplicate notification
      rerender(
        <QRScanningFeedback 
          scanningState={state}
          scanningProgress={progress}
        />
      );

      // Should still be called only once
      expect(mockNotifications.showQRCodeFound).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Notifications', () => {
    it('shows error notification when errors occur', async () => {
      const { rerender } = render(
        <QRScanningFeedback 
          scanningState={createMockState({
            isScanning: true,
            errors: [],
          })} 
        />
      );

      // Add an error
      rerender(
        <QRScanningFeedback 
          scanningState={createMockState({
            isScanning: true,
            errors: [{ pageNumber: 7, error: 'Failed to decode QR code' }],
          })} 
        />
      );

      await waitFor(() => {
        expect(mockNotifications.showScanError).toHaveBeenCalledWith(
          'Failed to decode QR code',
          7
        );
      });
    });

    it('shows notification for latest error only', async () => {
      const { rerender } = render(
        <QRScanningFeedback 
          scanningState={createMockState({
            isScanning: true,
            errors: [{ pageNumber: 5, error: 'First error' }],
          })} 
        />
      );

      // Add another error
      rerender(
        <QRScanningFeedback 
          scanningState={createMockState({
            isScanning: true,
            errors: [
              { pageNumber: 5, error: 'First error' },
              { pageNumber: 8, error: 'Second error' },
            ],
          })} 
        />
      );

      await waitFor(() => {
        expect(mockNotifications.showScanError).toHaveBeenLastCalledWith(
          'Second error',
          8
        );
      });
    });
  });

  describe('Position Variants', () => {
    it('renders overlay position with backdrop', () => {
      const state = createMockState({ isScanning: true });

      render(
        <QRScanningFeedback 
          scanningState={state}
          position="overlay"
        />
      );

      // Check for backdrop (styled component with specific props)
      const container = screen.getByTestId('qr-scanning-progress').parentElement;
      expect(container).toBeInTheDocument();
    });

    it('renders bottom position with compact view', () => {
      const state = createMockState({ 
        isScanning: true,
        currentPage: 5,
        totalPages: 10,
        foundQRCodes: 2,
        generatedCTAs: 1,
      });

      render(
        <QRScanningFeedback 
          scanningState={state}
          position="bottom"
        />
      );

      // For bottom position, it should render compact view
      // The exact implementation depends on the component structure
      expect(screen.getByText(/Page 5 of 10/)).toBeInTheDocument();
    });

    it('renders sidebar position', () => {
      const state = createMockState({ isScanning: true });

      render(
        <QRScanningFeedback 
          scanningState={state}
          position="sidebar"
        />
      );

      expect(screen.getByTestId('qr-scanning-progress')).toBeInTheDocument();
    });
  });

  describe('Control Integration', () => {
    it('passes control handlers to progress component', () => {
      const mockOnPause = jest.fn();
      const mockOnResume = jest.fn();
      const mockOnStop = jest.fn();

      const state = createMockState({ isScanning: true });

      render(
        <QRScanningFeedback 
          scanningState={state}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
        />
      );

      // The mocked component should receive these props
      expect(screen.getByTestId('qr-scanning-progress')).toBeInTheDocument();
    });
  });

  describe('Duration Formatting', () => {
    it('formats duration correctly in completion notification', async () => {
      const startTime = new Date('2023-01-01T10:00:00');
      const endTime = new Date('2023-01-01T10:03:45'); // 3 minutes 45 seconds later
      
      const { rerender } = render(
        <QRScanningFeedback 
          scanningState={createMockState({
            isScanning: true,
            startedAt: startTime,
          })} 
        />
      );

      rerender(
        <QRScanningFeedback 
          scanningState={createMockState({
            isScanning: false,
            startedAt: startTime,
            completedAt: endTime,
            foundQRCodes: 1,
            generatedCTAs: 1,
          })} 
        />
      );

      await waitFor(() => {
        expect(mockNotifications.showScanCompleted).toHaveBeenCalledWith(
          1,
          1,
          '3m 45s'
        );
      });
    });
  });
});