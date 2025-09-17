// Simple QR scanning test - run in browser console
// This will test if the QR scanner can at least run without crashing

console.log('🔍 Testing QR Scanner...');

// Test 1: Check if jsQR is available
try {
  if (typeof jsQR === 'function') {
    console.log('✅ jsQR library is available');
  } else {
    console.log('❌ jsQR library not found');
  }
} catch (error) {
  console.log('❌ Error checking jsQR:', error.message);
}

// Test 2: Create a simple test canvas
try {
  const testCanvas = document.createElement('canvas');
  testCanvas.width = 100;
  testCanvas.height = 100;
  const ctx = testCanvas.getContext('2d');
  
  if (ctx) {
    // Fill with white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 100, 100);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, 100, 100);
    console.log('✅ Test canvas created:', imageData.width, 'x', imageData.height);
    
    // Test jsQR with simple data
    if (typeof jsQR === 'function') {
      try {
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        console.log('✅ jsQR test completed (no QR found, as expected):', result);
      } catch (jsqrError) {
        console.log('❌ jsQR test failed:', jsqrError.message);
      }
    }
  } else {
    console.log('❌ Could not create canvas context');
  }
} catch (error) {
  console.log('❌ Canvas test failed:', error.message);
}

// Test 3: Check current PDF canvas
try {
  const pdfCanvas = document.querySelector('canvas');
  if (pdfCanvas) {
    console.log('✅ PDF canvas found:', pdfCanvas.width, 'x', pdfCanvas.height);
    
    const ctx = pdfCanvas.getContext('2d');
    if (ctx) {
      console.log('✅ PDF canvas context available');
      
      // Try to get a small sample of image data
      try {
        const sampleData = ctx.getImageData(0, 0, Math.min(50, pdfCanvas.width), Math.min(50, pdfCanvas.height));
        console.log('✅ PDF canvas data accessible:', sampleData.width, 'x', sampleData.height);
      } catch (dataError) {
        console.log('❌ Cannot access PDF canvas data:', dataError.message);
      }
    } else {
      console.log('❌ PDF canvas context not available');
    }
  } else {
    console.log('❌ No PDF canvas found');
  }
} catch (error) {
  console.log('❌ PDF canvas test failed:', error.message);
}

console.log('🔍 QR Scanner test completed');