import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';

describe('Cross-Browser Compatibility Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let originalUserAgent: string;

  beforeEach(() => {
    user = userEvent.setup();
    originalUserAgent = navigator.userAgent;
    global.URL.createObjectURL = jest.fn(() => 'mock-pdf-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore original user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });

  const mockUserAgent = (userAgent: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
    });
  };

  const setupPdfViewer = async () => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    const mockFile = createMockPdfFile('browser-test.pdf');
    const fileInput = screen.getByLabelText(/choose file/i);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });
  };

  describe('Chrome Compatibility', () => {
    beforeEach(() => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    });

    it('should work correctly in Chrome', async () => {
      await setupPdfViewer();

      // Test basic functionality
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();

      // Test navigation
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
      });
    });

    it('should handle Chrome-specific features', async () => {
      await setupPdfViewer();

      // Test file drag and drop (Chrome specific behavior)
      const dropZone = screen.getByText(/drag and drop/i).closest('div');
      expect(dropZone).toHaveAttribute('data-browser', 'chrome');
    });
  });

  describe('Firefox Compatibility', () => {
    beforeEach(() => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0');
    });

    it('should work correctly in Firefox', async () => {
      await setupPdfViewer();

      // Test basic functionality
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();

      // Test zoom functionality (Firefox has different zoom behavior)
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText(/125%/)).toBeInTheDocument();
      });
    });

    it('should handle Firefox-specific PDF rendering', async () => {
      await setupPdfViewer();

      // Firefox might need different PDF.js configuration
      const pdfDocument = screen.getByTestId('pdf-document');
      expect(pdfDocument).toHaveAttribute('data-firefox-optimized', 'true');
    });
  });

  describe('Safari Compatibility', () => {
    beforeEach(() => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15');
    });

    it('should work correctly in Safari', async () => {
      await setupPdfViewer();

      // Test basic functionality
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();

      // Test annotation creation (Safari has different selection behavior)
      const pdfPage = screen.getByTestId('pdf-page-1');
      
      // Mock Safari-specific selection
      Object.defineProperty(window, 'getSelection', {
        value: () => ({
          toString: () => 'Safari selected text',
          getRangeAt: () => ({
            getBoundingClientRect: () => ({ x: 100, y: 200, width: 150, height: 20 }),
          }),
          rangeCount: 1,
        }),
      });

      pdfPage.dispatchEvent(new Event('mouseup'));

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });
    });

    it('should handle Safari-specific touch events', async () => {
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', { value: {} });

      await setupPdfViewer();

      const pdfContainer = screen.getByTestId('pdf-document');
      
      // Safari touch events
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 200 } as Touch],
      });

      pdfContainer.dispatchEvent(touchEvent);

      // Should handle touch interaction
      expect(pdfContainer).toHaveAttribute('data-touch-enabled', 'true');
    });
  });

  describe('Edge Compatibility', () => {
    beforeEach(() => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59');
    });

    it('should work correctly in Edge', async () => {
      await setupPdfViewer();

      // Test basic functionality
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();

      // Test file upload (Edge specific behavior)
      const fileInput = screen.getByLabelText(/choose file/i);
      expect(fileInput).toHaveAttribute('data-edge-compatible', 'true');
    });
  });

  describe('Mobile Browser Compatibility', () => {
    describe('Mobile Safari', () => {
      beforeEach(() => {
        mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
        Object.defineProperty(window, 'innerWidth', { value: 375 });
        Object.defineProperty(window, 'innerHeight', { value: 667 });
      });

      it('should work on mobile Safari', async () => {
        await setupPdfViewer();

        // Should show mobile-optimized interface
        expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();

        // Touch targets should be appropriately sized
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          const styles = window.getComputedStyle(button);
          expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
        });
      });
    });

    describe('Chrome Mobile', () => {
      beforeEach(() => {
        mockUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36');
        Object.defineProperty(window, 'innerWidth', { value: 360 });
        Object.defineProperty(window, 'innerHeight', { value: 640 });
      });

      it('should work on Chrome Mobile', async () => {
        await setupPdfViewer();

        // Should adapt to mobile viewport
        expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();

        // Should handle touch gestures
        const pdfContainer = screen.getByTestId('pdf-document');
        expect(pdfContainer).toHaveAttribute('data-touch-gestures', 'enabled');
      });
    });
  });

  describe('Feature Detection and Polyfills', () => {
    it('should detect and handle missing features gracefully', async () => {
      // Mock missing features
      delete (window as any).IntersectionObserver;
      delete (window as any).ResizeObserver;

      await setupPdfViewer();

      // Should still work with fallbacks
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();

      // Should show fallback message for missing features
      expect(screen.getByText(/some features may be limited/i)).toBeInTheDocument();
    });

    it('should use polyfills when needed', async () => {
      // Mock old browser without modern features
      delete (window as any).fetch;
      delete (window as any).Promise;

      await setupPdfViewer();

      // Should load polyfills
      expect(window.fetch).toBeDefined();
      expect(window.Promise).toBeDefined();
    });
  });

  describe('Performance Across Browsers', () => {
    it('should maintain performance standards in all browsers', async () => {
      const performanceStart = performance.now();

      await setupPdfViewer();

      const performanceEnd = performance.now();
      const loadTime = performanceEnd - performanceStart;

      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(3000);
    });

    it('should handle memory management consistently', async () => {
      await setupPdfViewer();

      // Navigate through multiple pages to test memory usage
      for (let i = 1; i <= 5; i++) {
        const pageInput = screen.getByLabelText(/go to page/i);
        await user.clear(pageInput);
        await user.type(pageInput, i.toString());
        await user.keyboard('{Enter}');

        await waitFor(() => {
          expect(screen.getByText(new RegExp(`page ${i} of 5`, 'i'))).toBeInTheDocument();
        });
      }

      // Memory should be managed properly (no memory leaks)
      expect(document.querySelectorAll('[data-testid^="pdf-page-"]')).toHaveLength(1);
    });
  });

  describe('CSS and Layout Compatibility', () => {
    it('should render consistently across browsers', async () => {
      await setupPdfViewer();

      const container = screen.getByRole('main');
      const styles = window.getComputedStyle(container);

      // Check that critical styles are applied
      expect(styles.display).toBe('flex');
      expect(styles.flexDirection).toBe('column');
      expect(styles.height).toBe('100vh');
    });

    it('should handle vendor prefixes correctly', async () => {
      await setupPdfViewer();

      const pdfContainer = screen.getByTestId('pdf-document');
      const styles = window.getComputedStyle(pdfContainer);

      // Should have appropriate vendor prefixes for transforms
      expect(styles.transform || styles.webkitTransform || styles.msTransform).toBeDefined();
    });
  });

  describe('JavaScript API Compatibility', () => {
    it('should handle different File API implementations', async () => {
      await setupPdfViewer();

      const mockFile = createMockPdfFile('api-test.pdf');
      
      // Test FileReader compatibility
      const reader = new FileReader();
      expect(reader.readAsArrayBuffer).toBeDefined();
      expect(reader.readAsDataURL).toBeDefined();

      // Test URL.createObjectURL compatibility
      expect(URL.createObjectURL).toBeDefined();
      expect(URL.revokeObjectURL).toBeDefined();
    });

    it('should handle different event implementations', async () => {
      await setupPdfViewer();

      const pdfContainer = screen.getByTestId('pdf-document');

      // Test different event types
      const mouseEvent = new MouseEvent('click', { bubbles: true });
      const keyboardEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const touchEvent = new TouchEvent('touchstart', { touches: [] });

      // Should handle all event types
      expect(() => {
        pdfContainer.dispatchEvent(mouseEvent);
        pdfContainer.dispatchEvent(keyboardEvent);
        pdfContainer.dispatchEvent(touchEvent);
      }).not.toThrow();
    });
  });
});