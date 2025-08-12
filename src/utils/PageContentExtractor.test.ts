import { PageContentExtractor, PageHeading } from './PageContentExtractor';
import { PDFDocument } from 'pdf-lib';
import { RectangleCoordinates } from '../types/annotation.types';

// Mock pdf-lib
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn(),
  },
}));

describe('PageContentExtractor', () => {
  let extractor: PageContentExtractor;
  let mockPdfDocument: jest.Mocked<PDFDocument>;
  let mockPage: any;

  beforeEach(() => {
    extractor = new PageContentExtractor();
    
    // Create mock page
    mockPage = {
      getSize: jest.fn().mockReturnValue({ width: 612, height: 792 }),
    };

    // Create mock PDF document
    mockPdfDocument = {
      getPageCount: jest.fn().mockReturnValue(5),
      getPage: jest.fn().mockReturnValue(mockPage),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractHeadings', () => {
    it('should extract headings from a valid page', async () => {
      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      
      expect(mockPdfDocument.getPage).toHaveBeenCalledWith(0); // 0-based index
      expect(Array.isArray(headings)).toBe(true);
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should return headings sorted by position', async () => {
      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      
      // Check that headings are sorted by Y position (top to bottom)
      for (let i = 1; i < headings.length; i++) {
        expect(headings[i].coordinates.y).toBeLessThanOrEqual(headings[i - 1].coordinates.y);
      }
    });

    it('should handle invalid page numbers', async () => {
      const headings = await extractor.extractHeadings(10, mockPdfDocument);
      expect(headings).toEqual([]);
    });

    it('should handle page number less than 1', async () => {
      const headings = await extractor.extractHeadings(0, mockPdfDocument);
      expect(headings).toEqual([]);
    });

    it('should return empty array when extraction fails', async () => {
      mockPdfDocument.getPage.mockImplementation(() => {
        throw new Error('Page extraction failed');
      });

      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      expect(headings).toEqual([]);
    });

    it('should validate heading structure', async () => {
      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      
      headings.forEach(heading => {
        expect(heading).toHaveProperty('text');
        expect(heading).toHaveProperty('level');
        expect(heading).toHaveProperty('coordinates');
        expect(heading).toHaveProperty('fontSize');
        expect(heading).toHaveProperty('fontWeight');
        
        expect(typeof heading.text).toBe('string');
        expect(typeof heading.level).toBe('number');
        expect(heading.level).toBeGreaterThanOrEqual(1);
        expect(heading.level).toBeLessThanOrEqual(6);
        expect(typeof heading.fontSize).toBe('number');
        expect(typeof heading.fontWeight).toBe('string');
      });
    });
  });

  describe('findBestHeadingForArea', () => {
    const mockHeadings: PageHeading[] = [
      {
        text: 'Chapter 1: Introduction',
        level: 1,
        fontSize: 18,
        fontWeight: 'bold',
        coordinates: { x: 50, y: 700, width: 200, height: 20 }
      },
      {
        text: 'Overview',
        level: 2,
        fontSize: 14,
        fontWeight: 'bold',
        coordinates: { x: 50, y: 650, width: 100, height: 16 }
      },
      {
        text: 'Conclusion',
        level: 1,
        fontSize: 18,
        fontWeight: 'bold',
        coordinates: { x: 50, y: 200, width: 150, height: 20 }
      }
    ];

    it('should find the closest heading to QR code coordinates', () => {
      const qrCoordinates: RectangleCoordinates = {
        x: 75, // Closer to Overview heading
        y: 655, // Closer to Overview heading
        width: 50,
        height: 50
      };

      const result = extractor.findBestHeadingForArea(mockHeadings, qrCoordinates);
      expect(result).toBe('Overview');
    });

    it('should prefer higher level headings when distances are similar', () => {
      const qrCoordinates: RectangleCoordinates = {
        x: 125, // Exactly between Chapter 1 (x: 50) and Overview (x: 50) centers
        y: 675, // Exactly between Chapter 1 (y: 700) and Overview (y: 650)
        width: 50,
        height: 50
      };

      const result = extractor.findBestHeadingForArea(mockHeadings, qrCoordinates);
      expect(result).toBe('Chapter 1: Introduction'); // Level 1 preferred over Level 2
    });

    it('should return first heading when no headings are nearby', () => {
      const qrCoordinates: RectangleCoordinates = {
        x: 500,
        y: 400,
        width: 50,
        height: 50
      };

      const result = extractor.findBestHeadingForArea(mockHeadings, qrCoordinates);
      expect(result).toBe('Chapter 1: Introduction'); // First heading by level
    });

    it('should return null when no headings are provided', () => {
      const qrCoordinates: RectangleCoordinates = {
        x: 100,
        y: 100,
        width: 50,
        height: 50
      };

      const result = extractor.findBestHeadingForArea([], qrCoordinates);
      expect(result).toBeNull();
    });

    it('should truncate long heading text', () => {
      const longHeadings: PageHeading[] = [
        {
          text: 'This is a very long heading that exceeds the maximum character limit and should be truncated',
          level: 1,
          fontSize: 18,
          fontWeight: 'bold',
          coordinates: { x: 50, y: 700, width: 400, height: 20 }
        }
      ];

      const qrCoordinates: RectangleCoordinates = {
        x: 100,
        y: 700,
        width: 50,
        height: 50
      };

      const result = extractor.findBestHeadingForArea(longHeadings, qrCoordinates);
      expect(result).toBe('This is a very long heading that exceeds the...');
      expect(result!.length).toBeLessThanOrEqual(50);
    });
  });

  describe('generateFallbackTitle', () => {
    it('should generate fallback title with page number', () => {
      const result = extractor.generateFallbackTitle(1);
      expect(result).toBe('QR Code Link - Page 1');
    });

    it('should handle different page numbers', () => {
      expect(extractor.generateFallbackTitle(5)).toBe('QR Code Link - Page 5');
      expect(extractor.generateFallbackTitle(100)).toBe('QR Code Link - Page 100');
    });
  });

  describe('configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultExtractor = new PageContentExtractor();
      expect(defaultExtractor).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        minFontSize: 14,
        maxTitleLength: 30,
        proximityThreshold: 150
      };

      const customExtractor = new PageContentExtractor(customConfig);
      expect(customExtractor).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const partialConfig = {
        maxTitleLength: 30
      };

      const customExtractor = new PageContentExtractor(partialConfig);
      expect(customExtractor).toBeDefined();
    });
  });

  describe('heading detection logic', () => {
    it('should identify text elements as headings based on font size', async () => {
      // This test verifies the internal heading detection logic
      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      
      // Mock implementation should return headings with appropriate font sizes
      const largeHeadings = headings.filter(h => h.fontSize >= 16);
      expect(largeHeadings.length).toBeGreaterThan(0);
    });

    it('should assign appropriate heading levels', async () => {
      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      
      headings.forEach(heading => {
        if (heading.fontSize >= 18) {
          expect(heading.level).toBeLessThanOrEqual(2);
        }
        if (heading.fontSize >= 16) {
          expect(heading.level).toBeLessThanOrEqual(3);
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle PDF document errors gracefully', async () => {
      mockPdfDocument.getPageCount.mockImplementation(() => {
        throw new Error('Document error');
      });

      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      expect(headings).toEqual([]);
    });

    it('should handle page extraction errors', async () => {
      mockPdfDocument.getPage.mockImplementation(() => {
        throw new Error('Page error');
      });

      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      expect(headings).toEqual([]);
    });

    it('should handle malformed page data', async () => {
      mockPage.getSize.mockImplementation(() => {
        throw new Error('Size error');
      });

      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      expect(headings).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty pages', async () => {
      // Mock empty page
      mockPage.getSize.mockReturnValue({ width: 612, height: 792 });
      
      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      expect(Array.isArray(headings)).toBe(true);
    });

    it('should handle pages with only body text', async () => {
      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      
      // Should filter out body text and only return actual headings
      const bodyTextHeadings = headings.filter(h => h.fontSize < 12);
      expect(bodyTextHeadings.length).toBe(0);
    });

    it('should handle special characters in headings', () => {
      const headingsWithSpecialChars: PageHeading[] = [
        {
          text: 'Chapter 1: "Introduction" & Overview',
          level: 1,
          fontSize: 18,
          fontWeight: 'bold',
          coordinates: { x: 50, y: 700, width: 250, height: 20 }
        }
      ];

      const qrCoordinates: RectangleCoordinates = {
        x: 100,
        y: 700,
        width: 50,
        height: 50
      };

      const result = extractor.findBestHeadingForArea(headingsWithSpecialChars, qrCoordinates);
      expect(result).toBe('Chapter 1: "Introduction" & Overview');
    });
  });

  describe('performance considerations', () => {
    it('should handle multiple headings efficiently', async () => {
      const startTime = Date.now();
      const headings = await extractor.extractHeadings(1, mockPdfDocument);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(Array.isArray(headings)).toBe(true);
    });

    it('should handle proximity calculations efficiently', () => {
      // Create many headings to test performance
      const manyHeadings: PageHeading[] = Array.from({ length: 100 }, (_, i) => ({
        text: `Heading ${i}`,
        level: (i % 6) + 1,
        fontSize: 12 + (i % 8),
        fontWeight: i % 2 === 0 ? 'bold' : 'normal',
        coordinates: { x: i * 10, y: i * 5, width: 100, height: 16 }
      }));

      const qrCoordinates: RectangleCoordinates = {
        x: 500,
        y: 250,
        width: 50,
        height: 50
      };

      const startTime = Date.now();
      const result = extractor.findBestHeadingForArea(manyHeadings, qrCoordinates);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      expect(typeof result).toBe('string');
    });
  });
});

// Integration tests with different PDF structures
describe('PageContentExtractor Integration', () => {
  let extractor: PageContentExtractor;

  beforeEach(() => {
    extractor = new PageContentExtractor();
  });

  describe('various PDF structures', () => {
    it('should handle academic papers with numbered sections', () => {
      const academicHeadings: PageHeading[] = [
        {
          text: '1. Introduction',
          level: 1,
          fontSize: 16,
          fontWeight: 'bold',
          coordinates: { x: 50, y: 700, width: 120, height: 18 }
        },
        {
          text: '1.1 Background',
          level: 2,
          fontSize: 14,
          fontWeight: 'bold',
          coordinates: { x: 70, y: 650, width: 110, height: 16 }
        },
        {
          text: '2. Methodology',
          level: 1,
          fontSize: 16,
          fontWeight: 'bold',
          coordinates: { x: 50, y: 500, width: 130, height: 18 }
        }
      ];

      const qrCoordinates: RectangleCoordinates = {
        x: 125, // Exactly at 1.1 Background center (x: 70 + width: 110 / 2 = 125)
        y: 650, // Exactly at 1.1 Background y position
        width: 50,
        height: 50
      };

      const result = extractor.findBestHeadingForArea(academicHeadings, qrCoordinates);
      expect(result).toBe('1.1 Background');
    });

    it('should handle books with chapter structure', () => {
      const bookHeadings: PageHeading[] = [
        {
          text: 'CHAPTER 5',
          level: 1,
          fontSize: 20,
          fontWeight: 'bold',
          coordinates: { x: 200, y: 750, width: 100, height: 22 }
        },
        {
          text: 'The Journey Begins',
          level: 2,
          fontSize: 18,
          fontWeight: 'normal',
          coordinates: { x: 150, y: 720, width: 200, height: 20 }
        }
      ];

      const qrCoordinates: RectangleCoordinates = {
        x: 250,
        y: 735,
        width: 50,
        height: 50
      };

      const result = extractor.findBestHeadingForArea(bookHeadings, qrCoordinates);
      expect(result).toBe('CHAPTER 5');
    });

    it('should handle technical manuals with hierarchical sections', () => {
      const manualHeadings: PageHeading[] = [
        {
          text: 'Installation Guide',
          level: 1,
          fontSize: 18,
          fontWeight: 'bold',
          coordinates: { x: 50, y: 700, width: 150, height: 20 }
        },
        {
          text: 'Prerequisites',
          level: 2,
          fontSize: 14,
          fontWeight: 'bold',
          coordinates: { x: 70, y: 650, width: 100, height: 16 }
        },
        {
          text: 'System Requirements',
          level: 3,
          fontSize: 12,
          fontWeight: 'bold',
          coordinates: { x: 90, y: 620, width: 140, height: 14 }
        }
      ];

      const qrCoordinates: RectangleCoordinates = {
        x: 120, // Exactly at Prerequisites center (x: 70 + width: 100 / 2 = 120)
        y: 650, // Exactly at Prerequisites y position
        width: 50,
        height: 50
      };

      const result = extractor.findBestHeadingForArea(manualHeadings, qrCoordinates);
      expect(result).toBe('Prerequisites');
    });
  });
});