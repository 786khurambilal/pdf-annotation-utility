// Simple QR test that mimics the new direct approach
// Run this in browser console to test the simplified scanning

console.log('🔍 Testing Simplified QR Scanning...');

async function testSimpleQRScan() {
  try {
    // Step 1: Find canvas
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.log('❌ No canvas found');
      return;
    }
    console.log(`✅ Canvas found: ${canvas.width}x${canvas.height}`);
    
    // Step 2: Get context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ No canvas context');
      return;
    }
    console.log('✅ Canvas context available');
    
    // Step 3: Extract image data (reasonable size)
    const maxSize = 400; // Limit size for performance
    const width = Math.min(canvas.width, maxSize);
    const height = Math.min(canvas.height, maxSize);
    
    console.log(`🔍 Extracting image data: ${width}x${height}`);
    const imageData = ctx.getImageData(0, 0, width, height);
    console.log(`✅ Image data extracted: ${imageData.data.length} bytes`);
    
    // Step 4: Test jsQR with timeout
    if (typeof jsQR !== 'function') {
      console.log('❌ jsQR not available');
      return;
    }
    
    console.log('🔍 Testing jsQR with 3-second timeout...');
    
    const scanPromise = new Promise((resolve, reject) => {
      try {
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout after 3 seconds')), 3000);
    });
    
    const result = await Promise.race([scanPromise, timeoutPromise]);
    
    if (result) {
      console.log('✅ QR Code found:', result.data);
      console.log('📍 Location:', result.location);
    } else {
      console.log('✅ No QR codes found (this is normal for most PDFs)');
    }
    
  } catch (error) {
    console.log('⚠️ Test completed with error:', error.message);
    console.log('This is normal if no QR codes are present or there are technical issues.');
  }
}

testSimpleQRScan();
console.log('🔍 Simple QR test initiated...');