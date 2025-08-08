import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { TextSelection } from '../../types/annotation.types';

interface HighlightCreatorProps {
  selection: TextSelection | null;
  onCreateHighlight: (selection: TextSelection, color: string) => void;
  onCancel: () => void;
  isVisible: boolean;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Green', value: '#90EE90' },
  { name: 'Blue', value: '#87CEEB' },
  { name: 'Pink', value: '#FFB6C1' },
  { name: 'Orange', value: '#FFA500' },
  { name: 'Purple', value: '#DDA0DD' }
];

const Overlay = styled.div.withConfig({
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

const Modal = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;

  @media (max-width: 480px) {
    width: 95%;
    padding: 1rem;
    border-radius: 12px;
  }
`;

const Title = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  color: #333;
`;

const SelectedText = styled.div`
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  font-style: italic;
  color: #666;
  max-height: 100px;
  overflow-y: auto;
`;

const ColorSection = styled.div`
  margin-bottom: 1.5rem;
`;

const ColorLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
`;

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`;

const ColorOption = styled.button.withConfig({
  shouldForwardProp: (prop) => !['color', 'isSelected'].includes(prop)
})<{ color: string; isSelected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px solid ${props => props.isSelected ? '#007bff' : '#dee2e6'};
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
  min-height: 44px; /* Touch-friendly minimum size */

  &:hover {
    border-color: #007bff;
  }

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  @media (max-width: 480px) {
    padding: 1rem;
    min-height: 48px;
  }
`;

const ColorSwatch = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'color'
})<{ color: string }>`
  width: 20px;
  height: 20px;
  background-color: ${props => props.color};
  border: 1px solid #ccc;
  border-radius: 2px;
  flex-shrink: 0;
`;

const ColorName = styled.span`
  font-size: 0.875rem;
  color: #333;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: 1px solid ${props => props.variant === 'primary' ? '#007bff' : '#6c757d'};
  border-radius: 6px;
  background-color: ${props => props.variant === 'primary' ? '#007bff' : 'white'};
  color: ${props => props.variant === 'primary' ? 'white' : '#6c757d'};
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  min-height: 44px; /* Touch-friendly minimum size */

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

  @media (max-width: 480px) {
    padding: 1rem 1.5rem;
    min-height: 48px;
    font-size: 1rem;
  }
`;

export const HighlightCreator: React.FC<HighlightCreatorProps> = ({
  selection,
  onCreateHighlight,
  onCancel,
  isVisible
}) => {
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);

  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!selection) {
      return;
    }
    
    try {
      await onCreateHighlight(selection, selectedColor);
    } catch (error) {
      // Handle error silently or show user-friendly message
    }
  }, [selection, selectedColor, onCreateHighlight]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }, [handleCancel]);

  if (!isVisible || !selection) {
    return null;
  }

  return (
    <Overlay isVisible={isVisible} onClick={handleOverlayClick}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>Create Highlight</Title>
        
        <SelectedText>
          "{selection.text}"
        </SelectedText>

        <ColorSection>
          <ColorLabel>Choose highlight color:</ColorLabel>
          <ColorGrid>
            {HIGHLIGHT_COLORS.map((color) => (
              <ColorOption
                key={color.value}
                color={color.value}
                isSelected={selectedColor === color.value}
                onClick={() => handleColorSelect(color.value)}
                type="button"
              >
                <ColorSwatch color={color.value} />
                <ColorName>{color.name}</ColorName>
              </ColorOption>
            ))}
          </ColorGrid>
        </ColorSection>

        <ButtonGroup>
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCreate();
            }}
            type="button"
          >
            Create Highlight
          </Button>
        </ButtonGroup>
      </Modal>
    </Overlay>
  );
};