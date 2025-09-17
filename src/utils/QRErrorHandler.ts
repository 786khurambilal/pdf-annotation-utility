import { errorHandler, ErrorType } from './errorHandling';

export enum QRErrorType {
  DETECTION_NOT_SUPPORTED = 'QR_DETECTION_NOT_SUPPORTED',
  LIBRARY_LOAD_FAILED = 'QR_LIBRARY_LOAD_FAILED',
  CANVAS_INVALID = 'QR_CANVAS_INVALID',
  CANVAS_TOO_LARGE = 'QR_CANVAS_TOO_LARGE',
  IMAGE_DATA_EXTRACTION_FAILED = 'QR_IMAGE_DATA_EXTRACTION_FAILED',
  SCAN_TIMEOUT = 'QR_SCAN_TIMEOUT',
  MEMORY_LIMIT_EXCEEDED = 'QR_MEMORY_LIMIT_EXCEEDED',
  PROCESSING_FAILED = 'QR_PROCESSING_FAILED',
  CTA_GENERATION_FAILED = 'QR_CTA_GENERATION_FAILED',
  PARTIAL_SCAN_FAILURE = 'QR_PARTIAL_SCAN_FAILURE',
  DOCUMENT_LIMIT_EXCEEDED = 'QR_DOCUMENT_LIMIT_EXCEEDED',
  INVALID_QR_DATA = 'QR_INVALID_QR_DATA',
  BROWSER_COMPATIBILITY = 'QR_BROWSER_COMPATIBILITY'
}

export interface QRError {
  type: QRErrorType;
  message: string;
  userMessage: string;
  pageNumber?: number;
  qrContent?: string;
  retryable: boolean;
  fallbackAvailable: boolean;
  technicalDetails?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface QRErrorStats {
  totalErrors: number;
  errorsByType: Record<QRErrorType, number>;
  errorsByPage: Record<number, number>;
  retryableErrors: number;
  criticalErrors: number;
  lastError?: QRError;
}

export interface QRFallbackOptions {
  skipFailedPages: boolean;
  continueOnErrors: boolean;
  maxErrorsBeforeStop: number;
  enablePartialResults: boolean;
  showUserGuidance: boolean;
}

class QRErrorHandlerService {
  private errors: QRError[] = [];
  private errorStats: QRErrorStats = {
    totalErrors: 0,
    errorsByType: {} as Record<QRErrorType, number>,
    errorsByPage: {},
    retryableErrors: 0,
    criticalErrors: 0
  };
  private maxStoredErrors = 50;
  private fallbackOptions: QRFallbackOptions = {
    skipFailedPages: true,
    continueOnErrors: true,
    maxErrorsBeforeStop: 10,
    enablePartialResults: true,
    showUserGuidance: true
  };

  /**
   * Handle QR-specific errors with enhanced context and user guidance
   */
  public handleQRError(
    type: QRErrorType,
    originalError: Error | string,
    context?: {
      pageNumber?: number;
      qrContent?: string;
      canvasSize?: { width: number; height: number };
      memoryUsage?: number;
      retryCount?: number;
      [key: string]: any;
    }
  ): QRError {
    const errorMessage = typeof originalError === 'string' ? originalError : originalError.message;
    const qrError = this.createQRError(type, errorMessage, context);
    
    // Store error for tracking
    this.addError(qrError);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('QR Error:', qrError);
    }
    
    // Report to general error handler for broader error tracking
    errorHandler.handleError(new Error(qrError.message), {
      operation: 'QR_SCANNING',
      qrErrorType: type,
      pageNumber: context?.pageNumber,
      qrContent: context?.qrContent,
      retryable: qrError.retryable,
      fallbackAvailable: qrError.fallbackAvailable,
      ...context
    });

    return qrError;
  }

  /**
   * Check if QR detection is supported and provide fallback guidance
   */
  public checkQRSupport(): {
    supported: boolean;
    error?: QRError;
    fallbackMessage?: string;
  } {
    try {
      // Check Canvas API support
      if (typeof HTMLCanvasElement === 'undefined') {
        const error = this.handleQRError(
          QRErrorType.BROWSER_COMPATIBILITY,
          'Canvas API not available',
          { feature: 'HTMLCanvasElement' }
        );
        return {
          supported: false,
          error,
          fallbackMessage: 'Your browser does not support the Canvas API required for QR code detection. Please use a modern browser like Chrome, Firefox, or Safari.'
        };
      }

      // Check if we can create a canvas context
      const testCanvas = document.createElement('canvas');
      const context = testCanvas.getContext('2d', { willReadFrequently: true });
      
      if (!context) {
        const error = this.handleQRError(
          QRErrorType.BROWSER_COMPATIBILITY,
          'Cannot create 2D canvas context',
          { feature: 'Canvas2DContext' }
        );
        return {
          supported: false,
          error,
          fallbackMessage: 'Your browser cannot create a 2D canvas context. QR code detection will be disabled.'
        };
      }

      // Skip library check in support detection - let actual scanning handle library errors
      // This prevents premature failures during app initialization

      return { supported: true };
    } catch (error) {
      const qrError = this.handleQRError(
        QRErrorType.DETECTION_NOT_SUPPORTED,
        error instanceof Error ? error.message : 'Unknown support check error'
      );
      return {
        supported: false,
        error: qrError,
        fallbackMessage: 'QR code detection is not available in your current environment.'
      };
    }
  }

  /**
   * Handle partial scan failures with recovery strategies
   */
  public handlePartialScanFailure(
    failedPages: number[],
    totalPages: number,
    successfulScans: number
  ): {
    shouldContinue: boolean;
    userMessage: string;
    fallbackStrategy: 'retry' | 'skip' | 'stop';
    retryPages?: number[];
  } {
    const failureRate = failedPages.length / totalPages;
    const successRate = successfulScans / totalPages;

    // Create partial failure error
    const error = this.handleQRError(
      QRErrorType.PARTIAL_SCAN_FAILURE,
      `${failedPages.length} of ${totalPages} pages failed to scan`,
      {
        failedPages,
        totalPages,
        successfulScans,
        failureRate,
        successRate
      }
    );

    // Determine strategy based on failure rate and settings
    if (failureRate > 0.5) {
      // More than 50% failed - suggest stopping
      return {
        shouldContinue: false,
        userMessage: `QR scanning failed on ${failedPages.length} of ${totalPages} pages (${Math.round(failureRate * 100)}% failure rate). This may indicate a problem with the document or browser compatibility.`,
        fallbackStrategy: 'stop'
      };
    } else if (failureRate > 0.2) {
      // 20-50% failed - offer retry with guidance
      const retryPages = failedPages.slice(0, Math.min(5, failedPages.length)); // Limit retries
      return {
        shouldContinue: this.fallbackOptions.continueOnErrors,
        userMessage: `QR scanning encountered issues on ${failedPages.length} pages. You can retry the failed pages or continue with the ${successfulScans} successful scans.`,
        fallbackStrategy: 'retry',
        retryPages
      };
    } else {
      // Less than 20% failed - continue with skip
      return {
        shouldContinue: true,
        userMessage: `QR scanning completed with ${successfulScans} successful scans. ${failedPages.length} pages were skipped due to scanning issues.`,
        fallbackStrategy: 'skip'
      };
    }
  }

  /**
   * Provide user guidance based on error patterns
   */
  public getUserGuidance(): {
    hasGuidance: boolean;
    title: string;
    message: string;
    actions: Array<{
      label: string;
      action: 'retry' | 'settings' | 'help' | 'disable';
      description: string;
    }>;
  } {
    if (this.errors.length === 0) {
      return { hasGuidance: false, title: '', message: '', actions: [] };
    }

    const recentErrors = this.errors.slice(-5);
    const errorTypes = new Set(recentErrors.map(e => e.type));

    // Browser compatibility issues
    if (errorTypes.has(QRErrorType.BROWSER_COMPATIBILITY) || 
        errorTypes.has(QRErrorType.DETECTION_NOT_SUPPORTED)) {
      return {
        hasGuidance: true,
        title: 'QR Detection Not Available',
        message: 'Your browser or device does not support QR code detection. You can still use all other features of the PDF reader.',
        actions: [
          {
            label: 'Try Different Browser',
            action: 'help',
            description: 'Use Chrome, Firefox, or Safari for best compatibility'
          },
          {
            label: 'Disable QR Scanning',
            action: 'disable',
            description: 'Turn off QR detection to avoid these messages'
          }
        ]
      };
    }

    // Memory or performance issues
    if (errorTypes.has(QRErrorType.MEMORY_LIMIT_EXCEEDED) || 
        errorTypes.has(QRErrorType.CANVAS_TOO_LARGE)) {
      return {
        hasGuidance: true,
        title: 'Performance Issues Detected',
        message: 'QR scanning is using too much memory or processing large pages. Consider adjusting settings or trying a smaller document.',
        actions: [
          {
            label: 'Adjust Settings',
            action: 'settings',
            description: 'Reduce scanning quality or enable page limits'
          },
          {
            label: 'Retry with Smaller Document',
            action: 'help',
            description: 'Try scanning a document with fewer or smaller pages'
          }
        ]
      };
    }

    // Frequent timeouts or processing failures
    if (errorTypes.has(QRErrorType.SCAN_TIMEOUT) || 
        errorTypes.has(QRErrorType.PROCESSING_FAILED)) {
      return {
        hasGuidance: true,
        title: 'Scanning Issues',
        message: 'QR code scanning is experiencing timeouts or processing failures. This may be due to complex pages or system performance.',
        actions: [
          {
            label: 'Retry Scan',
            action: 'retry',
            description: 'Try scanning again with current settings'
          },
          {
            label: 'Adjust Timeout Settings',
            action: 'settings',
            description: 'Increase timeout limits for complex pages'
          }
        ]
      };
    }

    // General guidance for multiple errors
    return {
      hasGuidance: true,
      title: 'QR Scanning Issues',
      message: `Encountered ${this.errorStats.totalErrors} scanning issues. Most features are still available, but QR detection may be limited.`,
      actions: [
        {
          label: 'View Error Details',
          action: 'help',
          description: 'See detailed information about scanning issues'
        },
        {
          label: 'Reset and Retry',
          action: 'retry',
          description: 'Clear errors and try scanning again'
        }
      ]
    };
  }

  /**
   * Get error statistics for monitoring and debugging
   */
  public getErrorStats(): QRErrorStats {
    return { ...this.errorStats };
  }

  /**
   * Get recent errors for debugging
   */
  public getRecentErrors(count: number = 10): QRError[] {
    return this.errors.slice(-count);
  }

  /**
   * Check if error type is retryable
   */
  public isRetryable(errorType: QRErrorType): boolean {
    const retryableTypes = [
      QRErrorType.SCAN_TIMEOUT,
      QRErrorType.PROCESSING_FAILED,
      QRErrorType.IMAGE_DATA_EXTRACTION_FAILED,
      QRErrorType.CTA_GENERATION_FAILED
    ];
    return retryableTypes.includes(errorType);
  }

  /**
   * Check if fallback is available for error type
   */
  public hasFallback(errorType: QRErrorType): boolean {
    const fallbackTypes = [
      QRErrorType.SCAN_TIMEOUT,
      QRErrorType.PROCESSING_FAILED,
      QRErrorType.PARTIAL_SCAN_FAILURE,
      QRErrorType.INVALID_QR_DATA
    ];
    return fallbackTypes.includes(errorType);
  }

  /**
   * Clear errors and reset statistics
   */
  public clearErrors(): void {
    this.errors = [];
    this.errorStats = {
      totalErrors: 0,
      errorsByType: {} as Record<QRErrorType, number>,
      errorsByPage: {},
      retryableErrors: 0,
      criticalErrors: 0
    };
  }

  /**
   * Update fallback options
   */
  public updateFallbackOptions(options: Partial<QRFallbackOptions>): void {
    this.fallbackOptions = { ...this.fallbackOptions, ...options };
  }

  /**
   * Create a structured QR error
   */
  private createQRError(
    type: QRErrorType,
    message: string,
    context?: Record<string, any>
  ): QRError {
    const userMessage = this.getUserFriendlyMessage(type, message, context);
    const retryable = this.isRetryable(type);
    const fallbackAvailable = this.hasFallback(type);

    return {
      type,
      message,
      userMessage,
      pageNumber: context?.pageNumber,
      qrContent: context?.qrContent,
      retryable,
      fallbackAvailable,
      technicalDetails: this.getTechnicalDetails(type, message, context),
      timestamp: new Date(),
      context
    };
  }

  /**
   * Generate user-friendly error messages
   */
  private getUserFriendlyMessage(
    type: QRErrorType,
    message: string,
    context?: Record<string, any>
  ): string {
    const pageInfo = context?.pageNumber ? ` on page ${context.pageNumber}` : '';

    switch (type) {
      case QRErrorType.DETECTION_NOT_SUPPORTED:
        return 'QR code detection is not supported in your browser. All other PDF features remain available.';
      
      case QRErrorType.LIBRARY_LOAD_FAILED:
        return 'The QR code scanning library could not be loaded. QR detection will be disabled for this session.';
      
      case QRErrorType.CANVAS_INVALID:
        return `Unable to process page content${pageInfo} for QR scanning. The page may be corrupted or in an unsupported format.`;
      
      case QRErrorType.CANVAS_TOO_LARGE:
        return `Page${pageInfo} is too large for QR scanning. Consider using a smaller document or adjusting quality settings.`;
      
      case QRErrorType.IMAGE_DATA_EXTRACTION_FAILED:
        return `Could not extract image data${pageInfo}. The page may have rendering issues.`;
      
      case QRErrorType.SCAN_TIMEOUT:
        return `QR scanning timed out${pageInfo}. The page may be complex or your device may be running slowly.`;
      
      case QRErrorType.MEMORY_LIMIT_EXCEEDED:
        return 'QR scanning is using too much memory. Try closing other browser tabs or scanning a smaller document.';
      
      case QRErrorType.PROCESSING_FAILED:
        return `QR code processing failed${pageInfo}. The QR code may be damaged or in an unsupported format.`;
      
      case QRErrorType.CTA_GENERATION_FAILED:
        return `Could not create call-to-action${pageInfo}. The QR code was detected but could not be processed.`;
      
      case QRErrorType.PARTIAL_SCAN_FAILURE:
        return 'Some pages could not be scanned for QR codes. Successful scans are still available.';
      
      case QRErrorType.DOCUMENT_LIMIT_EXCEEDED:
        return 'This document has too many QR codes. Only the first 100 will be processed.';
      
      case QRErrorType.INVALID_QR_DATA:
        return `Found a QR code${pageInfo} but could not read its content. The QR code may be damaged.`;
      
      case QRErrorType.BROWSER_COMPATIBILITY:
        return 'Your browser does not support all features required for QR code detection. Please use a modern browser.';
      
      default:
        return `QR scanning encountered an issue${pageInfo}. You can continue using other PDF features.`;
    }
  }

  /**
   * Generate technical details for debugging
   */
  private getTechnicalDetails(
    type: QRErrorType,
    message: string,
    context?: Record<string, any>
  ): string {
    const details = [`Error Type: ${type}`, `Message: ${message}`];
    
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          details.push(`${key}: ${JSON.stringify(value)}`);
        }
      });
    }
    
    details.push(`Timestamp: ${new Date().toISOString()}`);
    details.push(`User Agent: ${navigator.userAgent}`);
    
    return details.join('\n');
  }

  /**
   * Add error to tracking
   */
  private addError(error: QRError): void {
    // Add to errors array
    this.errors.push(error);
    
    // Limit stored errors
    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(-this.maxStoredErrors);
    }
    
    // Update statistics
    this.errorStats.totalErrors++;
    this.errorStats.errorsByType[error.type] = (this.errorStats.errorsByType[error.type] || 0) + 1;
    
    if (error.pageNumber) {
      this.errorStats.errorsByPage[error.pageNumber] = (this.errorStats.errorsByPage[error.pageNumber] || 0) + 1;
    }
    
    if (error.retryable) {
      this.errorStats.retryableErrors++;
    }
    
    // Mark as critical if it's a non-retryable system error
    const criticalTypes = [
      QRErrorType.DETECTION_NOT_SUPPORTED,
      QRErrorType.LIBRARY_LOAD_FAILED,
      QRErrorType.BROWSER_COMPATIBILITY,
      QRErrorType.MEMORY_LIMIT_EXCEEDED
    ];
    
    if (criticalTypes.includes(error.type)) {
      this.errorStats.criticalErrors++;
    }
    
    this.errorStats.lastError = error;
  }
}

// Export singleton instance
export const qrErrorHandler = new QRErrorHandlerService();

// Utility functions for common QR error scenarios
export const handleQRScanError = (error: Error, pageNumber?: number): QRError => {
  return qrErrorHandler.handleQRError(
    QRErrorType.PROCESSING_FAILED,
    error,
    { pageNumber }
  );
};

export const handleQRTimeoutError = (pageNumber: number, timeoutMs: number): QRError => {
  return qrErrorHandler.handleQRError(
    QRErrorType.SCAN_TIMEOUT,
    `Page scan timeout after ${timeoutMs}ms`,
    { pageNumber, timeoutMs }
  );
};

export const handleQRMemoryError = (memoryUsage: number, limit: number): QRError => {
  return qrErrorHandler.handleQRError(
    QRErrorType.MEMORY_LIMIT_EXCEEDED,
    `Memory usage ${memoryUsage}MB exceeds limit ${limit}MB`,
    { memoryUsage, limit }
  );
};

export const handleQRCanvasError = (error: Error, canvasSize?: { width: number; height: number }): QRError => {
  const errorType = error.message.includes('too large') 
    ? QRErrorType.CANVAS_TOO_LARGE 
    : QRErrorType.CANVAS_INVALID;
    
  return qrErrorHandler.handleQRError(errorType, error, { canvasSize });
};