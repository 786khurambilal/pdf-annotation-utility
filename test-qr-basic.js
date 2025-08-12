// Basic QR test - run in browser console
// This tests the core QR scanning without all the complex retry logic

console.log('🔍 Basic QR Test Starting...');

async function testBasicQRScan() {
  try {
    // Find the PDF canvas
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.log('❌ No canvas found');
      return;
    }
    
    console.log('✅ Canvas found:', canvas.width, 'x', canvas.height);
    
    // Get context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ No canvas context');
      return;
    }
    
    console.log('✅ Canvas context available');
    
    // Get image data (small sample)
    const imageData = ctx.getImageData(0, 0, Math.min(200, canvas.width), Math.min(200, canvas.height));
    console.log('✅ Image data extracted:', imageData.width, 'x', imageData.height);
    
    // Test jsQR directly
    if (typeof jsQR === 'function') {
      console.log('🔍 Testing jsQR...');
      
      try {
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        console.log('✅ jsQR completed:', result ? `Found QR: ${result.data}` : 'No QR codes found');
      } catch (jsqrError) {
        console.log('❌ jsQR failed:', jsqrError.message);
      }
    } else {
      console.log('❌ jsQR not available');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testBasicQRScan();
console.log('🔍 Basic QR Test Completed');