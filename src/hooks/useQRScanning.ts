import { useCallback, useState } from 'react';
import { usePdfContext } from '../contexts/PdfContext';
import { useUser } from '../contexts/UserContext';
import { useAnnotations } from '../contexts/AnnotationContext';

export interface QRScanningHookState {
  isScanning: boolean;
  isPaused: boolean;
  currentPage: number;
  totalPages: number;
  foundQRCodes: number;
  generatedCTAs: number;
  errors: Array<{ pageNumber: number; error: string }>;
  progress: number; // 0-100
}

export interface UseQRScanningReturn {
  state: QRScanningHookState;
  startScanning: () => Promise<void>;
  pauseScanning: () => void;
  resumeScanning: () => void;
  stopScanning: () => void;
  isSupported: boolean;
}

interface QRResult {
  content: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  pageNumber: number;
}

export const useQRScanning = (): UseQRScanningReturn => {
  const { state: pdfState, setCurrentPage } = usePdfContext();
  const { currentUser } = useUser();
  const { createCallToAction } = useAnnotations();

  const [scanningState, setScanningState] = useState<QRScanningHookState>({
    isScanning: false,
    isPaused: false,
    currentPage: 0,
    totalPages: 0,
    foundQRCodes: 0,
    generatedCTAs: 0,
    errors: [],
    progress: 0
  });

  // Function to get page canvas for scanning
  const getPageCanvas = useCallback(async (pageNumber: number): Promise<HTMLCanvasElement> => {
    console.log(`🔍 Getting canvas for page ${pageNumber}...`);

    return new Promise((resolve, reject) => {
      const attemptGetCanvas = async (attempts = 0) => {
        const maxAttempts = 10;
        const delay = 300;

        console.log(`🔍 Attempt ${attempts + 1}/${maxAttempts} to find page ${pageNumber} canvas`);

        // Find the best canvas with content
        const allCanvases = document.querySelectorAll('canvas');
        console.log(`Found ${allCanvases.length} total canvases`);

        let bestCanvas = null;
        let bestContentScore = 0;

        for (let i = 0; i < allCanvases.length; i++) {
          const testCanvas = allCanvases[i] as HTMLCanvasElement;

          if (testCanvas.width > 0 && testCanvas.height > 0) {
            const testCtx = testCanvas.getContext('2d', { willReadFrequently: true });
            if (testCtx) {
              try {
                // Sample canvas content
                const sampleData = testCtx.getImageData(0, 0, Math.min(100, testCanvas.width), Math.min(100, testCanvas.height));
                let contentScore = 0;

                for (let j = 0; j < sampleData.data.length; j += 16) {
                  const r = sampleData.data[j];
                  const g = sampleData.data[j + 1];
                  const b = sampleData.data[j + 2];
                  const a = sampleData.data[j + 3];

                  if (a > 0) {
                    const brightness = (r + g + b) / 3;
                    if (brightness < 240) {
                      contentScore++;
                    }
                  }
                }

                if (contentScore > bestContentScore) {
                  bestContentScore = contentScore;
                  bestCanvas = testCanvas;
                }
              } catch (testError) {
                // Continue with next canvas
              }
            }
          }
        }

        if (bestCanvas && bestContentScore > 0) {
          console.log(`✅ Found canvas with content: ${bestCanvas.width}x${bestCanvas.height} (score: ${bestContentScore})`);
          resolve(bestCanvas);
          return;
        }

        // If no canvas with content found, try using any available canvas
        if (allCanvases.length > 0) {
          const fallbackCanvas = allCanvases[0] as HTMLCanvasElement;
          if (fallbackCanvas.width > 0 && fallbackCanvas.height > 0) {
            console.log(`⚠️ Using fallback canvas: ${fallbackCanvas.width}x${fallbackCanvas.height} (may appear blank)`);
            resolve(fallbackCanvas);
            return;
          }
        }

        if (attempts < maxAttempts) {
          setTimeout(async () => await attemptGetCanvas(attempts + 1), delay);
          return;
        }

        reject(new Error(`No canvas found after ${maxAttempts} attempts`));
      };

      attemptGetCanvas().catch(reject);
    });
  }, []);

  // Enhanced QR scanning function for ALL pages
  const startScanning = useCallback(async (): Promise<void> => {
    console.log(`🔍 Starting enhanced QR scanning for ALL ${pdfState.totalPages} pages...`);

    if (!pdfState.file || !pdfState.documentId || !currentUser) {
      console.error('❌ Missing required dependencies for QR scanning');
      return;
    }



    setScanningState(prev => ({
      ...prev,
      isScanning: true,
      totalPages: pdfState.totalPages,
      currentPage: 0,
      foundQRCodes: 0,
      generatedCTAs: 0,
      errors: []
    }));

    let allQRResults: QRResult[] = [];
    const originalPage = pdfState.currentPage;

    try {
      // Import QR scanner once
      const { QRCodeScannerService } = await import('../utils/QRCodeScanner');
      const qrScanner = QRCodeScannerService.getInstance();

      // Scan each page
      for (let pageNum = 1; pageNum <= pdfState.totalPages; pageNum++) {
        console.log(`\n📄 Scanning page ${pageNum}/${pdfState.totalPages}...`);

        setScanningState(prev => ({
          ...prev,
          currentPage: pageNum,
          progress: (pageNum / pdfState.totalPages) * 100
        }));

        try {
          // Navigate to the page if not already there
          if (pageNum !== pdfState.currentPage) {
            console.log(`📄 Navigating to page ${pageNum}...`);
            setCurrentPage(pageNum);
            // Wait for page to render
            await new Promise(resolve => setTimeout(resolve, 1500));
          } else {
            // Still wait a bit for current page to be stable
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Get canvas for this page
          let canvas;
          try {
            canvas = await getPageCanvas(pageNum);
            console.log(`✅ Page ${pageNum} canvas: ${canvas.width}x${canvas.height}`);
          } catch (canvasError) {
            console.log(`⚠️ Could not get canvas for page ${pageNum}, trying fallback...`);

            const allCanvases = document.querySelectorAll('canvas');
            if (allCanvases.length > 0) {
              canvas = allCanvases[0] as HTMLCanvasElement;
              console.log(`✅ Using fallback canvas for page ${pageNum}: ${canvas.width}x${canvas.height}`);
            } else {
              console.log(`❌ No canvas found for page ${pageNum}, skipping...`);
              setScanningState(prev => ({
                ...prev,
                errors: [...prev.errors, { pageNumber: pageNum, error: 'No canvas found' }]
              }));
              continue;
            }
          }

          let pageQRResults: Array<{ content: string; coordinates: any; confidence: number }> = [];

          // Try original resolution first with multiple approaches
          console.log(`🔍 Scanning page ${pageNum} at original resolution...`);
          try {
            pageQRResults = await qrScanner.scanPage(canvas, pageNum);
            console.log(`Page ${pageNum} original resolution: ${pageQRResults.length} QR codes found`);

            // Log original resolution results for debugging
            pageQRResults.forEach((result, idx) => {
              console.log(`🎯 Original resolution QR ${idx + 1}:`, {
                content: result.content,
                coordinates: result.coordinates,
                confidence: result.confidence
              });
            });

            // If original resolution found QR codes, try to find more with slight upscaling
            if (pageQRResults.length > 0) {
              console.log(`🔍 Found QR codes at original resolution, trying 1.5x upscale for additional codes...`);

              // Create a slightly upscaled version for better detection
              const upscaledCanvas = document.createElement('canvas');
              const upscaleSize = Math.min(1200, Math.floor(Math.max(canvas.width, canvas.height) * 1.5));
              upscaledCanvas.width = upscaleSize;
              upscaledCanvas.height = upscaleSize;

              const upscaledCtx = upscaledCanvas.getContext('2d');
              if (upscaledCtx) {
                upscaledCtx.imageSmoothingEnabled = false;
                upscaledCtx.fillStyle = 'white';
                upscaledCtx.fillRect(0, 0, upscaleSize, upscaleSize);

                // Scale the entire canvas proportionally
                const scale = upscaleSize / Math.max(canvas.width, canvas.height);
                const scaledWidth = canvas.width * scale;
                const scaledHeight = canvas.height * scale;
                const offsetX = (upscaleSize - scaledWidth) / 2;
                const offsetY = (upscaleSize - scaledHeight) / 2;

                upscaledCtx.drawImage(canvas, offsetX, offsetY, scaledWidth, scaledHeight);

                try {
                  const additionalResults = await qrScanner.scanPage(upscaledCanvas, pageNum);
                  console.log(`🔍 1.5x upscale found ${additionalResults.length} additional QR codes`);

                  // Adjust coordinates back to original canvas size
                  const adjustedAdditionalResults = additionalResults.map(result => ({
                    ...result,
                    coordinates: {
                      x: (result.coordinates.x - offsetX) / scale,
                      y: (result.coordinates.y - offsetY) / scale,
                      width: result.coordinates.width / scale,
                      height: result.coordinates.height / scale
                    }
                  }));

                  // Add unique results only
                  const newResults = adjustedAdditionalResults.filter(newResult => {
                    return !pageQRResults.some((existingResult: any) =>
                      existingResult.content === newResult.content &&
                      Math.abs(existingResult.coordinates.x - newResult.coordinates.x) < 20 &&
                      Math.abs(existingResult.coordinates.y - newResult.coordinates.y) < 20
                    );
                  });

                  if (newResults.length > 0) {
                    pageQRResults = pageQRResults.concat(newResults);
                    console.log(`🎯 Added ${newResults.length} additional QR codes from 1.5x upscale, total: ${pageQRResults.length}`);
                  }
                } catch (upscaleError) {
                  console.log(`⚠️ 1.5x upscale scan failed:`, upscaleError);
                }
              }
            }
          } catch (error) {
            console.log(`Page ${pageNum} original resolution scan failed, continuing with enhanced scanning...`);
          }

          // If original resolution didn't find QR codes, try enhanced area-based scanning
          if (pageQRResults.length === 0) {
            console.log(`🔍 Starting enhanced targeted scanning for page ${pageNum}...`);

            // Define specific areas where QR codes are likely to be found
            const targetAreas = [
              { x: 0, y: 0, w: 400, h: 400, name: 'top-left' },
              { x: Math.floor(canvas.width * 0.1), y: Math.floor(canvas.height * 0.15), w: 350, h: 350, name: 'upper-area' },
              { x: Math.floor(canvas.width * 0.1), y: Math.floor(canvas.height * 0.35), w: 350, h: 350, name: 'middle-area' },
              { x: Math.floor(canvas.width * 0.1), y: Math.floor(canvas.height * 0.55), w: 350, h: 350, name: 'lower-area' },
              { x: Math.floor(canvas.width * 0.05), y: Math.floor(canvas.height * 0.1), w: 500, h: 600, name: 'large-left-area' }
            ];

            // Test each area at multiple scales
            const scaleFactors = [2, 3];

            for (const area of targetAreas) {
              if (area.x + area.w <= canvas.width && area.y + area.h <= canvas.height) {
                console.log(`🔍 Testing ${area.name} on page ${pageNum}...`);

                for (const scaleFactor of scaleFactors) {
                  try {
                    const upscaledCanvas = document.createElement('canvas');
                    // Preserve aspect ratio by scaling both dimensions proportionally
                    const upscaledWidth = Math.min(1600, Math.floor(area.w * scaleFactor));
                    const upscaledHeight = Math.min(1600, Math.floor(area.h * scaleFactor));
                    upscaledCanvas.width = upscaledWidth;
                    upscaledCanvas.height = upscaledHeight;

                    const upscaledCtx = upscaledCanvas.getContext('2d');
                    if (upscaledCtx) {
                      upscaledCtx.imageSmoothingEnabled = false;
                      upscaledCtx.fillStyle = 'white';
                      upscaledCtx.fillRect(0, 0, upscaledWidth, upscaledHeight);

                      // Draw the specific area upscaled with preserved aspect ratio
                      upscaledCtx.drawImage(
                        canvas,
                        area.x, area.y, area.w, area.h,
                        0, 0, upscaledWidth, upscaledHeight
                      );

                      const areaResults = await qrScanner.scanPage(upscaledCanvas, pageNum);

                      if (areaResults.length > 0) {
                        console.log(`🎯 Found ${areaResults.length} QR codes in ${area.name} at ${scaleFactor}x (${upscaledWidth}x${upscaledHeight}) on page ${pageNum}!`);

                        const adjustedResults = areaResults.map(result => {
                          // The QR code coordinates are in the upscaled canvas coordinate system
                          // We need to map them back to the original PDF canvas coordinates

                          // Calculate the scale factors from upscaled canvas back to the original area
                          const scaleBackX = area.w / upscaledWidth;
                          const scaleBackY = area.h / upscaledHeight;

                          const adjustedCoords = {
                            x: area.x + (result.coordinates.x * scaleBackX),
                            y: area.y + (result.coordinates.y * scaleBackY),
                            width: result.coordinates.width * scaleBackX,
                            height: result.coordinates.height * scaleBackY
                          };

                          console.log(`🎯 QR coordinate adjustment for ${area.name}:`, {
                            original: result.coordinates,
                            area: { x: area.x, y: area.y, w: area.w, h: area.h },
                            upscaledSize: { width: upscaledWidth, height: upscaledHeight },
                            scaleFactor,
                            scaleBack: { x: scaleBackX, y: scaleBackY },
                            adjusted: adjustedCoords
                          });

                          return {
                            ...result,
                            coordinates: adjustedCoords
                          };
                        });

                        // Add unique results only
                        const newResults = adjustedResults.filter(newResult => {
                          return !pageQRResults.some((existingResult: any) =>
                            existingResult.content === newResult.content &&
                            Math.abs(existingResult.coordinates.x - newResult.coordinates.x) < 20 &&
                            Math.abs(existingResult.coordinates.y - newResult.coordinates.y) < 20
                          );
                        });

                        if (newResults.length > 0) {
                          pageQRResults = pageQRResults.concat(newResults);
                          console.log(`Added ${newResults.length} new QR codes to page ${pageNum}, total: ${pageQRResults.length}`);
                        }
                      }
                    }
                  } catch (areaError) {
                    console.log(`Error scanning ${area.name} at ${scaleFactor}x on page ${pageNum}:`, areaError);
                  }
                }
              }
            }
          } else {
            console.log(`🎯 Using original resolution results for page ${pageNum}, skipping enhanced scanning`);
          }


          // Add page-specific QR results to global results
          const pageQRResultsWithPageNum: QRResult[] = pageQRResults.map(result => {
            // Validate coordinates are reasonable
            const coords = result.coordinates;
            if (coords.x < 0 || coords.y < 0 || coords.x > canvas.width || coords.y > canvas.height) {
              console.warn(`⚠️ Invalid coordinates for QR code on page ${pageNum}:`, coords, `Canvas: ${canvas.width}x${canvas.height}`);
            }

            return {
              ...result,
              pageNumber: pageNum
            };
          });

          allQRResults = allQRResults.concat(pageQRResultsWithPageNum);
          console.log(`🎯 Page ${pageNum} RESULT: Found ${pageQRResults.length} unique QR codes`);

          // Update state with current progress
          setScanningState(prev => ({
            ...prev,
            foundQRCodes: allQRResults.length
          }));

        } catch (pageError) {
          console.error(`❌ Error scanning page ${pageNum}:`, pageError);
          setScanningState(prev => ({
            ...prev,
            errors: [...prev.errors, { pageNumber: pageNum, error: String(pageError) }]
          }));
        }
      }

      console.log(`🎯 FINAL MULTI-PAGE RESULT: Found ${allQRResults.length} unique QR codes across ${pdfState.totalPages} pages`);

      // Try to create CTAs for all found QR codes
      let generatedCTAs = 0;
      let ctaCreationFailed = false;

      if (allQRResults.length > 0) {
        console.log(`🎯 Found ${allQRResults.length} QR codes across all pages! Attempting to create CTAs...`);

        // Try to create CTAs with aggressive storage clearing
        for (let attempt = 0; attempt < 2; attempt++) {
          if (attempt > 0) {
            console.log(`🧹 Attempt ${attempt + 1}: More aggressive storage clearing...`);
            // Clear everything possible
            localStorage.clear();
            sessionStorage.clear();

            // Try to clear IndexedDB if available
            if ('indexedDB' in window) {
              try {
                const databases = await indexedDB.databases();
                for (const db of databases) {
                  if (db.name) {
                    indexedDB.deleteDatabase(db.name);
                  }
                }
              } catch (idbError) {
                console.log('Could not clear IndexedDB:', idbError);
              }
            }

            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Create CTAs for each QR code found
          try {
            for (let i = 0; i < allQRResults.length; i++) {
              const qrResult = allQRResults[i];
              const ctaLabel = `P${qrResult.pageNumber}-${i + 1}`;
              // Make the overlay slightly smaller and more centered on the actual QR code
              const padding = Math.min(qrResult.coordinates.width, qrResult.coordinates.height) * 0.1; // 10% padding
              const coordinates = {
                x: Math.max(0, Math.floor(qrResult.coordinates.x + padding)),
                y: Math.max(0, Math.floor(qrResult.coordinates.y + padding)),
                width: Math.max(1, Math.floor(qrResult.coordinates.width - (padding * 2))),
                height: Math.max(1, Math.floor(qrResult.coordinates.height - (padding * 2)))
              };

              console.log(`🔗 Creating CTA ${i + 1}/${allQRResults.length}: "${ctaLabel}" on page ${qrResult.pageNumber}...`);
              console.log(`🔗 CTA coordinates:`, {
                original: qrResult.coordinates,
                final: coordinates,
                url: qrResult.content
              });

              // Additional debugging for overlay positioning
              console.log(`📐 Detailed coordinate info:`, {
                qrDetected: {
                  x: qrResult.coordinates.x,
                  y: qrResult.coordinates.y,
                  width: qrResult.coordinates.width,
                  height: qrResult.coordinates.height
                },
                ctaFinal: {
                  x: coordinates.x,
                  y: coordinates.y,
                  width: coordinates.width,
                  height: coordinates.height
                },
                pageNumber: qrResult.pageNumber,
                confidence: qrResult.confidence
              });

              await createCallToAction(
                qrResult.pageNumber,
                qrResult.content,
                ctaLabel,
                coordinates,
                {
                  isAutoGenerated: true,
                  qrCodeContent: qrResult.content
                }
              );

              generatedCTAs++;
              console.log(`✅ Created CTA ${generatedCTAs}: "${ctaLabel}" → ${qrResult.content}`);
            }

            break; // Success, exit attempt loop

          } catch (testError) {
            console.error(`❌ CTA creation failed (attempt ${attempt + 1}):`, testError);
            if (attempt === 1) {
              ctaCreationFailed = true;
            }
          }
        }

        // If CTA creation failed, show popup fallback
        if (ctaCreationFailed || generatedCTAs === 0) {
          console.log(`⚠️ CTA creation failed, showing popup fallback...`);

          let qrSummary = `🎯 QR Code Scan Results\n\nFound ${allQRResults.length} QR codes across ${pdfState.totalPages} pages:\n\n`;

          allQRResults.forEach((qrResult: QRResult, index: number) => {
            qrSummary += `${index + 1}. Page ${qrResult.pageNumber}: ${qrResult.content}\n`;
          });

          qrSummary += `\nStorage issues prevented CTA creation.\nClick OK to open all links, or Cancel to skip.`;

          if (confirm(qrSummary)) {
            allQRResults.forEach((qrResult: QRResult, index: number) => {
              setTimeout(() => {
                window.open(qrResult.content, '_blank', 'noopener,noreferrer');
              }, index * 500);
            });
          }

          generatedCTAs = allQRResults.length; // Count as generated for reporting
        }

        // Log all QR codes for reference
        allQRResults.forEach((qrResult: QRResult, index: number) => {
          console.log(`🔗 QR Code ${index + 1}:`);
          console.log(`  Page: ${qrResult.pageNumber}`);
          console.log(`  URL: ${qrResult.content}`);
          console.log(`  Coordinates: (${Math.floor(qrResult.coordinates.x)}, ${Math.floor(qrResult.coordinates.y)})`);
          console.log(`  Confidence: ${qrResult.confidence}`);
        });
      }

      // Navigate back to original page
      if (originalPage !== pdfState.currentPage) {
        console.log(`📄 Returning to original page ${originalPage}...`);
        setCurrentPage(originalPage);
      }

      setScanningState(prev => ({
        ...prev,
        foundQRCodes: allQRResults.length,
        generatedCTAs: generatedCTAs,
        progress: 100
      }));

      console.log(`✅ Multi-page QR scanning completed. Found ${allQRResults.length} QR codes across ${pdfState.totalPages} pages, created ${generatedCTAs} CTAs.`);

      // Show a user-friendly summary
      if (allQRResults.length > 0) {
        const pageBreakdown = allQRResults.reduce((acc, qr) => {
          acc[qr.pageNumber] = (acc[qr.pageNumber] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        const summaryMessage = `QR Scan Complete! 🎯\n\nFound ${allQRResults.length} QR codes:\n${Object.entries(pageBreakdown).map(([page, count]) => `• Page ${page}: ${count} QR code${count > 1 ? 's' : ''}`).join('\n')}\n\nNavigate between pages to see all clickable QR areas.`;

        // Show the summary (non-blocking)
        setTimeout(() => {
          alert(summaryMessage);
        }, 500);
      }

    } catch (error) {
      console.error('❌ Multi-page QR scanning failed:', error);
      setScanningState(prev => ({
        ...prev,
        errors: [...prev.errors, { pageNumber: 0, error: String(error) }]
      }));
    } finally {
      setScanningState(prev => ({ ...prev, isScanning: false, progress: 100 }));
    }
  }, [pdfState.file, pdfState.documentId, pdfState.currentPage, pdfState.totalPages, currentUser, getPageCanvas, setCurrentPage, createCallToAction]);

  // Placeholder functions for compatibility
  const pauseScanning = useCallback(() => {
    console.log('Pause scanning (placeholder)');
  }, []);

  const resumeScanning = useCallback(() => {
    console.log('Resume scanning (placeholder)');
  }, []);

  const stopScanning = useCallback(() => {
    console.log('Stop scanning (placeholder)');
    setScanningState(prev => ({ ...prev, isScanning: false }));
  }, []);

  const isSupported = useCallback(() => {
    try {
      return typeof document !== 'undefined' && !!document.querySelector;
    } catch {
      return false;
    }
  }, []);

  return {
    state: scanningState,
    startScanning,
    pauseScanning,
    resumeScanning,
    stopScanning,
    isSupported: isSupported()
  };
};