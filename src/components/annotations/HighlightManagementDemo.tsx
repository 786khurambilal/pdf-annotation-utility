import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { HighlightOverlay } from './HighlightOverlay';
import { HighlightContextMenu } from './HighlightContextMenu';
import { HighlightEditor } from './HighlightEditor';
import { HighlightList } from './HighlightList';
import { Highlight } from '../../types/annotation.types';
import { AnnotationManager } from '../../utils/AnnotationManager';

interface HighlightManagementDemoProps {
  highlights: Highlight[];
  pageNumber: number;
  scale: number;
  userId: string;
  documentId: string;
  onHighlightUpdate: (highlights: Highlight[]) => void;
  onNavigateToPage?: (pageNumber: number) => void;
}

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const ControlPanel = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100;
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #007bff;
  border-radius: 4px;
  background: white;
  color: #007bff;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover {
    background-color: #007bff;
    color: white;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const Stats = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #666;
`;

export const HighlightManagementDemo: React.FC<HighlightManagementDemoProps> = ({
  highlights,
  pageNumber,
  scale,
  userId,
  documentId,
  onHighlightUpdate,
  onNavigateToPage
}) => {
  const [contextMenu, setContextMenu] = useState<{
    highlight: Highlight;
    position: { x: number; y: number };
  } | null>(null);
  
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [showHighlightList, setShowHighlightList] = useState(false);

  const annotationManager = AnnotationManager.getInstance();

  const handleHighlightClick = useCallback((highlight: Highlight) => {
    console.log('Highlight clicked:', highlight.selectedText);
    // Could navigate to the highlight's page
    if (onNavigateToPage && highlight.pageNumber !== pageNumber) {
      onNavigateToPage(highlight.pageNumber);
    }
  }, [onNavigateToPage, pageNumber]);

  const handleHighlightHover = useCallback((highlight: Highlight | null) => {
    // Could show additional information or preview
    if (highlight) {
      console.log('Hovering over highlight:', highlight.selectedText);
    }
  }, []);

  const handleHighlightContextMenu = useCallback((highlight: Highlight, position: { x: number; y: number }) => {
    setContextMenu({ highlight, position });
  }, []);

  const handleContextMenuEdit = useCallback((highlight: Highlight) => {
    setEditingHighlight(highlight);
    setContextMenu(null);
  }, []);

  const handleContextMenuDelete = useCallback((highlight: Highlight) => {
    try {
      annotationManager.deleteHighlight(userId, documentId, highlight.id);
      const updatedAnnotations = annotationManager.getAnnotations(userId, documentId);
      onHighlightUpdate(updatedAnnotations.highlights);
      setContextMenu(null);
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  }, [userId, documentId, annotationManager, onHighlightUpdate]);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleEditorSave = useCallback((highlight: Highlight, updates: { color: string }) => {
    try {
      annotationManager.updateHighlight(userId, documentId, highlight.id, updates);
      const updatedAnnotations = annotationManager.getAnnotations(userId, documentId);
      onHighlightUpdate(updatedAnnotations.highlights);
      setEditingHighlight(null);
    } catch (error) {
      console.error('Failed to update highlight:', error);
    }
  }, [userId, documentId, annotationManager, onHighlightUpdate]);

  const handleEditorCancel = useCallback(() => {
    setEditingHighlight(null);
  }, []);

  const handleListHighlightClick = useCallback((highlight: Highlight) => {
    // Navigate to the highlight's page
    if (onNavigateToPage) {
      onNavigateToPage(highlight.pageNumber);
    }
  }, [onNavigateToPage]);

  const handleListHighlightEdit = useCallback((highlight: Highlight) => {
    setEditingHighlight(highlight);
    setShowHighlightList(false);
  }, []);

  const handleListHighlightDelete = useCallback((highlight: Highlight) => {
    try {
      annotationManager.deleteHighlight(userId, documentId, highlight.id);
      const updatedAnnotations = annotationManager.getAnnotations(userId, documentId);
      onHighlightUpdate(updatedAnnotations.highlights);
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  }, [userId, documentId, annotationManager, onHighlightUpdate]);

  const handleShowHighlightList = useCallback(() => {
    setShowHighlightList(true);
  }, []);

  const handleCloseHighlightList = useCallback(() => {
    setShowHighlightList(false);
  }, []);

  const pageHighlights = highlights.filter(h => h.pageNumber === pageNumber);
  const totalHighlights = highlights.length;

  return (
    <Container>
      <Stats>
        Page {pageNumber} • {pageHighlights.length} highlights on this page • {totalHighlights} total
      </Stats>

      <ControlPanel>
        <Button onClick={handleShowHighlightList}>
          Manage Highlights ({totalHighlights})
        </Button>
      </ControlPanel>

      <HighlightOverlay
        highlights={highlights}
        pageNumber={pageNumber}
        scale={scale}
        onHighlightClick={handleHighlightClick}
        onHighlightHover={handleHighlightHover}
        onHighlightContextMenu={handleHighlightContextMenu}
      />

      <HighlightContextMenu
        highlight={contextMenu?.highlight || null}
        position={contextMenu?.position || null}
        onEdit={handleContextMenuEdit}
        onDelete={handleContextMenuDelete}
        onClose={handleContextMenuClose}
        isVisible={!!contextMenu}
      />

      <HighlightEditor
        highlight={editingHighlight}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
        isVisible={!!editingHighlight}
      />

      <HighlightList
        highlights={highlights}
        onHighlightClick={handleListHighlightClick}
        onHighlightEdit={handleListHighlightEdit}
        onHighlightDelete={handleListHighlightDelete}
        isVisible={showHighlightList}
        onClose={handleCloseHighlightList}
      />
    </Container>
  );
};