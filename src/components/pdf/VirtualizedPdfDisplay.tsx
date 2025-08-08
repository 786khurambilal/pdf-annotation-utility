import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import styled from 'styled-components';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

import { ZoomMode } from './ZoomControls';
import { TextSelection, Highlight, Comment, AreaCoordinates } from '../../types/annotation.types';
import { useTextSelection } from '../../hooks/useTextSelection';
import { useResponsive } from '../../hooks/useResponsive';
import { usePDFErrors } from '../../hooks/useErrorHandler';
import { usePageVirtualization, VirtualizationConfig } from '../../hooks/usePageVirtualization';
import { theme } from '../../styles/theme';
import { HighlightOverlay } from '../annotations/HighlightOverlay';
import { HighlightCreator } from '../annotations/HighlightCreator';
import { CommentCreator } from '../annotations/CommentCreator';
import { CommentOverlay } from '../annotations/CommentOverlay';
import { LoadingSpinner, PDFLoadingSpinner, PageLoadingSpinner } from '../common/LoadingSpinner';

interface VirtualizedPdfDisplayProps {
  file: File | null;
  pageNumber?: number;
  scale?: number;
  zoomMode?: ZoomMode;
  highlights?: Highlight[];
  comments?: Comment[];
  virtualizationConfig?: Partial<VirtualizationConfig>;
  onLoadSuccess?: (pdf: any) => void;
  onLoadError?: (error: Error) => void;
  onPageLoadSuccess?: (page: any, pageNumber: number) => void;
  onPageLoadError?: (error: Error, pageNumber: number) => void;
  onTextSelected?: (selection: TextSelection) => void;
  onSelectionCleared?: () => void;
  onHighlightCreate?: (selection: TextSelection, color: string) => void;
  onHighlightClick?: (highlight: Highlight) => void;
  onAreaClick?: (coordinates: AreaCoordinates, pageNumber: number) => void;
  onCommentCreate?: (content: string, coordinates: AreaCoordinates, pageNumber: number) => void;
  onCommentClick?: (comment: Comment) => void;
  onCommentEdit?: (commentId: string, newContent: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentHover?: (comment: Comment | null) => void;
  onScaleChange?: (scale: number) => void;
  onPageChange?: (page: number) => void;
}

interface PdfInfo {
  numPages: number;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const DocumentContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: ${theme.colors.gray100};
  border: 1px solid ${theme.colors.gray300};
  border-radius: ${theme.borderRadius.sm};
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  scroll-behavior: smooth;

  @media (max-width: ${theme.breakpoints.tablet}) {
    border: none;
    border-radius: 0;
  }
`;

const VirtualizedContainer = styled.div<{ totalHeight: number }>`
  position: relative;
  width: 100%;
  height: ${props => props.totalHeight}px;
  min-height: 100%;
`;

const PageContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['top', 'zoomMode', 'isTouchDevice', 'isVisible'].includes(prop)
})<{ 
  top: number; 
  zoomMode: ZoomMode; 
  isTouchDevice: boolean;
  isVisible: boolean;
}>`
  position: absolute;
  top: ${props => props.top}px;
  left: 50%;
  transform: translateX(-50%);
  margin: ${theme.spacing.md};
  box-shadow: ${theme.shadows.md};
  border-radius: ${theme.borderRadius.sm};
  overflow: visible;

  display: flex;
  justify-content: center;
  align-items: ${props => props.zoomMode === 'fit-page' ? 'center' : 'flex-start'};
  width: ${props => props.zoomMode === 'fit-width' ? 'calc(100% - 32px)' : 'auto'};
  background-color: white;
  
  /* Optimize rendering for non-visible pages */
  ${props => !props.isVisible && `
    transform: translateX(-50%) translateZ(0);
    will-change: transform;
  `}
  
  /* Enable text selection on all devices */
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  
  /* Touch-friendly interactions - allow manipulation but preserve text selection */
  touch-action: manipulation;
  
  /* Improve text selection appearance */
  ::selection {
    background-color: rgba(0, 123, 255, 0.4);
  }
  
  ::-moz-selection {
    background-color: rgba(0, 123, 255, 0.4);
  }

  /* Mobile-specific improvements */
  @media (max-width: ${theme.breakpoints.tablet}) {
    /* Make text selection more prominent on mobile */
    ::selection {
      background-color: rgba(0, 123, 255, 0.5);
    }
    
    ::-moz-selection {
      background-color: rgba(0, 123, 255, 0.5);
    }
    
    /* Improve touch target size */
    font-size: 16px; /* Prevent zoom on iOS */
  }

  @media (max-width: ${theme.breakpoints.tablet}) {
    margin: ${theme.spacing.sm};
    width: ${props => props.zoomMode === 'fit-width' ? 'calc(100% - 16px)' : 'auto'};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    margin: ${theme.spacing.xs};
    width: ${props => props.zoomMode === 'fit-width' ? 'calc(100% - 8px)' : 'auto'};
  }
`;

const PlaceholderPage = styled.div<{ top: number; height: number }>`
  position: absolute;
  top: ${props => props.top}px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: ${props => props.height}px;
  margin: ${theme.spacing.md};
  background-color: ${theme.colors.gray200};
  border-radius: ${theme.borderRadius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.gray500};
  font-size: ${theme.fontSizes.sm};
  
  @media (max-width: ${theme.breakpoints.tablet}) {
    width: calc(100% - 32px);
    margin: ${theme.spacing.sm};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    width: calc(100% - 16px);
    margin: ${theme.spacing.xs};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  padding: ${theme.spacing.md};
`;

const ErrorMessage = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.danger};
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: ${theme.borderRadius.sm};
  margin: ${theme.spacing.md};
  text-align: center;

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.md};
    margin: ${theme.spacing.sm};
  }
`;

const ErrorTitle = styled.h3`
  margin: 0 0 ${theme.spacing.md} 0;
  font-size: ${theme.fontSizes.lg};
`;

const ErrorDetails = styled.p`
  margin: 0;
  text-align: center;
  font-size: ${theme.fontSizes.sm};
`;

const NoFileMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.gray600};
  background-color: ${theme.colors.light};
  border: 2px dashed ${theme.colors.gray300};
  border-radius: ${theme.borderRadius.sm};
  margin: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  text-align: center;

  @media (max-width: ${theme.breakpoints.mobile}) {
    margin: ${theme.spacing.sm};
    font-size: ${theme.fontSizes.sm};
  }
`;

const VirtualizedPage: React.FC<{
  pageNumber: number;
  scale: number;
  zoomMode: ZoomMode;
  top: number;
  isVisible: boolean;
  shouldRender: boolean;
  highlights: Highlight[];
  comments: Comment[];
  onPageLoadSuccess?: (page: any, pageNumber: number) => void;
  onPageLoadError?: (error: Error, pageNumber: number) => void;
  onTextSelected?: (selection: TextSelection) => void;
  onHighlightCreate?: (selection: TextSelection, color: string) => void;
  onHighlightClick?: (highlight: Highlight) => void;
  onAreaClick?: (coordinates: AreaCoordinates, pageNumber: number) => void;
  onCommentCreate?: (content: string, coordinates: AreaCoordinates, pageNumber: number) => void;
  onCommentClick?: (comment: Comment) => void;
  onCommentEdit?: (commentId: string, newContent: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentHover?: (comment: Comment | null) => void;
  registerPageElement: (pageNumber: number, element: HTMLElement | null) => void;
  setPageLoading: (pageNumber: number, isLoading: boolean) => void;
  setPageError: (pageNumber: number, error: string | null) => void;
}> = ({
  pageNumber,
  scale,
  zoomMode,
  top,
  isVisible,
  shouldRender,
  highlights,
  comments,
  onPageLoadSuccess,
  onPageLoadError,
  onTextSelected,
  onHighlightCreate,
  onHighlightClick,
  onAreaClick,
  onCommentCreate,
  onCommentClick,
  onCommentEdit,
  onCommentDelete,
  onCommentHover,
  registerPageElement,
  setPageLoading,
  setPageError,
}) => {
  const [showHighlightCreator, setShowHighlightCreator] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<TextSelection | null>(null);
  const [showCommentCreator, setShowCommentCreator] = useState(false);
  const [pendingCommentCoordinates, setPendingCommentCoordinates] = useState<AreaCoordinates | null>(null);
  
  const pageRef = useRef<HTMLDivElement>(null);
  const responsive = useResponsive();

  // Register page element for virtualization
  useEffect(() => {
    registerPageElement(pageNumber, pageRef.current);
    return () => registerPageElement(pageNumber, null);
  }, [pageNumber, registerPageElement]);

  // Text selection hook
  const { currentSelection, clearSelection, isSelecting, setPageElement } = useTextSelection({
    pageNumber,
    scale,
    onTextSelected: (selection: TextSelection) => {
      setPendingSelection(selection);
      setShowHighlightCreator(true);
      onTextSelected?.(selection);
    },
    onSelectionCleared: () => {
      if (!showHighlightCreator) {
        setPendingSelection(null);
      }
    }
  }) as any;

  // Set page element reference for text selection
  useEffect(() => {
    if (pageRef.current) {
      setPageElement(pageRef.current);
    }
  }, [setPageElement]);

  const handlePageLoadSuccess = useCallback((page: any) => {
    setPageLoading(pageNumber, false);
    setPageError(pageNumber, null);
    onPageLoadSuccess?.(page, pageNumber);
  }, [pageNumber, setPageLoading, setPageError, onPageLoadSuccess]);

  const handlePageLoadError = useCallback((error: Error) => {
    setPageLoading(pageNumber, false);
    setPageError(pageNumber, error.message);
    onPageLoadError?.(error, pageNumber);
  }, [pageNumber, setPageLoading, setPageError, onPageLoadError]);

  const handlePageLoadStart = useCallback(() => {
    setPageLoading(pageNumber, true);
    setPageError(pageNumber, null);
  }, [pageNumber, setPageLoading, setPageError]);

  // Handle highlight creation
  const handleHighlightCreate = useCallback((selection: TextSelection, color: string) => {
    onHighlightCreate?.(selection, color);
    setShowHighlightCreator(false);
    setPendingSelection(null);
    clearSelection();
  }, [onHighlightCreate, clearSelection]);

  const handleHighlightCreatorCancel = useCallback(() => {
    setShowHighlightCreator(false);
    setPendingSelection(null);
    clearSelection();
  }, [clearSelection]);

  // Handle area clicks for comment creation
  const handleAreaClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // Only prevent default for mouse events, not touch events (to avoid passive listener warning)
    if ('clientX' in event) {
      event.preventDefault();
    }
    event.stopPropagation();
    
    console.log('💬 VirtualizedPdfDisplay: Area clicked for comment creation');
    
    if (isSelecting || showHighlightCreator) {
      return;
    }

    const pageElement = pageRef.current;
    if (!pageElement) {
      return;
    }

    let clientX: number, clientY: number;
    if ('changedTouches' in event && event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else if ('touches' in event && event.touches.length > 0) {
      const touch = event.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    const rect = pageElement.getBoundingClientRect();
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;

    const coordinates: AreaCoordinates = { x, y };
    
    console.log('💬 Creating comment at coordinates:', coordinates, 'on page', pageNumber);
    
    // Add visual indicator
    const indicator = document.createElement('div');
    indicator.style.position = 'fixed';
    indicator.style.left = `${clientX - 5}px`;
    indicator.style.top = `${clientY - 5}px`;
    indicator.style.width = '10px';
    indicator.style.height = '10px';
    indicator.style.backgroundColor = 'red';
    indicator.style.borderRadius = '50%';
    indicator.style.zIndex = '9999';
    indicator.style.pointerEvents = 'none';
    document.body.appendChild(indicator);
    setTimeout(() => {
      if (document.body.contains(indicator)) {
        document.body.removeChild(indicator);
      }
    }, 2000);
    
    setPendingCommentCoordinates(coordinates);
    setShowCommentCreator(true);
    
    if (onAreaClick) {
      onAreaClick(coordinates, pageNumber);
    }
  }, [isSelecting, showHighlightCreator, scale, pageNumber, onAreaClick]);

  // Handle comment creation
  const handleCommentCreate = useCallback((content: string, coordinates: AreaCoordinates) => {
    onCommentCreate?.(content, coordinates, pageNumber);
    setShowCommentCreator(false);
    setPendingCommentCoordinates(null);
  }, [onCommentCreate, pageNumber]);

  const handleCommentCreatorCancel = useCallback(() => {
    setShowCommentCreator(false);
    setPendingCommentCoordinates(null);
  }, []);

  // Don't render if not in visible range
  if (!shouldRender) {
    return (
      <PlaceholderPage top={top} height={800}>
        Page {pageNumber}
      </PlaceholderPage>
    );
  }

  return (
    <PageContainer 
      ref={pageRef}
      top={top}
      zoomMode={zoomMode} 
      isTouchDevice={responsive.isTouchDevice}
      isVisible={isVisible}
      data-page-number={pageNumber}
      onClick={(e) => {
        console.log('💬 VirtualizedPdfDisplay: PageContainer clicked!');
        handleAreaClick(e);
      }}
      onTouchEnd={(e) => {
        console.log('💬 VirtualizedPdfDisplay: PageContainer touch ended!');
        handleAreaClick(e);
      }}
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        onLoadSuccess={handlePageLoadSuccess}
        onLoadError={handlePageLoadError}
        onLoadStart={handlePageLoadStart}
        loading={
          <LoadingContainer>
            <PageLoadingSpinner pageNumber={pageNumber} />
          </LoadingContainer>
        }
        error={
          <ErrorMessage>
            <ErrorTitle>Failed to Load Page</ErrorTitle>
            <ErrorDetails>
              Page {pageNumber} could not be loaded.
            </ErrorDetails>
          </ErrorMessage>
        }
      />
      
      {/* Highlight overlay */}
      <HighlightOverlay
        highlights={highlights}
        pageNumber={pageNumber}
        scale={scale}
        pageWidth={800}
        pageHeight={1000}
        offsetX={0}
        offsetY={0}
        onHighlightClick={onHighlightClick}
      />
      
      {/* Comment overlay */}
      <CommentOverlay
        comments={comments}
        pageNumber={pageNumber}
        scale={scale}
        onCommentClick={onCommentClick}
        onCommentEdit={onCommentEdit}
        onCommentDelete={onCommentDelete}
        onCommentHover={onCommentHover}
      />
      

      
      {/* Highlight creator modal */}
      <HighlightCreator
        selection={pendingSelection}
        onCreateHighlight={handleHighlightCreate}
        onCancel={handleHighlightCreatorCancel}
        isVisible={showHighlightCreator}
      />
      
      {/* Comment creator modal */}
      <CommentCreator
        coordinates={pendingCommentCoordinates}
        pageNumber={pageNumber}
        onCreateComment={handleCommentCreate}
        onCancel={handleCommentCreatorCancel}
        isVisible={showCommentCreator}
      />
    </PageContainer>
  );
};

export const VirtualizedPdfDisplay: React.FC<VirtualizedPdfDisplayProps> = ({
  file,
  pageNumber = 1,
  scale = 1.0,
  zoomMode = 'custom',
  highlights = [],
  comments = [],
  virtualizationConfig = {},
  onLoadSuccess,
  onLoadError,
  onPageLoadSuccess,
  onPageLoadError,
  onTextSelected,
  onSelectionCleared,
  onHighlightCreate,
  onHighlightClick,
  onAreaClick,
  onCommentCreate,
  onCommentClick,
  onCommentEdit,
  onCommentDelete,
  onCommentHover,
  onScaleChange,
  onPageChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { handlePDFError } = usePDFErrors();

  // Calculate effective scale based on zoom mode
  const calculateScale = useCallback(() => {
    if (zoomMode === 'custom' || !containerSize || !pageSize) {
      return scale;
    }

    const containerPadding = 32;
    const availableWidth = containerSize.width - containerPadding;
    const availableHeight = containerSize.height - containerPadding;

    if (zoomMode === 'fit-width') {
      return availableWidth / pageSize.width;
    }

    if (zoomMode === 'fit-page') {
      const widthScale = availableWidth / pageSize.width;
      const heightScale = availableHeight / pageSize.height;
      return Math.min(widthScale, heightScale);
    }

    return scale;
  }, [zoomMode, scale, containerSize, pageSize]);

  const effectiveScale = calculateScale();

  // Enhanced virtualization config with page size information
  const enhancedVirtualizationConfig = useMemo(() => ({
    ...virtualizationConfig,
    containerHeight: containerSize?.height || 800,
    averagePageHeight: pageSize ? (pageSize.height * effectiveScale) + 32 : 1000,
  }), [virtualizationConfig, containerSize, pageSize, effectiveScale]);

  // Page virtualization hook
  const {
    virtualizedPages,
    visiblePages,
    totalHeight,
    registerPageElement,
    setPageLoading,
    setPageError,
    handleScroll,
    scrollToPage,
    getCacheStats,
  } = usePageVirtualization({
    totalPages: pdfInfo?.numPages || 0,
    currentPage: pageNumber,
    config: enhancedVirtualizationConfig,
    onPageChange,
  });

  // Handle document load success
  const handleDocumentLoadSuccess = useCallback((pdf: any) => {
    setIsLoading(false);
    setError(null);
    const info: PdfInfo = {
      numPages: pdf.numPages
    };
    setPdfInfo(info);
    onLoadSuccess?.(pdf);
  }, [onLoadSuccess]);

  // Handle document load error
  const handleDocumentLoadError = useCallback((error: Error) => {
    setIsLoading(false);
    const errorMessage = `Failed to load PDF: ${error.message}`;
    setError(errorMessage);
    setPdfInfo(null);
    
    handlePDFError(error, file?.name);
    onLoadError?.(error);
  }, [onLoadError, handlePDFError, file?.name]);

  const handleDocumentLoadStart = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  // Handle first page load to get page dimensions
  const handleFirstPageLoadSuccess = useCallback((page: any) => {
    const viewport = page.getViewport({ scale: 1.0 });
    setPageSize({ width: viewport.width, height: viewport.height });
  }, []);

  // Measure container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle scroll events for virtualization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll to current page when it changes externally
  useEffect(() => {
    if (pdfInfo && pageNumber >= 1 && pageNumber <= pdfInfo.numPages) {
      scrollToPage(pageNumber, 'smooth');
    }
  }, [pageNumber, pdfInfo, scrollToPage]);

  // Get annotations for each page
  const getAnnotationsForPage = useCallback((pageNum: number) => {
    return {
      highlights: highlights.filter(h => h.pageNumber === pageNum),
      comments: comments.filter(c => c.pageNumber === pageNum),
    };
  }, [highlights, comments]);

  // If no file is provided, show placeholder
  if (!file) {
    return (
      <Container>
        <NoFileMessage>
          No PDF file selected. Please upload a PDF file to view it here.
        </NoFileMessage>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container>
        <ErrorMessage>
          <ErrorTitle>Error Loading PDF</ErrorTitle>
          <ErrorDetails>{error}</ErrorDetails>
        </ErrorMessage>
      </Container>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <PDFLoadingSpinner fileName={file?.name} />
        </LoadingContainer>
      </Container>
    );
  }

  return (
    <Container>
      <DocumentContainer 
        ref={containerRef}
        data-pdf-container
      >
        <Document
          file={file}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          onLoadStart={handleDocumentLoadStart}
          loading={
            <LoadingContainer>
              <PDFLoadingSpinner fileName={file?.name} />
            </LoadingContainer>
          }
          error={
            <ErrorMessage>
              <ErrorTitle>Failed to Load PDF</ErrorTitle>
              <ErrorDetails>
                The PDF file could not be loaded. Please check that the file is valid and try again.
              </ErrorDetails>
            </ErrorMessage>
          }
        >
          {pdfInfo && (
            <VirtualizedContainer totalHeight={totalHeight}>
              {virtualizedPages.map((pageInfo) => {
                const pageAnnotations = getAnnotationsForPage(pageInfo.pageNumber);
                
                return (
                  <VirtualizedPage
                    key={pageInfo.pageNumber}
                    pageNumber={pageInfo.pageNumber}
                    scale={effectiveScale}
                    zoomMode={zoomMode}
                    top={pageInfo.top}
                    isVisible={pageInfo.isVisible}
                    shouldRender={pageInfo.shouldRender}
                    highlights={pageAnnotations.highlights}
                    comments={pageAnnotations.comments}
                    onPageLoadSuccess={pageInfo.pageNumber === 1 ? handleFirstPageLoadSuccess : onPageLoadSuccess}
                    onPageLoadError={onPageLoadError}
                    onTextSelected={onTextSelected}
                    onHighlightCreate={onHighlightCreate}
                    onHighlightClick={onHighlightClick}
                    onAreaClick={onAreaClick}
                    onCommentCreate={onCommentCreate}
                    onCommentClick={onCommentClick}
                    onCommentEdit={onCommentEdit}
                    onCommentDelete={onCommentDelete}
                    onCommentHover={onCommentHover}
                    registerPageElement={registerPageElement}
                    setPageLoading={setPageLoading}
                    setPageError={setPageError}
                  />
                );
              })}
            </VirtualizedContainer>
          )}
        </Document>
      </DocumentContainer>
    </Container>
  );
};