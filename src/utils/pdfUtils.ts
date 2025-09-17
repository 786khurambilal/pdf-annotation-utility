import { TextSelection, RectangleCoordinates } from '../types/annotation.types';

/**
 * Extracts text selection from the browser's Selection API
 * and maps it to PDF coordinates
 */
export const extractTextSelection = (
  selection: Selection,
  pageNumber: number,
  pageElement: HTMLElement,
  scale: number = 1.0
): TextSelection | null => {
  if (!selection.rangeCount || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();
  
  if (!selectedText) {
    return null;
  }

  // Get the bounding rectangle of the selection
  const rect = range.getBoundingClientRect();
  const pageRect = pageElement.getBoundingClientRect();

  // Calculate coordinates relative to the PDF page
  const coordinates: RectangleCoordinates = {
    x: (rect.left - pageRect.left) / scale,
    y: (rect.top - pageRect.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale
  };



  // Calculate text offsets (simplified - in a real implementation,
  // this would need to account for PDF text structure)
  const startOffset = getTextOffset(range.startContainer, range.startOffset);
  const endOffset = startOffset + selectedText.length;

  return {
    text: selectedText,
    pageNumber,
    startOffset,
    endOffset,
    coordinates
  };
};

/**
 * Calculates the text offset within the page
 * This is a simplified implementation
 */
const getTextOffset = (node: Node, offset: number): number => {
  let textOffset = 0;
  const walker = document.createTreeWalker(
    node.parentElement || document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let currentNode;
  while (currentNode = walker.nextNode()) {
    if (currentNode === node) {
      return textOffset + offset;
    }
    textOffset += currentNode.textContent?.length || 0;
  }

  return textOffset;
};

/**
 * Converts screen coordinates to PDF coordinates
 */
export const screenToPdfCoordinates = (
  screenX: number,
  screenY: number,
  pageElement: HTMLElement,
  scale: number = 1.0
): { x: number; y: number } => {
  const pageRect = pageElement.getBoundingClientRect();
  
  return {
    x: (screenX - pageRect.left) / scale,
    y: (screenY - pageRect.top) / scale
  };
};

/**
 * Converts PDF coordinates to screen coordinates
 */
export const pdfToScreenCoordinates = (
  pdfX: number,
  pdfY: number,
  pageElement: HTMLElement,
  scale: number = 1.0
): { x: number; y: number } => {
  const pageRect = pageElement.getBoundingClientRect();
  
  return {
    x: pdfX * scale + pageRect.left,
    y: pdfY * scale + pageRect.top
  };
};

/**
 * Validates that coordinates are within page bounds
 */
export const validateCoordinatesInPage = (
  coordinates: RectangleCoordinates,
  pageWidth: number,
  pageHeight: number
): boolean => {
  return (
    coordinates.x >= 0 &&
    coordinates.y >= 0 &&
    coordinates.x + coordinates.width <= pageWidth &&
    coordinates.y + coordinates.height <= pageHeight
  );
};

/**
 * Normalizes text selection coordinates to ensure they're valid
 */
export const normalizeSelectionCoordinates = (
  coordinates: RectangleCoordinates,
  pageWidth: number,
  pageHeight: number
): RectangleCoordinates => {
  return {
    x: Math.max(0, Math.min(coordinates.x, pageWidth - coordinates.width)),
    y: Math.max(0, Math.min(coordinates.y, pageHeight - coordinates.height)),
    width: Math.min(coordinates.width, pageWidth - coordinates.x),
    height: Math.min(coordinates.height, pageHeight - coordinates.y)
  };
};

/**
 * Debounces text selection events to prevent excessive processing
 */
export const debounceTextSelection = (
  callback: (selection: TextSelection) => void,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;
  
  return (selection: TextSelection) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(selection), delay);
  };
};