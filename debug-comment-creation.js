// Debug script to test comment creation
// Run this in browser console to test the comment creation flow

console.log('🔍 Debugging comment creation...');

// Check if CommentCreator component is rendered
const commentCreator = document.querySelector('[data-testid="comment-creator"]') || 
                      document.querySelector('.comment-creator') ||
                      document.querySelector('div[role="dialog"]');

console.log('CommentCreator element found:', commentCreator);

// Check if PDF page container exists
const pageContainer = document.querySelector('[data-page-number]') || 
                     document.querySelector('.react-pdf__Page');

console.log('PDF page container found:', pageContainer);

// Check if click handlers are attached
if (pageContainer) {
  console.log('Page container click handlers:', {
    onclick: pageContainer.onclick,
    hasClickListener: pageContainer.addEventListener ? 'yes' : 'no'
  });
}

// Simulate a click on the PDF page
if (pageContainer) {
  console.log('🖱️ Simulating click on PDF page...');
  
  const rect = pageContainer.getBoundingClientRect();
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2
  });
  
  pageContainer.dispatchEvent(clickEvent);
  
  // Check if comment creator appeared after click
  setTimeout(() => {
    const commentCreatorAfterClick = document.querySelector('[data-testid="comment-creator"]') || 
                                   document.querySelector('.comment-creator') ||
                                   document.querySelector('div[role="dialog"]');
    console.log('CommentCreator after click:', commentCreatorAfterClick);
  }, 100);
}

// Check React DevTools for component state
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('React DevTools available - check component state');
} else {
  console.log('React DevTools not available');
}