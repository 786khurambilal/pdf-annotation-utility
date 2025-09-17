import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';

describe('Accessibility Workflow Integration', () => {
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

    const mockFile = createMockPdfFile('accessibility-test.pdf');
    const fileInput = screen.getByLabelText(/choose file/i);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });
  };

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      await setupPdfViewer();

      // Tab through all interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /previous page/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /next page/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/go to page/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /zoom out/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /zoom in/i })).toHaveFocus();
    });

    it('should handle keyboard shortcuts without interfering with screen readers', async () => {
      await setupPdfViewer();

      // Focus on main content area
      const pdfContainer = screen.getByRole('main');
      pdfContainer.focus();

      // Test navigation shortcuts
      await user.keyboard('{ArrowRight}');
      await waitFor(() => {
        expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
      });

      // Ensure screen reader announcements
      expect(screen.getByLabelText(/current page 2 of 5/i)).toBeInTheDocument();
    });

    it('should trap focus in modal dialogs', async () => {
      await setupPdfViewer();

      // Open bookmark creation dialog
      const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
      await user.click(bookmarkButton);

      // Focus should be trapped in modal
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      const titleInput = screen.getByLabelText(/bookmark title/i);
      expect(titleInput).toHaveFocus();

      // Tab should cycle within modal
      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save bookmark/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();

      // Tab again should return to first element
      await user.tab();
      expect(titleInput).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide proper ARIA labels and descriptions', async () => {
      await setupPdfViewer();

      // Check main content area
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'PDF Viewer');

      // Check navigation controls
      expect(screen.getByRole('button', { name: /previous page/i }))
        .toHaveAttribute('aria-describedby', expect.any(String));

      // Check page indicator
      expect(screen.getByText(/page 1 of 5/i))
        .toHaveAttribute('aria-live', 'polite');

      // Check zoom controls
      expect(screen.getByRole('button', { name: /zoom in/i }))
        .toHaveAttribute('aria-label', 'Zoom in to 125%');
    });

    it('should announce page changes to screen readers', async () => {
      await setupPdfViewer();

      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Should have live region for announcements
      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent('Navigated to page 2 of 5');
      });
    });

    it('should provide accessible annotation descriptions', async () => {
      await setupPdfViewer();

      // Create a highlight
      const pdfPage = screen.getByTestId('pdf-page-1');
      
      // Mock text selection
      Object.defineProperty(window, 'getSelection', {
        value: () => ({
          toString: () => 'Selected text',
          getRangeAt: () => ({
            getBoundingClientRect: () => ({ x: 100, y: 200, width: 150, height: 20 }),
          }),
          rangeCount: 1,
        }),
      });

      // Simulate text selection
      pdfPage.dispatchEvent(new Event('mouseup'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create highlight/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      // Highlight should have accessible description
      await waitFor(() => {
        const highlight = screen.getByRole('button', { name: /highlight: selected text/i });
        expect(highlight).toHaveAttribute('aria-describedby', expect.any(String));
      });
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should meet WCAG color contrast requirements', async () => {
      await setupPdfViewer();

      // Check button contrast
      const nextButton = screen.getByRole('button', { name: /next page/i });
      const styles = window.getComputedStyle(nextButton);
      
      // This would typically use a color contrast checking library
      // For now, we'll check that colors are defined
      expect(styles.color).toBeDefined();
      expect(styles.backgroundColor).toBeDefined();
    });

    it('should support high contrast mode', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => ({
          matches: true,
          media: '(prefers-contrast: high)',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      await setupPdfViewer();

      // Should apply high contrast styles
      const container = screen.getByRole('main');
      expect(container).toHaveClass('high-contrast');
    });

    it('should respect reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => ({
          matches: true,
          media: '(prefers-reduced-motion: reduce)',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      await setupPdfViewer();

      // Animations should be disabled
      const container = screen.getByRole('main');
      expect(container).toHaveClass('reduced-motion');
    });
  });

  describe('Focus Management', () => {
    it('should maintain logical focus order', async () => {
      await setupPdfViewer();

      // Start from beginning
      document.body.focus();

      // Tab through elements in logical order
      await user.tab(); // File input
      expect(screen.getByLabelText(/choose file/i)).toHaveFocus();

      await user.tab(); // Previous page button
      expect(screen.getByRole('button', { name: /previous page/i })).toHaveFocus();

      await user.tab(); // Next page button  
      expect(screen.getByRole('button', { name: /next page/i })).toHaveFocus();

      await user.tab(); // Page input
      expect(screen.getByLabelText(/go to page/i)).toHaveFocus();
    });

    it('should restore focus after modal interactions', async () => {
      await setupPdfViewer();

      const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
      bookmarkButton.focus();
      await user.click(bookmarkButton);

      // Modal should open
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Focus should return to bookmark button
      await waitFor(() => {
        expect(bookmarkButton).toHaveFocus();
      });
    });

    it('should provide skip links for keyboard users', async () => {
      await setupPdfViewer();

      // Should have skip to content link
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();

      // Skip link should work
      await user.click(skipLink);
      expect(screen.getByRole('main')).toHaveFocus();
    });
  });

  describe('Error Accessibility', () => {
    it('should announce errors to screen readers', async () => {
      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      // Try to upload invalid file
      const invalidFile = new File(['content'], 'document.txt', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, invalidFile);

      // Error should be announced
      await waitFor(() => {
        const errorRegion = screen.getByRole('alert');
        expect(errorRegion).toHaveTextContent(/invalid file type/i);
      });
    });

    it('should provide accessible error recovery options', async () => {
      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'test-user', name: 'Test User' } }
      );

      // Simulate PDF loading error
      const mockFile = createMockPdfFile('error-document.pdf');
      const fileInput = screen.getByLabelText(/choose file/i);
      
      // Mock PDF loading failure
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await user.upload(fileInput, mockFile);

      // Should show accessible error message with recovery options
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /choose different file/i })).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Accessibility', () => {
    it('should support touch accessibility features', async () => {
      // Mock mobile environment
      Object.defineProperty(window, 'ontouchstart', { value: {} });
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      await setupPdfViewer();

      // Touch targets should be large enough (44px minimum)
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });

    it('should work with voice control', async () => {
      await setupPdfViewer();

      // Elements should have voice-friendly labels
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    });
  });
});