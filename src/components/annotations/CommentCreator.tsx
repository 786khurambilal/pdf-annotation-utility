import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { AreaCoordinates } from '../../types/annotation.types';

interface CommentCreatorProps {
  coordinates: AreaCoordinates | null;
  pageNumber: number;
  isVisible: boolean;
  onCreateComment: (content: string, coordinates: AreaCoordinates) => void;
  onCancel: () => void;
}

const ModalOverlay = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isVisible'
})<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.isVisible ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f0f0f0;
  }

  &:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }
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

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  &::placeholder {
    color: #999;
  }
`;

const CoordinatesInfo = styled.div`
  background-color: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.variant === 'primary' ? '#007bff' : '#6c757d'};
  background-color: ${props => props.variant === 'primary' ? '#007bff' : 'white'};
  color: ${props => props.variant === 'primary' ? 'white' : '#6c757d'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.variant === 'primary' ? '#0056b3' : '#f8f9fa'};
    border-color: ${props => props.variant === 'primary' ? '#0056b3' : '#5a6268'};
  }

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
  font-size: 0.8rem;
  margin-top: 0.25rem;
`;

export const CommentCreator: React.FC<CommentCreatorProps> = ({
  coordinates,
  pageNumber,
  isVisible,
  onCreateComment,
  onCancel
}) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Reset form when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      setContent('');
      setError(null);
      setIsSubmitting(false);
      // Focus the textarea after a short delay to ensure modal is rendered
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  const handleCancel = useCallback(() => {
    if (!isSubmitting) {
      onCancel();
    }
  }, [isSubmitting, onCancel]);

  const handleContentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
    if (error) {
      setError(null);
    }
  }, [error]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!content.trim()) {
      setError('Comment content is required');
      textAreaRef.current?.focus();
      return;
    }

    if (!coordinates) {
      setError('Invalid coordinates for comment placement');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      onCreateComment(content.trim(), coordinates);
      // Form will be reset when modal closes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create comment');
      setIsSubmitting(false);
    }
  }, [content, coordinates, onCreateComment]);

  const handleTextAreaKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (content.trim() && coordinates && !isSubmitting) {
        handleSubmit(event as any);
      }
    }
  }, [content, coordinates, isSubmitting, handleSubmit]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible && !isSubmitting) {
        handleCancel();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, isSubmitting, handleCancel]);

  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }, [handleCancel]);

  console.log('💬 CommentCreator render:', { isVisible, coordinates, pageNumber });
  
  if (!isVisible || !coordinates) {
    console.log('💬 CommentCreator not rendering - isVisible:', isVisible, 'coordinates:', coordinates);
    return null;
  }
  
  console.log('💬 CommentCreator rendering modal');

  return (
    <ModalOverlay isVisible={isVisible} onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Add Comment</ModalTitle>
          <CloseButton 
            onClick={handleCancel} 
            disabled={isSubmitting}
            aria-label="Close comment creator"
          >
            ×
          </CloseButton>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <CoordinatesInfo>
            Page {pageNumber} • Position: ({Math.round(coordinates.x)}, {Math.round(coordinates.y)})
          </CoordinatesInfo>

          <FormGroup>
            <Label htmlFor="comment-content">Comment</Label>
            <TextArea
              ref={textAreaRef}
              id="comment-content"
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleTextAreaKeyDown}
              placeholder="Enter your comment here..."
              disabled={isSubmitting}
              maxLength={1000}
            />
            {error && <ErrorMessage>{error}</ErrorMessage>}
          </FormGroup>

          <ButtonGroup>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={isSubmitting || !content}
            >
              {isSubmitting ? 'Creating...' : 'Create Comment'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};