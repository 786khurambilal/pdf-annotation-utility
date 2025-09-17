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

  // Touch event handlers for better mobile support
  const handleTouchStart = useCallback((event: TouchEvent) => {
    // Only set selecting if the touchstart is within our page element
    if (pageElementRef.current && event.target && pageElementRef.current.contains(event.target as Node)) {
      console.log('📝 Touch start - setting selecting to true');
      setIsSelecting(true);
    }
  }, []);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    // Only handle if the touchend is within our page element
    if (pageElementRef.current && event.target && pageElementRef.current.contains(event.target as Node)) {
      console.log('📝 Touch end - checking selection after delay');
      
      // Multiple checks with increasing delays for mobile
      setTimeout(() => {
        const selection = window.getSelection();
        const hasText = selection && selection.toString().trim().length > 0;
        console.log('📝 First check (100ms):', { hasText, text: selection?.toString() });
        
        if (hasText) {
          setIsSelecting(false);
          handleSelectionChange();
        } else {
          // Second check with longer delay
          setTimeout(() => {
            const selection2 = window.getSelection();
            const hasText2 = selection2 && selection2.toString().trim().length > 0;
            console.log('📝 Second check (400ms):', { hasText: hasText2, text: selection2?.toString() });
            
            setIsSelecting(false);
            if (hasText2) {
              handleSelectionChange();
            }
          }, 300);
        }
      }, 100);
    } else {
      console.log('📝 Touch end - outside page element');
      setIsSelecting(false);
    }
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
      // Always handle selection changes, but with different logic based on selecting state
      handleSelectionChange();
    };

    // Add passive listeners for better mobile performance
    const options = { passive: true };
    
    document.addEventListener('selectionchange', handleDocumentSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      document.removeEventListener('selectionchange', handleDocumentSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleSelectionChange, handleMouseDown, handleMouseUp, handleTouchStart, handleTouchEnd]);

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