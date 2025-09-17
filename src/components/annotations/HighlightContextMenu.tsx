import React, { useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Highlight } from '../../types/annotation.types';

interface HighlightContextMenuProps {
  highlight: Highlight | null;
  position: { x: number; y: number } | null;
  onEdit: (highlight: Highlight) => void;
  onDelete: (highlight: Highlight) => void;
  onClose: () => void;
  isVisible: boolean;
}

const MenuContainer = styled.div.withConfig({
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

const HighlightPreview = styled.div`
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: #666;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const HighlightContextMenu: React.FC<HighlightContextMenuProps> = ({
  highlight,
  position,
  onEdit,
  onDelete,
  onClose,
  isVisible
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleEdit = useCallback(() => {
    if (highlight) {
      onEdit(highlight);
      onClose();
    }
  }, [highlight, onEdit, onClose]);

  const handleDelete = useCallback(() => {
    if (highlight) {
      onDelete(highlight);
      onClose();
    }
  }, [highlight, onDelete, onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isVisible, handleKeyDown, handleClickOutside]);

  if (!isVisible || !highlight || !position) {
    return null;
  }

  return (
    <MenuContainer
      ref={menuRef}
      x={position.x}
      y={position.y}
      isVisible={isVisible}
    >
      <HighlightPreview>
        "{highlight.selectedText.length > 30 
          ? `${highlight.selectedText.substring(0, 30)}...` 
          : highlight.selectedText}"
      </HighlightPreview>
      
      <MenuItem onClick={handleEdit}>
        Edit Highlight
      </MenuItem>
      
      <MenuSeparator />
      
      <MenuItem className="danger" onClick={handleDelete}>
        Delete Highlight
      </MenuItem>
    </MenuContainer>
  );
};