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
    
    if (!selection || !pageElementRef.current) {
      if (currentSelection) {
        setCurrentSelection(null);
        setIsSelecting(false);
        onSelectionCleared?.();
      }
      return;
    }

    // Check if selection is within our page element
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range || !pageElementRef.current.contains(range.commonAncestorContainer)) {
      if (currentSelection) {
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

    if (textSelection) {
      setCurrentSelection(textSelection);
      setIsSelecting(false);
      debouncedCallbackRef.current?.(textSelection);
    } else if (currentSelection) {
      setCurrentSelection(null);
      setIsSelecting(false);
      onSelectionCleared?.();
    }
  }, [pageNumber, scale, currentSelection, onSelectionCleared]);

  const handleMouseDown = useCallback(() => {
    setIsSelecting(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    // Small delay to ensure selection is complete
    setTimeout(handleSelectionChange, 10);
  }, [handleSelectionChange]);

  // Touch event handlers for better mobile support
  const handleTouchStart = useCallback(() => {
    setIsSelecting(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Longer delay for touch devices to ensure selection is complete
    setTimeout(handleSelectionChange, 100);
  }, [handleSelectionChange]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setCurrentSelection(null);
    setIsSelecting(false);
    onSelectionCleared?.();
  }, [onSelectionCleared]);

  // Set up event listeners
  useEffect(() => {
    const handleDocumentSelectionChange = () => {
      // Only handle if we're not actively selecting
      if (!isSelecting) {
        handleSelectionChange();
      }
    };

    document.addEventListener('selectionchange', handleDocumentSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('selectionchange', handleDocumentSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleSelectionChange, handleMouseDown, handleMouseUp, isSelecting]);

  // Expose method to set page element reference
  const setPageElement = useCallback((element: HTMLElement | null) => {
    pageElementRef.current = element;
  }, []);

  return {
    currentSelection,
    clearSelection,
    isSelecting,
    // Internal method for PdfDisplay to set page element reference
    setPageElement: setPageElement as any
  };
};