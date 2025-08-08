import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';

describe('Navigation Workflow Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    global.URL.createObjectURL = jest.fn(() => 'mock-pdf-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const setupPdfViewer = async () => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    const mockFile = createMockPdfFile('navigation-test.pdf');
    const fileInput = screen.getByLabelText(/choose file/i);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });
  };

  describe('Page Navigation', () => {
    it('should navigate between pages using controls', async () => {
      await setupPdfViewer();

      // Should start on page 1
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();

      // Navigate to next page
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Should show page 2
      await waitFor(() => {
        expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
      });

      // Navigate to previous page
      const prevButton = screen.getByRole('button', { name: /previous page/i });
      await user.click(prevButton);

      // Should return to page 1
      await waitFor(() => {
        expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
      });
    });

    it('should handle direct page navigation', async () => {
      await setupPdfViewer();

      // Find page input field
      const pageInput = screen.getByLabelText(/go to page/i);
      
      // Clear and enter page number
      await user.clear(pageInput);
      await user.type(pageInput, '3');
      await user.keyboard('{Enter}');

      // Should navigate to page 3
      await waitFor(() => {
        expect(screen.getByText(/page 3 of 5/i)).toBeInTheDocument();
      });
    });

    it('should validate page number input', async () => {
      await setupPdfViewer();

      const pageInput = screen.getByLabelText(/go to page/i);
      
      // Try invalid page number (too high)
      await user.clear(pageInput);
      await user.type(pageInput, '10');
      await user.keyboard('{Enter}');

      // Should show error and stay on current page
      await waitFor(() => {
        expect(screen.getByText(/invalid page number/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();

      // Try invalid page number (too low)
      await user.clear(pageInput);
      await user.type(pageInput, '0');
      await user.keyboard('{Enter}');

      // Should show error and stay on current page
      await waitFor(() => {
        expect(screen.getByText(/invalid page number/i)).toBeInTheDocument();
      });
    });

    it('should disable navigation buttons at boundaries', async () => {
      await setupPdfViewer();

      // Previous button should be disabled on first page
      const prevButton = screen.getByRole('button', { name: /previous page/i });
      expect(prevButton).toBeDisabled();

      // Navigate to last page
      const pageInput = screen.getByLabelText(/go to page/i);
      await user.clear(pageInput);
      await user.type(pageInput, '5');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/page 5 of 5/i)).toBeInTheDocument();
      });

      // Next button should be disabled on last page
      const nextButton = screen.getByRole('button', { name: /next page/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Zoom Controls', () => {
    it('should handle zoom in and out', async () => {
      await setupPdfViewer();

      // Find zoom controls
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      const zoomDisplay = screen.getByText(/100%/);

      // Zoom in
      await user.click(zoomInButton);
      await waitFor(() => {
        expect(screen.getByText(/125%/)).toBeInTheDocument();
      });

      // Zoom out
      await user.click(zoomOutButton);
      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument();
      });
    });

    it('should handle fit-to-width and fit-to-page', async () => {
      await setupPdfViewer();

      // Test fit-to-width
      const fitWidthButton = screen.getByRole('button', { name: /fit width/i });
      await user.click(fitWidthButton);

      await waitFor(() => {
        expect(screen.getByText(/fit width/i)).toBeInTheDocument();
      });

      // Test fit-to-page
      const fitPageButton = screen.getByRole('button', { name: /fit page/i });
      await user.click(fitPageButton);

      await waitFor(() => {
        expect(screen.getByText(/fit page/i)).toBeInTheDocument();
      });
    });

    it('should maintain zoom level across page navigation', async () => {
      await setupPdfViewer();

      // Zoom in
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText(/125%/)).toBeInTheDocument();
      });

      // Navigate to next page
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Zoom level should be maintained
      await waitFor(() => {
        expect(screen.getByText(/125%/)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard shortcuts for navigation', async () => {
      await setupPdfViewer();

      // Focus on the PDF viewer
      const pdfContainer = screen.getByTestId('pdf-document');
      pdfContainer.focus();

      // Use arrow keys for navigation
      await user.keyboard('{ArrowRight}');
      await waitFor(() => {
        expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
      });

      await user.keyboard('{ArrowLeft}');
      await waitFor(() => {
        expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
      });

      // Use Page Up/Down
      await user.keyboard('{PageDown}');
      await waitFor(() => {
        expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
      });

      await user.keyboard('{PageUp}');
      await waitFor(() => {
        expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
      });

      // Use Home/End
      await user.keyboard('{End}');
      await waitFor(() => {
        expect(screen.getByText(/page 5 of 5/i)).toBeInTheDocument();
      });

      await user.keyboard('{Home}');
      await waitFor(() => {
        expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
      });
    });

    it('should support zoom keyboard shortcuts', async () => {
      await setupPdfViewer();

      const pdfContainer = screen.getByTestId('pdf-document');
      pdfContainer.focus();

      // Zoom in with Ctrl++
      await user.keyboard('{Control>}+{/Control}');
      await waitFor(() => {
        expect(screen.getByText(/125%/)).toBeInTheDocument();
      });

      // Zoom out with Ctrl+-
      await user.keyboard('{Control>}-{/Control}');
      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument();
      });

      // Reset zoom with Ctrl+0
      await user.keyboard('{Control>}0{/Control}');
      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Navigation', () => {
    it('should adapt navigation controls for mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      await setupPdfViewer();

      // Should show mobile-optimized navigation
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();

      // Should have touch-friendly controls
      const nextButton = screen.getByRole('button', { name: /next page/i });
      expect(nextButton).toHaveStyle('min-height: 44px'); // Touch target size
    });

    it('should handle touch gestures for navigation', async () => {
      await setupPdfViewer();

      const pdfContainer = screen.getByTestId('pdf-document');

      // Mock touch events for swipe navigation
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 300 } as Touch],
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 100, clientY: 300 } as Touch],
      });

      // Simulate swipe left (next page)
      pdfContainer.dispatchEvent(touchStart);
      pdfContainer.dispatchEvent(touchEnd);

      await waitFor(() => {
        expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation State Persistence', () => {
    it('should remember page position across sessions', async () => {
      // Mock localStorage
      const mockStorage: { [key: string]: string } = {};
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key: string) => mockStorage[key] || null),
          setItem: jest.fn((key: string, value: string) => {
            mockStorage[key] = value;
          }),
        },
      });

      await setupPdfViewer();

      // Navigate to page 3
      const pageInput = screen.getByLabelText(/go to page/i);
      await user.clear(pageInput);
      await user.type(pageInput, '3');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/page 3 of 5/i)).toBeInTheDocument();
      });

      // Should save page position
      expect(localStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('currentPage'),
        '3'
      );

      // Simulate page reload by re-rendering
      const { rerender } = renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      // Mock localStorage to return saved page
      mockStorage['ebook-utility-test-user-navigation'] = JSON.stringify({ currentPage: 3 });

      rerender(<PDFViewerContainer enableVirtualization={false} />);

      // Should restore to saved page
      await waitFor(() => {
        expect(screen.getByText(/page 3 of 5/i)).toBeInTheDocument();
      });
    });
  });
});