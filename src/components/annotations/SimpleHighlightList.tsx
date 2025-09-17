import React from 'react';
import styled from 'styled-components';
import { Highlight } from '../../types/annotation.types';

interface SimpleHighlightListProps {
  highlights: Highlight[];
  onHighlightClick: (highlight: Highlight) => void;
  onHighlightEdit: (highlightId: string, updates: any) => void;
  onHighlightDelete: (highlightId: string) => void;
  currentPage?: number;
  navigatingToHighlight?: string | null;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const HighlightItem = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isCurrentPage', 'isNavigating'].includes(prop)
})<{ isCurrentPage?: boolean; isNavigating?: boolean }>`
  padding: 0.75rem;
  border: 1px solid ${props => props.isCurrentPage ? '#007bff' : '#dee2e6'};
  border-radius: 4px;
  cursor: pointer;
  background-color: ${props => props.isCurrentPage ? '#f0f8ff' : 'white'};
  transition: all 0.2s;
  position: relative;
  opacity: ${props => props.isNavigating ? 0.7 : 1};

  &:hover {
    background-color: ${props => props.isCurrentPage ? '#e6f3ff' : '#f8f9fa'};
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  ${props => props.isCurrentPage && `
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background-color: #007bff;
      border-radius: 0 2px 2px 0;
    }
  `}

  ${props => props.isNavigating && `
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      right: 0.75rem;
      width: 16px;
      height: 16px;
      border: 2px solid #007bff;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      transform: translateY(-50%);
    }

    @keyframes spin {
      0% { transform: translateY(-50%) rotate(0deg); }
      100% { transform: translateY(-50%) rotate(360deg); }
    }
  `}
`;

const HighlightText = styled.div`
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #333;
  font-size: 0.9rem;
  line-height: 1.3;
`;

const HighlightMeta = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isCurrentPage'].includes(prop)
})<{ isCurrentPage?: boolean }>`
  font-size: 0.75rem;
  color: ${props => props.isCurrentPage ? '#0056b3' : '#666'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: ${props => props.isCurrentPage ? '500' : 'normal'};
`;

const ColorSwatch = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  background-color: ${props => props.color};
  border-radius: 2px;
  border: 1px solid #ccc;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 0;
  color: #666;
  font-style: italic;
`;

export const SimpleHighlightList: React.FC<SimpleHighlightListProps> = ({
  highlights,
  onHighlightClick,
  onHighlightEdit,
  onHighlightDelete,
  currentPage,
  navigatingToHighlight
}) => {
  if (highlights.length === 0) {
    return (
      <EmptyState>
        No highlights yet. Select text in the PDF to create highlights.
      </EmptyState>
    );
  }

  return (
    <Container>
      {highlights.map((highlight) => {
        const isCurrentPage = currentPage === highlight.pageNumber;
        const isNavigating = navigatingToHighlight === highlight.id;
        return (
          <HighlightItem
            key={highlight.id}
            isCurrentPage={isCurrentPage}
            isNavigating={isNavigating}
            onClick={() => onHighlightClick(highlight)}
          >
            <HighlightText>
              "{highlight.selectedText.length > 60 
                ? `${highlight.selectedText.substring(0, 60)}...` 
                : highlight.selectedText}"
            </HighlightText>
            <HighlightMeta isCurrentPage={isCurrentPage}>
              <span>Page {highlight.pageNumber}{isCurrentPage ? ' (current)' : ''}</span>
              <ColorSwatch color={highlight.color} />
            </HighlightMeta>
          </HighlightItem>
        );
      })}
    </Container>
  );
};