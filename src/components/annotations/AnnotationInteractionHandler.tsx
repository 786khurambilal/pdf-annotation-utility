import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Highlight, Comment, CallToAction } from '../../types/annotation.types';
import { HighlightContextMenu } from './HighlightContextMenu';
import { HighlightEditor } from './HighlightEditor';

interface AnnotationInteractionHandlerProps {
  highlights: Highlight[];
  comments: Comment[];
  callToActions: CallToAction[];
  pageNumber: number;
  scale: number;
  onHighlightUpdate: (highlightId: string, updates: Partial<Highlight>) => void;
  onHighlightDelete: (highlightId: string) => void;
  onCommentUpdate: (commentId: string, updates: Partial<Comment>) => void;
  onCommentDelete: (commentId: string) => void;
  onCTAUpdate: (ctaId: string, updates: Partial<CallToAction>) => void;
  onCTADelete: (ctaId: string) => void;
  children: React.ReactNode;
}

interface ContextMenuState {
  type: 'highlight' | 'comment' | 'cta' | null;
  annotation: Highlight | Comment | CallToAction | null;
  position: { x: number; y: number } | null;
}

interface EditingState {
  type: 'highlight' | 'comment' | 'cta' | null;
  annotation: Highlight | Comment | CallToAction | null;
  position: { x: number; y: number } | null;
}

const InteractionContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const ContextMenu = styled.div.withConfig({
  shouldForwardProp: (prop) => !['x', 'y', 'isVisible'].includes(prop)
})<{
  x: number;
  y: number;
  isVisible: boolean;
}>`
  position: fixed;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;
  display: ${props => props.isVisible ? 'block' : 'none'};
  overflow: hidden;
`;

const MenuItem = styled.button`
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: white;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  color: #333;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f8f9fa;
  }

  &:focus {
    outline: none;
    background-color: #e9ecef;
  }

  &.danger {
    color: #dc3545;
  }

  &.danger:hover {
    background-color: #f8d7da;
  }
`;

const MenuSeparator = styled.div`
  height: 1px;
  background-color: #dee2e6;
  margin: 0.25rem 0;
`;

const EditModal = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isVisible'].includes(prop)
})<{
  isVisible: boolean;
}>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.isVisible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const EditForm = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  min-width: 400px;
  max-width: 600px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background-color: #007bff;
          border-color: #007bff;
          color: white;
          &:hover { background-color: #0056b3; border-color: #0056b3; }
        `;
      case 'danger':
        return `
          background-color: #dc3545;
          border-color: #dc3545;
          color: white;
          &:hover { background-color: #c82333; border-color: #bd2130; }
        `;
      default:
        return `
          background-color: white;
          border-color: #6c757d;
          color: #6c757d;
          &:hover { background-color: #f8f9fa; }
        `;
    }
  }}

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

export const AnnotationInteractionHandler: React.FC<AnnotationInteractionHandlerProps> = ({
  highlights,
  comments,
  callToActions,
  pageNumber,
  scale,
  onHighlightUpdate,
  onHighlightDelete,
  onCommentUpdate,
  onCommentDelete,
  onCTAUpdate,
  onCTADelete,
  children
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    type: null,
    annotation: null,
    position: null
  });

  const [editing, setEditing] = useState<EditingState>({
    type: null,
    annotation: null,
    position: null
  });

  const [editFormData, setEditFormData] = useState<any>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle context menu for highlights
  const handleHighlightContextMenu = useCallback((highlight: Highlight, position: { x: number; y: number }) => {
    setContextMenu({
      type: 'highlight',
      annotation: highlight,
      position
    });
  }, []);

  // Handle context menu for comments
  const handleCommentContextMenu = useCallback((comment: Comment, position: { x: number; y: number }) => {
    setContextMenu({
      type: 'comment',
      annotation: comment,
      position
    });
  }, []);

  // Handle context menu for CTAs
  const handleCTAContextMenu = useCallback((cta: CallToAction, position: { x: number; y: number }) => {
    setContextMenu({
      type: 'cta',
      annotation: cta,
      position
    });
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu({
      type: null,
      annotation: null,
      position: null
    });
  }, []);

  // Handle edit action from context menu
  const handleEditFromContextMenu = useCallback(() => {
    if (contextMenu.annotation && contextMenu.type) {
      setEditing({
        type: contextMenu.type,
        annotation: contextMenu.annotation,
        position: contextMenu.position
      });

      // Initialize form data based on annotation type
      switch (contextMenu.type) {
        case 'highlight':
          const highlight = contextMenu.annotation as Highlight;
          setEditFormData({
            color: highlight.color,
            selectedText: highlight.selectedText
          });
          break;
        case 'comment':
          const comment = contextMenu.annotation as Comment;
          setEditFormData({
            content: comment.content
          });
          break;
        case 'cta':
          const cta = contextMenu.annotation as CallToAction;
          setEditFormData({
            label: cta.label,
            url: cta.url
          });
          break;
      }

      closeContextMenu();
    }
  }, [contextMenu, closeContextMenu]);

  // Handle delete action from context menu
  const handleDeleteFromContextMenu = useCallback(() => {
    if (contextMenu.annotation && contextMenu.type) {
      switch (contextMenu.type) {
        case 'highlight':
          onHighlightDelete(contextMenu.annotation.id);
          break;
        case 'comment':
          onCommentDelete(contextMenu.annotation.id);
          break;
        case 'cta':
          onCTADelete(contextMenu.annotation.id);
          break;
      }
      closeContextMenu();
    }
  }, [contextMenu, onHighlightDelete, onCommentDelete, onCTADelete, closeContextMenu]);

  // Handle form input changes
  const handleFormChange = useCallback((field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (editing.annotation && editing.type) {
      switch (editing.type) {
        case 'highlight':
          onHighlightUpdate(editing.annotation.id, {
            color: editFormData.color,
            updatedAt: new Date()
          });
          break;
        case 'comment':
          onCommentUpdate(editing.annotation.id, {
            content: editFormData.content,
            updatedAt: new Date()
          });
          break;
        case 'cta':
          onCTAUpdate(editing.annotation.id, {
            label: editFormData.label,
            url: editFormData.url,
            updatedAt: new Date()
          });
          break;
      }

      setEditing({
        type: null,
        annotation: null,
        position: null
      });
      setEditFormData({});
    }
  }, [editing, editFormData, onHighlightUpdate, onCommentUpdate, onCTAUpdate]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditing({
      type: null,
      annotation: null,
      position: null
    });
    setEditFormData({});
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu.type && !event.target?.closest?.('[data-context-menu]')) {
        closeContextMenu();
      }
    };

    if (contextMenu.type) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.type, closeContextMenu]);

  // Close context menu on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (editing.type) {
          handleCancelEdit();
        } else if (contextMenu.type) {
          closeContextMenu();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editing.type, contextMenu.type, handleCancelEdit, closeContextMenu]);

  // For now, just render children as-is since we're having React import issues
  // In a real implementation, we would clone children and add interaction handlers
  const enhancedChildren = children;

  const renderEditForm = () => {
    if (!editing.type || !editing.annotation) return null;

    switch (editing.type) {
      case 'highlight':
        return (
          <EditForm>
            <h3>Edit Highlight</h3>
            <FormGroup>
              <Label>Selected Text</Label>
              <TextArea
                value={editFormData.selectedText || ''}
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </FormGroup>
            <FormGroup>
              <Label>Color</Label>
              <Input
                type="color"
                value={editFormData.color || '#ffff00'}
                onChange={(e) => handleFormChange('color', e.target.value)}
              />
            </FormGroup>
            <ButtonGroup>
              <Button variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </ButtonGroup>
          </EditForm>
        );

      case 'comment':
        return (
          <EditForm>
            <h3>Edit Comment</h3>
            <FormGroup>
              <Label>Comment Text</Label>
              <TextArea
                value={editFormData.content || ''}
                onChange={(e) => handleFormChange('content', e.target.value)}
                placeholder="Enter your comment..."
              />
            </FormGroup>
            <ButtonGroup>
              <Button variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </ButtonGroup>
          </EditForm>
        );

      case 'cta':
        return (
          <EditForm>
            <h3>Edit Call-to-Action</h3>
            <FormGroup>
              <Label>Label</Label>
              <Input
                type="text"
                value={editFormData.label || ''}
                onChange={(e) => handleFormChange('label', e.target.value)}
                placeholder="Enter CTA label..."
              />
            </FormGroup>
            <FormGroup>
              <Label>URL</Label>
              <Input
                type="url"
                value={editFormData.url || ''}
                onChange={(e) => handleFormChange('url', e.target.value)}
                placeholder="https://example.com"
              />
            </FormGroup>
            <ButtonGroup>
              <Button variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </ButtonGroup>
          </EditForm>
        );

      default:
        return null;
    }
  };

  return (
    <InteractionContainer ref={containerRef}>
      {enhancedChildren}

      {/* Context Menu */}
      {contextMenu.type && contextMenu.position && (
        <ContextMenu
          data-context-menu
          x={contextMenu.position.x}
          y={contextMenu.position.y}
          isVisible={true}
        >
          <MenuItem onClick={handleEditFromContextMenu}>
            Edit {contextMenu.type === 'cta' ? 'CTA' : contextMenu.type}
          </MenuItem>
          <MenuSeparator />
          <MenuItem className="danger" onClick={handleDeleteFromContextMenu}>
            Delete {contextMenu.type === 'cta' ? 'CTA' : contextMenu.type}
          </MenuItem>
        </ContextMenu>
      )}

      {/* Edit Modal */}
      <EditModal isVisible={!!editing.type}>
        {renderEditForm()}
      </EditModal>
    </InteractionContainer>
  );
};