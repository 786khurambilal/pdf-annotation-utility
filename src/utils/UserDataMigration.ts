import { User } from '../types/user.types';
import { UserAnnotations } from '../types/annotation.types';
import { LocalStorageService } from './LocalStorageService';
import { AnnotationManager } from './AnnotationManager';

// Migration error types
export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

// Migration result interface
export interface MigrationResult {
  success: boolean;
  documentsProcessed: number;
  annotationsMigrated: {
    highlights: number;
    bookmarks: number;
    comments: number;
    callToActions: number;
    total: number;
  };
  errors: string[];
}

// Migration options interface
export interface MigrationOptions {
  overwriteExisting?: boolean;
  preserveOriginal?: boolean;
  documentFilter?: (documentId: string) => boolean;
  annotationFilter?: (annotations: UserAnnotations) => UserAnnotations;
}

/**
 * UserDataMigration provides utilities for migrating user data between users
 * and managing user-specific data operations
 */
export class UserDataMigration {
  private storageService: LocalStorageService;
  private annotationManager: AnnotationManager;

  constructor(
    storageService?: LocalStorageService,
    annotationManager?: AnnotationManager
  ) {
    this.storageService = storageService || LocalStorageService.getInstance();
    this.annotationManager = annotationManager || AnnotationManager.getInstance();
  }

  /**
   * Migrate all annotations from one user to another
   */
  public async migrateUserData(
    fromUserId: string,
    toUserId: string,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    if (!fromUserId?.trim() || !toUserId?.trim()) {
      throw new MigrationError('Source and target user IDs are required');
    }

    if (fromUserId === toUserId) {
      throw new MigrationError('Source and target users cannot be the same');
    }

    const result: MigrationResult = {
      success: true,
      documentsProcessed: 0,
      annotationsMigrated: {
        highlights: 0,
        bookmarks: 0,
        comments: 0,
        callToActions: 0,
        total: 0
      },
      errors: []
    };

    try {
      // Get all documents for the source user
      const sourceDocuments = this.annotationManager.getUserDocuments(fromUserId);
      
      if (sourceDocuments.length === 0) {
        return result; // No data to migrate
      }

      for (const documentId of sourceDocuments) {
        try {
          // Apply document filter if provided
          if (options.documentFilter && !options.documentFilter(documentId)) {
            continue;
          }

          // Load source annotations
          let sourceAnnotations = this.annotationManager.getAnnotations(fromUserId, documentId);
          
          // Apply annotation filter if provided
          if (options.annotationFilter) {
            sourceAnnotations = options.annotationFilter(sourceAnnotations);
          }

          // Check if target already has annotations for this document
          const targetHasAnnotations = this.annotationManager.hasAnnotations(toUserId, documentId);
          
          if (targetHasAnnotations && !options.overwriteExisting) {
            // Merge annotations instead of overwriting
            const targetAnnotations = this.annotationManager.getAnnotations(toUserId, documentId);
            sourceAnnotations = this.mergeAnnotations(targetAnnotations, sourceAnnotations);
          }

          // Update user IDs in annotations
          const migratedAnnotations = this.updateAnnotationUserIds(sourceAnnotations, toUserId);

          // Save to target user
          this.storageService.saveAnnotations(toUserId, documentId, migratedAnnotations);

          // Update migration result
          result.documentsProcessed++;
          result.annotationsMigrated.highlights += migratedAnnotations.highlights.length;
          result.annotationsMigrated.bookmarks += migratedAnnotations.bookmarks.length;
          result.annotationsMigrated.comments += migratedAnnotations.comments.length;
          result.annotationsMigrated.callToActions += migratedAnnotations.callToActions.length;

          // Remove original data if not preserving
          if (!options.preserveOriginal) {
            this.storageService.deleteAnnotations(fromUserId, documentId);
          }

        } catch (error) {
          result.success = false;
          result.errors.push(`Failed to migrate document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Calculate total migrated annotations
      result.annotationsMigrated.total = 
        result.annotationsMigrated.highlights +
        result.annotationsMigrated.bookmarks +
        result.annotationsMigrated.comments +
        result.annotationsMigrated.callToActions;

    } catch (error) {
      result.success = false;
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Copy user data to another user (preserves original)
   */
  public async copyUserData(
    fromUserId: string,
    toUserId: string,
    options: Omit<MigrationOptions, 'preserveOriginal'> = {}
  ): Promise<MigrationResult> {
    return this.migrateUserData(fromUserId, toUserId, {
      ...options,
      preserveOriginal: true
    });
  }

  /**
   * Merge annotations from multiple users into a single user
   */
  public async mergeUsersData(
    sourceUserIds: string[],
    targetUserId: string,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    if (!sourceUserIds.length) {
      throw new MigrationError('At least one source user ID is required');
    }

    if (!targetUserId?.trim()) {
      throw new MigrationError('Target user ID is required');
    }

    if (sourceUserIds.includes(targetUserId)) {
      throw new MigrationError('Target user cannot be in the source users list');
    }

    const combinedResult: MigrationResult = {
      success: true,
      documentsProcessed: 0,
      annotationsMigrated: {
        highlights: 0,
        bookmarks: 0,
        comments: 0,
        callToActions: 0,
        total: 0
      },
      errors: []
    };

    for (const sourceUserId of sourceUserIds) {
      try {
        const result = await this.migrateUserData(sourceUserId, targetUserId, {
          ...options,
          overwriteExisting: false // Always merge when combining multiple users
        });

        // Combine results
        combinedResult.documentsProcessed += result.documentsProcessed;
        combinedResult.annotationsMigrated.highlights += result.annotationsMigrated.highlights;
        combinedResult.annotationsMigrated.bookmarks += result.annotationsMigrated.bookmarks;
        combinedResult.annotationsMigrated.comments += result.annotationsMigrated.comments;
        combinedResult.annotationsMigrated.callToActions += result.annotationsMigrated.callToActions;
        combinedResult.errors.push(...result.errors);

        if (!result.success) {
          combinedResult.success = false;
        }

      } catch (error) {
        combinedResult.success = false;
        combinedResult.errors.push(`Failed to merge user ${sourceUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    combinedResult.annotationsMigrated.total = 
      combinedResult.annotationsMigrated.highlights +
      combinedResult.annotationsMigrated.bookmarks +
      combinedResult.annotationsMigrated.comments +
      combinedResult.annotationsMigrated.callToActions;

    return combinedResult;
  }

  /**
   * Delete all data for a user
   */
  public async deleteUserData(userId: string): Promise<{
    success: boolean;
    documentsDeleted: number;
    errors: string[];
  }> {
    if (!userId?.trim()) {
      throw new MigrationError('User ID is required');
    }

    const result = {
      success: true,
      documentsDeleted: 0,
      errors: []
    };

    try {
      const userDocuments = this.annotationManager.getUserDocuments(userId);

      for (const documentId of userDocuments) {
        try {
          this.storageService.deleteAnnotations(userId, documentId);
          result.documentsDeleted++;
        } catch (error) {
          result.success = false;
          result.errors.push(`Failed to delete document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to delete user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Get user data statistics
   */
  public getUserDataStats(userId: string): {
    documentCount: number;
    annotationCounts: {
      highlights: number;
      bookmarks: number;
      comments: number;
      callToActions: number;
      total: number;
    };
    documentsWithAnnotations: Array<{
      documentId: string;
      annotationCounts: {
        highlights: number;
        bookmarks: number;
        comments: number;
        callToActions: number;
        total: number;
      };
    }>;
  } {
    if (!userId?.trim()) {
      throw new MigrationError('User ID is required');
    }

    const userDocuments = this.annotationManager.getUserDocuments(userId);
    const stats = {
      documentCount: userDocuments.length,
      annotationCounts: {
        highlights: 0,
        bookmarks: 0,
        comments: 0,
        callToActions: 0,
        total: 0
      },
      documentsWithAnnotations: [] as Array<{
        documentId: string;
        annotationCounts: {
          highlights: number;
          bookmarks: number;
          comments: number;
          callToActions: number;
          total: number;
        };
      }>
    };

    for (const documentId of userDocuments) {
      const documentCounts = this.annotationManager.getAnnotationCounts(userId, documentId);
      
      stats.annotationCounts.highlights += documentCounts.highlights;
      stats.annotationCounts.bookmarks += documentCounts.bookmarks;
      stats.annotationCounts.comments += documentCounts.comments;
      stats.annotationCounts.callToActions += documentCounts.callToActions;
      
      stats.documentsWithAnnotations.push({
        documentId,
        annotationCounts: documentCounts
      });
    }

    stats.annotationCounts.total = 
      stats.annotationCounts.highlights +
      stats.annotationCounts.bookmarks +
      stats.annotationCounts.comments +
      stats.annotationCounts.callToActions;

    return stats;
  }

  /**
   * Validate user data integrity
   */
  public validateUserData(userId: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    if (!userId?.trim()) {
      throw new MigrationError('User ID is required');
    }

    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      const userDocuments = this.annotationManager.getUserDocuments(userId);

      for (const documentId of userDocuments) {
        try {
          const annotations = this.annotationManager.getAnnotations(userId, documentId);
          
          // Validate each annotation type
          for (const highlight of annotations.highlights) {
            if (highlight.userId !== userId) {
              result.isValid = false;
              result.errors.push(`Highlight ${highlight.id} in document ${documentId} has incorrect user ID: ${highlight.userId}`);
            }
            if (highlight.documentId !== documentId) {
              result.isValid = false;
              result.errors.push(`Highlight ${highlight.id} has incorrect document ID: ${highlight.documentId}`);
            }
          }

          for (const bookmark of annotations.bookmarks) {
            if (bookmark.userId !== userId) {
              result.isValid = false;
              result.errors.push(`Bookmark ${bookmark.id} in document ${documentId} has incorrect user ID: ${bookmark.userId}`);
            }
            if (bookmark.documentId !== documentId) {
              result.isValid = false;
              result.errors.push(`Bookmark ${bookmark.id} has incorrect document ID: ${bookmark.documentId}`);
            }
          }

          for (const comment of annotations.comments) {
            if (comment.userId !== userId) {
              result.isValid = false;
              result.errors.push(`Comment ${comment.id} in document ${documentId} has incorrect user ID: ${comment.userId}`);
            }
            if (comment.documentId !== documentId) {
              result.isValid = false;
              result.errors.push(`Comment ${comment.id} has incorrect document ID: ${comment.documentId}`);
            }
          }

          for (const cta of annotations.callToActions) {
            if (cta.userId !== userId) {
              result.isValid = false;
              result.errors.push(`Call-to-action ${cta.id} in document ${documentId} has incorrect user ID: ${cta.userId}`);
            }
            if (cta.documentId !== documentId) {
              result.isValid = false;
              result.errors.push(`Call-to-action ${cta.id} has incorrect document ID: ${cta.documentId}`);
            }
          }

        } catch (error) {
          result.isValid = false;
          result.errors.push(`Failed to validate document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to validate user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Merge two annotation sets
   */
  private mergeAnnotations(target: UserAnnotations, source: UserAnnotations): UserAnnotations {
    // Create maps for efficient lookup
    const targetHighlightIds = new Set(target.highlights.map(h => h.id));
    const targetBookmarkIds = new Set(target.bookmarks.map(b => b.id));
    const targetCommentIds = new Set(target.comments.map(c => c.id));
    const targetCtaIds = new Set(target.callToActions.map(cta => cta.id));

    return {
      highlights: [
        ...target.highlights,
        ...source.highlights.filter(h => !targetHighlightIds.has(h.id))
      ],
      bookmarks: [
        ...target.bookmarks,
        ...source.bookmarks.filter(b => !targetBookmarkIds.has(b.id))
      ],
      comments: [
        ...target.comments,
        ...source.comments.filter(c => !targetCommentIds.has(c.id))
      ],
      callToActions: [
        ...target.callToActions,
        ...source.callToActions.filter(cta => !targetCtaIds.has(cta.id))
      ]
    };
  }

  /**
   * Update user IDs in annotation objects
   */
  private updateAnnotationUserIds(annotations: UserAnnotations, newUserId: string): UserAnnotations {
    return {
      highlights: annotations.highlights.map(h => ({ ...h, userId: newUserId })),
      bookmarks: annotations.bookmarks.map(b => ({ ...b, userId: newUserId })),
      comments: annotations.comments.map(c => ({ ...c, userId: newUserId })),
      callToActions: annotations.callToActions.map(cta => ({ ...cta, userId: newUserId }))
    };
  }
}

// Export singleton instance
export const userDataMigration = new UserDataMigration();