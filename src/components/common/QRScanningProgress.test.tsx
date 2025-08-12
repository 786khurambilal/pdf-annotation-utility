import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QRScanningProgress } from './QRScanningProgress';
import { QRScanningState } from '../../utils/QRScanningManager';

// Mock styled-components theme
jest.mock('../../styles/theme', () => ({
  theme: {
    colors: {
      primary: '#007bff',
      success: '#28a745',
      danger: '#dc3545',
      gray50: '#f8f9fa',
      gray200: '#e9ecef',
      gray600: '#6c757d',
      gray700: '#495057',
      gray800: '#343a40',
      white: '#ffffff',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '3rem',
    },
    fontSizes: {
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
    },
    shadows: {
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
  },
}));

describe('QRScanningProgress', () => {
  const mockOnPause = jest.fn();
  const mockOnResume = jest.fn();
  const mockOnStop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('Status Display', () => {
    it('shows scanning status when actively scanning', () => {
      const state = createMockState({
        isScanning: true,
        currentPage: 5,
        totalPages: 10,
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText('Scanning')).toBeInTheDocument();
      expect(screen.getByText('Scanning page 5 of 10...')).toBeInTheDocument();
    });

    it('shows paused status when scanning is paused', () => {
      const state = createMockState({
        isScanning: true,
        isPaused: true,
        currentPage: 3,
        totalPages: 10,
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText('Paused')).toBeInTheDocument();
      expect(screen.getByText('Scanning paused at page 3 of 10')).toBeInTheDocument();
    });

    it('shows completed status when scan is finished', () => {
      const state = createMockState({
        isScanning: false,
        currentPage: 10,
        totalPages: 10,
        foundQRCodes: 3,
        generatedCTAs: 2,
        completedAt: new Date(),
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Scan completed - 3 QR codes found, 2 CTAs created')).toBeInTheDocument();
    });

    it('shows error status when there are errors and scanning is stopped', () => {
      const state = createMockState({
        isScanning: false,
        errors: [{ pageNumber: 5, error: 'Failed to scan page' }],
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('Progress Calculation', () => {
    it('calculates progress percentage correctly', () => {
      const state = createMockState({
        currentPage: 5,
        totalPages: 10,
      });

      render(<QRScanningProgress state={state} />);

      // Progress should be 50%
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('handles zero total pages', () => {
      const state = createMockState({
        currentPage: 0,
        totalPages: 0,
      });

      render(<QRScanningProgress state={state} />);

      // Progress should be 0%
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles progress at 100%', () => {
      const state = createMockState({
        currentPage: 10,
        totalPages: 10,
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('displays all statistics correctly', () => {
      const state = createMockState({
        currentPage: 7,
        totalPages: 15,
        foundQRCodes: 4,
        generatedCTAs: 3,
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText('7')).toBeInTheDocument(); // Current page
      expect(screen.getByText('15')).toBeInTheDocument(); // Total pages
      expect(screen.getByText('4')).toBeInTheDocument(); // QR codes found
      expect(screen.getByText('3')).toBeInTheDocument(); // CTAs created
    });

    it('displays correct labels for statistics', () => {
      const state = createMockState();

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText('Current Page')).toBeInTheDocument();
      expect(screen.getByText('Total Pages')).toBeInTheDocument();
      expect(screen.getByText('QR Codes Found')).toBeInTheDocument();
      expect(screen.getByText('CTAs Created')).toBeInTheDocument();
    });
  });

  describe('Control Buttons', () => {
    it('shows pause button when scanning and not paused', () => {
      const state = createMockState({
        isScanning: true,
        isPaused: false,
      });

      render(
        <QRScanningProgress
          state={state}
          onPause={mockOnPause}
          showControls={true}
        />
      );

      const pauseButton = screen.getByText('Pause');
      expect(pauseButton).toBeInTheDocument();
      
      fireEvent.click(pauseButton);
      expect(mockOnPause).toHaveBeenCalledTimes(1);
    });

    it('shows resume button when paused', () => {
      const state = createMockState({
        isScanning: true,
        isPaused: true,
      });

      render(
        <QRScanningProgress
          state={state}
          onResume={mockOnResume}
          showControls={true}
        />
      );

      const resumeButton = screen.getByText('Resume');
      expect(resumeButton).toBeInTheDocument();
      
      fireEvent.click(resumeButton);
      expect(mockOnResume).toHaveBeenCalledTimes(1);
    });

    it('shows stop button when scanning', () => {
      const state = createMockState({
        isScanning: true,
      });

      render(
        <QRScanningProgress
          state={state}
          onStop={mockOnStop}
          showControls={true}
        />
      );

      const stopButton = screen.getByText('Stop');
      expect(stopButton).toBeInTheDocument();
      
      fireEvent.click(stopButton);
      expect(mockOnStop).toHaveBeenCalledTimes(1);
    });

    it('hides controls when showControls is false', () => {
      const state = createMockState({
        isScanning: true,
      });

      render(
        <QRScanningProgress
          state={state}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          showControls={false}
        />
      );

      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
      expect(screen.queryByText('Resume')).not.toBeInTheDocument();
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });

    it('disables buttons when handlers are not provided', () => {
      const state = createMockState({
        isScanning: true,
        isPaused: false,
      });

      render(
        <QRScanningProgress
          state={state}
          showControls={true}
        />
      );

      const pauseButton = screen.getByText('Pause');
      expect(pauseButton).toBeDisabled();
    });
  });

  describe('Error Display', () => {
    it('displays errors when present', () => {
      const state = createMockState({
        errors: [
          { pageNumber: 3, error: 'Failed to decode QR code' },
          { pageNumber: 7, error: 'Page rendering failed' },
        ],
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText('Page 3: Failed to decode QR code')).toBeInTheDocument();
      expect(screen.getByText('Page 7: Page rendering failed')).toBeInTheDocument();
    });

    it('does not show error section when no errors', () => {
      const state = createMockState({
        errors: [],
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.queryByText(/Page \d+:/)).not.toBeInTheDocument();
    });
  });

  describe('Time Information', () => {
    it('displays start time when available', () => {
      const startTime = new Date('2023-01-01T10:00:00');
      const state = createMockState({
        startedAt: startTime,
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText(/Started: 10:00:00/)).toBeInTheDocument();
    });

    it('displays completion time when available', () => {
      const startTime = new Date('2023-01-01T10:00:00');
      const endTime = new Date('2023-01-01T10:02:30');
      const state = createMockState({
        startedAt: startTime,
        completedAt: endTime,
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText(/Completed: 10:02:30/)).toBeInTheDocument();
    });

    it('calculates duration correctly', () => {
      const startTime = new Date('2023-01-01T10:00:00');
      const endTime = new Date('2023-01-01T10:02:30');
      const state = createMockState({
        startedAt: startTime,
        completedAt: endTime,
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText(/Duration: 2m 30s/)).toBeInTheDocument();
    });

    it('shows placeholder when times are not available', () => {
      const state = createMockState();

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText(/Started: --/)).toBeInTheDocument();
      expect(screen.getByText(/Completed: --/)).toBeInTheDocument();
    });
  });

  describe('Duration Formatting', () => {
    it('formats seconds correctly', () => {
      const startTime = new Date('2023-01-01T10:00:00');
      const endTime = new Date('2023-01-01T10:00:45');
      const state = createMockState({
        startedAt: startTime,
        completedAt: endTime,
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText(/Duration: 45s/)).toBeInTheDocument();
    });

    it('formats minutes and seconds correctly', () => {
      const startTime = new Date('2023-01-01T10:00:00');
      const endTime = new Date('2023-01-01T10:03:15');
      const state = createMockState({
        startedAt: startTime,
        completedAt: endTime,
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText(/Duration: 3m 15s/)).toBeInTheDocument();
    });

    it('formats hours, minutes correctly', () => {
      const startTime = new Date('2023-01-01T10:00:00');
      const endTime = new Date('2023-01-01T11:30:00');
      const state = createMockState({
        startedAt: startTime,
        completedAt: endTime,
      });

      render(<QRScanningProgress state={state} />);

      expect(screen.getByText(/Duration: 1h 30m/)).toBeInTheDocument();
    });
  });
});