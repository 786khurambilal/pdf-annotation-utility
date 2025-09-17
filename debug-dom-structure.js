// Debug script to inspect DOM structure for QR scanning
// Run this in browser console to see current DOM state

console.log('=== PDF DOM Structure Debug ===');

// Check for page elements
const pageElements = document.querySelectorAll('[data-page-number]');
console.log('Elements with data-page-number:', pageElements.length);
pageElements.forEach((el, i) => {
  console.log(`  Page ${i + 1}:`, {
    tagName: el.tagName,
    className: el.className,
    pageNumber: el.getAttribute('data-page-number'),
    hasCanvas: !!el.querySelector('canvas'),
    canvasCount: el.querySelectorAll('canvas').length,
    children: Array.from(el.children).map(c => `${c.tagName}.${c.className}`).slice(0, 5)
  });
});

// Check for react-pdf pages
const reactPdfPages = document.querySelectorAll('.react-pdf__Page');
console.log('React-PDF pages:', reactPdfPages.length);
reactPdfPages.forEach((el, i) => {
  console.log(`  React-PDF Page ${i + 1}:`, {
    tagName: el.tagName,
    className: el.className,
    pageNumber: el.getAttribute('data-page-number'),
    hasCanvas: !!el.querySelector('canvas'),
    canvasCount: el.querySelectorAll('canvas').length,
    children: Array.from(el.children).map(c => `${c.tagName}.${c.className}`).slice(0, 5)
  });
});

// Check all canvases
const canvases = document.querySelectorAll('canvas');
console.log('All canvases:', canvases.length);
canvases.forEach((canvas, i) => {
  const rect = canvas.getBoundingClientRect();
  console.log(`  Canvas ${i + 1}:`, {
    width: canvas.width,
    height: canvas.height,
    className: canvas.className,
    visible: rect.width > 0 && rect.height > 0,
    position: `${rect.left},${rect.top}`,
    parent: canvas.parentElement?.tagName + '.' + canvas.parentElement?.className,
    hasContext: !!canvas.getContext('2d')
  });
});

// Check PDF container structure
const pdfContainer = document.querySelector('.react-pdf__Document');
if (pdfContainer) {
  console.log('PDF Document container found:', {
    children: Array.from(pdfContainer.children).map(c => `${c.tagName}.${c.className}`)
  });
}

console.log('=== End Debug ===');