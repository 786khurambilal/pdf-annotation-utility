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
  const attempts = [50, 150, 300, 600, 1000, 2000, 3000];
  
  attempts.forEach(delay => {
    setTimeout(() => {
      const pages = document.querySelectorAll('.react-pdf__Page');
      
      if (pages.length === 0) {
        console.log(`📱 No PDF pages found at ${delay}ms, will retry...`);
        return;
      }
      
      let fixesApplied = 0;
      
      pages.forEach(page => {
        if (!(page instanceof HTMLElement)) return;
        
        // CRITICAL: Ensure page is visible first
        page.style.setProperty('width', '100%', 'important');
        page.style.setProperty('max-width', '100%', 'important');
        page.style.setProperty('height', 'auto', 'important');
        page.style.setProperty('display', 'block', 'important');
        page.style.setProperty('visibility', 'visible', 'important');
        page.style.setProperty('opacity', '1', 'important');
        
        // Apply text selection fixes to the page container itself
        page.style.setProperty('-webkit-user-select', 'text', 'important');
        page.style.setProperty('user-select', 'text', 'important');
        page.style.setProperty('-webkit-touch-callout', 'default', 'important');
        page.style.setProperty('touch-action', 'pan-x pan-y', 'important');
        
        // Find and fix text layers
        const textLayers = page.querySelectorAll('.react-pdf__Page__textContent, .textLayer');
        
        textLayers.forEach(layer => {
          if (layer instanceof HTMLElement) {
            // Force enable text selection with maximum priority
            const criticalStyles = {
              '-webkit-user-select': 'text',
              '-moz-user-select': 'text', 
              '-ms-user-select': 'text',
              'user-select': 'text',
              '-webkit-touch-callout': 'default',
              'pointer-events': 'auto',
              'touch-action': 'pan-x pan-y',
              'position': 'absolute',
              'z-index': '20',
              'cursor': 'text'
            };
            
            Object.entries(criticalStyles).forEach(([prop, value]) => {
              layer.style.setProperty(prop, value, 'important');
            });
            
            // Fix all text spans within the layer
            const spans = layer.querySelectorAll('span');
            spans.forEach(span => {
              if (span instanceof HTMLElement) {
                Object.entries(criticalStyles).forEach(([prop, value]) => {
                  span.style.setProperty(prop, value, 'important');
                });
                span.style.setProperty('display', 'inline', 'important');
                span.style.setProperty('white-space', 'pre', 'important');
              }
            });
            
            fixesApplied++;
          }
        });
        
        // Fix canvas and SVG elements for visibility and interaction
        const renderLayers = page.querySelectorAll('.react-pdf__Page__canvas, .react-pdf__Page__svg');
        renderLayers.forEach(layer => {
          if (layer instanceof HTMLElement) {
            // Ensure visibility
            layer.style.setProperty('width', '100%', 'important');
            layer.style.setProperty('max-width', '100%', 'important');
            layer.style.setProperty('height', 'auto', 'important');
            layer.style.setProperty('display', 'block', 'important');
            layer.style.setProperty('visibility', 'visible', 'important');
            layer.style.setProperty('opacity', '1', 'important');
            
            // Disable pointer events to allow text selection
            layer.style.setProperty('pointer-events', 'none', 'important');
            layer.style.setProperty('z-index', '1', 'important');
            layer.style.setProperty('position', 'absolute', 'important');
          }
        });
        
        // Add a mutation observer to catch dynamically added text layers
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node instanceof HTMLElement) {
                const newTextLayers = node.querySelectorAll('.react-pdf__Page__textContent, .textLayer');
                if (newTextLayers.length > 0) {
                  console.log('📱 New text layers detected, applying fixes...');
                  setTimeout(() => {
                    forceMobilePDFVisibility();
                    applyMobilePDFTextFixes();
                  }, 100);
                }
              }
            });
          });
        });
        
        observer.observe(page, { childList: true, subtree: true });
        
        // Clean up observer after 10 seconds
        setTimeout(() => observer.disconnect(), 10000);
      });
      
      if (fixesApplied > 0) {
        console.log(`📱 Applied mobile PDF text selection fixes to ${fixesApplied} text layers at ${delay}ms`);
      }
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
  let isSelecting = false;
  
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isLongPress = false;
    isSelecting = false;
    
    console.log('📱 Touch selection start:', { x: touchStartX, y: touchStartY });
    
    // Start long press timer for text selection
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      isSelecting = true;
      console.log('📱 Long press detected, enabling text selection');
      
      // Try to start text selection at touch point
      const elementAtPoint = document.elementFromPoint(touchStartX, touchStartY);
      if (elementAtPoint && pageElement.contains(elementAtPoint)) {
        // Check if it's a text element
        const isTextElement = elementAtPoint.closest('.react-pdf__Page__textContent') ||
                             elementAtPoint.closest('.textLayer') ||
                             elementAtPoint.tagName === 'SPAN';
        
        if (isTextElement) {
          const point = document.caretRangeFromPoint?.(touchStartX, touchStartY);
          if (point) {
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(point);
              console.log('📱 Started selection at touch point on text element');
              
              // Add visual feedback
              elementAtPoint.style.backgroundColor = 'rgba(0, 123, 255, 0.2)';
              setTimeout(() => {
                elementAtPoint.style.backgroundColor = '';
              }, 200);
            }
          }
        }
      }
    }, 400); // Reduced to 400ms for better responsiveness
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    if (!isLongPress || e.touches.length !== 1) {
      // Cancel long press if user moves before it triggers
      if (longPressTimer && !isLongPress) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        
        if (deltaX > 15 || deltaY > 15) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
          console.log('📱 Long press cancelled due to movement');
        }
      }
      return;
    }
    
    const touch = e.touches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    
    console.log('📱 Touch move during selection:', { x: touchEndX, y: touchEndY });
    
    // Create selection based on touch coordinates
    const startPoint = document.caretRangeFromPoint?.(touchStartX, touchStartY);
    const endPoint = document.caretRangeFromPoint?.(touchEndX, touchEndY);
    
    if (startPoint && endPoint) {
      try {
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (selection) {
          // Determine selection direction
          const comparison = startPoint.compareBoundaryPoints(Range.START_TO_START, endPoint);
          
          if (comparison <= 0) {
            // Forward selection
            range.setStart(startPoint.startContainer, startPoint.startOffset);
            range.setEnd(endPoint.startContainer, endPoint.startOffset);
          } else {
            // Backward selection
            range.setStart(endPoint.startContainer, endPoint.startOffset);
            range.setEnd(startPoint.startContainer, startPoint.startOffset);
          }
          
          selection.removeAllRanges();
          selection.addRange(range);
          
          const selectedText = selection.toString().trim();
          if (selectedText.length > 0) {
            console.log('📱 Touch selection updated:', selectedText);
          }
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
      console.log('📱 Touch ended without long press - no selection');
      return;
    }
    
    console.log('📱 Touch end - checking for selection');
    
    // Multiple checks for selection with delays
    const checkForSelection = (attempt: number, maxAttempts: number = 3) => {
      setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        
        console.log(`📱 Selection check ${attempt}/${maxAttempts}:`, {
          hasSelection: !!selection,
          selectedText,
          isCollapsed: selection?.isCollapsed,
          rangeCount: selection?.rangeCount
        });
        
        if (selection && !selection.isCollapsed && selectedText && selectedText.length > 0) {
          const range = selection.getRangeAt(0);
          onTextSelected(selectedText, range);
          console.log('📱 ✅ Touch selection completed:', selectedText);
        } else if (attempt < maxAttempts) {
          checkForSelection(attempt + 1, maxAttempts);
        } else {
          console.log('📱 ❌ No text selection found after all attempts');
        }
        
        // Reset state
        if (attempt === maxAttempts) {
          isLongPress = false;
          isSelecting = false;
        }
      }, attempt * 100); // Increasing delays: 100ms, 200ms, 300ms
    };
    
    checkForSelection(1);
  };
  
  // Add event listeners with appropriate passive settings
  pageElement.addEventListener('touchstart', handleTouchStart, { passive: false });
  pageElement.addEventListener('touchmove', handleTouchMove, { passive: false });
  pageElement.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  console.log('📱 Enhanced mobile touch selection system initialized');
  
  // Return cleanup function
  return () => {
    pageElement.removeEventListener('touchstart', handleTouchStart);
    pageElement.removeEventListener('touchmove', handleTouchMove);
    pageElement.removeEventListener('touchend', handleTouchEnd);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
  };
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
 * Comprehensive mobile text selection diagnostic
 */
export const diagnoseMobileTextSelection = (): void => {
  console.group('📱 Mobile Text Selection Diagnostic');
  
  const info = getMobileSelectionInfo();
  console.log('Device Info:', info);
  
  // Check for PDF elements
  const pages = document.querySelectorAll('.react-pdf__Page');
  const textLayers = document.querySelectorAll('.react-pdf__Page__textContent, .textLayer');
  const textSpans = document.querySelectorAll('.react-pdf__Page__textContent span, .textLayer span');
  
  console.log('PDF Elements:', {
    pages: pages.length,
    textLayers: textLayers.length,
    textSpans: textSpans.length
  });
  
  // Check text layer styles
  if (textLayers.length > 0) {
    const firstLayer = textLayers[0] as HTMLElement;
    const styles = window.getComputedStyle(firstLayer);
    console.log('Text Layer Styles:', {
      userSelect: styles.userSelect,
      webkitUserSelect: styles.webkitUserSelect,
      pointerEvents: styles.pointerEvents,
      touchAction: styles.touchAction,
      zIndex: styles.zIndex,
      position: styles.position,
      cursor: styles.cursor
    });
  }
  
  // Check text span styles
  if (textSpans.length > 0) {
    const firstSpan = textSpans[0] as HTMLElement;
    const styles = window.getComputedStyle(firstSpan);
    console.log('Text Span Styles:', {
      userSelect: styles.userSelect,
      webkitUserSelect: styles.webkitUserSelect,
      pointerEvents: styles.pointerEvents,
      touchAction: styles.touchAction,
      cursor: styles.cursor,
      textContent: firstSpan.textContent?.substring(0, 50) + '...'
    });
  }
  
  // Test programmatic selection
  if (textSpans.length > 0) {
    console.log('Testing programmatic selection...');
    const testResult = testMobileTextSelection();
    console.log('Programmatic selection test:', testResult ? '✅ PASSED' : '❌ FAILED');
  }
  
  // Check for known issues
  const issues = hasKnownTextSelectionIssues();
  if (issues.hasIssues) {
    console.warn('Known Issues:', issues.issues);
  }
  
  console.groupEnd();
};

/**
 * Force immediate text selection capability on all PDF elements
 */
export const forceImmediateTextSelection = (): void => {
  console.log('📱 Forcing immediate text selection capability');
  
  // Target all possible PDF-related elements
  const selectors = [
    '.react-pdf__Page',
    '.react-pdf__Page__textContent',
    '.textLayer',
    '.react-pdf__Page__textContent span',
    '.textLayer span'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        // Apply the most aggressive text selection styles
        const criticalStyles = [
          ['user-select', 'text'],
          ['-webkit-user-select', 'text'],
          ['-moz-user-select', 'text'],
          ['-ms-user-select', 'text'],
          ['-webkit-touch-callout', 'default'],
          ['pointer-events', 'auto'],
          ['cursor', 'text']
        ];
        
        criticalStyles.forEach(([prop, value]) => {
          element.style.setProperty(prop, value, 'important');
        });
        
        // Special handling for text content layers
        if (element.classList.contains('react-pdf__Page__textContent') || 
            element.classList.contains('textLayer')) {
          element.style.setProperty('z-index', '20', 'important');
          element.style.setProperty('position', 'absolute', 'important');
          element.style.setProperty('top', '0', 'important');
          element.style.setProperty('left', '0', 'important');
          element.style.setProperty('width', '100%', 'important');
          element.style.setProperty('height', '100%', 'important');
        }
      }
    });
  });
  
  // Disable pointer events on interfering elements
  const interferingSelectors = [
    '.react-pdf__Page__canvas',
    '.react-pdf__Page__svg'
  ];
  
  interferingSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        element.style.setProperty('pointer-events', 'none', 'important');
        element.style.setProperty('z-index', '1', 'important');
        element.style.setProperty('user-select', 'none', 'important');
      }
    });
  });
};

/**
 * Force PDF visibility on mobile devices
 */
export const forceMobilePDFVisibility = (): void => {
  console.log('📱 Forcing mobile PDF visibility');
  
  // Target PDF document and page elements
  const documentElements = document.querySelectorAll('.react-pdf__Document');
  documentElements.forEach(element => {
    if (element instanceof HTMLElement) {
      element.style.setProperty('width', '100%', 'important');
      element.style.setProperty('max-width', '100%', 'important');
      element.style.setProperty('display', 'block', 'important');
    }
  });
  
  const pageElements = document.querySelectorAll('.react-pdf__Page');
  pageElements.forEach(element => {
    if (element instanceof HTMLElement) {
      element.style.setProperty('width', '100%', 'important');
      element.style.setProperty('max-width', '100%', 'important');
      element.style.setProperty('height', 'auto', 'important');
      element.style.setProperty('margin', '0 auto', 'important');
      element.style.setProperty('display', 'block', 'important');
      element.style.setProperty('visibility', 'visible', 'important');
      element.style.setProperty('opacity', '1', 'important');
    }
  });
  
  // Fix canvas and SVG elements
  const renderElements = document.querySelectorAll('.react-pdf__Page__canvas, .react-pdf__Page__svg');
  renderElements.forEach(element => {
    if (element instanceof HTMLElement) {
      element.style.setProperty('width', '100%', 'important');
      element.style.setProperty('max-width', '100%', 'important');
      element.style.setProperty('height', 'auto', 'important');
      element.style.setProperty('display', 'block', 'important');
      element.style.setProperty('visibility', 'visible', 'important');
      element.style.setProperty('opacity', '1', 'important');
    }
  });
  
  console.log('📱 Mobile PDF visibility fixes applied');
};

/**
 * Enable aggressive mobile text selection on PDF elements
 */
export const enableAggressiveMobileTextSelection = (): void => {
  console.log('📱 Enabling aggressive mobile text selection');
  
  // Target all text-related elements
  const textSelectors = [
    '.react-pdf__Page__textContent',
    '.react-pdf__Page__textContent span',
    '.textLayer',
    '.textLayer span'
  ];
  
  textSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        // Remove any conflicting styles
        element.style.removeProperty('-webkit-user-select');
        element.style.removeProperty('user-select');
        element.style.removeProperty('-webkit-touch-callout');
        element.style.removeProperty('pointer-events');
        
        // Apply aggressive text selection styles
        element.style.setProperty('-webkit-user-select', 'text', 'important');
        element.style.setProperty('-moz-user-select', 'text', 'important');
        element.style.setProperty('-ms-user-select', 'text', 'important');
        element.style.setProperty('user-select', 'text', 'important');
        element.style.setProperty('-webkit-touch-callout', 'default', 'important');
        element.style.setProperty('pointer-events', 'auto', 'important');
        element.style.setProperty('cursor', 'text', 'important');
        
        // Ensure visibility and interaction
        element.style.setProperty('position', 'relative', 'important');
        element.style.setProperty('z-index', '10', 'important');
        
        // Add touch-action for better mobile support
        element.style.setProperty('touch-action', 'manipulation', 'important');
        
        // Add data attribute to track processed elements
        element.setAttribute('data-mobile-text-enabled', 'true');
      }
    });
  });
  
  // Ensure canvas and SVG don't interfere
  const interferingSelectors = ['.react-pdf__Page__canvas', '.react-pdf__Page__svg'];
  interferingSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        element.style.setProperty('pointer-events', 'none', 'important');
        element.style.setProperty('z-index', '1', 'important');
        element.style.setProperty('-webkit-user-select', 'none', 'important');
        element.style.setProperty('user-select', 'none', 'important');
      }
    });
  });
  
  console.log('📱 Aggressive mobile text selection enabled');
};

/**
 * Test mobile text selection by programmatically selecting text
 */
export const testMobileTextSelection = (): boolean => {
  console.log('📱 Testing mobile text selection');
  
  const textSpans = document.querySelectorAll('.react-pdf__Page__textContent span, .textLayer span');
  if (textSpans.length === 0) {
    console.log('📱 No text spans found for testing');
    return false;
  }
  
  // Find a span with actual text content
  let targetSpan: HTMLElement | null = null;
  for (const span of textSpans) {
    if (span.textContent && span.textContent.trim().length > 3) {
      targetSpan = span as HTMLElement;
      break;
    }
  }
  
  if (!targetSpan) {
    console.log('📱 No suitable text span found for testing');
    return false;
  }
  
  try {
    const range = document.createRange();
    const selection = window.getSelection();
    
    if (!selection) {
      console.log('📱 No selection object available');
      return false;
    }
    
    // Select the entire span content
    range.selectNodeContents(targetSpan);
    selection.removeAllRanges();
    selection.addRange(range);
    
    const success = !selection.isCollapsed && selection.toString().length > 0;
    console.log('📱 Text selection test result:', {
      success,
      selectedText: selection.toString(),
      isCollapsed: selection.isCollapsed,
      rangeCount: selection.rangeCount
    });
    
    // Clean up after 2 seconds
    setTimeout(() => {
      selection.removeAllRanges();
    }, 2000);
    
    return success;
  } catch (error) {
    console.log('📱 Text selection test failed:', error);
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