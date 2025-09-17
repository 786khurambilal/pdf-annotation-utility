/**
 * Mobile Text Selection Test Script
 * Run this in the browser console to test mobile text selection functionality
 */

console.log('🧪 Starting Mobile Text Selection Test...');

// Test 1: Check if we're on mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

console.log('📱 Device Detection:', {
  isMobile,
  hasTouch,
  userAgent: navigator.userAgent,
  maxTouchPoints: navigator.maxTouchPoints
});

// Test 2: Check for PDF elements
const pdfPages = document.querySelectorAll('.react-pdf__Page');
const textLayers = document.querySelectorAll('.react-pdf__Page__textContent, .textLayer');
const canvases = document.querySelectorAll('.react-pdf__Page__canvas');

console.log('📄 PDF Elements Found:', {
  pages: pdfPages.length,
  textLayers: textLayers.length,
  canvases: canvases.length
});

// Test 3: Check text layer styles
if (textLayers.length > 0) {
  console.log('🎨 Text Layer Styles:');
  textLayers.forEach((layer, index) => {
    const styles = window.getComputedStyle(layer);
    console.log(`Layer ${index}:`, {
      userSelect: styles.userSelect,
      webkitUserSelect: styles.webkitUserSelect,
      pointerEvents: styles.pointerEvents,
      zIndex: styles.zIndex,
      position: styles.position,
      touchAction: styles.touchAction
    });
  });
}

// Test 4: Check canvas interference
if (canvases.length > 0) {
  console.log('🖼️ Canvas Styles:');
  canvases.forEach((canvas, index) => {
    const styles = window.getComputedStyle(canvas);
    console.log(`Canvas ${index}:`, {
      pointerEvents: styles.pointerEvents,
      zIndex: styles.zIndex,
      position: styles.position
    });
  });
}

// Test 5: Try programmatic text selection
function testProgrammaticSelection() {
  const textSpans = document.querySelectorAll('.react-pdf__Page__textContent span, .textLayer span');
  
  if (textSpans.length === 0) {
    console.log('❌ No text spans found for selection test');
    return false;
  }
  
  const firstSpan = textSpans[0];
  if (!firstSpan.textContent || firstSpan.textContent.trim().length === 0) {
    console.log('❌ First span has no text content');
    return false;
  }
  
  try {
    const range = document.createRange();
    const selection = window.getSelection();
    
    if (!selection) {
      console.log('❌ No selection object available');
      return false;
    }
    
    range.selectNodeContents(firstSpan);
    selection.removeAllRanges();
    selection.addRange(range);
    
    const success = !selection.isCollapsed && selection.toString().length > 0;
    console.log('✅ Programmatic Selection Test:', {
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
    console.log('❌ Programmatic selection failed:', error);
    return false;
  }
}

// Test 6: Check current selection
function checkCurrentSelection() {
  const selection = window.getSelection();
  console.log('📝 Current Selection:', {
    hasSelection: !!selection,
    isCollapsed: selection?.isCollapsed,
    rangeCount: selection?.rangeCount,
    selectedText: selection?.toString(),
    anchorNode: selection?.anchorNode?.nodeName,
    focusNode: selection?.focusNode?.nodeName
  });
}

// Run tests
setTimeout(() => {
  console.log('🧪 Running programmatic selection test...');
  testProgrammaticSelection();
}, 1000);

// Set up selection monitoring
document.addEventListener('selectionchange', () => {
  console.log('📝 Selection changed!');
  checkCurrentSelection();
});

console.log('🧪 Test setup complete. Try selecting text manually and watch the console.');
console.log('💡 On mobile: Press and hold on text, then drag to select.');

// Export test functions to global scope for manual testing
window.testMobileTextSelection = {
  testProgrammaticSelection,
  checkCurrentSelection,
  isMobile,
  hasTouch
};

console.log('🔧 Test functions available at: window.testMobileTextSelection');