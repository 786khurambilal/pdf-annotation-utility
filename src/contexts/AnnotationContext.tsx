import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  UserAnnotations, 
  Highlight, 
  Bookmark, 
  Comment, 
  CallToAction,
  TextSelection,
  AreaCoordinates,
  RectangleCoordinates
} from '../types/annotation.types';
import { AnnotationManager } from '../utils/AnnotationManager';
import { useUser } from './UserContext';

// Annotation state interface
interface AnnotationState {
  annotations: UserAnnotations;
  isLoading: boolean;
  error: string | null;
  currentDocumentId: string | null;
}

// Annotation actions
type AnnotationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DOCUMENT'; payload: string | null }
  | { type: 'LOAD_ANNOTATIONS'; payload: UserAnnotations }
  | { type: 'ADD_HIGHLIGHT'; payload: Highlight }
  | { type: 'UPDATE_HIGHLIGHT'; payload: Highlight }
  | { type: 'REMOVE_HIGHLIGHT'; payload: string }
  | { type: 'ADD_BOOKMARK'; payload: Bookmark }
  | { type: 'UPDATE_BOOKMARK'; payload: Bookmark }
  | { type: 'REMOVE_BOOKMARK'; payload: string }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'UPDATE_COMMENT'; payload: Comment }
  | { type: 'REMOVE_COMMENT'; payload: string }
  | { type: 'ADD_CALL_TO_ACTION'; payload: CallToAction }
  | { type: 'UPDATE_CALL_TO_ACTION'; payload: CallToAction }
  | { type: 'REMOVE_CALL_TO_ACTION'; payload: string }
  | { type: 'CLEAR_ANNOTATIONS' };

// Initial state
const initialState: AnnotationState = {
  annotations: {
    highlights: [],
    bookmarks: [],
    comments: [],
    callToActions: []
  },
  isLoading: false,
  error: null,
  currentDocumentId: null,
};

// Annotation reducer
const annotationReducer = (state: AnnotationState, action: AnnotationAction): AnnotationState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_DOCUMENT':
      return { ...state, currentDocumentId: action.payload, error: null };
    
    case 'LOAD_ANNOTATIONS':
      return { 
        ...state, 
        annotations: action.payload, 
        isLoading: false, 
        error: null 
      };
    
    case 'ADD_HIGHLIGHT':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          highlights: [...state.annotations.highlights, action.payload]
        },
        error: null
      };
    
    case 'UPDATE_HIGHLIGHT':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          highlights: state.annotations.highlights.map(h => 
            h.id === action.payload.id ? action.payload : h
          )
        },
        error: null
      };
    
    case 'REMOVE_HIGHLIGHT':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          highlights: state.annotations.highlights.filter(h => h.id !== action.payload)
        },
        error: null
      };
    
    case 'ADD_BOOKMARK':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          bookmarks: [...state.annotations.bookmarks, action.payload]
        },
        error: null
      };
    
    case 'UPDATE_BOOKMARK':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          bookmarks: state.annotations.bookmarks.map(b => 
            b.id === action.payload.id ? action.payload : b
          )
        },
        error: null
      };
    
    case 'REMOVE_BOOKMARK':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          bookmarks: state.annotations.bookmarks.filter(b => b.id !== action.payload)
        },
        error: null
      };
    
    case 'ADD_COMMENT':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          comments: [...state.annotations.comments, action.payload]
        },
        error: null
      };
    
    case 'UPDATE_COMMENT':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          comments: state.annotations.comments.map(c => 
            c.id === action.payload.id ? action.payload : c
          )
        },
        error: null
      };
    
    case 'REMOVE_COMMENT':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          comments: state.annotations.comments.filter(c => c.id !== action.payload)
        },
        error: null
      };
    
    case 'ADD_CALL_TO_ACTION':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          callToActions: [...state.annotations.callToActions, action.payload]
        },
        error: null
      };
    
    case 'UPDATE_CALL_TO_ACTION':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          callToActions: state.annotations.callToActions.map(cta => 
            cta.id === action.payload.id ? action.payload : cta
          )
        },
        error: null
      };
    
    case 'REMOVE_CALL_TO_ACTION':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          callToActions: state.annotations.callToActions.filter(cta => cta.id !== action.payload)
        },
        error: null
      };
    
    case 'CLEAR_ANNOTATIONS':
      return {
        ...state,
        annotations: {
          highlights: [],
          bookmarks: [],
          comments: [],
          callToActions: []
        },
        error: null
      };
    
    default:
      return state;
  }
};

// Context interface
interface AnnotationContextType {
  // State
  annotations: UserAnnotations;
  isLoading: boolean;
  error: string | null;
  currentDocumentId: string | null;
  
  // Document operations
  loadDocument: (documentId: string) => Promise<void>;
  clearDocument: () => void;
  
  // Highlight operations
  createHighlight: (selection: TextSelection, color?: string) => Promise<Highlight>;
  updateHighlight: (highlightId: string, updates: Partial<Pick<Highlight, 'color' | 'selectedText'>>) => Promise<Highlight>;
  deleteHighlight: (highlightId: string) => Promise<void>;
  getHighlightsByPage: (pageNumber: number) => Highlight[];
  
  // Bookmark operations
  createBookmark: (pageNumber: number, title: string, description?: string) => Promise<Bookmark>;
  updateBookmark: (bookmarkId: string, updates: Partial<Pick<Bookmark, 'title' | 'description'>>) => Promise<Bookmark>;
  deleteBookmark: (bookmarkId: string) => Promise<void>;
  getBookmarksSorted: () => Bookmark[];
  
  // Comment operations
  createComment: (pageNumber: number, content: string, coordinates: AreaCoordinates) => Promise<Comment>;
  updateComment: (commentId: string, updates: Partial<Pick<Comment, 'content'>>) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;
  getCommentsByPage: (pageNumber: number) => Comment[];
  
  // Call-to-action operations
  createCallToAction: (pageNumber: number, url: string, label: string, coordinates: RectangleCoordinates, options?: { isAutoGenerated?: boolean; qrCodeContent?: string }) => Promise<CallToAction>;
  updateCallToAction: (ctaId: string, updates: { url: string; label: string }) => Promise<CallToAction>;
  deleteCallToAction: (ctaId: string) => Promise<void>;
  getCallToActionsByPage: (pageNumber: number) => CallToAction[];
  
  // Auto-generated CTA management
  hasAutoGeneratedCTA: (qrCodeContent: string, pageNumber?: number) => boolean;
  getAutoGeneratedCTA: (qrCodeContent: string, pageNumber?: number) => CallToAction | null;
  
  // Utility operations
  getAnnotationsByPage: (pageNumber: number) => { highlights: Highlight[]; comments: Comment[]; callToActions: CallToAction[] };
  getAnnotationCounts: () => { highlights: number; bookmarks: number; comments: number; callToActions: number; total: number };
  clearError: () => void;
}

// Create context
const AnnotationContext = createContext<AnnotationContextType | undefined>(undefined);

// Provider component
interface AnnotationProviderProps {
  children: ReactNode;
  annotationManager?: AnnotationManager;
}

export const AnnotationProvider: React.FC<AnnotationProviderProps> = ({ 
  children, 
  annotationManager = AnnotationManager.getInstance() 
}) => {
  const [state, dispatch] = useReducer(annotationReducer, initialState);
  const { currentUser } = useUser();

  // Clear annotations when user changes
  useEffect(() => {
    if (!currentUser) {
      dispatch({ type: 'CLEAR_ANNOTATIONS' });
      dispatch({ type: 'SET_DOCUMENT', payload: null });
    } else if (state.currentDocumentId) {
      // Reload annotations for new user
      loadDocument(state.currentDocumentId);
    }
  }, [currentUser?.id]);

  const loadDocument = async (documentId: string): Promise<void> => {
    if (!currentUser) {
      dispatch({ type: 'SET_ERROR', payload: 'No user logged in' });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_DOCUMENT', payload: documentId });
      
      const annotations = annotationManager.getAnnotations(currentUser.id, documentId);
      dispatch({ type: 'LOAD_ANNOTATIONS', payload: annotations });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load annotations' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearDocument = (): void => {
    dispatch({ type: 'SET_DOCUMENT', payload: null });
    dispatch({ type: 'CLEAR_ANNOTATIONS' });
  };

  // Highlight operations
  const createHighlight = async (selection: TextSelection, color: string = '#ffff00'): Promise<Highlight> => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }
    
    if (!state.currentDocumentId) {
      throw new Error('No document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const highlight = annotationManager.createHighlight(
        currentUser.id,
        state.currentDocumentId,
        selection,
        color
      );
      dispatch({ type: 'ADD_HIGHLIGHT', payload: highlight });
      return highlight;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create highlight';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateHighlight = async (
    highlightId: string, 
    updates: Partial<Pick<Highlight, 'color' | 'selectedText'>>
  ): Promise<Highlight> => {
    if (!currentUser || !state.currentDocumentId) {
      throw new Error('No user logged in or document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const updatedHighlight = annotationManager.updateHighlight(
        currentUser.id,
        state.currentDocumentId,
        highlightId,
        updates
      );
      
      dispatch({ type: 'UPDATE_HIGHLIGHT', payload: updatedHighlight });
      return updatedHighlight;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update highlight';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteHighlight = async (highlightId: string): Promise<void> => {
    if (!currentUser || !state.currentDocumentId) {
      throw new Error('No user logged in or document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      annotationManager.deleteHighlight(currentUser.id, state.currentDocumentId, highlightId);
      dispatch({ type: 'REMOVE_HIGHLIGHT', payload: highlightId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete highlight';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getHighlightsByPage = (pageNumber: number): Highlight[] => {
    return state.annotations.highlights.filter(h => h.pageNumber === pageNumber);
  };

  // Bookmark operations
  const createBookmark = async (pageNumber: number, title: string, description?: string): Promise<Bookmark> => {
    if (!currentUser || !state.currentDocumentId) {
      throw new Error('No user logged in or document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const bookmark = annotationManager.createBookmark(
        currentUser.id,
        state.currentDocumentId,
        pageNumber,
        title,
        description
      );
      
      dispatch({ type: 'ADD_BOOKMARK', payload: bookmark });
      return bookmark;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create bookmark';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateBookmark = async (
    bookmarkId: string, 
    updates: Partial<Pick<Bookmark, 'title' | 'description'>>
  ): Promise<Bookmark> => {
    if (!currentUser || !state.currentDocumentId) {
      throw new Error('No user logged in or document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const updatedBookmark = annotationManager.updateBookmark(
        currentUser.id,
        state.currentDocumentId,
        bookmarkId,
        updates
      );
      
      dispatch({ type: 'UPDATE_BOOKMARK', payload: updatedBookmark });
      return updatedBookmark;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update bookmark';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteBookmark = async (bookmarkId: string): Promise<void> => {
    if (!currentUser || !state.currentDocumentId) {
      throw new Error('No user logged in or document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      annotationManager.deleteBookmark(currentUser.id, state.currentDocumentId, bookmarkId);
      dispatch({ type: 'REMOVE_BOOKMARK', payload: bookmarkId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete bookmark';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getBookmarksSorted = (): Bookmark[] => {
    return [...state.annotations.bookmarks].sort((a, b) => a.pageNumber - b.pageNumber);
  };

  // Comment operations
  const createComment = async (pageNumber: number, content: string, coordinates: AreaCoordinates): Promise<Comment> => {
    if (!currentUser || !state.currentDocumentId) {
      throw new Error('No user logged in or document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const comment = annotationManager.createComment(
        currentUser.id,
        state.currentDocumentId,
        pageNumber,
        content,
        coordinates
      );
      
      dispatch({ type: 'ADD_COMMENT', payload: comment });
      return comment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create comment';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateComment = async (
    commentId: string, 
    updates: Partial<Pick<Comment, 'content'>>
  ): Promise<Comment> => {
    if (!currentUser || !state.currentDocumentId) {
      throw new Error('No user logged in or document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const updatedComment = annotationManager.updateComment(
        currentUser.id,
        state.currentDocumentId,
        commentId,
        updates
      );
      
      dispatch({ type: 'UPDATE_COMMENT', payload: updatedComment });
      return updatedComment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update comment';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteComment = async (commentId: string): Promise<void> => {
    if (!currentUser || !state.currentDocumentId) {
      throw new Error('No user logged in or document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      annotationManager.deleteComment(currentUser.id, state.currentDocumentId, commentId);
      dispatch({ type: 'REMOVE_COMMENT', payload: commentId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete comment';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getCommentsByPage = (pageNumber: number): Comment[] => {
    return state.annotations.comments.filter(c => c.pageNumber === pageNumber);
  };

  // Call-to-action operations
  const createCallToAction = async (
    pageNumber: number, 
    url: string, 
    label: string, 
    coordinates: RectangleCoordinates,
    options?: { isAutoGenerated?: boolean; qrCodeContent?: string }
  ): Promise<CallToAction> => {
    console.log('🔗 createCallToAction called:', {
      pageNumber,
      url,
      label,
      coordinates,
      isAutoGenerated: options?.isAutoGenerated,
      qrCodeContent: options?.qrCodeContent,
      hasUser: !!currentUser,
      documentId: state.currentDocumentId
    });

    if (!currentUser || !state.currentDocumentId) {
      const error = 'No user logged in or document loaded';
      console.error('❌ createCallToAction failed:', error);
      throw new Error(error);
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const callToAction = annotationManager.createCallToAction(
        currentUser.id,
        state.currentDocumentId,
        pageNumber,
        url,
        label,
        coordinates,
        options?.isAutoGenerated,
        options?.qrCodeContent
      );
      
      console.log('✅ CTA created successfully:', callToAction);
      dispatch({ type: 'ADD_CALL_TO_ACTION', payload: callToAction });
      return callToAction;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create call-to-action';
      console.error('❌ createCallToAction error:', errorMessage);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateCallToAction = async (
    ctaId: string, 
    updates: { url: string; label: string }
  ): Promise<CallToAction> => {
    if (!currentUser || !state.currentDocumentId) {
      throw new Error('No user logged in or document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const updatedCallToAction = annotationManager.updateCallToAction(
        currentUser.id,
        state.currentDocumentId,
        ctaId,
        updates
      );
      
      dispatch({ type: 'UPDATE_CALL_TO_ACTION', payload: updatedCallToAction });
      return updatedCallToAction;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update call-to-action';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteCallToAction = async (ctaId: string): Promise<void> => {
    if (!currentUser || !state.currentDocumentId) {
      throw new Error('No user logged in or document loaded');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      annotationManager.deleteCallToAction(currentUser.id, state.currentDocumentId, ctaId);
      dispatch({ type: 'REMOVE_CALL_TO_ACTION', payload: ctaId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete call-to-action';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getCallToActionsByPage = (pageNumber: number): CallToAction[] => {
    return state.annotations.callToActions.filter(cta => cta.pageNumber === pageNumber);
  };

  // Auto-generated CTA management
  const hasAutoGeneratedCTA = (qrCodeContent: string, pageNumber?: number): boolean => {
    if (!currentUser || !state.currentDocumentId) {
      return false;
    }
    
    return annotationManager.hasAutoGeneratedCTA(currentUser.id, state.currentDocumentId, qrCodeContent, pageNumber);
  };

  const getAutoGeneratedCTA = (qrCodeContent: string, pageNumber?: number): CallToAction | null => {
    if (!currentUser || !state.currentDocumentId) {
      return null;
    }
    
    return annotationManager.getAutoGeneratedCTA(currentUser.id, state.currentDocumentId, qrCodeContent, pageNumber);
  };

  // Utility operations
  const getAnnotationsByPage = (pageNumber: number) => {
    return {
      highlights: getHighlightsByPage(pageNumber),
      comments: getCommentsByPage(pageNumber),
      callToActions: getCallToActionsByPage(pageNumber)
    };
  };

  const getAnnotationCounts = () => {
    const counts = {
      highlights: state.annotations.highlights.length,
      bookmarks: state.annotations.bookmarks.length,
      comments: state.annotations.comments.length,
      callToActions: state.annotations.callToActions.length,
      total: 0
    };
    counts.total = counts.highlights + counts.bookmarks + counts.comments + counts.callToActions;
    return counts;
  };

  const clearError = (): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: AnnotationContextType = {
    annotations: state.annotations,
    isLoading: state.isLoading,
    error: state.error,
    currentDocumentId: state.currentDocumentId,
    loadDocument,
    clearDocument,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    getHighlightsByPage,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    getBookmarksSorted,
    createComment,
    updateComment,
    deleteComment,
    getCommentsByPage,
    createCallToAction,
    updateCallToAction,
    deleteCallToAction,
    getCallToActionsByPage,
    hasAutoGeneratedCTA,
    getAutoGeneratedCTA,
    getAnnotationsByPage,
    getAnnotationCounts,
    clearError,
  };

  return (
    <AnnotationContext.Provider value={contextValue}>
      {children}
    </AnnotationContext.Provider>
  );
};

// Custom hook to use annotation context
export const useAnnotations = (): AnnotationContextType => {
  const context = useContext(AnnotationContext);
  if (context === undefined) {
    throw new Error('useAnnotations must be used within an AnnotationProvider');
  }
  return context;
};

// Alias for consistency
export const useAnnotationContext = useAnnotations;