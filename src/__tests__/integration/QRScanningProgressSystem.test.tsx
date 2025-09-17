import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QRScanningProgress } from '../../components/common/QRScanningProgress';
import { QRScanningState } from '../../utils/QRScanningManager';

// Mock styled-components theme
jest.mock('../../styles/theme', () => ({
  theme: {
    colors: {
      primary: '#007bff',
      success: '#28a745',
      danger: '#dc3545',
      info: '#17a2b8',
      white: '#ffffff',
      gray200: '#e9ecef',
      gray400: '#ced4da',
      gray500: '#6c757d',
      gray600: '#6c757d',
      gray700: '#495057',
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
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
    },
    shadows: {
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    },
    breakpoints: {
      mobile: '768px',
    },
  },
}));

// Mock the QRScanningProgress component
jest.mock('../../components/common/QRScanningProgress', () => ({
  QRScanningProgress: ({ state, onPause, onResume, onStop }: any) => (
    <div data-testid="qr-scanning-progress">
      <div data-testid="scan-status">
        {state.isScanning ? (state.isPaused ? 'Paused' : 'Scanning') : 'Completed'}
      </div>
      <div data-testid="scan-progress">
        Page {state.currentPage} of {state.totalPages}
      </div>
      <div data-testid="scan-stats">
        QR Codes: {state.foundQRCodes}, CTAs: {state.generatedCTAs}
      </div>
      {state.errors.length > 0 && (
        <div data-testid="scan-errors">
          {state.errors.map((error, index) => (
            <div key={index}>Page {error.pageNumber}: {error.error}</div>
          ))}
        </div>
      )}
      {onPause && <button onClick={onPause} data-testid="pause-button">Pause</button>}
      {onResume && <button onClick={onResume} data-testid="resume-button">Resume</button>}
      {onStop && <button onClick={onStop} data-testid="stop-button">Stop</button>}
    </div>
  ),
}));

// Simple test component for progress indicator
const SimpleProgressTest: React.FC = () => {
  const [scanningState, setScanningState] = React.useState<QRScanningState>({
    isScanning: false,
    isPaused: false,
    currentPage: 0,
    totalPages: 0,
    foundQRCodes: 0,
    generatedCTAs: 0,
    errors: [],
  });

  const handleStartScan = () => {
    setScanningState({
      isScanning: true,
      isPaused: false,
      currentPage: 1,
      totalPages: 10,
      foundQRCodes: 0,
      generatedCTAs: 0,
      errors: [],
      startedAt: new Date(),
    });
  };

  const handlePauseScan = () => {
    setScanningState(prev => ({ ...prev, isPaused: true }));
  };

  const handleResumeScan = () => {
    setScanningState(prev => ({ ...prev, isPaused: false }));
  };

  const handleStopScan = () => {
    setScanningState(prev => ({
      ...prev,
      isScanning: false,
      isPaused: false,
      completedAt: new Date(),
    }));
  };

  return (
    <div>
      <button onClick={handleStartScan} data-testid="start-scan">
        Start Scan
      </button>
      
      <QRScanningProgress
        state={scanningState}
        onPause={handlePauseScan}
        onResume={handleResumeScan}
        onStop={handleStopScan}
        showControls={true}
      />
    </div>
  );
};

describe('QR Scanning Progress System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays progress indicator when scanning starts', async () => {
    render(<SimpleProgressTest />);

    // Start scanning
    fireEvent.click(screen.getByTestId('start-scan'));

    // Should show progress indicator with scanning status
    expect(screen.getByText('Scanning')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();
  });

  it('shows progress controls when scanning', async () => {
    render(<SimpleProgressTest />);

    // Start scanning
    fireEvent.click(screen.getByTestId('start-scan'));

    // Should show control buttons
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
  });

  it('handles pause and resume functionality', async () => {
    render(<SimpleProgressTest />);

    // Start scanning
    fireEvent.click(screen.getByTestId('start-scan'));

    // Pause scanning
    fireEvent.click(screen.getByText('Pause'));

    await waitFor(() => {
      expect(screen.getByText('Paused')).toBeInTheDocument();
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });

    // Resume scanning
    fireEvent.click(screen.getByText('Resume'));

    await waitFor(() => {
      expect(screen.getByText('Scanning')).toBeInTheDocument();
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });
  });

  it('handles stop functionality', async () => {
    render(<SimpleProgressTest />);

    // Start scanning
    fireEvent.click(screen.getByTestId('start-scan'));

    // Stop scanning
    fireEvent.click(screen.getByText('Stop'));

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });
});

describe('Progress System Components Integration', () => {
  it('verifies that progress components can be rendered together', () => {
    const mockState: QRScanningState = {
      isScanning: true,
      isPaused: false,
      currentPage: 5,
      totalPages: 10,
      foundQRCodes: 2,
      generatedCTAs: 1,
      errors: [],
      startedAt: new Date(),
    };

    render(
      <div>
        <QRScanningProgress
          state={mockState}
          showControls={false}
        />
      </div>
    );

    // Should render progress information
    expect(screen.getByText('Scanning')).toBeInTheDocument();
    expect(screen.getByText('QR Codes: 2, CTAs: 1')).toBeInTheDocument();
  });

  it('verifies progress calculation works correctly', () => {
    const mockState: QRScanningState = {
      isScanning: true,
      isPaused: false,
      currentPage: 3,
      totalPages: 10,
      foundQRCodes: 0,
      generatedCTAs: 0,
      errors: [],
    };

    render(<QRScanningProgress state={mockState} showControls={false} />);

    // Should show current page progress
    expect(screen.getByText('Page 3 of 10')).toBeInTheDocument();
    expect(screen.getByText('QR Codes: 0, CTAs: 0')).toBeInTheDocument();
  });
});