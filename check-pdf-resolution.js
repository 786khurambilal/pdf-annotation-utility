// Check PDF rendering resolution and QR code visibility
console.log('🔍 Checking PDF resolution and QR code visibility...');

function checkPDFResolution() {
  const canvases = document.querySelectorAll('canvas');
  
  console.log(`Found ${canvases.length} canvas elements`);
  
  canvases.forEach((canvas, index) => {
    console.log(`\n📋 Canvas ${index + 1} Analysis:`);
    console.log(`  Canvas size: ${canvas.width}x${canvas.height}`);
    console.log(`  Display size: ${canvas.offsetWidth}x${canvas.offsetHeight}`);
    console.log(`  Device pixel ratio: ${window.devicePixelRatio || 1}`);
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.log('  ❌ No context available');
      return;
    }
    
    // Calculate effective resolution
    const effectiveWidth = canvas.width / (canvas.offsetWidth || canvas.width);
    const effectiveHeight = canvas.height / (canvas.offsetHeight || canvas.height);
    console.log(`  Effective resolution: ${effectiveWidth.toFixed(2)}x${effectiveHeight.toFixed(2)}`);
    
    // Sample the canvas to look for QR-code-like patterns
    try {
      const sampleSize = Math.min(canvas.width, canvas.height, 400);
      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      
      // Analyze pixel patterns to detect potential QR codes
      let blackPixels = 0;
      let whitePixels = 0;
      let patterns = [];
      
      // Sample every 4th pixel for performance
      for (let i = 0; i < imageData.data.length; i += 16) { // 4 pixels * 4 channels
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        
        const brightness = (r + g + b) / 3;
        
        if (a > 128) { // Not transparent
          if (brightness < 128) {
            blackPixels++;
          } else {
            whitePixels++;
          }
        }
      }
      
      const totalSampled = blackPixels + whitePixels;
      const blackRatio = blackPixels / totalSampled;
      
      console.log(`  Pixel analysis (${totalSampled} samples):`);
      console.log(`    Black pixels: ${blackPixels} (${(blackRatio * 100).toFixed(1)}%)`);
      console.log(`    White pixels: ${whitePixels} (${((1 - blackRatio) * 100).toFixed(1)}%)`);
      
      // Look for high contrast areas that might contain QR codes
      if (blackRatio > 0.1 && blackRatio < 0.9) {
        console.log(`  ✅ Good contrast detected - likely contains content`);
        
        // Try to find square patterns (QR code finder patterns)
        console.log(`  🔍 Looking for QR code patterns...`);
        
        // Scan for potential QR codes in different regions
        const regions = [
          { x: 0, y: 0, w: Math.min(200, canvas.width), h: Math.min(200, canvas.height), name: 'top-left' },
          { x: Math.floor(canvas.width * 0.2), y: Math.floor(canvas.height * 0.2), w: Math.min(200, canvas.width * 0.6), h: Math.min(200, canvas.height * 0.6), name: 'center-left' },
          { x: Math.floor(canvas.width * 0.1), y: Math.floor(canvas.height * 0.4), w: Math.min(300, canvas.width * 0.8), h: Math.min(300, canvas.height * 0.4), name: 'middle-section' }
        ];
        
        for (const region of regions) {
          if (region.x + region.w <= canvas.width && region.y + region.h <= canvas.height) {
            try {
              const regionData = ctx.getImageData(region.x, region.y, region.w, region.h);
              
              // Quick pattern analysis
              let edgeCount = 0;
              const stride = region.w * 4;
              
              // Look for vertical edges (black-white transitions)
              for (let y = 1; y < region.h - 1; y++) {
                for (let x = 1; x < region.w - 1; x++) {
                  const idx = y * stride + x * 4;
                  const current = (regionData.data[idx] + regionData.data[idx + 1] + regionData.data[idx + 2]) / 3;
                  const right = (regionData.data[idx + 4] + regionData.data[idx + 5] + regionData.data[idx + 6]) / 3;
                  
                  if (Math.abs(current - right) > 100) { // Strong edge
                    edgeCount++;
                  }
                }
              }
              
              const edgeDensity = edgeCount / (region.w * region.h);
              console.log(`    ${region.name}: ${edgeCount} edges, density: ${edgeDensity.toFixed(4)}`);
              
              if (edgeDensity > 0.01) { // High edge density suggests QR code
                console.log(`    ✅ High edge density in ${region.name} - potential QR code area`);
                
                // Try jsQR on this region if available
                if (typeof jsQR === 'function') {
                  try {
                    const qrResult = jsQR(regionData.data, regionData.width, regionData.height);
                    if (qrResult) {
                      console.log(`    🎯 QR CODE FOUND in ${region.name}!`);
                      console.log(`    Content: ${qrResult.data}`);
                      console.log(`    Global position: (${region.x + qrResult.location.topLeftCorner.x}, ${region.y + qrResult.location.topLeftCorner.y})`);
                    } else {
                      console.log(`    ❌ jsQR found no QR code in ${region.name} despite high edge density`);
                    }
                  } catch (error) {
                    console.log(`    ⚠️ jsQR error in ${region.name}: ${error.message}`);
                  }
                }
              }
            } catch (error) {
              console.log(`    ❌ Error analyzing ${region.name}: ${error.message}`);
            }
          }
        }
      } else {
        console.log(`  ⚠️ Poor contrast (${(blackRatio * 100).toFixed(1)}% black) - might be blank or low quality`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error analyzing canvas: ${error.message}`);
    }
  });
  
  // Check if we can improve resolution
  console.log('\n🔧 Resolution improvement suggestions:');
  console.log('1. Ensure PDF is rendered at high DPI');
  console.log('2. Check if canvas scaling is reducing QR code clarity');
  console.log('3. Try scanning at different zoom levels');
  
  // Provide manual zoom test
  window.testAtZoom = function(zoomLevel = 2) {
    console.log(`\n🔍 Testing QR detection at ${zoomLevel}x zoom...`);
    
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.log('❌ No canvas found');
      return;
    }
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.log('❌ No context available');
      return;
    }
    
    // Create a zoomed version
    const zoomedCanvas = document.createElement('canvas');
    const zoomedSize = Math.min(400, Math.floor(Math.min(canvas.width, canvas.height) * zoomLevel));
    zoomedCanvas.width = zoomedSize;
    zoomedCanvas.height = zoomedSize;
    
    const zoomedCtx = zoomedCanvas.getContext('2d');
    if (!zoomedCtx) {
      console.log('❌ Cannot create zoomed context');
      return;
    }
    
    // Draw scaled version
    zoomedCtx.imageSmoothingEnabled = false; // Preserve sharp edges
    zoomedCtx.drawImage(canvas, 0, 0, zoomedSize / zoomLevel, zoomedSize / zoomLevel, 0, 0, zoomedSize, zoomedSize);
    
    console.log(`Created zoomed canvas: ${zoomedSize}x${zoomedSize}`);
    
    // Try QR detection on zoomed version
    if (typeof jsQR === 'function') {
      try {
        const imageData = zoomedCtx.getImageData(0, 0, zoomedSize, zoomedSize);
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (result) {
          console.log(`✅ QR code found at ${zoomLevel}x zoom!`);
          console.log(`Content: ${result.data}`);
        } else {
          console.log(`❌ No QR code found at ${zoomLevel}x zoom`);
        }
      } catch (error) {
        console.log(`❌ Error at ${zoomLevel}x zoom: ${error.message}`);
      }
    }
  };
  
  console.log('🔧 Try different zoom levels with: window.testAtZoom(1.5), window.testAtZoom(2), etc.');
}

// Run the check
checkPDFResolution();

// Make it available globally
window.checkPDFResolution = checkPDFResolution;
console.log('🔧 Function available as window.checkPDFResolution()');