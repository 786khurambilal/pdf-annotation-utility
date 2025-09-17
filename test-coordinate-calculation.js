// Test coordinate calculation for QR code positioning
console.log('🧮 Testing QR code coordinate calculations...');

// Mock data similar to what we get from QR scanning
const mockArea = {
  x: 100,
  y: 150,
  w: 400,
  h: 400,
  name: 'test-area'
};

const upscaledSize = 800; // 2x scale
const scaleFactor = 2;

// Mock QR result from upscaled canvas
const mockQRResult = {
  content: 'https://example.com',
  coordinates: {
    x: 200,  // Position in upscaled canvas
    y: 250,  // Position in upscaled canvas
    width: 100,
    height: 100
  },
  confidence: 0.9
};

// Calculate adjusted coordinates (same logic as in useQRScanning)
const adjustedCoords = {
  x: mockArea.x + (mockQRResult.coordinates.x * mockArea.w / upscaledSize),
  y: mockArea.y + (mockQRResult.coordinates.y * mockArea.h / upscaledSize),
  width: mockQRResult.coordinates.width * mockArea.w / upscaledSize,
  height: mockQRResult.coordinates.height * mockArea.h / upscaledSize
};

console.log('📊 Coordinate Calculation Test:');
console.log('Area:', mockArea);
console.log('Upscaled size:', upscaledSize);
console.log('Scale factor:', scaleFactor);
console.log('QR result (upscaled canvas):', mockQRResult.coordinates);
console.log('Adjusted coordinates (original canvas):', adjustedCoords);

// Test with different scales
const testScales = [1.0, 1.5, 2.0];
console.log('\n🔍 Testing overlay positioning at different PDF scales:');

testScales.forEach(pdfScale => {
  const overlayCoords = {
    x: adjustedCoords.x * pdfScale,
    y: adjustedCoords.y * pdfScale,
    width: adjustedCoords.width * pdfScale,
    height: adjustedCoords.height * pdfScale
  };
  
  console.log(`Scale ${pdfScale}x:`, overlayCoords);
});

console.log('\n✅ Coordinate calculation test completed!');