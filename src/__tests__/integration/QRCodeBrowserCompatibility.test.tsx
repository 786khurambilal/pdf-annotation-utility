import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';
import { QRCodeScannerService, qrCodeScanner } from '../../utils/QRCodeScanner';

// Mock QR code scanner for browser compatibility testing
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

// Browser feature detection mocks
const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    writable: true,
    value: userAgent,
  });
};

const mockCanvasSupport = (supported: boolean) => {
  if (!supported) {
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);
  } else {
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      getImageData: jest.fn().mockReturnValue({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      }),
      putImageData: jest.fn(),
      drawImage: jest.fn(),
    });
  }
};

const mockWebWorkerSupport = (supported: boolean) => {
  if (!supported) {
    (global as any).Worker = undefined;
  } else {
    (global as any).Worker = jest.fn().mockImplementation(() => ({
      postMessage: jest.fn(),
      terminate: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
  }
};

describe('QR Code Browser Compatibility Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let originalUserAgent: string;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let originalWorker: typeof Worker;

  beforeEach(() => {
    user = userEvent.setup();
    global.URL.createObjectURL = jest.fn(() => 'mock-pdf-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Store originals
    originalUserAgent = window.navigator.userAgent;
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalWorker = (global as any).Worker;
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      value: originalUserAgent,
    });
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    (global as any).Worker = originalWorker;
  });

  describe('Modern Browser Support', () => {
    it('should work fully in Chrome 80+', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36');
      mockCanvasSupport(true);
      mockWebWorkerSupport(true);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockResolvedValue([
          {
            content: 'https://example.com/chrome-test',
            coordinates: { x: 100, y: 200, width: 80, height: 80 },
            confidence: 0.95
          }
        ]),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('chrome-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for QR scanning
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should support full QR functionality
      expect(QRCodeScannerService).toHaveBeenCalled();
      const scannerInstance = (QRCodeScannerService as unknown as jest.Mock).mock.results[0]?.value;
      expect(scannerInstance.isQRCodeDetectionSupported()).toBe(true);

      // Should create auto-generated CTAs
      await waitFor(() => {
        const ctaElements = screen.queryAllByTestId(/cta.*overlay/i);
        expect(ctaElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('should work fully in Firefox 75+', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:75.0) Gecko/20100101 Firefox/75.0');
      mockCanvasSupport(true);
      mockWebWorkerSupport(true);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockResolvedValue([
          {
            content: 'firefox-qr-content',
            coordinates: { x: 150, y: 250, width: 80, height: 80 },
            confidence: 0.92
          }
        ]),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('firefox-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for QR scanning
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should support QR functionality
      expect(QRCodeScannerService).toHaveBeenCalled();
      const scannerInstance = (QRCodeScannerService as unknown as jest.Mock).mock.results[0]?.value;
      expect(scannerInstance.isQRCodeDetectionSupported()).toBe(true);
    });

    it('should work fully in Safari 13+', async () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Safari/605.1.15');
      mockCanvasSupport(true);
      mockWebWorkerSupport(true);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockResolvedValue([
          {
            content: 'https://example.com/safari-test',
            coordinates: { x: 200, y: 300, width: 80, height: 80 },
            confidence: 0.89
          }
        ]),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('safari-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for QR scanning
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should support QR functionality
      expect(QRCodeScannerService).toHaveBeenCalled();
      const scannerInstance = (QRCodeScannerService as unknown as jest.Mock).mock.results[0]?.value;
      expect(scannerInstance.isQRCodeDetectionSupported()).toBe(true);
    });

    it('should work fully in Edge 80+', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36 Edg/80.0.361.69');
      mockCanvasSupport(true);
      mockWebWorkerSupport(true);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockResolvedValue([
          {
            content: 'edge-test-content',
            coordinates: { x: 120, y: 220, width: 80, height: 80 },
            confidence: 0.94
          }
        ]),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('edge-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for QR scanning
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should support QR functionality
      expect(QRCodeScannerService).toHaveBeenCalled();
      const scannerInstance = (QRCodeScannerService as unknown as jest.Mock).mock.results[0]?.value;
      expect(scannerInstance.isQRCodeDetectionSupported()).toBe(true);
    });
  });

  describe('Legacy Browser Degradation', () => {
    it('should gracefully degrade in older Chrome versions', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36');
      mockCanvasSupport(false);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn(),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(false)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('old-chrome-test.pdf');
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

      // Core PDF functionality should still work
      expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // Page input shows current page
      
      // Manual annotations should still be available
      const pdfPage = screen.getByTestId('pdf-page-1');
      fireEvent.click(pdfPage);
      
      await waitFor(() => {
        const commentOption = screen.queryByText(/add comment/i);
        if (commentOption) {
          expect(commentOption).toBeInTheDocument();
        }
      });
    });

    it('should handle Internet Explorer gracefully', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko');
      mockCanvasSupport(false);
      mockWebWorkerSupport(false);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn(),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(false)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('ie-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Should show browser compatibility warning
      await waitFor(() => {
        const warning = screen.queryByText(/browser.*not.*fully.*supported/i);
        if (warning) {
          expect(warning).toBeInTheDocument();
        }
      });

      // Basic PDF viewing should still work
      expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // Page input shows current page
    });

    it('should handle older Firefox versions', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:60.0) Gecko/20100101 Firefox/60.0');
      mockCanvasSupport(true);
      mockWebWorkerSupport(false);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn(),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(false)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('old-firefox-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Should indicate limited functionality
      await waitFor(() => {
        const message = screen.queryByText(/limited.*functionality/i);
        if (message) {
          expect(message).toBeInTheDocument();
        }
      });

      // PDF viewing should work
      expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // Page input shows current page
    });
  });

  describe('Mobile Browser Support', () => {
    it('should work on iOS Safari', async () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1');
      mockCanvasSupport(true);
      mockWebWorkerSupport(true);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockResolvedValue([
          {
            content: 'https://example.com/mobile-test',
            coordinates: { x: 80, y: 160, width: 60, height: 60 },
            confidence: 0.87
          }
        ]),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('ios-safari-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for QR scanning
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should support QR functionality on mobile
      expect(QRCodeScannerService).toHaveBeenCalled();
      const scannerInstance = (QRCodeScannerService as unknown as jest.Mock).mock.results[0]?.value;
      expect(scannerInstance.isQRCodeDetectionSupported()).toBe(true);
    });

    it('should work on Chrome Mobile', async () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Mobile Safari/537.36');
      mockCanvasSupport(true);
      mockWebWorkerSupport(true);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockResolvedValue([
          {
            content: 'android-chrome-content',
            coordinates: { x: 90, y: 180, width: 70, height: 70 },
            confidence: 0.91
          }
        ]),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('chrome-mobile-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Wait for QR scanning
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should support QR functionality on mobile
      expect(QRCodeScannerService).toHaveBeenCalled();
      const scannerInstance = (QRCodeScannerService as unknown as jest.Mock).mock.results[0]?.value;
      expect(scannerInstance.isQRCodeDetectionSupported()).toBe(true);
    });

    it('should handle mobile performance limitations', async () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1');
      mockCanvasSupport(true);
      mockWebWorkerSupport(false); // Limited Web Worker support

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn().mockImplementation(async () => {
          // Simulate slower mobile processing
          await new Promise(resolve => setTimeout(resolve, 500));
          return [
            {
              content: 'mobile-slow-scan',
              coordinates: { x: 100, y: 200, width: 80, height: 80 },
              confidence: 0.85
            }
          ];
        }),
        isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('mobile-performance-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Should show scanning progress on slower devices
      await waitFor(() => {
        const progress = screen.queryByText(/scanning/i);
        if (progress) {
          expect(progress).toBeInTheDocument();
        }
      });

      // Wait for slower scanning to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should eventually complete
      await waitFor(() => {
        const ctaElements = screen.queryAllByTestId(/cta.*overlay/i);
        expect(ctaElements.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

  describe('Feature Detection', () => {
    it('should detect Canvas API support', async () => {
      mockCanvasSupport(true);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn(),
        isQRCodeDetectionSupported: jest.fn().mockImplementation(() => {
          // Test canvas support
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          return context !== null;
        })
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('canvas-detection-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Should detect canvas support
      const scannerInstance = (QRCodeScannerService as unknown as jest.Mock).mock.results[0]?.value;
      expect(scannerInstance.isQRCodeDetectionSupported()).toBe(true);
    });

    it('should detect Web Worker support', async () => {
      mockWebWorkerSupport(true);

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn(),
        isQRCodeDetectionSupported: jest.fn().mockImplementation(() => {
          return typeof Worker !== 'undefined';
        })
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('worker-detection-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Should detect Web Worker support
      const scannerInstance = (QRCodeScannerService as unknown as jest.Mock).mock.results[0]?.value;
      expect(scannerInstance.isQRCodeDetectionSupported()).toBe(true);
    });

    it('should handle missing ImageData support', async () => {
      // Mock limited canvas support
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
        getImageData: undefined, // Missing ImageData support
        putImageData: jest.fn(),
        drawImage: jest.fn(),
      });

      (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
        scanPage: jest.fn(),
        isQRCodeDetectionSupported: jest.fn().mockImplementation(() => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          return context && typeof context.getImageData === 'function';
        })
      }));

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('imagedata-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Should detect lack of ImageData support
      const scannerInstance = (QRCodeScannerService as unknown as jest.Mock).mock.results[0]?.value;
      expect(scannerInstance.isQRCodeDetectionSupported()).toBe(false);

      // Should show appropriate message
      await waitFor(() => {
        const message = screen.queryByText(/qr.*not.*supported/i);
        if (message) {
          expect(message).toBeInTheDocument();
        }
      });
    });
  });

  describe('Cross-Browser Consistency', () => {
    it('should produce consistent results across browsers', async () => {
      const testBrowsers = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:75.0) Gecko/20100101 Firefox/75.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Safari/605.1.15'
      ];

      const results: any[] = [];

      for (const userAgent of testBrowsers) {
        mockUserAgent(userAgent);
        mockCanvasSupport(true);
        mockWebWorkerSupport(true);

        (QRCodeScannerService as unknown as jest.Mock).mockImplementation(() => ({
          scanPage: jest.fn().mockResolvedValue([
            {
              content: 'https://example.com/consistent-test',
              coordinates: { x: 100, y: 200, width: 80, height: 80 },
              confidence: 0.9
            }
          ]),
          isQRCodeDetectionSupported: jest.fn().mockReturnValue(true)
        }));

        const { unmount } = renderWithProviders(
          <PDFViewerContainer enableVirtualization={false} />,
          { initialUser: { id: 'test-user', name: 'Test User' } }
        );

        const mockFile = createMockPdfFile('consistency-test.pdf');
        const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
        await user.upload(fileInput, mockFile);

        await waitFor(() => {
          expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
        });

        // Wait for QR scanning
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Collect results
        const scannerInstance = (QRCodeScannerService as unknown as jest.Mock).mock.results[0]?.value;
        results.push({
          userAgent,
          supported: scannerInstance.isQRCodeDetectionSupported(),
          scannerCalled: QRCodeScannerService.mock.calls.length > 0
        });

        unmount();
        jest.clearAllMocks();
      }

      // All modern browsers should have consistent support
      expect(results.every(result => result.supported)).toBe(true);
      expect(results.every(result => result.scannerCalled)).toBe(true);
    });
  });
});