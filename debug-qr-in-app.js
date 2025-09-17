// Debug script that works within the React app context
console.log('🔍 Starting in-app QR debugging...');

// This function should be called from within the React app where jsQR is available
window.debugQRInApp = async function() {
  console.log('🔍 Debugging QR scanning within app context...');
  
  // Try to get the QR scanner service
  try {
    // Import the QR scanner dynamically
    const { QRCodeScannerService } = await import('./src/utils/QRCodeScanner.js');
    const qrScanner = QRCodeScannerService.getInstance();
    
    console.log('✅ QR Scanner service loaded');
    console.log('✅ QR detection supported:', qrScanner.isQRCodeDetectionSupported());
    
    // Find the PDF canvas
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.log('❌ No canvas found');
      return;
    }
    
    console.log(`📋 Canvas found: ${canvas.width}x${canvas.height}`);
    
    // Check canvas content
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.log('❌ No canvas context');
      return;
    }
    
    // Sample canvas content
    const sampleData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
    let hasContent = false;
    
    for (let i = 0; i < sampleData.data.length; i += 4) {
      const r = sampleData.data[i];
      const g = sampleData.data[i + 1];
      const b = sampleData.data[i + 2];
      
      if (r < 250 || g < 250 || b < 250) {
        hasContent = true;
        break;
      }
    }
    
    console.log(`📊 Canvas has content: ${hasContent}`);
    
    if (!hasContent) {
      console.log('⚠️ Canvas appears blank - PDF might not be fully rendered');
      console.log('💡 Try waiting a few seconds and running this again');
      return;
    }
    
    // Try QR scanning
    console.log('🔍 Attempting QR scan...');
    try {
      const results = await qrScanner.scanPage(canvas, 1);
      console.log(`✅ QR scan completed: ${results.length} QR codes found`);
      
      results.forEach((result, index) => {
        console.log(`🎯 QR Code ${index + 1}:`);
        console.log(`  Content: ${result.content}`);
        console.log(`  Coordinates: (${result.coordinates.x}, ${result.coordinates.y}) ${result.coordinates.width}x${result.coordinates.height}`);
        console.log(`  Confidence: ${result.confidence}`);
      });
      
      if (results.length === 0) {
        console.log('❌ No QR codes detected');
        console.log('💡 This could be due to:');
        console.log('  - QR codes are too small or low resolution');
        console.log('  - Poor contrast in the rendered PDF');
        console.log('  - QR codes are not in the current page view');
        console.log('  - PDF rendering quality issues');
      }
      
    } catch (error) {
      console.log('❌ QR scanning error:', error.message);
    }
    
  } catch (importError) {
    console.log('❌ Failed to import QR scanner:', importError.message);
    console.log('💡 This function should be called from within the React app');
  }
};

console.log('🔧 Function available as window.debugQRInApp()');
console.log('💡 Call this from within the React app where modules are available');