import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Comment } from '../../types/annotation.types';

interface CommentPopupProps {
  comment: Comment;
  isVisible: boolean;
  position: { x: number; y: number };
  onEdit: (commentId: string, newContent: string) => void;
  onDelete: (commentId: string) => void;
  onClose: () => void;
}

const PopupContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['x', 'y', 'isVisible'].includes(prop)
})<{ x: number; y: number; isVisible: boolean }>`
  position: fixed;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 250px;
  max-width: 350px;
  z-index: 1000;
  display: ${props => props.isVisible ? 'block' : 'none'};
  font-size: 0.9rem;
`;

const PopupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
  border-radius: 8px 8px 0 0;
`;

const PopupTitle = styled.div`
  font-weight: 500;
  color: #333;
  font-size: 0.85rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #e9ecef;
  }

  &:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }
`;

const PopupContent = styled.div`
  padding: 0.75rem;
`;

const CommentText = styled.div`
  line-height: 1.4;
  color: #333;
  margin-bottom: 0.75rem;
  word-wrap: break-word;
`;

const EditTextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  margin-bottom: 0.5rem;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const CommentMeta = styled.div`
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.75rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.375rem 0.75rem;
  border: 1px solid;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;

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
          &:hover { background-color: #f8f9fa; border-color: #5a6268; }
        `;
    }
  }}

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

export const CommentPopup: React.FC<CommentPopupProps> = ({
  comment,
  isVisible,
  position,
  onEdit,
  onDelete,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Reset editing state when comment changes or popup becomes visible
  useEffect(() => {
    if (isVisible) {
      setIsEditing(false);
      setEditContent(comment.content);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isVisible, comment.content]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      textAreaRef.current.focus();
      textAreaRef.current.select();
    }
  }, [isEditing]);

  // Handle clicks outside popup to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        if (!isEditing) {
          onClose();
        }
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, isEditing, onClose]);

  // Handle escape key to close popup or cancel editing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        if (isEditing) {
          handleCancelEdit();
        } else {
          onClose();
        }
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, isEditing]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent(comment.content);
    setError(null);
  }, [comment.content]);

  const handleContentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(event.target.value);
    if (error) {
      setError(null);
    }
  }, [error]);

  const handleSaveEdit = useCallback(() => {
    if (!editContent.trim()) {
      setError('Comment content cannot be empty');
      textAreaRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  }, [editContent, comment.id, onEdit]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      onDelete(comment.id);
    }
  }, [comment.id, onDelete]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (editContent.trim() && !isSubmitting) {
        handleSaveEdit();
      }
    }
  }, [editContent, isSubmitting, handleSaveEdit]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <PopupContainer
      ref={popupRef}
      x={position.x}
      y={position.y}
      isVisible={isVisible}
    >
      <PopupHeader>
        <PopupTitle>Comment</PopupTitle>
        <CloseButton 
          onClick={onClose}
          aria-label="Close comment popup"
        >
          ×
        </CloseButton>
      </PopupHeader>

      <PopupContent>
        <CommentMeta>
          Page {comment.pageNumber} • {formatDate(comment.createdAt)}
          {comment.updatedAt > comment.createdAt && ' (edited)'}
        </CommentMeta>

        {isEditing ? (
          <>
            <EditTextArea
              ref={textAreaRef}
              value={editContent}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter your comment..."
              disabled={isSubmitting}
              maxLength={1000}
            />
            {error && <ErrorMessage>{error}</ErrorMessage>}
            
            <ButtonGroup>
              <Button 
                variant="secondary" 
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveEdit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </ButtonGroup>
          </>
        ) : (
          <>
            <CommentText>{comment.content}</CommentText>
            
            <ButtonGroup>
              <Button variant="secondary" onClick={handleStartEdit}>
                Edit
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </ButtonGroup>
          </>
        )}
      </PopupContent>
    </PopupContainer>
  );
};