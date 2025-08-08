import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PdfDisplay } from './PdfDisplay';
import { ZoomMode } from './ZoomControls';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock react-pdf with simple static implementations
jest.mock('react-pdf', () => ({
  Document: ({ children }: any) => {
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber, scale }: any) => {
    return (
      <div data-testid={`pdf-page-${pageNumber}`}>
        Page {pageNumber} (Scale: {scale})
      </div>
    );
  },
  pdfjs: {
    GlobalWorkerOptions: { workerSrc: '' },
    version: '3.0.0'
  }
}));

// Mock file creation helper
const createMockFile = (name: string, size: number = 1024): File => {
  return new File(['mock pdf content'], name, { type: 'application/pdf' });
};

// Global variables for controlling mock behavior
declare global {
  var mockPdfError: string | null;
  var mockPdfLoading: boolean;
  var mockPageError: string | null;
  var mockPageLoading: boolean;
}

describe('PdfDisplay Component', () => {
  it('should render no file message when no file is provided', () => {
    render(<PdfDisplay file={null} />);
    
    expect(screen.getByText('No PDF file selected. Please upload a PDF file to view it here.')).toBeInTheDocument();
  });

  it('should render PDF document container when file is provided', () => {
    const mockFile = createMockFile('test.pdf');
    render(<PdfDisplay file={mockFile} />);
    
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
  });

  it('should handle file changes correctly', () => {
    const mockFile = createMockFile('test.pdf');
    
    const { rerender } = render(<PdfDisplay file={mockFile} />);
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    
    // Change to null file
    rerender(<PdfDisplay file={null} />);
    expect(screen.getByText('No PDF file selected. Please upload a PDF file to view it here.')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-document')).not.toBeInTheDocument();
  });

  it('should render container structure correctly', () => {
    render(<PdfDisplay file={null} />);
    
    // Check that the container structure is rendered
    const container = screen.getByText('No PDF file selected. Please upload a PDF file to view it here.').parentElement;
    expect(container).toBeInTheDocument();
  });

  it('should accept props correctly', () => {
    const mockFile = createMockFile('test.pdf');
    const mockOnLoadSuccess = jest.fn();
    const mockOnLoadError = jest.fn();
    
    render(
      <PdfDisplay 
        file={mockFile} 
        pageNumber={2} 
        scale={1.5}
        onLoadSuccess={mockOnLoadSuccess}
        onLoadError={mockOnLoadError}
      />
    );
    
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
  });

  it('should accept zoom mode prop', () => {
    const mockFile = createMockFile('test.pdf');
    
    render(
      <PdfDisplay 
        file={mockFile} 
        zoomMode="fit-width"
      />
    );
    
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
  });

  it('should handle different zoom modes', () => {
    const mockFile = createMockFile('test.pdf');
    
    const { rerender } = render(
      <PdfDisplay 
        file={mockFile} 
        zoomMode="custom"
        scale={1.5}
      />
    );
    
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    
    // Test fit-width mode
    rerender(
      <PdfDisplay 
        file={mockFile} 
        zoomMode="fit-width"
        scale={1.5}
      />
    );
    
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    
    // Test fit-page mode
    rerender(
      <PdfDisplay 
        file={mockFile} 
        zoomMode="fit-page"
        scale={1.5}
      />
    );
    
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
  });
});