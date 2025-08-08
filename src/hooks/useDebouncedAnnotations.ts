import { useState, useEffect, useCallback, useRef } from 'react';
import { Highlight, Comment, CallToAction } from '../types/annotation.types';

export interface DebouncedAnnotationState {
  highlights: Highlight[];
  comments: Comment[];
  callToActions: CallToAction[];
  isUpdating: boolean;
  lastUpdateTime: number;
}

export interface UseDebouncedAnnotationsOptions {
  /** Debounce delay in milliseconds */
  debounceDelay?: number;
  /** Maximum number of updates to batch together */
  maxBatchSize?: number;
  /** Callback when annotations are updated */
  onUpdate?: (state: DebouncedAnnotationState) => void;
}

export interface UseDebouncedAnnotationsReturn {
  state: DebouncedAnnotationState;
  updateHighlights: (highlights: Highlight[]) => void;
  updateComments: (comments: Comment[]) => void;
  updateCallToActions: (callToActions: CallToAction[]) => void;
  updateAll: (highlights: Highlight[], comments: Comment[], callToActions: CallToAction[]) => void;
  forceUpdate: () => void;
  clearUpdates: () => void;
  getUpdateStats: () => {
    pendingUpdates: number;
    totalUpdates: number;
    averageDelay: number;
  };
}

/**
 * Hook for debouncing annotation updates to prevent excessive re-renders
 * and improve performance when dealing with many annotations
 */
export const useDebouncedAnnotations = ({
  debounceDelay = 300,
  maxBatchSize = 50,
  onUpdate,
}: UseDebouncedAnnotationsOptions = {}): UseDebouncedAnnotationsReturn => {
  const [state, setState] = useState<DebouncedAnnotationState>({
    highlights: [],
    comments: [],
    callToActions: [],
    isUpdating: false,
    lastUpdateTime: 0,
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingUpdatesRef = useRef<{
    highlights?: Highlight[];
    comments?: Comment[];
    callToActions?: CallToAction[];
  }>({});
  const updateCountRef = useRef(0);
  const totalDelayRef = useRef(0);
  const lastUpdateTimeRef = useRef(Date.now());

  // Apply pending updates
  const applyUpdates = useCallback(() => {
    const now = Date.now();
    const updates = pendingUpdatesRef.current;
    
    if (Object.keys(updates).length === 0) {
      return;
    }

    setState(prevState => {
      const newState: DebouncedAnnotationState = {
        highlights: updates.highlights ?? prevState.highlights,
        comments: updates.comments ?? prevState.comments,
        callToActions: updates.callToActions ?? prevState.callToActions,
        isUpdating: false,
        lastUpdateTime: now,
      };

      // Track update statistics
      updateCountRef.current++;
      totalDelayRef.current += now - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = now;

      // Call update callback
      onUpdate?.(newState);

      return newState;
    });

    // Clear pending updates
    pendingUpdatesRef.current = {};
  }, [onUpdate]);

  // Schedule debounced update
  const scheduleUpdate = useCallback(() => {
    setState(prevState => ({ ...prevState, isUpdating: true }));

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Schedule new update
    debounceTimeoutRef.current = setTimeout(() => {
      applyUpdates();
      debounceTimeoutRef.current = undefined;
    }, debounceDelay);
  }, [debounceDelay, applyUpdates]);

  // Update highlights
  const updateHighlights = useCallback((highlights: Highlight[]) => {
    // Limit batch size to prevent memory issues
    const limitedHighlights = highlights.slice(0, maxBatchSize);
    
    pendingUpdatesRef.current.highlights = limitedHighlights;
    scheduleUpdate();
  }, [maxBatchSize, scheduleUpdate]);

  // Update comments
  const updateComments = useCallback((comments: Comment[]) => {
    const limitedComments = comments.slice(0, maxBatchSize);
    
    pendingUpdatesRef.current.comments = limitedComments;
    scheduleUpdate();
  }, [maxBatchSize, scheduleUpdate]);

  // Update call-to-actions
  const updateCallToActions = useCallback((callToActions: CallToAction[]) => {
    const limitedCTAs = callToActions.slice(0, maxBatchSize);
    
    pendingUpdatesRef.current.callToActions = limitedCTAs;
    scheduleUpdate();
  }, [maxBatchSize, scheduleUpdate]);

  // Update all annotation types at once
  const updateAll = useCallback((
    highlights: Highlight[],
    comments: Comment[],
    callToActions: CallToAction[]
  ) => {
    pendingUpdatesRef.current = {
      highlights: highlights.slice(0, maxBatchSize),
      comments: comments.slice(0, maxBatchSize),
      callToActions: callToActions.slice(0, maxBatchSize),
    };
    scheduleUpdate();
  }, [maxBatchSize, scheduleUpdate]);

  // Force immediate update
  const forceUpdate = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = undefined;
    }
    applyUpdates();
  }, [applyUpdates]);

  // Clear pending updates
  const clearUpdates = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = undefined;
    }
    pendingUpdatesRef.current = {};
    setState(prevState => ({ ...prevState, isUpdating: false }));
  }, []);

  // Get update statistics
  const getUpdateStats = useCallback(() => {
    const pendingUpdates = Object.keys(pendingUpdatesRef.current).length;
    const totalUpdates = updateCountRef.current;
    const averageDelay = totalUpdates > 0 ? totalDelayRef.current / totalUpdates : 0;

    return {
      pendingUpdates,
      totalUpdates,
      averageDelay,
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    updateHighlights,
    updateComments,
    updateCallToActions,
    updateAll,
    forceUpdate,
    clearUpdates,
    getUpdateStats,
  };
};

/**
 * Hook for debouncing a single annotation type
 */
export const useDebouncedAnnotationType = <T extends Highlight | Comment | CallToAction>(
  initialAnnotations: T[] = [],
  options: UseDebouncedAnnotationsOptions = {}
) => {
  const [annotations, setAnnotations] = useState<T[]>(initialAnnotations);
  const [isUpdating, setIsUpdating] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const updateAnnotations = useCallback((newAnnotations: T[]) => {
    setIsUpdating(true);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Schedule update
    debounceTimeoutRef.current = setTimeout(() => {
      setAnnotations(newAnnotations);
      setIsUpdating(false);
      options.onUpdate?.({
        highlights: [],
        comments: [],
        callToActions: [],
        isUpdating: false,
        lastUpdateTime: Date.now(),
      });
    }, options.debounceDelay || 300);
  }, [options]);

  const forceUpdate = useCallback((newAnnotations: T[]) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setAnnotations(newAnnotations);
    setIsUpdating(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    annotations,
    isUpdating,
    updateAnnotations,
    forceUpdate,
  };
};

/**
 * Hook for batching annotation operations
 */
export const useAnnotationBatch = () => {
  const [batchedOperations, setBatchedOperations] = useState<Array<() => void>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const batchTimeoutRef = useRef<NodeJS.Timeout>();

  const addToBatch = useCallback((operation: () => void) => {
    setBatchedOperations(prev => [...prev, operation]);

    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Schedule batch processing
    batchTimeoutRef.current = setTimeout(() => {
      setIsProcessing(true);
      
      // Execute all batched operations
      setBatchedOperations(operations => {
        operations.forEach(op => {
          try {
            op();
          } catch (error) {
            console.error('Error executing batched annotation operation:', error);
          }
        });
        return [];
      });

      setIsProcessing(false);
    }, 100); // Short delay for batching
  }, []);

  const processBatch = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    setIsProcessing(true);
    setBatchedOperations(operations => {
      operations.forEach(op => {
        try {
          op();
        } catch (error) {
          console.error('Error executing batched annotation operation:', error);
        }
      });
      return [];
    });
    setIsProcessing(false);
  }, []);

  const clearBatch = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    setBatchedOperations([]);
    setIsProcessing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    batchedOperations: batchedOperations.length,
    isProcessing,
    addToBatch,
    processBatch,
    clearBatch,
  };
};