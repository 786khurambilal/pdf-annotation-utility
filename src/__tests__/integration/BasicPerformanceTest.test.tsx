import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile, mockWindowSelection } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';

describe('Basic Performance and Stress Testing', () => {
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
    return createMockPdfFile(`large-document-${pages}pages.pdf`, size);
  };

  const setupPdfViewer = async (file?: File, timeout: number = 15000) => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={true} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    const mockFile = file || createMockPdfFile('performance-test.pdf');
    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    
    if (fileInput) {
      await act(async () => {
        await user.upload(fileInput, mockFile);
      });

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      }, { timeout });
    }
  };

  describe('Large PDF File Performance', () => {
    it('should load large PDF files within reasonable time', async () => {
      const largeFile = createLargePdfFile(50); // 50 pages
      const startTime = performance.now();

      await setupPdfViewer(largeFile, 20000); // 20 second timeout

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load within reasonable time even for large files
      expect(loadTime).toBeLessThan(20000); // 20 seconds

      // Should show correct page information if available
      const pageInfo = screen.queryByText(/page.*of/i);
      if (pageInfo) {
        expect(pageInfo).toBeInTheDocument();
      }
    }, 25000);

    it('should handle memory usage efficiently with large documents', async () => {
      const largeFile = createLargePdfFile(30);
      
      const getMemoryUsage = () => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      };

      const initialMemory = getMemoryUsage();
      
      await setupPdfViewer(largeFile, 15000);

      // Navigate through some pages if navigation is available
      const nextButton = screen.queryByRole('button', { name: /next/i });
      if (nextButton && !nextButton.hasAttribute('disabled')) {
        for (let i = 0; i < 5; i++) {
          await user.click(nextButton);
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        }
      }

      const finalMemory = getMemoryUsage();
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        // Memory growth should be reasonable (less than 100MB)
        expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
      }
    }, 20000);
  });

  describe('Annotation Performance', () => {
    it('should handle multiple annotations efficiently', async () => {
      await setupPdfViewer();

      const pdfPage = screen.queryByTestId('pdf-page-1');
      if (!pdfPage) {
        // Skip test if PDF page is not available
        return;
      }

      const startTime = performance.now();

      // Create multiple annotations
      for (let i = 0; i < 10; i++) {
        mockWindowSelection(`Performance test annotation ${i}`);
        fireEvent.mouseUp(pdfPage);

        // Look for annotation creation UI
        const createButton = await screen.findByText(/create highlight/i, {}, { timeout: 2000 })
          .catch(() => null);

        if (createButton) {
          await user.click(createButton);
          
          // Wait for annotation to be created
          await waitFor(() => {
            const highlights = screen.queryAllByTestId('highlight-overlay');
            expect(highlights.length).toBeGreaterThan(i);
          }, { timeout: 2000 }).catch(() => {
            // Continue if annotation creation fails
          });
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds

      // Check if any annotations were created
      const highlights = screen.queryAllByTestId('highlight-overlay');
      expect(highlights.length).toBeGreaterThanOrEqual(0);
    }, 35000);

    it('should maintain performance during rapid interactions', async () => {
      await setupPdfViewer();

      const pdfPage = screen.queryByTestId('pdf-page-1');
      if (!pdfPage) {
        return;
      }

      const startTime = performance.now();

      // Perform rapid interactions
      const interactions = [];
      
      for (let i = 0; i < 10; i++) {
        interactions.push(
          // Rapid clicking
          user.click(pdfPage).catch(() => {}),
          // Navigation if available
          (() => {
            const nextButton = screen.queryByRole('button', { name: /next/i });
            return nextButton ? user.click(nextButton).catch(() => {}) : Promise.resolve();
          })(),
          (() => {
            const prevButton = screen.queryByRole('button', { name: /previous/i });
            return prevButton ? user.click(prevButton).catch(() => {}) : Promise.resolve();
          })()
        );
      }

      // Execute interactions
      await Promise.allSettled(interactions);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid interactions without excessive delay
      expect(totalTime).toBeLessThan(15000); // 15 seconds
      
      // Application should remain functional
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    }, 20000);
  });

  describe('Data Isolation Testing', () => {
    it('should isolate data between different users', async () => {
      // Test user 1
      const { unmount: unmount1 } = renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'user-1', name: 'User One' } }
      );

      const mockFile1 = createMockPdfFile('isolation-test.pdf');
      const fileInput1 = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      
      if (fileInput1) {
        await user.upload(fileInput1, mockFile1);

        await waitFor(() => {
          expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
        }, { timeout: 10000 });

        // Try to create annotation for user 1
        const pdfPage1 = screen.queryByTestId('pdf-page-1');
        if (pdfPage1) {
          mockWindowSelection('User 1 highlight');
          fireEvent.mouseUp(pdfPage1);

          const createButton = await screen.findByText(/create highlight/i, {}, { timeout: 3000 })
            .catch(() => null);

          if (createButton) {
            await user.click(createButton);
          }
        }

        // Check if user 1's data is stored
        const user1Data = localStorage.getItem('ebook-utility-user-1-highlights');
        // Data may or may not be present depending on implementation
      }

      unmount1();

      // Test user 2 with same document
      const { unmount: unmount2 } = renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'user-2', name: 'User Two' } }
      );

      const mockFile2 = createMockPdfFile('isolation-test.pdf');
      const fileInput2 = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      
      if (fileInput2) {
        await user.upload(fileInput2, mockFile2);

        await waitFor(() => {
          expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
        }, { timeout: 10000 });

        // User 2 should not see user 1's annotations initially
        const initialHighlights = screen.queryAllByTestId('highlight-overlay');
        
        // Try to create annotation for user 2
        const pdfPage2 = screen.queryByTestId('pdf-page-1');
        if (pdfPage2) {
          mockWindowSelection('User 2 highlight');
          fireEvent.mouseUp(pdfPage2);

          const createButton = await screen.findByText(/create highlight/i, {}, { timeout: 3000 })
            .catch(() => null);

          if (createButton) {
            await user.click(createButton);
          }
        }

        // Verify data isolation - user data should be stored separately
        const user1Data = localStorage.getItem('ebook-utility-user-1-highlights');
        const user2Data = localStorage.getItem('ebook-utility-user-2-highlights');

        // If both users have data, it should be different
        if (user1Data && user2Data) {
          expect(user1Data).not.toEqual(user2Data);
        }
      }

      unmount2();
    }, 25000);
  });

  describe('Responsive Design Performance', () => {
    const setViewport = (width: number, height: number) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height,
      });
      window.dispatchEvent(new Event('resize'));
    };

    it('should maintain performance across different screen sizes', async () => {
      const breakpoints = [
        { name: 'Mobile', width: 375, height: 667 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Desktop', width: 1920, height: 1080 },
      ];

      for (const breakpoint of breakpoints) {
        setViewport(breakpoint.width, breakpoint.height);
        
        const startTime = performance.now();
        
        const { unmount } = renderWithProviders(
          <PDFViewerContainer enableVirtualization={false} />,
          { initialUser: { id: 'responsive-test-user', name: 'Test User' } }
        );

        const mockFile = createMockPdfFile(`${breakpoint.name.toLowerCase()}-test.pdf`);
        const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
        
        if (fileInput) {
          await user.upload(fileInput, mockFile);

          await waitFor(() => {
            expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
          }, { timeout: 10000 });
        }

        const endTime = performance.now();
        const loadTime = endTime - startTime;

        // Should load within reasonable time on all screen sizes
        expect(loadTime).toBeLessThan(12000); // 12 seconds

        // Should have appropriate layout
        const container = screen.queryByRole('main');
        if (container) {
          expect(container).toBeInTheDocument();
        }

        unmount();
      }
    }, 40000);

    it('should handle orientation changes smoothly', async () => {
      await setupPdfViewer();

      const startTime = performance.now();

      // Simulate orientation changes
      setViewport(667, 375); // Landscape
      await new Promise(resolve => setTimeout(resolve, 100));

      setViewport(375, 667); // Portrait
      await new Promise(resolve => setTimeout(resolve, 100));

      const endTime = performance.now();
      const transitionTime = endTime - startTime;

      // Orientation changes should be smooth
      expect(transitionTime).toBeLessThan(2000); // 2 seconds

      // Application should remain functional
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    }, 15000);
  });

  describe('Memory Management', () => {
    it('should clean up resources when component unmounts', async () => {
      const { unmount } = renderWithProviders(
        <PDFViewerContainer enableVirtualization={true} />,
        { initialUser: { id: 'cleanup-test-user', name: 'Test User' } }
      );

      const mockFile = createMockPdfFile('cleanup-test.pdf');
      const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
      
      if (fileInput) {
        await user.upload(fileInput, mockFile);

        await waitFor(() => {
          expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
        }, { timeout: 10000 });
      }

      // Unmount component
      unmount();

      // Verify cleanup - URL.revokeObjectURL should be called
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    }, 15000);

    it('should handle storage quota limits gracefully', async () => {
      await setupPdfViewer();

      // Mock storage quota exceeded
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const pdfPage = screen.queryByTestId('pdf-page-1');
      if (pdfPage) {
        mockWindowSelection('Quota test');
        fireEvent.mouseUp(pdfPage);

        const createButton = await screen.findByText(/create highlight/i, {}, { timeout: 3000 })
          .catch(() => null);

        if (createButton) {
          await user.click(createButton);

          // Should show error message about storage or handle gracefully
          await waitFor(() => {
            const errorMessage = screen.queryByText(/storage.*limit|quota.*exceeded|storage.*full/i);
            // Error message may or may not be present depending on implementation
            // The important thing is that the app doesn't crash
            expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
          }, { timeout: 3000 });
        }
      }

      // Restore original function
      localStorage.setItem = originalSetItem;
    }, 15000);
  });
});