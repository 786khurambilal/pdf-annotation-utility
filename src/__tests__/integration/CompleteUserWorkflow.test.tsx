import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile, mockWindowSelection } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';

describe('Complete User Workflow Integration', () => {
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

  it('should complete a full user workflow from login to annotation management', async () => {
    // Step 1: Render application without user
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />
    );

    // Should show login interface
    expect(screen.getByText(/no user logged in/i)).toBeInTheDocument();
    
    // Step 2: User login
    const loginButton = screen.getByRole('button', { name: /login.*create user/i });
    await user.click(loginButton);

    // Should show login form
    await waitFor(() => {
      expect(screen.getByText(/enter your name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test User');

    const submitButton = screen.getByRole('button', { name: /login/i });
    await user.click(submitButton);

    // Should show user is logged in
    await waitFor(() => {
      expect(screen.getByText(/test user/i)).toBeInTheDocument();
    });

    // Step 3: Upload PDF
    expect(screen.getByText(/drag and drop a pdf file here/i)).toBeInTheDocument();

    const mockFile = createMockPdfFile('complete-workflow-test.pdf');
    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    
    await act(async () => {
      await user.upload(fileInput, mockFile);
    });

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    // Should eventually show PDF viewer
    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Step 4: Test navigation
    expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /next page/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
    });

    // Navigate back to page 1
    const prevButton = screen.getByRole('button', { name: /previous page/i });
    await user.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
    });

    // Step 5: Create a highlight
    mockWindowSelection('Important text to highlight');
    const pdfPage = screen.getByTestId('pdf-page-1');
    fireEvent.mouseUp(pdfPage);

    // Should show highlight creation interface
    await waitFor(() => {
      expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
    });

    // Select color and create highlight
    const yellowButton = screen.getByRole('button', { name: /yellow/i });
    await user.click(yellowButton);

    const createHighlightButton = screen.getByRole('button', { name: /create highlight/i });
    await user.click(createHighlightButton);

    // Should show highlight in overlay
    await waitFor(() => {
      expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
    });

    // Step 6: Create a bookmark
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
    await user.click(bookmarkButton);

    // Enter bookmark details
    await waitFor(() => {
      expect(screen.getByLabelText(/bookmark title/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/bookmark title/i);
    await user.type(titleInput, 'Chapter 1 - Introduction');

    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(descriptionInput, 'Key concepts and overview');

    const saveBookmarkButton = screen.getByRole('button', { name: /save bookmark/i });
    await user.click(saveBookmarkButton);

    // Should show bookmark in panel
    await waitFor(() => {
      expect(screen.getByText('Chapter 1 - Introduction')).toBeInTheDocument();
    });

    // Step 7: Create a comment
    fireEvent.click(pdfPage, { clientX: 300, clientY: 400 });

    // Should show comment creation interface
    await waitFor(() => {
      expect(screen.getByText(/add comment/i)).toBeInTheDocument();
    });

    const commentInput = screen.getByLabelText(/comment/i);
    await user.type(commentInput, 'This section needs more explanation');

    const saveCommentButton = screen.getByRole('button', { name: /save comment/i });
    await user.click(saveCommentButton);

    // Should show comment marker
    await waitFor(() => {
      expect(screen.getByTestId('comment-marker')).toBeInTheDocument();
    });

    // Step 8: Create a call-to-action
    // Select area for CTA
    fireEvent.mouseDown(pdfPage, { clientX: 200, clientY: 300 });
    fireEvent.mouseMove(pdfPage, { clientX: 350, clientY: 350 });
    fireEvent.mouseUp(pdfPage, { clientX: 350, clientY: 350 });

    // Should show CTA creation interface
    await waitFor(() => {
      expect(screen.getByText(/create call-to-action/i)).toBeInTheDocument();
    });

    const labelInput = screen.getByLabelText(/label/i);
    await user.type(labelInput, 'Learn More');

    const urlInput = screen.getByLabelText(/url/i);
    await user.type(urlInput, 'https://example.com/learn-more');

    const saveCTAButton = screen.getByRole('button', { name: /save cta/i });
    await user.click(saveCTAButton);

    // Should show CTA overlay
    await waitFor(() => {
      expect(screen.getByTestId('cta-overlay')).toBeInTheDocument();
    });

    // Step 9: Test annotation management
    // Navigate to page 2 and back to test persistence
    await user.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
    });

    await user.click(prevButton);
    await waitFor(() => {
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
    });

    // All annotations should still be visible
    expect(screen.getByTestId('highlight-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('comment-marker')).toBeInTheDocument();
    expect(screen.getByTestId('cta-overlay')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1 - Introduction')).toBeInTheDocument();

    // Step 10: Test annotation interaction
    // Click on comment to view
    const commentMarker = screen.getByTestId('comment-marker');
    await user.click(commentMarker);

    await waitFor(() => {
      expect(screen.getByText('This section needs more explanation')).toBeInTheDocument();
    });

    // Test CTA click
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });

    const ctaOverlay = screen.getByTestId('cta-overlay');
    await user.click(ctaOverlay);

    expect(mockOpen).toHaveBeenCalledWith('https://example.com/learn-more', '_blank');

    // Step 11: Test bookmark navigation
    const bookmarkLink = screen.getByText('Chapter 1 - Introduction');
    
    // Navigate to different page first
    await user.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
    });

    // Click bookmark to navigate back
    await user.click(bookmarkLink);
    await waitFor(() => {
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
    });

    // Step 12: Test data persistence
    // Verify all data is saved to localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('highlights'),
      expect.any(String)
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('bookmarks'),
      expect.any(String)
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('comments'),
      expect.any(String)
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('ctas'),
      expect.any(String)
    );
  });

  it('should handle error scenarios gracefully', async () => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    // Test invalid file upload
    const invalidFile = new File(['content'], 'document.txt', { type: 'text/plain' });
    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    
    await user.upload(fileInput, invalidFile);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });

    // Should still show upload interface
    expect(screen.getByText(/drag and drop a pdf file here/i)).toBeInTheDocument();

    // Test recovery by uploading valid file
    const validFile = createMockPdfFile('recovery-test.pdf');
    await user.upload(fileInput, validFile);

    // Should eventually load successfully
    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should maintain performance with multiple annotations', async () => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    // Upload PDF
    const mockFile = createMockPdfFile('performance-test.pdf');
    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    }, { timeout: 5000 });

    const startTime = performance.now();

    // Create multiple annotations quickly
    const pdfPage = screen.getByTestId('pdf-page-1');
    
    for (let i = 0; i < 5; i++) {
      // Create highlight
      mockWindowSelection(`Highlight text ${i}`);
      fireEvent.mouseUp(pdfPage);

      await waitFor(() => {
        expect(screen.getByText(/create highlight/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create highlight/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('highlight-overlay')).toHaveLength(i + 1);
      });

      // Create comment
      fireEvent.click(pdfPage, { clientX: 100 + i * 50, clientY: 200 + i * 30 });

      await waitFor(() => {
        expect(screen.getByText(/add comment/i)).toBeInTheDocument();
      });

      const commentInput = screen.getByLabelText(/comment/i);
      await user.type(commentInput, `Comment ${i}`);

      const saveButton = screen.getByRole('button', { name: /save comment/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('comment-marker')).toHaveLength(i + 1);
      });
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should complete within reasonable time (adjust threshold as needed)
    expect(totalTime).toBeLessThan(10000); // 10 seconds

    // All annotations should be visible
    expect(screen.getAllByTestId('highlight-overlay')).toHaveLength(5);
    expect(screen.getAllByTestId('comment-marker')).toHaveLength(5);
  });
});