import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { usePDFErrors } from '../../hooks/useErrorHandler';
import { usePDFNotifications } from '../../hooks/useNotifications';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { ProgressIndicator } from '../common/ProgressIndicator';

interface PdfUploadProps {
  onFileSelect: (file: File) => void;
  onError?: (error: string) => void;
  isProcessing?: boolean;
  processingProgress?: number;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const UploadContainer = styled.div`
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s ease;
  
  &:hover {
    border-color: #007bff;
  }
  
  &.drag-over {
    border-color: #007bff;
    background-color: #f8f9fa;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const UploadText = styled.p`
  margin: 0;
  color: #666;
  font-size: 1rem;
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  margin-top: 1rem;
  padding: 0.5rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
`;

// Constants for validation
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['application/pdf'];

export const validatePdfFile = (file: File): ValidationResult => {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please select a valid PDF file. Only PDF files are supported.'
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size too large. Please select a PDF file smaller than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
    };
  }

  // Check file extension as additional validation
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.pdf')) {
    return {
      isValid: false,
      error: 'Please select a file with .pdf extension.'
    };
  }

  return { isValid: true };
};

export const PdfUpload: React.FC<PdfUploadProps> = ({ 
  onFileSelect, 
  onError, 
  isProcessing = false,
  processingProgress = 0
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handlePDFError } = usePDFErrors();
  const { showPDFLoadError, showPDFLoadSuccess } = usePDFNotifications();

  const handleFileValidation = useCallback((file: File) => {
    const validation = validatePdfFile(file);
    
    if (!validation.isValid) {
      const errorMessage = validation.error || 'Invalid file';
      const validationError = new Error(errorMessage);
      
      setError(errorMessage);
      handlePDFError(validationError, file.name);
      onError?.(errorMessage);
      return false;
    }

    setError(null);
    return true;
  }, [onError, handlePDFError]);

  const handleFileSelect = useCallback((file: File) => {
    try {
      if (handleFileValidation(file)) {
        showPDFLoadSuccess(file.name);
        onFileSelect(file);
      }
    } catch (error) {
      const fileError = error instanceof Error ? error : new Error('Failed to process file');
      handlePDFError(fileError, file.name);
      showPDFLoadError(file.name, fileError.message);
      setError(fileError.message);
    }
  }, [handleFileValidation, onFileSelect, handlePDFError, showPDFLoadSuccess, showPDFLoadError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    const input = document.getElementById('pdf-upload-input') as HTMLInputElement;
    input?.click();
  }, []);

  return (
    <>
      {isProcessing ? (
        <ProgressIndicator
          progress={processingProgress}
          message="Processing PDF file..."
          size="large"
        />
      ) : (
        <UploadContainer
          className={isDragOver ? 'drag-over' : ''}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <UploadText>
            Drag and drop a PDF file here, or click to select a file
          </UploadText>
          <UploadText style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Maximum file size: 50MB
          </UploadText>
        </UploadContainer>
      )}
      
      <HiddenInput
        id="pdf-upload-input"
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        disabled={isProcessing}
      />
      
      {error && (
        <ErrorDisplay
          title="File Upload Error"
          message={error}
          type="error"
          onDismiss={() => setError(null)}
        />
      )}
    </>
  );
};