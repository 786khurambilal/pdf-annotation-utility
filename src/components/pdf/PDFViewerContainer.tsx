import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { PdfUpload } from './PdfUpload';
import { PdfDisplay } from './PdfDisplay';
import { VirtualizedPdfDisplay } from './VirtualizedPdfDisplay';
import { NavigationControls } from './NavigationControls';
import { ZoomControls, ZoomMode } from './ZoomControls';
import { BookmarkPanel } from '../annotations/BookmarkPanel';
import { SimpleHighlightList } from '../annotations/SimpleHighlightList';
import { CommentList } from '../annotations/CommentList';
import { CTAList } from '../annotations/CTAList';
import { UserManager } from '../common/UserManager';
import { usePdfContext } from '../../contexts/PdfContext';
import { useUser } from '../../contexts/UserContext';
import { useAnnotations } from '../../contexts/AnnotationContext';
import { useResponsive } from '../../hooks/useResponsive';
import { useQRScanning } from '../../hooks/useQRScanning';
import { theme } from '../../styles/theme';
import { TextSelection, Highlight, Comment, CallToAction, Bookmark, AreaCoordinates } from '../../types/annotation.types';
import { MobileHighlightHint } from '../common/MobileHighlightHint';
import { RectangleCoordinates } from '@/utils';

interface PDFViewerContainerProps {
  className?: string;
  enableVirtualization?: boolean;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: ${theme.colors.light};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background-color: ${theme.colors.white};
  border-bottom: 1px solid ${theme.colors.gray300};
  box-shadow: ${theme.shadows.sm};
  flex-shrink: 0;

  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    flex-wrap: wrap;
    gap: ${theme.spacing.sm};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.sm};
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: ${theme.fontSizes.xl};
  font-weight: 600;
  color: ${theme.colors.gray800};

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: ${theme.fontSizes.lg};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    font-size: ${theme.fontSizes.md};
    order: 1;
    width: 100%;
    text-align: center;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.mobile}) {
    order: 2;
    width: 100%;
    justify-content: center;
  }
`;

const MainContent = styled.main`
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;

  @media (max-width: ${theme.breakpoints.tablet}) {
    flex-direction: column;
  }
`;

const Sidebar = styled.aside.withConfig({
  shouldForwardProp: (prop) => !['isOpen', 'isMobile'].includes(prop)
})<{ isOpen: boolean; isMobile: boolean }>`
  width: ${props => props.isOpen ? '320px' : '0'};
  background-color: ${theme.colors.white};
  border-right: 1px solid ${theme.colors.gray300};
  transition: width ${theme.transitions.slow};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  @media (max-width: ${theme.breakpoints.tablet}) {
    position: ${props => props.isMobile ? 'fixed' : 'relative'};
    top: 0;
    left: 0;
    height: ${props => props.isMobile ? '100vh' : 'auto'};
    width: ${props => props.isOpen ? '100vw' : '0'};
    z-index: ${theme.zIndex.modal};
    border-right: none;
    border-bottom: 1px solid ${theme.colors.gray300};
    max-height: ${props => props.isMobile ? '100vh' : '40vh'};
  }
`;

const SidebarOverlay = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isVisible'].includes(prop)
})<{ isVisible: boolean }>`
  display: none;

  @media (max-width: ${theme.breakpoints.tablet}) {
    display: ${props => props.isVisible ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: ${theme.zIndex.modal - 1};
  }
`;

const SidebarHeader = styled.div`
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.gray300};
  background-color: ${theme.colors.light};
  flex-shrink: 0;
`;

const SidebarTabs = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;

  @media (max-width: ${theme.breakpoints.mobile}) {
    justify-content: center;
  }
`;

const SidebarTab = styled.button.withConfig({
  shouldForwardProp: (prop) => !['active'].includes(prop)
})<{ active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: none;
  background-color: ${props => props.active ? theme.colors.white : 'transparent'};
  color: ${props => props.active ? theme.colors.primary : theme.colors.gray600};
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  font-weight: 500;
  transition: all ${theme.transitions.normal};
  min-height: ${theme.touch.minSize};
  touch-action: manipulation;

  &:hover {
    background-color: ${props => props.active ? theme.colors.white : theme.colors.gray200};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    flex: 1;
    min-width: 0;
    font-size: ${theme.fontSizes.xs};
    padding: ${theme.spacing.sm};
  }
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.md};
  -webkit-overflow-scrolling: touch;

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.sm};
  }
`;

const SidebarCloseButton = styled.button`
  display: none;
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  background: ${theme.colors.white};
  border: 1px solid ${theme.colors.gray300};
  border-radius: ${theme.borderRadius.sm};
  width: ${theme.touch.minSize};
  height: ${theme.touch.minSize};
  cursor: pointer;
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.gray600};
  z-index: 1;

  @media (max-width: ${theme.breakpoints.tablet}) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &:hover {
    background-color: ${theme.colors.gray100};
  }
`;

const ViewerArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`;

const ControlsBar = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isMobile'].includes(prop)
})<{ isMobile: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background-color: ${theme.colors.white};
  border-bottom: 1px solid ${theme.colors.gray300};
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  flex-shrink: 0;

  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    gap: ${theme.spacing.sm};
    flex-direction: ${props => props.isMobile ? 'column' : 'row'};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.sm};
  }
`;

const ControlsGroup = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isMobile'].includes(prop)
})<{ isMobile?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;

  @media (max-width: ${theme.breakpoints.tablet}) {
    gap: ${theme.spacing.sm};
    ${props => props.isMobile && `
      width: 100%;
      justify-content: center;
    `}
  }
`;

const ToggleButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['active'].includes(prop)
})<{ active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.gray300};
  background-color: ${props => props.active ? theme.colors.primary : theme.colors.white};
  color: ${props => props.active ? theme.colors.white : theme.colors.gray800};
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  font-weight: 500;
  transition: all ${theme.transitions.normal};
  min-height: ${theme.touch.minSize};
  touch-action: manipulation;
  white-space: nowrap;

  &:hover {
    background-color: ${props => props.active ? theme.colors.primaryHover : theme.colors.light};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    font-size: ${theme.fontSizes.xs};
    padding: ${theme.spacing.sm};
  }
`;

const PdfViewerWrapper = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
`;

const UploadArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.lg};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.md};
  }
`;

type SidebarTabType = 'bookmarks' | 'highlights' | 'comments' | 'ctas';

export const PDFViewerContainer: React.FC<PDFViewerContainerProps> = ({ 
  className, 
  enableVirtualization = false 
}) => {
  const { state: pdfState, setFile, setCurrentPage, setScale, setZoomMode, setTotalPages, setError } = usePdfContext();
  const { currentUser } = useUser();
  const {
    annotations,
    currentDocumentId,
    createHighlight,
    createComment,
    createBookmark,
    createCallToAction,
    updateHighlight,
    updateComment,
    updateBookmark,
    updateCallToAction,
    deleteHighlight,
    deleteComment,
    deleteBookmark,
    deleteCallToAction,
    loadDocument,
  } = useAnnotations();

  const responsive = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTabType>('bookmarks');
  const [showBookmarkPanel, setShowBookmarkPanel] = useState(false);
  const [navigatingToHighlight, setNavigatingToHighlight] = useState<string | null>(null);

  // QR scanning integration
  const qrScanning = useQRScanning();

  // Generate document ID from file
  const generateDocumentId = useCallback((file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    const documentId = generateDocumentId(file);
    setFile(file, documentId);
    
    // Load annotations for this document
    if (currentUser) {
      loadDocument(documentId);
    }
  }, [setFile, generateDocumentId, currentUser, loadDocument]);

  // Handle file upload error
  const handleFileUploadError = useCallback((error: string) => {
    setError(error);
  }, [setError]);

  // Handle PDF load success
  const handlePdfLoadSuccess = useCallback((pdf: any) => {
    setTotalPages(pdf.numPages);
    setError(null);
  }, [setTotalPages, setError]);

  // Handle PDF load error
  const handlePdfLoadError = useCallback((error: Error) => {
    setError(`Failed to load PDF: ${error.message}`);
  }, [setError]);

  // Handle page navigation
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, [setCurrentPage]);

  // Handle zoom controls
  const handleScaleChange = useCallback((scale: number) => {
    setScale(scale);
  }, [setScale]);

  const handleZoomModeChange = useCallback((mode: ZoomMode) => {
    setZoomMode(mode);
  }, [setZoomMode]);

  // Handle text selection and highlighting
  const handleTextSelected = useCallback((selection: TextSelection) => {
    // Text selection is handled by the PdfDisplay component
  }, []);

  const handleHighlightCreate = useCallback(async (selection: TextSelection, color: string) => {
    if (!currentUser || !pdfState.documentId) {
      return;
    }

    // Only load document if it's not already loaded to avoid overwriting existing annotations
    if (currentDocumentId !== pdfState.documentId) {
      await loadDocument(pdfState.documentId);
    }
    
    createHighlight(selection, color);
  }, [currentUser, pdfState.documentId, createHighlight, loadDocument, currentDocumentId]);

  // Function to scroll to a specific highlight
  const scrollToHighlight = useCallback((highlight: Highlight) => {
    try {
      // Find the PDF page element immediately
      const pageElement = document.querySelector(`[data-page-number="${highlight.pageNumber}"]`) as HTMLElement;
      
      if (!pageElement) {
        // Alternative: try to find by page class or other selector
        const altPageElement = document.querySelector(`.react-pdf__Page[data-page-number="${highlight.pageNumber}"]`) as HTMLElement;
        
        if (altPageElement) {
          scrollToElementWithHighlight(altPageElement, highlight);
          return;
        }
        
        // Try without data attribute
        const pageElements = document.querySelectorAll('.react-pdf__Page');
        
        if (pageElements.length >= highlight.pageNumber) {
          const targetPage = pageElements[highlight.pageNumber - 1] as HTMLElement;
          scrollToElementWithHighlight(targetPage, highlight);
          return;
        }
        
        return;
      }

      scrollToElementWithHighlight(pageElement, highlight);
      
    } catch (error) {
      // Silently handle errors
    }
  }, [pdfState.currentPage, pdfState.scale]);

  // Helper function to scroll to element with highlight
  const scrollToElementWithHighlight = useCallback((pageElement: HTMLElement, highlight: Highlight) => {
    // Calculate the highlight position
    const scale = pdfState.scale;
    const highlightX = highlight.coordinates.x * scale;
    const highlightY = highlight.coordinates.y * scale;
    
    // Get the page element's position
    const pageRect = pageElement.getBoundingClientRect();
    const containerElement = document.querySelector('[data-pdf-viewer-container]') as HTMLElement;
    
    if (containerElement) {
      // Get container's current scroll position
      const containerRect = containerElement.getBoundingClientRect();
      
      // Calculate scroll position to center the highlight
      const targetScrollTop = containerElement.scrollTop + (pageRect.top - containerRect.top) + highlightY - (containerRect.height / 2);
      const targetScrollLeft = containerElement.scrollLeft + (pageRect.left - containerRect.left) + highlightX - (containerRect.width / 2);
      
      // Smooth scroll to the highlight
      containerElement.scrollTo({
        top: Math.max(0, targetScrollTop),
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
      });
    } else {
      // Fallback: scroll the window
      const absoluteY = pageRect.top + window.scrollY + highlightY;
      window.scrollTo({
        top: Math.max(0, absoluteY - (window.innerHeight / 2)),
        behavior: 'smooth'
      });
    }
    
    // Temporarily highlight the target highlight after scrolling
    setTimeout(() => {
      highlightTargetHighlight(highlight.id);
    }, 500);
  }, [pdfState.scale]);

  // Function to temporarily highlight the target highlight
  const highlightTargetHighlight = useCallback((highlightId: string) => {
    const highlightElement = document.querySelector(`[data-highlight-id="${highlightId}"]`) as HTMLElement;
    if (highlightElement) {
      // Store original styles
      const originalBoxShadow = highlightElement.style.boxShadow;
      const originalTransform = highlightElement.style.transform;
      const originalOpacity = highlightElement.style.opacity;
      
      // Add a pulsing highlight effect
      highlightElement.style.boxShadow = '0 0 15px 3px rgba(0, 123, 255, 0.9)';
      highlightElement.style.transform = 'scale(1.1)';
      highlightElement.style.opacity = '0.8';
      highlightElement.style.transition = 'all 0.3s ease';
      highlightElement.style.zIndex = '1000';
      
      // Pulse effect
      let pulseCount = 0;
      const pulseInterval = setInterval(() => {
        if (pulseCount >= 3) {
          clearInterval(pulseInterval);
          // Restore original styles
          setTimeout(() => {
            highlightElement.style.boxShadow = originalBoxShadow;
            highlightElement.style.transform = originalTransform;
            highlightElement.style.opacity = originalOpacity;
            highlightElement.style.zIndex = '';
          }, 300);
          return;
        }
        
        // Pulse animation
        highlightElement.style.transform = pulseCount % 2 === 0 ? 'scale(1.15)' : 'scale(1.1)';
        highlightElement.style.opacity = pulseCount % 2 === 0 ? '0.9' : '0.7';
        pulseCount++;
      }, 400);
    }
  }, []);

  const handleHighlightClick = useCallback((highlight: Highlight) => {
    // Set loading state
    setNavigatingToHighlight(highlight.id);
    
    // Navigate to the highlight's page if not already there
    if (highlight.pageNumber !== pdfState.currentPage) {
      setCurrentPage(highlight.pageNumber);
    }
    
    // Close sidebar on mobile after navigation
    if (responsive.isMobile) {
      setSidebarOpen(false);
    }
    
    // Scroll to highlight position after a short delay to ensure page is rendered
    const delay = highlight.pageNumber !== pdfState.currentPage ? 800 : 200;
    setTimeout(() => {
      scrollToHighlight(highlight);
      // Clear loading state after navigation
      setTimeout(() => {
        setNavigatingToHighlight(null);
      }, 1000);
    }, delay);
  }, [pdfState.currentPage, setCurrentPage, responsive.isMobile, scrollToHighlight]);

  // Handle area clicks and comment creation
  const handleAreaClick = useCallback((coordinates: AreaCoordinates, pageNumber: number) => {
    // Area click is handled by the PdfDisplay component for comment creation
  }, []);

  const handleCommentCreate = useCallback((content: string, coordinates: AreaCoordinates, pageNumber: number) => {
    console.log('💬 PDFViewerContainer handleCommentCreate called', { content, coordinates, pageNumber, currentUser: currentUser?.id, documentId: pdfState.documentId });
    
    if (!currentUser || !pdfState.documentId) {
      console.log('💬 Cannot create comment - missing user or document');
      return;
    }

    createComment(pageNumber, content, coordinates);
  }, [currentUser, pdfState.documentId, createComment]);

  // Handle CTA creation
  const handleCTACreateFromPDF = useCallback((url: string, label: string, coordinates: RectangleCoordinates, pageNumber: number) => {
    console.log('🔗 PDFViewerContainer handleCTACreate called', { url, label, coordinates, pageNumber, currentUser: currentUser?.id, documentId: pdfState.documentId });
    
    if (!currentUser || !pdfState.documentId) {
      console.log('🔗 Cannot create CTA - missing user or document');
      return;
    }

    createCallToAction(pageNumber, url, label, coordinates);
  }, [currentUser, pdfState.documentId, createCallToAction]);

  const handleCommentClick = useCallback((comment: Comment) => {
    console.log('💬 PDFViewerContainer: Comment clicked:', {
      commentId: comment.id,
      pageNumber: comment.pageNumber,
      currentPage: pdfState.currentPage,
      totalPages: pdfState.totalPages,
      isMobile: responsive.isMobile,
      screenWidth: responsive.screenWidth,
      sidebarOpen,
      willNavigate: comment.pageNumber !== pdfState.currentPage
    });
    
    // Navigate to the comment's page if not already there
    if (comment.pageNumber !== pdfState.currentPage) {
      console.log('💬 Navigating to page:', comment.pageNumber, 'from page:', pdfState.currentPage);
      setCurrentPage(comment.pageNumber);
    } else {
      console.log('💬 Already on the correct page:', comment.pageNumber);
    }
    
    // Close sidebar on mobile after navigation with a small delay
    if (responsive.isMobile) {
      console.log('💬 Closing sidebar on mobile');
      setTimeout(() => {
        setSidebarOpen(false);
      }, 100); // Small delay to ensure page navigation starts first
    }
  }, [pdfState.currentPage, pdfState.totalPages, setCurrentPage, responsive.isMobile, responsive.screenWidth, sidebarOpen]);

  const handleCommentEdit = useCallback((commentId: string, newContent: string) => {
    updateComment(commentId, { content: newContent });
  }, [updateComment]);

  const handleCommentDelete = useCallback((commentId: string) => {
    deleteComment(commentId);
  }, [deleteComment]);



  // Handle bookmark creation
  const handleCreateBookmark = useCallback(() => {
    if (!currentUser || !pdfState.documentId || !pdfState.file) return;

    const title = prompt('Enter bookmark title:');
    if (!title?.trim()) return;

    const description = prompt('Enter bookmark description (optional):');

    createBookmark(pdfState.currentPage, title.trim(), description?.trim() || undefined);
  }, [currentUser, pdfState.documentId, pdfState.file, pdfState.currentPage, createBookmark]);

  const handleBookmarkClick = useCallback((bookmark: Bookmark) => {
    console.log('📖 Bookmark clicked:', {
      bookmarkId: bookmark.id,
      pageNumber: bookmark.pageNumber,
      isMobile: responsive.isMobile,
      screenWidth: responsive.screenWidth,
      sidebarOpen
    });
    
    setCurrentPage(bookmark.pageNumber);
    setShowBookmarkPanel(false);
    
    // Close sidebar on mobile after navigation with a small delay
    if (responsive.isMobile) {
      console.log('📖 Closing sidebar on mobile');
      setTimeout(() => {
        setSidebarOpen(false);
      }, 100); // Small delay to ensure page navigation starts first
    }
  }, [setCurrentPage, responsive.isMobile, responsive.screenWidth, sidebarOpen]);

  const handleBookmarkEdit = useCallback((bookmark: Bookmark) => {
    updateBookmark(bookmark.id, {
      title: bookmark.title,
      description: bookmark.description,
    });
  }, [updateBookmark]);

  const handleBookmarkDelete = useCallback((bookmarkId: string) => {
    deleteBookmark(bookmarkId);
  }, [deleteBookmark]);

  // Handle CTA creation
  const handleCTACreate = useCallback((selection: any, url: string, label: string) => {
    if (!currentUser || !pdfState.documentId) return;

    createCallToAction(selection.pageNumber, url, label, selection.coordinates);
  }, [currentUser, pdfState.documentId, createCallToAction]);

  // Get annotations from context (already filtered for current user and document)
  const currentDocumentHighlights = (annotations.highlights || []).sort((a, b) => a.pageNumber - b.pageNumber);
  const currentDocumentComments = annotations.comments || [];
  const currentDocumentBookmarks = annotations.bookmarks || [];
  const currentDocumentCTAs = annotations.callToActions || [];
  
  // Debug: Log CTAs whenever they change
  useEffect(() => {
    console.log('🔗 Current document CTAs updated:', {
      count: currentDocumentCTAs.length,
      ctas: currentDocumentCTAs.map(cta => ({
        id: cta.id,
        label: cta.label,
        url: cta.url,
        isAutoGenerated: cta.isAutoGenerated,
        pageNumber: cta.pageNumber
      }))
    });
  }, [currentDocumentCTAs]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  // Close sidebar when clicking outside on mobile
  const handleSidebarOverlayClick = useCallback(() => {
    if (responsive.isMobile) {
      setSidebarOpen(false);
    }
  }, [responsive.isMobile]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Auto-close sidebar on mobile when switching tabs
  const handleTabChange = useCallback((tab: SidebarTabType) => {
    setActiveTab(tab);
    if (responsive.isMobile && !sidebarOpen) {
      setSidebarOpen(true);
    }
  }, [responsive.isMobile, sidebarOpen]);

  // Render sidebar content based on active tab
  const renderSidebarContent = () => {
    switch (activeTab) {
      case 'bookmarks':
        return (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={handleCreateBookmark}
                disabled={!pdfState.file || !currentUser}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: pdfState.file && currentUser ? 'pointer' : 'not-allowed',
                  opacity: pdfState.file && currentUser ? 1 : 0.6,
                }}
              >
                Add Bookmark
              </button>
            </div>
            {currentDocumentBookmarks.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '2rem 0' }}>
                No bookmarks yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentDocumentBookmarks.map(bookmark => (
                  <div
                    key={bookmark.id}
                    onClick={() => handleBookmarkClick(bookmark)}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {bookmark.title}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      Page {bookmark.pageNumber}
                    </div>
                    {bookmark.description && (
                      <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                        {bookmark.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'highlights':
        return (
          <SimpleHighlightList
            highlights={currentDocumentHighlights}
            onHighlightClick={handleHighlightClick}
            onHighlightEdit={(id, updates) => updateHighlight(id, updates)}
            onHighlightDelete={deleteHighlight}
            currentPage={pdfState.currentPage}
            navigatingToHighlight={navigatingToHighlight}
          />
        );
      case 'comments':
        return (
          <CommentList
            comments={currentDocumentComments}
            onCommentClick={handleCommentClick}
            onCommentEdit={handleCommentEdit}
            onCommentDelete={handleCommentDelete}
          />
        );
      case 'ctas':
        return (
          <CTAList
            callToActions={currentDocumentCTAs}
            onCTAUpdate={(ctaId: string, updates: { url: string; label: string }) => {
              console.log('🔗 CTA update requested:', ctaId, updates);
              // For now, just log the update request
              // TODO: Implement CTA updating functionality
              alert(`CTA Update: ${updates.label} (${updates.url})\nUpdating functionality coming soon!`);
            }}
            onCTADelete={deleteCallToAction}
            onCTANavigate={(cta: CallToAction) => {
              if (cta.url) {
                window.open(cta.url, '_blank');
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container className={className}>
      <Header>
        <Title>Ebook Utility</Title>
        <UserSection>
          <UserManager />
        </UserSection>
      </Header>

      <MainContent data-orientation={responsive.orientation}>
        {/* Debug indicators */}
        {process.env.NODE_ENV === 'development' && (
          <>
            <div style={{
              position: 'fixed',
              top: '110px',
              right: '10px',
              zIndex: 9999,
              background: sidebarOpen ? 'orange' : 'gray',
              color: 'white',
              padding: '5px',
              borderRadius: '3px',
              fontSize: '12px'
            }}>
              SIDEBAR: {sidebarOpen ? 'OPEN' : 'CLOSED'}
            </div>
            
            <div style={{
              position: 'fixed',
              top: '160px',
              right: '10px',
              zIndex: 9999,
              background: 'blue',
              color: 'white',
              padding: '5px',
              borderRadius: '3px',
              fontSize: '12px'
            }}>
              PAGE: {pdfState.currentPage}/{pdfState.totalPages}
            </div>
            
            {/* Manual test buttons */}
            <div style={{
              position: 'fixed',
              top: '210px',
              right: '10px',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}>
              <button
                onClick={() => {
                  console.log('🧪 Manual test: Going to page 1');
                  setCurrentPage(1);
                }}
                style={{
                  background: 'green',
                  color: 'white',
                  border: 'none',
                  padding: '5px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Page 1 ({currentDocumentCTAs.filter(cta => cta.pageNumber === 1).length} CTAs)
              </button>
              <button
                onClick={() => {
                  console.log('🧪 Manual test: Going to page 2');
                  setCurrentPage(2);
                }}
                style={{
                  background: 'green',
                  color: 'white',
                  border: 'none',
                  padding: '5px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Page 2 ({currentDocumentCTAs.filter(cta => cta.pageNumber === 2).length} CTAs)
              </button>
              <button
                onClick={() => {
                  console.log('🧪 Manual test: Creating CTA');
                  if (currentUser && pdfState.documentId) {
                    const testCoords = { x: 100, y: 100, width: 100, height: 30 };
                    createCallToAction(pdfState.currentPage, 'https://google.com', 'Test CTA', testCoords);
                  } else {
                    console.log('🧪 Cannot create CTA - missing user or document', {
                      hasUser: !!currentUser,
                      hasDocument: !!pdfState.documentId
                    });
                  }
                }}
                style={{
                  background: 'red',
                  color: 'white',
                  border: 'none',
                  padding: '5px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Test CTA
              </button>
              <button
                onClick={() => {
                  console.log('🧪 Manual test: Opening CTA creator');
                  // This would need to be passed down to PdfDisplay
                  // For now, just log the attempt
                  console.log('🧪 Would open CTA creator at coordinates {x: 200, y: 200}');
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
                Open CTA UI
              </button>
            </div>
          </>
        )}
        
        {/* Sidebar overlay for mobile */}
        <SidebarOverlay isVisible={sidebarOpen && responsive.isMobile} onClick={handleSidebarOverlayClick} />
        
        <Sidebar isOpen={sidebarOpen} isMobile={responsive.isMobile}>
          <SidebarCloseButton onClick={() => setSidebarOpen(false)}>
            ×
          </SidebarCloseButton>
          <SidebarHeader>
            <SidebarTabs>
              <SidebarTab
                active={activeTab === 'bookmarks'}
                onClick={() => handleTabChange('bookmarks')}
              >
                {responsive.isMobile ? '📖' : 'Bookmarks'}
              </SidebarTab>
              <SidebarTab
                active={activeTab === 'highlights'}
                onClick={() => handleTabChange('highlights')}
              >
                {responsive.isMobile ? '🖍️' : 'Highlights'}
              </SidebarTab>
              <SidebarTab
                active={activeTab === 'comments'}
                onClick={() => handleTabChange('comments')}
              >
                {responsive.isMobile ? '💬' : 'Comments'}
              </SidebarTab>
              <SidebarTab
                active={activeTab === 'ctas'}
                onClick={() => handleTabChange('ctas')}
              >
                {responsive.isMobile ? '🔗' : 'Links'}
              </SidebarTab>
            </SidebarTabs>
          </SidebarHeader>
          <SidebarContent>
            {renderSidebarContent()}
          </SidebarContent>
        </Sidebar>

        <ViewerArea>
          {pdfState.file ? (
            <>
              <ControlsBar isMobile={responsive.isMobile}>
                <ControlsGroup isMobile={responsive.isMobile}>
                  <ToggleButton
                    active={sidebarOpen}
                    onClick={toggleSidebar}
                    aria-label={responsive.isMobile ? "Menu" : (sidebarOpen ? 'Hide Annotations' : 'Show Annotations')}
                  >
                    {responsive.isMobile ? '📋' : (sidebarOpen ? 'Hide' : 'Show')} {responsive.isMobile ? '' : 'Annotations'}
                  </ToggleButton>
                  <NavigationControls
                    currentPage={pdfState.currentPage}
                    totalPages={pdfState.totalPages}
                    onPageChange={handlePageChange}
                    disabled={pdfState.isLoading}
                  />
                </ControlsGroup>
                <ControlsGroup isMobile={responsive.isMobile}>
                  <ZoomControls
                    scale={pdfState.scale}
                    zoomMode={pdfState.zoomMode}
                    onScaleChange={handleScaleChange}
                    onZoomModeChange={handleZoomModeChange}
                    disabled={pdfState.isLoading}
                  />
                  {qrScanning.isSupported && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontSize: '12px',
                      color: qrScanning.state.isScanning ? '#007bff' : '#666'
                    }}>
                      {qrScanning.state.isScanning ? (
                        <>
                          <span>🔍</span>
                          <span>Scanning QR codes... {Math.round(qrScanning.state.progress)}%</span>
                          <button
                            onClick={qrScanning.state.isPaused ? qrScanning.resumeScanning : qrScanning.pauseScanning}
                            style={{
                              background: 'none',
                              border: '1px solid #ccc',
                              borderRadius: '3px',
                              padding: '2px 6px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            {qrScanning.state.isPaused ? 'Resume' : 'Pause'}
                          </button>
                        </>
                      ) : qrScanning.state.generatedCTAs > 0 ? (
                        <span style={{ color: '#28a745' }}>
                          ✅ Found {qrScanning.state.foundQRCodes} QR codes, created {qrScanning.state.generatedCTAs} CTAs
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => {
                              console.log('🔍 Manual QR scan triggered');
                              qrScanning.startScanning().catch(error => {
                                console.error('Manual QR scan failed:', error);
                              });
                            }}
                            style={{
                              background: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '4px 8px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            🔍 Scan QR Codes
                          </button>
                          <button
                            onClick={async () => {
                              console.log('🔧 QR Debug triggered');
                              
                              // Import QR scanner
                              try {
                                const { QRCodeScannerService } = await import('../../utils/QRCodeScanner');
                                const qrScanner = QRCodeScannerService.getInstance();
                                
                                console.log('✅ QR Scanner loaded');
                                console.log('✅ QR detection supported:', qrScanner.isQRCodeDetectionSupported());
                                
                                // Find canvas
                                const canvas = document.querySelector('canvas');
                                if (!canvas) {
                                  console.log('❌ No canvas found');
                                  return;
                                }
                                
                                console.log(`📋 Canvas: ${canvas.width}x${canvas.height}`);
                                
                                // Check PDF document state
                                console.log('📄 PDF State:', {
                                  hasFile: !!pdfState.file,
                                  currentPage: pdfState.currentPage,
                                  totalPages: pdfState.totalPages,
                                  documentId: pdfState.documentId
                                });
                                
                                // Check if PDF pages are actually rendered
                                const pdfPages = document.querySelectorAll('.react-pdf__Page');
                                console.log(`📄 Found ${pdfPages.length} rendered PDF pages`);
                                
                                pdfPages.forEach((page, index) => {
                                  const pageCanvas = page.querySelector('canvas');
                                  const pageNumber = page.getAttribute('data-page-number') || (index + 1);
                                  console.log(`  Page ${pageNumber}: ${pageCanvas ? `${pageCanvas.width}x${pageCanvas.height}` : 'No canvas'}`);
                                });
                                
                                // Check canvas content
                                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                                if (!ctx) {
                                  console.log('❌ No canvas context');
                                  return;
                                }
                                
                                // Try to force PDF re-render
                                console.log('🔄 Attempting to force PDF re-render...');
                                const pdfContainer = canvas.closest('.react-pdf__Document') as HTMLElement;
                                if (pdfContainer) {
                                  const originalStyle = pdfContainer.style.display;
                                  pdfContainer.style.display = 'none';
                                  pdfContainer.offsetHeight; // Force reflow
                                  pdfContainer.style.display = originalStyle;
                                }
                                
                                // Wait for canvas to be fully rendered
                                console.log('⏳ Waiting for canvas to render...');
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                
                                // Try multiple strategies to get PDF content
                                console.log('🔍 Trying multiple strategies to access PDF content...');
                                
                                // Strategy 1: Check if we need to trigger PDF rendering
                                const pdfPage = canvas.closest('.react-pdf__Page');
                                if (pdfPage) {
                                  console.log('📄 Found PDF page element, checking for text layer...');
                                  const textLayer = pdfPage.querySelector('.react-pdf__Page__textContent');
                                  const annotationLayer = pdfPage.querySelector('.react-pdf__Page__annotations');
                                  console.log(`  Text layer: ${textLayer ? 'present' : 'missing'}`);
                                  console.log(`  Annotation layer: ${annotationLayer ? 'present' : 'missing'}`);
                                }
                                
                                // Strategy 2: Try to force PDF.js to render by accessing the page
                                console.log('🔄 Attempting to trigger PDF.js rendering...');
                                try {
                                  // Dispatch a custom event to potentially trigger re-rendering
                                  const renderEvent = new CustomEvent('forceRender');
                                  canvas.dispatchEvent(renderEvent);
                                  
                                  // Try to access PDF.js internals if available
                                  if ((window as any).pdfjsLib) {
                                    console.log('📚 PDF.js library detected');
                                  }
                                  
                                  // Wait a bit more for potential re-rendering
                                  await new Promise(resolve => setTimeout(resolve, 1000));
                                } catch (renderError) {
                                  console.log('⚠️ Could not trigger PDF.js rendering:', renderError);
                                }
                                
                                // Strategy 3: Check all canvases more thoroughly
                                const allCanvases = document.querySelectorAll('canvas');
                                console.log(`🔍 Analyzing all ${allCanvases.length} canvases for content...`);
                                
                                let bestCanvas = null;
                                let bestContentScore = 0;
                                
                                for (let i = 0; i < allCanvases.length; i++) {
                                  const testCanvas = allCanvases[i] as HTMLCanvasElement;
                                  console.log(`  Canvas ${i + 1}: ${testCanvas.width}x${testCanvas.height}`);
                                  
                                  if (testCanvas.width > 0 && testCanvas.height > 0) {
                                    const testCtx = testCanvas.getContext('2d', { willReadFrequently: true });
                                    if (testCtx) {
                                      try {
                                        // Sample multiple areas
                                        const areas = [
                                          { x: 0, y: 0, w: Math.min(100, testCanvas.width), h: Math.min(100, testCanvas.height) },
                                          { x: Math.floor(testCanvas.width * 0.2), y: Math.floor(testCanvas.height * 0.2), w: Math.min(100, testCanvas.width * 0.6), h: Math.min(100, testCanvas.height * 0.6) },
                                          { x: Math.max(0, testCanvas.width - 100), y: Math.max(0, testCanvas.height - 100), w: Math.min(100, testCanvas.width), h: Math.min(100, testCanvas.height) }
                                        ];
                                        
                                        let contentScore = 0;
                                        let totalBlackPixels = 0;
                                        let totalSampledPixels = 0;
                                        
                                        for (const area of areas) {
                                          if (area.x + area.w <= testCanvas.width && area.y + area.h <= testCanvas.height) {
                                            const areaData = testCtx.getImageData(area.x, area.y, area.w, area.h);
                                            
                                            for (let j = 0; j < areaData.data.length; j += 16) { // Sample every 4th pixel
                                              const r = areaData.data[j];
                                              const g = areaData.data[j + 1];
                                              const b = areaData.data[j + 2];
                                              const a = areaData.data[j + 3];
                                              
                                              if (a > 0) {
                                                totalSampledPixels++;
                                                const brightness = (r + g + b) / 3;
                                                
                                                if (brightness < 240) {
                                                  contentScore++;
                                                  if (brightness < 128) {
                                                    totalBlackPixels++;
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                        
                                        const blackRatio = totalSampledPixels > 0 ? totalBlackPixels / totalSampledPixels : 0;
                                        console.log(`    Content score: ${contentScore}, Black pixels: ${totalBlackPixels}/${totalSampledPixels} (${(blackRatio * 100).toFixed(1)}%)`);
                                        
                                        if (contentScore > bestContentScore) {
                                          bestContentScore = contentScore;
                                          bestCanvas = testCanvas;
                                          console.log(`    ✅ New best canvas found!`);
                                        }
                                        
                                      } catch (testError) {
                                        console.log(`    ❌ Error testing canvas ${i + 1}:`, testError);
                                      }
                                    }
                                  }
                                }
                                
                                let scanCanvas = canvas;
                                
                                if (bestCanvas && bestContentScore > 0) {
                                  console.log(`🎯 Using best canvas with content score: ${bestContentScore}`);
                                  // Use the best canvas for scanning
                                  const bestCtx = bestCanvas.getContext('2d', { willReadFrequently: true });
                                  if (bestCtx) {
                                    scanCanvas = bestCanvas;
                                  }
                                } else {
                                  console.log('❌ No canvas with content found');
                                  console.log('💡 Possible solutions:');
                                  console.log('  1. Wait longer for PDF to render');
                                  console.log('  2. Try zooming in/out on the PDF');
                                  console.log('  3. Scroll the PDF to trigger re-rendering');
                                  console.log('  4. Refresh the page and try again');
                                  return;
                                }
                                
                                // Try QR scanning at original resolution
                                console.log('🔍 Attempting QR scan at original resolution...');
                                try {
                                  let results = await qrScanner.scanPage(scanCanvas, pdfState.currentPage);
                                  console.log(`✅ QR scan completed: ${results.length} QR codes found`);
                                  
                                  // If no QR codes found, try enhanced scanning with upscaling
                                  if (results.length === 0) {
                                    console.log('🔍 No QR codes found at original resolution, trying enhanced scanning...');
                                    
                                    // Create upscaled versions for better QR detection
                                    const scaleFactors = [2, 3, 1.5];
                                    
                                    for (const scaleFactor of scaleFactors) {
                                      console.log(`🔍 Trying ${scaleFactor}x upscaling...`);
                                      
                                      try {
                                        // Create upscaled canvas
                                        const upscaledCanvas = document.createElement('canvas');
                                        const upscaledSize = Math.min(2000, Math.floor(Math.min(scanCanvas.width, scanCanvas.height) * scaleFactor));
                                        upscaledCanvas.width = upscaledSize;
                                        upscaledCanvas.height = upscaledSize;
                                        
                                        const upscaledCtx = upscaledCanvas.getContext('2d');
                                        if (upscaledCtx) {
                                          // Disable smoothing for sharp QR codes
                                          upscaledCtx.imageSmoothingEnabled = false;
                                          
                                          // Draw scaled version focusing on areas likely to contain QR codes
                                          const sourceSize = upscaledSize / scaleFactor;
                                          
                                          // Try different areas of the PDF
                                          const areas = [
                                            { x: 0, y: 0, name: 'top-left' },
                                            { x: scanCanvas.width * 0.1, y: scanCanvas.height * 0.2, name: 'upper-left' },
                                            { x: scanCanvas.width * 0.1, y: scanCanvas.height * 0.4, name: 'middle-left' },
                                            { x: scanCanvas.width * 0.1, y: scanCanvas.height * 0.6, name: 'lower-left' }
                                          ];
                                          
                                          for (const area of areas) {
                                            if (area.x + sourceSize <= scanCanvas.width && area.y + sourceSize <= scanCanvas.height) {
                                              // Clear canvas
                                              upscaledCtx.fillStyle = 'white';
                                              upscaledCtx.fillRect(0, 0, upscaledSize, upscaledSize);
                                              
                                              // Draw upscaled area
                                              upscaledCtx.drawImage(
                                                scanCanvas,
                                                area.x, area.y, sourceSize, sourceSize,
                                                0, 0, upscaledSize, upscaledSize
                                              );
                                              
                                              console.log(`  Scanning ${area.name} area at ${scaleFactor}x scale...`);
                                              
                                              // Try QR detection on upscaled area
                                              const upscaledResults = await qrScanner.scanPage(upscaledCanvas, pdfState.currentPage);
                                              
                                              if (upscaledResults.length > 0) {
                                                console.log(`🎯 Found ${upscaledResults.length} QR codes in ${area.name} at ${scaleFactor}x scale!`);
                                                
                                                // Adjust coordinates back to original scale
                                                const adjustedResults = upscaledResults.map(result => ({
                                                  ...result,
                                                  coordinates: {
                                                    x: area.x + (result.coordinates.x / scaleFactor),
                                                    y: area.y + (result.coordinates.y / scaleFactor),
                                                    width: result.coordinates.width / scaleFactor,
                                                    height: result.coordinates.height / scaleFactor
                                                  }
                                                }));
                                                
                                                results = adjustedResults;
                                                break; // Found QR codes, stop trying other areas
                                              }
                                            }
                                          }
                                          
                                          if (results.length > 0) break; // Found QR codes, stop trying other scale factors
                                        }
                                      } catch (scaleError) {
                                        console.log(`⚠️ Error with ${scaleFactor}x scaling:`, scaleError);
                                      }
                                    }
                                  }
                                  
                                  if (results.length > 0) {
                                    results.forEach((result, index) => {
                                      console.log(`🎯 QR Code ${index + 1}:`);
                                      console.log(`  Content: ${result.content}`);
                                      console.log(`  Coordinates: (${result.coordinates.x}, ${result.coordinates.y}) ${result.coordinates.width}x${result.coordinates.height}`);
                                      console.log(`  Confidence: ${result.confidence}`);
                                    });
                                  } else {
                                    console.log('❌ No QR codes detected even with enhanced scanning');
                                    console.log('💡 This could indicate:');
                                    console.log('  - QR codes are not standard format');
                                    console.log('  - QR codes are damaged or corrupted in the PDF');
                                    console.log('  - QR codes are embedded as images rather than vector graphics');
                                    console.log('  - PDF rendering is not preserving QR code structure');
                                  }
                                  
                                } catch (scanError) {
                                  console.log('❌ QR scanning error:', scanError);
                                }
                                
                              } catch (importError) {
                                console.log('❌ Failed to import QR scanner:', importError);
                              }
                            }}
                            style={{
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '4px 8px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            🔧 Debug QR
                          </button>
                          <button
                            onClick={async () => {
                              console.log('🔄 Force PDF Render triggered');
                              
                              // Strategy 1: Zoom in and out to trigger re-render
                              const zoomInBtn = document.querySelector('[title="Zoom in"], [aria-label*="zoom in"], button[class*="zoom"][class*="in"]');
                              const zoomOutBtn = document.querySelector('[title="Zoom out"], [aria-label*="zoom out"], button[class*="zoom"][class*="out"]');
                              
                              if (zoomInBtn && zoomOutBtn) {
                                console.log('📏 Triggering zoom to force re-render...');
                                (zoomInBtn as HTMLButtonElement).click();
                                await new Promise(resolve => setTimeout(resolve, 500));
                                (zoomOutBtn as HTMLButtonElement).click();
                                await new Promise(resolve => setTimeout(resolve, 500));
                              }
                              
                              // Strategy 2: Navigate pages to trigger re-render
                              if (pdfState.totalPages > 1) {
                                console.log('📄 Navigating pages to trigger re-render...');
                                const nextBtn = document.querySelector('[title="Next page"], [aria-label*="next"], button[class*="next"]');
                                const prevBtn = document.querySelector('[title="Previous page"], [aria-label*="previous"], button[class*="prev"]');
                                
                                if (nextBtn && prevBtn) {
                                  (nextBtn as HTMLButtonElement).click();
                                  await new Promise(resolve => setTimeout(resolve, 1000));
                                  (prevBtn as HTMLButtonElement).click();
                                  await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                              }
                              
                              // Strategy 3: Force DOM reflow
                              console.log('🔄 Forcing DOM reflow...');
                              const pdfContainer = document.querySelector('.react-pdf__Document');
                              if (pdfContainer) {
                                const originalTransform = (pdfContainer as HTMLElement).style.transform;
                                (pdfContainer as HTMLElement).style.transform = 'translateZ(0)';
                                (pdfContainer as HTMLElement).offsetHeight; // Force reflow
                                (pdfContainer as HTMLElement).style.transform = originalTransform;
                              }
                              
                              // Strategy 4: Scroll to trigger lazy loading
                              console.log('📜 Scrolling to trigger rendering...');
                              window.scrollBy(0, 10);
                              await new Promise(resolve => setTimeout(resolve, 100));
                              window.scrollBy(0, -10);
                              
                              console.log('✅ Force render complete - try Debug QR again');
                            }}
                            style={{
                              background: '#ffc107',
                              color: 'black',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '4px 8px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            🔄 Force Render
                          </button>
                          <button
                            onClick={async () => {
                              console.log('🔍 Manual QR Area Test triggered');
                              
                              const canvas = document.querySelector('canvas') as HTMLCanvasElement;
                              if (!canvas) {
                                console.log('❌ No canvas found');
                                return;
                              }
                              
                              const ctx = canvas.getContext('2d', { willReadFrequently: true });
                              if (!ctx) {
                                console.log('❌ No canvas context');
                                return;
                              }
                              
                              console.log(`📋 Testing specific areas of canvas: ${canvas.width}x${canvas.height}`);
                              
                              // Test specific areas where QR codes are likely to be
                              const testAreas = [
                                { x: 0, y: 0, w: 300, h: 300, name: 'top-left-300x300' },
                                { x: Math.floor(canvas.width * 0.1), y: Math.floor(canvas.height * 0.15), w: 250, h: 250, name: 'upper-area-250x250' },
                                { x: Math.floor(canvas.width * 0.1), y: Math.floor(canvas.height * 0.35), w: 250, h: 250, name: 'middle-area-250x250' },
                                { x: Math.floor(canvas.width * 0.05), y: Math.floor(canvas.height * 0.1), w: 400, h: 400, name: 'large-upper-area-400x400' }
                              ];
                              
                              for (const area of testAreas) {
                                if (area.x + area.w <= canvas.width && area.y + area.h <= canvas.height) {
                                  console.log(`\n🔍 Testing ${area.name} at (${area.x}, ${area.y})`);
                                  
                                  try {
                                    const imageData = ctx.getImageData(area.x, area.y, area.w, area.h);
                                    
                                    // Quick content analysis
                                    let blackPixels = 0;
                                    let whitePixels = 0;
                                    let totalPixels = 0;
                                    
                                    for (let i = 0; i < imageData.data.length; i += 16) { // Sample every 4th pixel
                                      const r = imageData.data[i];
                                      const g = imageData.data[i + 1];
                                      const b = imageData.data[i + 2];
                                      const a = imageData.data[i + 3];
                                      
                                      if (a > 0) {
                                        totalPixels++;
                                        const brightness = (r + g + b) / 3;
                                        if (brightness < 128) {
                                          blackPixels++;
                                        } else if (brightness > 200) {
                                          whitePixels++;
                                        }
                                      }
                                    }
                                    
                                    const blackRatio = totalPixels > 0 ? blackPixels / totalPixels : 0;
                                    const whiteRatio = totalPixels > 0 ? whitePixels / totalPixels : 0;
                                    
                                    console.log(`  Content: ${blackPixels} black, ${whitePixels} white, ${totalPixels} total`);
                                    console.log(`  Ratios: ${(blackRatio * 100).toFixed(1)}% black, ${(whiteRatio * 100).toFixed(1)}% white`);
                                    
                                    // Try jsQR on this area if it has good contrast
                                    if (blackRatio > 0.05 && blackRatio < 0.8) {
                                      console.log(`  🔍 Good contrast detected, trying jsQR...`);
                                      
                                      // Try to use jsQR if available globally or import it
                                      try {
                                        let jsQRFunc = null;
                                        
                                        // Try global jsQR first
                                        if (typeof (window as any).jsQR === 'function') {
                                          jsQRFunc = (window as any).jsQR;
                                        } else {
                                          // Try to import jsQR dynamically
                                          const jsQRModule = await import('jsqr');
                                          jsQRFunc = jsQRModule.default;
                                        }
                                        
                                        if (jsQRFunc) {
                                          const qrResult = jsQRFunc(imageData.data, imageData.width, imageData.height);
                                          if (qrResult) {
                                            console.log(`  🎯 QR CODE FOUND in ${area.name}!`);
                                            console.log(`  Content: ${qrResult.data}`);
                                            console.log(`  Position: (${area.x + qrResult.location.topLeftCorner.x}, ${area.y + qrResult.location.topLeftCorner.y})`);
                                          } else {
                                            console.log(`  ❌ No QR code found in ${area.name}`);
                                          }
                                        } else {
                                          console.log(`  ❌ jsQR not available`);
                                        }
                                      } catch (jsqrError) {
                                        console.log(`  ⚠️ jsQR error in ${area.name}:`, jsqrError);
                                      }
                                    } else {
                                      console.log(`  ⚠️ Poor contrast (${(blackRatio * 100).toFixed(1)}% black) - skipping jsQR`);
                                    }
                                    
                                  } catch (areaError) {
                                    console.log(`  ❌ Error testing ${area.name}:`, areaError);
                                  }
                                }
                              }
                              
                              console.log('\n✅ Manual area test complete');
                            }}
                            style={{
                              background: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '4px 8px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            🎯 Test Areas
                          </button>
                          <button
                            onClick={() => {
                              console.log('🧹 Clear Storage triggered');
                              
                              // Clear localStorage annotations to fix validation issues
                              const keys = Object.keys(localStorage);
                              const annotationKeys = keys.filter(key => 
                                key.includes('annotations') || 
                                key.includes('ebook-utility') ||
                                key.includes('pdf-annotation')
                              );
                              
                              console.log('🧹 Found annotation keys to clear:', annotationKeys);
                              
                              annotationKeys.forEach(key => {
                                localStorage.removeItem(key);
                                console.log(`🧹 Cleared: ${key}`);
                              });
                              
                              console.log('✅ Storage cleared - try QR scanning again');
                              
                              // Refresh the page to reset state
                              setTimeout(() => {
                                window.location.reload();
                              }, 1000);
                            }}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '4px 8px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            🧹 Clear Storage
                          </button>
                          <button
                            onClick={() => {
                              console.log('🔧 Complete App Reset triggered');
                              
                              // Clear all localStorage
                              localStorage.clear();
                              
                              // Clear all sessionStorage
                              sessionStorage.clear();
                              
                              // Clear any cached data
                              if ('caches' in window) {
                                caches.keys().then(names => {
                                  names.forEach(name => {
                                    caches.delete(name);
                                  });
                                });
                              }
                              
                              console.log('✅ Complete reset done - refreshing page...');
                              
                              // Force a hard refresh
                              window.location.reload();
                            }}
                            style={{
                              background: '#6f42c1',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '4px 8px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            🔧 Reset App
                          </button>
                          <span style={{ fontSize: '10px', color: '#666' }}>
                            Status: {qrScanning.state.foundQRCodes > 0 ? `${qrScanning.state.foundQRCodes} QR codes found` : 'Ready to scan'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </ControlsGroup>
              </ControlsBar>

              <PdfViewerWrapper data-pdf-viewer-container>
                {/* Note: VirtualizedPdfDisplay doesn't support CTAs yet - they will be shown in the CTA list sidebar */}
                {enableVirtualization ? (
                  <VirtualizedPdfDisplay
                    key={`virtualized-pdf-page-${pdfState.currentPage}`} // Force re-render on page change
                    file={pdfState.file}
                    pageNumber={pdfState.currentPage}
                    scale={pdfState.scale}
                    zoomMode={pdfState.zoomMode}
                    highlights={currentDocumentHighlights}
                    comments={currentDocumentComments}
                    onLoadSuccess={handlePdfLoadSuccess}
                    onLoadError={handlePdfLoadError}
                    onTextSelected={handleTextSelected}
                    onHighlightCreate={handleHighlightCreate}
                    onHighlightClick={handleHighlightClick}
                    onAreaClick={handleAreaClick}
                    onCommentCreate={handleCommentCreate}
                    onCommentClick={handleCommentClick}
                    onCommentEdit={handleCommentEdit}
                    onCommentDelete={handleCommentDelete}
                    onScaleChange={handleScaleChange}
                    onPageChange={handlePageChange}
                  />
                ) : (
                  <PdfDisplay
                    key={`pdf-page-${pdfState.currentPage}`} // Force re-render on page change
                    file={pdfState.file}
                    pageNumber={pdfState.currentPage}
                    scale={pdfState.scale}
                    zoomMode={pdfState.zoomMode}
                    highlights={currentDocumentHighlights.filter(h => h.pageNumber === pdfState.currentPage)}
                    comments={currentDocumentComments.filter(c => c.pageNumber === pdfState.currentPage)}
                    callToActions={currentDocumentCTAs.filter(cta => cta.pageNumber === pdfState.currentPage)}
                    onLoadSuccess={handlePdfLoadSuccess}
                    onLoadError={handlePdfLoadError}
                    onTextSelected={handleTextSelected}
                    onHighlightCreate={handleHighlightCreate}
                    onHighlightClick={handleHighlightClick}
                    onAreaClick={handleAreaClick}
                    onCommentCreate={handleCommentCreate}
                    onCommentClick={handleCommentClick}
                    onCommentEdit={handleCommentEdit}
                    onCommentDelete={handleCommentDelete}
                    onCTACreate={handleCTACreateFromPDF}
                    onCTAClick={(cta) => {
                      console.log('🔗 CTA clicked in PDF viewer:', cta);
                      // URL opening is handled by CTAOverlay component to avoid double popups
                    }}
                    onCTAUpdate={(ctaId, updates) => {
                      console.log('🔗 CTA update requested:', ctaId, updates);
                      updateCallToAction(ctaId, updates);
                    }}
                    onCTADelete={deleteCallToAction}
                    onScaleChange={handleScaleChange}
                    onPageChange={handlePageChange}
                  />
                )}
              </PdfViewerWrapper>
            </>
          ) : (
            <UploadArea>
              <div style={{ maxWidth: '500px', width: '100%' }}>
                <PdfUpload
                  onFileSelect={handleFileUpload}
                  onError={handleFileUploadError}
                />
                {pdfState.error && (
                  <div style={{
                    marginTop: theme.spacing.md,
                    padding: theme.spacing.md,
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    border: '1px solid #f5c6cb',
                    borderRadius: theme.borderRadius.sm,
                  }}>
                    {pdfState.error}
                  </div>
                )}
              </div>
            </UploadArea>
          )}
        </ViewerArea>
      </MainContent>

      {/* Bookmark Panel Modal */}
      <BookmarkPanel
        bookmarks={currentDocumentBookmarks}
        onBookmarkClick={handleBookmarkClick}
        onBookmarkEdit={handleBookmarkEdit}
        onBookmarkDelete={handleBookmarkDelete}
        isVisible={showBookmarkPanel}
        onClose={() => setShowBookmarkPanel(false)}
      />

      {/* Mobile highlight hint */}
      <MobileHighlightHint />

      {/* QR Scanning Debug Controls */}
      {process.env.NODE_ENV === 'development' && pdfState.file && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '15px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '12px',
          maxWidth: '300px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            QR Scanning Debug
          </div>
          
          <div style={{ fontSize: '11px', marginBottom: '10px' }}>
            Status: {qrScanning.state.isScanning ? 'Scanning...' : 'Ready'}<br/>
            Progress: {Math.round(qrScanning.state.progress)}%<br/>
            Found: {qrScanning.state.foundQRCodes} QR codes<br/>
            CTAs: {qrScanning.state.generatedCTAs}<br/>
            Page: {qrScanning.state.currentPage}/{qrScanning.state.totalPages}<br/>
            Errors: {qrScanning.state.errors.length}
          </div>

          <button
            onClick={() => {
              console.log('🔍 Starting multi-page QR scanning...');
              qrScanning.startScanning();
            }}
            disabled={qrScanning.state.isScanning}
            style={{
              background: qrScanning.state.isScanning ? '#666' : '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: qrScanning.state.isScanning ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            {qrScanning.state.isScanning ? 'Scanning...' : '🔍 Scan All Pages'}
          </button>

          <button
            onClick={() => {
              console.log('🧹 Clearing all storage...');
              localStorage.clear();
              sessionStorage.clear();
              if ('indexedDB' in window) {
                indexedDB.databases().then(databases => {
                  databases.forEach(db => {
                    if (db.name) {
                      indexedDB.deleteDatabase(db.name);
                    }
                  });
                });
              }
              alert('Storage cleared!');
            }}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🧹 Clear Storage
          </button>

          {qrScanning.state.errors.length > 0 && (
            <div style={{
              background: '#dc3545',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '11px',
              maxHeight: '100px',
              overflowY: 'auto'
            }}>
              <strong>Errors:</strong><br/>
              {qrScanning.state.errors.map((error, index) => (
                <div key={index}>
                  Page {error.pageNumber}: {error.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Container>
  );
};