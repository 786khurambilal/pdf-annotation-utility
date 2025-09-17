import { renderHook, act } from '@testing-library/react';
import { useDebouncedAnnotations, useDebouncedAnnotationType, useAnnotationBatch } from './useDebouncedAnnotations';
import { Highlight, Comment, CallToAction } from '../types/annotation.types';

// Mock data
const mockHighlight: Highlight = {
  id: 'highlight-1',
  userId: 'user-1',
  documentId: 'doc-1',
  pageNumber: 1,
  startOffset: 0,
  endOffset: 10,
  selectedText: 'Sample text',
  color: '#ffff00',
  coordinates: { x: 100, y: 200, width: 150, height: 20 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockComment: Comment = {
  id: 'comment-1',
  userId: 'user-1',
  documentId: 'doc-1',
  pageNumber: 1,
  content: 'This is a comment',
  coordinates: { x: 300, y: 400 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCTA: CallToAction = {
  id: 'cta-1',
  userId: 'user-1',
  documentId: 'doc-1',
  pageNumber: 1,
  url: 'https://example.com',
  label: 'Click here',
  coordinates: { x: 500, y: 600, width: 100, height: 30 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('useDebouncedAnnotations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useDebouncedAnnotations());

      expect(result.current.state.highlights).toEqual([]);
      expect(result.current.state.comments).toEqual([]);
      expect(result.current.state.callToActions).toEqual([]);
      expect(result.current.state.isUpdating).toBe(false);
      expect(result.current.state.lastUpdateTime).toBe(0);
    });

    it('should accept custom options', () => {
      const onUpdate = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedAnnotations({
          debounceDelay: 500,
          maxBatchSize: 25,
          onUpdate,
        })
      );

      expect(result.current.state).toBeDefined();
    });
  });

  describe('debounced updates', () => {
    it('should debounce highlight updates', () => {
      const { result } = renderHook(() => 
        useDebouncedAnnotations({ debounceDelay: 300 })
      );

      act(() => {
        result.current.updateHighlights([mockHighlight]);
      });

      // Should be updating but not yet applied
      expect(result.current.state.isUpdating).toBe(true);
      expect(result.current.state.highlights).toEqual([]);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should now be applied
      expect(result.current.state.isUpdating).toBe(false);
      expect(result.current.state.highlights).toEqual([mockHighlight]);
    });

    it('should debounce comment updates', () => {
      const { result } = renderHook(() => 
        useDebouncedAnnotations({ debounceDelay: 300 })
      );

      act(() => {
        result.current.updateComments([mockComment]);
      });

      expect(result.current.state.isUpdating).toBe(true);
      expect(result.current.state.comments).toEqual([]);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.state.isUpdating).toBe(false);
      expect(result.current.state.comments).toEqual([mockComment]);
    });

    it('should debounce call-to-action updates', () => {
      const { result } = renderHook(() => 
        useDebouncedAnnotations({ debounceDelay: 300 })
      );

      act(() => {
        result.current.updateCallToActions([mockCTA]);
      });

      expect(result.current.state.isUpdating).toBe(true);
      expect(result.current.state.callToActions).toEqual([]);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.state.isUpdating).toBe(false);
      expect(result.current.state.callToActions).toEqual([mockCTA]);
    });

    it('should batch multiple updates', () => {
      const { result } = renderHook(() => 
        useDebouncedAnnotations({ debounceDelay: 300 })
      );

      act(() => {
        result.current.updateHighlights([mockHighlight]);
        result.current.updateComments([mockComment]);
        result.current.updateCallToActions([mockCTA]);
      });

      // Should still be updating
      expect(result.current.state.isUpdating).toBe(true);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // All updates should be applied
      expect(result.current.state.isUpdating).toBe(false);
      expect(result.current.state.highlights).toEqual([mockHighlight]);
      expect(result.current.state.comments).toEqual([mockComment]);
      expect(result.current.state.callToActions).toEqual([mockCTA]);
    });

    it('should update all annotation types at once', () => {
      const { result } = renderHook(() => 
        useDebouncedAnnotations({ debounceDelay: 300 })
      );

      act(() => {
        result.current.updateAll([mockHighlight], [mockComment], [mockCTA]);
      });

      expect(result.current.state.isUpdating).toBe(true);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.state.isUpdating).toBe(false);
      expect(result.current.state.highlights).toEqual([mockHighlight]);
      expect(result.current.state.comments).toEqual([mockComment]);
      expect(result.current.state.callToActions).toEqual([mockCTA]);
    });
  });

  describe('force update', () => {
    it('should apply updates immediately', () => {
      const { result } = renderHook(() => 
        useDebouncedAnnotations({ debounceDelay: 300 })
      );

      act(() => {
        result.current.updateHighlights([mockHighlight]);
        result.current.forceUpdate();
      });

      // Should be applied immediately without waiting for debounce
      expect(result.current.state.isUpdating).toBe(false);
      expect(result.current.state.highlights).toEqual([mockHighlight]);
    });
  });

  describe('clear updates', () => {
    it('should clear pending updates', () => {
      const { result } = renderHook(() => 
        useDebouncedAnnotations({ debounceDelay: 300 })
      );

      act(() => {
        result.current.updateHighlights([mockHighlight]);
        result.current.clearUpdates();
      });

      // Should not be updating and no changes applied
      expect(result.current.state.isUpdating).toBe(false);
      expect(result.current.state.highlights).toEqual([]);

      // Even after debounce time, no updates should be applied
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.state.highlights).toEqual([]);
    });
  });

  describe('batch size limiting', () => {
    it('should limit batch size for highlights', () => {
      const { result } = renderHook(() => 
        useDebouncedAnnotations({ debounceDelay: 300, maxBatchSize: 2 })
      );

      const manyHighlights = [
        { ...mockHighlight, id: 'h1' },
        { ...mockHighlight, id: 'h2' },
        { ...mockHighlight, id: 'h3' },
        { ...mockHighlight, id: 'h4' },
      ];

      act(() => {
        result.current.updateHighlights(manyHighlights);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should only have first 2 highlights
      expect(result.current.state.highlights).toHaveLength(2);
      expect(result.current.state.highlights[0].id).toBe('h1');
      expect(result.current.state.highlights[1].id).toBe('h2');
    });
  });

  describe('update callback', () => {
    it('should call onUpdate callback when state changes', () => {
      const onUpdate = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedAnnotations({ debounceDelay: 300, onUpdate })
      );

      act(() => {
        result.current.updateHighlights([mockHighlight]);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          highlights: [mockHighlight],
          isUpdating: false,
        })
      );
    });
  });

  describe('update statistics', () => {
    it('should track update statistics', () => {
      const { result } = renderHook(() => 
        useDebouncedAnnotations({ debounceDelay: 300 })
      );

      act(() => {
        result.current.updateHighlights([mockHighlight]);
      });

      let stats = result.current.getUpdateStats();
      expect(stats.pendingUpdates).toBe(1);
      expect(stats.totalUpdates).toBe(0);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      stats = result.current.getUpdateStats();
      expect(stats.pendingUpdates).toBe(0);
      expect(stats.totalUpdates).toBe(1);
      expect(stats.averageDelay).toBeGreaterThan(0);
    });
  });
});

describe('useDebouncedAnnotationType', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce single annotation type updates', () => {
    const { result } = renderHook(() => 
      useDebouncedAnnotationType<Highlight>([mockHighlight], { debounceDelay: 300 })
    );

    expect(result.current.annotations).toEqual([mockHighlight]);

    const newHighlight = { ...mockHighlight, id: 'new-highlight' };

    act(() => {
      result.current.updateAnnotations([newHighlight]);
    });

    expect(result.current.isUpdating).toBe(true);
    expect(result.current.annotations).toEqual([mockHighlight]); // Still old value

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.isUpdating).toBe(false);
    expect(result.current.annotations).toEqual([newHighlight]);
  });

  it('should force update immediately', () => {
    const { result } = renderHook(() => 
      useDebouncedAnnotationType<Highlight>([mockHighlight])
    );

    const newHighlight = { ...mockHighlight, id: 'new-highlight' };

    act(() => {
      result.current.forceUpdate([newHighlight]);
    });

    expect(result.current.isUpdating).toBe(false);
    expect(result.current.annotations).toEqual([newHighlight]);
  });
});

describe('useAnnotationBatch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should batch operations', () => {
    const { result } = renderHook(() => useAnnotationBatch());

    const operation1 = jest.fn();
    const operation2 = jest.fn();

    act(() => {
      result.current.addToBatch(operation1);
      result.current.addToBatch(operation2);
    });

    expect(result.current.batchedOperations).toBe(2);
    expect(result.current.isProcessing).toBe(false);
    expect(operation1).not.toHaveBeenCalled();
    expect(operation2).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.batchedOperations).toBe(0);
    expect(result.current.isProcessing).toBe(false);
    expect(operation1).toHaveBeenCalled();
    expect(operation2).toHaveBeenCalled();
  });

  it('should process batch immediately', () => {
    const { result } = renderHook(() => useAnnotationBatch());

    const operation = jest.fn();

    act(() => {
      result.current.addToBatch(operation);
      result.current.processBatch();
    });

    expect(result.current.batchedOperations).toBe(0);
    expect(result.current.isProcessing).toBe(false);
    expect(operation).toHaveBeenCalled();
  });

  it('should clear batch', () => {
    const { result } = renderHook(() => useAnnotationBatch());

    const operation = jest.fn();

    act(() => {
      result.current.addToBatch(operation);
      result.current.clearBatch();
    });

    expect(result.current.batchedOperations).toBe(0);
    expect(result.current.isProcessing).toBe(false);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(operation).not.toHaveBeenCalled();
  });

  it('should handle operation errors gracefully', () => {
    const { result } = renderHook(() => useAnnotationBatch());

    const errorOperation = jest.fn(() => {
      throw new Error('Test error');
    });
    const normalOperation = jest.fn();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    act(() => {
      result.current.addToBatch(errorOperation);
      result.current.addToBatch(normalOperation);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(errorOperation).toHaveBeenCalled();
    expect(normalOperation).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error executing batched annotation operation:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});