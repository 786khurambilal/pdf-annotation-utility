/**
 * Mobile Text Selection Utilities
 * Helpers for debugging and improving text selection on mobile devices
 */

export interface MobileSelectionInfo {
  hasSelection: boolean;
  selectedText: string;
  rangeCount: number;
  isCollapsed: boolean;
  isMobile: boolean;
  userAgent: string;
  touchSupport: boolean;
}

/**
 * Get comprehensive information about current text selection and mobile environment
 */
export const getMobileSelectionInfo = (): MobileSelectionInfo => {
  const selection = window.getSelection();
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return {
    hasSelection: !!selection && !selection.isCollapsed,
    selectedText: selection?.toString() || '',
    rangeCount: selection?.rangeCount || 0,
    isCollapsed: selection?.isCollapsed ?? true,
    isMobile,
    userAgent: navigator.userAgent,
    touchSupport
  };
};

/**
 * Force enable text selection on an element (useful for PDF.js text layers)
 */
export const forceEnableTextSelection = (element: HTMLElement): void => {
  if (!element) return;
  
  // Apply all necessary CSS properties
  const styles = {
    'user-select': 'text',
    '-webkit-user-select': 'text',
    '-moz-user-select': 'text',
    '-ms-user-select': 'text',
    '-webkit-touch-callout': 'default',
    'pointer-events': 'auto',
    'touch-action': 'pan-x pan-y',
    'position': 'relative',
    'z-index': '10'
  };
  
  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(property, value, 'important');
  });
  
  // Also apply to child elements (important for PDF.js text spans)
  const textElements = element.querySelectorAll('span, div, p');
  textElements.forEach(child => {
    if (child instanceof HTMLElement) {
      Object.entries(styles).forEach(([property, value]) => {
        child.style.setProperty(property, value, 'important');
      });
      
      // Add a data attribute to track that we've processed this element
      child.setAttribute('data-mobile-text-enabled', 'true');
    }
  });
  
  // Add a data attribute to track that we've processed this element
  element.setAttribute('data-mobile-text-enabled', 'true');
};

/**
 * Debug text selection issues by logging comprehensive info
 */
export const debugTextSelection = (context: string = 'Unknown'): void => {
  const info = getMobileSelectionInfo();
  
  console.group(`📱 Mobile Text Selection Debug - ${context}`);
  console.log('Selection Info:', info);
  console.log('Current Selection:', window.getSelection());
  
  // Check for PDF.js text layers
  const textLayers = document.querySelectorAll('.react-pdf__Page__textContent, .textLayer');
  console.log('PDF Text Layers Found:', textLayers.length);
  
  textLayers.forEach((layer, index) => {
    const element = layer as HTMLElement;
    const computedStyle = window.getComputedStyle(element);
    console.log(`Text Layer ${index}:`, {
      userSelect: computedStyle.userSelect,
      webkitUserSelect: computedStyle.webkitUserSelect,
      pointerEvents: computedStyle.pointerEvents,
      touchAction: computedStyle.touchAction
    });
  });
  
  console.groupEnd();
};

/**
 * Test if text selection is working by programmatically selecting text
 */
export const testTextSelection = (element: HTMLElement): boolean => {
  if (!element) return false;
  
  try {
    const textNode = element.querySelector('span') || element;
    if (!textNode || !textNode.textContent) return false;
    
    const range = document.createRange();
    const selection = window.getSelection();
    
    if (!selection) return false;
    
    range.selectNodeContents(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    const success = !selection.isCollapsed && selection.toString().length > 0;
    
    // Clean up
    setTimeout(() => {
      selection.removeAllRanges();
    }, 1000);
    
    return success;
  } catch (error) {
    console.error('Text selection test failed:', error);
    return false;
  }
};

/**
 * Force PDF.js text layer to be selectable by rebuilding it if necessary
 */
export const forceRebuildTextLayer = (pageElement: HTMLElement): void => {
  const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
  if (!textLayer) return;
  
  // Get all text spans
  const spans = textLayer.querySelectorAll('span');
  if (spans.length === 0) return;
  
  console.log('📱 Rebuilding text layer for better mobile selection');
  
  // Create a new text layer with better mobile support
  const newTextLayer = document.createElement('div');
  newTextLayer.className = textLayer.className;
  newTextLayer.style.cssText = textLayer.getAttribute('style') || '';
  
  // Copy all spans with enhanced mobile properties
  spans.forEach(span => {
    const newSpan = document.createElement('span');
    newSpan.textContent = span.textContent;
    newSpan.style.cssText = span.getAttribute('style') || '';
    
    // Force mobile-friendly properties
    newSpan.style.setProperty('-webkit-user-select', 'text', 'important');
    newSpan.style.setProperty('user-select', 'text', 'important');
    newSpan.style.setProperty('-webkit-touch-callout', 'default', 'important');
    newSpan.style.setProperty('pointer-events', 'auto', 'important');
    newSpan.style.setProperty('display', 'inline', 'important');
    
    newTextLayer.appendChild(newSpan);
  });
  
  // Replace the old text layer
  textLayer.parentNode?.replaceChild(newTextLayer, textLayer);
};

/**
 * Apply mobile-specific fixes to PDF.js elements
 */
export const applyMobilePDFTextFixes = (): void => {
  // Multiple attempts with increasing delays to catch PDF.js rendering
  const attempts = [100, 300, 500, 1000, 2000];
  
  attempts.forEach(delay => {
    setTimeout(() => {
      const pages = document.querySelectorAll('.react-pdf__Page');
      
      if (pages.length === 0) {
        console.log(`📱 No PDF pages found at ${delay}ms, will retry...`);
        return;
      }
      
      pages.forEach(page => {
        if (!(page instanceof HTMLElement)) return;
        
        // First, try to rebuild the text layer for better mobile support
        forceRebuildTextLayer(page);
        
        // Then apply standard fixes
        const textLayers = page.querySelectorAll('.react-pdf__Page__textContent, .textLayer');
        
        textLayers.forEach(layer => {
          if (layer instanceof HTMLElement) {
            forceEnableTextSelection(layer);
            
            // Additional mobile-specific fixes
            layer.style.setProperty('-webkit-touch-callout', 'default', 'important');
            layer.style.setProperty('-webkit-user-select', 'text', 'important');
            layer.style.setProperty('user-select', 'text', 'important');
            layer.style.setProperty('touch-action', 'pan-x pan-y', 'important');
            layer.style.setProperty('position', 'absolute', 'important');
            layer.style.setProperty('z-index', '10', 'important');
            
            // Make sure all text spans are selectable
            const spans = layer.querySelectorAll('span');
            spans.forEach(span => {
              if (span instanceof HTMLElement) {
                span.style.setProperty('-webkit-user-select', 'text', 'important');
                span.style.setProperty('user-select', 'text', 'important');
                span.style.setProperty('pointer-events', 'auto', 'important');
                span.style.setProperty('-webkit-touch-callout', 'default', 'important');
                span.style.setProperty('display', 'inline', 'important');
              }
            });
          }
        });
        
        // Disable pointer events on canvas to allow text selection
        const canvases = page.querySelectorAll('.react-pdf__Page__canvas');
        canvases.forEach(canvas => {
          if (canvas instanceof HTMLElement) {
            canvas.style.setProperty('pointer-events', 'none', 'important');
            canvas.style.setProperty('z-index', '1', 'important');
          }
        });
        
        // Also fix any SVG elements that might interfere
        const svgs = page.querySelectorAll('.react-pdf__Page__svg');
        svgs.forEach(svg => {
          if (svg instanceof HTMLElement) {
            svg.style.setProperty('pointer-events', 'none', 'important');
            svg.style.setProperty('z-index', '1', 'important');
          }
        });
      });
      
      console.log(`📱 Applied mobile PDF text selection fixes to ${pages.length} pages at ${delay}ms`);
    }, delay);
  });
};

/**
 * Create a custom touch-based text selection system for mobile
 */
export const createMobileTouchSelection = (pageElement: HTMLElement, onTextSelected: (text: string, range: Range) => void): void => {
  let touchStartX = 0;
  let touchStartY = 0;
  let isLongPress = false;
  let longPressTimer: NodeJS.Timeout | null = null;
  
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isLongPress = false;
    
    // Start long press timer
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      console.log('📱 Long press detected, enabling text selection');
      
      // Try to start text selection at touch point
      const point = document.caretRangeFromPoint?.(touchStartX, touchStartY);
      if (point) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(point);
          console.log('📱 Started selection at touch point');
        }
      }
    }, 500); // 500ms long press
    
    console.log('📱 Touch selection start:', { x: touchStartX, y: touchStartY });
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    if (!isLongPress || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    
    // Only proceed if we've moved significantly
    const distance = Math.sqrt(
      Math.pow(touchEndX - touchStartX, 2) + Math.pow(touchEndY - touchStartY, 2)
    );
    
    if (distance < 10) return; // Minimum movement threshold
    
    // Create selection based on touch coordinates
    const startPoint = document.caretRangeFromPoint?.(touchStartX, touchStartY);
    const endPoint = document.caretRangeFromPoint?.(touchEndX, touchEndY);
    
    if (startPoint && endPoint) {
      try {
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (selection) {
          range.setStart(startPoint.startContainer, startPoint.startOffset);
          range.setEnd(endPoint.startContainer, endPoint.startOffset);
          
          selection.removeAllRanges();
          selection.addRange(range);
          
          console.log('📱 Touch selection updated:', selection.toString());
        }
      } catch (error) {
        console.log('📱 Touch selection error:', error);
      }
    }
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    
    if (!isLongPress) {
      console.log('📱 Touch ended without long press');
      return;
    }
    
    isLongPress = false;
    
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        onTextSelected(selection.toString(), range);
        console.log('📱 Touch selection completed:', selection.toString());
      } else {
        console.log('📱 Touch selection ended but no text selected');
      }
    }, 100);
  };
  
  // Add event listeners with non-passive to allow preventDefault
  pageElement.addEventListener('touchstart', handleTouchStart, { passive: false });
  pageElement.addEventListener('touchmove', handleTouchMove, { passive: false });
  pageElement.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  console.log('📱 Mobile touch selection system initialized');
};

/**
 * Manually trigger text selection for testing (useful for debugging)
 */
export const manuallySelectText = (element: HTMLElement, startOffset: number = 0, endOffset: number = 50): boolean => {
  try {
    // Find the first text node with content
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return node.textContent && node.textContent.trim().length > 0 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const textNode = walker.nextNode();
    if (!textNode || !textNode.textContent) {
      console.log('📱 No text node found for manual selection');
      return false;
    }
    
    const range = document.createRange();
    const selection = window.getSelection();
    
    if (!selection) {
      console.log('📱 No selection object available');
      return false;
    }
    
    const textLength = textNode.textContent.length;
    const safeEndOffset = Math.min(endOffset, textLength);
    const safeStartOffset = Math.min(startOffset, safeEndOffset - 1);
    
    range.setStart(textNode, safeStartOffset);
    range.setEnd(textNode, safeEndOffset);
    
    selection.removeAllRanges();
    selection.addRange(range);
    
    console.log('📱 Manually selected text:', selection.toString());
    
    // Trigger selection change event
    document.dispatchEvent(new Event('selectionchange'));
    
    return !selection.isCollapsed && selection.toString().length > 0;
  } catch (error) {
    console.error('📱 Manual text selection failed:', error);
    return false;
  }
};

/**
 * Check if current device/browser has known text selection issues
 */
export const hasKnownTextSelectionIssues = (): { hasIssues: boolean; issues: string[] } => {
  const userAgent = navigator.userAgent;
  const issues: string[] = [];
  
  // iOS Safari issues
  if (/iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent)) {
    issues.push('iOS Safari may require -webkit-touch-callout: default');
  }
  
  // Android Chrome issues
  if (/Android/.test(userAgent) && /Chrome/.test(userAgent)) {
    issues.push('Android Chrome may need longer touch delays');
  }
  
  // Mobile Firefox issues
  if (/Mobile/.test(userAgent) && /Firefox/.test(userAgent)) {
    issues.push('Mobile Firefox may need -moz-user-select prefixes');
  }
  
  return {
    hasIssues: issues.length > 0,
    issues
  };
};