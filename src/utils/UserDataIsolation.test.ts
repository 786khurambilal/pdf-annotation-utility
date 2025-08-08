import { AnnotationManager } from './AnnotationManager';
import { LocalStorageService } from './LocalStorageService';
import { UserDataMigration } from './UserDataMigration';
import { TextSelection, AreaCoordinates, RectangleCoordinates } from '../types/annotation.types';

/**
 * Integration tests for user-specific data isolation
 * These tests verify that user data is properly isolated and managed
 */
describe('User Data Isolation Integration Tests', () => {
  let annotationManager: AnnotationManager;
  let storageService: LocalStorageService;
  let migration: UserDataMigration;

  // Mock localStorage for testing
  const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singletons
    AnnotationManager.resetInstance();
    
    // Create fresh instances
    storageService = LocalStorageService.getInstance();
    annotationManager = AnnotationManager.getInstance();
    migration = new UserDataMigration(storageService, annotationManager);

    // Setup localStorage mock to return empty data by default
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  const createMockSelection = (): TextSelection => ({
    text: 'Selected text',
    pageNumber: 1,
    startOffset: 0,
    endOffset: 13,
    coordinates: { x: 10, y: 20, width: 100, height: 20 }
  });

  const createMockAreaCoordinates = (): AreaCoordinates => ({
    x: 50,
    y: 100
  });

  const createMockRectCoordinates = (): RectangleCoordinates => ({
    x: 50,
    y: 100,
    width: 200,
    height: 50
  });

  describe('User Data Isolation', () => {
    it('should isolate annotations between different users', () => {
      const user1Id = 'user1';
      const user2Id = 'user2';
      const documentId = 'test-document';

      // Mock localStorage to return different data for different users
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key.includes(user1Id)) {
          return JSON.stringify({
            highlights: [{
              id: 'h1',
              userId: user1Id,
              documentId,
              pageNumber: 1,
              selectedText: 'User 1 highlight',
              color: '#ffff00',
              startOffset: 0,
              endOffset: 15,
              coordinates: { x: 0, y: 0, width: 100, height: 20 },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }],
            bookmarks: [],
            comments: [],
            callToActions: []
          });
        } else if (key.includes(user2Id)) {
          return JSON.stringify({
            highlights: [{
              id: 'h2',
              userId: user2Id,
              documentId,
              pageNumber: 1,
              selectedText: 'User 2 highlight',
              color: '#00ff00',
              startOffset: 20,
              endOffset: 35,
              coordinates: { x: 100, y: 0, width: 100, height: 20 },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }],
            bookmarks: [],
            comments: [],
            callToActions: []
          });
        }
        return null;
      });

      // Get annotations for user1
      const user1Annotations = annotationManager.getAnnotations(user1Id, documentId);
      expect(user1Annotations.highlights).toHaveLength(1);
      expect(user1Annotations.highlights[0].selectedText).toBe('User 1 highlight');
      expect(user1Annotations.highlights[0].userId).toBe(user1Id);

      // Get annotations for user2
      const user2Annotations = annotationManager.getAnnotations(user2Id, documentId);
      expect(user2Annotations.highlights).toHaveLength(1);
      expect(user2Annotations.highlights[0].selectedText).toBe('User 2 highlight');
      expect(user2Annotations.highlights[0].userId).toBe(user2Id);

      // Verify that users don't see each other's data
      expect(user1Annotations.highlights[0].id).not.toBe(user2Annotations.highlights[0].id);
    });

    it('should create user-specific storage keys', () => {
      const user1Id = 'user1';
      const user2Id = 'user2';
      const documentId = 'test-document';

      // Create annotations for both users
      const selection = createMockSelection();
      
      annotationManager.createHighlight(user1Id, documentId, selection, '#ffff00');
      annotationManager.createHighlight(user2Id, documentId, selection, '#00ff00');

      // Verify that different storage keys are used
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining(`${user1Id}-${documentId}`),
        expect.any(String)
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining(`${user2Id}-${documentId}`),
        expect.any(String)
      );

      // Verify keys are different
      const calls = mockLocalStorage.setItem.mock.calls;
      const user1Key = calls.find(call => call[0].includes(user1Id))?.[0];
      const user2Key = calls.find(call => call[0].includes(user2Id))?.[0];
      
      expect(user1Key).toBeDefined();
      expect(user2Key).toBeDefined();
      expect(user1Key).not.toBe(user2Key);
    });

    it('should maintain user isolation across all annotation types', () => {
      const user1Id = 'user1';
      const user2Id = 'user2';
      const documentId = 'test-document';

      // Create different types of annotations for each user
      const selection = createMockSelection();
      const areaCoords = createMockAreaCoordinates();
      const rectCoords = createMockRectCoordinates();

      // User 1 annotations
      const user1Highlight = annotationManager.createHighlight(user1Id, documentId, selection);
      const user1Bookmark = annotationManager.createBookmark(user1Id, documentId, 1, 'User 1 Bookmark');
      const user1Comment = annotationManager.createComment(user1Id, documentId, 1, 'User 1 Comment', areaCoords);
      const user1CTA = annotationManager.createCallToAction(user1Id, documentId, 1, 'https://user1.com', 'User 1 CTA', rectCoords);

      // User 2 annotations
      const user2Highlight = annotationManager.createHighlight(user2Id, documentId, selection);
      const user2Bookmark = annotationManager.createBookmark(user2Id, documentId, 1, 'User 2 Bookmark');
      const user2Comment = annotationManager.createComment(user2Id, documentId, 1, 'User 2 Comment', areaCoords);
      const user2CTA = annotationManager.createCallToAction(user2Id, documentId, 1, 'https://user2.com', 'User 2 CTA', rectCoords);

      // Verify user IDs are correctly set
      expect(user1Highlight.userId).toBe(user1Id);
      expect(user1Bookmark.userId).toBe(user1Id);
      expect(user1Comment.userId).toBe(user1Id);
      expect(user1CTA.userId).toBe(user1Id);

      expect(user2Highlight.userId).toBe(user2Id);
      expect(user2Bookmark.userId).toBe(user2Id);
      expect(user2Comment.userId).toBe(user2Id);
      expect(user2CTA.userId).toBe(user2Id);

      // Verify document IDs are correctly set
      expect(user1Highlight.documentId).toBe(documentId);
      expect(user2Highlight.documentId).toBe(documentId);

      // Verify annotations have different IDs
      expect(user1Highlight.id).not.toBe(user2Highlight.id);
      expect(user1Bookmark.id).not.toBe(user2Bookmark.id);
      expect(user1Comment.id).not.toBe(user2Comment.id);
      expect(user1CTA.id).not.toBe(user2CTA.id);
    });

    it('should handle user data migration while preserving isolation', async () => {
      const sourceUserId = 'source-user';
      const targetUserId = 'target-user';
      const documentId = 'test-document';

      // Setup source user data
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key.includes(sourceUserId)) {
          return JSON.stringify({
            highlights: [{
              id: 'h1',
              userId: sourceUserId,
              documentId,
              pageNumber: 1,
              selectedText: 'Source highlight',
              color: '#ffff00',
              startOffset: 0,
              endOffset: 15,
              coordinates: { x: 0, y: 0, width: 100, height: 20 },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }],
            bookmarks: [],
            comments: [],
            callToActions: []
          });
        }
        return null;
      });

      // Mock getUserDocuments to return the document
      jest.spyOn(annotationManager, 'getUserDocuments').mockReturnValue([documentId]);

      // Perform migration
      const result = await migration.migrateUserData(sourceUserId, targetUserId);

      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(1);
      expect(result.annotationsMigrated.highlights).toBe(1);

      // Verify that the migrated data has the correct target user ID
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining(targetUserId),
        expect.stringContaining(`"userId":"${targetUserId}"`)
      );
    });

    it('should validate user data integrity', () => {
      const userId = 'test-user';
      const documentId = 'test-document';

      // Setup mock data with correct user IDs
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        highlights: [{
          id: 'h1',
          userId,
          documentId,
          pageNumber: 1,
          selectedText: 'Test highlight',
          color: '#ffff00',
          startOffset: 0,
          endOffset: 13,
          coordinates: { x: 0, y: 0, width: 100, height: 20 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }],
        bookmarks: [{
          id: 'b1',
          userId,
          documentId,
          pageNumber: 1,
          title: 'Test bookmark',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }],
        comments: [],
        callToActions: []
      }));

      jest.spyOn(annotationManager, 'getUserDocuments').mockReturnValue([documentId]);

      const validation = migration.validateUserData(userId);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect user ID mismatches in validation', () => {
      const userId = 'test-user';
      const documentId = 'test-document';

      // Setup mock data with incorrect user ID
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        highlights: [{
          id: 'h1',
          userId: 'wrong-user', // Incorrect user ID
          documentId,
          pageNumber: 1,
          selectedText: 'Test highlight',
          color: '#ffff00',
          startOffset: 0,
          endOffset: 13,
          coordinates: { x: 0, y: 0, width: 100, height: 20 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }],
        bookmarks: [],
        comments: [],
        callToActions: []
      }));

      jest.spyOn(annotationManager, 'getUserDocuments').mockReturnValue([documentId]);

      const validation = migration.validateUserData(userId);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        `Highlight h1 in document ${documentId} has incorrect user ID: wrong-user`
      );
    });

    it('should provide accurate user data statistics', () => {
      const userId = 'test-user';
      const doc1Id = 'doc1';
      const doc2Id = 'doc2';

      jest.spyOn(annotationManager, 'getUserDocuments').mockReturnValue([doc1Id, doc2Id]);
      jest.spyOn(annotationManager, 'getAnnotationCounts')
        .mockReturnValueOnce({ highlights: 2, bookmarks: 1, comments: 0, callToActions: 1, total: 4 })
        .mockReturnValueOnce({ highlights: 1, bookmarks: 0, comments: 2, callToActions: 0, total: 3 });

      const stats = migration.getUserDataStats(userId);

      expect(stats.documentCount).toBe(2);
      expect(stats.annotationCounts.highlights).toBe(3);
      expect(stats.annotationCounts.bookmarks).toBe(1);
      expect(stats.annotationCounts.comments).toBe(2);
      expect(stats.annotationCounts.callToActions).toBe(1);
      expect(stats.annotationCounts.total).toBe(7);
      expect(stats.documentsWithAnnotations).toHaveLength(2);
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle concurrent operations from different users', () => {
      const user1Id = 'user1';
      const user2Id = 'user2';
      const documentId = 'shared-document';
      const selection = createMockSelection();

      // Simulate concurrent highlight creation
      const user1Highlight = annotationManager.createHighlight(user1Id, documentId, selection, '#ffff00');
      const user2Highlight = annotationManager.createHighlight(user2Id, documentId, selection, '#00ff00');

      // Verify both highlights were created with correct user isolation
      expect(user1Highlight.userId).toBe(user1Id);
      expect(user2Highlight.userId).toBe(user2Id);
      expect(user1Highlight.id).not.toBe(user2Highlight.id);

      // Verify separate storage calls
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
      
      const calls = mockLocalStorage.setItem.mock.calls;
      const user1Call = calls.find(call => call[0].includes(user1Id));
      const user2Call = calls.find(call => call[0].includes(user2Id));
      
      expect(user1Call).toBeDefined();
      expect(user2Call).toBeDefined();
    });

    it('should maintain data integrity during user switching', () => {
      const user1Id = 'user1';
      const user2Id = 'user2';
      const documentId = 'test-document';

      // Create data for user1
      const selection = createMockSelection();
      annotationManager.createHighlight(user1Id, documentId, selection, '#ffff00');

      // Switch to user2 and create different data
      annotationManager.createBookmark(user2Id, documentId, 2, 'User 2 Bookmark');

      // Verify that each user's data is stored separately
      const user1StorageKey = `ebook-utility-${user1Id}-${documentId}-annotations`;
      const user2StorageKey = `ebook-utility-${user2Id}-${documentId}-annotations`;

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        user1StorageKey,
        expect.stringContaining('highlight')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        user2StorageKey,
        expect.stringContaining('bookmark')
      );
    });
  });
});