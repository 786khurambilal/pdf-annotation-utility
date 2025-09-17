// Debug script to test QR scanning manually
console.log('🔍 QR Debug Script Started');

// Check if we have the required dependencies
console.log('Dependencies check:');
console.log('- jsQR available:', typeof jsQR !== 'undefined');
console.log('- Canvas support:', !!document.createElement('canvas').getContext);

// Find PDF canvas
const pdfCanvas = document.querySelector('canvas');
if (!pdfCanvas) {
  console.log('❌ No PDF canvas found');
} else {
  console.log('✅ PDF canvas found:', pdfCanvas.width, 'x', pdfCanvas.height);
  
  // Get context
  const ctx = pdfCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    console.log('❌ No canvas context');
  } else {
    console.log('✅ Canvas context available');
    
    // Get image data
    try {
      const imageData = ctx.getImageData(0, 0, pdfCanvas.width, pdfCanvas.height);
      console.log('✅ Image data extracted:', imageData.width, 'x', imageData.height);
      
      // Test jsQR
      if (typeof jsQR !== 'undefined') {
        console.log('🔍 Testing jsQR...');
        
        try {
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
          if (qrCode) {
            console.log('✅ QR Code found:', qrCode.data);
            console.log('📍 Location:', qrCode.location);
          } else {
            console.log('ℹ️ No QR code found in current view');
          }
        } catch (jsqrError) {
          console.log('❌ jsQR error:', jsqrError.message);
        }
      } else {
        console.log('❌ jsQR not available');
      }
      
    } catch (imageError) {
      console.log('❌ Image data error:', imageError.message);
    }
  }
}

// Check user and document state
console.log('App state check:');
console.log('- Current user:', window.currentUser ? 'logged in' : 'not logged in');
console.log('- Document loaded:', window.pdfState ? 'yes' : 'no');

// Test CTA creation manually
if (window.createCallToAction) {
  console.log('✅ createCallToAction function available');
} else {
  console.log('❌ createCallToAction function not available');
}