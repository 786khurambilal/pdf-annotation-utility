import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Highlight } from '../../types/annotation.types';

interface HighlightListProps {
  highlights: Highlight[];
  onHighlightClick: (highlight: Highlight) => void;
  onHighlightEdit: (highlight: Highlight) => void;
  onHighlightDelete: (highlight: Highlight) => void;
  isVisible: boolean;
  onClose: () => void;
}

type SortOption = 'page' | 'date' | 'color';
type FilterOption = 'all' | string; // 'all' or specific color

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

const Panel = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
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
  padding: 0.25rem;
  border-radius: 4px;
  
  &:hover {
    background-color: #f8f9fa;
    color: #333;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const Controls = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
`;

const Select = styled.select`
  padding: 0.25rem 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const SearchInput = styled.input`
  padding: 0.25rem 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.875rem;
  min-width: 200px;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const ListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
`;

const HighlightItem = styled.div`
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-bottom: 0.75rem;
  overflow: hidden;
  transition: box-shadow 0.2s;
  
  &:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const HighlightHeader = styled.div<{ color: string }>`
  background-color: ${props => props.color};
  opacity: 0.3;
  padding: 0.5rem 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #333;
  font-weight: 500;
`;

const PageInfo = styled.span`
  color: #666;
`;

const DateInfo = styled.span`
  color: #666;
`;

const HighlightContent = styled.div`
  padding: 0.75rem;
`;

const HighlightText = styled.div`
  font-style: italic;
  color: #333;
  margin-bottom: 0.5rem;
  line-height: 1.4;
  cursor: pointer;
  
  &:hover {
    color: #007bff;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button<{ variant?: 'danger' }>`
  padding: 0.25rem 0.5rem;
  border: 1px solid ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
  border-radius: 4px;
  background: white;
  color: ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
    color: white;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
`;

const Stats = styled.div`
  font-size: 0.875rem;
  color: #666;
  margin-left: auto;
`;

export const HighlightList: React.FC<HighlightListProps> = ({
  highlights,
  onHighlightClick,
  onHighlightEdit,
  onHighlightDelete,
  isVisible,
  onClose
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('page');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchText, setSearchText] = useState('');

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleHighlightTextClick = useCallback((highlight: Highlight) => {
    onHighlightClick(highlight);
    onClose();
  }, [onHighlightClick, onClose]);

  // Get unique colors for filter options
  const availableColors = useMemo(() => {
    const colors = new Set(highlights.map(h => h.color));
    return Array.from(colors).sort();
  }, [highlights]);

  // Filter and sort highlights
  const filteredAndSortedHighlights = useMemo(() => {
    let filtered = highlights;

    // Apply text search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(h => 
        h.selectedText.toLowerCase().includes(searchLower)
      );
    }

    // Apply color filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(h => h.color === filterBy);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'page':
          return a.pageNumber - b.pageNumber;
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'color':
          return a.color.localeCompare(b.color);
        default:
          return 0;
      }
    });

    return sorted;
  }, [highlights, searchText, filterBy, sortBy]);

  const getColorName = (color: string): string => {
    const colorMap: Record<string, string> = {
      '#FFFF00': 'Yellow',
      '#90EE90': 'Green',
      '#87CEEB': 'Blue',
      '#FFB6C1': 'Pink',
      '#FFA500': 'Orange',
      '#DDA0DD': 'Purple'
    };
    return colorMap[color] || color;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Overlay isVisible={isVisible} onClick={handleOverlayClick}>
      <Panel>
        <Header>
          <Title>Highlights</Title>
          <Stats>
            {filteredAndSortedHighlights.length} of {highlights.length} highlights
          </Stats>
          <CloseButton onClick={onClose} aria-label="Close">
            ×
          </CloseButton>
        </Header>

        <Controls>
          <ControlGroup>
            <Label>Sort by:</Label>
            <Select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="page">Page</option>
              <option value="date">Date</option>
              <option value="color">Color</option>
            </Select>
          </ControlGroup>

          <ControlGroup>
            <Label>Filter:</Label>
            <Select 
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            >
              <option value="all">All colors</option>
              {availableColors.map(color => (
                <option key={color} value={color}>
                  {getColorName(color)}
                </option>
              ))}
            </Select>
          </ControlGroup>

          <ControlGroup>
            <Label>Search:</Label>
            <SearchInput
              type="text"
              placeholder="Search highlight text..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </ControlGroup>
        </Controls>

        <ListContainer>
          {filteredAndSortedHighlights.length === 0 ? (
            <EmptyState>
              {highlights.length === 0 
                ? "No highlights found. Start highlighting text to see them here."
                : "No highlights match your current filters."
              }
            </EmptyState>
          ) : (
            filteredAndSortedHighlights.map((highlight) => (
              <HighlightItem key={highlight.id}>
                <HighlightHeader color={highlight.color}>
                  <PageInfo>Page {highlight.pageNumber}</PageInfo>
                  <DateInfo>{highlight.createdAt.toLocaleDateString()}</DateInfo>
                </HighlightHeader>
                
                <HighlightContent>
                  <HighlightText onClick={() => handleHighlightTextClick(highlight)}>
                    "{highlight.selectedText}"
                  </HighlightText>
                  
                  <ActionButtons>
                    <ActionButton onClick={() => onHighlightEdit(highlight)}>
                      Edit
                    </ActionButton>
                    <ActionButton 
                      variant="danger" 
                      onClick={() => onHighlightDelete(highlight)}
                    >
                      Delete
                    </ActionButton>
                  </ActionButtons>
                </HighlightContent>
              </HighlightItem>
            ))
          )}
        </ListContainer>
      </Panel>
    </Overlay>
  );
};