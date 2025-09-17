import React, { useState } from 'react';
import { Bookmark } from '../../types/annotation.types';

export interface BookmarkCreatorProps {
  pageNumber: number;
  onCreateBookmark: (title: string, description?: string) => void;
  onCancel: () => void;
  isVisible: boolean;
}

export const BookmarkCreator: React.FC<BookmarkCreatorProps> = ({
  pageNumber,
  onCreateBookmark,
  onCancel,
  isVisible
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreateBookmark(title.trim(), description.trim() || undefined);
      setTitle('');
      setDescription('');
    } catch (error) {
      // Error handling can be implemented here if needed
      // For now, we just reset the loading state
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    onCancel();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bookmark-creator-overlay" onClick={handleCancel}>
      <div className="bookmark-creator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bookmark-creator-header">
          <h3>Create Bookmark</h3>
          <p>Page {pageNumber}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bookmark-creator-form">
          <div className="form-group">
            <label htmlFor="bookmark-title">
              Title <span className="required">*</span>
            </label>
            <input
              id="bookmark-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter bookmark title"
              maxLength={100}
              required
              disabled={isCreating}
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="bookmark-description">Description (optional)</label>
            <textarea
              id="bookmark-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this bookmark"
              maxLength={500}
              rows={3}
              disabled={isCreating}
            />
          </div>
          
          <div className="bookmark-creator-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="cancel-button"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-button"
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Bookmark'}
            </button>
          </div>
        </form>
      </div>
      
      <style>{`
        .bookmark-creator-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .bookmark-creator-modal {
          background: white;
          border-radius: 8px;
          padding: 24px;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .bookmark-creator-header {
          margin-bottom: 20px;
        }
        
        .bookmark-creator-header h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }
        
        .bookmark-creator-header p {
          margin: 0;
          font-size: 14px;
          color: #666;
        }
        
        .bookmark-creator-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
        
        .required {
          color: #e74c3c;
        }
        
        .form-group input,
        .form-group textarea {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }
        
        .form-group input:disabled,
        .form-group textarea:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }
        
        .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }
        
        .bookmark-creator-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }
        
        .cancel-button,
        .create-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .cancel-button {
          background-color: #f8f9fa;
          color: #666;
          border: 1px solid #ddd;
        }
        
        .cancel-button:hover:not(:disabled) {
          background-color: #e9ecef;
        }
        
        .create-button {
          background-color: #3498db;
          color: white;
        }
        
        .create-button:hover:not(:disabled) {
          background-color: #2980b9;
        }
        
        .create-button:disabled,
        .cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        @media (max-width: 480px) {
          .bookmark-creator-modal {
            width: 95%;
            padding: 20px;
          }
          
          .bookmark-creator-actions {
            flex-direction: column-reverse;
          }
          
          .cancel-button,
          .create-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};