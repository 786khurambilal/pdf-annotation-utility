import { ErrorInfo } from 'react';

export interface AppError {
  id: string;
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
}

export enum ErrorType {
  PDF_LOAD = 'PDF_LOAD',
  PDF_RENDER = 'PDF_RENDER',
  ANNOTATION_CREATE = 'ANNOTATION_CREATE',
  ANNOTATION_UPDATE = 'ANNOTATION_UPDATE',
  ANNOTATION_DELETE = 'ANNOTATION_DELETE',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorHandler {
  handleError: (error: Error | AppError, context?: Record<string, any>) => void;
  getErrors: () => AppError[];
  clearErrors: () => void;
  clearError: (id: string) => void;
  subscribe: (callback: (errors: AppError[]) => void) => () => void;
}

class ErrorHandlingService implements ErrorHandler {
  private errors: AppError[] = [];
  private subscribers: ((errors: AppError[]) => void)[] = [];
  private maxErrors = 10; // Keep only the last 10 errors

  handleError = (error: Error | AppError, context?: Record<string, any>): void => {
    let appError: AppError;

    if (this.isAppError(error)) {
      appError = error;
    } else {
      appError = this.createAppError(error, context);
    }

    // Add to errors array
    this.errors.unshift(appError);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', appError);
    }

    // Notify subscribers
    this.notifySubscribers();
  };

  getErrors = (): AppError[] => {
    return [...this.errors];
  };

  clearErrors = (): void => {
    this.errors = [];
    this.notifySubscribers();
  };

  clearError = (id: string): void => {
    this.errors = this.errors.filter(error => error.id !== id);
    this.notifySubscribers();
  };

  subscribe = (callback: (errors: AppError[]) => void): (() => void) => {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  };

  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'id' in error;
  }

  private createAppError(error: Error, context?: Record<string, any>): AppError {
    const errorType = this.determineErrorType(error, context);
    
    return {
      id: this.generateErrorId(),
      type: errorType,
      message: this.getErrorMessage(error, errorType),
      details: error.stack,
      timestamp: new Date(),
      context,
      stack: error.stack,
    };
  }

  private determineErrorType(error: Error, context?: Record<string, any>): ErrorType {
    const message = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Check context for hints
    if (context?.operation) {
      const operation = context.operation.toLowerCase();
      if (operation.includes('pdf')) {
        if (operation.includes('load')) return ErrorType.PDF_LOAD;
        if (operation.includes('render')) return ErrorType.PDF_RENDER;
      }
      if (operation.includes('annotation')) {
        if (operation.includes('create')) return ErrorType.ANNOTATION_CREATE;
        if (operation.includes('update')) return ErrorType.ANNOTATION_UPDATE;
        if (operation.includes('delete')) return ErrorType.ANNOTATION_DELETE;
      }
      if (operation.includes('storage')) return ErrorType.STORAGE;
      if (operation.includes('network')) return ErrorType.NETWORK;
    }

    // Check error message for patterns
    if (message.includes('pdf') || message.includes('document')) {
      if (message.includes('load') || message.includes('fetch')) return ErrorType.PDF_LOAD;
      if (message.includes('render') || message.includes('display')) return ErrorType.PDF_RENDER;
    }

    if (message.includes('storage') || message.includes('quota') || errorName.includes('quota')) {
      return ErrorType.STORAGE;
    }

    if (message.includes('network') || message.includes('fetch') || errorName.includes('network')) {
      return ErrorType.NETWORK;
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }

    return ErrorType.UNKNOWN;
  }

  private getErrorMessage(error: Error, type: ErrorType): string {
    // Return user-friendly messages based on error type
    switch (type) {
      case ErrorType.PDF_LOAD:
        return 'Failed to load PDF file. The file may be corrupted or in an unsupported format.';
      case ErrorType.PDF_RENDER:
        return 'Failed to display PDF page. Please try refreshing or selecting a different page.';
      case ErrorType.ANNOTATION_CREATE:
        return 'Failed to create annotation. Please try again.';
      case ErrorType.ANNOTATION_UPDATE:
        return 'Failed to update annotation. Please try again.';
      case ErrorType.ANNOTATION_DELETE:
        return 'Failed to delete annotation. Please try again.';
      case ErrorType.STORAGE:
        return 'Failed to save data. Your browser storage may be full or unavailable.';
      case ErrorType.NETWORK:
        return 'Network error occurred. Please check your internet connection.';
      case ErrorType.VALIDATION:
        return 'Invalid data provided. Please check your input and try again.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback([...this.errors]);
      } catch (error) {
        console.error('Error in error handler subscriber:', error);
      }
    });
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandlingService();

// Utility functions for common error scenarios
export const handlePDFError = (error: Error, fileName?: string): void => {
  errorHandler.handleError(error, {
    operation: 'PDF_LOAD',
    fileName,
  });
};

export const handleAnnotationError = (error: Error, operation: string, annotationType?: string): void => {
  errorHandler.handleError(error, {
    operation: `ANNOTATION_${operation.toUpperCase()}`,
    annotationType,
  });
};

export const handleStorageError = (error: Error, operation?: string): void => {
  errorHandler.handleError(error, {
    operation: 'STORAGE',
    storageOperation: operation,
  });
};

export const handleNetworkError = (error: Error, url?: string): void => {
  errorHandler.handleError(error, {
    operation: 'NETWORK',
    url,
  });
};

// React Error Boundary helper
export const handleReactError = (error: Error, errorInfo: ErrorInfo): void => {
  errorHandler.handleError(error, {
    operation: 'REACT_RENDER',
    componentStack: errorInfo.componentStack,
  });
};

// Global error handler for unhandled errors
export const setupGlobalErrorHandling = (): void => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    errorHandler.handleError(error, {
      operation: 'UNHANDLED_PROMISE_REJECTION',
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error instanceof Error ? event.error : new Error(event.message);
    errorHandler.handleError(error, {
      operation: 'UNCAUGHT_ERROR',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
};