import { AnnotationRenderer, coordinateUtils } from './annotationRenderer';
import { Highlight, Comment, CallToAction } from '../types/annotation.types';

// Mock data
const mockHighlight: Highlight = {
  id: 'highlight-1',
  userId: 'user-1',
  documentId: 'doc-1',
  pageNumber: 1,
  startOffset: 0,
  endOffset: 10,
  selectedText: 'Sample text',
  color: '#ffff00',
  coordinates: { x: 100, y: 200, width: 150, height: 20 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockComment: Comment = {
  id: 'comment-1',
  userId: 'user-1',
  documentId: 'doc-1',
  pageNumber: 1,
  content: 'This is a comment',
  coordinates: { x: 300, y: 400 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCTA: CallToAction = {
  id: 'cta-1',
  userId: 'user-1',
  documentId: 'doc-1',
  pageNumber: 1,
  url: 'https://example.com',
  label: 'Click here',
  coordinates: { x: 500, y: 600, width: 100, height: 30 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTransform = {
  scale: 1.5,
  offsetX: 10,
  offsetY: 20,
  pageWidth: 800,
  pageHeight: 1000,
};

describe('AnnotationRenderer', () => {
  let renderer: AnnotationRenderer;

  beforeEach(() => {
    renderer = AnnotationRenderer.getInstance();
    renderer.clearRenderCache();
    renderer.clearTransformCache();
  });

  afterEach(() => {
    renderer.cleanup();
  });

  describe('coordinate transformation', () => {
    it('should transform coordinates correctly', () => {
      const coordinates = { x: 100, y: 200, width: 150, height: 20 };
      const result = renderer.transformCoordinates(coordinates, mockTransform);

      expect(result).toEqual({
        x: 100 * 1.5 + 10, // 160
        y: 200 * 1.5 + 20, // 320
        width: 150 * 1.5,  // 225
        height: 20 * 1.5,  // 30
      });
    });

    it('should handle area coordinates without width/height', () => {
      const coordinates = { x: 100, y: 200 };
      const result = renderer.transformCoordinates(coordinates, mockTransform);

      expect(result).toEqual({
        x: 160,
        y: 320,
      });
    });

    it('should inverse transform coordinates correctly', () => {
      const screenCoordinates = { x: 160, y: 320, width: 225, height: 30 };
      const result = renderer.inverseTransformCoordinates(screenCoordinates, mockTransform);

      expect(result).toEqual({
        x: 100,
        y: 200,
        width: 150,
        height: 20,
      });
    });
  });

  describe('cache management', () => {
    it('should cache and retrieve transforms', () => {
      const pageKey = 'page-1';
      renderer.cacheTransform(pageKey, mockTransform);

      const cached = renderer.getCachedTransform(pageKey);
      expect(cached).toEqual(mockTransform);
    });

    it('should return null for non-existent cache entries', () => {
      const cached = renderer.getCachedTransform('non-existent');
      expect(cached).toBeNull();
    });

    it('should clear transform cache', () => {
      renderer.cacheTransform('page-1', mockTransform);
      renderer.clearTransformCache();

      const cached = renderer.getCachedTransform('page-1');
      expect(cached).toBeNull();
    });
  });

  describe('annotation rendering', () => {
    it('should render annotation batch correctly', () => {
      const batch = renderer.renderAnnotationBatch(
        1,
        [mockHighlight],
        [mockComment],
        [mockCTA],
        mockTransform
      );

      expect(batch.highlights).toHaveLength(1);
      expect(batch.comments).toHaveLength(1);
      expect(batch.ctas).toHaveLength(1);
      expect(batch.totalCount).toBe(3);

      // Check highlight rendering
      const renderedHighlight = batch.highlights[0];
      expect(renderedHighlight.id).toBe(mockHighlight.id);
      expect(renderedHighlight.type).toBe('highlight');
      expect(renderedHighlight.coordinates.x).toBe(160); // 100 * 1.5 + 10
      expect(renderedHighlight.zIndex).toBeGreaterThanOrEqual(1);

      // Check comment rendering
      const renderedComment = batch.comments[0];
      expect(renderedComment.id).toBe(mockComment.id);
      expect(renderedComment.type).toBe('comment');
      expect(renderedComment.coordinates.x).toBe(460); // 300 * 1.5 + 10
      expect(renderedComment.zIndex).toBeGreaterThanOrEqual(100);

      // Check CTA rendering
      const renderedCTA = batch.ctas[0];
      expect(renderedCTA.id).toBe(mockCTA.id);
      expect(renderedCTA.type).toBe('cta');
      expect(renderedCTA.coordinates.x).toBe(760); // 500 * 1.5 + 10
      expect(renderedCTA.zIndex).toBeGreaterThanOrEqual(200);
    });

    it('should cache rendered batches', () => {
      // First render
      const batch1 = renderer.renderAnnotationBatch(
        1,
        [mockHighlight],
        [],
        [],
        mockTransform
      );

      // Second render with same parameters should return cached result
      const batch2 = renderer.renderAnnotationBatch(
        1,
        [mockHighlight],
        [],
        [],
        mockTransform
      );

      expect(batch1).toBe(batch2); // Should be the same object reference
    });

    it('should clear render cache for specific page', () => {
      renderer.renderAnnotationBatch(1, [mockHighlight], [], [], mockTransform);
      renderer.renderAnnotationBatch(2, [mockHighlight], [], [], mockTransform);

      renderer.clearRenderCache(1);

      const stats = renderer.getCacheStats();
      expect(stats.renderCacheSize).toBe(1); // Only page 2 should remain
    });
  });

  describe('annotation optimization', () => {
    it('should remove duplicate annotations', () => {
      const duplicateAnnotations = [
        {
          id: 'same-id',
          type: 'highlight' as const,
          coordinates: { x: 100, y: 200 },
          zIndex: 1,
          data: mockHighlight,
        },
        {
          id: 'same-id',
          type: 'highlight' as const,
          coordinates: { x: 150, y: 250 },
          zIndex: 2,
          data: mockHighlight,
        },
        {
          id: 'different-id',
          type: 'comment' as const,
          coordinates: { x: 300, y: 400 },
          zIndex: 100,
          data: mockComment,
        },
      ];

      const optimized = renderer.optimizeAnnotations(duplicateAnnotations);
      expect(optimized).toHaveLength(2);
      expect(optimized.find(a => a.id === 'same-id')).toBeDefined();
      expect(optimized.find(a => a.id === 'different-id')).toBeDefined();
    });

    it('should sort annotations by z-index', () => {
      const unsortedAnnotations = [
        {
          id: 'cta-1',
          type: 'cta' as const,
          coordinates: { x: 500, y: 600 },
          zIndex: 200,
          data: mockCTA,
        },
        {
          id: 'highlight-1',
          type: 'highlight' as const,
          coordinates: { x: 100, y: 200 },
          zIndex: 1,
          data: mockHighlight,
        },
        {
          id: 'comment-1',
          type: 'comment' as const,
          coordinates: { x: 300, y: 400 },
          zIndex: 100,
          data: mockComment,
        },
      ];

      const optimized = renderer.optimizeAnnotations(unsortedAnnotations);
      expect(optimized[0].zIndex).toBe(1);
      expect(optimized[1].zIndex).toBe(100);
      expect(optimized[2].zIndex).toBe(200);
    });
  });

  describe('viewport filtering', () => {
    it('should filter annotations within viewport', () => {
      const annotations = [
        {
          id: 'visible-1',
          type: 'highlight' as const,
          coordinates: { x: 100, y: 200, width: 50, height: 20 },
          zIndex: 1,
          data: mockHighlight,
        },
        {
          id: 'visible-2',
          type: 'comment' as const,
          coordinates: { x: 300, y: 400 },
          zIndex: 100,
          data: mockComment,
        },
        {
          id: 'outside',
          type: 'cta' as const,
          coordinates: { x: 1000, y: 1000, width: 100, height: 30 },
          zIndex: 200,
          data: mockCTA,
        },
      ];

      const viewport = { x: 0, y: 0, width: 800, height: 600 };
      const visible = renderer.filterVisibleAnnotations(annotations, viewport);

      expect(visible).toHaveLength(2);
      expect(visible.find(a => a.id === 'visible-1')).toBeDefined();
      expect(visible.find(a => a.id === 'visible-2')).toBeDefined();
      expect(visible.find(a => a.id === 'outside')).toBeUndefined();
    });
  });

  describe('debounced updates', () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce annotation updates', () => {
      const callback = jest.fn();

      // Schedule multiple updates
      renderer.scheduleAnnotationUpdate(1, callback, 100);
      renderer.scheduleAnnotationUpdate(1, callback, 100);
      renderer.scheduleAnnotationUpdate(1, callback, 100);

      // Callback should not be called immediately
      expect(callback).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(100);

      // Callback should be called once
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache statistics', () => {
    it('should provide accurate cache statistics', () => {
      renderer.cacheTransform('page-1', mockTransform);
      renderer.renderAnnotationBatch(1, [mockHighlight], [], [], mockTransform);

      const stats = renderer.getCacheStats();
      expect(stats.transformCacheSize).toBe(1);
      expect(stats.renderCacheSize).toBe(1);
      expect(stats.pendingUpdates).toBe(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });
});

describe('coordinateUtils', () => {
  const mockAnnotations = [
    {
      id: 'annotation-1',
      type: 'highlight' as const,
      coordinates: { x: 100, y: 200, width: 150, height: 20 },
      zIndex: 1,
      data: mockHighlight,
    },
    {
      id: 'annotation-2',
      type: 'comment' as const,
      coordinates: { x: 300, y: 400, width: 20, height: 20 },
      zIndex: 100,
      data: mockComment,
    },
  ];

  describe('bounding box calculation', () => {
    it('should calculate correct bounding box', () => {
      const bbox = coordinateUtils.calculateBoundingBox(mockAnnotations);

      expect(bbox).toEqual({
        x: 100,
        y: 200,
        width: 220, // (300 + 20) - 100
        height: 220, // (400 + 20) - 200
      });
    });

    it('should return null for empty annotations', () => {
      const bbox = coordinateUtils.calculateBoundingBox([]);
      expect(bbox).toBeNull();
    });
  });

  describe('overlap detection', () => {
    it('should detect overlapping annotations', () => {
      const annotation1 = {
        id: 'a1',
        type: 'highlight' as const,
        coordinates: { x: 100, y: 200, width: 50, height: 20 },
        zIndex: 1,
        data: mockHighlight,
      };

      const annotation2 = {
        id: 'a2',
        type: 'comment' as const,
        coordinates: { x: 120, y: 210, width: 20, height: 20 },
        zIndex: 100,
        data: mockComment,
      };

      const overlaps = coordinateUtils.annotationsOverlap(annotation1, annotation2);
      expect(overlaps).toBe(true);
    });

    it('should detect non-overlapping annotations', () => {
      const annotation1 = {
        id: 'a1',
        type: 'highlight' as const,
        coordinates: { x: 100, y: 200, width: 50, height: 20 },
        zIndex: 1,
        data: mockHighlight,
      };

      const annotation2 = {
        id: 'a2',
        type: 'comment' as const,
        coordinates: { x: 300, y: 400, width: 20, height: 20 },
        zIndex: 100,
        data: mockComment,
      };

      const overlaps = coordinateUtils.annotationsOverlap(annotation1, annotation2);
      expect(overlaps).toBe(false);
    });
  });

  describe('grouping overlapping annotations', () => {
    it('should group overlapping annotations correctly', () => {
      const annotations = [
        {
          id: 'a1',
          type: 'highlight' as const,
          coordinates: { x: 100, y: 200, width: 50, height: 20 },
          zIndex: 1,
          data: mockHighlight,
        },
        {
          id: 'a2',
          type: 'comment' as const,
          coordinates: { x: 120, y: 210, width: 20, height: 20 }, // Overlaps with a1
          zIndex: 100,
          data: mockComment,
        },
        {
          id: 'a3',
          type: 'cta' as const,
          coordinates: { x: 300, y: 400, width: 100, height: 30 }, // Separate
          zIndex: 200,
          data: mockCTA,
        },
      ];

      const groups = coordinateUtils.groupOverlappingAnnotations(annotations);
      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveLength(2); // a1 and a2 overlap
      expect(groups[1]).toHaveLength(1); // a3 is separate
    });
  });
});