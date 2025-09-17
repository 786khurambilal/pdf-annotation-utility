import { UserDataMigration, MigrationError } from './UserDataMigration';
import { LocalStorageService } from './LocalStorageService';
import { AnnotationManager } from './AnnotationManager';
import { UserAnnotations } from '../types/annotation.types';

// Mock dependencies
const mockStorageService = {
  saveAnnotations: jest.fn(),
  loadAnnotations: jest.fn(),
  deleteAnnotations: jest.fn(),
  hasAnnotations: jest.fn(),
  getUserDocuments: jest.fn(),
} as any;

const mockAnnotationManager = {
  getAnnotations: jest.fn(),
  getUserDocuments: jest.fn(),
  hasAnnotations: jest.fn(),
  getAnnotationCounts: jest.fn(),
} as any;

describe('UserDataMigration', () => {
  let migration: UserDataMigration;

  beforeEach(() => {
    jest.clearAllMocks();
    migration = new UserDataMigration(mockStorageService, mockAnnotationManager);
  });

  const createMockAnnotations = (userId: string, documentId: string): UserAnnotations => ({
    highlights: [
      {
        id: 'h1',
        userId,
        documentId,
        pageNumber: 1,
        selectedText: 'test',
        color: '#ffff00',
        startOffset: 0,
        endOffset: 4,
        coordinates: { x: 0, y: 0, width: 50, height: 20 },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    bookmarks: [
      {
        id: 'b1',
        userId,
        documentId,
        pageNumber: 1,
        title: 'Test Bookmark',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    comments: [
      {
        id: 'c1',
        userId,
        documentId,
        pageNumber: 1,
        content: 'Test comment',
        coordinates: { x: 50, y: 100 },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    callToActions: [
      {
        id: 'cta1',
        userId,
        documentId,
        pageNumber: 1,
        url: 'https://example.com',
        label: 'Test CTA',
        coordinates: { x: 50, y: 100, width: 200, height: 50 },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  });

  describe('migrateUserData', () => {
    it('should migrate user data successfully', async () => {
      const sourceAnnotations = createMockAnnotations('user1', 'doc1');
      
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockAnnotationManager.getAnnotations.mockReturnValue(sourceAnnotations);
      mockAnnotationManager.hasAnnotations.mockReturnValue(false);

      const result = await migration.migrateUserData('user1', 'user2');

      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(1);
      expect(result.annotationsMigrated.highlights).toBe(1);
      expect(result.annotationsMigrated.bookmarks).toBe(1);
      expect(result.annotationsMigrated.comments).toBe(1);
      expect(result.annotationsMigrated.callToActions).toBe(1);
      expect(result.annotationsMigrated.total).toBe(4);
      expect(result.errors).toHaveLength(0);

      expect(mockStorageService.saveAnnotations).toHaveBeenCalledWith(
        'user2',
        'doc1',
        expect.objectContaining({
          highlights: expect.arrayContaining([
            expect.objectContaining({ userId: 'user2' })
          ]),
          bookmarks: expect.arrayContaining([
            expect.objectContaining({ userId: 'user2' })
          ]),
          comments: expect.arrayContaining([
            expect.objectContaining({ userId: 'user2' })
          ]),
          callToActions: expect.arrayContaining([
            expect.objectContaining({ userId: 'user2' })
          ])
        })
      );
    });

    it('should throw error for invalid parameters', async () => {
      await expect(migration.migrateUserData('', 'user2')).rejects.toThrow(MigrationError);
      await expect(migration.migrateUserData('user1', '')).rejects.toThrow(MigrationError);
      await expect(migration.migrateUserData('user1', 'user1')).rejects.toThrow(MigrationError);
    });

    it('should handle empty source data', async () => {
      mockAnnotationManager.getUserDocuments.mockReturnValue([]);

      const result = await migration.migrateUserData('user1', 'user2');

      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(0);
      expect(result.annotationsMigrated.total).toBe(0);
    });

    it('should merge annotations when target has existing data', async () => {
      const sourceAnnotations = createMockAnnotations('user1', 'doc1');
      const targetAnnotations = createMockAnnotations('user2', 'doc1');
      targetAnnotations.highlights[0].id = 'h2'; // Different ID to avoid conflict

      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockAnnotationManager.getAnnotations.mockReturnValue(sourceAnnotations);
      mockAnnotationManager.hasAnnotations.mockReturnValue(true);

      // Mock the target annotations when checking for existing data
      mockAnnotationManager.getAnnotations
        .mockReturnValueOnce(sourceAnnotations) // First call for source
        .mockReturnValueOnce(targetAnnotations); // Second call for target

      const result = await migration.migrateUserData('user1', 'user2', {
        overwriteExisting: false
      });

      expect(result.success).toBe(true);
      expect(mockStorageService.saveAnnotations).toHaveBeenCalledWith(
        'user2',
        'doc1',
        expect.objectContaining({
          highlights: expect.arrayContaining([
            expect.objectContaining({ id: 'h2' }), // Original target highlight
            expect.objectContaining({ id: 'h1', userId: 'user2' }) // Migrated source highlight
          ])
        })
      );
    });

    it('should preserve original data when specified', async () => {
      const sourceAnnotations = createMockAnnotations('user1', 'doc1');
      
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockAnnotationManager.getAnnotations.mockReturnValue(sourceAnnotations);
      mockAnnotationManager.hasAnnotations.mockReturnValue(false);

      await migration.migrateUserData('user1', 'user2', {
        preserveOriginal: true
      });

      expect(mockStorageService.deleteAnnotations).not.toHaveBeenCalled();
    });

    it('should delete original data by default', async () => {
      const sourceAnnotations = createMockAnnotations('user1', 'doc1');
      
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockAnnotationManager.getAnnotations.mockReturnValue(sourceAnnotations);
      mockAnnotationManager.hasAnnotations.mockReturnValue(false);

      await migration.migrateUserData('user1', 'user2');

      expect(mockStorageService.deleteAnnotations).toHaveBeenCalledWith('user1', 'doc1');
    });

    it('should apply document filter', async () => {
      const sourceAnnotations = createMockAnnotations('user1', 'doc1');
      
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1', 'doc2']);
      mockAnnotationManager.getAnnotations.mockReturnValue(sourceAnnotations);
      mockAnnotationManager.hasAnnotations.mockReturnValue(false);

      const result = await migration.migrateUserData('user1', 'user2', {
        documentFilter: (docId) => docId === 'doc1'
      });

      expect(result.documentsProcessed).toBe(1);
      expect(mockAnnotationManager.getAnnotations).toHaveBeenCalledWith('user1', 'doc1');
      expect(mockAnnotationManager.getAnnotations).not.toHaveBeenCalledWith('user1', 'doc2');
    });

    it('should handle migration errors gracefully', async () => {
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockAnnotationManager.getAnnotations.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await migration.migrateUserData('user1', 'user2');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to migrate document doc1: Storage error');
    });
  });

  describe('copyUserData', () => {
    it('should copy user data preserving original', async () => {
      const sourceAnnotations = createMockAnnotations('user1', 'doc1');
      
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockAnnotationManager.getAnnotations.mockReturnValue(sourceAnnotations);
      mockAnnotationManager.hasAnnotations.mockReturnValue(false);

      await migration.copyUserData('user1', 'user2');

      expect(mockStorageService.saveAnnotations).toHaveBeenCalled();
      expect(mockStorageService.deleteAnnotations).not.toHaveBeenCalled();
    });
  });

  describe('mergeUsersData', () => {
    it('should merge data from multiple users', async () => {
      const user1Annotations = createMockAnnotations('user1', 'doc1');
      const user2Annotations = createMockAnnotations('user2', 'doc1');
      user2Annotations.highlights[0].id = 'h2';

      mockAnnotationManager.getUserDocuments
        .mockReturnValueOnce(['doc1']) // user1
        .mockReturnValueOnce(['doc1']); // user2

      mockAnnotationManager.getAnnotations
        .mockReturnValueOnce(user1Annotations) // user1 data
        .mockReturnValueOnce(user2Annotations); // user2 data

      mockAnnotationManager.hasAnnotations.mockReturnValue(false);

      const result = await migration.mergeUsersData(['user1', 'user2'], 'user3');

      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(2);
      expect(result.annotationsMigrated.total).toBe(8); // 4 from each user
    });

    it('should throw error for invalid parameters', async () => {
      await expect(migration.mergeUsersData([], 'user3')).rejects.toThrow(MigrationError);
      await expect(migration.mergeUsersData(['user1'], '')).rejects.toThrow(MigrationError);
      await expect(migration.mergeUsersData(['user1', 'user3'], 'user3')).rejects.toThrow(MigrationError);
    });
  });

  describe('deleteUserData', () => {
    it('should delete all user data', async () => {
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1', 'doc2']);

      const result = await migration.deleteUserData('user1');

      expect(result.success).toBe(true);
      expect(result.documentsDeleted).toBe(2);
      expect(mockStorageService.deleteAnnotations).toHaveBeenCalledWith('user1', 'doc1');
      expect(mockStorageService.deleteAnnotations).toHaveBeenCalledWith('user1', 'doc2');
    });

    it('should handle deletion errors', async () => {
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockStorageService.deleteAnnotations.mockImplementation(() => {
        throw new Error('Delete error');
      });

      const result = await migration.deleteUserData('user1');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to delete document doc1: Delete error');
    });
  });

  describe('getUserDataStats', () => {
    it('should return user data statistics', () => {
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1', 'doc2']);
      mockAnnotationManager.getAnnotationCounts
        .mockReturnValueOnce({ highlights: 2, bookmarks: 1, comments: 1, callToActions: 0, total: 4 })
        .mockReturnValueOnce({ highlights: 1, bookmarks: 2, comments: 0, callToActions: 1, total: 4 });

      const stats = migration.getUserDataStats('user1');

      expect(stats.documentCount).toBe(2);
      expect(stats.annotationCounts.highlights).toBe(3);
      expect(stats.annotationCounts.bookmarks).toBe(3);
      expect(stats.annotationCounts.comments).toBe(1);
      expect(stats.annotationCounts.callToActions).toBe(1);
      expect(stats.annotationCounts.total).toBe(8);
      expect(stats.documentsWithAnnotations).toHaveLength(2);
    });
  });

  describe('validateUserData', () => {
    it('should validate user data integrity', () => {
      const validAnnotations = createMockAnnotations('user1', 'doc1');
      
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockAnnotationManager.getAnnotations.mockReturnValue(validAnnotations);

      const result = migration.validateUserData('user1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid user IDs in annotations', () => {
      const invalidAnnotations = createMockAnnotations('user1', 'doc1');
      invalidAnnotations.highlights[0].userId = 'wrong-user';
      
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockAnnotationManager.getAnnotations.mockReturnValue(invalidAnnotations);

      const result = migration.validateUserData('user1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Highlight h1 in document doc1 has incorrect user ID: wrong-user');
    });

    it('should detect invalid document IDs in annotations', () => {
      const invalidAnnotations = createMockAnnotations('user1', 'doc1');
      invalidAnnotations.bookmarks[0].documentId = 'wrong-doc';
      
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockAnnotationManager.getAnnotations.mockReturnValue(invalidAnnotations);

      const result = migration.validateUserData('user1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bookmark b1 has incorrect document ID: wrong-doc');
    });

    it('should handle validation errors', () => {
      mockAnnotationManager.getUserDocuments.mockReturnValue(['doc1']);
      mockAnnotationManager.getAnnotations.mockImplementation(() => {
        throw new Error('Validation error');
      });

      const result = migration.validateUserData('user1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed to validate document doc1: Validation error');
    });
  });
});