import { renderHook, act } from '@testing-library/react';
import { usePageVirtualization } from './usePageVirtualization';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

describe('usePageVirtualization', () => {
  const defaultProps = {
    totalPages: 10,
    currentPage: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => usePageVirtualization(defaultProps));

      expect(result.current.virtualizedPages).toHaveLength(10);
      expect(result.current.visiblePages).toEqual([1]);
      expect(result.current.totalHeight).toBe(10000); // 10 pages * 1000px default height
      expect(result.current.pageCache.size).toBe(0);
    });

    it('should use custom configuration', () => {
      const customConfig = {
        bufferSize: 3,
        maxCacheSize: 15,
        averagePageHeight: 1200,
      };

      const { result } = renderHook(() => 
        usePageVirtualization({
          ...defaultProps,
          config: customConfig,
        })
      );

      expect(result.current.totalHeight).toBe(12000); // 10 pages * 1200px
      expect(result.current.config.bufferSize).toBe(3);
      expect(result.current.config.maxCacheSize).toBe(15);
    });
  });

  describe('page range calculation', () => {
    it('should calculate correct page range with buffer', () => {
      const { result } = renderHook(() => 
        usePageVirtualization({
          ...defaultProps,
          currentPage: 5,
          config: { bufferSize: 2 },
        })
      );

      const virtualizedPages = result.current.virtualizedPages;
      const shouldRenderPages = virtualizedPages.filter(p => p.shouldRender);
      
      expect(shouldRenderPages).toHaveLength(5); // Pages 3-7
      expect(shouldRenderPages[0].pageNumber).toBe(3);
      expect(shouldRenderPages[4].pageNumber).toBe(7);
    });

    it('should handle edge cases at document boundaries', () => {
      const { result } = renderHook(() => 
        usePageVirtualization({
          ...defaultProps,
          currentPage: 1,
          config: { bufferSize: 3 },
        })
      );

      const shouldRenderPages = result.current.virtualizedPages.filter(p => p.shouldRender);
      expect(shouldRenderPages[0].pageNumber).toBe(1); // Should not go below 1
      expect(shouldRenderPages[shouldRenderPages.length - 1].pageNumber).toBe(4);
    });

    it('should handle last page correctly', () => {
      const { result } = renderHook(() => 
        usePageVirtualization({
          ...defaultProps,
          currentPage: 10,
          config: { bufferSize: 3 },
        })
      );

      const shouldRenderPages = result.current.virtualizedPages.filter(p => p.shouldRender);
      expect(shouldRenderPages[0].pageNumber).toBe(7);
      expect(shouldRenderPages[shouldRenderPages.length - 1].pageNumber).toBe(10); // Should not go above totalPages
    });
  });

  describe('page cache management', () => {
    it('should update page cache when registering elements', () => {
      const { result } = renderHook(() => usePageVirtualization(defaultProps));

      const mockElement = document.createElement('div');
      
      act(() => {
        result.current.registerPageElement(1, mockElement);
      });

      expect(result.current.pageCache.has(1)).toBe(true);
      expect(result.current.pageCache.get(1)?.element).toBe(mockElement);
    });

    it('should set loading state correctly', () => {
      const { result } = renderHook(() => usePageVirtualization(defaultProps));

      act(() => {
        result.current.setPageLoading(1, true);
      });

      expect(result.current.pageCache.get(1)?.isLoading).toBe(true);

      act(() => {
        result.current.setPageLoading(1, false);
      });

      expect(result.current.pageCache.get(1)?.isLoading).toBe(false);
    });

    it('should set error state correctly', () => {
      const { result } = renderHook(() => usePageVirtualization(defaultProps));

      const errorMessage = 'Failed to load page';

      act(() => {
        result.current.setPageError(1, errorMessage);
      });

      expect(result.current.pageCache.get(1)?.error).toBe(errorMessage);
      expect(result.current.pageCache.get(1)?.isLoading).toBe(false);
    });

    it('should clean up cache periodically', () => {
      const { result } = renderHook(() => 
        usePageVirtualization({
          ...defaultProps,
          currentPage: 5, // Move away from pages 1-3
          config: { 
            maxCacheSize: 2,
            cacheTimeout: 1000,
            bufferSize: 1, // Small buffer to ensure pages 1-3 are outside range
          },
        })
      );

      // Add multiple pages to cache that are outside the current range
      act(() => {
        result.current.registerPageElement(1, document.createElement('div'));
        result.current.registerPageElement(2, document.createElement('div'));
        result.current.registerPageElement(3, document.createElement('div'));
      });

      expect(result.current.pageCache.size).toBe(3);

      // Fast-forward time to make entries expired
      act(() => {
        jest.advanceTimersByTime(2000); // Make entries expired
      });

      // Trigger cleanup manually
      act(() => {
        result.current.cleanupCache();
      });

      // Should clean up old entries beyond maxCacheSize
      expect(result.current.pageCache.size).toBeLessThanOrEqual(2);
    });
  });

  describe('scroll management', () => {
    it('should calculate page from scroll position', () => {
      const { result } = renderHook(() => 
        usePageVirtualization({
          ...defaultProps,
          config: { averagePageHeight: 1000 },
        })
      );

      expect(result.current.getPageFromScrollTop(0)).toBe(1);
      expect(result.current.getPageFromScrollTop(1000)).toBe(2);
      expect(result.current.getPageFromScrollTop(2500)).toBe(3);
    });

    it('should calculate scroll position for page', () => {
      const { result } = renderHook(() => 
        usePageVirtualization({
          ...defaultProps,
          config: { averagePageHeight: 1000 },
        })
      );

      expect(result.current.getScrollTopForPage(1)).toBe(0);
      expect(result.current.getScrollTopForPage(2)).toBe(1000);
      expect(result.current.getScrollTopForPage(5)).toBe(4000);
    });

    it('should handle scroll events', () => {
      const mockOnPageChange = jest.fn();
      const { result } = renderHook(() => 
        usePageVirtualization({
          ...defaultProps,
          config: { averagePageHeight: 1000 },
          onPageChange: mockOnPageChange,
        })
      );

      const mockScrollEvent = {
        target: { scrollTop: 2000 },
      } as any;

      act(() => {
        result.current.handleScroll(mockScrollEvent);
      });

      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });
  });

  describe('cache statistics', () => {
    it('should provide accurate cache statistics', () => {
      const { result } = renderHook(() => usePageVirtualization(defaultProps));

      // Add some cache entries
      act(() => {
        result.current.setPageLoading(1, true);
        result.current.setPageError(2, 'Error message');
        result.current.registerPageElement(3, document.createElement('div'));
      });

      const stats = result.current.getCacheStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.loadingEntries).toBe(1);
      expect(stats.errorEntries).toBe(1);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('intersection observer integration', () => {
    it('should set up intersection observer', () => {
      renderHook(() => usePageVirtualization(defaultProps));

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          root: null,
          rootMargin: '50px',
          threshold: [0.1, 0.5, 0.9],
        })
      );
    });

    it('should observe page elements when registered', () => {
      const mockObserve = jest.fn();
      const mockUnobserve = jest.fn();
      
      mockIntersectionObserver.mockReturnValue({
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: jest.fn(),
      });

      const { result } = renderHook(() => usePageVirtualization(defaultProps));

      const mockElement = document.createElement('div');

      act(() => {
        result.current.registerPageElement(1, mockElement);
      });

      expect(mockObserve).toHaveBeenCalledWith(mockElement);
      expect(mockElement.getAttribute('data-page-number')).toBe('1');
    });

    it('should unobserve elements when unregistered', () => {
      const mockObserve = jest.fn();
      const mockUnobserve = jest.fn();
      
      mockIntersectionObserver.mockReturnValue({
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: jest.fn(),
      });

      const { result } = renderHook(() => usePageVirtualization(defaultProps));

      const mockElement = document.createElement('div');

      act(() => {
        result.current.registerPageElement(1, mockElement);
      });

      act(() => {
        result.current.registerPageElement(1, null);
      });

      expect(mockUnobserve).toHaveBeenCalledWith(mockElement);
    });
  });

  describe('performance optimizations', () => {
    it('should limit rendered pages based on buffer size', () => {
      const { result } = renderHook(() => 
        usePageVirtualization({
          totalPages: 100,
          currentPage: 50,
          config: { bufferSize: 1 },
        })
      );

      const shouldRenderPages = result.current.virtualizedPages.filter(p => p.shouldRender);
      expect(shouldRenderPages).toHaveLength(3); // Current page + 1 before + 1 after
    });

    it('should update visible pages efficiently', () => {
      const { result, rerender } = renderHook(
        ({ currentPage }) => usePageVirtualization({
          ...defaultProps,
          currentPage,
        }),
        { initialProps: { currentPage: 1 } }
      );

      expect(result.current.visiblePages).toEqual([1]);

      rerender({ currentPage: 5 });

      // Should update visible pages based on new current page
      const shouldRenderPages = result.current.virtualizedPages.filter(p => p.shouldRender);
      expect(shouldRenderPages.some(p => p.pageNumber === 5)).toBe(true);
    });
  });
});