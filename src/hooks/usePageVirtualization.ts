import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface PageCacheEntry {
  pageNumber: number;
  element: HTMLElement | null;
  lastAccessed: number;
  isLoading: boolean;
  error: string | null;
}

export interface VirtualizationConfig {
  /** Number of pages to render before and after the visible page */
  bufferSize: number;
  /** Maximum number of pages to keep in cache */
  maxCacheSize: number;
  /** Time in milliseconds before a cached page is eligible for cleanup */
  cacheTimeout: number;
  /** Container height for viewport calculations */
  containerHeight: number;
  /** Average page height for calculations */
  averagePageHeight: number;
}

export interface UsePageVirtualizationOptions {
  totalPages: number;
  currentPage: number;
  config?: Partial<VirtualizationConfig>;
  onPageChange?: (page: number) => void;
}

export interface VirtualizedPageInfo {
  pageNumber: number;
  isVisible: boolean;
  shouldRender: boolean;
  top: number;
  height: number;
}

const DEFAULT_CONFIG: VirtualizationConfig = {
  bufferSize: 2,
  maxCacheSize: 10,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  containerHeight: 800,
  averagePageHeight: 1000,
};

export const usePageVirtualization = ({
  totalPages,
  currentPage,
  config: userConfig = {},
  onPageChange,
}: UsePageVirtualizationOptions) => {
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...userConfig }), [userConfig]);
  
  const [pageCache, setPageCache] = useState<Map<number, PageCacheEntry>>(new Map());
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([currentPage]));
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(config.containerHeight);
  
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();
  const intersectionObserverRef = useRef<IntersectionObserver>();
  const pageElementsRef = useRef<Map<number, HTMLElement>>(new Map());

  // Calculate which pages should be rendered based on current page and buffer
  const getPageRange = useCallback(() => {
    const start = Math.max(1, currentPage - config.bufferSize);
    const end = Math.min(totalPages, currentPage + config.bufferSize);
    return { start, end };
  }, [currentPage, config.bufferSize, totalPages]);

  // Get virtualized page information
  const getVirtualizedPages = useCallback((): VirtualizedPageInfo[] => {
    const pages: VirtualizedPageInfo[] = [];
    const { start, end } = getPageRange();
    
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const shouldRender = pageNumber >= start && pageNumber <= end;
      const isVisible = visiblePages.has(pageNumber);
      const top = (pageNumber - 1) * config.averagePageHeight;
      
      pages.push({
        pageNumber,
        isVisible,
        shouldRender,
        top,
        height: config.averagePageHeight,
      });
    }
    
    return pages;
  }, [totalPages, getPageRange, visiblePages, config.averagePageHeight]);

  // Update page cache entry
  const updatePageCache = useCallback((pageNumber: number, updates: Partial<PageCacheEntry>) => {
    setPageCache(prev => {
      const newCache = new Map(prev);
      const existing = newCache.get(pageNumber) || {
        pageNumber,
        element: null,
        lastAccessed: Date.now(),
        isLoading: false,
        error: null,
      };
      
      newCache.set(pageNumber, {
        ...existing,
        ...updates,
        lastAccessed: Date.now(),
      });
      
      return newCache;
    });
  }, []);

  // Clean up old cache entries
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const { start, end } = getPageRange();
    
    setPageCache(prev => {
      const newCache = new Map(prev);
      const entriesToRemove: number[] = [];
      
      // Find entries to remove (old and outside current range)
      for (const [pageNumber, entry] of newCache.entries()) {
        const isOutsideRange = pageNumber < start || pageNumber > end;
        const isExpired = now - entry.lastAccessed > config.cacheTimeout;
        const shouldRemove = isOutsideRange && isExpired;
        
        if (shouldRemove) {
          entriesToRemove.push(pageNumber);
        }
      }
      
      // Remove oldest entries if cache is too large
      if (newCache.size > config.maxCacheSize) {
        const sortedEntries = Array.from(newCache.entries())
          .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        
        const excessCount = newCache.size - config.maxCacheSize;
        for (let i = 0; i < excessCount; i++) {
          const [pageNumber] = sortedEntries[i];
          if (!entriesToRemove.includes(pageNumber)) {
            entriesToRemove.push(pageNumber);
          }
        }
      }
      
      // Remove entries
      entriesToRemove.forEach(pageNumber => {
        newCache.delete(pageNumber);
        pageElementsRef.current.delete(pageNumber);
      });
      
      return newCache;
    });
  }, [getPageRange, config.cacheTimeout, config.maxCacheSize]);

  // Set up intersection observer for visibility tracking
  useEffect(() => {
    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
    }

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        const newVisiblePages = new Set(visiblePages);
        
        entries.forEach((entry) => {
          const pageNumber = parseInt(entry.target.getAttribute('data-page-number') || '0');
          if (pageNumber > 0) {
            if (entry.isIntersecting) {
              newVisiblePages.add(pageNumber);
              updatePageCache(pageNumber, { lastAccessed: Date.now() });
            } else {
              newVisiblePages.delete(pageNumber);
            }
          }
        });
        
        setVisiblePages(newVisiblePages);
        
        // Update current page based on most visible page
        if (newVisiblePages.size > 0 && onPageChange) {
          const visiblePageNumbers = Array.from(newVisiblePages).sort((a, b) => a - b);
          const newCurrentPage = visiblePageNumbers[0];
          if (newCurrentPage !== currentPage) {
            onPageChange(newCurrentPage);
          }
        }
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: [0.1, 0.5, 0.9],
      }
    );

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [visiblePages, currentPage, onPageChange, updatePageCache]);

  // Register page element for intersection observation
  const registerPageElement = useCallback((pageNumber: number, element: HTMLElement | null) => {
    if (element) {
      pageElementsRef.current.set(pageNumber, element);
      element.setAttribute('data-page-number', pageNumber.toString());
      
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.observe(element);
      }
      
      updatePageCache(pageNumber, { element });
    } else {
      // Element is being unmounted
      const existingElement = pageElementsRef.current.get(pageNumber);
      if (existingElement && intersectionObserverRef.current) {
        intersectionObserverRef.current.unobserve(existingElement);
      }
      pageElementsRef.current.delete(pageNumber);
    }
  }, [updatePageCache]);

  // Handle page loading states
  const setPageLoading = useCallback((pageNumber: number, isLoading: boolean) => {
    updatePageCache(pageNumber, { isLoading });
  }, [updatePageCache]);

  const setPageError = useCallback((pageNumber: number, error: string | null) => {
    updatePageCache(pageNumber, { error, isLoading: false });
  }, [updatePageCache]);

  // Periodic cache cleanup
  useEffect(() => {
    cleanupTimeoutRef.current = setInterval(cleanupCache, 60000); // Clean up every minute
    
    return () => {
      if (cleanupTimeoutRef.current) {
        clearInterval(cleanupTimeoutRef.current);
      }
    };
  }, [cleanupCache]);

  // Calculate total document height for scrolling
  const totalHeight = useMemo(() => {
    return totalPages * config.averagePageHeight;
  }, [totalPages, config.averagePageHeight]);

  // Get current scroll position as page number
  const getPageFromScrollTop = useCallback((scrollTop: number) => {
    return Math.floor(scrollTop / config.averagePageHeight) + 1;
  }, [config.averagePageHeight]);

  // Get scroll position for a specific page
  const getScrollTopForPage = useCallback((pageNumber: number) => {
    return (pageNumber - 1) * config.averagePageHeight;
  }, [config.averagePageHeight]);

  // Handle scroll events
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);
    
    const newPage = getPageFromScrollTop(newScrollTop);
    if (newPage !== currentPage && onPageChange) {
      onPageChange(newPage);
    }
  }, [currentPage, onPageChange, getPageFromScrollTop]);

  // Scroll to specific page
  const scrollToPage = useCallback((pageNumber: number, behavior: ScrollBehavior = 'smooth') => {
    const scrollTop = getScrollTopForPage(pageNumber);
    const container = document.querySelector('[data-pdf-container]') as HTMLElement;
    
    if (container) {
      container.scrollTo({
        top: scrollTop,
        behavior,
      });
    }
  }, [getScrollTopForPage]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const now = Date.now();
    const stats = {
      totalEntries: pageCache.size,
      loadingEntries: 0,
      errorEntries: 0,
      expiredEntries: 0,
      memoryUsage: pageCache.size * 1024, // Rough estimate
    };
    
    for (const entry of pageCache.values()) {
      if (entry.isLoading) stats.loadingEntries++;
      if (entry.error) stats.errorEntries++;
      if (now - entry.lastAccessed > config.cacheTimeout) stats.expiredEntries++;
    }
    
    return stats;
  }, [pageCache, config.cacheTimeout]);

  return {
    // Page information
    virtualizedPages: getVirtualizedPages(),
    visiblePages: Array.from(visiblePages),
    totalHeight,
    
    // Cache management
    pageCache,
    registerPageElement,
    setPageLoading,
    setPageError,
    cleanupCache,
    getCacheStats,
    
    // Scroll management
    scrollTop,
    handleScroll,
    scrollToPage,
    getPageFromScrollTop,
    getScrollTopForPage,
    
    // Configuration
    config,
  };
};