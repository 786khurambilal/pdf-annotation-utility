import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { ZoomMode } from '../components/pdf/ZoomControls';

export interface PdfState {
  file: File | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  zoomMode: ZoomMode;
  isLoading: boolean;
  error: string | null;
  documentId: string | null;
}

export type PdfAction =
  | { type: 'SET_FILE'; payload: { file: File; documentId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TOTAL_PAGES'; payload: number }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_SCALE'; payload: number }
  | { type: 'SET_ZOOM_MODE'; payload: ZoomMode }
  | { type: 'RESET' };

const initialState: PdfState = {
  file: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.0,
  zoomMode: 'custom',
  isLoading: false,
  error: null,
  documentId: null,
};

function pdfReducer(state: PdfState, action: PdfAction): PdfState {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        file: action.payload.file,
        documentId: action.payload.documentId,
        currentPage: 1,
        totalPages: 0,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'SET_TOTAL_PAGES':
      return {
        ...state,
        totalPages: action.payload,
      };
    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        currentPage: Math.min(Math.max(1, action.payload), state.totalPages || 1),
      };
    case 'SET_SCALE':
      return {
        ...state,
        scale: action.payload,
      };
    case 'SET_ZOOM_MODE':
      return {
        ...state,
        zoomMode: action.payload,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export interface PdfContextValue {
  state: PdfState;
  setFile: (file: File, documentId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTotalPages: (pages: number) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  setZoomMode: (mode: ZoomMode) => void;
  reset: () => void;
}

const PdfContext = createContext<PdfContextValue | undefined>(undefined);

export interface PdfProviderProps {
  children: ReactNode;
}

export const PdfProvider: React.FC<PdfProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(pdfReducer, initialState);

  const setFile = useCallback((file: File, documentId: string) => {
    dispatch({ type: 'SET_FILE', payload: { file, documentId } });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setTotalPages = useCallback((pages: number) => {
    dispatch({ type: 'SET_TOTAL_PAGES', payload: pages });
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  }, []);

  const setScale = useCallback((scale: number) => {
    dispatch({ type: 'SET_SCALE', payload: scale });
  }, []);

  const setZoomMode = useCallback((mode: ZoomMode) => {
    dispatch({ type: 'SET_ZOOM_MODE', payload: mode });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value: PdfContextValue = {
    state,
    setFile,
    setLoading,
    setError,
    setTotalPages,
    setCurrentPage,
    setScale,
    setZoomMode,
    reset,
  };

  return <PdfContext.Provider value={value}>{children}</PdfContext.Provider>;
};

export const usePdfContext = (): PdfContextValue => {
  const context = useContext(PdfContext);
  if (context === undefined) {
    throw new Error('usePdfContext must be used within a PdfProvider');
  }
  return context;
};