import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile, createMockTextSelection, mockWindowSelection } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';

describe('Annotation Workflow Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    global.URL.createObjectURL = jest.fn(() => 'mock-pdf-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock localStorage
    const mockStorage: { [key: string]: string } = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: jest.fn(() => {
          Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        }),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const setupPdfViewer = async () => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    const mockFile = createMockPdfFile('test-document.pdf');
    const fileInput = screen.getByLabelText(/choose file/i);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });
  };

  describe('Highlighting Workflow', () => {
    it('should create and display highlights', async () => {
      await setupPdfViewer();

      // Mock text selection
      mockWindowSelection('Selected text for highlighting');

      // Simulate text selection on PDF
      const pdfPage = screen.getByTestId('pdf-page-1');
      fireEvent.mouseUp(pdfPage);

      // Should show highlight creation interface
      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      // Select highlight color
      const colorButton = screen.getByRole('button', { name: /yellow/i });
      await user.click(colorButton);

      // Create highlight
      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      // Should show highlight in overlay
      await waitFor(() => {
        expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      });

      // Should persist highlight
      expect(localStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('highlights'),
        expect.any(String)
      );
    });

    it('should edit existing highlights', async () => {
      await setupPdfViewer();

      // Create a highlight first
      mockWindowSelection('Text to highlight');
      const pdfPage = screen.getByTestId('pdf-page-1');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      // Click on highlight to edit
      await waitFor(() => {
        expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      });

      const highlight = screen.getByTestId('highlight-overlay');
      fireEvent.click(highlight);

      // Should show edit options
      await waitFor(() => {
        expect(screen.getByText(/edit highlight/i)).toBeInTheDocument();
      });

      // Change color
      const redColorButton = screen.getByRole('button', { name: /red/i });
      await user.click(redColorButton);

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should update highlight
      expect(localStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('highlights'),
        expect.stringContaining('red')
      );
    });

    it('should delete highlights', async () => {
      await setupPdfViewer();

      // Create highlight
      mockWindowSelection('Text to delete');
      const pdfPage = screen.getByTestId('pdf-page-1');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create highlight/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      // Right-click on highlight for context menu
      await waitFor(() => {
        expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      });

      const highlight = screen.getByTestId('highlight-overlay');
      fireEvent.contextMenu(highlight);

      // Click delete option
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Highlight should be removed
      await waitFor(() => {
        expect(screen.queryByTestId('highlight-overlay')).not.toBeInTheDocument();
      });
    });
  });

  describe('Bookmark Workflow', () => {
    it('should create and navigate to bookmarks', async () => {
      await setupPdfViewer();

      // Create bookmark
      const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
      await user.click(bookmarkButton);

      // Enter bookmark details
      const titleInput = screen.getByLabelText(/bookmark title/i);
      await user.type(titleInput, 'Important Section');

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'Key information here');

      // Save bookmark
      const saveButton = screen.getByRole('button', { name: /save bookmark/i });
      await user.click(saveButton);

      // Should show bookmark in panel
      await waitFor(() => {
        expect(screen.getByText('Important Section')).toBeInTheDocument();
      });

      // Navigate to different page
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Click bookmark to navigate back
      const bookmarkLink = screen.getByText('Important Section');
      await user.click(bookmarkLink);

      // Should navigate to bookmarked page
      await waitFor(() => {
        expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
      });
    });
  });

  describe('Comment Workflow', () => {
    it('should create and display comments', async () => {
      await setupPdfViewer();

      // Click on PDF to create comment
      const pdfPage = screen.getByTestId('pdf-page-1');
      fireEvent.click(pdfPage, { clientX: 200, clientY: 300 });

      // Should show comment creation interface
      await waitFor(() => {
        expect(screen.getByText(/add comment/i)).toBeInTheDocument();
      });

      // Enter comment text
      const commentInput = screen.getByLabelText(/comment/i);
      await user.type(commentInput, 'This is an important note');

      // Save comment
      const saveButton = screen.getByRole('button', { name: /save comment/i });
      await user.click(saveButton);

      // Should show comment marker
      await waitFor(() => {
        expect(screen.getByTestId('comment-marker')).toBeInTheDocument();
      });

      // Click comment marker to view
      const commentMarker = screen.getByTestId('comment-marker');
      await user.click(commentMarker);

      // Should show comment popup
      await waitFor(() => {
        expect(screen.getByText('This is an important note')).toBeInTheDocument();
      });
    });
  });

  describe('Call-to-Action Workflow', () => {
    it('should create and interact with CTAs', async () => {
      await setupPdfViewer();

      // Select area for CTA
      const pdfPage = screen.getByTestId('pdf-page-1');
      fireEvent.mouseDown(pdfPage, { clientX: 100, clientY: 200 });
      fireEvent.mouseMove(pdfPage, { clientX: 200, clientY: 250 });
      fireEvent.mouseUp(pdfPage, { clientX: 200, clientY: 250 });

      // Should show CTA creation interface
      await waitFor(() => {
        expect(screen.getByText(/create call-to-action/i)).toBeInTheDocument();
      });

      // Enter CTA details
      const labelInput = screen.getByLabelText(/label/i);
      await user.type(labelInput, 'Learn More');

      const urlInput = screen.getByLabelText(/url/i);
      await user.type(urlInput, 'https://example.com');

      // Save CTA
      const saveButton = screen.getByRole('button', { name: /save cta/i });
      await user.click(saveButton);

      // Should show CTA overlay
      await waitFor(() => {
        expect(screen.getByTestId('cta-overlay')).toBeInTheDocument();
      });

      // Mock window.open
      const mockOpen = jest.fn();
      Object.defineProperty(window, 'open', { value: mockOpen });

      // Click CTA to open link
      const ctaOverlay = screen.getByTestId('cta-overlay');
      await user.click(ctaOverlay);

      // Should open external link
      expect(mockOpen).toHaveBeenCalledWith('https://example.com', '_blank');
    });
  });

  describe('Multi-User Data Isolation', () => {
    it('should isolate annotations between users', async () => {
      // Create annotations as first user
      renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'user1', name: 'User One' } }
      );

      const mockFile = createMockPdfFile('shared-document.pdf');
      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Create highlight as user1
      mockWindowSelection('User 1 highlight');
      const pdfPage = screen.getByTestId('pdf-page-1');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create highlight/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      // Switch to second user
      const { rerender } = renderWithProviders(
        <PDFViewerContainer enableVirtualization={false} />,
        { initialUser: { id: 'user2', name: 'User Two' } }
      );

      rerender(<PDFViewerContainer enableVirtualization={false} />);

      // Upload same document as user2
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Should not see user1's highlights
      expect(screen.queryByTestId('highlight-overlay')).not.toBeInTheDocument();

      // Create different highlight as user2
      mockWindowSelection('User 2 highlight');
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create highlight/i })).toBeInTheDocument();
      });

      const createButton2 = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton2);

      // Should only see user2's highlight
      await waitFor(() => {
        expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
      });
    });
  });
});