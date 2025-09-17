import { 
  errorHandler, 
  ErrorType, 
  AppError,
  handlePDFError,
  handleAnnotationError,
  handleStorageError,
  handleNetworkError,
  setupGlobalErrorHandling
} from './errorHandling';

describe('ErrorHandlingService', () => {
  beforeEach(() => {
    errorHandler.clearErrors();
  });

  describe('handleError', () => {
    it('should handle Error objects and convert them to AppError', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error);

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        type: ErrorType.UNKNOWN,
        message: 'Test error',
        details: expect.any(String),
        timestamp: expect.any(Date),
      });
    });

    it('should handle AppError objects directly', () => {
      const appError: AppError = {
        id: 'test-id',
        type: ErrorType.PDF_LOAD,
        message: 'PDF load failed',
        timestamp: new Date(),
      };

      errorHandler.handleError(appError);

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(appError);
    });

    it('should determine error type from context', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error, { operation: 'PDF_LOAD' });

      const errors = errorHandler.getErrors();
      expect(errors[0].type).toBe(ErrorType.PDF_LOAD);
    });

    it('should determine error type from error message', () => {
      const error = new Error('Failed to load PDF document');
      errorHandler.handleError(error);

      const errors = errorHandler.getErrors();
      expect(errors[0].type).toBe(ErrorType.PDF_LOAD);
    });

    it('should limit the number of stored errors', () => {
      // Add more than the maximum number of errors
      for (let i = 0; i < 15; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }

      const errors = errorHandler.getErrors();
      expect(errors.length).toBeLessThanOrEqual(10);
      expect(errors[0].message).toBe('Error 14'); // Most recent error first
    });
  });

  describe('error subscription', () => {
    it('should notify subscribers when errors are added', () => {
      const subscriber = jest.fn();
      const unsubscribe = errorHandler.subscribe(subscriber);

      const error = new Error('Test error');
      errorHandler.handleError(error);

      expect(subscriber).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Test error'
          })
        ])
      );

      unsubscribe();
    });

    it('should not notify unsubscribed callbacks', () => {
      const subscriber = jest.fn();
      const unsubscribe = errorHandler.subscribe(subscriber);
      unsubscribe();

      const error = new Error('Test error');
      errorHandler.handleError(error);

      expect(subscriber).not.toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should remove specific error by ID', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      errorHandler.handleError(error1);
      errorHandler.handleError(error2);

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(2);

      errorHandler.clearError(errors[0].id);
      const remainingErrors = errorHandler.getErrors();
      expect(remainingErrors).toHaveLength(1);
      expect(remainingErrors[0].message).toBe('Error 1');
    });
  });

  describe('clearErrors', () => {
    it('should remove all errors', () => {
      errorHandler.handleError(new Error('Error 1'));
      errorHandler.handleError(new Error('Error 2'));

      expect(errorHandler.getErrors()).toHaveLength(2);

      errorHandler.clearErrors();
      expect(errorHandler.getErrors()).toHaveLength(0);
    });
  });
});

describe('Error type determination', () => {
  beforeEach(() => {
    errorHandler.clearErrors();
  });

  it('should identify PDF load errors', () => {
    const error = new Error('Failed to load PDF file');
    errorHandler.handleError(error);

    const errors = errorHandler.getErrors();
    expect(errors[0].type).toBe(ErrorType.PDF_LOAD);
  });

  it('should identify storage errors', () => {
    const error = new Error('Storage quota exceeded');
    errorHandler.handleError(error);

    const errors = errorHandler.getErrors();
    expect(errors[0].type).toBe(ErrorType.STORAGE);
  });

  it('should identify network errors', () => {
    const error = new Error('Network request failed');
    errorHandler.handleError(error);

    const errors = errorHandler.getErrors();
    expect(errors[0].type).toBe(ErrorType.NETWORK);
  });

  it('should identify validation errors', () => {
    const error = new Error('Invalid input data');
    errorHandler.handleError(error);

    const errors = errorHandler.getErrors();
    expect(errors[0].type).toBe(ErrorType.VALIDATION);
  });
});

describe('Utility error handlers', () => {
  beforeEach(() => {
    errorHandler.clearErrors();
  });

  it('should handle PDF errors with context', () => {
    const error = new Error('PDF load failed');
    handlePDFError(error, 'test.pdf');

    const errors = errorHandler.getErrors();
    expect(errors[0]).toMatchObject({
      type: ErrorType.PDF_LOAD,
      context: {
        operation: 'PDF_LOAD',
        fileName: 'test.pdf'
      }
    });
  });

  it('should handle annotation errors with context', () => {
    const error = new Error('Annotation creation failed');
    handleAnnotationError(error, 'create', 'highlight');

    const errors = errorHandler.getErrors();
    expect(errors[0]).toMatchObject({
      type: ErrorType.ANNOTATION_CREATE,
      context: {
        operation: 'ANNOTATION_CREATE',
        annotationType: 'highlight'
      }
    });
  });

  it('should handle storage errors with context', () => {
    const error = new Error('Storage operation failed');
    handleStorageError(error, 'save');

    const errors = errorHandler.getErrors();
    expect(errors[0]).toMatchObject({
      type: ErrorType.STORAGE,
      context: {
        operation: 'STORAGE',
        storageOperation: 'save'
      }
    });
  });

  it('should handle network errors with context', () => {
    const error = new Error('Network request failed');
    handleNetworkError(error, 'https://example.com');

    const errors = errorHandler.getErrors();
    expect(errors[0]).toMatchObject({
      type: ErrorType.NETWORK,
      context: {
        operation: 'NETWORK',
        url: 'https://example.com'
      }
    });
  });
});

describe('Global error handling setup', () => {
  it('should set up global error handlers', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    
    setupGlobalErrorHandling();

    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));

    addEventListenerSpy.mockRestore();
  });
});