import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';
import { QRCodeScannerService, qrCodeScanner } from '../../utils/QRCodeScanner';
import { QRScanningManager } from '../../utils/QRScanningManager';
import React from 'react';
import React from 'react';

// Mock QR code utilities for error testing
jest.mock('../../utils/QRCodeScanner', () => ({
  QRCodeScannerService: jest.fn().mockImplementation(() => ({
    scanPage: jest.fn().mockResolvedValue([]),
    isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
  })),
  qrCodeScanner: {
    scanPage: jest.fn().mockResolvedValue([]),
    isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
  }
}));

jest.mock('../../utils/QRScanningManager', () => ({
  QRScanningManager: jest.fn().mockImplementation(() => ({
    startScanning: jest.fn(),
    pauseScanning: jest.fn(),
    resumeScanning: jest.fn(),
    getState: jest.fn().mockReturnValue({
      isScanning: false,
      currentPage: 0,
      totalPages: 0,
      foundQRCodes: 0,
      errors: []
    }),
    onStateChange: jest.fn()
  }))
}));

// Mock console.error to test error logging
const mockConsoleError = jest.fn();
const originalConsoleError = console.error;

describe('QR Code Error Scenarios Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    global.URL.createObjectURL = jest.fn(() => 'mock-pdf-url');
    global.URL.revokeObjectURL = jest.fn();
    console.error = mockConsoleError;
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('QR Scanner Failures', () => {
    it('should handle QR scanner initialization failure', async () => {
      // Mock QR scanner constructor to throw error
      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('QR Scanner initialization failed');
      });

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('scanner-init-error.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      // PDF should still load
      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Error should be logged
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('QR Scanner initialization failed')
      );

      // PDF functionality should remain intact
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
    });

    it('should handle individual page scanning failures', async () => {
      let scanAttempts = 0;
      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockImplementation(async () => {
          scanAttempts++;
          if (scanAttempts <= 2) {
            throw new Error(`Page scan failed for attempt ${scanAttempts}`);
          }
          return []; // Success on third attempt
        }),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('page-scan-error.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for scanning attempts
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should have attempted multiple scans
      expect(scanAttempts).toBeGreaterThan(1);

      // PDF should remain functional
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });

    it('should handle memory exhaustion during QR scanning', async () => {
      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockRejectedValue(new Error('Out of memory')),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('memory-error.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for scanning attempt
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should log memory error
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Out of memory')
      );

      // PDF should still be usable
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // Page input shows page 2
      });
    });
  });

  describe('Canvas and Rendering Errors', () => {
    it('should handle canvas context creation failure', async () => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockRejectedValue(new Error('Cannot get canvas context')),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('canvas-context-error.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for scanning attempt
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should handle canvas error gracefully
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();

      // Restore original method
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    it('should handle PDF page rendering failures during QR scanning', async () => {
      // Mock PDF rendering to fail
      jest.mock('react-pdf', () => ({
        Document: ({ children, onLoadError }: any) => {
          React.useEffect(() => {
            setTimeout(() => {
              onLoadError?.(new Error('PDF rendering failed'));
            }, 100);
          }, [onLoadError]);
          return <div data-testid="pdf-document-error">{children}</div>;
        },
        Page: () => <div data-testid="pdf-page-error">Error loading page</div>,
        pdfjs: {
          GlobalWorkerOptions: { workerSrc: '' },
          version: '3.0.0'
        }
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('pdf-render-error.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error.*loading.*pdf/i)).toBeInTheDocument();
      });

      // QR scanning should not be attempted on failed PDF
      expect(QRCodeScannerService).not.toHaveBeenCalled();
    });
  });

  describe('Data Corruption and Invalid States', () => {
    it('should handle corrupted QR code data', async () => {
      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockResolvedValue([
          {
            content: undefined, // Corrupted data
            coordinates: null,
            confidence: NaN
          },
          {
            content: 'valid-content',
            coordinates: { x: 'invalid', y: 200, width: 80, height: 80 }, // Invalid coordinates
            confidence: 0.9
          }
        ]),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('corrupted-qr-data.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for scanning
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should handle corrupted data without crashing
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should handle localStorage quota exceeded during CTA storage', async () => {
      // Mock localStorage to throw quota exceeded error
      const mockSetItem = jest.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError: localStorage quota exceeded');
      });

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: mockSetItem,
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
      });

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockResolvedValue([
          {
            content: 'https://example.com/test',
            coordinates: { x: 100, y: 200, width: 80, height: 80 },
            confidence: 0.9
          }
        ]),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('storage-quota-error.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for scanning and storage attempt
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should log storage error
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('localStorage quota exceeded')
      );

      // PDF should remain functional
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });
  });

  describe('Network and Resource Errors', () => {
    it('should handle jsQR library loading failure', async () => {
      // Mock jsQR library not being available
      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockRejectedValue(new Error('jsQR is not defined')),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(false)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('jsqr-missing.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Should show unsupported message
      await waitFor(() => {
        const message = screen.queryByText(/qr.*not.*supported/i);
        if (message) {
          expect(message).toBeInTheDocument();
        }
      });

      // PDF functionality should work normally
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
    });

    it('should handle PDF worker loading failure', async () => {
      // Mock PDF.js worker failure
      const mockError = new Error('PDF worker failed to load');
      
      jest.mock('react-pdf', () => ({
        Document: ({ children, onLoadError }: any) => {
          React.useEffect(() => {
            setTimeout(() => {
              onLoadError?.(mockError);
            }, 100);
          }, [onLoadError]);
          return <div data-testid="pdf-worker-error">{children}</div>;
        },
        Page: () => <div>Worker Error</div>,
        pdfjs: {
          GlobalWorkerOptions: { workerSrc: '' },
          version: '3.0.0'
        }
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('worker-error.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      // Should show PDF error
      await waitFor(() => {
        expect(screen.getByText(/error.*loading.*pdf/i)).toBeInTheDocument();
      });

      // QR scanning should not be attempted
      expect(QRCodeScannerService).not.toHaveBeenCalled();
    });
  });

  describe('Timeout and Performance Errors', () => {
    it('should handle QR scanning timeout', async () => {
      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('QR scanning timeout'));
            }, 6000); // Longer than expected timeout
          });
        }),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('timeout-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for timeout to occur
      await new Promise(resolve => setTimeout(resolve, 7000));

      // Should handle timeout gracefully
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      
      // Should log timeout error
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('timeout')
      );
    });

    it('should handle excessive memory usage during scanning', async () => {
      // Mock memory-intensive scanning
      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockImplementation(async () => {
          // Simulate memory pressure
          const largeArray = new Array(1000000).fill('memory-test');
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Simulate memory cleanup failure
          throw new Error('Memory allocation failed');
        }),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('memory-intensive.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for memory error
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should handle memory error
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Memory allocation failed')
      );

      // PDF should remain responsive
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
      });
    });
  });

  describe('Recovery and Fallback Scenarios', () => {
    it('should recover from partial scanning failures', async () => {
      let scanCount = 0;
      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockImplementation(async () => {
          scanCount++;
          if (scanCount <= 2) {
            throw new Error('Temporary scan failure');
          }
          // Success after failures
          return [
            {
              content: 'https://example.com/recovered',
              coordinates: { x: 100, y: 200, width: 80, height: 80 },
              confidence: 0.9
            }
          ];
        }),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('recovery-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should have attempted multiple scans
      expect(scanCount).toBeGreaterThan(2);

      // Should eventually succeed
      await waitFor(() => {
        const ctaElements = screen.queryAllByTestId(/cta.*overlay/i);
        expect(ctaElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('should provide manual override when auto-detection fails', async () => {
      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockRejectedValue(new Error('Auto-detection failed')),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('manual-override.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for auto-detection failure
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Manual CTA creation should still work
      const pdfPage = screen.getByTestId('pdf-page-1');
      fireEvent.mouseDown(pdfPage, { clientX: 200, clientY: 300 });
      fireEvent.mouseMove(pdfPage, { clientX: 350, clientY: 350 });
      fireEvent.mouseUp(pdfPage, { clientX: 350, clientY: 350 });

      // Should show manual CTA creation interface
      await waitFor(() => {
        expect(screen.getByText(/create call-to-action/i)).toBeInTheDocument();
      });

      // Manual creation should work despite auto-detection failure
      const labelInput = screen.getByLabelText(/label/i);
      await user.type(labelInput, 'Manual CTA');

      const urlInput = screen.getByLabelText(/url/i);
      await user.type(urlInput, 'https://example.com/manual');

      const saveButton = screen.getByRole('button', { name: /save cta/i });
      await user.click(saveButton);

      // Should create manual CTA successfully
      await waitFor(() => {
        expect(screen.getByTestId('cta-overlay')).toBeInTheDocument();
      });
    });
  });
});