import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { RectangleCoordinates } from '../../types/annotation.types';

interface CTACreatorProps {
  coordinates: RectangleCoordinates | null;
  pageNumber: number;
  isVisible: boolean;
  onCreateCTA: (url: string, label: string, coordinates: RectangleCoordinates) => void;
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

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  &::placeholder {
    color: #999;
  }

  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
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

const HelpText = styled.div`
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.25rem;
`;

// URL validation function
const validateURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

export const CTACreator: React.FC<CTACreatorProps> = ({
  coordinates,
  pageNumber,
  isVisible,
  onCreateCTA,
  onCancel
}) => {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      setUrl('');
      setLabel('');
      setUrlError(null);
      setLabelError(null);
      setIsSubmitting(false);
      // Focus the URL input after a short delay to ensure modal is rendered
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  const handleCancel = useCallback(() => {
    if (!isSubmitting) {
      onCancel();
    }
  }, [isSubmitting, onCancel]);

  const handleUrlChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = event.target.value;
    setUrl(newUrl);
    
    // Clear URL error when user starts typing
    if (urlError) {
      setUrlError(null);
    }

    // Auto-generate label from URL if label is empty
    if (!label && newUrl) {
      try {
        const urlObj = new URL(newUrl);
        const hostname = urlObj.hostname.replace('www.', '');
        setLabel(hostname);
      } catch {
        // Invalid URL, don't auto-generate label
      }
    }
  }, [urlError, label]);

  const handleLabelChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(event.target.value);
    if (labelError) {
      setLabelError(null);
    }
  }, [labelError]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    let hasErrors = false;

    // Validate URL
    if (!url.trim()) {
      setUrlError('URL is required');
      hasErrors = true;
    } else if (!validateURL(url.trim())) {
      setUrlError('Please enter a valid URL (must start with http:// or https://)');
      hasErrors = true;
    }

    // Validate label
    if (!label.trim()) {
      setLabelError('Label is required');
      hasErrors = true;
    } else if (label.trim().length > 50) {
      setLabelError('Label must be 50 characters or less');
      hasErrors = true;
    }

    // Validate coordinates
    if (!coordinates) {
      setUrlError('Invalid coordinates for call-to-action placement');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setIsSubmitting(true);

    try {
      onCreateCTA(url.trim(), label.trim(), coordinates!);
      // Form will be reset when modal closes
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to create call-to-action');
      setIsSubmitting(false);
    }
  }, [url, label, coordinates, onCreateCTA]);

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

  if (!isVisible || !coordinates) {
    return null;
  }

  const isFormValid = url.trim() && label.trim() && validateURL(url.trim()) && !isSubmitting;

  return (
    <ModalOverlay isVisible={isVisible} onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Create Call-to-Action</ModalTitle>
          <CloseButton 
            onClick={handleCancel} 
            disabled={isSubmitting}
            aria-label="Close CTA creator"
          >
            ×
          </CloseButton>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <CoordinatesInfo>
            Page {pageNumber} • Area: {Math.round(coordinates.width)} × {Math.round(coordinates.height)} px
            at ({Math.round(coordinates.x)}, {Math.round(coordinates.y)})
          </CoordinatesInfo>

          <FormGroup>
            <Label htmlFor="cta-url">URL *</Label>
            <Input
              ref={urlInputRef}
              id="cta-url"
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://example.com"
              disabled={isSubmitting}
              maxLength={500}
            />
            {urlError && <ErrorMessage>{urlError}</ErrorMessage>}
            <HelpText>Enter the external link that will open when users click this area</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cta-label">Label *</Label>
            <Input
              id="cta-label"
              type="text"
              value={label}
              onChange={handleLabelChange}
              placeholder="Click here to visit..."
              disabled={isSubmitting}
              maxLength={50}
            />
            {labelError && <ErrorMessage>{labelError}</ErrorMessage>}
            <HelpText>Short description that will appear as a tooltip (max 50 characters)</HelpText>
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
              disabled={!isFormValid}
            >
              {isSubmitting ? 'Creating...' : 'Create Call-to-Action'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};