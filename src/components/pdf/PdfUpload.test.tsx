import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PdfUpload, validatePdfFile } from './PdfUpload';

// Mock file creation helper
const createMockFile = (
  name: string,
  size: number,
  type: string = 'application/pdf'
): File => {
  const file = new File(['mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('validatePdfFile', () => {
  it('should validate a correct PDF file', () => {
    const validFile = createMockFile('test.pdf', 1024 * 1024); // 1MB
    const result = validatePdfFile(validFile);
    
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject non-PDF file types', () => {
    const invalidFile = createMockFile('test.txt', 1024, 'text/plain');
    const result = validatePdfFile(invalidFile);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Please select a valid PDF file. Only PDF files are supported.');
  });

  it('should reject files that are too large', () => {
    const largeFile = createMockFile('large.pdf', 60 * 1024 * 1024); // 60MB
    const result = validatePdfFile(largeFile);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File size too large. Please select a PDF file smaller than 50MB.');
  });

  it('should reject files without .pdf extension', () => {
    const invalidExtensionFile = createMockFile('test.doc', 1024);
    const result = validatePdfFile(invalidExtensionFile);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Please select a file with .pdf extension.');
  });

  it('should handle edge case of exactly max file size', () => {
    const maxSizeFile = createMockFile('max.pdf', 50 * 1024 * 1024); // Exactly 50MB
    const result = validatePdfFile(maxSizeFile);
    
    expect(result.isValid).toBe(true);
  });

  it('should handle case-insensitive file extensions', () => {
    const upperCaseFile = createMockFile('test.PDF', 1024);
    const result = validatePdfFile(upperCaseFile);
    
    expect(result.isValid).toBe(true);
  });
});

describe('PdfUpload Component', () => {
  const mockOnFileSelect = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render upload area with correct text', () => {
    render(<PdfUpload onFileSelect={mockOnFileSelect} onError={mockOnError} />);
    
    expect(screen.getByText('Drag and drop a PDF file here, or click to select a file')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 50MB')).toBeInTheDocument();
  });

  it('should handle file input change with valid file', async () => {
    render(<PdfUpload onFileSelect={mockOnFileSelect} onError={mockOnError} />);
    
    const input = document.getElementById('pdf-upload-input') as HTMLInputElement;
    const validFile = createMockFile('test.pdf', 1024);
    
    Object.defineProperty(input, 'files', {
      value: [validFile],
      writable: false,
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  it('should handle file input change with invalid file', async () => {
    render(<PdfUpload onFileSelect={mockOnFileSelect} onError={mockOnError} />);
    
    const input = document.getElementById('pdf-upload-input') as HTMLInputElement;
    const invalidFile = createMockFile('test.txt', 1024, 'text/plain');
    
    Object.defineProperty(input, 'files', {
      value: [invalidFile],
      writable: false,
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(mockOnFileSelect).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledWith('Please select a valid PDF file. Only PDF files are supported.');
    });
  });

  it('should display error message for invalid files', async () => {
    render(<PdfUpload onFileSelect={mockOnFileSelect} onError={mockOnError} />);
    
    const input = document.getElementById('pdf-upload-input') as HTMLInputElement;
    const invalidFile = createMockFile('test.txt', 1024, 'text/plain');
    
    Object.defineProperty(input, 'files', {
      value: [invalidFile],
      writable: false,
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('Please select a valid PDF file. Only PDF files are supported.')).toBeInTheDocument();
    });
  });

  it('should handle drag and drop with valid file', async () => {
    render(<PdfUpload onFileSelect={mockOnFileSelect} onError={mockOnError} />);
    
    const uploadArea = screen.getByText('Drag and drop a PDF file here, or click to select a file').parentElement;
    const validFile = createMockFile('test.pdf', 1024);
    
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [validFile]
      }
    });
    
    fireEvent(uploadArea!, dropEvent);
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
    });
  });

  it('should handle drag over and drag leave events', () => {
    render(<PdfUpload onFileSelect={mockOnFileSelect} onError={mockOnError} />);
    
    const uploadArea = screen.getByText('Drag and drop a PDF file here, or click to select a file').parentElement;
    
    // Test drag over
    fireEvent.dragOver(uploadArea!);
    expect(uploadArea).toHaveClass('drag-over');
    
    // Test drag leave
    fireEvent.dragLeave(uploadArea!);
    expect(uploadArea).not.toHaveClass('drag-over');
  });

  it('should trigger file input click when upload area is clicked', () => {
    render(<PdfUpload onFileSelect={mockOnFileSelect} onError={mockOnError} />);
    
    const input = document.getElementById('pdf-upload-input') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, 'click').mockImplementation(() => {});
    
    const uploadArea = screen.getByText('Drag and drop a PDF file here, or click to select a file').parentElement;
    fireEvent.click(uploadArea!);
    
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('should clear error when valid file is selected after invalid one', async () => {
    const { rerender } = render(<PdfUpload onFileSelect={mockOnFileSelect} onError={mockOnError} />);
    
    // First, select invalid file using drag and drop
    const uploadArea = screen.getByText('Drag and drop a PDF file here, or click to select a file').parentElement;
    const invalidFile = createMockFile('test.txt', 1024, 'text/plain');
    
    const dropEvent1 = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent1, 'dataTransfer', {
      value: {
        files: [invalidFile]
      }
    });
    
    fireEvent(uploadArea!, dropEvent1);
    
    await waitFor(() => {
      expect(screen.getByText('Please select a valid PDF file. Only PDF files are supported.')).toBeInTheDocument();
    });
    
    // Then, select valid file using drag and drop
    const validFile = createMockFile('test.pdf', 1024);
    const dropEvent2 = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent2, 'dataTransfer', {
      value: {
        files: [validFile]
      }
    });
    
    fireEvent(uploadArea!, dropEvent2);
    
    await waitFor(() => {
      expect(screen.queryByText('Please select a valid PDF file. Only PDF files are supported.')).not.toBeInTheDocument();
      expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
    });
  });
});