import { UserAnnotations, validateUserAnnotations } from '../types/annotation.types';

// Storage configuration
const STORAGE_PREFIX = 'ebook-utility';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
const CLEANUP_THRESHOLD = 0.8; // Clean up when 80% full

// Storage key patterns
const ANNOTATION_KEY_PATTERN = `${STORAGE_PREFIX}-{userId}-{documentId}-annotations`;
const METADATA_KEY = `${STORAGE_PREFIX}-metadata`;

// Storage metadata interface
interface StorageMetadata {
  totalSize: number;
  lastCleanup: Date;
  keyAccessTimes: Record<string, Date>;
}

// Storage error types
export class StorageQuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageQuotaExceededError';
  }
}

export class StorageSerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageSerializationError';
  }
}

export class StorageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageValidationError';
  }
}

/**
 * LocalStorageService handles persistent storage of user annotations
 * with serialization, quota management, and cleanup utilities
 */
export class LocalStorageService {
  private static instance: LocalStorageService;

  private constructor() {
    this.initializeMetadata();
  }

  /**
   * Get singleton instance of LocalStorageService
   */
  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  /**
   * Generate storage key for user annotations
   */
  private generateAnnotationKey(userId: string, documentId: string): string {
    return ANNOTATION_KEY_PATTERN
      .replace('{userId}', userId)
      .replace('{documentId}', documentId);
  }

  /**
   * Initialize storage metadata if it doesn't exist
   */
  private initializeMetadata(): void {
    try {
      const metadata = this.getMetadata();
      if (!metadata) {
        const initialMetadata: StorageMetadata = {
          totalSize: 0,
          lastCleanup: new Date(),
          keyAccessTimes: {}
        };
        this.setMetadata(initialMetadata);
      }
    } catch (error) {
      console.warn('Failed to initialize storage metadata:', error);
    }
  }

  /**
   * Get storage metadata
   */
  private getMetadata(): StorageMetadata | null {
    try {
      const metadataStr = localStorage.getItem(METADATA_KEY);
      if (!metadataStr) return null;

      const metadata = JSON.parse(metadataStr);
      return {
        ...metadata,
        lastCleanup: new Date(metadata.lastCleanup),
        keyAccessTimes: Object.entries(metadata.keyAccessTimes).reduce(
          (acc, [key, time]) => ({
            ...acc,
            [key]: new Date(time as string)
          }),
          {}
        )
      };
    } catch (error) {
      console.error('Failed to parse storage metadata:', error);
      return null;
    }
  }

  /**
   * Set storage metadata
   */
  private setMetadata(metadata: StorageMetadata): void {
    try {
      localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save storage metadata:', error);
    }
  }

  /**
   * Update access time for a storage key
   */
  private updateAccessTime(key: string): void {
    const metadata = this.getMetadata();
    if (metadata) {
      metadata.keyAccessTimes[key] = new Date();
      this.setMetadata(metadata);
    }
  }

  /**
   * Calculate current storage usage
   */
  private calculateStorageSize(): number {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    return totalSize;
  }

  /**
   * Check if storage quota would be exceeded
   */
  private wouldExceedQuota(additionalSize: number): boolean {
    const currentSize = this.calculateStorageSize();
    return (currentSize + additionalSize) > MAX_STORAGE_SIZE;
  }

  /**
   * Serialize annotations data for storage
   */
  private serializeAnnotations(annotations: UserAnnotations): string {
    try {
      // Convert Date objects to ISO strings for serialization
      const serializable = {
        highlights: annotations.highlights.map(h => ({
          ...h,
          createdAt: h.createdAt.toISOString(),
          updatedAt: h.updatedAt.toISOString()
        })),
        bookmarks: annotations.bookmarks.map(b => ({
          ...b,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString()
        })),
        comments: annotations.comments.map(c => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString()
        })),
        callToActions: annotations.callToActions.map(cta => ({
          ...cta,
          createdAt: cta.createdAt.toISOString(),
          updatedAt: cta.updatedAt.toISOString()
        }))
      };

      return JSON.stringify(serializable);
    } catch (error) {
      throw new StorageSerializationError(`Failed to serialize annotations: ${error}`);
    }
  }

  /**
   * Deserialize annotations data from storage
   */
  private deserializeAnnotations(data: string): UserAnnotations {
    try {
      const parsed = JSON.parse(data);
      
      // Convert ISO strings back to Date objects
      const annotations: UserAnnotations = {
        highlights: parsed.highlights.map((h: any) => ({
          ...h,
          createdAt: new Date(h.createdAt),
          updatedAt: new Date(h.updatedAt)
        })),
        bookmarks: parsed.bookmarks.map((b: any) => ({
          ...b,
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt)
        })),
        comments: parsed.comments.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        })),
        callToActions: parsed.callToActions.map((cta: any) => ({
          ...cta,
          createdAt: new Date(cta.createdAt),
          updatedAt: new Date(cta.updatedAt)
        }))
      };

      // Validate deserialized data
      if (!validateUserAnnotations(annotations)) {
        throw new StorageValidationError('Deserialized annotations failed validation');
      }

      return annotations;
    } catch (error) {
      if (error instanceof StorageValidationError) {
        throw error;
      }
      throw new StorageSerializationError(`Failed to deserialize annotations: ${error}`);
    }
  }

  /**
   * Clean up old or least recently used storage entries
   */
  private performCleanup(): void {
    const metadata = this.getMetadata();
    if (!metadata) return;

    const currentSize = this.calculateStorageSize();
    if (currentSize < MAX_STORAGE_SIZE * CLEANUP_THRESHOLD) return;

    // Get all annotation keys sorted by last access time (oldest first)
    const annotationKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX) && key.includes('-annotations'))
      .sort((a, b) => {
        const timeA = metadata.keyAccessTimes[a] || new Date(0);
        const timeB = metadata.keyAccessTimes[b] || new Date(0);
        return timeA.getTime() - timeB.getTime();
      });

    // Remove oldest entries until we're under the cleanup threshold
    let removedSize = 0;
    const targetSize = MAX_STORAGE_SIZE * (CLEANUP_THRESHOLD - 0.1); // 10% buffer

    for (const key of annotationKeys) {
      if (currentSize - removedSize <= targetSize) break;

      const value = localStorage.getItem(key);
      if (value) {
        removedSize += key.length + value.length;
        localStorage.removeItem(key);
        delete metadata.keyAccessTimes[key];
      }
    }

    // Update metadata
    metadata.lastCleanup = new Date();
    metadata.totalSize = currentSize - removedSize;
    this.setMetadata(metadata);

    console.log(`Storage cleanup completed. Removed ${removedSize} bytes from ${annotationKeys.length} entries.`);
  }

  /**
   * Save user annotations to local storage
   */
  public saveAnnotations(userId: string, documentId: string, annotations: UserAnnotations): void {
    if (!userId?.trim() || !documentId?.trim()) {
      throw new Error('User ID and document ID are required');
    }

    if (!validateUserAnnotations(annotations)) {
      throw new StorageValidationError('Invalid annotations data provided');
    }

    const key = this.generateAnnotationKey(userId, documentId);
    const serializedData = this.serializeAnnotations(annotations);

    // Check quota before saving
    const existingData = localStorage.getItem(key);
    const existingSize = existingData ? existingData.length + key.length : 0;
    const newSize = serializedData.length + key.length;
    const additionalSize = newSize - existingSize;

    if (this.wouldExceedQuota(additionalSize)) {
      // Try cleanup first
      this.performCleanup();
      
      // Check again after cleanup
      if (this.wouldExceedQuota(additionalSize)) {
        throw new StorageQuotaExceededError(
          `Storage quota would be exceeded. Current size: ${this.calculateStorageSize()}, Additional: ${additionalSize}, Limit: ${MAX_STORAGE_SIZE}`
        );
      }
    }

    try {
      localStorage.setItem(key, serializedData);
      this.updateAccessTime(key);
    } catch (error: any) {
      if ((error instanceof DOMException && error.code === 22) || 
          (error.name === 'QuotaExceededError' && error.code === 22)) {
        throw new StorageQuotaExceededError('Browser storage quota exceeded');
      }
      throw new Error(`Failed to save annotations: ${error}`);
    }
  }

  /**
   * Load user annotations from local storage
   */
  public loadAnnotations(userId: string, documentId: string): UserAnnotations {
    if (!userId?.trim() || !documentId?.trim()) {
      throw new Error('User ID and document ID are required');
    }

    const key = this.generateAnnotationKey(userId, documentId);
    const data = localStorage.getItem(key);

    if (!data) {
      // Return empty annotations if none exist
      return {
        highlights: [],
        bookmarks: [],
        comments: [],
        callToActions: []
      };
    }

    this.updateAccessTime(key);
    
    try {
      return this.deserializeAnnotations(data);
    } catch (error) {
      if (error instanceof StorageValidationError) {
        // If it's a validation error, clear storage and return empty annotations
        console.warn('🧹 Storage validation failed, clearing storage for user:', userId, 'document:', documentId);
        this.deleteAnnotations(userId, documentId);
        return {
          highlights: [],
          comments: [],
          bookmarks: [],
          callToActions: []
        };
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Delete user annotations from local storage
   */
  public deleteAnnotations(userId: string, documentId: string): void {
    if (!userId?.trim() || !documentId?.trim()) {
      throw new Error('User ID and document ID are required');
    }

    const key = this.generateAnnotationKey(userId, documentId);
    localStorage.removeItem(key);

    // Update metadata
    const metadata = this.getMetadata();
    if (metadata && metadata.keyAccessTimes[key]) {
      delete metadata.keyAccessTimes[key];
      this.setMetadata(metadata);
    }
  }

  /**
   * Check if annotations exist for a user and document
   */
  public hasAnnotations(userId: string, documentId: string): boolean {
    if (!userId?.trim() || !documentId?.trim()) {
      return false;
    }

    const key = this.generateAnnotationKey(userId, documentId);
    return localStorage.getItem(key) !== null;
  }

  /**
   * Get all document IDs that have annotations for a user
   */
  public getUserDocuments(userId: string): string[] {
    if (!userId?.trim()) {
      return [];
    }

    const userPrefix = `${STORAGE_PREFIX}-${userId}-`;
    const documentIds: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(userPrefix) && key.endsWith('-annotations')) {
        // Extract document ID from key
        const documentId = key
          .replace(userPrefix, '')
          .replace('-annotations', '');
        documentIds.push(documentId);
      }
    }

    return documentIds;
  }

  /**
   * Get storage usage statistics
   */
  public getStorageStats(): {
    totalSize: number;
    maxSize: number;
    usagePercentage: number;
    entryCount: number;
  } {
    const totalSize = this.calculateStorageSize();
    const entryCount = Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .length;

    return {
      totalSize,
      maxSize: MAX_STORAGE_SIZE,
      usagePercentage: (totalSize / MAX_STORAGE_SIZE) * 100,
      entryCount
    };
  }

  /**
   * Force cleanup of storage
   */
  public forceCleanup(): void {
    this.performCleanup();
  }

  /**
   * Clear all storage data (for testing or reset purposes)
   */
  public clearAllData(): void {
    const keysToRemove: string[] = [];
    
    // Collect all keys that start with our prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Reinitialize metadata
    this.initializeMetadata();
  }
}

// Export singleton instance
export const localStorageService = LocalStorageService.getInstance();