import { LocalStorageService, StorageQuotaExceededError, StorageSerializationError, StorageValidationError } from './LocalStorageService';
import { UserAnnotations, createHighlight, createBookmark, createComment, createCallToAction } from '../types/annotation.types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      // Simulate quota exceeded error for very large values
      if (value.length > 1000000) {
        const error = new DOMException('QuotaExceededError');
        (error as any).code = 22;
        throw error;
      }
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();

// Replace global localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  const testUserId = 'test-user-123';
  const testDocumentId = 'test-doc-456';

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.clear();
    jest.clearAllMocks();
    
    // Get fresh instance
    service = LocalStorageService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LocalStorageService.getInstance();
      const instance2 = LocalStorageService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('saveAnnotations', () => {
    it('should save valid annotations to localStorage', () => {
      const annotations: UserAnnotations = {
        highlights: [
          createHighlight(
            'h1',
            testUserId,
            testDocumentId,
            1,
            0,
            10,
            'test text',
            '#ffff00',
            { x: 10, y: 20, width: 100, height: 20 }
          )
        ],
        bookmarks: [
          createBookmark('b1', testUserId, testDocumentId, 1, 'Test Bookmark')
        ],
        comments: [
          createComment('c1', testUserId, testDocumentId, 1, 'Test comment', { x: 50, y: 60 })
        ],
        callToActions: [
          createCallToAction(
            'cta1',
            testUserId,
            testDocumentId,
            1,
            'https://example.com',
            'Test CTA',
            { x: 10, y: 20, width: 100, height: 30 }
          )
        ]
      };

      expect(() => service.saveAnnotations(testUserId, testDocumentId, annotations)).not.toThrow();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should throw error for invalid user ID', () => {
      const annotations: UserAnnotations = {
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      expect(() => service.saveAnnotations('', testDocumentId, annotations))
        .toThrow('User ID and document ID are required');
    });

    it('should throw error for invalid document ID', () => {
      const annotations: UserAnnotations = {
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      expect(() => service.saveAnnotations(testUserId, '', annotations))
        .toThrow('User ID and document ID are required');
    });

    it('should throw StorageValidationError for invalid annotations', () => {
      const invalidAnnotations = {
        highlights: [{ invalid: 'data' }],
        bookmarks: [],
        comments: [],
        callToActions: []
      } as any;

      expect(() => service.saveAnnotations(testUserId, testDocumentId, invalidAnnotations))
        .toThrow(StorageValidationError);
    });

    it('should handle localStorage quota exceeded error', () => {
      const largeAnnotations: UserAnnotations = {
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      // Mock setItem to throw quota exceeded error
      localStorageMock.setItem.mockImplementationOnce(() => {
        const error = new Error('QuotaExceededError') as any;
        error.name = 'QuotaExceededError';
        error.code = 22;
        throw error;
      });

      expect(() => service.saveAnnotations(testUserId, testDocumentId, largeAnnotations))
        .toThrow(StorageQuotaExceededError);
    });
  });

  describe('loadAnnotations', () => {
    it('should load existing annotations from localStorage', () => {
      const originalAnnotations: UserAnnotations = {
        highlights: [
          createHighlight(
            'h1',
            testUserId,
            testDocumentId,
            1,
            0,
            10,
            'test text',
            '#ffff00',
            { x: 10, y: 20, width: 100, height: 20 }
          )
        ],
        bookmarks: [
          createBookmark('b1', testUserId, testDocumentId, 1, 'Test Bookmark')
        ],
        comments: [
          createComment('c1', testUserId, testDocumentId, 1, 'Test comment', { x: 50, y: 60 })
        ],
        callToActions: [
          createCallToAction(
            'cta1',
            testUserId,
            testDocumentId,
            1,
            'https://example.com',
            'Test CTA',
            { x: 10, y: 20, width: 100, height: 30 }
          )
        ]
      };

      // Save annotations first
      service.saveAnnotations(testUserId, testDocumentId, originalAnnotations);

      // Load annotations
      const loadedAnnotations = service.loadAnnotations(testUserId, testDocumentId);

      expect(loadedAnnotations.highlights).toHaveLength(1);
      expect(loadedAnnotations.bookmarks).toHaveLength(1);
      expect(loadedAnnotations.comments).toHaveLength(1);
      expect(loadedAnnotations.callToActions).toHaveLength(1);

      expect(loadedAnnotations.highlights[0].id).toBe('h1');
      expect(loadedAnnotations.bookmarks[0].id).toBe('b1');
      expect(loadedAnnotations.comments[0].id).toBe('c1');
      expect(loadedAnnotations.callToActions[0].id).toBe('cta1');
    });

    it('should return empty annotations when none exist', () => {
      const annotations = service.loadAnnotations(testUserId, testDocumentId);

      expect(annotations.highlights).toEqual([]);
      expect(annotations.bookmarks).toEqual([]);
      expect(annotations.comments).toEqual([]);
      expect(annotations.callToActions).toEqual([]);
    });

    it('should throw error for invalid user ID', () => {
      expect(() => service.loadAnnotations('', testDocumentId))
        .toThrow('User ID and document ID are required');
    });

    it('should throw error for invalid document ID', () => {
      expect(() => service.loadAnnotations(testUserId, ''))
        .toThrow('User ID and document ID are required');
    });

    it('should handle corrupted data gracefully', () => {
      // Manually set corrupted data
      const key = `ebook-utility-${testUserId}-${testDocumentId}-annotations`;
      localStorageMock.setItem(key, 'invalid json data');

      expect(() => service.loadAnnotations(testUserId, testDocumentId))
        .toThrow(StorageSerializationError);
    });

    it('should preserve Date objects after serialization/deserialization', () => {
      const highlight = createHighlight(
        'h1',
        testUserId,
        testDocumentId,
        1,
        0,
        10,
        'test text',
        '#ffff00',
        { x: 10, y: 20, width: 100, height: 20 }
      );

      const annotations: UserAnnotations = {
        highlights: [highlight],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      service.saveAnnotations(testUserId, testDocumentId, annotations);
      const loadedAnnotations = service.loadAnnotations(testUserId, testDocumentId);

      expect(loadedAnnotations.highlights[0].createdAt).toBeInstanceOf(Date);
      expect(loadedAnnotations.highlights[0].updatedAt).toBeInstanceOf(Date);
      expect(loadedAnnotations.highlights[0].createdAt.getTime())
        .toBe(highlight.createdAt.getTime());
    });
  });

  describe('deleteAnnotations', () => {
    it('should delete annotations from localStorage', () => {
      const annotations: UserAnnotations = {
        highlights: [
          createHighlight(
            'h1',
            testUserId,
            testDocumentId,
            1,
            0,
            10,
            'test text',
            '#ffff00',
            { x: 10, y: 20, width: 100, height: 20 }
          )
        ],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      // Save annotations first
      service.saveAnnotations(testUserId, testDocumentId, annotations);
      expect(service.hasAnnotations(testUserId, testDocumentId)).toBe(true);

      // Delete annotations
      service.deleteAnnotations(testUserId, testDocumentId);
      expect(service.hasAnnotations(testUserId, testDocumentId)).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should throw error for invalid user ID', () => {
      expect(() => service.deleteAnnotations('', testDocumentId))
        .toThrow('User ID and document ID are required');
    });

    it('should throw error for invalid document ID', () => {
      expect(() => service.deleteAnnotations(testUserId, ''))
        .toThrow('User ID and document ID are required');
    });
  });

  describe('hasAnnotations', () => {
    it('should return true when annotations exist', () => {
      const annotations: UserAnnotations = {
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      service.saveAnnotations(testUserId, testDocumentId, annotations);
      expect(service.hasAnnotations(testUserId, testDocumentId)).toBe(true);
    });

    it('should return false when annotations do not exist', () => {
      expect(service.hasAnnotations(testUserId, testDocumentId)).toBe(false);
    });

    it('should return false for invalid parameters', () => {
      expect(service.hasAnnotations('', testDocumentId)).toBe(false);
      expect(service.hasAnnotations(testUserId, '')).toBe(false);
    });
  });

  describe('getUserDocuments', () => {
    it('should return list of document IDs for a user', () => {
      const doc1 = 'doc1';
      const doc2 = 'doc2';
      const annotations: UserAnnotations = {
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      service.saveAnnotations(testUserId, doc1, annotations);
      service.saveAnnotations(testUserId, doc2, annotations);

      const documents = service.getUserDocuments(testUserId);
      expect(documents).toContain(doc1);
      expect(documents).toContain(doc2);
      expect(documents).toHaveLength(2);
    });

    it('should return empty array for user with no documents', () => {
      const documents = service.getUserDocuments('nonexistent-user');
      expect(documents).toEqual([]);
    });

    it('should return empty array for invalid user ID', () => {
      const documents = service.getUserDocuments('');
      expect(documents).toEqual([]);
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', () => {
      const stats = service.getStorageStats();

      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('usagePercentage');
      expect(stats).toHaveProperty('entryCount');

      expect(typeof stats.totalSize).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
      expect(typeof stats.usagePercentage).toBe('number');
      expect(typeof stats.entryCount).toBe('number');
    });

    it('should calculate usage percentage correctly', () => {
      const annotations: UserAnnotations = {
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      service.saveAnnotations(testUserId, testDocumentId, annotations);
      const stats = service.getStorageStats();

      expect(stats.usagePercentage).toBeGreaterThan(0);
      expect(stats.usagePercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('clearAllData', () => {
    it('should clear all storage data', () => {
      const annotations: UserAnnotations = {
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      service.saveAnnotations(testUserId, testDocumentId, annotations);
      expect(service.hasAnnotations(testUserId, testDocumentId)).toBe(true);

      service.clearAllData();
      expect(service.hasAnnotations(testUserId, testDocumentId)).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('Data Isolation', () => {
    it('should isolate data between different users', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      const docId = 'shared-doc';

      const annotations1: UserAnnotations = {
        highlights: [
          createHighlight(
            'h1',
            user1,
            docId,
            1,
            0,
            10,
            'user1 text',
            '#ffff00',
            { x: 10, y: 20, width: 100, height: 20 }
          )
        ],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      const annotations2: UserAnnotations = {
        highlights: [
          createHighlight(
            'h2',
            user2,
            docId,
            1,
            0,
            10,
            'user2 text',
            '#ff0000',
            { x: 10, y: 20, width: 100, height: 20 }
          )
        ],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      service.saveAnnotations(user1, docId, annotations1);
      service.saveAnnotations(user2, docId, annotations2);

      const loaded1 = service.loadAnnotations(user1, docId);
      const loaded2 = service.loadAnnotations(user2, docId);

      expect(loaded1.highlights[0].selectedText).toBe('user1 text');
      expect(loaded2.highlights[0].selectedText).toBe('user2 text');
      expect(loaded1.highlights[0].color).toBe('#ffff00');
      expect(loaded2.highlights[0].color).toBe('#ff0000');
    });

    it('should isolate data between different documents', () => {
      const doc1 = 'doc1';
      const doc2 = 'doc2';

      const annotations1: UserAnnotations = {
        highlights: [],
        bookmarks: [
          createBookmark('b1', testUserId, doc1, 1, 'Doc1 Bookmark')
        ],
        comments: [],
        callToActions: []
      };

      const annotations2: UserAnnotations = {
        highlights: [],
        bookmarks: [
          createBookmark('b2', testUserId, doc2, 1, 'Doc2 Bookmark')
        ],
        comments: [],
        callToActions: []
      };

      service.saveAnnotations(testUserId, doc1, annotations1);
      service.saveAnnotations(testUserId, doc2, annotations2);

      const loaded1 = service.loadAnnotations(testUserId, doc1);
      const loaded2 = service.loadAnnotations(testUserId, doc2);

      expect(loaded1.bookmarks[0].title).toBe('Doc1 Bookmark');
      expect(loaded2.bookmarks[0].title).toBe('Doc2 Bookmark');
      expect(loaded1.bookmarks).toHaveLength(1);
      expect(loaded2.bookmarks).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage not available', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage not available');
      });

      const annotations: UserAnnotations = {
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      };

      expect(() => service.saveAnnotations(testUserId, testDocumentId, annotations))
        .toThrow('Failed to save annotations');

      // Restore original implementation
      localStorageMock.setItem.mockImplementation(originalSetItem);
    });

    it('should handle invalid JSON in storage', () => {
      const key = `ebook-utility-${testUserId}-${testDocumentId}-annotations`;
      
      // Mock getItem to return invalid JSON
      localStorageMock.getItem.mockReturnValueOnce('{invalid json}');

      expect(() => service.loadAnnotations(testUserId, testDocumentId))
        .toThrow(StorageSerializationError);
        
      // Reset mock
      localStorageMock.getItem.mockRestore();
    });
  });
});