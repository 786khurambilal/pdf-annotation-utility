import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Comment } from '../../types/annotation.types';

interface CommentListProps {
  comments: Comment[];
  onCommentEdit: (commentId: string, newContent: string) => void;
  onCommentDelete: (commentId: string) => void;
  onCommentClick?: (comment: Comment) => void;
  onNavigateToComment?: (comment: Comment) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: #333;
`;

const CommentCount = styled.span`
  font-size: 0.9rem;
  color: #666;
  background-color: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
`;

const SearchContainer = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #eee;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const CommentListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
`;

const CommentItem = styled.div`
  padding: 1rem;
  margin-bottom: 0.5rem;
  border: 1px solid #eee;
  border-radius: 6px;
  background: white;
  transition: all 0.2s ease;

  &:hover {
    border-color: #007bff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const CommentMeta = styled.div`
  font-size: 0.75rem;
  color: #666;
`;

const CommentActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.25rem 0.5rem;
  border: 1px solid;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
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

const CommentContent = styled.div`
  font-size: 0.9rem;
  line-height: 1.4;
  color: #333;
  margin-bottom: 0.5rem;
  word-wrap: break-word;
`;

const EditTextArea = styled.textarea`
  width: 100%;
  min-height: 60px;
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

const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  onCommentEdit,
  onCommentDelete,
  onCommentClick,
  onNavigateToComment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Filter comments based on search term
  const filteredComments = useMemo(() => {
    if (!searchTerm.trim()) {
      return comments;
    }
    
    const term = searchTerm.toLowerCase();
    return comments.filter(comment =>
      comment.content.toLowerCase().includes(term)
    );
  }, [comments, searchTerm]);

  // Sort comments by creation date (newest first)
  const sortedComments = useMemo(() => {
    return [...filteredComments].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredComments]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleStartEdit = useCallback((comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
    setError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditContent('');
    setError(null);
  }, []);

  const handleSaveEdit = useCallback((commentId: string) => {
    if (!editContent.trim()) {
      setError('Comment content cannot be empty');
      return;
    }

    try {
      onCommentEdit(commentId, editContent.trim());
      setEditingCommentId(null);
      setEditContent('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    }
  }, [editContent, onCommentEdit]);

  const handleDelete = useCallback((comment: Comment) => {
    if (window.confirm(`Are you sure you want to delete this comment?\n\n"${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}"`)) {
      onCommentDelete(comment.id);
    }
  }, [onCommentDelete]);

  const handleCommentClick = useCallback((comment: Comment) => {
    console.log('💬 CommentList: Comment clicked', {
      commentId: comment.id,
      pageNumber: comment.pageNumber,
      hasOnCommentClick: !!onCommentClick
    });
    onCommentClick?.(comment);
  }, [onCommentClick]);

  const handleNavigateToComment = useCallback((comment: Comment) => {
    onNavigateToComment?.(comment);
  }, [onNavigateToComment]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Container>
      <Header>
        <Title>Comments</Title>
        <CommentCount>{comments.length}</CommentCount>
      </Header>

      {comments.length > 0 && (
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search comments..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </SearchContainer>
      )}

      <CommentListContainer>
        {sortedComments.length === 0 ? (
          <EmptyState>
            <EmptyIcon>💬</EmptyIcon>
            {comments.length === 0 ? (
              <>
                <div>No comments yet</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Click on the PDF to add your first comment
                </div>
              </>
            ) : (
              <div>No comments match your search</div>
            )}
          </EmptyState>
        ) : (
          sortedComments.map((comment) => (
            <CommentItem key={comment.id}>
              <CommentHeader>
                <CommentMeta>
                  Page {comment.pageNumber} • {formatDate(comment.createdAt)}
                  {comment.updatedAt > comment.createdAt && ' (edited)'}
                </CommentMeta>
                <CommentActions>
                  {editingCommentId !== comment.id && (
                    <>
                      <ActionButton
                        variant="secondary"
                        onClick={() => handleNavigateToComment(comment)}
                        title="Go to comment location"
                      >
                        Go to
                      </ActionButton>
                      <ActionButton
                        variant="secondary"
                        onClick={() => handleStartEdit(comment)}
                      >
                        Edit
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => handleDelete(comment)}
                      >
                        Delete
                      </ActionButton>
                    </>
                  )}
                </CommentActions>
              </CommentHeader>

              {editingCommentId === comment.id ? (
                <>
                  <EditTextArea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Enter your comment..."
                    maxLength={1000}
                    autoFocus
                  />
                  {error && <ErrorMessage>{error}</ErrorMessage>}
                  <CommentActions>
                    <ActionButton
                      variant="secondary"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </ActionButton>
                    <ActionButton
                      variant="primary"
                      onClick={() => handleSaveEdit(comment.id)}
                    >
                      Save
                    </ActionButton>
                  </CommentActions>
                </>
              ) : (
                <CommentContent
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('💬 CommentContent clicked, calling handleCommentClick');
                    handleCommentClick(comment);
                  }}
                  style={{ 
                    cursor: onCommentClick ? 'pointer' : 'default',
                    userSelect: 'none' // Prevent text selection interfering with clicks
                  }}
                >
                  {comment.content}
                </CommentContent>
              )}
            </CommentItem>
          ))
        )}
      </CommentListContainer>
    </Container>
  );
};