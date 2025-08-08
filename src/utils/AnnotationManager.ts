import { 
  UserAnnotations, 
  Highlight, 
  Bookmark, 
  Comment, 
  CallToAction,
  TextSelection,
  AreaCoordinates,
  RectangleCoordinates,
  createHighlight,
  createBookmark,
  createComment,
  createCallToAction,
  validateHighlight,
  validateBookmark,
  validateComment,
  validateCallToAction
} from '../types/annotation.types';
import { LocalStorageService } from './LocalStorageService';
import { handleAnnotationError, handleStorageError } from './errorHandling';

// Annotation manager error types
export class AnnotationNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnnotationNotFoundError';
  }
}

export class InvalidAnnotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAnnotationError';
  }
}

/**
 * AnnotationManager provides CRUD operations for all annotation types
 * with user-specific data isolation and persistence
 */
export class AnnotationManager {
  private static instance: AnnotationManager;
  private storageService: LocalStorageService;

  private constructor(storageService?: LocalStorageService) {
    this.storageService = storageService || LocalStorageService.getInstance();
  }

  /**
   * Get singleton instance of AnnotationManager
   */
  public static getInstance(storageService?: LocalStorageService): AnnotationManager {
    if (!AnnotationManager.instance) {
      AnnotationManager.instance = new AnnotationManager(storageService);
    }
    return AnnotationManager.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    AnnotationManager.instance = undefined as any;
  }

  /**
   * Generate unique ID for annotations
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all annotations for a user and document
   */
  public getAnnotations(userId: string, documentId: string): UserAnnotations {
    if (!userId?.trim() || !documentId?.trim()) {
      throw new Error('User ID and document ID are required');
    }

    return this.storageService.loadAnnotations(userId, documentId);
  }

  /**
   * Save annotations to storage
   */
  private saveAnnotations(userId: string, documentId: string, annotations: UserAnnotations): void {
    try {
      this.storageService.saveAnnotations(userId, documentId, annotations);
    } catch (error) {
      const storageError = error instanceof Error ? error : new Error('Failed to save annotations');
      handleStorageError(storageError, 'save_annotations');
      throw storageError;
    }
  }

  // HIGHLIGHT OPERATIONS

  /**
   * Create a new highlight
   */
  public createHighlight(
    userId: string,
    documentId: string,
    selection: TextSelection,
    color: string = '#ffff00'
  ): Highlight {
    try {
      if (!userId?.trim() || !documentId?.trim()) {
        throw new Error('User ID and document ID are required');
      }

      if (!selection?.text?.trim()) {
        throw new InvalidAnnotationError('Text selection is required for highlights');
      }

      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new InvalidAnnotationError('Invalid color format. Use hex format like #ffff00');
      }

      const id = this.generateId();
      const highlight = createHighlight(
        id,
        userId,
        documentId,
        selection.pageNumber,
        selection.startOffset,
        selection.endOffset,
        selection.text,
        color,
        selection.coordinates
      );

      const annotations = this.getAnnotations(userId, documentId);
      annotations.highlights.push(highlight);
      this.saveAnnotations(userId, documentId, annotations);

      return highlight;
    } catch (error) {
      const annotationError = error instanceof Error ? error : new Error('Failed to create highlight');
      handleAnnotationError(annotationError, 'create', 'highlight');
      throw annotationError;
    }
  }

  /**
   * Update an existing highlight
   */
  public updateHighlight(
    userId: string,
    documentId: string,
    highlightId: string,
    updates: Partial<Pick<Highlight, 'color' | 'selectedText'>>
  ): Highlight {
    if (!userId?.trim() || !documentId?.trim() || !highlightId?.trim()) {
      throw new Error('User ID, document ID, and highlight ID are required');
    }

    const annotations = this.getAnnotations(userId, documentId);
    const highlightIndex = annotations.highlights.findIndex(h => h.id === highlightId);

    if (highlightIndex === -1) {
      throw new AnnotationNotFoundError(`Highlight with ID ${highlightId} not found`);
    }

    const highlight = annotations.highlights[highlightIndex];
    const updatedHighlight = {
      ...highlight,
      ...updates,
      updatedAt: new Date()
    };

    // Validate updated highlight
    if (!validateHighlight(updatedHighlight)) {
      throw new InvalidAnnotationError('Updated highlight data is invalid');
    }

    annotations.highlights[highlightIndex] = updatedHighlight;
    this.saveAnnotations(userId, documentId, annotations);

    return updatedHighlight;
  }

  /**
   * Delete a highlight
   */
  public deleteHighlight(userId: string, documentId: string, highlightId: string): void {
    if (!userId?.trim() || !documentId?.trim() || !highlightId?.trim()) {
      throw new Error('User ID, document ID, and highlight ID are required');
    }

    const annotations = this.getAnnotations(userId, documentId);
    const initialLength = annotations.highlights.length;
    annotations.highlights = annotations.highlights.filter(h => h.id !== highlightId);

    if (annotations.highlights.length === initialLength) {
      throw new AnnotationNotFoundError(`Highlight with ID ${highlightId} not found`);
    }

    this.saveAnnotations(userId, documentId, annotations);
  }

  /**
   * Get highlights for a specific page
   */
  public getHighlightsByPage(userId: string, documentId: string, pageNumber: number): Highlight[] {
    const annotations = this.getAnnotations(userId, documentId);
    return annotations.highlights.filter(h => h.pageNumber === pageNumber);
  }

  // BOOKMARK OPERATIONS

  /**
   * Create a new bookmark
   */
  public createBookmark(
    userId: string,
    documentId: string,
    pageNumber: number,
    title: string,
    description?: string
  ): Bookmark {
    if (!userId?.trim() || !documentId?.trim()) {
      throw new Error('User ID and document ID are required');
    }

    if (!title?.trim()) {
      throw new InvalidAnnotationError('Title is required for bookmarks');
    }

    if (pageNumber <= 0 || !Number.isInteger(pageNumber)) {
      throw new InvalidAnnotationError('Page number must be a positive integer');
    }

    const id = this.generateId();
    const bookmark = createBookmark(id, userId, documentId, pageNumber, title, description);

    const annotations = this.getAnnotations(userId, documentId);
    annotations.bookmarks.push(bookmark);
    this.saveAnnotations(userId, documentId, annotations);

    return bookmark;
  }

  /**
   * Update an existing bookmark
   */
  public updateBookmark(
    userId: string,
    documentId: string,
    bookmarkId: string,
    updates: Partial<Pick<Bookmark, 'title' | 'description'>>
  ): Bookmark {
    if (!userId?.trim() || !documentId?.trim() || !bookmarkId?.trim()) {
      throw new Error('User ID, document ID, and bookmark ID are required');
    }

    const annotations = this.getAnnotations(userId, documentId);
    const bookmarkIndex = annotations.bookmarks.findIndex(b => b.id === bookmarkId);

    if (bookmarkIndex === -1) {
      throw new AnnotationNotFoundError(`Bookmark with ID ${bookmarkId} not found`);
    }

    const bookmark = annotations.bookmarks[bookmarkIndex];
    const updatedBookmark = {
      ...bookmark,
      ...updates,
      updatedAt: new Date()
    };

    // Validate updated bookmark
    if (!validateBookmark(updatedBookmark)) {
      throw new InvalidAnnotationError('Updated bookmark data is invalid');
    }

    annotations.bookmarks[bookmarkIndex] = updatedBookmark;
    this.saveAnnotations(userId, documentId, annotations);

    return updatedBookmark;
  }

  /**
   * Delete a bookmark
   */
  public deleteBookmark(userId: string, documentId: string, bookmarkId: string): void {
    if (!userId?.trim() || !documentId?.trim() || !bookmarkId?.trim()) {
      throw new Error('User ID, document ID, and bookmark ID are required');
    }

    const annotations = this.getAnnotations(userId, documentId);
    const initialLength = annotations.bookmarks.length;
    annotations.bookmarks = annotations.bookmarks.filter(b => b.id !== bookmarkId);

    if (annotations.bookmarks.length === initialLength) {
      throw new AnnotationNotFoundError(`Bookmark with ID ${bookmarkId} not found`);
    }

    this.saveAnnotations(userId, documentId, annotations);
  }

  /**
   * Get bookmarks sorted by page number
   */
  public getBookmarksSorted(userId: string, documentId: string): Bookmark[] {
    const annotations = this.getAnnotations(userId, documentId);
    return annotations.bookmarks.sort((a, b) => a.pageNumber - b.pageNumber);
  }

  // COMMENT OPERATIONS

  /**
   * Create a new comment
   */
  public createComment(
    userId: string,
    documentId: string,
    pageNumber: number,
    content: string,
    coordinates: AreaCoordinates
  ): Comment {
    if (!userId?.trim() || !documentId?.trim()) {
      throw new Error('User ID and document ID are required');
    }

    if (!content?.trim()) {
      throw new InvalidAnnotationError('Content is required for comments');
    }

    if (pageNumber <= 0 || !Number.isInteger(pageNumber)) {
      throw new InvalidAnnotationError('Page number must be a positive integer');
    }

    if (!coordinates || coordinates.x < 0 || coordinates.y < 0) {
      throw new InvalidAnnotationError('Valid coordinates are required for comments');
    }

    const id = this.generateId();
    const comment = createComment(id, userId, documentId, pageNumber, content, coordinates);

    const annotations = this.getAnnotations(userId, documentId);
    annotations.comments.push(comment);
    this.saveAnnotations(userId, documentId, annotations);

    return comment;
  }

  /**
   * Update an existing comment
   */
  public updateComment(
    userId: string,
    documentId: string,
    commentId: string,
    updates: Partial<Pick<Comment, 'content'>>
  ): Comment {
    if (!userId?.trim() || !documentId?.trim() || !commentId?.trim()) {
      throw new Error('User ID, document ID, and comment ID are required');
    }

    const annotations = this.getAnnotations(userId, documentId);
    const commentIndex = annotations.comments.findIndex(c => c.id === commentId);

    if (commentIndex === -1) {
      throw new AnnotationNotFoundError(`Comment with ID ${commentId} not found`);
    }

    const comment = annotations.comments[commentIndex];
    const updatedComment = {
      ...comment,
      ...updates,
      updatedAt: new Date()
    };

    // Validate updated comment
    if (!validateComment(updatedComment)) {
      throw new InvalidAnnotationError('Updated comment data is invalid');
    }

    annotations.comments[commentIndex] = updatedComment;
    this.saveAnnotations(userId, documentId, annotations);

    return updatedComment;
  }

  /**
   * Delete a comment
   */
  public deleteComment(userId: string, documentId: string, commentId: string): void {
    if (!userId?.trim() || !documentId?.trim() || !commentId?.trim()) {
      throw new Error('User ID, document ID, and comment ID are required');
    }

    const annotations = this.getAnnotations(userId, documentId);
    const initialLength = annotations.comments.length;
    annotations.comments = annotations.comments.filter(c => c.id !== commentId);

    if (annotations.comments.length === initialLength) {
      throw new AnnotationNotFoundError(`Comment with ID ${commentId} not found`);
    }

    this.saveAnnotations(userId, documentId, annotations);
  }

  /**
   * Get comments for a specific page
   */
  public getCommentsByPage(userId: string, documentId: string, pageNumber: number): Comment[] {
    const annotations = this.getAnnotations(userId, documentId);
    return annotations.comments.filter(c => c.pageNumber === pageNumber);
  }

  // CALL-TO-ACTION OPERATIONS

  /**
   * Create a new call-to-action
   */
  public createCallToAction(
    userId: string,
    documentId: string,
    pageNumber: number,
    url: string,
    label: string,
    coordinates: RectangleCoordinates
  ): CallToAction {
    if (!userId?.trim() || !documentId?.trim()) {
      throw new Error('User ID and document ID are required');
    }

    if (!url?.trim() || !/^https?:\/\/.+/.test(url)) {
      throw new InvalidAnnotationError('Valid URL is required for call-to-actions');
    }

    if (!label?.trim()) {
      throw new InvalidAnnotationError('Label is required for call-to-actions');
    }

    if (pageNumber <= 0 || !Number.isInteger(pageNumber)) {
      throw new InvalidAnnotationError('Page number must be a positive integer');
    }

    if (!coordinates || coordinates.x < 0 || coordinates.y < 0 || coordinates.width <= 0 || coordinates.height <= 0) {
      throw new InvalidAnnotationError('Valid rectangle coordinates are required for call-to-actions');
    }

    const id = this.generateId();
    const callToAction = createCallToAction(id, userId, documentId, pageNumber, url, label, coordinates);

    const annotations = this.getAnnotations(userId, documentId);
    annotations.callToActions.push(callToAction);
    this.saveAnnotations(userId, documentId, annotations);

    return callToAction;
  }

  /**
   * Update an existing call-to-action
   */
  public updateCallToAction(
    userId: string,
    documentId: string,
    ctaId: string,
    updates: Partial<Pick<CallToAction, 'url' | 'label'>>
  ): CallToAction {
    if (!userId?.trim() || !documentId?.trim() || !ctaId || typeof ctaId !== 'string' || !ctaId.trim()) {
      throw new Error('User ID, document ID, and call-to-action ID are required');
    }

    const annotations = this.getAnnotations(userId, documentId);
    const ctaIndex = annotations.callToActions.findIndex(cta => cta.id === ctaId);

    if (ctaIndex === -1) {
      throw new AnnotationNotFoundError(`Call-to-action with ID ${ctaId} not found`);
    }

    const callToAction = annotations.callToActions[ctaIndex];
    const updatedCallToAction = {
      ...callToAction,
      ...updates,
      updatedAt: new Date()
    };

    // Validate updated call-to-action
    if (!validateCallToAction(updatedCallToAction)) {
      throw new InvalidAnnotationError('Updated call-to-action data is invalid');
    }

    annotations.callToActions[ctaIndex] = updatedCallToAction;
    this.saveAnnotations(userId, documentId, annotations);

    return updatedCallToAction;
  }

  /**
   * Delete a call-to-action
   */
  public deleteCallToAction(userId: string, documentId: string, ctaId: string): void {
    if (!userId?.trim() || !documentId?.trim() || !ctaId?.trim()) {
      throw new Error('User ID, document ID, and call-to-action ID are required');
    }

    const annotations = this.getAnnotations(userId, documentId);
    const initialLength = annotations.callToActions.length;
    annotations.callToActions = annotations.callToActions.filter(cta => cta.id !== ctaId);

    if (annotations.callToActions.length === initialLength) {
      throw new AnnotationNotFoundError(`Call-to-action with ID ${ctaId} not found`);
    }

    this.saveAnnotations(userId, documentId, annotations);
  }

  /**
   * Get call-to-actions for a specific page
   */
  public getCallToActionsByPage(userId: string, documentId: string, pageNumber: number): CallToAction[] {
    const annotations = this.getAnnotations(userId, documentId);
    return annotations.callToActions.filter(cta => cta.pageNumber === pageNumber);
  }

  // UTILITY OPERATIONS

  /**
   * Get all annotations for a specific page
   */
  public getAnnotationsByPage(userId: string, documentId: string, pageNumber: number): {
    highlights: Highlight[];
    comments: Comment[];
    callToActions: CallToAction[];
  } {
    return {
      highlights: this.getHighlightsByPage(userId, documentId, pageNumber),
      comments: this.getCommentsByPage(userId, documentId, pageNumber),
      callToActions: this.getCallToActionsByPage(userId, documentId, pageNumber)
    };
  }

  /**
   * Get annotation counts for a document
   */
  public getAnnotationCounts(userId: string, documentId: string): {
    highlights: number;
    bookmarks: number;
    comments: number;
    callToActions: number;
    total: number;
  } {
    const annotations = this.getAnnotations(userId, documentId);
    const counts = {
      highlights: annotations.highlights.length,
      bookmarks: annotations.bookmarks.length,
      comments: annotations.comments.length,
      callToActions: annotations.callToActions.length,
      total: 0
    };
    counts.total = counts.highlights + counts.bookmarks + counts.comments + counts.callToActions;
    return counts;
  }

  /**
   * Delete all annotations for a document
   */
  public deleteAllAnnotations(userId: string, documentId: string): void {
    if (!userId?.trim() || !documentId?.trim()) {
      throw new Error('User ID and document ID are required');
    }

    this.storageService.deleteAnnotations(userId, documentId);
  }

  /**
   * Check if a document has any annotations
   */
  public hasAnnotations(userId: string, documentId: string): boolean {
    return this.storageService.hasAnnotations(userId, documentId);
  }

  /**
   * Get all documents with annotations for a user
   */
  public getUserDocuments(userId: string): string[] {
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    return this.storageService.getUserDocuments(userId);
  }
}

// Export singleton instance
export const annotationManager = AnnotationManager.getInstance();