/**
 * Performance monitoring utilities for testing
 */

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: {
    initial: number;
    final: number;
    peak: number;
    growth: number;
  };
  frameRate?: number;
  operationsPerSecond?: number;
}

export class PerformanceMonitor {
  private startTime: number = 0;
  private endTime: number = 0;
  private initialMemory: number = 0;
  private peakMemory: number = 0;
  private frameCount: number = 0;
  private operationCount: number = 0;
  private isMonitoring: boolean = false;
  private memoryCheckInterval?: NodeJS.Timeout;
  private frameCheckInterval?: NodeJS.Timeout;

  start(): void {
    this.startTime = performance.now();
    this.initialMemory = this.getMemoryUsage();
    this.peakMemory = this.initialMemory;
    this.frameCount = 0;
    this.operationCount = 0;
    this.isMonitoring = true;

    // Monitor memory usage periodically
    this.memoryCheckInterval = setInterval(() => {
      const currentMemory = this.getMemoryUsage();
      if (currentMemory > this.peakMemory) {
        this.peakMemory = currentMemory;
      }
    }, 100);

    // Monitor frame rate
    this.frameCheckInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.frameCount++;
      }
    }, 16.67); // ~60fps
  }

  stop(): PerformanceMetrics {
    this.endTime = performance.now();
    this.isMonitoring = false;

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
    if (this.frameCheckInterval) {
      clearInterval(this.frameCheckInterval);
    }

    const duration = this.endTime - this.startTime;
    const finalMemory = this.getMemoryUsage();

    return {
      startTime: this.startTime,
      endTime: this.endTime,
      duration,
      memoryUsage: {
        initial: this.initialMemory,
        final: finalMemory,
        peak: this.peakMemory,
        growth: finalMemory - this.initialMemory,
      },
      frameRate: this.frameCount / (duration / 1000),
      operationsPerSecond: this.operationCount / (duration / 1000),
    };
  }

  recordOperation(): void {
    this.operationCount++;
  }

  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }
}

export const createPerformanceTest = (
  testName: string,
  testFn: (monitor: PerformanceMonitor) => Promise<void>,
  thresholds: {
    maxDuration?: number;
    maxMemoryGrowth?: number;
    minFrameRate?: number;
    minOperationsPerSecond?: number;
  } = {}
) => {
  return async () => {
    const monitor = new PerformanceMonitor();
    monitor.start();

    try {
      await testFn(monitor);
    } finally {
      const metrics = monitor.stop();

      // Log performance metrics
      console.log(`Performance Test: ${testName}`, {
        duration: `${metrics.duration.toFixed(2)}ms`,
        memoryGrowth: metrics.memoryUsage ? `${(metrics.memoryUsage.growth / 1024 / 1024).toFixed(2)}MB` : 'N/A',
        frameRate: metrics.frameRate ? `${metrics.frameRate.toFixed(2)}fps` : 'N/A',
        operationsPerSecond: metrics.operationsPerSecond ? `${metrics.operationsPerSecond.toFixed(2)}ops/s` : 'N/A',
      });

      // Assert against thresholds
      if (thresholds.maxDuration && metrics.duration > thresholds.maxDuration) {
        throw new Error(`Test exceeded maximum duration: ${metrics.duration}ms > ${thresholds.maxDuration}ms`);
      }

      if (thresholds.maxMemoryGrowth && metrics.memoryUsage && metrics.memoryUsage.growth > thresholds.maxMemoryGrowth) {
        throw new Error(`Test exceeded maximum memory growth: ${metrics.memoryUsage.growth} bytes > ${thresholds.maxMemoryGrowth} bytes`);
      }

      if (thresholds.minFrameRate && metrics.frameRate && metrics.frameRate < thresholds.minFrameRate) {
        throw new Error(`Test fell below minimum frame rate: ${metrics.frameRate}fps < ${thresholds.minFrameRate}fps`);
      }

      if (thresholds.minOperationsPerSecond && metrics.operationsPerSecond && metrics.operationsPerSecond < thresholds.minOperationsPerSecond) {
        throw new Error(`Test fell below minimum operations per second: ${metrics.operationsPerSecond}ops/s < ${thresholds.minOperationsPerSecond}ops/s`);
      }

      return metrics;
    }
  };
};

export const measureAsyncOperation = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number; memoryGrowth: number }> => {
  const startTime = performance.now();
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

  const result = await operation();

  const endTime = performance.now();
  const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

  return {
    result,
    duration: endTime - startTime,
    memoryGrowth: finalMemory - initialMemory,
  };
};

export const createMemoryLeakDetector = () => {
  const snapshots: number[] = [];

  return {
    takeSnapshot: () => {
      const usage = (performance as any).memory?.usedJSHeapSize || 0;
      snapshots.push(usage);
      return usage;
    },

    detectLeak: (threshold: number = 10 * 1024 * 1024) => { // 10MB default
      if (snapshots.length < 2) {
        throw new Error('Need at least 2 snapshots to detect memory leaks');
      }

      const growth = snapshots[snapshots.length - 1] - snapshots[0];
      const isLeaking = growth > threshold;

      return {
        isLeaking,
        growth,
        snapshots: [...snapshots],
        growthPerSnapshot: snapshots.length > 1 ? growth / (snapshots.length - 1) : 0,
      };
    },

    reset: () => {
      snapshots.length = 0;
    },
  };
};

export const simulateSlowDevice = (slowdownFactor: number = 2) => {
  const originalSetTimeout = global.setTimeout;
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  global.setTimeout = ((callback: Function, delay: number = 0) => {
    return originalSetTimeout(callback, delay * slowdownFactor);
  }) as any;

  global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return originalSetTimeout(callback, 16.67 * slowdownFactor); // Slower frame rate
  };

  return () => {
    global.setTimeout = originalSetTimeout;
    global.requestAnimationFrame = originalRequestAnimationFrame;
  };
};

export const createConcurrencyTester = () => {
  const operations: Promise<any>[] = [];
  const results: any[] = [];
  const errors: Error[] = [];

  return {
    addOperation: <T>(operation: () => Promise<T>) => {
      const promise = operation()
        .then(result => {
          results.push(result);
          return result;
        })
        .catch(error => {
          errors.push(error);
          throw error;
        });
      
      operations.push(promise);
      return promise;
    },

    executeAll: async () => {
      const startTime = performance.now();
      const settledResults = await Promise.allSettled(operations);
      const endTime = performance.now();

      const successful = settledResults.filter(r => r.status === 'fulfilled').length;
      const failed = settledResults.filter(r => r.status === 'rejected').length;

      return {
        duration: endTime - startTime,
        total: operations.length,
        successful,
        failed,
        successRate: successful / operations.length,
        results,
        errors,
      };
    },

    reset: () => {
      operations.length = 0;
      results.length = 0;
      errors.length = 0;
    },
  };
};