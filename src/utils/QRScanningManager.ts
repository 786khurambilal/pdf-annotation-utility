import { CallToAction } from '../types/annotation.types';
import { QRCodeScanner, QRCodeScanResult } from './QRCodeScanner';
import { PageContentExtractor } from './PageContentExtractor';
import { AutoCTAGenerator } from './AutoCTAGenerator';
import { qrErrorHandler, QRErrorType, handleQRTimeoutError, handleQRMemoryError } from './QRErrorHandler';

export interface QRScanningState {
  isScanning: boolean;
  isPaused: boolean;
  currentPage: number;
  totalPages: number;
  foundQRCodes: number;
  generatedCTAs: number;
  errors: Array<{
    pageNumber: number;
    error: string;
    retryCount?: number;
  }>;
  startedAt?: Date;
  completedAt?: Date;
  performanceMetrics?: {
    averagePageScanTime: number;
    memoryUsage: number;
    timeoutCount: number;
    retryCount: number;
  };
}

export interface QRScanProgress {
  documentId: string;
  totalPages: number;
  scannedPages: number;
  foundQRCodes: QRCodeScanResult[];
  generatedCTAs: CallToAction[];
  errors: Array<{
    pageNumber: number;
    error: string;
    retryCount?: number;
  }>;
  startedAt: Date;
  completedAt?: Date;
  performanceMetrics?: {
    averagePageScanTime: number;
    memoryUsage: number;
    timeoutCount: number;
    retryCount: number;
  };
}

export interface QRScanningConfig {
  pageTimeoutMs: number;
  maxRetries: number;
  maxConcurrentPages: number;
  memoryThresholdMB: number;
  maxQRCodesPerDocument: number;
  performanceMonitoring: boolean;
}

type StateChangeCallback = (state: QRScanningState) => void;
type ProgressCallback = (progress: QRScanProgress) => void;

export class QRScanningManager {
  private state: QRScanningState;
  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private currentProgress: QRScanProgress | null = null;
  private abortController: AbortController | null = null;
  private pausePromise: Promise<void> | null = null;
  private pauseResolve: (() => void) | null = null;

  private qrScanner: QRCodeScanner;
  private contentExtractor: PageContentExtractor;
  private ctaGenerator: AutoCTAGenerator;
  
  // Performance optimization properties
  private config: QRScanningConfig;
  private pageRetryCount: Map<number, number> = new Map();
  private pageScanTimes: number[] = [];
  private memoryMonitor: PerformanceObserver | null = null;
  private canvasCache: Map<number, HTMLCanvasElement> = new Map();
  private cleanupTimeouts: Set<NodeJS.Timeout> = new Set();

  constructor(
    qrScanner: QRCodeScanner,
    contentExtractor: PageContentExtractor,
    ctaGenerator: AutoCTAGenerator,
    config?: Partial<QRScanningConfig>
  ) {
    this.qrScanner = qrScanner;
    this.contentExtractor = contentExtractor;
    this.ctaGenerator = ctaGenerator;

    // Default configuration with performance optimizations
    this.config = {
      pageTimeoutMs: 5000, // 5 seconds should be enough for QR scanning
      maxRetries: 2, // Reduced retries to avoid excessive delays
      maxConcurrentPages: 1, // Reduced to 1 for better stability
      memoryThresholdMB: 150, // Increased memory threshold
      maxQRCodesPerDocument: 100,
      performanceMonitoring: true,
      ...config
    };

    this.state = {
      isScanning: false,
      isPaused: false,
      currentPage: 0,
      totalPages: 0,
      foundQRCodes: 0,
      generatedCTAs: 0,
      errors: [],
      performanceMetrics: {
        averagePageScanTime: 0,
        memoryUsage: 0,
        timeoutCount: 0,
        retryCount: 0
      }
    };

    this.initializePerformanceMonitoring();
  }

  public async startScanning(
    documentId: string,
    totalPages: number,
    getPageCanvas: (pageNumber: number) => Promise<HTMLCanvasElement>,
    userId: string
  ): Promise<CallToAction[]> {
    if (this.state.isScanning) {
      const error = qrErrorHandler.handleQRError(
        QRErrorType.PROCESSING_FAILED,
        'Scanning is already in progress',
        { documentId, totalPages }
      );
      throw new Error(error.userMessage);
    }

    // Check QR support before starting
    const supportInfo = this.qrScanner.getQRSupportInfo();
    if (!supportInfo.supported) {
      throw supportInfo.error || new Error('QR code detection is not supported');
    }

    // Initialize scanning state
    this.updateState({
      isScanning: true,
      isPaused: false,
      currentPage: 0,
      totalPages,
      foundQRCodes: 0,
      generatedCTAs: 0,
      errors: [],
      startedAt: new Date(),
      performanceMetrics: {
        averagePageScanTime: 0,
        memoryUsage: 0,
        timeoutCount: 0,
        retryCount: 0
      }
    });

    // Initialize progress tracking
    this.currentProgress = {
      documentId,
      totalPages,
      scannedPages: 0,
      foundQRCodes: [],
      generatedCTAs: [],
      errors: [],
      startedAt: new Date()
    };

    this.abortController = new AbortController();
    const allGeneratedCTAs: CallToAction[] = [];
    const failedPages: number[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        // Check if scanning was aborted
        if (this.abortController.signal.aborted) {
          break;
        }

        // Handle pause functionality
        if (this.state.isPaused && this.pausePromise) {
          await this.pausePromise;
        }

        this.updateState({
          ...this.state,
          currentPage: pageNumber
        });

        // Add a small delay between pages to allow rendering and reduce system load
        if (pageNumber > 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between pages
        }

        try {
          // Use the new timeout and retry logic
          const pageCTAs = await this.scanPageWithTimeout(pageNumber, getPageCanvas, userId, documentId);
          allGeneratedCTAs.push(...pageCTAs);

          this.currentProgress!.scannedPages = pageNumber;
          
          // Notify progress after each page (for UI updates)
          this.notifyProgress();

          // Periodic cleanup to manage memory
          if (pageNumber % 5 === 0) { // More frequent cleanup
            this.cleanupResources();
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error scanning page';
          const retryCount = this.pageRetryCount.get(pageNumber) || 0;
          
          console.log(`⚠️ Page ${pageNumber} scan failed: ${errorMessage} (retry ${retryCount})`);
          
          this.addError(pageNumber, `Page scan failed: ${errorMessage}`, retryCount);
          failedPages.push(pageNumber);

          // More lenient error handling - continue unless critical failure
          const isCriticalError = errorMessage.includes('not supported') || 
                                 errorMessage.includes('memory') ||
                                 errorMessage.includes('Canvas API');
          
          if (isCriticalError) {
            console.log(`❌ Critical error on page ${pageNumber}, stopping scan`);
            this.addError(pageNumber, `Critical error: ${errorMessage}`);
            break;
          }
          
          // Only stop if too many consecutive failures
          const recentFailures = failedPages.slice(-3); // Last 3 pages
          if (recentFailures.length >= 3 && recentFailures.every((p, i) => p === pageNumber - i)) {
            console.log(`❌ Too many consecutive failures, stopping scan`);
            const partialFailure = qrErrorHandler.handlePartialScanFailure(
              failedPages,
              totalPages,
              allGeneratedCTAs.length
            );
            
            this.addError(pageNumber, `Stopping scan: ${partialFailure.userMessage}`);
            break;
          }
        }
      }

      // Handle partial scan failures
      if (failedPages.length > 0) {
        const partialFailure = qrErrorHandler.handlePartialScanFailure(
          failedPages,
          totalPages,
          allGeneratedCTAs.length
        );
        
        // Add summary error for partial failure
        this.addError(0, partialFailure.userMessage);
      }

      // Mark scanning as complete
      const completedAt = new Date();
      this.updateState({
        ...this.state,
        isScanning: false,
        completedAt
      });

      if (this.currentProgress) {
        this.currentProgress.completedAt = completedAt;
        this.notifyProgress();
      }

      return allGeneratedCTAs;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown scanning error';
      
      // Handle critical scanning errors
      qrErrorHandler.handleQRError(
        QRErrorType.PROCESSING_FAILED,
        errorMessage,
        { documentId, totalPages, currentPage: this.state.currentPage }
      );
      
      this.addError(this.state.currentPage, `Scanning failed: ${errorMessage}`);
      
      this.updateState({
        ...this.state,
        isScanning: false,
        completedAt: new Date()
      });

      throw error;
    } finally {
      this.abortController = null;
      this.currentProgress = null;
    }
  }

  public pauseScanning(): void {
    if (!this.state.isScanning || this.state.isPaused) {
      return;
    }

    this.pausePromise = new Promise<void>((resolve) => {
      this.pauseResolve = resolve;
    });

    this.updateState({
      ...this.state,
      isPaused: true
    });
  }

  public resumeScanning(): void {
    if (!this.state.isPaused || !this.pauseResolve) {
      return;
    }

    this.pauseResolve();
    this.pausePromise = null;
    this.pauseResolve = null;

    this.updateState({
      ...this.state,
      isPaused: false
    });
  }

  public stopScanning(): void {
    if (!this.state.isScanning) {
      return;
    }

    if (this.abortController) {
      this.abortController.abort();
    }

    // Resume if paused to allow cleanup
    if (this.state.isPaused) {
      this.resumeScanning();
    }

    this.updateState({
      ...this.state,
      isScanning: false,
      isPaused: false,
      completedAt: new Date()
    });
  }

  public getState(): QRScanningState {
    return { ...this.state };
  }

  public getCurrentProgress(): QRScanProgress | null {
    return this.currentProgress ? { ...this.currentProgress } : null;
  }

  public onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  public onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  private updateState(newState: QRScanningState): void {
    this.state = { ...newState };
    this.notifyStateChange();
  }

  private addError(pageNumber: number, error: string, retryCount?: number): void {
    const newError = { pageNumber, error, retryCount };
    
    this.updateState({
      ...this.state,
      errors: [...this.state.errors, newError]
    });

    if (this.currentProgress) {
      this.currentProgress.errors.push(newError);
    }
  }

  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(this.getState());
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    });
  }

  private notifyProgress(): void {
    if (!this.currentProgress) return;

    this.progressCallbacks.forEach(callback => {
      try {
        callback({ ...this.currentProgress! });
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  public reset(): void {
    if (this.state.isScanning) {
      this.stopScanning();
    }

    this.state = {
      isScanning: false,
      isPaused: false,
      currentPage: 0,
      totalPages: 0,
      foundQRCodes: 0,
      generatedCTAs: 0,
      errors: [],
      performanceMetrics: {
        averagePageScanTime: 0,
        memoryUsage: 0,
        timeoutCount: 0,
        retryCount: 0
      }
    };

    this.currentProgress = null;
    this.cleanupResources();
    this.notifyStateChange();
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (!this.config.performanceMonitoring || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      this.memoryMonitor = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === 'measure' && entry.name.startsWith('qr-scan-')) {
            this.pageScanTimes.push(entry.duration);
            this.updatePerformanceMetrics();
          }
        }
      });

      this.memoryMonitor.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    if (this.pageScanTimes.length === 0) return;

    const averagePageScanTime = this.pageScanTimes.reduce((sum, time) => sum + time, 0) / this.pageScanTimes.length;
    const memoryUsage = this.getMemoryUsage();

    const performanceMetrics = {
      averagePageScanTime,
      memoryUsage,
      timeoutCount: this.state.performanceMetrics?.timeoutCount || 0,
      retryCount: this.state.performanceMetrics?.retryCount || 0
    };

    this.updateState({
      ...this.state,
      performanceMetrics
    });

    if (this.currentProgress) {
      this.currentProgress.performanceMetrics = performanceMetrics;
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }

  /**
   * Check if memory usage is within acceptable limits
   */
  private isMemoryUsageAcceptable(): boolean {
    const currentMemory = this.getMemoryUsage();
    return currentMemory < this.config.memoryThresholdMB;
  }

  /**
   * Clean up resources and cached data
   */
  private cleanupResources(): void {
    // Clear canvas cache
    this.canvasCache.clear();
    
    // Clear timeouts
    this.cleanupTimeouts.forEach(timeout => clearTimeout(timeout));
    this.cleanupTimeouts.clear();
    
    // Reset retry counts
    this.pageRetryCount.clear();
    
    // Clear performance data (keep recent samples only)
    if (this.pageScanTimes.length > 100) {
      this.pageScanTimes = this.pageScanTimes.slice(-50);
    }

    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (error) {
        // Ignore if gc is not available
      }
    }
  }

  /**
   * Scan a single page with timeout and retry logic
   */
  private async scanPageWithTimeout(
    pageNumber: number,
    getPageCanvas: (pageNumber: number) => Promise<HTMLCanvasElement>,
    userId: string,
    documentId: string
  ): Promise<CallToAction[]> {
    const measureName = `qr-scan-page-${pageNumber}`;
    
    try {
      performance.mark(`${measureName}-start`);

      // Create timeout promise with enhanced error handling
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => {
          const timeoutError = handleQRTimeoutError(pageNumber, this.config.pageTimeoutMs);
          reject(new Error(timeoutError.userMessage));
        }, this.config.pageTimeoutMs);
        
        this.cleanupTimeouts.add(timeout);
      });

      // Create scan promise
      const scanPromise = this.performPageScan(pageNumber, getPageCanvas, userId, documentId);

      // Race between scan and timeout
      const result = await Promise.race([scanPromise, timeoutPromise]);
      
      performance.mark(`${measureName}-end`);
      performance.measure(measureName, `${measureName}-start`, `${measureName}-end`);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle timeout errors
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        this.updateState({
          ...this.state,
          performanceMetrics: {
            ...this.state.performanceMetrics!,
            timeoutCount: this.state.performanceMetrics!.timeoutCount + 1
          }
        });
      }

      // Implement retry logic with enhanced error handling
      const retryCount = this.pageRetryCount.get(pageNumber) || 0;
      const isRetryable = !errorMessage.includes('timeout') && 
                         !errorMessage.includes('not supported') &&
                         !errorMessage.includes('too large');
      
      if (retryCount < this.config.maxRetries && isRetryable) {
        this.pageRetryCount.set(pageNumber, retryCount + 1);
        this.updateState({
          ...this.state,
          performanceMetrics: {
            ...this.state.performanceMetrics!,
            retryCount: this.state.performanceMetrics!.retryCount + 1
          }
        });

        // Wait before retry with exponential backoff
        const backoffMs = Math.min(Math.pow(2, retryCount) * 1000, 10000); // Max 10 seconds
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        return this.scanPageWithTimeout(pageNumber, getPageCanvas, userId, documentId);
      }

      // If not retryable or max retries reached, handle the error appropriately
      if (!isRetryable) {
        qrErrorHandler.handleQRError(
          QRErrorType.PROCESSING_FAILED,
          errorMessage,
          { pageNumber, retryCount, isRetryable: false }
        );
      }

      throw error;
    } finally {
      // Cleanup performance marks
      try {
        performance.clearMarks(`${measureName}-start`);
        performance.clearMarks(`${measureName}-end`);
        performance.clearMeasures(measureName);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Perform the actual page scan
   */
  private async performPageScan(
    pageNumber: number,
    getPageCanvas: (pageNumber: number) => Promise<HTMLCanvasElement>,
    userId: string,
    documentId: string
  ): Promise<CallToAction[]> {
    // Check memory usage before processing
    if (!this.isMemoryUsageAcceptable()) {
      this.cleanupResources();
      
      if (!this.isMemoryUsageAcceptable()) {
        throw new Error(`Memory usage too high: ${this.getMemoryUsage().toFixed(1)}MB`);
      }
    }

    // Check if we've hit the QR code limit
    if (this.state.foundQRCodes >= this.config.maxQRCodesPerDocument) {
      throw new Error(`Maximum QR codes per document reached: ${this.config.maxQRCodesPerDocument}`);
    }

    const generatedCTAs: CallToAction[] = [];

    try {
      // Get page canvas for QR scanning
      const canvas = await getPageCanvas(pageNumber);
      
      // Cache canvas for potential retry (with cleanup timeout)
      this.canvasCache.set(pageNumber, canvas);
      const cleanupTimeout = setTimeout(() => {
        this.canvasCache.delete(pageNumber);
      }, 30000); // Clean up after 30 seconds
      this.cleanupTimeouts.add(cleanupTimeout);
      
      // Scan for QR codes on this page
      const qrResults = await this.qrScanner.scanPage(canvas);
      
      if (qrResults.length > 0) {
        this.updateState({
          ...this.state,
          foundQRCodes: this.state.foundQRCodes + qrResults.length
        });

        // Process each QR code found
        for (const qrResult of qrResults) {
          try {
            // Extract page heading for CTA title
            const headings = await this.contentExtractor.extractHeadings(pageNumber, null as any);
            const bestHeading = this.contentExtractor.findBestHeadingForArea(
              headings,
              qrResult.coordinates
            );

            // Generate CTA from QR code
            const cta = this.ctaGenerator.createFromQRCode(
              qrResult,
              pageNumber,
              bestHeading,
              userId,
              documentId
            );

            generatedCTAs.push(cta);
            
            if (this.currentProgress) {
              this.currentProgress.generatedCTAs.push(cta);
              this.currentProgress.foundQRCodes.push(qrResult);
            }
            
            this.updateState({
              ...this.state,
              generatedCTAs: this.state.generatedCTAs + 1
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error processing QR code';
            this.addError(pageNumber, `QR code processing failed: ${errorMessage}`);
          }
        }
      }

      return generatedCTAs;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error scanning page';
      throw new Error(`Page ${pageNumber} scan failed: ${errorMessage}`);
    }
  }

  /**
   * Dispose of resources and cleanup
   */
  public dispose(): void {
    this.reset();
    
    if (this.memoryMonitor) {
      this.memoryMonitor.disconnect();
      this.memoryMonitor = null;
    }
    
    this.stateChangeCallbacks.clear();
    this.progressCallbacks.clear();
  }
}