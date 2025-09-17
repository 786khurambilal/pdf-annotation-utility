// Debug script to test QR scanning on the current PDF
console.log('🔍 Starting QR scanning debug...');

// Function to debug canvas and QR scanning
function debugQRScanning() {
  console.log('📊 Canvas Debug Information:');
  
  // Find all canvases
  const canvases = document.querySelectorAll('canvas');
  console.log(`Found ${canvases.length} canvas elements`);
  
  canvases.forEach((canvas, index) => {
    console.log(`\n📋 Canvas ${index + 1}:`);
    console.log(`  Size: ${canvas.width}x${canvas.height}`);
    console.log(`  Style: ${canvas.style.width}x${canvas.style.height}`);
    console.log(`  Parent: ${canvas.parentElement?.tagName}.${canvas.parentElement?.className}`);
    
    // Check if canvas has content
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      try {
        // Sample a small area to check for content
        const sampleSize = Math.min(50, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        
        // Check if canvas is blank (all white/transparent)
        let hasContent = false;
        let colorSample = [];
        
        for (let i = 0; i < Math.min(200, imageData.data.length); i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          
          if (colorSample.length < 5) {
            colorSample.push(`rgba(${r},${g},${b},${a})`);
          }
          
          // Check for non-white, non-transparent pixels
          if ((r < 250 || g < 250 || b < 250) && a > 0) {
            hasContent = true;
          }
        }
        
        console.log(`  Has content: ${hasContent}`);
        console.log(`  Sample colors: ${colorSample.join(', ')}`);
        
        // Try QR scanning if jsQR is available
        if (typeof jsQR === 'function' && hasContent) {
          console.log(`  🔍 Attempting QR scan...`);
          
          try {
            // Get full image data for QR scanning
            const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            console.log(`  Image data: ${fullImageData.width}x${fullImageData.height}, ${fullImageData.data.length} bytes`);
            
            // Try different scanning approaches
            const approaches = [
              { name: 'default', options: {} },
              { name: 'dontInvert', options: { inversionAttempts: 'dontInvert' } },
              { name: 'attemptBoth', options: { inversionAttempts: 'attemptBoth' } }
            ];
            
            for (const approach of approaches) {
              try {
                console.log(`    Trying ${approach.name}...`);
                const result = jsQR(fullImageData.data, fullImageData.width, fullImageData.height, approach.options);
                
                if (result) {
                  console.log(`    ✅ QR Code found with ${approach.name}!`);
                  console.log(`    Content: ${result.data}`);
                  console.log(`    Location: (${result.location.topLeftCorner.x}, ${result.location.topLeftCorner.y})`);
                  return; // Found QR code, stop trying other approaches
                } else {
                  console.log(`    ❌ No QR code found with ${approach.name}`);
                }
              } catch (error) {
                console.log(`    ⚠️ Error with ${approach.name}: ${error.message}`);
              }
            }
          } catch (error) {
            console.log(`  ❌ QR scanning error: ${error.message}`);
          }
        } else if (!hasContent) {
          console.log(`  ⚠️ Canvas appears blank, skipping QR scan`);
        } else {
          console.log(`  ⚠️ jsQR not available`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error reading canvas: ${error.message}`);
      }
    } else {
      console.log(`  ❌ No 2D context available`);
    }
  });
  
  // Check PDF viewer structure
  console.log('\n📄 PDF Viewer Structure:');
  const pdfPages = document.querySelectorAll('.react-pdf__Page, [data-page-number]');
  console.log(`Found ${pdfPages.length} PDF pages`);
  
  pdfPages.forEach((page, index) => {
    const pageNum = page.getAttribute('data-page-number') || (index + 1);
    console.log(`  Page ${pageNum}: ${page.tagName}.${page.className}`);
    
    const pageCanvas = page.querySelector('canvas');
    if (pageCanvas) {
      console.log(`    Canvas: ${pageCanvas.width}x${pageCanvas.height}`);
    } else {
      console.log(`    No canvas found`);
    }
  });
}

// Run the debug function
debugQRScanning();

// Also provide a manual trigger
window.debugQRScanning = debugQRScanning;
console.log('🔧 Debug function available as window.debugQRScanning()');