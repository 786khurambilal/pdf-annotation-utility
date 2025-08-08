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
import { theme } from '../../styles/theme';
import { TextSelection, Highlight, Comment, CallToAction, Bookmark, AreaCoordinates } from '../../types/annotation.types';
import { MobileHighlightHint } from '../common/MobileHighlightHint';

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

  // Handle CTA click
  const handleCTAClick = useCallback((cta: CallToAction) => {
    console.log('🔗 CTA clicked:', {
      ctaId: cta.id,
      pageNumber: cta.pageNumber,
      currentPage: pdfState.currentPage,
      isMobile: responsive.isMobile,
      screenWidth: responsive.screenWidth,
      sidebarOpen
    });
    
    // Navigate to the CTA's page if not already there
    if (cta.pageNumber !== pdfState.currentPage) {
      console.log('🔗 Navigating to page:', cta.pageNumber);
      setCurrentPage(cta.pageNumber);
    }
    
    // Close sidebar on mobile after navigation with a small delay
    if (responsive.isMobile) {
      console.log('🔗 Closing sidebar on mobile');
      setTimeout(() => {
        setSidebarOpen(false);
      }, 100); // Small delay to ensure page navigation starts first
    }
  }, [pdfState.currentPage, setCurrentPage, responsive.isMobile, responsive.screenWidth, sidebarOpen]);

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
            onCTAClick={handleCTAClick}
            onCTAEdit={(cta) => {
              console.log('🔗 CTA edit requested:', cta);
              // For now, just log the edit request
              // TODO: Implement CTA editing modal or inline editing
              alert(`CTA Edit: ${cta.label} (${cta.url})\nEditing functionality coming soon!`);
            }}
            onCTADelete={deleteCallToAction}
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

      <MainContent>
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
                Go to Page 1
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
                Go to Page 2
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
                </ControlsGroup>
              </ControlsBar>

              <PdfViewerWrapper data-pdf-viewer-container>
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
    </Container>
  );
};