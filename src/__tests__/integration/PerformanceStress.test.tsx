import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile, mockWindowSelection } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';

describe('Performance and Stress Testing Integration', () => {
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
    // Create a larger mock file to simulate a big PDF
    const size = pages * 1024 * 10; // ~10KB per page
    return createMockPdfFile(`large-document-${pages}pages.pdf`, size);
  };

  const setupPdfViewer = async (file?: File) => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={true} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    const mockFile = file || createMockPdfFile('performance-test.pdf');
    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    
    await act(async () => {
      await user.upload(fileInput, mockFile);
    });

    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    }, { timeout: 10000 });
  };

  describe('Large PDF File Handling', () => {
    it('should handle large PDF files efficiently', async () => {
      const largeFile = createLargePdfFile(50); // 50 pages
      const startTime = performance.now();

      await setupPdfViewer(largeFile);

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load within reasonable time even for large files
      expect(loadTime).toBeLessThan(15000); // 15 seconds

      // Should show correct page count
      expect(screen.getByText(/page 1 of 50/i)).toBeInTheDocument();
    });

    it('should implement page virtualization for large documents', async () => {
      const largeFile = createLargePdfFile(100); // 100 pages
      await setupPdfViewer(largeFile);

      // Should only render visible pages
      const renderedPages = document.querySelectorAll('[data-testid^="pdf-page-"]');
      expect(renderedPages.length).toBeLessThanOrEqual(5); // Only a few pages should be rendered

      // Navigate to middle of document
      const pageInput = screen.getByLabelText(/go to page/i);
      await user.clear(pageInput);
      await user.type(pageInput, '50');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/page 50 of 100/i)).toBeInTheDocument();
      });

      // Should still have limited rendered pages
      const newRenderedPages = document.querySelectorAll('[data-testid^="pdf-page-"]');
      expect(newRenderedPages.length).toBeLessThanOrEqual(5);
    });

    it('should handle memory cleanup when navigating through large documents', async () => {
      const largeFile = createLargePdfFile(50);
      await setupPdfViewer(largeFile);

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Navigate through many pages quickly
      for (let i = 1; i <= 20; i++) {
        const pageInput = screen.getByLabelText(/go to page/i);
        await user.clear(pageInput);
        await user.type(pageInput, i.toString());
        await user.keyboard('{Enter}');

        await waitFor(() => {
          expect(screen.getByText(new RegExp(`page ${i} of 50`, 'i'))).toBeInTheDocument();
        });
      }

      // Memory should not grow excessively
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      }
    });
  });

  describe('High Annotation Count Performance', () => {
    it('should handle many annotations efficiently', async () => {
      await setupPdfViewer();

      const startTime = performance.now();
      const pdfPage = screen.getByTestId('pdf-page-1');

      // Create 50 highlights
      for (let i = 0; i < 50; i++) {
        mockWindowSelection(`Highlight text ${i}`);
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
        });

        const createButton = screen.getByRole('button', { name: /create highlight/i });
        await user.click(createButton);

        // Don't wait for each individual highlight to appear to speed up test
        if (i % 10 === 0) {
          await waitFor(() => {
            expect(screen.getAllByTestId('highlight-overlay').length).toBeGreaterThan(i);
          });
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds

      // All highlights should be rendered
      await waitFor(() => {
        expect(screen.getAllByTestId('highlight-overlay')).toHaveLength(50);
      });
    });

    it('should maintain performance with mixed annotation types', async () => {
      await setupPdfViewer();

      const startTime = performance.now();
      const pdfPage = screen.getByTestId('pdf-page-1');

      // Create mix of annotations
      for (let i = 0; i < 20; i++) {
        // Create highlight
        mockWindowSelection(`Highlight ${i}`);
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
        });

        const createHighlightButton = screen.getByRole('button', { name: /create highlight/i });
        await user.click(createHighlightButton);

        // Create comment
        fireEvent.click(pdfPage, { clientX: 100 + i * 10, clientY: 200 + i * 10 });

        await waitFor(() => {
          expect(screen.getByText(/add comment/i)).toBeInTheDocument();
        });

        const commentInput = screen.getByLabelText(/comment/i);
        await user.type(commentInput, `Comment ${i}`);

        const saveCommentButton = screen.getByRole('button', { name: /save comment/i });
        await user.click(saveCommentButton);

        // Create bookmark every 5th iteration
        if (i % 5 === 0) {
          const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
          await user.click(bookmarkButton);

          await waitFor(() => {
            expect(screen.getByLabelText(/bookmark title/i)).toBeInTheDocument();
          });

          const titleInput = screen.getByLabelText(/bookmark title/i);
          await user.type(titleInput, `Bookmark ${i}`);

          const saveBookmarkButton = screen.getByRole('button', { name: /save bookmark/i });
          await user.click(saveBookmarkButton);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(45000); // 45 seconds

      // Verify all annotations are present
      await waitFor(() => {
        expect(screen.getAllByTestId('highlight-overlay')).toHaveLength(20);
        expect(screen.getAllByTestId('comment-marker')).toHaveLength(20);
      });
    });

    it('should efficiently render annotations when zooming', async () => {
      await setupPdfViewer();

      // Create several annotations first
      const pdfPage = screen.getByTestId('pdf-page-1');
      for (let i = 0; i < 10; i++) {
        mockWindowSelection(`Zoom test ${i}`);
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
        });

        const createButton = screen.getByRole('button', { name: /create highlight/i });
        await user.click(createButton);
      }

      await waitFor(() => {
        expect(screen.getAllByTestId('highlight-overlay')).toHaveLength(10);
      });

      const startTime = performance.now();

      // Test zoom performance
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      
      // Zoom in multiple times
      for (let i = 0; i < 5; i++) {
        await user.click(zoomInButton);
        await waitFor(() => {
          expect(screen.getByText(/\d+%/)).toBeInTheDocument();
        });
      }

      // Zoom out multiple times
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      for (let i = 0; i < 5; i++) {
        await user.click(zoomOutButton);
        await waitFor(() => {
          expect(screen.getByText(/\d+%/)).toBeInTheDocument();
        });
      }

      const endTime = performance.now();
      const zoomTime = endTime - startTime;

      // Zoom operations should be fast
      expect(zoomTime).toBeLessThan(5000); // 5 seconds

      // All annotations should still be visible and properly positioned
      expect(screen.getAllByTestId('highlight-overlay')).toHaveLength(10);
    });
  });

  describe('Concurrent User Scenarios', () => {
    it('should handle rapid user interactions', async () => {
      await setupPdfViewer();

      const pdfPage = screen.getByTestId('pdf-page-1');
      const startTime = performance.now();

      // Simulate rapid user interactions
      const interactions = [];

      for (let i = 0; i < 20; i++) {
        interactions.push(
          // Rapid clicking
          user.click(pdfPage),
          // Rapid navigation
          user.click(screen.getByRole('button', { name: /next page/i })),
          user.click(screen.getByRole('button', { name: /previous page/i })),
          // Rapid zoom
          user.click(screen.getByRole('button', { name: /zoom in/i })),
          user.click(screen.getByRole('button', { name: /zoom out/i }))
        );
      }

      // Execute all interactions concurrently
      await Promise.all(interactions);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid interactions without crashing
      expect(totalTime).toBeLessThan(10000); // 10 seconds
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });

    it('should maintain data consistency under stress', async () => {
      await setupPdfViewer();

      const pdfPage = screen.getByTestId('pdf-page-1');

      // Create annotations rapidly
      const annotationPromises = [];

      for (let i = 0; i < 10; i++) {
        annotationPromises.push(
          (async () => {
            mockWindowSelection(`Stress test ${i}`);
            fireEvent.mouseUp(pdfPage);

            await waitFor(() => {
              expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
            });

            const createButton = screen.getByRole('button', { name: /create highlight/i });
            await user.click(createButton);
          })()
        );
      }

      // Wait for all annotations to be created
      await Promise.allSettled(annotationPromises);

      // Verify data consistency
      await waitFor(() => {
        const highlights = screen.getAllByTestId('highlight-overlay');
        expect(highlights.length).toBeGreaterThan(0);
        expect(highlights.length).toBeLessThanOrEqual(10);
      });

      // Verify localStorage consistency
      const highlightData = localStorage.getItem('ebook-utility-test-user-highlights');
      expect(highlightData).toBeTruthy();
      
      if (highlightData) {
        const highlights = JSON.parse(highlightData);
        expect(Array.isArray(highlights)).toBe(true);
        expect(highlights.length).toBeGreaterThan(0);
      }
    });

    it('should handle multiple concurrent annotation operations', async () => {
      await setupPdfViewer();

      const pdfPage = screen.getByTestId('pdf-page-1');
      const operations = [];

      // Simulate concurrent operations of different types
      for (let i = 0; i < 5; i++) {
        // Concurrent highlights
        operations.push(
          (async () => {
            mockWindowSelection(`Concurrent highlight ${i}`);
            fireEvent.mouseUp(pdfPage);
            await waitFor(() => {
              expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
            });
            const createButton = screen.getByRole('button', { name: /create highlight/i });
            await user.click(createButton);
          })()
        );

        // Concurrent comments
        operations.push(
          (async () => {
            fireEvent.click(pdfPage, { clientX: 150 + i * 20, clientY: 250 + i * 20 });
            await waitFor(() => {
              expect(screen.getByText(/add comment/i)).toBeInTheDocument();
            });
            const commentInput = screen.getByLabelText(/comment/i);
            await user.type(commentInput, `Concurrent comment ${i}`);
            const saveButton = screen.getByRole('button', { name: /save comment/i });
            await user.click(saveButton);
          })()
        );

        // Concurrent bookmarks
        if (i % 2 === 0) {
          operations.push(
            (async () => {
              const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
              await user.click(bookmarkButton);
              await waitFor(() => {
                expect(screen.getByLabelText(/bookmark title/i)).toBeInTheDocument();
              });
              const titleInput = screen.getByLabelText(/bookmark title/i);
              await user.type(titleInput, `Concurrent bookmark ${i}`);
              const saveBookmarkButton = screen.getByRole('button', { name: /save bookmark/i });
              await user.click(saveBookmarkButton);
            })()
          );
        }
      }

      // Execute all operations concurrently
      const results = await Promise.allSettled(operations);

      // Most operations should succeed
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      expect(successful).toBeGreaterThan(failed);
      expect(successful).toBeGreaterThan(operations.length * 0.7); // At least 70% success rate
    });

    it('should isolate data between different users', async () => {
      // Test user 1
      const { unmount: unmount1 } = renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'user-1', name: 'User One' } }
      );

      const mockFile1 = createMockPdfFile('isolation-test.pdf');
      const fileInput1 = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput1, mockFile1);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Create annotation for user 1
      const pdfPage1 = screen.getByTestId('pdf-page-1');
      mockWindowSelection('User 1 highlight');
      fireEvent.mouseUp(pdfPage1);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      const createButton1 = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton1);

      await waitFor(() => {
        expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      });

      // Verify user 1's data is stored
      const user1Data = localStorage.getItem('ebook-utility-user-1-highlights');
      expect(user1Data).toBeTruthy();

      unmount1();

      // Test user 2 with same document
      const { unmount: unmount2 } = renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'user-2', name: 'User Two' } }
      );

      const mockFile2 = createMockPdfFile('isolation-test.pdf');
      const fileInput2 = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput2, mockFile2);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // User 2 should not see user 1's annotations
      expect(screen.queryByTestId('highlight-overlay')).not.toBeInTheDocument();

      // Create annotation for user 2
      const pdfPage2 = screen.getByTestId('pdf-page-1');
      mockWindowSelection('User 2 highlight');
      fireEvent.mouseUp(pdfPage2);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      const createButton2 = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton2);

      await waitFor(() => {
        expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      });

      // Verify user 2's data is stored separately
      const user2Data = localStorage.getItem('ebook-utility-user-2-highlights');
      expect(user2Data).toBeTruthy();

      // Verify data isolation
      expect(user1Data).not.toEqual(user2Data);

      unmount2();
    });

    it('should handle race conditions in annotation updates', async () => {
      await setupPdfViewer();

      const pdfPage = screen.getByTestId('pdf-page-1');

      // Create initial annotation
      mockWindowSelection('Race condition test');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      });

      // Simulate concurrent updates to the same annotation
      const highlight = screen.getByTestId('highlight-overlay');
      const updatePromises = [];

      for (let i = 0; i < 5; i++) {
        updatePromises.push(
          (async () => {
            fireEvent.click(highlight);
            await waitFor(() => {
              expect(screen.getByText(/edit highlight/i)).toBeInTheDocument();
            });
            
            // Try to update color
            const colorButton = screen.getByRole('button', { name: /yellow/i });
            await user.click(colorButton);
            
            const saveButton = screen.getByRole('button', { name: /save/i });
            await user.click(saveButton);
          })()
        );
      }

      // Execute concurrent updates
      const results = await Promise.allSettled(updatePromises);

      // Should handle race conditions gracefully
      const successful = results.filter(result => result.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(0);

      // Final state should be consistent
      expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
    });

    it('should maintain performance under concurrent load', async () => {
      await setupPdfViewer();

      const startTime = performance.now();
      const pdfPage = screen.getByTestId('pdf-page-1');

      // Simulate high concurrent load
      const loadPromises = [];

      // Navigation load
      for (let i = 0; i < 10; i++) {
        loadPromises.push(
          (async () => {
            const nextButton = screen.getByRole('button', { name: /next page/i });
            await user.click(nextButton);
            const prevButton = screen.getByRole('button', { name: /previous page/i });
            await user.click(prevButton);
          })()
        );
      }

      // Annotation load
      for (let i = 0; i < 15; i++) {
        loadPromises.push(
          (async () => {
            mockWindowSelection(`Load test ${i}`);
            fireEvent.mouseUp(pdfPage);
            await waitFor(() => {
              expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
            });
            const createButton = screen.getByRole('button', { name: /create highlight/i });
            await user.click(createButton);
          })()
        );
      }

      // Zoom load
      for (let i = 0; i < 5; i++) {
        loadPromises.push(
          (async () => {
            const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
            await user.click(zoomInButton);
            const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
            await user.click(zoomOutButton);
          })()
        );
      }

      // Execute all load operations
      await Promise.allSettled(loadPromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time under load
      expect(totalTime).toBeLessThan(30000); // 30 seconds

      // Application should remain functional
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources when component unmounts', async () => {
      const { unmount } = renderWithProviders(
        <PDFViewerContainer enableVirtualization={true} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('cleanup-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Create some annotations
      const pdfPage = screen.getByTestId('pdf-page-1');
      mockWindowSelection('Cleanup test');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      // Unmount component
      unmount();

      // Verify cleanup
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should handle storage quota limits gracefully', async () => {
      await setupPdfViewer();

      // Mock storage quota exceeded
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const pdfPage = screen.getByTestId('pdf-page-1');
      mockWindowSelection('Quota test');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      // Should show error message about storage
      await waitFor(() => {
        expect(screen.getByText(/storage limit exceeded/i)).toBeInTheDocument();
      });

      // Restore original function
      localStorage.setItem = originalSetItem;
    });

    it('should monitor memory usage during intensive operations', async () => {
      await setupPdfViewer();

      // Track memory usage if available
      const getMemoryUsage = () => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      };

      const initialMemory = getMemoryUsage();
      const pdfPage = screen.getByTestId('pdf-page-1');

      // Create many annotations to stress memory
      for (let i = 0; i < 100; i++) {
        mockWindowSelection(`Memory test ${i}`);
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
        });

        const createButton = screen.getByRole('button', { name: /create highlight/i });
        await user.click(createButton);

        // Check memory every 25 annotations
        if (i % 25 === 0) {
          const currentMemory = getMemoryUsage();
          if (initialMemory > 0 && currentMemory > 0) {
            const memoryGrowth = currentMemory - initialMemory;
            // Memory growth should be reasonable (less than 100MB)
            expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
          }
        }
      }

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }

      const finalMemory = getMemoryUsage();
      if (initialMemory > 0 && finalMemory > 0) {
        const totalGrowth = finalMemory - initialMemory;
        // Total memory growth should be reasonable
        expect(totalGrowth).toBeLessThan(150 * 1024 * 1024); // Less than 150MB
      }
    });

    it('should handle memory pressure gracefully', async () => {
      await setupPdfViewer();

      // Simulate memory pressure by creating large objects
      const largeObjects: any[] = [];
      
      try {
        // Create large objects to simulate memory pressure
        for (let i = 0; i < 10; i++) {
          largeObjects.push(new Array(1000000).fill(`memory-pressure-${i}`));
        }

        const pdfPage = screen.getByTestId('pdf-page-1');
        mockWindowSelection('Memory pressure test');
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
        });

        const createButton = screen.getByRole('button', { name: /create highlight/i });
        await user.click(createButton);

        // Application should still function under memory pressure
        await waitFor(() => {
          expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
        });

      } finally {
        // Clean up large objects
        largeObjects.length = 0;
      }
    });

    it('should clean up event listeners and timers', async () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderWithProviders(
        <PDFViewerContainer enableVirtualization={true} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('event-cleanup-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      const initialEventListeners = addEventListenerSpy.mock.calls.length;
      const initialTimeouts = setTimeoutSpy.mock.calls.length;

      // Unmount component
      unmount();

      // Should clean up event listeners
      expect(removeEventListenerSpy).toHaveBeenCalled();
      
      // Should clean up timers (if any were created)
      if (initialTimeouts > 0) {
        expect(clearTimeoutSpy).toHaveBeenCalled();
      }

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Network and Loading Performance', () => {
    it('should handle slow PDF loading gracefully', async () => {
      // Mock slow PDF loading
      global.URL.createObjectURL = jest.fn(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('mock-pdf-url'), 2000);
        }) as any;
      });

      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('slow-loading.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      
      const startTime = performance.now();
      await user.upload(fileInput, mockFile);

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Should eventually load
      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      }, { timeout: 10000 });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should provide feedback during loading
      expect(loadTime).toBeGreaterThan(1000); // Ensure it actually took time
    });

    it('should maintain responsiveness during heavy operations', async () => {
      await setupPdfViewer();

      const startTime = performance.now();

      // Perform heavy operation (creating many annotations)
      const pdfPage = screen.getByTestId('pdf-page-1');
      
      for (let i = 0; i < 30; i++) {
        mockWindowSelection(`Heavy operation ${i}`);
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
        });

        const createButton = screen.getByRole('button', { name: /create highlight/i });
        await user.click(createButton);

        // Check that UI remains responsive every 10 iterations
        if (i % 10 === 0) {
          const navigationButton = screen.getByRole('button', { name: /next page/i });
          expect(navigationButton).not.toBeDisabled();
          
          // Verify we can still interact with the UI
          await user.click(navigationButton);
          await waitFor(() => {
            expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
          });

          const prevButton = screen.getByRole('button', { name: /previous page/i });
          await user.click(prevButton);
          await waitFor(() => {
            expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
          });
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time while maintaining responsiveness
      expect(totalTime).toBeLessThan(60000); // 1 minute
    });
  });

  describe('Extreme Stress Testing', () => {
    it('should handle extremely large annotation datasets', async () => {
      await setupPdfViewer();

      const pdfPage = screen.getByTestId('pdf-page-1');
      const startTime = performance.now();

      // Create an extreme number of annotations
      for (let i = 0; i < 500; i++) {
        mockWindowSelection(`Extreme test ${i}`);
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
        });

        const createButton = screen.getByRole('button', { name: /create highlight/i });
        await user.click(createButton);

        // Check performance every 100 annotations
        if (i % 100 === 0 && i > 0) {
          const currentTime = performance.now();
          const elapsedTime = currentTime - startTime;
          
          // Performance should not degrade significantly
          const avgTimePerAnnotation = elapsedTime / (i + 1);
          expect(avgTimePerAnnotation).toBeLessThan(1000); // Less than 1 second per annotation on average
          
          // UI should remain responsive
          const nextButton = screen.getByRole('button', { name: /next page/i });
          expect(nextButton).not.toBeDisabled();
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(300000); // 5 minutes

      // Verify all annotations are accessible
      const highlights = screen.getAllByTestId('highlight-overlay');
      expect(highlights.length).toBeGreaterThan(400); // Allow for some failures
    });

    it('should handle rapid page switching with many annotations', async () => {
      const largeFile = createLargePdfFile(20);
      await setupPdfViewer(largeFile);

      const pdfPage = screen.getByTestId('pdf-page-1');

      // Create annotations on multiple pages
      for (let page = 1; page <= 5; page++) {
        // Navigate to page
        const pageInput = screen.getByLabelText(/go to page/i);
        await user.clear(pageInput);
        await user.type(pageInput, page.toString());
        await user.keyboard('{Enter}');

        await waitFor(() => {
          expect(screen.getByText(new RegExp(`page ${page} of 20`, 'i'))).toBeInTheDocument();
        });

        // Create annotations on this page
        for (let i = 0; i < 10; i++) {
          mockWindowSelection(`Page ${page} annotation ${i}`);
          fireEvent.mouseUp(pdfPage);

          await waitFor(() => {
            expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
          });

          const createButton = screen.getByRole('button', { name: /create highlight/i });
          await user.click(createButton);
        }
      }

      const startTime = performance.now();

      // Rapidly switch between pages
      for (let i = 0; i < 50; i++) {
        const targetPage = (i % 5) + 1;
        const pageInput = screen.getByLabelText(/go to page/i);
        await user.clear(pageInput);
        await user.type(pageInput, targetPage.toString());
        await user.keyboard('{Enter}');

        await waitFor(() => {
          expect(screen.getByText(new RegExp(`page ${targetPage} of 20`, 'i'))).toBeInTheDocument();
        });

        // Verify annotations are loaded correctly
        const highlights = screen.getAllByTestId('highlight-overlay');
        expect(highlights.length).toBeGreaterThan(0);
      }

      const endTime = performance.now();
      const switchTime = endTime - startTime;

      // Page switching should remain fast
      expect(switchTime).toBeLessThan(25000); // 25 seconds for 50 switches
    });

    it('should handle storage corruption gracefully', async () => {
      await setupPdfViewer();

      // Corrupt localStorage data
      localStorage.setItem('ebook-utility-test-user-highlights', 'invalid-json-data');
      localStorage.setItem('ebook-utility-test-user-comments', '{"corrupted": true');
      localStorage.setItem('ebook-utility-test-user-bookmarks', 'null');

      const pdfPage = screen.getByTestId('pdf-page-1');

      // Should handle corrupted data gracefully
      mockWindowSelection('Corruption test');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      // Should create new annotation despite corruption
      await waitFor(() => {
        expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      });

      // Should show error notification about data recovery
      await waitFor(() => {
        expect(screen.getByText(/data recovered/i) || screen.getByText(/storage error/i)).toBeInTheDocument();
      });
    });

    it('should handle browser resource limits', async () => {
      await setupPdfViewer();

      // Mock browser resource constraints
      const originalRequestAnimationFrame = window.requestAnimationFrame;
      let frameCount = 0;
      
      window.requestAnimationFrame = jest.fn((callback) => {
        frameCount++;
        // Simulate frame drops under stress
        if (frameCount % 3 === 0) {
          return setTimeout(callback, 50); // Delayed frame
        }
        return originalRequestAnimationFrame(callback);
      });

      const pdfPage = screen.getByTestId('pdf-page-1');
      const startTime = performance.now();

      // Perform operations under simulated resource constraints
      for (let i = 0; i < 20; i++) {
        mockWindowSelection(`Resource test ${i}`);
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
        });

        const createButton = screen.getByRole('button', { name: /create highlight/i });
        await user.click(createButton);

        // Simulate zoom operations
        const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
        await user.click(zoomInButton);
        
        const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
        await user.click(zoomOutButton);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete despite resource constraints
      expect(totalTime).toBeLessThan(45000); // 45 seconds

      // Application should remain functional
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      expect(screen.getAllByTestId('highlight-overlay').length).toBeGreaterThan(15);

      // Restore original function
      window.requestAnimationFrame = originalRequestAnimationFrame;
    });

    it('should handle edge case user interactions', async () => {
      await setupPdfViewer();

      const pdfPage = screen.getByTestId('pdf-page-1');

      // Test rapid selection and deselection
      for (let i = 0; i < 10; i++) {
        mockWindowSelection(`Rapid selection ${i}`);
        fireEvent.mouseUp(pdfPage);
        
        // Immediately clear selection
        mockWindowSelection('');
        fireEvent.mouseDown(pdfPage);
        fireEvent.mouseUp(pdfPage);
      }

      // Test overlapping selections
      mockWindowSelection('Overlapping text selection');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      // Create first highlight
      const createButton1 = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton1);

      await waitFor(() => {
        expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      });

      // Try to create overlapping highlight
      mockWindowSelection('Overlapping text');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      const createButton2 = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton2);

      // Should handle overlapping annotations gracefully
      const highlights = screen.getAllByTestId('highlight-overlay');
      expect(highlights.length).toBeGreaterThanOrEqual(1);

      // Test rapid zoom changes
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });

      for (let i = 0; i < 10; i++) {
        await user.click(zoomInButton);
        await user.click(zoomOutButton);
      }

      // Annotations should remain visible and positioned correctly
      expect(screen.getAllByTestId('highlight-overlay').length).toBeGreaterThanOrEqual(1);
    });
  });
});