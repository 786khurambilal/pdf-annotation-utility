// Basic test to verify jsQR is working
console.log('🧪 Testing jsQR basic functionality...');

function testJsQRBasic() {
  if (typeof jsQR !== 'function') {
    console.log('❌ jsQR is not available');
    return;
  }
  
  console.log('✅ jsQR is available');
  
  // Create a simple test QR code pattern (minimal 21x21 QR code)
  const size = 21;
  const canvas = document.createElement('canvas');
  canvas.width = size * 10; // Scale up for better detection
  canvas.height = size * 10;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    console.log('❌ Cannot create canvas context');
    return;
  }
  
  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw a simple QR code pattern (finder patterns)
  ctx.fillStyle = 'black';
  const scale = 10;
  
  // Top-left finder pattern (7x7)
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      if ((x === 0 || x === 6 || y === 0 || y === 6) || 
          (x >= 2 && x <= 4 && y >= 2 && y <= 4)) {
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  
  // Top-right finder pattern
  for (let y = 0; y < 7; y++) {
    for (let x = 14; x < 21; x++) {
      if ((x === 14 || x === 20 || y === 0 || y === 6) || 
          (x >= 16 && x <= 18 && y >= 2 && y <= 4)) {
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  
  // Bottom-left finder pattern
  for (let y = 14; y < 21; y++) {
    for (let x = 0; x < 7; x++) {
      if ((x === 0 || x === 6 || y === 14 || y === 20) || 
          (x >= 2 && x <= 4 && y >= 16 && y <= 18)) {
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  
  // Add some data modules (simplified)
  ctx.fillRect(8 * scale, 8 * scale, scale, scale);
  ctx.fillRect(9 * scale, 8 * scale, scale, scale);
  ctx.fillRect(8 * scale, 9 * scale, scale, scale);
  
  console.log(`🎨 Created test QR pattern: ${canvas.width}x${canvas.height}`);
  
  // Try to scan the test pattern
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    console.log(`📊 Image data: ${imageData.width}x${imageData.height}, ${imageData.data.length} bytes`);
    
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (result) {
      console.log('✅ jsQR successfully detected test pattern!');
      console.log(`Content: ${result.data}`);
    } else {
      console.log('⚠️ jsQR could not detect test pattern (this is expected for a minimal pattern)');
    }
  } catch (error) {
    console.log(`❌ Error testing jsQR: ${error.message}`);
  }
  
  // Test with actual PDF canvases
  console.log('\n🔍 Testing with PDF canvases...');
  const pdfCanvases = document.querySelectorAll('canvas');
  
  pdfCanvases.forEach((canvas, index) => {
    console.log(`\nTesting canvas ${index + 1}: ${canvas.width}x${canvas.height}`);
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.log('❌ No context available');
      return;
    }
    
    try {
      // Sample different areas of the canvas
      const sampleAreas = [
        { x: 0, y: 0, w: Math.min(200, canvas.width), h: Math.min(200, canvas.height), name: 'top-left' },
        { x: Math.max(0, canvas.width - 200), y: 0, w: Math.min(200, canvas.width), h: Math.min(200, canvas.height), name: 'top-right' },
        { x: 0, y: Math.max(0, canvas.height - 200), w: Math.min(200, canvas.width), h: Math.min(200, canvas.height), name: 'bottom-left' },
        { x: Math.floor(canvas.width / 2) - 100, y: Math.floor(canvas.height / 2) - 100, w: 200, h: 200, name: 'center' }
      ];
      
      for (const area of sampleAreas) {
        if (area.x >= 0 && area.y >= 0 && area.x + area.w <= canvas.width && area.y + area.h <= canvas.height) {
          try {
            const imageData = ctx.getImageData(area.x, area.y, area.w, area.h);
            const result = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (result) {
              console.log(`✅ QR code found in ${area.name} area!`);
              console.log(`Content: ${result.data}`);
              console.log(`Location: (${result.location.topLeftCorner.x + area.x}, ${result.location.topLeftCorner.y + area.y})`);
            } else {
              console.log(`❌ No QR code in ${area.name} area`);
            }
          } catch (error) {
            console.log(`⚠️ Error scanning ${area.name}: ${error.message}`);
          }
        }
      }
      
      // Try full canvas scan
      console.log('Trying full canvas scan...');
      const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const fullResult = jsQR(fullImageData.data, fullImageData.width, fullImageData.height);
      
      if (fullResult) {
        console.log('✅ QR code found in full canvas!');
        console.log(`Content: ${fullResult.data}`);
      } else {
        console.log('❌ No QR code found in full canvas');
      }
      
    } catch (error) {
      console.log(`❌ Error scanning canvas: ${error.message}`);
    }
  });
}

// Run the test
testJsQRBasic();

// Make it available globally
window.testJsQRBasic = testJsQRBasic;
console.log('🔧 Test function available as window.testJsQRBasic()');