import {
  extractTextSelection,
  screenToPdfCoordinates,
  pdfToScreenCoordinates,
  validateCoordinatesInPage,
  normalizeSelectionCoordinates,
  debounceTextSelection
} from './pdfUtils';
import { TextSelection, RectangleCoordinates } from '../types/annotation.types';

// Mock DOM APIs
const mockSelection = {
  rangeCount: 1,
  isCollapsed: false,
  toString: jest.fn(),
  getRangeAt: jest.fn()
};

const mockRange = {
  getBoundingClientRect: jest.fn(),
  startContainer: document.createTextNode('test'),
  startOffset: 0
};

const mockPageElement = {
  getBoundingClientRect: jest.fn(),
  contains: jest.fn()
} as any;

// Mock document methods
Object.defineProperty(document, 'createTreeWalker', {
  value: jest.fn(() => ({
    nextNode: jest.fn()
  }))
});

describe('pdfUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTextSelection', () => {
    it('should return null for collapsed selection', () => {
      const collapsedSelection = { ...mockSelection, isCollapsed: true };
      const result = extractTextSelection(collapsedSelection as any, 1, mockPageElement, 1.0);
      expect(result).toBeNull();
    });

    it('should return null for empty selection', () => {
      mockSelection.toString.mockReturnValue('   ');
      mockSelection.getRangeAt.mockReturnValue(mockRange);
      
      const result = extractTextSelection(mockSelection as any, 1, mockPageElement, 1.0);
      expect(result).toBeNull();
    });

    it('should extract valid text selection', () => {
      const selectedText = 'selected text';
      mockSelection.toString.mockReturnValue(selectedText);
      mockSelection.getRangeAt.mockReturnValue(mockRange);
      mockRange.getBoundingClientRect.mockReturnValue({
        left: 100,
        top: 50,
        width: 200,
        height: 20
      });
      mockPageElement.getBoundingClientRect.mockReturnValue({
        left: 50,
        top: 30
      });

      const result = extractTextSelection(mockSelection as any, 1, mockPageElement, 1.0);

      expect(result).toEqual({
        text: selectedText,
        pageNumber: 1,
        startOffset: 0,
        endOffset: selectedText.length,
        coordinates: {
          x: 50, // 100 - 50
          y: 20, // 50 - 30
          width: 200,
          height: 20
        }
      });
    });

    it('should scale coordinates correctly', () => {
      const selectedText = 'test';
      const scale = 2.0;
      mockSelection.toString.mockReturnValue(selectedText);
      mockSelection.getRangeAt.mockReturnValue(mockRange);
      mockRange.getBoundingClientRect.mockReturnValue({
        left: 100,
        top: 50,
        width: 200,
        height: 20
      });
      mockPageElement.getBoundingClientRect.mockReturnValue({
        left: 50,
        top: 30
      });

      const result = extractTextSelection(mockSelection as any, 1, mockPageElement, scale);

      expect(result?.coordinates).toEqual({
        x: 25, // (100 - 50) / 2
        y: 10, // (50 - 30) / 2
        width: 100, // 200 / 2
        height: 10 // 20 / 2
      });
    });
  });

  describe('screenToPdfCoordinates', () => {
    it('should convert screen coordinates to PDF coordinates', () => {
      mockPageElement.getBoundingClientRect.mockReturnValue({
        left: 50,
        top: 30
      });

      const result = screenToPdfCoordinates(150, 80, mockPageElement, 2.0);

      expect(result).toEqual({
        x: 50, // (150 - 50) / 2
        y: 25  // (80 - 30) / 2
      });
    });
  });

  describe('pdfToScreenCoordinates', () => {
    it('should convert PDF coordinates to screen coordinates', () => {
      mockPageElement.getBoundingClientRect.mockReturnValue({
        left: 50,
        top: 30
      });

      const result = pdfToScreenCoordinates(25, 15, mockPageElement, 2.0);

      expect(result).toEqual({
        x: 100, // 25 * 2 + 50
        y: 60   // 15 * 2 + 30
      });
    });
  });

  describe('validateCoordinatesInPage', () => {
    const pageWidth = 500;
    const pageHeight = 700;

    it('should return true for valid coordinates', () => {
      const coordinates: RectangleCoordinates = {
        x: 10,
        y: 20,
        width: 100,
        height: 50
      };

      const result = validateCoordinatesInPage(coordinates, pageWidth, pageHeight);
      expect(result).toBe(true);
    });

    it('should return false for coordinates outside page bounds', () => {
      const coordinates: RectangleCoordinates = {
        x: 450,
        y: 20,
        width: 100, // extends beyond page width
        height: 50
      };

      const result = validateCoordinatesInPage(coordinates, pageWidth, pageHeight);
      expect(result).toBe(false);
    });

    it('should return false for negative coordinates', () => {
      const coordinates: RectangleCoordinates = {
        x: -10,
        y: 20,
        width: 100,
        height: 50
      };

      const result = validateCoordinatesInPage(coordinates, pageWidth, pageHeight);
      expect(result).toBe(false);
    });
  });

  describe('normalizeSelectionCoordinates', () => {
    const pageWidth = 500;
    const pageHeight = 700;

    it('should normalize coordinates within page bounds', () => {
      const coordinates: RectangleCoordinates = {
        x: 450,
        y: 650,
        width: 100, // would extend beyond page
        height: 100 // would extend beyond page
      };

      const result = normalizeSelectionCoordinates(coordinates, pageWidth, pageHeight);

      expect(result).toEqual({
        x: 400, // adjusted to fit width
        y: 600, // adjusted to fit height
        width: 50, // reduced to fit
        height: 50  // reduced to fit
      });
    });

    it('should handle negative coordinates', () => {
      const coordinates: RectangleCoordinates = {
        x: -10,
        y: -5,
        width: 100,
        height: 50
      };

      const result = normalizeSelectionCoordinates(coordinates, pageWidth, pageHeight);

      expect(result).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 50
      });
    });
  });

  describe('debounceTextSelection', () => {
    jest.useFakeTimers();

    it('should debounce function calls', () => {
      const mockCallback = jest.fn();
      const debouncedFn = debounceTextSelection(mockCallback, 300);
      
      const selection: TextSelection = {
        text: 'test',
        pageNumber: 1,
        startOffset: 0,
        endOffset: 4,
        coordinates: { x: 0, y: 0, width: 50, height: 20 }
      };

      // Call multiple times rapidly
      debouncedFn(selection);
      debouncedFn(selection);
      debouncedFn(selection);

      // Should not have been called yet
      expect(mockCallback).not.toHaveBeenCalled();

      // Fast forward time
      jest.advanceTimersByTime(300);

      // Should have been called once
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(selection);
    });

    it('should reset timer on subsequent calls', () => {
      const mockCallback = jest.fn();
      const debouncedFn = debounceTextSelection(mockCallback, 300);
      
      const selection: TextSelection = {
        text: 'test',
        pageNumber: 1,
        startOffset: 0,
        endOffset: 4,
        coordinates: { x: 0, y: 0, width: 50, height: 20 }
      };

      debouncedFn(selection);
      jest.advanceTimersByTime(200);
      
      debouncedFn(selection); // This should reset the timer
      jest.advanceTimersByTime(200);
      
      expect(mockCallback).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100); // Total 300ms from second call
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
  });
});