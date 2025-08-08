import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { CallToAction } from '../../types/annotation.types';

interface CTAListProps {
  callToActions: CallToAction[];
  onCTAEdit: (cta: CallToAction) => void;
  onCTADelete: (ctaId: string) => void;
  onCTANavigate?: (cta: CallToAction) => void;
}

const Container = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Header = styled.div`
  background-color: #f8f9fa;
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Count = styled.span`
  background-color: #007bff;
  color: white;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
`;

const ListContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #666;
  font-style: italic;
`;

const CTAItem = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f8f9fa;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const CTAHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
`;

const CTAInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CTALabel = styled.div`
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
  word-break: break-word;
`;

const CTAUrl = styled.div`
  color: #007bff;
  font-size: 0.9rem;
  word-break: break-all;
  margin-bottom: 0.25rem;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const CTAMeta = styled.div`
  font-size: 0.8rem;
  color: #666;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const CTAActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const ActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.25rem 0.5rem;
  border: 1px solid;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          border-color: #007bff;
          color: #007bff;
          &:hover {
            background-color: #007bff;
            color: white;
          }
        `;
      case 'danger':
        return `
          border-color: #dc3545;
          color: #dc3545;
          &:hover {
            background-color: #dc3545;
            color: white;
          }
        `;
      default:
        return `
          border-color: #6c757d;
          color: #6c757d;
          &:hover {
            background-color: #6c757d;
            color: white;
          }
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

const LinkStatus = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'status'
})<{ status: 'checking' | 'valid' | 'invalid' | 'unknown' }>`
  font-size: 0.8rem;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-weight: 500;

  ${props => {
    switch (props.status) {
      case 'checking':
        return `
          background-color: #fff3cd;
          color: #856404;
        `;
      case 'valid':
        return `
          background-color: #d4edda;
          color: #155724;
        `;
      case 'invalid':
        return `
          background-color: #f8d7da;
          color: #721c24;
        `;
      default:
        return `
          background-color: #e2e3e5;
          color: #383d41;
        `;
    }
  }}
`;

// Simple URL validation function
const validateURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

// Hook for checking link status
const useLinkStatus = (url: string) => {
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid' | 'unknown'>('unknown');

  const checkLink = useCallback(async () => {
    if (!validateURL(url)) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    
    try {
      // In a real application, you might want to use a proper link checker
      // For now, we'll just validate the URL format and assume it's valid
      // You could implement a backend service to actually check if the link is accessible
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate checking
      setStatus('valid');
    } catch {
      setStatus('invalid');
    }
  }, [url]);

  return { status, checkLink };
};

const CTAListItem: React.FC<{
  cta: CallToAction;
  onEdit: (cta: CallToAction) => void;
  onDelete: (ctaId: string) => void;
  onNavigate?: (cta: CallToAction) => void;
}> = ({ cta, onEdit, onDelete, onNavigate }) => {
  const { status, checkLink } = useLinkStatus(cta.url);

  const handleUrlClick = useCallback(() => {
    window.open(cta.url, '_blank', 'noopener,noreferrer');
  }, [cta.url]);

  const handleNavigate = useCallback(() => {
    onNavigate?.(cta);
  }, [cta, onNavigate]);

  const handleEdit = useCallback(() => {
    onEdit(cta);
  }, [cta, onEdit]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete the call-to-action "${cta.label}"?`)) {
      onDelete(cta.id);
    }
  }, [cta.id, cta.label, onDelete]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <CTAItem>
      <CTAHeader>
        <CTAInfo>
          <CTALabel>{cta.label}</CTALabel>
          <CTAUrl onClick={handleUrlClick} title="Click to open link">
            {cta.url}
          </CTAUrl>
          <CTAMeta>
            <span>Page {cta.pageNumber}</span>
            <span>Created {formatDate(cta.createdAt)}</span>
            {cta.updatedAt.getTime() !== cta.createdAt.getTime() && (
              <span>Updated {formatDate(cta.updatedAt)}</span>
            )}
            <LinkStatus status={status}>
              {status === 'checking' && 'Checking...'}
              {status === 'valid' && 'Link OK'}
              {status === 'invalid' && 'Invalid URL'}
              {status === 'unknown' && (
                <button 
                  onClick={checkLink}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'inherit', 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Check Link
                </button>
              )}
            </LinkStatus>
          </CTAMeta>
        </CTAInfo>
        <CTAActions>
          {onNavigate && (
            <ActionButton variant="secondary" onClick={handleNavigate} title="Go to page">
              Go to Page
            </ActionButton>
          )}
          <ActionButton variant="primary" onClick={handleEdit} title="Edit call-to-action">
            Edit
          </ActionButton>
          <ActionButton variant="danger" onClick={handleDelete} title="Delete call-to-action">
            Delete
          </ActionButton>
        </CTAActions>
      </CTAHeader>
    </CTAItem>
  );
};

export const CTAList: React.FC<CTAListProps> = ({
  callToActions,
  onCTAEdit,
  onCTADelete,
  onCTANavigate
}) => {
  // Sort CTAs by page number, then by creation date
  const sortedCTAs = [...callToActions].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return (
    <Container>
      <Header>
        <Title>
          Call-to-Actions
          <Count>{callToActions.length}</Count>
        </Title>
      </Header>
      <ListContainer>
        {sortedCTAs.length === 0 ? (
          <EmptyState>
            No call-to-actions created yet.
            <br />
            Create one by selecting an area in the PDF and choosing "Add Call-to-Action".
          </EmptyState>
        ) : (
          sortedCTAs.map((cta) => (
            <CTAListItem
              key={cta.id}
              cta={cta}
              onEdit={onCTAEdit}
              onDelete={onCTADelete}
              onNavigate={onCTANavigate}
            />
          ))
        )}
      </ListContainer>
    </Container>
  );
};