import { useCallback, useEffect, useRef, useState } from 'react';
import { TextSelection } from '../types/annotation.types';
import { extractTextSelection, debounceTextSelection } from '../utils/pdfUtils';

interface UseTextSelectionOptions {
  pageNumber: number;
  scale?: number;
  onTextSelected?: (selection: TextSelection) => void;
  onSelectionCleared?: () => void;
  debounceDelay?: number;
}

interface UseTextSelectionReturn {
  currentSelection: TextSelection | null;
  clearSelection: () => void;
  isSelecting: boolean;
  setPageElement: (element: HTMLElement | null) => void;
}

/**
 * Custom hook for handling text selection within PDF pages
 */
export const useTextSelection = ({
  pageNumber,
  scale = 1.0,
  onTextSelected,
  onSelectionCleared,
  debounceDelay = 300
}: UseTextSelectionOptions): UseTextSelectionReturn => {
  const [currentSelection, setCurrentSelection] = useState<TextSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const pageElementRef = useRef<HTMLElement | null>(null);
  const debouncedCallbackRef = useRef<((selection: TextSelection) => void) | null>(null);

  // Create debounced callback
  useEffect(() => {
    if (onTextSelected) {
      debouncedCallbackRef.current = debounceTextSelection(onTextSelected, debounceDelay);
    }
  }, [onTextSelected, debounceDelay]);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();

    console.log('📝 Text selection change:', {
      hasSelection: !!selection,
      rangeCount: selection?.rangeCount || 0,
      isCollapsed: selection?.isCollapsed,
      selectedText: selection?.toString(),
      pageElement: !!pageElementRef.current,
      isSelecting
    });

    if (!selection || !pageElementRef.current) {
      if (currentSelection) {
        console.log('📝 Clearing selection - no selection or page element');
        setCurrentSelection(null);
        setIsSelecting(false);
        onSelectionCleared?.();
      }
      return;
    }

    // Mobile fix: Check if we have actual text selected, not just collapsed selection
    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length === 0) {
      // Don't clear immediately on mobile - user might still be selecting
      if (!isSelecting && currentSelection) {
        console.log('📝 Clearing selection - no text selected');
        setCurrentSelection(null);
        onSelectionCleared?.();
      }
      return;
    }

    // Check if selection is within our page element
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range) {
      console.log('📝 No range found');
      return;
    }

    // More robust containment check for mobile
    let isWithinPage = false;
    try {
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;

      // Check if both start and end are within our page element
      isWithinPage = pageElementRef.current.contains(startContainer) &&
        pageElementRef.current.contains(endContainer);

      // Alternative check using range intersection
      if (!isWithinPage) {
        const pageRect = pageElementRef.current.getBoundingClientRect();
        const rangeRect = range.getBoundingClientRect();
        isWithinPage = rangeRect.width > 0 && rangeRect.height > 0 &&
          rangeRect.left >= pageRect.left && rangeRect.right <= pageRect.right &&
          rangeRect.top >= pageRect.top && rangeRect.bottom <= pageRect.bottom;
      }
    } catch (error) {
      console.log('📝 Error checking selection containment:', error);
      return;
    }

    if (!isWithinPage) {
      if (currentSelection) {
        console.log('📝 Clearing selection - not within page element');
        setCurrentSelection(null);
        setIsSelecting(false);
        onSelectionCleared?.();
      }
      return;
    }

    const textSelection = extractTextSelection(
      selection,
      pageNumber,
      pageElementRef.current,
      scale
    );

    console.log('📝 Extracted text selection:', textSelection);

    if (textSelection && textSelection.text.trim().length > 0) {
      console.log('📝 Setting text selection:', textSelection.text);
      setCurrentSelection(textSelection);
      setIsSelecting(false);
      debouncedCallbackRef.current?.(textSelection);
    } else if (currentSelection) {
      console.log('📝 Clearing selection - extraction failed or empty text');
      setCurrentSelection(null);
      setIsSelecting(false);
      onSelectionCleared?.();
    }
  }, [pageNumber, scale, currentSelection, onSelectionCleared, isSelecting]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    // Only set selecting if the mousedown is within our page element
    if (pageElementRef.current && pageElementRef.current.contains(event.target as Node)) {
      setIsSelecting(true);
    }
  }, []);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    // Only handle if the mouseup is within our page element
    if (pageElementRef.current && pageElementRef.current.contains(event.target as Node)) {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        setIsSelecting(false);
        handleSelectionChange();
      }, 10);
    } else {
      setIsSelecting(false);
    }
  }, [handleSelectionChange]);

  // Enhanced touch event handlers for mobile text selection
  const handleTouchStart = useCallback((event: TouchEvent) => {
    // Only handle single touch within our page element
    if (!pageElementRef.current || !event.target || !pageElementRef.current.contains(event.target as Node)) {
      return;
    }

    // Don't interfere with multi-touch gestures (pinch zoom)
    if (event.touches.length > 1) {
      return;
    }

    console.log('📝 Touch start - preparing for text selection');
    setIsSelecting(true);

    // Clear any existing selection to start fresh
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    // Only handle if we're in selecting mode and within our page element
    if (!isSelecting || !pageElementRef.current || !event.target || !pageElementRef.current.contains(event.target as Node)) {
      return;
    }

    // Don't interfere with multi-touch gestures
    if (event.touches.length > 1) {
      setIsSelecting(false);
      return;
    }

    console.log('📝 Touch move - text selection in progress');

    // Let the browser handle the selection naturally
    // We'll check for the result in touchend
  }, [isSelecting]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    // Only handle if the touchend is within our page element
    if (!pageElementRef.current || !event.target || !pageElementRef.current.contains(event.target as Node)) {
      console.log('📝 Touch end - outside page element');
      setIsSelecting(false);
      return;
    }

    // Don't interfere with multi-touch gestures
    if (event.touches.length > 0) {
      return;
    }

    console.log('📝 Touch end - checking for text selection');

    // Multiple checks with increasing delays for mobile browsers
    const checkSelection = (delay: number, attempt: number, maxAttempts: number = 5) => {
      setTimeout(() => {
        const selection = window.getSelection();
        const hasText = selection && selection.toString().trim().length > 0;

        console.log(`📝 Selection check ${attempt}/${maxAttempts} (${delay}ms):`, {
          hasText,
          text: selection?.toString(),
          rangeCount: selection?.rangeCount,
          isCollapsed: selection?.isCollapsed
        });

        if (hasText && !selection.isCollapsed) {
          console.log('📝 ✅ Text selection detected on mobile!');
          setIsSelecting(false);
          handleSelectionChange();
        } else if (attempt < maxAttempts) {
          // Try again with longer delay
          checkSelection(delay + 150, attempt + 1, maxAttempts);
        } else {
          console.log('📝 ❌ No text selection detected after all attempts');
          setIsSelecting(false);
        }
      }, delay);
    };

    // Start checking for selection with multiple attempts
    checkSelection(100, 1);
  }, [handleSelectionChange, isSelecting]);

  // Handle long press for mobile text selection
  const handleTouchStartLongPress = useCallback((event: TouchEvent) => {
    if (!pageElementRef.current || !event.target || !pageElementRef.current.contains(event.target as Node)) {
      return;
    }

    if (event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    const startTime = Date.now();
    const startX = touch.clientX;
    const startY = touch.clientY;

    console.log('📝 Starting long press detection for text selection');

    // Set up long press timer
    const longPressTimer = setTimeout(() => {
      console.log('📝 Long press detected - attempting to start text selection');

      // Try to create a selection at the touch point
      const elementAtPoint = document.elementFromPoint(startX, startY);
      if (elementAtPoint && pageElementRef.current?.contains(elementAtPoint)) {
        // Try to start text selection at this point
        const range = document.caretRangeFromPoint?.(startX, startY);
        if (range) {
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
            console.log('📝 Started text selection at touch point');
          }
        }
      }
    }, 500); // 500ms long press

    // Clean up timer on touch move or end
    const cleanup = () => {
      clearTimeout(longPressTimer);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    const handleMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) {
        cleanup();
        return;
      }

      const moveTouch = moveEvent.touches[0];
      const deltaX = Math.abs(moveTouch.clientX - startX);
      const deltaY = Math.abs(moveTouch.clientY - startY);

      // If moved too much, cancel long press
      if (deltaX > 10 || deltaY > 10) {
        cleanup();
      }
    };

    const handleEnd = () => {
      cleanup();
    };

    document.addEventListener('touchmove', handleMove, { passive: true });
    document.addEventListener('touchend', handleEnd, { passive: true });
  }, []);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setCurrentSelection(null);
    setIsSelecting(false);
    onSelectionCleared?.();
  }, [onSelectionCleared]);

  // Set up event listeners
  useEffect(() => {
    const handleDocumentSelectionChange = () => {
      // Always handle selection changes, but with different logic based on selecting state
      handleSelectionChange();
    };

    // Use non-passive listeners for touch events to allow preventDefault when needed
    const nonPassiveOptions = { passive: false };
    const passiveOptions = { passive: true };

    document.addEventListener('selectionchange', handleDocumentSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    // Enhanced mobile touch event handling
    document.addEventListener('touchstart', handleTouchStart, nonPassiveOptions);
    document.addEventListener('touchmove', handleTouchMove, passiveOptions);
    document.addEventListener('touchend', handleTouchEnd, nonPassiveOptions);

    // Additional long press handling for mobile
    document.addEventListener('touchstart', handleTouchStartLongPress, passiveOptions);

    return () => {
      document.removeEventListener('selectionchange', handleDocumentSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchstart', handleTouchStartLongPress);
    };
  }, [handleSelectionChange, handleMouseDown, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchStartLongPress]);

  // Expose method to set page element reference
  const setPageElement = useCallback((element: HTMLElement | null) => {
    pageElementRef.current = element;
  }, []);

  return {
    currentSelection,
    clearSelection,
    isSelecting,
    setPageElement
  };
};