import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import styled from 'styled-components';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

import { ZoomMode } from './ZoomControls';
import { TextSelection, Highlight, Comment, CallToAction, AreaCoordinates, RectangleCoordinates } from '../../types/annotation.types';
import { useTextSelection } from '../../hooks/useTextSelection';
import { useResponsive } from '../../hooks/useResponsive';
import { usePDFErrors } from '../../hooks/useErrorHandler';
import { applyMobilePDFTextFixes, debugTextSelection, getMobileSelectionInfo, createMobileTouchSelection } from '../../utils/mobileTextSelection';
import { theme } from '../../styles/theme';
import { HighlightOverlay } from '../annotations/HighlightOverlay';
import { HighlightCreator } from '../annotations/HighlightCreator';
import { CommentCreator } from '../annotations/CommentCreator';
import { CommentOverlay } from '../annotations/CommentOverlay';
import { CTAOverlay } from '../annotations/CTAOverlay';
import { CTACreator } from '../annotations/CTACreator';
import { PDFLoadingSpinner, PageLoadingSpinner } from '../common/LoadingSpinner';
import { MobileTextSelectionDebug } from '../debug/MobileTextSelectionDebug';

interface PdfDisplayProps {
  file: File | null;
  pageNumber?: number;
  scale?: number;
  zoomMode?: ZoomMode;
  highlights?: Highlight[];
  comments?: Comment[];
  callToActions?: CallToAction[];
  onLoadSuccess?: (pdf: any) => void;
  onLoadError?: (error: Error) => void;
  onPageLoadSuccess?: (page: any) => void;
  onPageLoadError?: (error: Error) => void;
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
  onCTACreate?: (url: string, label: string, coordinates: RectangleCoordinates, pageNumber: number) => void;
  onCTAClick?: (cta: CallToAction) => void;
  onCTAUpdate?: (ctaId: string, updates: { url: string; label: string }) => void;
  onCTADelete?: (ctaId: string) => void;
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
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: ${theme.colors.gray100};
  border: 1px solid ${theme.colors.gray300};
  border-radius: ${theme.borderRadius.sm};
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
  
  /* Ensure text selection works in container */
  user-select: text;
  -webkit-user-select: text;

  @media (max-width: ${theme.breakpoints.tablet}) {
    border: none;
    border-radius: 0;
    
    /* Mobile-specific text selection */
    -webkit-touch-callout: default;
    -webkit-user-select: text;
    user-select: text;
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

const PageContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['zoomMode', 'isTouchDevice'].includes(prop)
}) <{ zoomMode: ZoomMode; isTouchDevice: boolean }>`
  margin: ${theme.spacing.md};
  box-shadow: ${theme.shadows.md};
  border-radius: ${theme.borderRadius.sm};
  overflow: hidden;

  display: flex;
  justify-content: center;
  align-items: ${props => props.zoomMode === 'fit-page' ? 'center' : 'flex-start'};
  width: ${props => props.zoomMode === 'fit-width' ? '100%' : 'auto'};
  height: ${props => props.zoomMode === 'fit-page' ? '100%' : 'auto'};
  position: relative;
  
  /* Enable text selection on all devices */
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  
  /* Touch-friendly interactions - CRITICAL: Allow text selection on mobile */
  touch-action: ${props => props.isTouchDevice ? 'pan-x pan-y' : 'pan-x pan-y pinch-zoom'};
  
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
      background-color: rgba(0, 123, 255, 0.7);
    }
    
    ::-moz-selection {
      background-color: rgba(0, 123, 255, 0.7);
    }
    
    /* Critical mobile text selection fixes */
    -webkit-touch-callout: default;
    -webkit-user-select: text;
    -khtml-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
    
    /* Remove tap highlights that interfere with selection */
    -webkit-tap-highlight-color: transparent;
    
    /* Prevent iOS zoom on focus */
    font-size: 16px;
    
    /* Ensure text layers are accessible */
    * {
      user-select: text;
      -webkit-user-select: text;
    }
    
    /* PDF.js text layer specific fixes */
    .react-pdf__Page__textContent {
      user-select: text !important;
      -webkit-user-select: text !important;
      pointer-events: auto !important;
    }
    
    .react-pdf__Page__textContent span {
      user-select: text !important;
      -webkit-user-select: text !important;
      pointer-events: auto !important;
    }
  }

  @media (max-width: ${theme.breakpoints.tablet}) {
    margin: ${theme.spacing.sm};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    margin: ${theme.spacing.xs};
  }
`;

export const PdfDisplay: React.FC<PdfDisplayProps> = ({
  file,
  pageNumber = 1,
  scale = 1.0,
  zoomMode = 'custom',
  highlights = [],
  comments = [],
  callToActions = [],
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
  onCTACreate,
  onCTAClick,
  onCTAUpdate,
  onCTADelete,
  onScaleChange,
  onPageChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [showHighlightCreator, setShowHighlightCreator] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<TextSelection | null>(null);
  const [showCommentCreator, setShowCommentCreator] = useState(false);
  const [pendingCommentCoordinates, setPendingCommentCoordinates] = useState<AreaCoordinates | null>(null);
  const [showCTACreator, setShowCTACreator] = useState(false);
  const [pendingCTACoordinates, setPendingCTACoordinates] = useState<RectangleCoordinates | null>(null);

  // Touch gesture state
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState<number>(scale);
  const [lastTouchTime, setLastTouchTime] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const responsive = useResponsive();
  const { handlePDFError } = usePDFErrors();
  // Touch gestures are handled directly in component

  const handleDocumentLoadSuccess = useCallback((pdf: any) => {
    setIsLoading(false);
    setError(null);
    const info: PdfInfo = {
      numPages: pdf.numPages
    };
    setPdfInfo(info);
    onLoadSuccess?.(pdf);
  }, [onLoadSuccess]);

  const handleDocumentLoadError = useCallback((error: Error) => {
    setIsLoading(false);
    const errorMessage = `Failed to load PDF: ${error.message}`;
    setError(errorMessage);
    setPdfInfo(null);

    // Use centralized error handling
    handlePDFError(error, file?.name);
    onLoadError?.(error);
  }, [onLoadError, handlePDFError, file?.name]);

  const handlePageLoadSuccess = useCallback((page: any) => {
    // Store page dimensions for zoom calculations
    const viewport = page.getViewport({ scale: 1.0 });
    setPageSize({ width: viewport.width, height: viewport.height });

    // Apply mobile text selection fixes after page loads
    if (responsive.isMobile) {
      applyMobilePDFTextFixes();

      // Additional aggressive fix - apply again after a longer delay
      setTimeout(() => {
        applyMobilePDFTextFixes();
      }, 2000);
    }

    onPageLoadSuccess?.(page);
  }, [onPageLoadSuccess, responsive.isMobile]);

  const handlePageLoadError = useCallback((error: Error) => {
    const errorMessage = `Failed to load page ${pageNumber}: ${error.message}`;
    setError(errorMessage);

    // Use centralized error handling
    handlePDFError(error, `${file?.name} - Page ${pageNumber}`);
    onPageLoadError?.(error);
  }, [pageNumber, onPageLoadError, handlePDFError, file?.name]);

  const handleDocumentLoadStart = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  // Calculate scale based on zoom mode
  const calculateScale = useCallback(() => {
    if (zoomMode === 'custom' || !containerSize || !pageSize) {
      return scale;
    }

    const containerPadding = 32; // Account for margins and padding
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

  // Handle text selection for highlighting and CTA creation
  const handleTextSelected = useCallback((selection: TextSelection) => {
    const mobileInfo = getMobileSelectionInfo();
    console.log('🖍️ Text selected for highlighting/CTA:', {
      text: selection.text,
      pageNumber: selection.pageNumber,
      coordinates: selection.coordinates,
      isMobile: responsive.isMobile,
      mobileInfo
    });

    // Debug text selection on mobile
    if (responsive.isMobile) {
      debugTextSelection('Text Selected for Highlighting');
    }

    setPendingSelection(selection);

    // Check if Ctrl/Cmd key is held for CTA creation from text selection
    const isCtrlOrCmd = window.event && (window.event.ctrlKey || window.event.metaKey);
    if (isCtrlOrCmd) {
      console.log('🔗 Creating CTA from text selection (Ctrl/Cmd+Select)');
      // Convert text selection coordinates to rectangle coordinates for CTA
      const rectCoordinates: RectangleCoordinates = {
        x: selection.coordinates.x,
        y: selection.coordinates.y,
        width: selection.coordinates.width,
        height: selection.coordinates.height
      };
      setPendingCTACoordinates(rectCoordinates);
      setShowCTACreator(true);
    } else {
      // Show highlight creator by default
      setShowHighlightCreator(true);
    }

    onTextSelected?.(selection);
  }, [onTextSelected, responsive.isMobile]);

  const handleSelectionCleared = useCallback(() => {
    if (!showHighlightCreator) {
      setPendingSelection(null);
    }
    onSelectionCleared?.();
  }, [showHighlightCreator, onSelectionCleared]);

  // Text selection hook
  const { clearSelection, isSelecting, setPageElement } = useTextSelection({
    pageNumber,
    scale: effectiveScale,
    onTextSelected: handleTextSelected,
    onSelectionCleared: handleSelectionCleared
  }) as any;

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

  // Set page element reference for text selection
  useEffect(() => {
    if (pageRef.current) {
      setPageElement(pageRef.current);

      // Initialize custom mobile touch selection if on mobile
      if (responsive.isMobile) {
        createMobileTouchSelection(pageRef.current, (text: string, range: Range) => {
          console.log('📱 Custom mobile selection:', text);

          // Create a TextSelection object manually
          const rect = range.getBoundingClientRect();
          const pageRect = pageRef.current?.getBoundingClientRect();

          if (pageRect) {
            const textSelection: TextSelection = {
              text,
              pageNumber,
              coordinates: {
                x: (rect.left - pageRect.left) / effectiveScale,
                y: (rect.top - pageRect.top) / effectiveScale,
                width: rect.width / effectiveScale,
                height: rect.height / effectiveScale
              }
            };

            handleTextSelected(textSelection);
          }
        });
      }
    }
  }, [setPageElement, pageRef.current, responsive.isMobile, pageNumber, effectiveScale, handleTextSelected]);

  // Continuous mobile text selection monitoring
  useEffect(() => {
    if (!responsive.isMobile) return;

    const interval = setInterval(() => {
      // Check if text layers exist and apply fixes if needed
      const textLayers = document.querySelectorAll('.react-pdf__Page__textContent, .textLayer');
      if (textLayers.length > 0) {
        let needsFix = false;

        textLayers.forEach(layer => {
          if (layer instanceof HTMLElement) {
            const computedStyle = window.getComputedStyle(layer);
            if (computedStyle.userSelect !== 'text' || computedStyle.pointerEvents === 'none') {
              needsFix = true;
            }
          }
        });

        if (needsFix) {
          console.log('📱 Reapplying mobile text selection fixes');
          applyMobilePDFTextFixes();
        }
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [responsive.isMobile]);

  // Handle highlight creation
  const handleHighlightCreate = useCallback(async (selection: TextSelection, color: string) => {
    try {
      await onHighlightCreate?.(selection, color);
    } catch (error) {
      // Handle error silently or show user-friendly message
    }
    setShowHighlightCreator(false);
    setPendingSelection(null);
    clearSelection();
  }, [onHighlightCreate, clearSelection]);

  const handleHighlightCreatorCancel = useCallback(() => {
    setShowHighlightCreator(false);
    setPendingSelection(null);
    clearSelection();
  }, [clearSelection]);

  const handleHighlightClick = useCallback((highlight: Highlight) => {
    onHighlightClick?.(highlight);
  }, [onHighlightClick]);

  // Handle area clicks for comment creation
  const handleAreaClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    console.log('💬 handleAreaClick triggered', {
      isSelecting,
      showHighlightCreator,
      showCommentCreator,
      showCTACreator,
      eventType: event.type
    });

    // Only prevent default for mouse events, not touch events (to avoid passive listener warning)
    if ('clientX' in event) {
      event.preventDefault();
    }
    event.stopPropagation();

    // Only handle clicks if not currently creating highlights
    if (showHighlightCreator) {
      console.log('💬 Skipping comment creation - highlight creation in progress');
      return;
    }

    // Check if there's an active text selection - don't create comments if user is selecting text
    const selection = window.getSelection();
    const hasTextSelection = selection && !selection.isCollapsed && selection.toString().trim().length > 0;

    if (hasTextSelection) {
      console.log('💬 Skipping comment creation - text is selected:', selection.toString());
      return;
    }

    // On mobile, be more conservative about comment creation during text selection
    if (responsive.isMobile && isSelecting) {
      console.log('💬 Skipping comment creation - mobile text selection in progress');
      return;
    }

    // Additional check: if user just finished selecting text, wait a bit
    if (responsive.isMobile && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // If there's a range but no text, user might be in the middle of selecting
      if (range && !range.collapsed && !selection.toString().trim()) {
        console.log('💬 Skipping comment creation - mobile selection range exists but no text yet');
        return;
      }
    }

    const pageElement = pageRef.current;
    if (!pageElement) {
      console.log('💬 No page element found');
      return;
    }

    // Get coordinates from mouse or touch event
    let clientX: number, clientY: number;
    if ('changedTouches' in event && event.changedTouches.length > 0) {
      // Touch end event
      const touch = event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else if ('touches' in event && event.touches.length > 0) {
      // Touch event
      const touch = event.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      // Mouse event
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    const rect = pageElement.getBoundingClientRect();
    const x = (clientX - rect.left) / effectiveScale;
    const y = (clientY - rect.top) / effectiveScale;

    const coordinates: AreaCoordinates = { x, y };

    console.log('💬 Setting up comment creation', { coordinates, pageNumber });

    // Longer delay on mobile to ensure text selection events have finished processing
    const delay = responsive.isMobile ? 500 : 150;
    setTimeout(() => {
      // Double-check that no text is selected after the delay
      const finalSelection = window.getSelection();
      const finalHasText = finalSelection && !finalSelection.isCollapsed && finalSelection.toString().trim().length > 0;

      if (finalHasText) {
        console.log('💬 Canceling comment/CTA creation - text was selected during delay:', finalSelection.toString());
        return;
      }

      // On mobile, also check if we're still in selecting state
      if (responsive.isMobile && isSelecting) {
        console.log('💬 Canceling comment/CTA creation - still selecting on mobile');
        return;
      }

      // Check if Shift key is held for CTA creation
      console.log('🔍 Checking event keys:', {
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey
      });

      if (event.shiftKey) {
        console.log('🔗 Setting up CTA creation (Shift+Click)');
        // Convert area coordinates to rectangle coordinates for CTA
        const rectCoordinates: RectangleCoordinates = {
          x: coordinates.x,
          y: coordinates.y,
          width: 100, // Default width
          height: 30  // Default height
        };
        setPendingCTACoordinates(rectCoordinates);
        setShowCTACreator(true);
      } else {
        console.log('💬 Setting up comment creation (no Shift key)');
        // Set up comment creation
        setPendingCommentCoordinates(coordinates);
        setShowCommentCreator(true);
      }

      if (onAreaClick) {
        onAreaClick(coordinates, pageNumber);
      }
    }, delay);
  }, [isSelecting, showHighlightCreator, showCommentCreator, effectiveScale, pageNumber, onAreaClick]);

  // Handle comment creation
  const handleCommentCreate = useCallback((content: string, coordinates: AreaCoordinates) => {
    console.log('💬 Creating comment with content:', content, 'at coordinates:', coordinates);
    onCommentCreate?.(content, coordinates, pageNumber);
    setShowCommentCreator(false);
    setPendingCommentCoordinates(null);
  }, [onCommentCreate, pageNumber]);

  const handleCommentCreatorCancel = useCallback(() => {
    setShowCommentCreator(false);
    setPendingCommentCoordinates(null);
  }, []);

  // Handle CTA creation
  const handleCTACreate = useCallback((url: string, label: string, coordinates: RectangleCoordinates) => {
    console.log('🔗 PdfDisplay: Creating CTA:', { url, label, coordinates, pageNumber, hasOnCTACreate: !!onCTACreate });
    if (onCTACreate) {
      onCTACreate(url, label, coordinates, pageNumber);
    } else {
      console.error('🔗 No onCTACreate handler provided!');
    }
    setShowCTACreator(false);
    setPendingCTACoordinates(null);
  }, [onCTACreate, pageNumber]);

  const handleCTACreatorCancel = useCallback(() => {
    setShowCTACreator(false);
    setPendingCTACoordinates(null);
  }, []);

  const handleCommentClick = useCallback((comment: Comment) => {
    onCommentClick?.(comment);
  }, [onCommentClick]);

  const handleCommentEdit = useCallback((commentId: string, newContent: string) => {
    onCommentEdit?.(commentId, newContent);
  }, [onCommentEdit]);

  const handleCommentDelete = useCallback((commentId: string) => {
    onCommentDelete?.(commentId);
  }, [onCommentDelete]);

  const handleCommentHover = useCallback((comment: Comment | null) => {
    onCommentHover?.(comment);
  }, [onCommentHover]);

  // CTA handlers
  const handleCTAClick = useCallback((cta: CallToAction) => {
    console.log('🔗 CTA clicked:', cta);
    onCTAClick?.(cta);
  }, [onCTAClick]);

  const handleCTAUpdate = useCallback((ctaId: string, updates: { url: string; label: string }) => {
    console.log('🔗 CTA update:', ctaId, updates);
    onCTAUpdate?.(ctaId, updates);
  }, [onCTAUpdate]);

  const handleCTADelete = useCallback((ctaId: string) => {
    console.log('🔗 CTA delete:', ctaId);
    onCTADelete?.(ctaId);
  }, [onCTADelete]);

  // Touch gesture handlers
  const getTouchDistance = useCallback((touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touches = event.touches;
    const currentTime = Date.now();

    if (touches.length === 2) {
      // Pinch gesture start - prevent text selection during pinch
      const distance = getTouchDistance(touches);
      setTouchStartDistance(distance);
      setTouchStartScale(scale);
      event.preventDefault();
    } else if (touches.length === 1) {
      // Single touch - prioritize text selection on mobile
      const touch = touches[0];
      setTouchStartX(touch.clientX);

      // On mobile, be much more conservative about double-tap zoom
      if (responsive.isMobile) {
        // Only handle double tap if it's very quick and there's no text selection
        if (currentTime - lastTouchTime < 250) {
          const selection = window.getSelection();
          const hasTextSelection = selection && !selection.isCollapsed && selection.toString().trim().length > 0;

          // Only zoom if there's definitely no text selection and user tapped same area
          if (!hasTextSelection && Math.abs(touch.clientX - (touchStartX || 0)) < 20) {
            if (scale > 1.0) {
              onScaleChange?.(1.0);
            } else {
              onScaleChange?.(1.5); // Smaller zoom increment
            }
            event.preventDefault();
          }
        }
      } else {
        // Desktop behavior - more aggressive double tap handling
        if (currentTime - lastTouchTime < 300) {
          const selection = window.getSelection();
          const hasTextSelection = selection && !selection.isCollapsed;

          if (!hasTextSelection) {
            if (scale > 1.0) {
              onScaleChange?.(1.0);
            } else {
              onScaleChange?.(2.0);
            }
            event.preventDefault();
          }
        }
      }
      setLastTouchTime(currentTime);
    }
  }, [scale, lastTouchTime, getTouchDistance, onScaleChange, responsive.isMobile, touchStartX]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    const touches = event.touches;

    if (touches.length === 2 && touchStartDistance && onScaleChange) {
      // Pinch zoom - prevent text selection during pinch
      const currentDistance = getTouchDistance(touches);
      const scaleChange = currentDistance / touchStartDistance;
      const newScale = Math.max(0.25, Math.min(3.0, touchStartScale * scaleChange));

      onScaleChange(newScale);
      event.preventDefault();
    } else if (touches.length === 1) {
      // Single touch move - allow text selection but track movement for swipe detection
      // Don't prevent default to allow text selection
      const touch = touches[0];
      const moveDistance = touchStartX ? Math.abs(touch.clientX - touchStartX) : 0;

      // Only consider it a swipe if significant horizontal movement
      if (moveDistance > 30) {
        // This might be a swipe, but still allow text selection
        // The swipe will be handled in touchEnd
      }
    }
  }, [touchStartDistance, touchStartScale, getTouchDistance, onScaleChange, touchStartX]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    const touches = event.touches;

    if (touches.length === 0) {
      // All touches ended
      setTouchStartDistance(null);
      setTouchStartScale(scale);
      setTouchStartX(null);
    } else if (touches.length === 1 && touchStartDistance) {
      // One finger lifted during pinch
      setTouchStartDistance(null);
      setTouchStartScale(scale);
    }
  }, [scale, touchStartDistance]);

  // Swipe gesture for page navigation
  const handleSwipeGesture = useCallback((event: React.TouchEvent) => {
    if (!responsive.isMobile || !touchStartX || !onPageChange || !pdfInfo) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0 && pageNumber > 1) {
        // Swipe right - previous page
        onPageChange(pageNumber - 1);
      } else if (deltaX < 0 && pageNumber < pdfInfo.numPages) {
        // Swipe left - next page
        onPageChange(pageNumber + 1);
      }
    }
  }, [responsive.isMobile, touchStartX, onPageChange, pdfInfo, pageNumber]);

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
      <DocumentContainer ref={containerRef}>
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
            <PageContainer
              zoomMode={zoomMode}
              isTouchDevice={responsive.isTouchDevice}
              ref={pageRef}
              data-page-number={pageNumber}
              onClick={(e) => {
                console.log('💬 PageContainer clicked!', {
                  target: e.target,
                  currentTarget: e.currentTarget,
                  showCommentCreator,
                  showHighlightCreator
                });
                handleAreaClick(e);
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => {
                handleTouchEnd(e);
                handleSwipeGesture(e);
                console.log('💬 PageContainer touch ended!', { showCommentCreator, showHighlightCreator });
                handleAreaClick(e);
              }}
            >
              <Page
                pageNumber={Math.min(Math.max(1, pageNumber), pdfInfo.numPages)}
                scale={effectiveScale}
                onLoadSuccess={handlePageLoadSuccess}
                onLoadError={handlePageLoadError}
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
                scale={effectiveScale}
                pageWidth={pageSize?.width}
                pageHeight={pageSize?.height}
                offsetX={0}
                offsetY={0}
                onHighlightClick={handleHighlightClick}
              />

              {/* Comment overlay */}
              <CommentOverlay
                comments={comments}
                pageNumber={pageNumber}
                scale={effectiveScale}
                onCommentClick={handleCommentClick}
                onCommentEdit={handleCommentEdit}
                onCommentDelete={handleCommentDelete}
                onCommentHover={handleCommentHover}
              />

              {/* CTA overlay - makes QR code areas clickable */}
              <CTAOverlay
                callToActions={callToActions}
                pageNumber={pageNumber}
                scale={effectiveScale}
                onCTAClick={handleCTAClick}
                onCTAUpdate={handleCTAUpdate}
                onCTADelete={handleCTADelete}
              />


            </PageContainer>
          )}

          {/* Highlight creator modal */}
          <HighlightCreator
            selection={pendingSelection}
            onCreateHighlight={handleHighlightCreate}
            onCancel={handleHighlightCreatorCancel}
            isVisible={showHighlightCreator}
          />

          {/* Mobile text selection debug component */}
          <MobileTextSelectionDebug />

          {/* Debug info for highlighting and CTA */}
          {process.env.NODE_ENV === 'development' && (
            <>
              <div style={{
                position: 'fixed',
                top: '160px',
                right: '10px',
                zIndex: 9999,
                background: showHighlightCreator ? 'purple' : 'gray',
                color: 'white',
                padding: '5px',
                borderRadius: '3px',
                fontSize: '12px'
              }}>
                HIGHLIGHT: {showHighlightCreator ? 'SHOWING' : 'HIDDEN'}
                {pendingSelection && <div>Text: {pendingSelection.text.substring(0, 20)}...</div>}
              </div>

              <div style={{
                position: 'fixed',
                top: '210px',
                right: '10px',
                zIndex: 9999,
                background: showCTACreator ? 'red' : 'gray',
                color: 'white',
                padding: '5px',
                borderRadius: '3px',
                fontSize: '12px'
              }}>
                CTA: {showCTACreator ? 'SHOWING' : 'HIDDEN'}
                {pendingCTACoordinates && <div>Coords: {Math.round(pendingCTACoordinates.x)},{Math.round(pendingCTACoordinates.y)}</div>}
              </div>

              {/* Manual CTA creator test buttons */}
              <div style={{
                position: 'fixed',
                top: '260px',
                right: '10px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                <button
                  onClick={() => {
                    console.log('🧪 Manual test: Opening CTA creator at 200x200');
                    const testCoords = { x: 200, y: 200, width: 100, height: 30 };
                    console.log('🧪 Setting coordinates:', testCoords);
                    setPendingCTACoordinates(testCoords);
                    console.log('🧪 Setting showCTACreator to true');
                    setShowCTACreator(true);
                    console.log('🧪 CTA creator should now be visible');
                  }}
                  style={{
                    background: 'orange',
                    color: 'white',
                    border: 'none',
                    padding: '5px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Test CTA UI
                </button>

                <button
                  onClick={() => {
                    console.log('🧪 Debug: Current CTA state', {
                      showCTACreator,
                      pendingCTACoordinates,
                      showCommentCreator,
                      showHighlightCreator
                    });
                  }}
                  style={{
                    background: 'purple',
                    color: 'white',
                    border: 'none',
                    padding: '5px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Debug State
                </button>
              </div>
            </>
          )}

          {/* Comment creator modal */}
          <CommentCreator
            coordinates={pendingCommentCoordinates}
            pageNumber={pageNumber}
            onCreateComment={handleCommentCreate}
            onCancel={handleCommentCreatorCancel}
            isVisible={showCommentCreator}
          />

          {/* CTA creator modal */}
          <CTACreator
            coordinates={pendingCTACoordinates}
            pageNumber={pageNumber}
            onCreateCTA={handleCTACreate}
            onCancel={handleCTACreatorCancel}
            isVisible={showCTACreator}
          />

          {/* Debug indicators for testing */}
          {process.env.NODE_ENV === 'development' && (
            <>
              <div style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                zIndex: 9999,
                background: 'red',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
                onClick={() => {
                  console.log('💬 Debug button clicked - forcing comment creation');
                  setPendingCommentCoordinates({ x: 100, y: 100 });
                  setShowCommentCreator(true);
                }}>
                Test Comment
              </div>

              <div style={{
                position: 'fixed',
                top: '60px',
                right: '10px',
                zIndex: 9999,
                background: responsive.isMobile ? 'green' : 'blue',
                color: 'white',
                padding: '5px',
                borderRadius: '3px',
                fontSize: '12px'
              }}>
                {responsive.isMobile ? 'MOBILE' : 'DESKTOP'} ({responsive.screenWidth}px)
              </div>
            </>
          )}
        </Document>
      </DocumentContainer>
    </Container>
  );
};