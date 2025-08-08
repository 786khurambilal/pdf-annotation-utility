import { AnnotationManager, AnnotationNotFoundError, InvalidAnnotationError } from './AnnotationManager';
import { LocalStorageService } from './LocalStorageService';
import { TextSelection, AreaCoordinates, RectangleCoordinates } from '../types/annotation.types';

describe('AnnotationManager', () => {
  let manager: AnnotationManager;
  let mockStorageService: jest.Mocked<LocalStorageService>;
  
  const testUserId = 'test-user-123';
  const testDocumentId = 'test-doc-456';

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock storage service
    mockStorageService = {
      loadAnnotations: jest.fn(),
      saveAnnotations: jest.fn(),
      deleteAnnotations: jest.fn(),
      hasAnnotations: jest.fn(),
      getUserDocuments: jest.fn()
    } as any;

    // Reset singleton and create new instance with mock
    AnnotationManager.resetInstance();
    manager = AnnotationManager.getInstance(mockStorageService);
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AnnotationManager.getInstance();
      const instance2 = AnnotationManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getAnnotations', () => {
    it('should load annotations from storage service', () => {
      const mockAnnotations = {
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      };
      
      mockStorageService.loadAnnotations.mockReturnValue(mockAnnotations);
      
      const result = manager.getAnnotations(testUserId, testDocumentId);
      
      expect(mockStorageService.loadAnnotations).toHaveBeenCalledWith(testUserId, testDocumentId);
      expect(result).toBe(mockAnnotations);
    });

    it('should throw error for invalid parameters', () => {
      expect(() => manager.getAnnotations('', testDocumentId))
        .toThrow('User ID and document ID are required');
      expect(() => manager.getAnnotations(testUserId, ''))
        .toThrow('User ID and document ID are required');
    });
  });

  describe('Highlight Operations', () => {
    const mockSelection: TextSelection = {
      text: 'Selected text',
      pageNumber: 1,
      startOffset: 0,
      endOffset: 13,
      coordinates: { x: 10, y: 20, width: 100, height: 20 }
    };

    beforeEach(() => {
      mockStorageService.loadAnnotations.mockReturnValue({
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      });
    });

    describe('createHighlight', () => {
      it('should create a new highlight', () => {
        const highlight = manager.createHighlight(testUserId, testDocumentId, mockSelection);
        
        expect(highlight.userId).toBe(testUserId);
        expect(highlight.documentId).toBe(testDocumentId);
        expect(highlight.selectedText).toBe('Selected text');
        expect(highlight.color).toBe('#ffff00'); // default color
        expect(mockStorageService.saveAnnotations).toHaveBeenCalled();
      });

      it('should create highlight with custom color', () => {
        const customColor = '#ff0000';
        const highlight = manager.createHighlight(testUserId, testDocumentId, mockSelection, customColor);
        
        expect(highlight.color).toBe(customColor);
      });

      it('should throw error for invalid parameters', () => {
        expect(() => manager.createHighlight('', testDocumentId, mockSelection))
          .toThrow('User ID and document ID are required');
        
        const invalidSelection = { ...mockSelection, text: '' };
        expect(() => manager.createHighlight(testUserId, testDocumentId, invalidSelection))
          .toThrow(InvalidAnnotationError);
        
        expect(() => manager.createHighlight(testUserId, testDocumentId, mockSelection, 'invalid-color'))
          .toThrow(InvalidAnnotationError);
      });
    });

    describe('updateHighlight', () => {
      it('should update an existing highlight', () => {
        const existingHighlight = {
          id: 'highlight-1',
          userId: testUserId,
          documentId: testDocumentId,
          pageNumber: 1,
          startOffset: 0,
          endOffset: 13,
          selectedText: 'Original text',
          color: '#ffff00',
          coordinates: { x: 10, y: 20, width: 100, height: 20 },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockStorageService.loadAnnotations.mockReturnValue({
          highlights: [existingHighlight],
          bookmarks: [],
          comments: [],
          callToActions: []
        });

        const updates = { color: '#ff0000' };
        const updatedHighlight = manager.updateHighlight(testUserId, testDocumentId, 'highlight-1', updates);
        
        expect(updatedHighlight.color).toBe('#ff0000');
        expect(updatedHighlight.selectedText).toBe('Original text'); // unchanged
        expect(mockStorageService.saveAnnotations).toHaveBeenCalled();
      });

      it('should throw error when highlight not found', () => {
        expect(() => manager.updateHighlight(testUserId, testDocumentId, 'nonexistent', {}))
          .toThrow(AnnotationNotFoundError);
      });
    });

    describe('deleteHighlight', () => {
      it('should delete an existing highlight', () => {
        const existingHighlight = {
          id: 'highlight-1',
          userId: testUserId,
          documentId: testDocumentId,
          pageNumber: 1,
          startOffset: 0,
          endOffset: 13,
          selectedText: 'Text to delete',
          color: '#ffff00',
          coordinates: { x: 10, y: 20, width: 100, height: 20 },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockStorageService.loadAnnotations.mockReturnValue({
          highlights: [existingHighlight],
          bookmarks: [],
          comments: [],
          callToActions: []
        });

        manager.deleteHighlight(testUserId, testDocumentId, 'highlight-1');
        
        expect(mockStorageService.saveAnnotations).toHaveBeenCalledWith(
          testUserId,
          testDocumentId,
          expect.objectContaining({
            highlights: []
          })
        );
      });

      it('should throw error when highlight not found', () => {
        expect(() => manager.deleteHighlight(testUserId, testDocumentId, 'nonexistent'))
          .toThrow(AnnotationNotFoundError);
      });
    });

    describe('getHighlightsByPage', () => {
      it('should return highlights for specific page', () => {
        const highlight1 = {
          id: 'h1', userId: testUserId, documentId: testDocumentId, pageNumber: 1,
          startOffset: 0, endOffset: 10, selectedText: 'text1', color: '#ffff00',
          coordinates: { x: 10, y: 20, width: 100, height: 20 },
          createdAt: new Date(), updatedAt: new Date()
        };
        const highlight2 = {
          id: 'h2', userId: testUserId, documentId: testDocumentId, pageNumber: 2,
          startOffset: 0, endOffset: 10, selectedText: 'text2', color: '#ffff00',
          coordinates: { x: 10, y: 20, width: 100, height: 20 },
          createdAt: new Date(), updatedAt: new Date()
        };

        mockStorageService.loadAnnotations.mockReturnValue({
          highlights: [highlight1, highlight2],
          bookmarks: [],
          comments: [],
          callToActions: []
        });

        const page1Highlights = manager.getHighlightsByPage(testUserId, testDocumentId, 1);
        expect(page1Highlights).toHaveLength(1);
        expect(page1Highlights[0].id).toBe('h1');
      });
    });
  });

  describe('Bookmark Operations', () => {
    beforeEach(() => {
      mockStorageService.loadAnnotations.mockReturnValue({
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      });
    });

    describe('createBookmark', () => {
      it('should create a new bookmark', () => {
        const bookmark = manager.createBookmark(testUserId, testDocumentId, 1, 'Test Bookmark', 'Description');
        
        expect(bookmark.userId).toBe(testUserId);
        expect(bookmark.documentId).toBe(testDocumentId);
        expect(bookmark.pageNumber).toBe(1);
        expect(bookmark.title).toBe('Test Bookmark');
        expect(bookmark.description).toBe('Description');
        expect(mockStorageService.saveAnnotations).toHaveBeenCalled();
      });

      it('should create bookmark without description', () => {
        const bookmark = manager.createBookmark(testUserId, testDocumentId, 1, 'Test Bookmark');
        
        expect(bookmark.description).toBeUndefined();
      });

      it('should throw error for invalid parameters', () => {
        expect(() => manager.createBookmark(testUserId, testDocumentId, 0, 'Title'))
          .toThrow(InvalidAnnotationError);
        expect(() => manager.createBookmark(testUserId, testDocumentId, 1, ''))
          .toThrow(InvalidAnnotationError);
      });
    });

    describe('getBookmarksSorted', () => {
      it('should return bookmarks sorted by page number', () => {
        const bookmark1 = {
          id: 'b1', userId: testUserId, documentId: testDocumentId, pageNumber: 3,
          title: 'Bookmark 3', createdAt: new Date(), updatedAt: new Date()
        };
        const bookmark2 = {
          id: 'b2', userId: testUserId, documentId: testDocumentId, pageNumber: 1,
          title: 'Bookmark 1', createdAt: new Date(), updatedAt: new Date()
        };

        mockStorageService.loadAnnotations.mockReturnValue({
          highlights: [],
          bookmarks: [bookmark1, bookmark2],
          comments: [],
          callToActions: []
        });

        const sortedBookmarks = manager.getBookmarksSorted(testUserId, testDocumentId);
        expect(sortedBookmarks).toHaveLength(2);
        expect(sortedBookmarks[0].pageNumber).toBe(1);
        expect(sortedBookmarks[1].pageNumber).toBe(3);
      });
    });
  });

  describe('Comment Operations', () => {
    const mockCoordinates: AreaCoordinates = { x: 50, y: 60 };

    beforeEach(() => {
      mockStorageService.loadAnnotations.mockReturnValue({
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      });
    });

    describe('createComment', () => {
      it('should create a new comment', () => {
        const comment = manager.createComment(testUserId, testDocumentId, 1, 'Test comment', mockCoordinates);
        
        expect(comment.userId).toBe(testUserId);
        expect(comment.documentId).toBe(testDocumentId);
        expect(comment.pageNumber).toBe(1);
        expect(comment.content).toBe('Test comment');
        expect(comment.coordinates).toEqual(mockCoordinates);
        expect(mockStorageService.saveAnnotations).toHaveBeenCalled();
      });

      it('should throw error for invalid parameters', () => {
        expect(() => manager.createComment(testUserId, testDocumentId, 0, 'Content', mockCoordinates))
          .toThrow(InvalidAnnotationError);
        expect(() => manager.createComment(testUserId, testDocumentId, 1, '', mockCoordinates))
          .toThrow(InvalidAnnotationError);
        expect(() => manager.createComment(testUserId, testDocumentId, 1, 'Content', { x: -1, y: 0 }))
          .toThrow(InvalidAnnotationError);
      });
    });
  });

  describe('Call-to-Action Operations', () => {
    const mockCoordinates: RectangleCoordinates = { x: 10, y: 20, width: 100, height: 30 };

    beforeEach(() => {
      mockStorageService.loadAnnotations.mockReturnValue({
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      });
    });

    describe('createCallToAction', () => {
      it('should create a new call-to-action', () => {
        const cta = manager.createCallToAction(
          testUserId, 
          testDocumentId, 
          1, 
          'https://example.com', 
          'Test CTA', 
          mockCoordinates
        );
        
        expect(cta.userId).toBe(testUserId);
        expect(cta.documentId).toBe(testDocumentId);
        expect(cta.pageNumber).toBe(1);
        expect(cta.url).toBe('https://example.com');
        expect(cta.label).toBe('Test CTA');
        expect(cta.coordinates).toEqual(mockCoordinates);
        expect(mockStorageService.saveAnnotations).toHaveBeenCalled();
      });

      it('should throw error for invalid URL', () => {
        expect(() => manager.createCallToAction(testUserId, testDocumentId, 1, 'invalid-url', 'Label', mockCoordinates))
          .toThrow(InvalidAnnotationError);
      });

      it('should throw error for invalid coordinates', () => {
        const invalidCoords = { x: 10, y: 20, width: 0, height: 30 };
        expect(() => manager.createCallToAction(testUserId, testDocumentId, 1, 'https://example.com', 'Label', invalidCoords))
          .toThrow(InvalidAnnotationError);
      });
    });
  });

  describe('Utility Operations', () => {
    beforeEach(() => {
      const mockAnnotations = {
        highlights: [
          {
            id: 'h1', userId: testUserId, documentId: testDocumentId, pageNumber: 1,
            startOffset: 0, endOffset: 10, selectedText: 'text', color: '#ffff00',
            coordinates: { x: 10, y: 20, width: 100, height: 20 },
            createdAt: new Date(), updatedAt: new Date()
          }
        ],
        bookmarks: [
          {
            id: 'b1', userId: testUserId, documentId: testDocumentId, pageNumber: 1,
            title: 'Bookmark', createdAt: new Date(), updatedAt: new Date()
          }
        ],
        comments: [
          {
            id: 'c1', userId: testUserId, documentId: testDocumentId, pageNumber: 1,
            content: 'Comment', coordinates: { x: 50, y: 60 },
            createdAt: new Date(), updatedAt: new Date()
          }
        ],
        callToActions: [
          {
            id: 'cta1', userId: testUserId, documentId: testDocumentId, pageNumber: 1,
            url: 'https://example.com', label: 'CTA',
            coordinates: { x: 10, y: 20, width: 100, height: 30 },
            createdAt: new Date(), updatedAt: new Date()
          }
        ]
      };
      
      mockStorageService.loadAnnotations.mockReturnValue(mockAnnotations);
    });

    describe('getAnnotationsByPage', () => {
      it('should return all annotations for a specific page', () => {
        const pageAnnotations = manager.getAnnotationsByPage(testUserId, testDocumentId, 1);
        
        expect(pageAnnotations.highlights).toHaveLength(1);
        expect(pageAnnotations.comments).toHaveLength(1);
        expect(pageAnnotations.callToActions).toHaveLength(1);
      });
    });

    describe('getAnnotationCounts', () => {
      it('should return annotation counts', () => {
        const counts = manager.getAnnotationCounts(testUserId, testDocumentId);
        
        expect(counts.highlights).toBe(1);
        expect(counts.bookmarks).toBe(1);
        expect(counts.comments).toBe(1);
        expect(counts.callToActions).toBe(1);
        expect(counts.total).toBe(4);
      });
    });

    describe('deleteAllAnnotations', () => {
      it('should delete all annotations for a document', () => {
        manager.deleteAllAnnotations(testUserId, testDocumentId);
        
        expect(mockStorageService.deleteAnnotations).toHaveBeenCalledWith(testUserId, testDocumentId);
      });
    });

    describe('hasAnnotations', () => {
      it('should check if document has annotations', () => {
        mockStorageService.hasAnnotations.mockReturnValue(true);
        
        const result = manager.hasAnnotations(testUserId, testDocumentId);
        
        expect(result).toBe(true);
        expect(mockStorageService.hasAnnotations).toHaveBeenCalledWith(testUserId, testDocumentId);
      });
    });

    describe('getUserDocuments', () => {
      it('should get all documents for a user', () => {
        const mockDocuments = ['doc1', 'doc2', 'doc3'];
        mockStorageService.getUserDocuments.mockReturnValue(mockDocuments);
        
        const result = manager.getUserDocuments(testUserId);
        
        expect(result).toEqual(mockDocuments);
        expect(mockStorageService.getUserDocuments).toHaveBeenCalledWith(testUserId);
      });

      it('should throw error for invalid user ID', () => {
        expect(() => manager.getUserDocuments(''))
          .toThrow('User ID is required');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage service errors', () => {
      mockStorageService.loadAnnotations.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => manager.getAnnotations(testUserId, testDocumentId))
        .toThrow('Storage error');
    });

    it('should validate all required parameters', () => {
      const mockSelection: TextSelection = {
        text: 'Selected text',
        pageNumber: 1,
        startOffset: 0,
        endOffset: 13,
        coordinates: { x: 10, y: 20, width: 100, height: 20 }
      };

      // Test all methods with empty parameters
      expect(() => manager.createHighlight('', testDocumentId, mockSelection))
        .toThrow('User ID and document ID are required');
      expect(() => manager.createBookmark('', testDocumentId, 1, 'Title'))
        .toThrow('User ID and document ID are required');
      expect(() => manager.createComment('', testDocumentId, 1, 'Content', { x: 0, y: 0 }))
        .toThrow('User ID and document ID are required');
      expect(() => manager.createCallToAction('', testDocumentId, 1, 'https://example.com', 'Label', { x: 0, y: 0, width: 10, height: 10 }))
        .toThrow('User ID and document ID are required');
    });
  });
});