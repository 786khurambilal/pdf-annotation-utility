import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useResponsive } from '../../hooks/useResponsive';
import { theme } from '../../styles/theme';

interface NavigationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${theme.colors.light};
  border: 1px solid ${theme.colors.gray300};
  border-radius: ${theme.borderRadius.sm};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  @media (max-width: ${theme.breakpoints.tablet}) {
    gap: ${theme.spacing.sm};
    padding: ${theme.spacing.sm};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const Button = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.sm} ${theme.spacing.sm};
  background-color: ${props => props.disabled ? theme.colors.gray200 : theme.colors.primary};
  color: ${props => props.disabled ? theme.colors.gray600 : theme.colors.white};
  border: none;
  border-radius: ${theme.borderRadius.sm};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: ${theme.fontSizes.sm};
  font-weight: 500;
  transition: background-color ${theme.transitions.normal};
  min-width: ${theme.touch.minSize};
  min-height: ${theme.touch.minSize};
  touch-action: manipulation;

  &:hover:not(:disabled) {
    background-color: ${theme.colors.primaryHover};
  }

  &:focus {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    background-color: ${theme.colors.gray200};
    color: ${theme.colors.gray600};
    cursor: not-allowed;
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    font-size: ${theme.fontSizes.lg};
    min-width: 48px;
    min-height: 48px;
  }
`;

const PageInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.gray700};
  white-space: nowrap;

  @media (max-width: ${theme.breakpoints.mobile}) {
    font-size: ${theme.fontSizes.xs};
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: ${theme.spacing.sm};
  }
`;

const PageInput = styled.input`
  width: 4rem;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border: 1px solid ${theme.colors.gray400};
  border-radius: ${theme.borderRadius.sm};
  text-align: center;
  font-size: ${theme.fontSizes.sm};
  min-height: ${theme.touch.minSize};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  &:invalid {
    border-color: ${theme.colors.danger};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    width: 3rem;
    font-size: 16px; /* Prevents zoom on iOS */
  }
`;

const Separator = styled.span`
  color: ${theme.colors.gray600};
  font-weight: 500;
`;

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState(currentPage.toString());
  const responsive = useResponsive();

  // Update input value when currentPage changes externally
  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange, disabled]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange, disabled]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  }, []);

  const handleInputSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    
    if (disabled) return;

    const pageNumber = parseInt(inputValue, 10);
    
    if (isNaN(pageNumber)) {
      // Reset to current page if invalid input
      setInputValue(currentPage.toString());
      return;
    }

    // Clamp the page number to valid range
    const clampedPage = Math.min(Math.max(1, pageNumber), totalPages);
    
    if (clampedPage !== currentPage) {
      onPageChange(clampedPage);
    }
    
    // Update input to show the clamped value
    setInputValue(clampedPage.toString());
  }, [inputValue, currentPage, totalPages, onPageChange, disabled]);

  const handleInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleInputSubmit(event);
    } else if (event.key === 'Escape') {
      // Reset to current page on escape
      setInputValue(currentPage.toString());
      event.currentTarget.blur();
    }
  }, [handleInputSubmit, currentPage]);

  const handleInputBlur = useCallback(() => {
    // Reset to current page if user leaves input without submitting
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const isPreviousDisabled = disabled || currentPage <= 1;
  const isNextDisabled = disabled || currentPage >= totalPages;

  return (
    <Container>
      <Button
        onClick={handlePreviousPage}
        disabled={isPreviousDisabled}
        aria-label="Previous page"
        title="Previous page"
      >
        {responsive.isMobile ? '‹' : '←'}
      </Button>
      
      <PageInfo>
        {!responsive.isMobile && <span>Page</span>}
        <form onSubmit={handleInputSubmit}>
          <PageInput
            type="number"
            min="1"
            max={totalPages}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            disabled={disabled}
            aria-label={`Current page, ${currentPage} of ${totalPages}`}
            title="Enter page number and press Enter"
          />
        </form>
        <Separator>of</Separator>
        <span>{totalPages}</span>
      </PageInfo>

      <Button
        onClick={handleNextPage}
        disabled={isNextDisabled}
        aria-label="Next page"
        title="Next page"
      >
        {responsive.isMobile ? '›' : '→'}
      </Button>
    </Container>
  );
};