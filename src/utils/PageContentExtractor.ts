import { PDFDocument, PDFPage } from 'pdf-lib';
import { RectangleCoordinates } from '../types/annotation.types';

// Interface for extracted page headings
export interface PageHeading {
  text: string;
  level: number; // 1-6 for heading hierarchy
  coordinates: RectangleCoordinates;
  fontSize: number;
  fontWeight: string;
}

// Configuration for heading detection
export interface HeadingDetectionConfig {
  minFontSize: number; // Minimum font size to consider as heading
  maxTitleLength: number; // Maximum characters for title
  proximityThreshold: number; // Distance threshold for finding nearby headings
}

// Default configuration
const DEFAULT_CONFIG: HeadingDetectionConfig = {
  minFontSize: 12,
  maxTitleLength: 50,
  proximityThreshold: 100 // pixels
};

/**
 * Utility class for extracting page content and detecting headings from PDF pages
 */
export class PageContentExtractor {
  private config: HeadingDetectionConfig;

  constructor(config: Partial<HeadingDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Extract headings from a specific page of a PDF document
   * @param pageNumber - Page number (1-based)
   * @param pdfDocument - PDF document instance
   * @returns Promise resolving to array of detected headings
   */
  async extractHeadings(pageNumber: number, pdfDocument: PDFDocument): Promise<PageHeading[]> {
    try {
      if (pageNumber < 1 || pageNumber > pdfDocument.getPageCount()) {
        throw new Error(`Invalid page number: ${pageNumber}. Document has ${pdfDocument.getPageCount()} pages.`);
      }

      const page = pdfDocument.getPage(pageNumber - 1); // Convert to 0-based index
      const headings: PageHeading[] = [];

      // Extract text content with positioning information
      const textContent = await this.extractTextWithPositions(page);
      
      // Analyze text elements to identify headings
      for (const textElement of textContent) {
        if (this.isHeading(textElement)) {
          const heading: PageHeading = {
            text: textElement.text.trim(),
            level: this.determineHeadingLevel(textElement),
            coordinates: textElement.coordinates,
            fontSize: textElement.fontSize,
            fontWeight: textElement.fontWeight
          };
          headings.push(heading);
        }
      }

      // Sort headings by position (top to bottom, left to right)
      return headings.sort((a, b) => {
        if (Math.abs(a.coordinates.y - b.coordinates.y) < 5) {
          return a.coordinates.x - b.coordinates.x;
        }
        return b.coordinates.y - a.coordinates.y; // Higher Y values first (PDF coordinates)
      });

    } catch (error) {
      console.error(`Error extracting headings from page ${pageNumber}:`, error);
      return [];
    }
  }

  /**
   * Find the best heading near QR code coordinates
   * @param headings - Array of detected headings
   * @param qrCoordinates - QR code position
   * @returns Best matching heading text or null if none found
   */
  findBestHeadingForArea(headings: PageHeading[], qrCoordinates: RectangleCoordinates): string | null {
    if (headings.length === 0) {
      return null;
    }

    // Calculate distances from QR code center to each heading
    const qrCenterX = qrCoordinates.x + qrCoordinates.width / 2;
    const qrCenterY = qrCoordinates.y + qrCoordinates.height / 2;

    const headingsWithDistance = headings.map(heading => {
      const headingCenterX = heading.coordinates.x + heading.coordinates.width / 2;
      const headingCenterY = heading.coordinates.y + heading.coordinates.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(qrCenterX - headingCenterX, 2) + 
        Math.pow(qrCenterY - headingCenterY, 2)
      );

      return { heading, distance };
    });

    // Filter headings within proximity threshold
    const nearbyHeadings = headingsWithDistance.filter(
      item => item.distance <= this.config.proximityThreshold
    );

    if (nearbyHeadings.length === 0) {
      // If no headings are nearby, return the first/most prominent heading
      const sortedByLevel = [...headings].sort((a, b) => a.level - b.level);
      return this.truncateTitle(sortedByLevel[0].text);
    }

    // Sort by distance first, then by heading level (closer headings preferred, then higher level)
    nearbyHeadings.sort((a, b) => {
      const distanceDiff = a.distance - b.distance;
      if (Math.abs(distanceDiff) > 10) return distanceDiff; // Significant distance difference
      return a.heading.level - b.heading.level; // Lower level number = higher priority
    });

    return this.truncateTitle(nearbyHeadings[0].heading.text);
  }

  /**
   * Generate fallback title for pages without clear headings
   * @param pageNumber - Page number for fallback title
   * @returns Generated fallback title
   */
  generateFallbackTitle(pageNumber: number): string {
    return `QR Code Link - Page ${pageNumber}`;
  }

  /**
   * Extract text content with positioning information from a PDF page
   * @param page - PDF page instance
   * @returns Array of text elements with position data
   */
  private async extractTextWithPositions(page: PDFPage): Promise<TextElement[]> {
    // Note: This is a simplified implementation
    // In a real implementation, you would need to use pdf-lib's text extraction
    // capabilities or integrate with a more sophisticated PDF parsing library
    
    const textElements: TextElement[] = [];
    
    try {
      // Get page dimensions
      const { width, height } = page.getSize();
      
      // This is a mock implementation - in reality, you'd need to:
      // 1. Extract text operators from the page content stream
      // 2. Parse font information and positioning
      // 3. Reconstruct text with coordinates
      
      // For now, we'll create a basic implementation that simulates text extraction
      // In a production environment, you might want to use pdf2json or similar
      
      // Mock text elements for demonstration
      // This would be replaced with actual PDF text extraction logic
      const mockTextElements = this.createMockTextElements(width, height);
      textElements.push(...mockTextElements);
      
    } catch (error) {
      console.error('Error extracting text with positions:', error);
    }

    return textElements;
  }

  /**
   * Determine if a text element is likely a heading
   * @param textElement - Text element to analyze
   * @returns True if element appears to be a heading
   */
  private isHeading(textElement: TextElement): boolean {
    // Check font size threshold
    if (textElement.fontSize < this.config.minFontSize) {
      return false;
    }

    // Check for heading characteristics
    const text = textElement.text.trim();
    
    // Skip very short or very long text
    if (text.length < 3 || text.length > 100) {
      return false;
    }

    // Check for heading patterns
    const hasHeadingPattern = (
      // Starts with capital letter
      /^[A-Z]/.test(text) ||
      // Contains numbers (like "1. Introduction")
      /^\d+\.?\s/.test(text) ||
      // All caps (but not too long)
      (text === text.toUpperCase() && text.length <= 30) ||
      // Bold or larger font
      textElement.fontWeight === 'bold' ||
      textElement.fontSize > 14
    );

    return hasHeadingPattern;
  }

  /**
   * Determine heading level based on font characteristics
   * @param textElement - Text element to analyze
   * @returns Heading level (1-6)
   */
  private determineHeadingLevel(textElement: TextElement): number {
    const fontSize = textElement.fontSize;
    const isBold = textElement.fontWeight === 'bold';
    
    // Determine level based on font size and weight
    if (fontSize >= 20 || (fontSize >= 18 && isBold)) return 1;
    if (fontSize >= 18 || (fontSize >= 16 && isBold)) return 2;
    if (fontSize >= 16 || (fontSize >= 14 && isBold)) return 3;
    if (fontSize >= 14 || (fontSize >= 12 && isBold)) return 4;
    if (fontSize >= 12) return 5;
    return 6;
  }

  /**
   * Truncate title to maximum length
   * @param title - Original title text
   * @returns Truncated title
   */
  private truncateTitle(title: string): string {
    if (title.length <= this.config.maxTitleLength) {
      return title;
    }
    
    // Find a good break point (space) near the limit
    const truncateAt = this.config.maxTitleLength - 3;
    const lastSpaceIndex = title.lastIndexOf(' ', truncateAt);
    
    if (lastSpaceIndex > truncateAt - 10) {
      // Use space if it's reasonably close to the limit
      return title.substring(0, lastSpaceIndex) + '...';
    }
    
    return title.substring(0, truncateAt) + '...';
  }

  /**
   * Create mock text elements for demonstration
   * This would be replaced with actual PDF text extraction
   * @param pageWidth - Page width
   * @param pageHeight - Page height
   * @returns Array of mock text elements
   */
  private createMockTextElements(pageWidth: number, pageHeight: number): TextElement[] {
    // This is a placeholder implementation
    // In a real implementation, this would parse the actual PDF content
    return [
      {
        text: 'Chapter 1: Introduction',
        fontSize: 18,
        fontWeight: 'bold',
        coordinates: {
          x: 50,
          y: pageHeight - 100,
          width: 200,
          height: 20
        }
      },
      {
        text: 'Overview',
        fontSize: 14,
        fontWeight: 'bold',
        coordinates: {
          x: 50,
          y: pageHeight - 150,
          width: 100,
          height: 16
        }
      },
      {
        text: 'This is regular body text that should not be considered a heading.',
        fontSize: 12,
        fontWeight: 'normal',
        coordinates: {
          x: 50,
          y: pageHeight - 200,
          width: 400,
          height: 14
        }
      }
    ];
  }
}

/**
 * Interface for text elements extracted from PDF
 */
interface TextElement {
  text: string;
  fontSize: number;
  fontWeight: string;
  coordinates: RectangleCoordinates;
}

// Export default instance
export const pageContentExtractor = new PageContentExtractor();