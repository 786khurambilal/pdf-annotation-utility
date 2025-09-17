import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  renderWithProviders, 
  createMockPdfFile, 
  mockWindowSelection,
  PerformanceMonitor,
  createPerformanceTest,
  measureAsyncOperation,
  createMemoryLeakDetector,
  simulateSlowDevice,
  createConcurrencyTester
} from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';

describe('Comprehensive Stress Testing', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    global.URL.createObjectURL = jest.fn(() => 'mock-pdf-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock performance.now for consistent timing
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const createLargePdfFile = (pages: number = 100) => {
    const size = pages * 1024 * 10; // ~10KB per page
    return createMockPdfFile(`stress-test-${pages}pages.pdf`, size);
  };

  const setupPdfViewer = async (file?: File) => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={true} />,
      { initialUser: { id: 'stress-test-user', name: 'Stress Test User' } }
    );

    const mockFile = file || createMockPdfFile('stress-test.pdf');
    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    
    await act(async () => {
      await user.upload(fileInput, mockFile);
    });

    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    }, { timeout: 10000 });
  };

  describe('Extreme Load Testing', () => {
    it('should handle massive annotation creation with performance monitoring', 
      createPerformanceTest(
        'Massive Annotation Creation',
        async (monitor: PerformanceMonitor) => {
          await setupPdfViewer();
          const pdfPage = screen.getByTestId('pdf-page-1');

          // Create 1000 annotations
          for (let i = 0; i < 1000; i++) {
            monitor.recordOperation();
            
            mockWindowSelection(`Stress annotation ${i}`);
            fireEvent.mouseUp(pdfPage);

            await waitFor(() => {
              expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
            });

            const createButton = screen.getByRole('button', { name: /create highlight/i });
            await user.click(createButton);

            // Check progress every 100 annotations
            if (i % 100 === 0 && i > 0) {
              const highlights = screen.getAllByTestId('highlight-overlay');
              expect(highlights.length).toBeGreaterThan(i * 0.8); // Allow for some failures
            }
          }

          // Verify final state
          const finalHighlights = screen.getAllByTestId('highlight-overlay');
          expect(finalHighlights.length).toBeGreaterThan(800); // At least 80% success rate
        },
        {
          maxDuration: 300000, // 5 minutes
          maxMemoryGrowth: 200 * 1024 * 1024, // 200MB
          minOperationsPerSecond: 3, // At least 3 annotations per second
        }
      )
    );

    it('should handle concurrent multi-user simulation', async () => {
      const concurrencyTester = createConcurrencyTester();
      const userCount = 10;

      // Simulate multiple users creating annotations concurrently
      for (let userId = 0; userId < userCount; userId++) {
        concurrencyTester.addOperation(async () => {
          const { unmount } = renderWithProviders(
            <PDFViewerContainer enableVirtualization={false} />,
            { initialUser: { id: `user-${userId}`, name: `User ${userId}` } }
          );

          const mockFile = createMockPdfFile(`user-${userId}-document.pdf`);
          const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
          await user.upload(fileInput, mockFile);

          await waitFor(() => {
            expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
          });

          // Each user creates 10 annotations
          const pdfPage = screen.getByTestId('pdf-page-1');
          for (let i = 0; i < 10; i++) {
            mockWindowSelection(`User ${userId} annotation ${i}`);
            fireEvent.mouseUp(pdfPage);

            await waitFor(() => {
              expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
            });

            const createButton = screen.getByRole('button', { name: /create highlight/i });
            await user.click(createButton);
          }

          // Verify user's annotations are isolated
          const userHighlights = localStorage.getItem(`ebook-utility-user-${userId}-highlights`);
          expect(userHighlights).toBeTruthy();

          unmount();
          return { userId, annotationCount: 10 };
        });
      }

      const results = await concurrencyTester.executeAll();

      // Should have high success rate for concurrent operations
      expect(results.successRate).toBeGreaterThan(0.8); // 80% success rate
      expect(results.successful).toBeGreaterThan(userCount * 0.8);
      expect(results.duration).toBeLessThan(60000); // Complete within 1 minute
    });

    it('should detect and prevent memory leaks during intensive operations', async () => {
      const memoryDetector = createMemoryLeakDetector();
      await setupPdfViewer();

      const pdfPage = screen.getByTestId('pdf-page-1');
      
      // Take initial memory snapshot
      memoryDetector.takeSnapshot();

      // Perform memory-intensive operations in cycles
      for (let cycle = 0; cycle < 5; cycle++) {
        // Create annotations
        for (let i = 0; i < 50; i++) {
          mockWindowSelection(`Memory test cycle ${cycle} annotation ${i}`);
          fireEvent.mouseUp(pdfPage);

          await waitFor(() => {
            expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
          });

          const createButton = screen.getByRole('button', { name: /create highlight/i });
          await user.click(createButton);
        }

        // Navigate through pages
        for (let page = 1; page <= 5; page++) {
          const pageInput = screen.getByLabelText(/go to page/i);
          await user.clear(pageInput);
          await user.type(pageInput, page.toString());
          await user.keyboard('{Enter}');

          await waitFor(() => {
            expect(screen.getByText(new RegExp(`page ${page} of 5`, 'i'))).toBeInTheDocument();
          });
        }

        // Force garbage collection if available
        if ((global as any).gc) {
          (global as any).gc();
        }

        // Take memory snapshot after each cycle
        memoryDetector.takeSnapshot();
      }

      // Check for memory leaks
      const leakAnalysis = memoryDetector.detectLeak(50 * 1024 * 1024); // 50MB threshold
      
      if (leakAnalysis.isLeaking) {
        console.warn('Potential memory leak detected:', {
          growth: `${(leakAnalysis.growth / 1024 / 1024).toFixed(2)}MB`,
          growthPerSnapshot: `${(leakAnalysis.growthPerSnapshot / 1024 / 1024).toFixed(2)}MB`,
          snapshots: leakAnalysis.snapshots.map(s => `${(s / 1024 / 1024).toFixed(2)}MB`),
        });
      }

      // Should not have excessive memory growth
      expect(leakAnalysis.growth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
    });

    it('should maintain performance on slow devices', async () => {
      const restoreDevice = simulateSlowDevice(3); // 3x slower device

      try {
        const { result: setupResult, duration: setupDuration } = await measureAsyncOperation(async () => {
          await setupPdfViewer();
          return 'setup complete';
        });

        expect(setupResult).toBe('setup complete');
        expect(setupDuration).toBeLessThan(15000); // Should still load within 15 seconds on slow device

        const pdfPage = screen.getByTestId('pdf-page-1');

        // Test annotation creation on slow device
        const { duration: annotationDuration } = await measureAsyncOperation(async () => {
          for (let i = 0; i < 10; i++) {
            mockWindowSelection(`Slow device test ${i}`);
            fireEvent.mouseUp(pdfPage);

            await waitFor(() => {
              expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
            });

            const createButton = screen.getByRole('button', { name: /create highlight/i });
            await user.click(createButton);
          }
        });

        // Should complete within reasonable time even on slow device
        expect(annotationDuration).toBeLessThan(30000); // 30 seconds for 10 annotations

        // Verify annotations were created
        const highlights = screen.getAllByTestId('highlight-overlay');
        expect(highlights.length).toBeGreaterThan(8); // At least 80% success rate

      } finally {
        restoreDevice();
      }
    });
  });

  describe('Data Integrity Under Stress', () => {
    it('should maintain data consistency during rapid operations', async () => {
      await setupPdfViewer();

      const pdfPage = screen.getByTestId('pdf-page-1');
      const operationPromises = [];

      // Perform rapid concurrent operations
      for (let i = 0; i < 20; i++) {
        operationPromises.push(
          (async () => {
            // Rapid highlight creation
            mockWindowSelection(`Rapid test ${i}`);
            fireEvent.mouseUp(pdfPage);

            await waitFor(() => {
              expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
            });

            const createButton = screen.getByRole('button', { name: /create highlight/i });
            await user.click(createButton);

            return i;
          })()
        );

        operationPromises.push(
          (async () => {
            // Rapid comment creation
            fireEvent.click(pdfPage, { clientX: 200 + i * 5, clientY: 300 + i * 5 });

            await waitFor(() => {
              expect(screen.getByText(/add comment/i)).toBeInTheDocument();
            });

            const commentInput = screen.getByLabelText(/comment/i);
            await user.type(commentInput, `Rapid comment ${i}`);

            const saveButton = screen.getByRole('button', { name: /save comment/i });
            await user.click(saveButton);

            return i;
          })()
        );
      }

      // Wait for all operations to complete
      const results = await Promise.allSettled(operationPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Should have reasonable success rate
      expect(successful).toBeGreaterThan(operationPromises.length * 0.7);

      // Verify data consistency in localStorage
      const highlightData = localStorage.getItem('ebook-utility-stress-test-user-highlights');
      const commentData = localStorage.getItem('ebook-utility-stress-test-user-comments');

      expect(highlightData).toBeTruthy();
      expect(commentData).toBeTruthy();

      if (highlightData) {
        const highlights = JSON.parse(highlightData);
        expect(Array.isArray(highlights)).toBe(true);
        expect(highlights.length).toBeGreaterThan(0);
        
        // Check for data corruption
        highlights.forEach((highlight: any) => {
          expect(highlight).toHaveProperty('id');
          expect(highlight).toHaveProperty('userId');
          expect(highlight).toHaveProperty('selectedText');
        });
      }

      if (commentData) {
        const comments = JSON.parse(commentData);
        expect(Array.isArray(comments)).toBe(true);
        expect(comments.length).toBeGreaterThan(0);
        
        // Check for data corruption
        comments.forEach((comment: any) => {
          expect(comment).toHaveProperty('id');
          expect(comment).toHaveProperty('userId');
          expect(comment).toHaveProperty('content');
        });
      }
    });

    it('should handle storage corruption and recovery', async () => {
      await setupPdfViewer();

      // Create some valid annotations first
      const pdfPage = screen.getByTestId('pdf-page-1');
      
      for (let i = 0; i < 5; i++) {
        mockWindowSelection(`Pre-corruption annotation ${i}`);
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
        });

        const createButton = screen.getByRole('button', { name: /create highlight/i });
        await user.click(createButton);
      }

      // Verify initial annotations
      let highlights = screen.getAllByTestId('highlight-overlay');
      expect(highlights.length).toBe(5);

      // Corrupt the storage
      localStorage.setItem('ebook-utility-stress-test-user-highlights', 'corrupted-data-{invalid-json');
      localStorage.setItem('ebook-utility-stress-test-user-comments', 'null');
      localStorage.setItem('ebook-utility-stress-test-user-bookmarks', '{"broken": json}');

      // Try to create new annotation after corruption
      mockWindowSelection('Post-corruption annotation');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      // Should handle corruption gracefully and create new annotation
      await waitFor(() => {
        const newHighlights = screen.getAllByTestId('highlight-overlay');
        expect(newHighlights.length).toBeGreaterThan(0);
      });

      // Should show error notification about data recovery
      await waitFor(() => {
        expect(
          screen.getByText(/data recovered/i) || 
          screen.getByText(/storage error/i) ||
          screen.getByText(/data corruption/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Resource Exhaustion Testing', () => {
    it('should handle browser storage quota exhaustion', async () => {
      await setupPdfViewer();

      // Mock storage quota exceeded after some operations
      let operationCount = 0;
      const originalSetItem = localStorage.setItem;
      
      localStorage.setItem = jest.fn((key: string, value: string) => {
        operationCount++;
        if (operationCount > 10) {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError');
        }
        return originalSetItem.call(localStorage, key, value);
      });

      const pdfPage = screen.getByTestId('pdf-page-1');

      // Try to create many annotations until quota is exceeded
      for (let i = 0; i < 20; i++) {
        mockWindowSelection(`Quota test ${i}`);
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
        });

        const createButton = screen.getByRole('button', { name: /create highlight/i });
        await user.click(createButton);

        // Should show quota error after limit is reached
        if (i > 10) {
          await waitFor(() => {
            expect(
              screen.getByText(/storage limit/i) ||
              screen.getByText(/quota exceeded/i) ||
              screen.getByText(/storage full/i)
            ).toBeInTheDocument();
          });
          break;
        }
      }

      // Restore original function
      localStorage.setItem = originalSetItem;
    });

    it('should handle extreme CPU load gracefully', async () => {
      await setupPdfViewer();

      // Create CPU-intensive background task
      const cpuIntensiveTask = () => {
        const start = Date.now();
        while (Date.now() - start < 100) {
          // Busy wait to simulate CPU load
          Math.random() * Math.random();
        }
      };

      const cpuLoadInterval = setInterval(cpuIntensiveTask, 50);

      try {
        const pdfPage = screen.getByTestId('pdf-page-1');
        const startTime = performance.now();

        // Perform operations under CPU load
        for (let i = 0; i < 10; i++) {
          mockWindowSelection(`CPU load test ${i}`);
          fireEvent.mouseUp(pdfPage);

          await waitFor(() => {
            expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
          });

          const createButton = screen.getByRole('button', { name: /create highlight/i });
          await user.click(createButton);

          // Simulate additional CPU load
          cpuIntensiveTask();
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete within reasonable time despite CPU load
        expect(duration).toBeLessThan(30000); // 30 seconds

        // Verify annotations were created
        const highlights = screen.getAllByTestId('highlight-overlay');
        expect(highlights.length).toBeGreaterThan(7); // At least 70% success rate

      } finally {
        clearInterval(cpuLoadInterval);
      }
    });
  });
});