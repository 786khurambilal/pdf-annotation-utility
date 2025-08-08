import React, { useState } from 'react';
import { Bookmark } from '../../types/annotation.types';

export interface BookmarkPanelProps {
  bookmarks: Bookmark[];
  onBookmarkClick: (bookmark: Bookmark) => void;
  onBookmarkEdit: (bookmark: Bookmark) => void;
  onBookmarkDelete: (bookmarkId: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const BookmarkPanel: React.FC<BookmarkPanelProps> = ({
  bookmarks,
  onBookmarkClick,
  onBookmarkEdit,
  onBookmarkDelete,
  isVisible,
  onClose
}) => {
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleEditStart = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark.id);
    setEditTitle(bookmark.title);
    setEditDescription(bookmark.description || '');
  };

  const handleEditSave = (bookmark: Bookmark) => {
    if (editTitle.trim()) {
      const updatedBookmark = {
        ...bookmark,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined
      };
      onBookmarkEdit(updatedBookmark);
    }
    setEditingBookmark(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleEditCancel = () => {
    setEditingBookmark(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleDelete = (bookmarkId: string) => {
    if (window.confirm('Are you sure you want to delete this bookmark?')) {
      onBookmarkDelete(bookmarkId);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bookmark-panel-overlay" onClick={onClose}>
      <div className="bookmark-panel" onClick={(e) => e.stopPropagation()}>
        <div className="bookmark-panel-header">
          <h3>Bookmarks</h3>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close bookmarks panel"
          >
            ×
          </button>
        </div>

        <div className="bookmark-panel-content">
          {bookmarks.length === 0 ? (
            <div className="empty-state">
              <p>No bookmarks yet</p>
              <p className="empty-state-subtitle">
                Create bookmarks to quickly navigate to important pages
              </p>
            </div>
          ) : (
            <div className="bookmark-list">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="bookmark-item">
                  {editingBookmark === bookmark.id ? (
                    <div className="bookmark-edit-form">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Bookmark title"
                        maxLength={100}
                        className="edit-title-input"
                        autoFocus
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description (optional)"
                        maxLength={500}
                        rows={2}
                        className="edit-description-input"
                      />
                      <div className="edit-actions">
                        <button
                          onClick={() => handleEditSave(bookmark)}
                          disabled={!editTitle.trim()}
                          className="save-button"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bookmark-content">
                      <div className="bookmark-main" onClick={() => onBookmarkClick(bookmark)}>
                        <div className="bookmark-info">
                          <h4 className="bookmark-title">{bookmark.title}</h4>
                          {bookmark.description && (
                            <p className="bookmark-description">{bookmark.description}</p>
                          )}
                          <div className="bookmark-meta">
                            <span className="page-number">Page {bookmark.pageNumber}</span>
                            <span className="bookmark-date">
                              {formatDate(bookmark.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bookmark-actions">
                        <button
                          onClick={() => handleEditStart(bookmark)}
                          className="edit-button"
                          aria-label="Edit bookmark"
                          title="Edit bookmark"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(bookmark.id)}
                          className="delete-button"
                          aria-label="Delete bookmark"
                          title="Delete bookmark"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .bookmark-panel-overlay {
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

        .bookmark-panel {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .bookmark-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #eee;
        }

        .bookmark-panel-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 4px;
          line-height: 1;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .close-button:hover {
          background-color: #f5f5f5;
        }

        .bookmark-panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px 24px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }

        .empty-state p {
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .empty-state-subtitle {
          font-size: 14px !important;
          color: #999 !important;
        }

        .bookmark-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bookmark-item {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .bookmark-item:hover {
          border-color: #ccc;
        }

        .bookmark-content {
          display: flex;
          align-items: flex-start;
        }

        .bookmark-main {
          flex: 1;
          padding: 12px 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .bookmark-main:hover {
          background-color: #f8f9fa;
        }

        .bookmark-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .bookmark-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          line-height: 1.3;
        }

        .bookmark-description {
          margin: 0;
          font-size: 13px;
          color: #666;
          line-height: 1.4;
        }

        .bookmark-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #999;
        }

        .page-number {
          font-weight: 500;
        }

        .bookmark-actions {
          display: flex;
          flex-direction: column;
          padding: 8px;
          gap: 4px;
        }

        .edit-button,
        .delete-button {
          background: none;
          border: none;
          padding: 6px;
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .edit-button:hover {
          background-color: #e3f2fd;
        }

        .delete-button:hover {
          background-color: #ffebee;
        }

        .bookmark-edit-form {
          padding: 16px;
          background-color: #f8f9fa;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .edit-title-input,
        .edit-description-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .edit-title-input:focus,
        .edit-description-input:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }

        .edit-description-input {
          resize: vertical;
          min-height: 40px;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .save-button,
        .cancel-button {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .save-button {
          background-color: #3498db;
          color: white;
        }

        .save-button:hover:not(:disabled) {
          background-color: #2980b9;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-button {
          background-color: #f8f9fa;
          color: #666;
          border: 1px solid #ddd;
        }

        .cancel-button:hover {
          background-color: #e9ecef;
        }

        @media (max-width: 768px) {
          .bookmark-panel {
            width: 95%;
            max-height: 90vh;
            margin: 20px;
          }

          .bookmark-panel-header,
          .bookmark-panel-content {
            padding-left: 16px;
            padding-right: 16px;
          }

          .bookmark-content {
            flex-direction: column;
          }

          .bookmark-actions {
            flex-direction: row;
            justify-content: flex-end;
            padding: 8px 16px;
            border-top: 1px solid #eee;
            gap: 8px;
          }

          .edit-button,
          .delete-button {
            min-width: 44px;
            min-height: 44px;
            font-size: 16px;
          }

          .edit-actions {
            flex-direction: column-reverse;
            gap: 12px;
          }

          .save-button,
          .cancel-button {
            width: 100%;
            min-height: 44px;
            font-size: 16px;
          }

          .edit-title-input,
          .edit-description-input {
            font-size: 16px; /* Prevents zoom on iOS */
          }
        }

        @media (max-width: 480px) {
          .bookmark-panel {
            width: 100%;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
            margin: 0;
          }

          .bookmark-panel-header {
            padding: 16px;
          }

          .bookmark-panel-content {
            padding: 12px 16px 16px;
          }

          .bookmark-main {
            padding: 16px;
          }

          .bookmark-title {
            font-size: 16px;
          }

          .bookmark-description {
            font-size: 14px;
          }

          .bookmark-meta {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};