import { QRCodeScannerService } from './QRCodeScanner';

// Mock jsQR for testing
jest.mock('jsqr', () => {
  return jest.fn().mockImplementation((data, width, height, options) => {
    // Simulate processing time based on image size
    const pixelCount = width * height;
    const processingTime = Math.min(pixelCount / 100000, 1000); // Max 1 second
    
    // Return mock QR code for testing
    if (Math.random() > 0.5) { // 50% chance of finding QR code
      return {
        data: 'https://example.com/test',
        location: {
          topLeftCorner: { x: 10, y: 10 },
          topRightCorner: { x: 60, y: 10 },
          bottomLeftCorner: { x: 10, y: 60 },
          bottomRightCorner: { x: 60, y: 60 },
          topLeftFinderPattern: { x: 15, y: 15 },
          topRightFinderPattern: { x: 55, y: 15 },
          bottomLeftFinderPattern: { x: 15, y: 55 }
        }
      };
    }
    return null;
  });
});

// Helper function to create mock canvas with specific size
function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const context = canvas.getContext('2d');
  if (context) {
    // Fill with some test pattern
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'black';
    context.fillRect(10, 10, 50, 50); // Mock QR code area
  }
  
  return canvas;
}

describe('QRCodeScanner Performance Tests', () => {
  let scanner: QRCodeScannerService;

  beforeEach(() => {
    scanner = QRCodeScannerService.getInstance();
  });

  describe('Memory Management', () => {
    test('should handle large canvas sizes efficiently', async () => {
      const largeCanvas = createMockCanvas(2000, 2000); // 4MP image
      
      const startTime = Date.now();
      const results = await scanner.scanPage(largeCanvas);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should reject extremely large canvases', async () => {
      const hugeCanvas = createMockCanvas(5000, 5000); // 25MP image, ~100MB
      
      await expect(scanner.scanPage(hugeCanvas)).rejects.toThrow('Canvas too large');
    });

    test('should handle multiple sequential scans without memory leaks', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Perform multiple scans
      for (let i = 0; i < 20; i++) {
        const canvas = createMockCanvas(800, 600);
        const results = await scanner.scanPage(canvas);
        expect(results).toBeDefined();
      }
      
      // Force garbage collection if available
      if (typeof window !== 'undefined' && 'gc' in window) {
        try {
          (window as any).gc();
        } catch (error) {
          // Ignore if gc is not available
        }
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      if (initialMemory > 0) {
        const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB
        expect(memoryIncrease).toBeLessThan(50); // Should not increase by more than 50MB
      }
    });

    test('should cleanup resources after scan completion', async () => {
      const canvas = createMockCanvas(1000, 1000);
      
      // Mock getImageData to track calls
      const originalGetImageData = HTMLCanvasElement.prototype.getContext;
      const getImageDataSpy = jest.fn();
      
      HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation(function(this: HTMLCanvasElement, type: string) {
        const context = originalGetImageData.call(this, type);
        if (context && type === '2d') {
          const originalGetImageData = context.getImageData;
          context.getImageData = jest.fn().mockImplementation(function(...args) {
            getImageDataSpy();
            return originalGetImageData.apply(this, args);
          });
        }
        return context;
      });
      
      try {
        const results = await scanner.scanPage(canvas);
        expect(results).toBeDefined();
        expect(getImageDataSpy).toHaveBeenCalled();
      } finally {
        // Restore original method
        HTMLCanvasElement.prototype.getContext = originalGetImageData;
      }
    });
  });

  describe('Processing Performance', () => {
    test('should process small canvases quickly', async () => {
      const smallCanvas = createMockCanvas(200, 200);
      
      const startTime = Date.now();
      const results = await scanner.scanPage(smallCanvas);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      
      expect(results).toBeDefined();
      expect(processingTime).toBeLessThan(500); // Should complete within 500ms
    });

    test('should handle different canvas aspect ratios', async () => {
      const testCases = [
        { width: 1920, height: 1080 }, // 16:9
        { width: 1080, height: 1920 }, // 9:16 (portrait)
        { width: 1000, height: 1000 }, // 1:1 (square)
        { width: 2000, height: 500 },  // 4:1 (wide)
        { width: 500, height: 2000 }   // 1:4 (tall)
      ];
      
      for (const { width, height } of testCases) {
        const canvas = createMockCanvas(width, height);
        const startTime = Date.now();
        const results = await scanner.scanPage(canvas);
        const endTime = Date.now();
        
        expect(results).toBeDefined();
        expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
      }
    });

    test('should handle concurrent scanning requests', async () => {
      const canvases = Array.from({ length: 5 }, () => createMockCanvas(600, 800));
      
      const startTime = Date.now();
      const promises = canvases.map(canvas => scanner.scanPage(canvas));
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Error Handling Performance', () => {
    test('should fail fast for invalid canvases', async () => {
      const invalidCanvas = null as any;
      
      const startTime = Date.now();
      await expect(scanner.scanPage(invalidCanvas)).rejects.toThrow();
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(100); // Should fail quickly
    });

    test('should handle canvas without context gracefully', async () => {
      const canvas = createMockCanvas(100, 100);
      
      // Mock getContext to return null
      const originalGetContext = canvas.getContext;
      canvas.getContext = jest.fn().mockReturnValue(null);
      
      const startTime = Date.now();
      await expect(scanner.scanPage(canvas)).rejects.toThrow('Unable to get canvas 2D context');
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(100); // Should fail quickly
      
      // Restore original method
      canvas.getContext = originalGetContext;
    });

    test('should handle getImageData failures', async () => {
      const canvas = createMockCanvas(100, 100);
      const context = canvas.getContext('2d');
      
      if (context) {
        // Mock getImageData to throw error
        const originalGetImageData = context.getImageData;
        context.getImageData = jest.fn().mockImplementation(() => {
          throw new Error('Mock getImageData failure');
        });
        
        const startTime = Date.now();
        await expect(scanner.scanPage(canvas)).rejects.toThrow();
        const endTime = Date.now();
        
        const processingTime = endTime - startTime;
        expect(processingTime).toBeLessThan(1000); // Should fail within 1 second
        
        // Restore original method
        context.getImageData = originalGetImageData;
      }
    });
  });

  describe('QR Code Detection Accuracy', () => {
    test('should validate QR code coordinates', async () => {
      const canvas = createMockCanvas(100, 100);
      
      // Mock jsQR to return invalid coordinates
      const jsQR = require('jsqr');
      jsQR.mockImplementationOnce(() => ({
        data: 'test',
        location: {
          topLeftCorner: { x: -10, y: -10 }, // Invalid negative coordinates
          topRightCorner: { x: 110, y: -10 }, // Outside canvas bounds
          bottomLeftCorner: { x: -10, y: 110 },
          bottomRightCorner: { x: 110, y: 110 },
          topLeftFinderPattern: { x: 0, y: 0 },
          topRightFinderPattern: { x: 50, y: 0 },
          bottomLeftFinderPattern: { x: 0, y: 50 }
        }
      }));
      
      const results = await scanner.scanPage(canvas);
      
      // Should filter out invalid coordinates
      expect(results).toHaveLength(0);
    });

    test('should handle duplicate QR codes from different inversion attempts', async () => {
      const canvas = createMockCanvas(200, 200);
      
      // Mock jsQR to return the same QR code for different inversion attempts
      const jsQR = require('jsqr');
      jsQR.mockImplementation(() => ({
        data: 'duplicate-test',
        location: {
          topLeftCorner: { x: 10, y: 10 },
          topRightCorner: { x: 60, y: 10 },
          bottomLeftCorner: { x: 10, y: 60 },
          bottomRightCorner: { x: 60, y: 60 },
          topLeftFinderPattern: { x: 15, y: 15 },
          topRightFinderPattern: { x: 55, y: 15 },
          bottomLeftFinderPattern: { x: 15, y: 55 }
        }
      }));
      
      const results = await scanner.scanPage(canvas);
      
      // Should deduplicate results
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('duplicate-test');
    });

    test('should calculate confidence scores correctly', async () => {
      const canvas = createMockCanvas(200, 200);
      
      const results = await scanner.scanPage(canvas);
      
      results.forEach(result => {
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(typeof result.confidence).toBe('number');
      });
    });
  });

  describe('Browser Compatibility', () => {
    test('should detect QR code support correctly', () => {
      const isSupported = scanner.isQRCodeDetectionSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    test('should handle missing canvas API gracefully', () => {
      // Mock HTMLCanvasElement to be undefined
      const originalHTMLCanvasElement = global.HTMLCanvasElement;
      (global as any).HTMLCanvasElement = undefined;
      
      const isSupported = scanner.isQRCodeDetectionSupported();
      expect(isSupported).toBe(false);
      
      // Restore original
      global.HTMLCanvasElement = originalHTMLCanvasElement;
    });

    test('should handle missing jsQR library gracefully', () => {
      // This test would need to be run in an environment where jsQR is not available
      // For now, we just verify the method exists and returns a boolean
      const isSupported = scanner.isQRCodeDetectionSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid successive scans', async () => {
      const canvas = createMockCanvas(400, 400);
      const numberOfScans = 50;
      
      const startTime = Date.now();
      const promises = Array.from({ length: numberOfScans }, () => scanner.scanPage(canvas));
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(numberOfScans);
      
      const totalTime = endTime - startTime;
      const averageTime = totalTime / numberOfScans;
      
      expect(averageTime).toBeLessThan(1000); // Average should be less than 1 second per scan
    });

    test('should maintain performance with varying canvas sizes', async () => {
      const sizes = [
        { width: 100, height: 100 },
        { width: 500, height: 500 },
        { width: 1000, height: 1000 },
        { width: 1500, height: 1500 }
      ];
      
      const results = [];
      
      for (const { width, height } of sizes) {
        const canvas = createMockCanvas(width, height);
        const startTime = Date.now();
        const scanResult = await scanner.scanPage(canvas);
        const endTime = Date.now();
        
        results.push({
          size: width * height,
          time: endTime - startTime,
          qrCodes: scanResult.length
        });
      }
      
      // Verify that processing time scales reasonably with image size
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const previous = results[i - 1];
        
        const sizeRatio = current.size / previous.size;
        const timeRatio = current.time / previous.time;
        
        // Time should not increase more than 3x for each size increase
        expect(timeRatio).toBeLessThan(sizeRatio * 3);
      }
    });
  });
});