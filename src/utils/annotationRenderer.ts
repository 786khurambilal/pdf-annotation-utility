import { Highlight, Comment, CallToAction, AreaCoordinates, RectangleCoordinates } from '../types/annotation.types';

export interface RenderedAnnotation {
  id: string;
  type: 'highlight' | 'comment' | 'cta';
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  zIndex: number;
  data: Highlight | Comment | CallToAction;
}

export interface CoordinateTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  pageWidth: number;
  pageHeight: number;
}

export interface RenderBatch {
  highlights: RenderedAnnotation[];
  comments: RenderedAnnotation[];
  ctas: RenderedAnnotation[];
  totalCount: number;
}

/**
 * Optimized annotation renderer with batching and coordinate transformation
 */
export class AnnotationRenderer {
  private static instance: AnnotationRenderer;
  private transformCache = new Map<string, CoordinateTransform>();
  private renderCache = new Map<string, RenderBatch>();
  private batchTimeout: NodeJS.Timeout | null = null;
  private pendingUpdates = new Set<string>();

  static getInstance(): AnnotationRenderer {
    if (!AnnotationRenderer.instance) {
      AnnotationRenderer.instance = new AnnotationRenderer();
    }
    return AnnotationRenderer.instance;
  }

  /**
   * Transform coordinates from PDF space to screen space
   */
  transformCoordinates(
    coordinates: AreaCoordinates | RectangleCoordinates,
    transform: CoordinateTransform
  ): { x: number; y: number; width?: number; height?: number } {
    const { scale, offsetX, offsetY } = transform;
    
    const result = {
      x: coordinates.x * scale + offsetX,
      y: coordinates.y * scale + offsetY,
    };

    // Add width and height if available (for rectangles)
    if ('width' in coordinates && 'height' in coordinates) {
      return {
        ...result,
        width: coordinates.width * scale,
        height: coordinates.height * scale,
      };
    }

    return result;
  }

  /**
   * Inverse transform coordinates from screen space to PDF space
   */
  inverseTransformCoordinates(
    screenCoordinates: { x: number; y: number; width?: number; height?: number },
    transform: CoordinateTransform
  ): AreaCoordinates | RectangleCoordinates {
    const { scale, offsetX, offsetY } = transform;
    
    const result = {
      x: (screenCoordinates.x - offsetX) / scale,
      y: (screenCoordinates.y - offsetY) / scale,
    };

    // Add width and height if available
    if (screenCoordinates.width !== undefined && screenCoordinates.height !== undefined) {
      return {
        ...result,
        width: screenCoordinates.width / scale,
        height: screenCoordinates.height / scale,
      } as RectangleCoordinates;
    }

    return result as AreaCoordinates;
  }

  /**
   * Cache coordinate transform for a page
   */
  cacheTransform(pageKey: string, transform: CoordinateTransform): void {
    this.transformCache.set(pageKey, transform);
  }

  /**
   * Get cached transform for a page
   */
  getCachedTransform(pageKey: string): CoordinateTransform | null {
    return this.transformCache.get(pageKey) || null;
  }

  /**
   * Clear transform cache
   */
  clearTransformCache(): void {
    this.transformCache.clear();
  }

  /**
   * Render highlights with optimized coordinate transformation
   */
  private renderHighlights(
    highlights: Highlight[],
    transform: CoordinateTransform
  ): RenderedAnnotation[] {
    return highlights.map((highlight, index) => ({
      id: highlight.id,
      type: 'highlight' as const,
      coordinates: this.transformCoordinates(highlight.coordinates, transform),
      zIndex: 1 + index, // Highlights have lowest z-index
      data: highlight,
    }));
  }

  /**
   * Render comments with optimized coordinate transformation
   */
  private renderComments(
    comments: Comment[],
    transform: CoordinateTransform
  ): RenderedAnnotation[] {
    return comments.map((comment, index) => ({
      id: comment.id,
      type: 'comment' as const,
      coordinates: this.transformCoordinates(comment.coordinates, transform),
      zIndex: 100 + index, // Comments have medium z-index
      data: comment,
    }));
  }

  /**
   * Render call-to-actions with optimized coordinate transformation
   */
  private renderCTAs(
    ctas: CallToAction[],
    transform: CoordinateTransform
  ): RenderedAnnotation[] {
    return ctas.map((cta, index) => ({
      id: cta.id,
      type: 'cta' as const,
      coordinates: this.transformCoordinates(cta.coordinates, transform),
      zIndex: 200 + index, // CTAs have highest z-index
      data: cta,
    }));
  }

  /**
   * Batch render all annotations for a page
   */
  renderAnnotationBatch(
    pageNumber: number,
    highlights: Highlight[],
    comments: Comment[],
    ctas: CallToAction[],
    transform: CoordinateTransform
  ): RenderBatch {
    const pageKey = `page-${pageNumber}-${transform.scale}`;
    
    // Check cache first
    const cached = this.renderCache.get(pageKey);
    if (cached) {
      return cached;
    }

    // Render all annotation types
    const renderedHighlights = this.renderHighlights(highlights, transform);
    const renderedComments = this.renderComments(comments, transform);
    const renderedCTAs = this.renderCTAs(ctas, transform);

    const batch: RenderBatch = {
      highlights: renderedHighlights,
      comments: renderedComments,
      ctas: renderedCTAs,
      totalCount: renderedHighlights.length + renderedComments.length + renderedCTAs.length,
    };

    // Cache the result
    this.renderCache.set(pageKey, batch);

    return batch;
  }

  /**
   * Debounced batch update for annotations
   */
  scheduleAnnotationUpdate(
    pageNumber: number,
    callback: () => void,
    delay: number = 100
  ): void {
    const updateKey = `page-${pageNumber}`;
    this.pendingUpdates.add(updateKey);

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Schedule new update
    this.batchTimeout = setTimeout(() => {
      // Execute all pending updates
      this.pendingUpdates.forEach(() => {
        callback();
      });
      
      this.pendingUpdates.clear();
      this.batchTimeout = null;
    }, delay);
  }

  /**
   * Clear render cache for a specific page or all pages
   */
  clearRenderCache(pageNumber?: number): void {
    if (pageNumber !== undefined) {
      // Clear cache for specific page
      const keysToDelete = Array.from(this.renderCache.keys()).filter(key =>
        key.startsWith(`page-${pageNumber}-`)
      );
      keysToDelete.forEach(key => this.renderCache.delete(key));
    } else {
      // Clear all cache
      this.renderCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    transformCacheSize: number;
    renderCacheSize: number;
    pendingUpdates: number;
    memoryUsage: number;
  } {
    return {
      transformCacheSize: this.transformCache.size,
      renderCacheSize: this.renderCache.size,
      pendingUpdates: this.pendingUpdates.size,
      memoryUsage: (this.transformCache.size + this.renderCache.size) * 1024, // Rough estimate
    };
  }

  /**
   * Optimize annotations by removing duplicates and sorting by z-index
   */
  optimizeAnnotations(annotations: RenderedAnnotation[]): RenderedAnnotation[] {
    // Remove duplicates based on ID
    const uniqueAnnotations = annotations.filter((annotation, index, array) =>
      array.findIndex(a => a.id === annotation.id) === index
    );

    // Sort by z-index for proper rendering order
    return uniqueAnnotations.sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Check if annotations are within viewport bounds
   */
  filterVisibleAnnotations(
    annotations: RenderedAnnotation[],
    viewport: { x: number; y: number; width: number; height: number }
  ): RenderedAnnotation[] {
    return annotations.filter(annotation => {
      const { x, y, width = 20, height = 20 } = annotation.coordinates;
      
      // Check if annotation intersects with viewport
      return (
        x < viewport.x + viewport.width &&
        x + width > viewport.x &&
        y < viewport.y + viewport.height &&
        y + height > viewport.y
      );
    });
  }

  /**
   * Batch process multiple pages efficiently
   */
  renderMultiplePages(
    pages: Array<{
      pageNumber: number;
      highlights: Highlight[];
      comments: Comment[];
      ctas: CallToAction[];
      transform: CoordinateTransform;
    }>
  ): Map<number, RenderBatch> {
    const results = new Map<number, RenderBatch>();

    // Process pages in batches to avoid blocking the main thread
    pages.forEach(({ pageNumber, highlights, comments, ctas, transform }) => {
      const batch = this.renderAnnotationBatch(
        pageNumber,
        highlights,
        comments,
        ctas,
        transform
      );
      results.set(pageNumber, batch);
    });

    return results;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.pendingUpdates.clear();
    this.clearRenderCache();
    this.clearTransformCache();
  }
}

/**
 * Utility functions for coordinate calculations
 */
export const coordinateUtils = {
  /**
   * Calculate bounding box for multiple annotations
   */
  calculateBoundingBox(annotations: RenderedAnnotation[]): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    if (annotations.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    annotations.forEach(annotation => {
      const { x, y, width = 20, height = 20 } = annotation.coordinates;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  },

  /**
   * Check if two annotations overlap
   */
  annotationsOverlap(a: RenderedAnnotation, b: RenderedAnnotation): boolean {
    const aCoords = { ...a.coordinates, width: a.coordinates.width || 20, height: a.coordinates.height || 20 };
    const bCoords = { ...b.coordinates, width: b.coordinates.width || 20, height: b.coordinates.height || 20 };

    return (
      aCoords.x < bCoords.x + bCoords.width &&
      aCoords.x + aCoords.width > bCoords.x &&
      aCoords.y < bCoords.y + bCoords.height &&
      aCoords.y + aCoords.height > bCoords.y
    );
  },

  /**
   * Group overlapping annotations
   */
  groupOverlappingAnnotations(annotations: RenderedAnnotation[]): RenderedAnnotation[][] {
    const groups: RenderedAnnotation[][] = [];
    const processed = new Set<string>();

    annotations.forEach(annotation => {
      if (processed.has(annotation.id)) return;

      const group = [annotation];
      processed.add(annotation.id);

      // Find all overlapping annotations
      annotations.forEach(other => {
        if (processed.has(other.id)) return;
        
        if (group.some(groupAnnotation => coordinateUtils.annotationsOverlap(groupAnnotation, other))) {
          group.push(other);
          processed.add(other.id);
        }
      });

      groups.push(group);
    });

    return groups;
  },
};

// Export singleton instance
export const annotationRenderer = AnnotationRenderer.getInstance();