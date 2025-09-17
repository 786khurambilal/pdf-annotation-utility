import { useState, useEffect, useCallback } from 'react';
import { errorHandler, AppError, ErrorType, handlePDFError, handleAnnotationError, handleStorageError, handleNetworkError } from '../utils/errorHandling';

export interface UseErrorHandlerReturn {
  errors: AppError[];
  hasErrors: boolean;
  clearErrors: () => void;
  clearError: (id: string) => void;
  handleError: (error: Error, context?: Record<string, any>) => void;
  handlePDFError: (error: Error, fileName?: string) => void;
  handleAnnotationError: (error: Error, operation: string, annotationType?: string) => void;
  handleStorageError: (error: Error, operation?: string) => void;
  handleNetworkError: (error: Error, url?: string) => void;
  getErrorsByType: (type: ErrorType) => AppError[];
  getLatestError: () => AppError | null;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [errors, setErrors] = useState<AppError[]>([]);

  useEffect(() => {
    // Subscribe to error updates
    const unsubscribe = errorHandler.subscribe((updatedErrors) => {
      setErrors(updatedErrors);
    });

    // Initialize with current errors
    setErrors(errorHandler.getErrors());

    return unsubscribe;
  }, []);

  const clearErrors = useCallback(() => {
    errorHandler.clearErrors();
  }, []);

  const clearError = useCallback((id: string) => {
    errorHandler.clearError(id);
  }, []);

  const handleError = useCallback((error: Error, context?: Record<string, any>) => {
    errorHandler.handleError(error, context);
  }, []);

  const getErrorsByType = useCallback((type: ErrorType): AppError[] => {
    return errors.filter(error => error.type === type);
  }, [errors]);

  const getLatestError = useCallback((): AppError | null => {
    return errors.length > 0 ? errors[0] : null;
  }, [errors]);

  return {
    errors,
    hasErrors: errors.length > 0,
    clearErrors,
    clearError,
    handleError,
    handlePDFError,
    handleAnnotationError,
    handleStorageError,
    handleNetworkError,
    getErrorsByType,
    getLatestError,
  };
};

// Hook for specific error types
export const usePDFErrors = () => {
  const { getErrorsByType, clearError, handlePDFError } = useErrorHandler();
  
  return {
    pdfErrors: getErrorsByType(ErrorType.PDF_LOAD).concat(getErrorsByType(ErrorType.PDF_RENDER)),
    clearPDFError: clearError,
    handlePDFError,
  };
};

export const useAnnotationErrors = () => {
  const { getErrorsByType, clearError, handleAnnotationError } = useErrorHandler();
  
  return {
    annotationErrors: getErrorsByType(ErrorType.ANNOTATION_CREATE)
      .concat(getErrorsByType(ErrorType.ANNOTATION_UPDATE))
      .concat(getErrorsByType(ErrorType.ANNOTATION_DELETE)),
    clearAnnotationError: clearError,
    handleAnnotationError,
  };
};

export const useStorageErrors = () => {
  const { getErrorsByType, clearError, handleStorageError } = useErrorHandler();
  
  return {
    storageErrors: getErrorsByType(ErrorType.STORAGE),
    clearStorageError: clearError,
    handleStorageError,
  };
};