import { renderHook, act } from '@testing-library/react';
import { useTextSelection } from './useTextSelection';
import { TextSelection } from '../types/annotation.types';
import * as pdfUtils from '../utils/pdfUtils';

// Mock the pdfUtils module
jest.mock('../utils/pdfUtils');
const mockPdfUtils = pdfUtils as jest.Mocked<typeof pdfUtils>;

// Mock DOM APIs
const mockSelection = {
  rangeCount: 1,
  isCollapsed: false,
  toString: jest.fn(),
  getRangeAt: jest.fn(),
  removeAllRanges: jest.fn()
};

const mockRange = {
  commonAncestorContainer: document.createElement('div')
};

Object.defineProperty(window, 'getSelection', {
  value: jest.fn(() => mockSelection)
});

// Mock page element
const mockPageElement = document.createElement('div');
mockPageElement.contains = jest.fn();

describe('useTextSelection', () => {
  const mockOnTextSelected = jest.fn();
  const mockOnSelectionCleared = jest.fn();

  const defaultOptions = {
    pageNumber: 1,
    scale: 1.0,
    onTextSelected: mockOnTextSelected,
    onSelectionCleared: mockOnSelectionCleared,
    debounceDelay: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default mocks
    mockSelection.getRangeAt.mockReturnValue(mockRange as any);
    mockPageElement.contains.mockReturnValue(true);
    
    // Mock debounceTextSelection to return a function that calls immediately
    mockPdfUtils.debounceTextSelection.mockImplementation((callback) => callback);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with null selection', () => {
    const { result } = renderHook(() => useTextSelection(defaultOptions));

    expect(result.current.currentSelection).toBeNull();
    expect(result.current.isSelecting).toBe(false);
  });

  it('should handle text selection', () => {
    const mockTextSelection: TextSelection = {
      text: 'selected text',
      pageNumber: 1,
      startOffset: 0,
      endOffset: 13,
      coordinates: { x: 10, y: 20, width: 100, height: 20 }
    };

    mockPdfUtils.extractTextSelection.mockReturnValue(mockTextSelection);

    const { result } = renderHook(() => useTextSelection(defaultOptions));

    // Set page element
    act(() => {
      (result.current as any).setPageElement(mockPageElement);
    });

    // Simulate selection change
    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    expect(result.current.currentSelection).toEqual(mockTextSelection);
    expect(mockOnTextSelected).toHaveBeenCalledWith(mockTextSelection);
  });

  it('should clear selection when no text is selected', () => {
    const { result } = renderHook(() => useTextSelection(defaultOptions));

    // First set a selection
    const mockTextSelection: TextSelection = {
      text: 'selected text',
      pageNumber: 1,
      startOffset: 0,
      endOffset: 13,
      coordinates: { x: 10, y: 20, width: 100, height: 20 }
    };

    mockPdfUtils.extractTextSelection.mockReturnValue(mockTextSelection);

    act(() => {
      (result.current as any).setPageElement(mockPageElement);
    });

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    expect(result.current.currentSelection).toEqual(mockTextSelection);

    // Now clear selection
    mockPdfUtils.extractTextSelection.mockReturnValue(null);

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    expect(result.current.currentSelection).toBeNull();
    expect(mockOnSelectionCleared).toHaveBeenCalled();
  });

  it('should ignore selections outside page element', () => {
    const { result } = renderHook(() => useTextSelection(defaultOptions));

    // Set page element that doesn't contain the selection
    mockPageElement.contains.mockReturnValue(false);

    act(() => {
      (result.current as any).setPageElement(mockPageElement);
    });

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    expect(result.current.currentSelection).toBeNull();
    expect(mockOnTextSelected).not.toHaveBeenCalled();
  });

  it('should handle mouse down and up events', () => {
    const { result } = renderHook(() => useTextSelection(defaultOptions));

    expect(result.current.isSelecting).toBe(false);

    // Simulate mouse down
    act(() => {
      const event = new Event('mousedown');
      document.dispatchEvent(event);
    });

    expect(result.current.isSelecting).toBe(true);

    // Mock a text selection for mouse up
    const mockTextSelection: TextSelection = {
      text: 'selected text',
      pageNumber: 1,
      startOffset: 0,
      endOffset: 13,
      coordinates: { x: 10, y: 20, width: 100, height: 20 }
    };

    mockPdfUtils.extractTextSelection.mockReturnValue(mockTextSelection);

    act(() => {
      (result.current as any).setPageElement(mockPageElement);
    });

    // Simulate mouse up
    act(() => {
      const event = new Event('mouseup');
      document.dispatchEvent(event);
    });

    // Fast forward the timeout
    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(result.current.isSelecting).toBe(false);
    expect(result.current.currentSelection).toEqual(mockTextSelection);
  });

  it('should clear selection programmatically', () => {
    const { result } = renderHook(() => useTextSelection(defaultOptions));

    // First set a selection
    const mockTextSelection: TextSelection = {
      text: 'selected text',
      pageNumber: 1,
      startOffset: 0,
      endOffset: 13,
      coordinates: { x: 10, y: 20, width: 100, height: 20 }
    };

    mockPdfUtils.extractTextSelection.mockReturnValue(mockTextSelection);

    act(() => {
      (result.current as any).setPageElement(mockPageElement);
    });

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    expect(result.current.currentSelection).toEqual(mockTextSelection);

    // Clear selection programmatically
    act(() => {
      result.current.clearSelection();
    });

    expect(mockSelection.removeAllRanges).toHaveBeenCalled();
    expect(result.current.currentSelection).toBeNull();
    expect(result.current.isSelecting).toBe(false);
    expect(mockOnSelectionCleared).toHaveBeenCalled();
  });

  it('should handle no selection object', () => {
    (window.getSelection as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useTextSelection(defaultOptions));

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    expect(result.current.currentSelection).toBeNull();
    expect(mockOnTextSelected).not.toHaveBeenCalled();
  });

  it('should handle selection with no ranges', () => {
    mockSelection.rangeCount = 0;

    const { result } = renderHook(() => useTextSelection(defaultOptions));

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    expect(result.current.currentSelection).toBeNull();
    expect(mockOnTextSelected).not.toHaveBeenCalled();
  });

  it('should handle scale changes in hook dependencies', () => {
    // This test verifies that the hook properly updates its dependencies
    // when scale changes, which is important for coordinate calculations
    const { rerender } = renderHook(
      (props) => useTextSelection(props),
      { initialProps: defaultOptions }
    );

    // Change scale - this should not throw and should update internal dependencies
    expect(() => {
      rerender({ ...defaultOptions, scale: 2.0 });
    }).not.toThrow();

    // Change page number - this should also work
    expect(() => {
      rerender({ ...defaultOptions, pageNumber: 2 });
    }).not.toThrow();
  });
});