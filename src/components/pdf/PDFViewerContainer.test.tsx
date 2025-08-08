import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFViewerContainer } from './PDFViewerContainer';
import { UserProvider } from '../../contexts/UserContext';
import { AnnotationProvider } from '../../contexts/AnnotationContext';
import { PdfProvider } from '../../contexts/PdfContext';



// Mock text selection hook
jest.mock('../../hooks/useTextSelection', () => ({
  useTextSelection: () => ({
    currentSelection: null,
    clearSelection: jest.fn(),
    isSelecting: false,
    setPageElement: jest.fn(),
  }),
}));

// Test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UserProvider>
    <AnnotationProvider>
      <PdfProvider>
        {children}
      </PdfProvider>
    </AnnotationProvider>
  </UserProvider>
);

// Mock PDF file
const createMockPdfFile = (name = 'test.pdf'): File => {
  const content = '%PDF-1.4 mock content';
  return new File([content], name, { type: 'application/pdf' });
};

describe('PDFViewerContainer', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('renders the main container with header', () => {
      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      expect(screen.getByText('Ebook Utility')).toBeInTheDocument();
      expect(screen.getByText('Drag and drop a PDF file here, or click to select a file')).toBeInTheDocument();
    });

    it('shows user management section', () => {
      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      // UserManager component should be rendered
      expect(screen.getByText('Current User:')).toBeInTheDocument();
    });

    it('shows upload area when no file is loaded', () => {
      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      expect(screen.getByText('Drag and drop a PDF file here, or click to select a file')).toBeInTheDocument();
      expect(screen.getByText('Maximum file size: 50MB')).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('handles file upload successfully', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      // First set up a user
      const userInput = screen.getByPlaceholderText('Enter your name');
      await user.type(userInput, 'Test User');
      await user.click(screen.getByText('Set User'));

      // Create and upload a mock PDF file
      const file = createMockPdfFile();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });
    });

    it('shows error for invalid file type', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      // Create an invalid file
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, invalidFile);

      await waitFor(() => {
        expect(screen.getByText(/Please select a valid PDF file/)).toBeInTheDocument();
      });
    });

    it('shows error for oversized file', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      // Create an oversized file (mock 60MB)
      const oversizedContent = 'x'.repeat(60 * 1024 * 1024);
      const oversizedFile = new File([oversizedContent], 'large.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, oversizedFile);

      await waitFor(() => {
        expect(screen.getByText(/File size too large/)).toBeInTheDocument();
      });
    });
  });

  describe('PDF Viewer Controls', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      // Set up user and upload file
      const userInput = screen.getByPlaceholderText('Enter your name');
      await user.type(userInput, 'Test User');
      await user.click(screen.getByText('Set User'));

      const file = createMockPdfFile();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });
    });

    it('shows navigation controls when PDF is loaded', async () => {
      await waitFor(() => {
        expect(screen.getByText('Page')).toBeInTheDocument();
        expect(screen.getByText('of')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // Total pages from mock
      });
    });

    it('shows zoom controls when PDF is loaded', async () => {
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
        expect(screen.getByText('Fit Width')).toBeInTheDocument();
        expect(screen.getByText('Fit Page')).toBeInTheDocument();
      });
    });

    it('allows page navigation', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      });

      // Click next page button
      const nextButton = screen.getByLabelText('Next page');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });
    });

    it('allows zoom control', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      // Click zoom in button
      const zoomInButton = screen.getByLabelText('Zoom in');
      await user.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText('125%')).toBeInTheDocument();
      });
    });
  });

  describe('Sidebar and Annotations', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      // Set up user and upload file
      const userInput = screen.getByPlaceholderText('Enter your name');
      await user.type(userInput, 'Test User');
      await user.click(screen.getByText('Set User'));

      const file = createMockPdfFile();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });
    });

    it('toggles sidebar visibility', async () => {
      const user = userEvent.setup();
      
      // Initially sidebar should be closed
      expect(screen.queryByText('Bookmarks')).not.toBeInTheDocument();

      // Click to show annotations
      const toggleButton = screen.getByText('Show Annotations');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Bookmarks')).toBeInTheDocument();
        expect(screen.getByText('Highlights')).toBeInTheDocument();
        expect(screen.getByText('Comments')).toBeInTheDocument();
        expect(screen.getByText('Links')).toBeInTheDocument();
      });

      // Click to hide annotations
      const hideButton = screen.getByText('Hide Annotations');
      await user.click(hideButton);

      await waitFor(() => {
        expect(screen.queryByText('Bookmarks')).not.toBeInTheDocument();
      });
    });

    it('switches between sidebar tabs', async () => {
      const user = userEvent.setup();
      
      // Open sidebar
      const toggleButton = screen.getByText('Show Annotations');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Add Bookmark')).toBeInTheDocument();
      });

      // Switch to highlights tab
      const highlightsTab = screen.getByText('Highlights');
      await user.click(highlightsTab);

      await waitFor(() => {
        expect(screen.getByText('No highlights yet')).toBeInTheDocument();
      });

      // Switch to comments tab
      const commentsTab = screen.getByText('Comments');
      await user.click(commentsTab);

      await waitFor(() => {
        expect(screen.getByText('No comments yet')).toBeInTheDocument();
      });
    });

    it('allows bookmark creation', async () => {
      const user = userEvent.setup();
      
      // Mock window.prompt
      const mockPrompt = jest.spyOn(window, 'prompt');
      mockPrompt.mockReturnValueOnce('Test Bookmark');
      mockPrompt.mockReturnValueOnce('Test Description');

      // Open sidebar
      const toggleButton = screen.getByText('Show Annotations');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Add Bookmark')).toBeInTheDocument();
      });

      // Click add bookmark
      const addButton = screen.getByText('Add Bookmark');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Test Bookmark')).toBeInTheDocument();
        expect(screen.getByText('Page 1')).toBeInTheDocument();
      });

      mockPrompt.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('displays PDF load errors', async () => {
      const user = userEvent.setup();
      
      // Mock PDF loading to fail
      jest.doMock('react-pdf', () => ({
        Document: ({ onLoadError }: any) => {
          React.useEffect(() => {
            onLoadError?.(new Error('Failed to load PDF'));
          }, [onLoadError]);
          return <div data-testid="pdf-document-error">Error</div>;
        },
        Page: () => <div>Page</div>,
        pdfjs: {
          GlobalWorkerOptions: { workerSrc: '' },
          version: '3.0.0'
        }
      }));

      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      // Set up user and upload file
      const userInput = screen.getByPlaceholderText('Enter your name');
      await user.type(userInput, 'Test User');
      await user.click(screen.getByText('Set User'));

      const file = createMockPdfFile();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load PDF/)).toBeInTheDocument();
      });
    });

    it('handles missing user gracefully', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      // Upload file without setting user
      const file = createMockPdfFile();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // Open sidebar and try to add bookmark - should be disabled
      const toggleButton = screen.getByText('Show Annotations');
      await user.click(toggleButton);

      await waitFor(() => {
        const addButton = screen.getByText('Add Bookmark');
        expect(addButton).toBeDisabled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for smaller screens', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      // Component should render without errors on smaller screens
      expect(screen.getByText('Ebook Utility')).toBeInTheDocument();
    });
  });

  describe('Integration Workflows', () => {
    it('completes full annotation workflow', async () => {
      const user = userEvent.setup();
      
      // Mock window.prompt for bookmark creation
      const mockPrompt = jest.spyOn(window, 'prompt');
      mockPrompt.mockReturnValueOnce('Important Section');
      mockPrompt.mockReturnValueOnce('This section contains key information');

      render(
        <TestWrapper>
          <PDFViewerContainer />
        </TestWrapper>
      );

      // 1. Set up user
      const userInput = screen.getByPlaceholderText('Enter your name');
      await user.type(userInput, 'Test User');
      await user.click(screen.getByText('Set User'));

      // 2. Upload PDF
      const file = createMockPdfFile();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });

      // 3. Navigate to page 2
      const nextButton = screen.getByLabelText('Next page');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      // 4. Open sidebar and create bookmark
      const toggleButton = screen.getByText('Show Annotations');
      await user.click(toggleButton);

      const addButton = screen.getByText('Add Bookmark');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Important Section')).toBeInTheDocument();
        expect(screen.getByText('Page 2')).toBeInTheDocument();
      });

      // 5. Navigate to different page and use bookmark to return
      const prevButton = screen.getByLabelText('Previous page');
      await user.click(prevButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      });

      // Click on bookmark to navigate back
      const bookmarkItem = screen.getByText('Important Section');
      await user.click(bookmarkItem);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      mockPrompt.mockRestore();
    });
  });
});