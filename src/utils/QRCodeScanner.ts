import jsQR, { QRCode } from 'jsqr';
import { qrErrorHandler, QRErrorType } from './QRErrorHandler';

export interface RectangleCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QRCodeScanResult {
  content: string;
  coordinates: RectangleCoordinates;
  confidence: number;
}

export interface QRCodeScanner {
  scanPage(pageCanvas: HTMLCanvasElement): Promise<QRCodeScanResult[]>;
  isQRCodeDetectionSupported(): boolean;
}

export class QRCodeScannerService implements QRCodeScanner {
  private static instance: QRCodeScannerService;

  public static getInstance(): QRCodeScannerService {
    if (!QRCodeScannerService.instance) {
      QRCodeScannerService.instance = new QRCodeScannerService();
    }
    return QRCodeScannerService.instance;
  }

  /**
   * Check if QR code detection is supported in the current environment
   */
  public isQRCodeDetectionSupported(): boolean {
    try {
      // Basic environment checks
      const supportCheck = qrErrorHandler.checkQRSupport();
      if (!supportCheck.supported) {
        return false;
      }

      // Test jsQR availability by trying to use it
      if (typeof jsQR !== 'function') {
        console.warn('jsQR library not available as function');
        return false;
      }

      return true;
    } catch (error) {
      console.warn('QR code detection support check failed:', error);
      return false;
    }
  }

  /**
   * Get detailed support information including error details and fallback guidance
   */
  public getQRSupportInfo(): {
    supported: boolean;
    error?: any;
    fallbackMessage?: string;
  } {
    return qrErrorHandler.checkQRSupport();
  }

  /**
   * Scan a PDF page canvas for QR codes with enhanced error handling
   */
  public async scanPage(pageCanvas: HTMLCanvasElement, pageNumber?: number): Promise<QRCodeScanResult[]> {
    // Check support with detailed error reporting
    const supportInfo = this.getQRSupportInfo();
    if (!supportInfo.supported) {
      throw supportInfo.error || new Error('QR code detection is not supported');
    }

    // Validate canvas input
    if (!pageCanvas || !pageCanvas.getContext) {
      const error = qrErrorHandler.handleQRError(
        QRErrorType.CANVAS_INVALID,
        'Invalid canvas element provided',
        { pageNumber, canvasProvided: !!pageCanvas }
      );
      throw new Error(error.userMessage);
    }

    const context = pageCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      const error = qrErrorHandler.handleQRError(
        QRErrorType.CANVAS_INVALID,
        'Unable to get canvas 2D context',
        { pageNumber }
      );
      throw new Error(error.userMessage);
    }

    let imageData: ImageData | null = null;

    try {
      // Check canvas size for memory management
      const canvasSize = pageCanvas.width * pageCanvas.height * 4; // 4 bytes per pixel
      const maxSize = 50 * 1024 * 1024; // 50MB limit
      const canvasSizeInfo = { width: pageCanvas.width, height: pageCanvas.height };
      
      if (canvasSize > maxSize) {
        const error = qrErrorHandler.handleQRError(
          QRErrorType.CANVAS_TOO_LARGE,
          `Canvas too large for QR scanning: ${(canvasSize / 1024 / 1024).toFixed(1)}MB`,
          { 
            pageNumber, 
            canvasSize: canvasSizeInfo,
            sizeInMB: canvasSize / 1024 / 1024,
            maxSizeInMB: maxSize / 1024 / 1024
          }
        );
        throw new Error(error.userMessage);
      }

      // Get image data from canvas with enhanced error handling
      try {
        console.log(`🔍 Extracting image data from canvas: ${pageCanvas.width}x${pageCanvas.height}`);
        
        // Validate canvas dimensions before attempting getImageData
        if (!pageCanvas.width || !pageCanvas.height || pageCanvas.width <= 0 || pageCanvas.height <= 0) {
          throw new Error(`Invalid canvas dimensions: ${pageCanvas.width}x${pageCanvas.height}`);
        }
        
        // Validate context is available
        if (!context) {
          throw new Error('Canvas 2D context is not available');
        }
        
        // Extract image data with bounds checking
        imageData = context.getImageData(0, 0, pageCanvas.width, pageCanvas.height);
        
        // Validate that getImageData returned a valid object
        if (!imageData) {
          throw new Error('getImageData returned null or undefined');
        }
        
        // Validate image data structure
        if (!imageData.data || !imageData.width || !imageData.height) {
          throw new Error(`Invalid image data structure: data=${!!imageData.data}, width=${imageData.width}, height=${imageData.height}`);
        }
        
        // Validate data array length
        const expectedLength = imageData.width * imageData.height * 4; // 4 bytes per pixel (RGBA)
        if (imageData.data.length !== expectedLength) {
          throw new Error(`Image data length mismatch: expected ${expectedLength}, got ${imageData.data.length}`);
        }
        
        console.log(`🔍 Image data extracted: ${imageData.width}x${imageData.height}, data length: ${imageData.data.length}`);
      } catch (imageDataError) {
        const errorMessage = imageDataError instanceof Error ? imageDataError.message : 'Failed to extract image data';
        console.error('❌ Image data extraction failed:', errorMessage);
        
        const error = qrErrorHandler.handleQRError(
          QRErrorType.IMAGE_DATA_EXTRACTION_FAILED,
          errorMessage,
          { 
            pageNumber, 
            canvasSize: canvasSizeInfo,
            canvasValid: !!(pageCanvas && pageCanvas.getContext),
            contextValid: !!context,
            canvasDimensions: `${pageCanvas?.width || 'undefined'}x${pageCanvas?.height || 'undefined'}`
          }
        );
        throw new Error(error.userMessage);
      }
      
      // Validate image data
      if (!imageData || !imageData.data || imageData.data.length === 0 || typeof imageData.width !== 'number' || typeof imageData.height !== 'number') {
        const error = qrErrorHandler.handleQRError(
          QRErrorType.IMAGE_DATA_EXTRACTION_FAILED,
          'Image data is empty or invalid',
          { 
            pageNumber, 
            canvasSize: canvasSizeInfo,
            imageDataLength: imageData?.data?.length || 0,
            imageDataWidth: imageData?.width || 'undefined',
            imageDataHeight: imageData?.height || 'undefined'
          }
        );
        throw new Error(error.userMessage);
      }
      
      // Scan for QR codes with different inversion attempts for better detection
      const results: QRCodeScanResult[] = [];
      const scanErrors: string[] = [];
      
      // Comprehensive validation of image data before scanning
      if (!imageData || !imageData.data || typeof imageData.width !== 'number' || typeof imageData.height !== 'number' || imageData.width <= 0 || imageData.height <= 0) {
        const errorDetails = {
          hasImageData: !!imageData,
          hasData: !!(imageData?.data),
          width: imageData?.width,
          height: imageData?.height,
          widthType: typeof imageData?.width,
          heightType: typeof imageData?.height,
          dataLength: imageData?.data?.length || 0
        };
        throw new Error(`Invalid image data for QR scanning: ${JSON.stringify(errorDetails)}`);
      }
      
      // Try different approaches to QR scanning with better error handling
      const scanningApproaches = [
        { name: 'default', options: {} },
        { name: 'dontInvert', options: { inversionAttempts: 'dontInvert' as const } },
        { name: 'attemptBoth', options: { inversionAttempts: 'attemptBoth' as const } }
      ];
      
      for (const { name: approachName, options } of scanningApproaches) {
        try {
          console.log(`🔍 Trying jsQR with ${approachName} approach on ${imageData.width}x${imageData.height} image`);
          
          // Validate imageData before each attempt
          if (!imageData || !imageData.data || typeof imageData.width !== 'number' || typeof imageData.height !== 'number') {
            console.log(`⚠️ Invalid imageData for ${approachName}, skipping...`);
            continue;
          }
          
          if (imageData.width <= 0 || imageData.height <= 0) {
            console.log(`⚠️ Invalid dimensions for ${approachName}: ${imageData.width}x${imageData.height}, skipping...`);
            continue;
          }
          
          if (!(imageData.data instanceof Uint8ClampedArray)) {
            console.log(`⚠️ Invalid data type for ${approachName}: ${typeof imageData.data}, skipping...`);
            continue;
          }
          
          const expectedLength = imageData.width * imageData.height * 4;
          if (imageData.data.length !== expectedLength) {
            console.log(`⚠️ Data length mismatch for ${approachName}: expected ${expectedLength}, got ${imageData.data.length}, skipping...`);
            continue;
          }
          
          console.log(`🔍 Calling jsQR with ${approachName}: ${imageData.width}x${imageData.height}, data length: ${imageData.data.length}`);
          
          let qrCode: QRCode | null = null;
          
          // Wrap jsQR call in try-catch to handle internal errors
          try {
            // Call jsQR with minimal, safe parameters
            if (Object.keys(options).length === 0) {
              // Default call without options to avoid parameter issues
              qrCode = jsQR(imageData.data, imageData.width, imageData.height);
            } else {
              // Call with specific options
              qrCode = jsQR(imageData.data, imageData.width, imageData.height, options);
            }
          } catch (jsqrInternalError) {
            const errorMessage = jsqrInternalError instanceof Error ? jsqrInternalError.message : String(jsqrInternalError);
            console.error(`❌ jsQR internal error with ${approachName}:`, errorMessage);
            console.log(`⚠️ Skipping ${approachName} due to jsQR internal error, trying next approach...`);
            continue;
          }

          console.log(`🔍 jsQR result for ${approachName}:`, qrCode ? `Found QR: ${qrCode.data}` : 'No QR found');

          if (qrCode && qrCode.data !== undefined && qrCode.data.trim() !== '') {
            // Validate QR code data
            if (!this.isValidQRData(qrCode.data)) {
              qrErrorHandler.handleQRError(
                QRErrorType.INVALID_QR_DATA,
                `Invalid QR code data: ${qrCode.data.substring(0, 50)}...`,
                { pageNumber, qrContent: qrCode.data, scanningApproach: approachName }
              );
              continue;
            }

            // Calculate bounding rectangle from QR code location
            const coordinates = this.calculateBoundingRectangle(qrCode.location);
            
            // Validate coordinates
            if (!this.areValidCoordinates(coordinates, pageCanvas.width, pageCanvas.height)) {
              qrErrorHandler.handleQRError(
                QRErrorType.PROCESSING_FAILED,
                'Invalid QR code coordinates detected',
                { 
                  pageNumber, 
                  qrContent: qrCode.data,
                  coordinates,
                  canvasSize: canvasSizeInfo,
                  scanningApproach: approachName
                }
              );
              continue;
            }
            
            // Check if we already found this QR code (avoid duplicates from different inversion attempts)
            const isDuplicate = results.some(result => 
              result.content === qrCode.data && 
              this.areCoordinatesClose(result.coordinates, coordinates)
            );

            if (!isDuplicate) {
              results.push({
                content: qrCode.data,
                coordinates,
                confidence: this.calculateConfidence(qrCode)
              });
            }
          }
        } catch (approachError) {
          // Log approach-specific errors but continue with next strategy
          const errorMessage = approachError instanceof Error ? approachError.message : String(approachError);
          scanErrors.push(`${approachName}: ${errorMessage}`);
          
          if (process.env.NODE_ENV === 'development') {
            console.debug(`QR scan failed with ${approachName}:`, approachError);
          }
        }
      }

      // If no results and we had scan errors, provide helpful guidance
      if (results.length === 0 && scanErrors.length > 0) {
        console.log(`⚠️ All QR scanning strategies failed. This may indicate:
        1. No QR codes present on this page
        2. QR codes are too small or low quality
        3. Browser compatibility issues with jsQR library
        4. Canvas rendering issues`);
        
        // Don't throw an error, just return empty results
        // This allows the scanning to complete gracefully
        console.log(`🔍 Returning empty results for page ${pageNumber || 'unknown'}`);
      }

      return results;
    } catch (error) {
      // Handle any unexpected errors
      if (error instanceof Error && error.message.includes('QR')) {
        // Already handled by QR error handler, just re-throw
        throw error;
      } else {
        // Unexpected error, handle it
        const qrError = qrErrorHandler.handleQRError(
          QRErrorType.PROCESSING_FAILED,
          error instanceof Error ? error.message : 'Unknown scanning error',
          { pageNumber }
        );
        throw new Error(qrError.userMessage);
      }
    } finally {
      // Explicit cleanup to help garbage collection
      imageData = null;
      
      // Force garbage collection if available (development only)
      if (typeof window !== 'undefined' && 'gc' in window && process.env.NODE_ENV === 'development') {
        try {
          (window as any).gc();
        } catch (error) {
          // Ignore if gc is not available
        }
      }
    }
  }

  /**
   * Calculate bounding rectangle from QR code corner locations
   */
  private calculateBoundingRectangle(location: QRCode['location']): RectangleCoordinates {
    const corners = [
      location.topLeftCorner,
      location.topRightCorner,
      location.bottomLeftCorner,
      location.bottomRightCorner
    ];

    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));
    const minY = Math.min(...corners.map(c => c.y));
    const maxY = Math.max(...corners.map(c => c.y));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Calculate confidence score based on QR code detection quality
   */
  private calculateConfidence(qrCode: QRCode): number {
    // Base confidence on the presence of finder patterns and data quality
    let confidence = 0.5; // Base confidence

    // Check if all finder patterns are present
    if (qrCode.location.topLeftFinderPattern && 
        qrCode.location.topRightFinderPattern && 
        qrCode.location.bottomLeftFinderPattern) {
      confidence += 0.3;
    }

    // Check data quality (non-empty, reasonable length)
    if (qrCode.data && qrCode.data.length > 0) {
      confidence += 0.1;
      
      // Bonus for URL-like content
      if (qrCode.data.startsWith('http://') || qrCode.data.startsWith('https://')) {
        confidence += 0.1;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Check if two coordinate sets are close enough to be considered the same QR code
   */
  private areCoordinatesClose(coords1: RectangleCoordinates, coords2: RectangleCoordinates): boolean {
    const threshold = 10; // pixels
    
    return Math.abs(coords1.x - coords2.x) < threshold &&
           Math.abs(coords1.y - coords2.y) < threshold &&
           Math.abs(coords1.width - coords2.width) < threshold &&
           Math.abs(coords1.height - coords2.height) < threshold;
  }

  /**
   * Validate that coordinates are within canvas bounds and reasonable
   */
  private areValidCoordinates(coords: RectangleCoordinates, canvasWidth: number, canvasHeight: number): boolean {
    return coords.x >= 0 && 
           coords.y >= 0 && 
           coords.width > 0 && 
           coords.height > 0 &&
           coords.x + coords.width <= canvasWidth &&
           coords.y + coords.height <= canvasHeight &&
           coords.width <= canvasWidth &&
           coords.height <= canvasHeight;
  }

  /**
   * Validate QR code data content
   */
  private isValidQRData(data: string): boolean {
    // Check for empty or whitespace-only data
    if (!data || data.trim().length === 0) {
      return false;
    }

    // Check for reasonable length (QR codes can hold up to ~4000 characters)
    if (data.length > 4000) {
      return false;
    }

    // Check for control characters that might indicate corrupted data
    const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(data);
    if (hasControlChars) {
      return false;
    }

    // Additional validation for common QR code formats
    const trimmedData = data.trim();
    
    // URLs should start with valid protocols
    if (trimmedData.startsWith('http://') || trimmedData.startsWith('https://')) {
      try {
        new URL(trimmedData);
        return true;
      } catch {
        return false;
      }
    }

    // Email addresses
    if (trimmedData.includes('@') && trimmedData.includes('.')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(trimmedData);
    }

    // Phone numbers (basic validation)
    if (/^[\+]?[\d\s\-\(\)]{7,}$/.test(trimmedData)) {
      return true;
    }

    // Plain text (allow most printable characters)
    return /^[\x20-\x7E\u00A0-\uFFFF]*$/.test(trimmedData);
  }
}

// Export singleton instance
export const qrCodeScanner = QRCodeScannerService.getInstance();