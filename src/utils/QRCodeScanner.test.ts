import { QRCodeScannerService, qrCodeScanner } from './QRCodeScanner';

// Mock jsQR library
jest.mock('jsqr', () => {
  return jest.fn();
});

import jsQR from 'jsqr';
const mockJsQR = jsQR as jest.MockedFunction<typeof jsQR>;

describe('QRCodeScannerService', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let mockImageData: ImageData;
  let scanner: QRCodeScannerService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock canvas and context
    mockImageData = {
      data: new Uint8ClampedArray([255, 255, 255, 255]), // Simple white pixel
      width: 100,
      height: 100,
      colorSpace: 'srgb'
    } as ImageData;

    mockContext = {
      getImageData: jest.fn().mockReturnValue(mockImageData)
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      getContext: jest.fn().mockReturnValue(mockContext),
      width: 100,
      height: 100
    } as unknown as HTMLCanvasElement;

    // Create a new scanner instance for each test
    scanner = new QRCodeScannerService();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = QRCodeScannerService.getInstance();
      const instance2 = QRCodeScannerService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(QRCodeScannerService);
    });

    it('should return same instance as exported singleton', () => {
      const instance = QRCodeScannerService.getInstance();
      expect(instance).toBe(qrCodeScanner);
    });
  });

  describe('isQRCodeDetectionSupported', () => {
    it('should return false in test environment (JSDOM)', () => {
      // In JSDOM environment, canvas is not supported by default
      expect(scanner.isQRCodeDetectionSupported()).toBe(false);
    });

    it('should handle missing HTMLCanvasElement', () => {
      const originalHTMLCanvasElement = global.HTMLCanvasElement;
      // @ts-ignore
      global.HTMLCanvasElement = undefined;

      expect(scanner.isQRCodeDetectionSupported()).toBe(false);
      
      global.HTMLCanvasElement = originalHTMLCanvasElement;
    });

    it('should handle canvas creation errors', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // This will trigger the error handling in JSDOM
      expect(scanner.isQRCodeDetectionSupported()).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('scanPage', () => {
    const mockQRCodeResult = {
      data: 'https://example.com',
      location: {
        topLeftCorner: { x: 10, y: 10 },
        topRightCorner: { x: 50, y: 10 },
        bottomLeftCorner: { x: 10, y: 50 },
        bottomRightCorner: { x: 50, y: 50 },
        topLeftFinderPattern: { x: 15, y: 15 },
        topRightFinderPattern: { x: 45, y: 15 },
        bottomLeftFinderPattern: { x: 15, y: 45 }
      },
      binaryData: new Uint8ClampedArray(),
      chunks: [],
      version: 1
    };

    beforeEach(() => {
      // Mock support check to return true for scanPage tests
      jest.spyOn(scanner, 'isQRCodeDetectionSupported').mockReturnValue(true);
    });

    it('should successfully scan and return QR code results', async () => {
      mockJsQR.mockReturnValueOnce(mockQRCodeResult);

      const results = await scanner.scanPage(mockCanvas);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        content: 'https://example.com',
        coordinates: {
          x: 10,
          y: 10,
          width: 40,
          height: 40
        },
        confidence: expect.any(Number)
      });

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
      expect(mockJsQR).toHaveBeenCalledWith(
        mockImageData.data,
        mockImageData.width,
        mockImageData.height,
        { inversionAttempts: 'dontInvert' }
      );
    });

    it('should return empty array when no QR codes found', async () => {
      mockJsQR.mockReturnValue(null);

      const results = await scanner.scanPage(mockCanvas);

      expect(results).toHaveLength(0);
    });

    it('should try multiple inversion strategies', async () => {
      mockJsQR
        .mockReturnValueOnce(null) // dontInvert
        .mockReturnValueOnce(mockQRCodeResult) // onlyInvert
        .mockReturnValueOnce(null); // attemptBoth

      const results = await scanner.scanPage(mockCanvas);

      expect(results).toHaveLength(1);
      expect(mockJsQR).toHaveBeenCalledTimes(3);
      expect(mockJsQR).toHaveBeenNthCalledWith(1, expect.any(Uint8ClampedArray), 100, 100, { inversionAttempts: 'dontInvert' });
      expect(mockJsQR).toHaveBeenNthCalledWith(2, expect.any(Uint8ClampedArray), 100, 100, { inversionAttempts: 'onlyInvert' });
      expect(mockJsQR).toHaveBeenNthCalledWith(3, expect.any(Uint8ClampedArray), 100, 100, { inversionAttempts: 'attemptBoth' });
    });

    it('should avoid duplicate QR codes from different inversion attempts', async () => {
      const duplicateResult = { ...mockQRCodeResult };
      mockJsQR
        .mockReturnValueOnce(mockQRCodeResult)
        .mockReturnValueOnce(duplicateResult)
        .mockReturnValueOnce(null);

      const results = await scanner.scanPage(mockCanvas);

      expect(results).toHaveLength(1);
    });

    it('should handle multiple different QR codes', async () => {
      const secondQRCode = {
        ...mockQRCodeResult,
        data: 'Different content',
        location: {
          ...mockQRCodeResult.location,
          topLeftCorner: { x: 60, y: 60 },
          topRightCorner: { x: 90, y: 60 },
          bottomLeftCorner: { x: 60, y: 90 },
          bottomRightCorner: { x: 90, y: 90 }
        }
      };

      mockJsQR
        .mockReturnValueOnce(mockQRCodeResult)
        .mockReturnValueOnce(secondQRCode)
        .mockReturnValueOnce(null);

      const results = await scanner.scanPage(mockCanvas);

      expect(results).toHaveLength(2);
      expect(results[0].content).toBe('https://example.com');
      expect(results[1].content).toBe('Different content');
    });

    it('should throw error when QR detection is not supported', async () => {
      jest.spyOn(scanner, 'isQRCodeDetectionSupported').mockReturnValue(false);

      await expect(scanner.scanPage(mockCanvas)).rejects.toThrow(
        'QR code detection is not supported in this environment'
      );
    });

    it('should throw error for invalid canvas', async () => {
      await expect(scanner.scanPage(null as any)).rejects.toThrow(
        'Invalid canvas element provided'
      );

      const invalidCanvas = {} as HTMLCanvasElement;
      await expect(scanner.scanPage(invalidCanvas)).rejects.toThrow(
        'Invalid canvas element provided'
      );
    });

    it('should throw error when canvas context is null', async () => {
      const canvasWithoutContext = {
        getContext: jest.fn().mockReturnValue(null)
      } as unknown as HTMLCanvasElement;

      await expect(scanner.scanPage(canvasWithoutContext)).rejects.toThrow(
        'Unable to get canvas 2D context'
      );
    });

    it('should handle getImageData errors', async () => {
      mockContext.getImageData = jest.fn().mockImplementation(() => {
        throw new Error('getImageData failed');
      });

      await expect(scanner.scanPage(mockCanvas)).rejects.toThrow(
        'QR code scanning failed: getImageData failed'
      );
    });

    it('should continue scanning when individual inversion attempts fail', async () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      mockJsQR
        .mockImplementationOnce(() => { throw new Error('Inversion failed'); })
        .mockReturnValueOnce(mockQRCodeResult)
        .mockReturnValueOnce(null);

      const results = await scanner.scanPage(mockCanvas);

      expect(results).toHaveLength(1);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'QR scan failed with dontInvert:',
        expect.any(Error)
      );
      
      consoleDebugSpy.mockRestore();
    });

    it('should calculate confidence correctly for URL content', async () => {
      const urlQRCode = {
        ...mockQRCodeResult,
        data: 'https://example.com'
      };
      mockJsQR.mockReturnValueOnce(urlQRCode);

      const results = await scanner.scanPage(mockCanvas);

      expect(results[0].confidence).toBeGreaterThan(0.8); // High confidence for URL with all finder patterns
    });

    it('should calculate confidence correctly for non-URL content', async () => {
      const textQRCode = {
        ...mockQRCodeResult,
        data: 'Some text content'
      };
      mockJsQR.mockReturnValueOnce(textQRCode);

      const results = await scanner.scanPage(mockCanvas);

      expect(results[0].confidence).toBeLessThan(1.0); // Lower confidence for non-URL
      expect(results[0].confidence).toBeGreaterThan(0.5); // But still reasonable
    });

    it('should handle QR codes with missing finder patterns', async () => {
      const incompleteQRCode = {
        ...mockQRCodeResult,
        location: {
          ...mockQRCodeResult.location,
          topLeftFinderPattern: null,
          topRightFinderPattern: null,
          bottomLeftFinderPattern: null
        }
      };
      mockJsQR.mockReturnValueOnce(incompleteQRCode);

      const results = await scanner.scanPage(mockCanvas);

      expect(results[0].confidence).toBeLessThanOrEqual(0.7); // Lower confidence without finder patterns
    });
  });

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      // Mock support check to return true for edge case tests
      jest.spyOn(scanner, 'isQRCodeDetectionSupported').mockReturnValue(true);
    });

    it('should handle empty QR code data', async () => {
      const emptyQRCode = {
        data: '',
        location: {
          topLeftCorner: { x: 10, y: 10 },
          topRightCorner: { x: 50, y: 10 },
          bottomLeftCorner: { x: 10, y: 50 },
          bottomRightCorner: { x: 50, y: 50 },
          topLeftFinderPattern: { x: 15, y: 15 },
          topRightFinderPattern: { x: 45, y: 15 },
          bottomLeftFinderPattern: { x: 15, y: 45 }
        },
        binaryData: new Uint8ClampedArray(),
        chunks: [],
        version: 1
      };
      mockJsQR.mockReturnValueOnce(emptyQRCode);

      const results = await scanner.scanPage(mockCanvas);

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('');
      expect(results[0].confidence).toBe(0.8); // Base (0.5) + finder patterns (0.3) = 0.8 for empty data
    });

    it('should handle QR codes at canvas edges', async () => {
      const edgeQRCode = {
        data: 'Edge QR code',
        location: {
          topLeftCorner: { x: 0, y: 0 },
          topRightCorner: { x: 20, y: 0 },
          bottomLeftCorner: { x: 0, y: 20 },
          bottomRightCorner: { x: 20, y: 20 },
          topLeftFinderPattern: { x: 5, y: 5 },
          topRightFinderPattern: { x: 15, y: 5 },
          bottomLeftFinderPattern: { x: 5, y: 15 }
        },
        binaryData: new Uint8ClampedArray(),
        chunks: [],
        version: 1
      };
      mockJsQR.mockReturnValueOnce(edgeQRCode);

      const results = await scanner.scanPage(mockCanvas);

      expect(results).toHaveLength(1);
      expect(results[0].coordinates).toEqual({
        x: 0,
        y: 0,
        width: 20,
        height: 20
      });
    });
  });
});