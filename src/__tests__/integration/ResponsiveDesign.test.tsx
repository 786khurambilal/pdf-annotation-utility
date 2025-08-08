import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';

describe('Responsive Design Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    user = userEvent.setup();
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    
    global.URL.createObjectURL = jest.fn(() => 'mock-pdf-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    // Restore original viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    window.dispatchEvent(new Event('resize'));
    
    jest.clearAllMocks();
  });

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

  const setupPdfViewer = async () => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    const mockFile = createMockPdfFile('responsive-test.pdf');
    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    }, { timeout: 5000 });
  };

  describe('Desktop Layout (1920x1080)', () => {
    beforeEach(() => {
      setViewport(1920, 1080);
    });

    it('should display full desktop layout', async () => {
      await setupPdfViewer();

      // Should show full navigation controls
      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/go to page/i)).toBeInTheDocument();

      // Should show zoom controls
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();

      // Should show sidebar
      expect(screen.getByText(/bookmarks/i)).toBeInTheDocument();
      expect(screen.getByText(/highlights/i)).toBeInTheDocument();
    });

    it('should handle window resizing', async () => {
      await setupPdfViewer();

      // Resize to tablet
      setViewport(768, 1024);

      // Should adapt layout
      await waitFor(() => {
        // Check if layout adapts (specific assertions depend on implementation)
        const container = screen.getByRole('main');
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Tablet Layout (768x1024)', () => {
    beforeEach(() => {
      setViewport(768, 1024);
    });

    it('should display tablet-optimized layout', async () => {
      await setupPdfViewer();

      // Should show adapted navigation
      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();

      // Touch targets should be larger
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight) || 0;
        expect(minHeight).toBeGreaterThanOrEqual(44); // iOS touch target guideline
      });
    });

    it('should handle touch interactions', async () => {
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', { value: {} });

      await setupPdfViewer();

      const pdfContainer = screen.getByTestId('pdf-document');

      // Test touch navigation
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 400, clientY: 300 } as Touch],
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 300 } as Touch],
      });

      // Simulate swipe left (next page)
      pdfContainer.dispatchEvent(touchStart);
      pdfContainer.dispatchEvent(touchEnd);

      await waitFor(() => {
        expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Layout (375x667)', () => {
    beforeEach(() => {
      setViewport(375, 667);
    });

    it('should display mobile-optimized layout', async () => {
      await setupPdfViewer();

      // Should show mobile navigation
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();

      // Should have collapsible sidebar
      const sidebarToggle = screen.getByRole('button', { name: /menu/i });
      expect(sidebarToggle).toBeInTheDocument();

      // Sidebar should be initially hidden on mobile
      const sidebar = screen.queryByTestId('annotation-sidebar');
      expect(sidebar).not.toBeVisible();
    });

    it('should handle mobile annotation creation', async () => {
      await setupPdfViewer();

      const pdfPage = screen.getByTestId('pdf-page-1');

      // Test touch-based text selection
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 200 } as Touch],
      });
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 200 } as Touch],
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 200 } as Touch],
      });

      pdfPage.dispatchEvent(touchStart);
      pdfPage.dispatchEvent(touchMove);
      pdfPage.dispatchEvent(touchEnd);

      // Should show mobile-optimized annotation interface
      await waitFor(() => {
        expect(screen.getByTestId('mobile-annotation-menu')).toBeInTheDocument();
      });
    });

    it('should optimize for small screens', async () => {
      await setupPdfViewer();

      // PDF should fit mobile viewport
      const pdfContainer = screen.getByTestId('pdf-document');
      const containerRect = pdfContainer.getBoundingClientRect();
      
      expect(containerRect.width).toBeLessThanOrEqual(375);

      // Navigation should be compact
      const navigation = screen.getByTestId('mobile-navigation');
      expect(navigation).toHaveClass('mobile-compact');
    });
  });

  describe('Landscape vs Portrait', () => {
    it('should adapt to landscape orientation on mobile', async () => {
      // Mobile landscape
      setViewport(667, 375);

      await setupPdfViewer();

      // Should show landscape-optimized layout
      const container = screen.getByRole('main');
      expect(container).toHaveAttribute('data-orientation', 'landscape');
    });

    it('should adapt to portrait orientation on mobile', async () => {
      // Mobile portrait
      setViewport(375, 667);

      await setupPdfViewer();

      // Should show portrait-optimized layout
      const container = screen.getByRole('main');
      expect(container).toHaveAttribute('data-orientation', 'portrait');
    });
  });

  describe('Accessibility on Different Screen Sizes', () => {
    it('should maintain accessibility on mobile', async () => {
      setViewport(375, 667);
      await setupPdfViewer();

      // Touch targets should be large enough
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
      });

      // Should support keyboard navigation even on mobile
      const firstButton = buttons[0];
      firstButton.focus();
      expect(firstButton).toHaveFocus();

      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).not.toBe(firstButton);
    });

    it('should provide appropriate focus indicators on all screen sizes', async () => {
      const viewports = [
        [1920, 1080], // Desktop
        [768, 1024],  // Tablet
        [375, 667],   // Mobile
      ];

      for (const [width, height] of viewports) {
        setViewport(width, height);
        await setupPdfViewer();

        const firstButton = screen.getAllByRole('button')[0];
        firstButton.focus();

        const styles = window.getComputedStyle(firstButton, ':focus');
        // Should have visible focus indicator
        expect(styles.outline).not.toBe('none');
      }
    });
  });

  describe('Performance on Different Screen Sizes', () => {
    it('should maintain performance on mobile devices', async () => {
      setViewport(375, 667);

      const startTime = performance.now();
      await setupPdfViewer();
      const endTime = performance.now();

      const loadTime = endTime - startTime;
      
      // Should load reasonably fast on mobile
      expect(loadTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle orientation changes smoothly', async () => {
      await setupPdfViewer();

      const startTime = performance.now();

      // Simulate orientation change
      setViewport(667, 375); // Landscape
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      setViewport(375, 667); // Portrait
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const transitionTime = endTime - startTime;

      // Orientation changes should be smooth
      expect(transitionTime).toBeLessThan(1000); // 1 second
    });

    it('should test all major breakpoints systematically', async () => {
      const breakpoints = [
        { name: 'Mobile Small', width: 320, height: 568 },
        { name: 'Mobile Medium', width: 375, height: 667 },
        { name: 'Mobile Large', width: 414, height: 896 },
        { name: 'Tablet Portrait', width: 768, height: 1024 },
        { name: 'Tablet Landscape', width: 1024, height: 768 },
        { name: 'Desktop Small', width: 1280, height: 720 },
        { name: 'Desktop Medium', width: 1440, height: 900 },
        { name: 'Desktop Large', width: 1920, height: 1080 },
        { name: 'Desktop XL', width: 2560, height: 1440 },
      ];

      for (const breakpoint of breakpoints) {
        setViewport(breakpoint.width, breakpoint.height);
        
        const startTime = performance.now();
        await setupPdfViewer();
        const endTime = performance.now();

        const loadTime = endTime - startTime;

        // Should load within reasonable time on all breakpoints
        expect(loadTime).toBeLessThan(8000); // 8 seconds

        // Should have appropriate layout
        const container = screen.getByRole('main');
        expect(container).toBeInTheDocument();

        // Should have touch-appropriate targets on smaller screens
        if (breakpoint.width <= 768) {
          const buttons = screen.getAllByRole('button');
          buttons.forEach(button => {
            const rect = button.getBoundingClientRect();
            expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
          });
        }

        // Test annotation creation at each breakpoint
        const pdfPage = screen.getByTestId('pdf-page-1');
        mockWindowSelection(`${breakpoint.name} test`);
        fireEvent.mouseUp(pdfPage);

        await waitFor(() => {
          expect(
            screen.getByText(/create highlight/i) || 
            screen.getByTestId('mobile-annotation-menu')
          ).toBeInTheDocument();
        });

        // Clean up for next iteration
        const { unmount } = renderWithProviders(
          <div />,
          { initialUser: { id: 'test-user', name: 'Test User' } }
        );
        unmount();
      }
    });

    it('should handle extreme aspect ratios', async () => {
      const extremeRatios = [
        { name: 'Ultra Wide', width: 3440, height: 1440 }, // 21:9
        { name: 'Super Tall', width: 375, height: 1200 }, // Very tall mobile
        { name: 'Square', width: 800, height: 800 }, // 1:1
        { name: 'Ultra Narrow', width: 280, height: 800 }, // Very narrow
      ];

      for (const ratio of extremeRatios) {
        setViewport(ratio.width, ratio.height);
        await setupPdfViewer();

        // Should handle extreme ratios gracefully
        const container = screen.getByRole('main');
        expect(container).toBeInTheDocument();

        // PDF should be visible and usable
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();

        // Navigation should be accessible
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();

        // Clean up
        const { unmount } = renderWithProviders(
          <div />,
          { initialUser: { id: 'test-user', name: 'Test User' } }
        );
        unmount();
      }
    });

    it('should maintain annotation precision across screen sizes', async () => {
      const testSizes = [
        { width: 375, height: 667 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const size of testSizes) {
        setViewport(size.width, size.height);
        await setupPdfViewer();

        const pdfPage = screen.getByTestId('pdf-page-1');

        // Create annotation at specific coordinates
        const testCoords = { x: 100, y: 200 };
        fireEvent.click(pdfPage, { clientX: testCoords.x, clientY: testCoords.y });

        await waitFor(() => {
          expect(
            screen.getByText(/add comment/i) || 
            screen.getByTestId('mobile-annotation-menu')
          ).toBeInTheDocument();
        });

        // Verify annotation positioning is accurate
        const commentInput = screen.getByLabelText(/comment/i);
        await user.type(commentInput, `Size test ${size.width}x${size.height}`);

        const saveButton = screen.getByRole('button', { name: /save comment/i });
        await user.click(saveButton);

        await waitFor(() => {
          expect(screen.getByTestId('comment-marker')).toBeInTheDocument();
        });

        const marker = screen.getByTestId('comment-marker');
        const markerRect = marker.getBoundingClientRect();

        // Marker should be positioned reasonably close to click coordinates
        // (allowing for responsive scaling)
        expect(Math.abs(markerRect.left - testCoords.x)).toBeLessThan(50);
        expect(Math.abs(markerRect.top - testCoords.y)).toBeLessThan(50);

        // Clean up
        const { unmount } = renderWithProviders(
          <div />,
          { initialUser: { id: 'test-user', name: 'Test User' } }
        );
        unmount();
      }
    });
  });

  describe('Cross-Device Consistency', () => {
    it('should maintain feature parity across devices', async () => {
      const viewports = [
        [1920, 1080], // Desktop
        [768, 1024],  // Tablet
        [375, 667],   // Mobile
      ];

      for (const [width, height] of viewports) {
        setViewport(width, height);
        await setupPdfViewer();

        // Core features should be available on all devices
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();

        // Annotation features should be accessible (though UI may differ)
        const pdfPage = screen.getByTestId('pdf-page-1');
        fireEvent.click(pdfPage);

        // Should be able to create annotations on all devices
        await waitFor(() => {
          expect(
            screen.getByText(/add comment/i) || 
            screen.getByTestId('mobile-annotation-menu')
          ).toBeInTheDocument();
        });
      }
    });
  });
});