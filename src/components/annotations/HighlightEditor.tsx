import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { Highlight } from '../../types/annotation.types';

interface HighlightEditorProps {
  highlight: Highlight | null;
  onSave: (highlight: Highlight, updates: { color: string }) => void;
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
`;

const ColorOption = styled.button.withConfig({
  shouldForwardProp: (prop) => !['color', 'isSelected'].includes(prop)
})<{ color: string; isSelected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 2px solid ${props => props.isSelected ? '#007bff' : '#dee2e6'};
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: #007bff;
  }

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
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
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.variant === 'primary' ? '#007bff' : '#6c757d'};
  border-radius: 4px;
  background-color: ${props => props.variant === 'primary' ? '#007bff' : 'white'};
  color: ${props => props.variant === 'primary' ? 'white' : '#6c757d'};
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;

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

const MetaInfo = styled.div`
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
`;

export const HighlightEditor: React.FC<HighlightEditorProps> = ({
  highlight,
  onSave,
  onCancel,
  isVisible
}) => {
  const [selectedColor, setSelectedColor] = useState<string>('');

  // Initialize color when highlight changes
  useEffect(() => {
    if (highlight) {
      setSelectedColor(highlight.color);
    }
  }, [highlight]);

  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  const handleSave = useCallback(() => {
    if (highlight && selectedColor) {
      onSave(highlight, { color: selectedColor });
    }
  }, [highlight, selectedColor, onSave]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }, [handleCancel]);

  if (!isVisible || !highlight) {
    return null;
  }

  const hasChanges = selectedColor !== highlight.color;

  return (
    <Overlay isVisible={isVisible} onClick={handleOverlayClick}>
      <Modal>
        <Title>Edit Highlight</Title>
        
        <MetaInfo>
          Page {highlight.pageNumber} • Created {highlight.createdAt.toLocaleDateString()}
          {highlight.updatedAt.getTime() !== highlight.createdAt.getTime() && 
            ` • Updated ${highlight.updatedAt.toLocaleDateString()}`
          }
        </MetaInfo>
        
        <SelectedText>
          "{highlight.selectedText}"
        </SelectedText>

        <ColorSection>
          <ColorLabel>Highlight color:</ColorLabel>
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
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </ButtonGroup>
      </Modal>
    </Overlay>
  );
};