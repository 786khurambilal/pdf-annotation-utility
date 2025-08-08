import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AnnotationInteractionHandler } from './AnnotationInteractionHandler';
import { Highlight, Comment, CallToAction } from '../../types/annotation.types';

describe('AnnotationInteractionHandler', () => {
  const mockHighlight: Highlight = {
    id: 'highlight-1',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    startOffset: 0,
    endOffset: 10,
    selectedText: 'Test highlight text',
    color: '#ffff00',
    coordinates: { x: 100, y: 200, width: 150, height: 20 },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  const mockComment: Comment = {
    id: 'comment-1',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    content: 'Test comment content',
    coordinates: { x: 300, y: 400 },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  const mockCTA: CallToAction = {
    id: 'cta-1',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    url: 'https://example.com',
    label: 'Test CTA Label',
    coordinates: { x: 500, y: 600, width: 100, height: 50 },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  const defaultProps = {
    highlights: [mockHighlight],
    comments: [mockComment],
    callToActions: [mockCTA],
    pageNumber: 1,
    scale: 1.0,
    onHighlightUpdate: jest.fn(),
    onHighlightDelete: jest.fn(),
    onCommentUpdate: jest.fn(),
    onCommentDelete: jest.fn(),
    onCTAUpdate: jest.fn(),
    onCTADelete: jest.fn()
  };

  const MockChild = ({ onHighlightContextMenu, onCommentContextMenu, onCTAContextMenu }: any) => (
    <div data-testid="mock-child">
      <button
        data-testid="highlight-trigger"
        onClick={() => onHighlightContextMenu?.(mockHighlight, { x: 100, y: 200 })}
      >
        Trigger Highlight Context Menu
      </button>
      <button
        data-testid="comment-trigger"
        onClick={() => onCommentContextMenu?.(mockComment, { x: 300, y: 400 })}
      >
        Trigger Comment Context Menu
      </button>
      <button
        data-testid="cta-trigger"
        onClick={() => onCTAContextMenu?.(mockCTA, { x: 500, y: 600 })}
      >
        Trigger CTA Context Menu
      </button>
    </div>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders children with enhanced props', () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      expect(screen.getByTestId('mock-child')).toBeInTheDocument();
      expect(screen.getByTestId('highlight-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('comment-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('cta-trigger')).toBeInTheDocument();
    });

    it('does not show context menu initially', () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      expect(screen.queryByText('Edit highlight')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete highlight')).not.toBeInTheDocument();
    });

    it('does not show edit modal initially', () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      expect(screen.queryByText('Edit Highlight')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit Comment')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit Call-to-Action')).not.toBeInTheDocument();
    });
  });

  describe('Context Menu Interactions', () => {
    it('shows highlight context menu when triggered', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('highlight-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Edit highlight')).toBeInTheDocument();
        expect(screen.getByText('Delete highlight')).toBeInTheDocument();
      });
    });

    it('shows comment context menu when triggered', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('comment-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Edit comment')).toBeInTheDocument();
        expect(screen.getByText('Delete comment')).toBeInTheDocument();
      });
    });

    it('shows CTA context menu when triggered', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('cta-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Edit CTA')).toBeInTheDocument();
        expect(screen.getByText('Delete CTA')).toBeInTheDocument();
      });
    });

    it('closes context menu on outside click', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('highlight-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Edit highlight')).toBeInTheDocument();
      });

      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Edit highlight')).not.toBeInTheDocument();
      });
    });

    it('closes context menu on escape key', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('highlight-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Edit highlight')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Edit highlight')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Operations', () => {
    it('deletes highlight when delete is clicked', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('highlight-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Delete highlight')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete highlight'));

      expect(defaultProps.onHighlightDelete).toHaveBeenCalledWith('highlight-1');
    });

    it('deletes comment when delete is clicked', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('comment-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Delete comment')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete comment'));

      expect(defaultProps.onCommentDelete).toHaveBeenCalledWith('comment-1');
    });

    it('deletes CTA when delete is clicked', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('cta-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Delete CTA')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete CTA'));

      expect(defaultProps.onCTADelete).toHaveBeenCalledWith('cta-1');
    });
  });

  describe('Edit Operations', () => {
    it('opens highlight edit modal when edit is clicked', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('highlight-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Edit highlight')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit highlight'));

      await waitFor(() => {
        expect(screen.getByText('Edit Highlight')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test highlight text')).toBeInTheDocument();
        expect(screen.getByDisplayValue('#ffff00')).toBeInTheDocument();
      });
    });

    it('opens comment edit modal when edit is clicked', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('comment-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Edit comment')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit comment'));

      await waitFor(() => {
        expect(screen.getByText('Edit Comment')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test comment content')).toBeInTheDocument();
      });
    });

    it('opens CTA edit modal when edit is clicked', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('cta-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Edit CTA')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit CTA'));

      await waitFor(() => {
        expect(screen.getByText('Edit Call-to-Action')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test CTA Label')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
      });
    });

    it('saves highlight changes when save is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('highlight-trigger'));
      fireEvent.click(screen.getByText('Edit highlight'));

      await waitFor(() => {
        expect(screen.getByText('Edit Highlight')).toBeInTheDocument();
      });

      const colorInput = screen.getByDisplayValue('#ffff00');
      await user.clear(colorInput);
      await user.type(colorInput, '#ff0000');

      fireEvent.click(screen.getByText('Save Changes'));

      expect(defaultProps.onHighlightUpdate).toHaveBeenCalledWith('highlight-1', {
        color: '#ff0000',
        updatedAt: expect.any(Date)
      });
    });

    it('saves comment changes when save is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('comment-trigger'));
      fireEvent.click(screen.getByText('Edit comment'));

      await waitFor(() => {
        expect(screen.getByText('Edit Comment')).toBeInTheDocument();
      });

      const contentInput = screen.getByDisplayValue('Test comment content');
      await user.clear(contentInput);
      await user.type(contentInput, 'Updated comment content');

      fireEvent.click(screen.getByText('Save Changes'));

      expect(defaultProps.onCommentUpdate).toHaveBeenCalledWith('comment-1', {
        content: 'Updated comment content',
        updatedAt: expect.any(Date)
      });
    });

    it('saves CTA changes when save is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('cta-trigger'));
      fireEvent.click(screen.getByText('Edit CTA'));

      await waitFor(() => {
        expect(screen.getByText('Edit Call-to-Action')).toBeInTheDocument();
      });

      const labelInput = screen.getByDisplayValue('Test CTA Label');
      const urlInput = screen.getByDisplayValue('https://example.com');

      await user.clear(labelInput);
      await user.type(labelInput, 'Updated CTA Label');

      await user.clear(urlInput);
      await user.type(urlInput, 'https://updated-example.com');

      fireEvent.click(screen.getByText('Save Changes'));

      expect(defaultProps.onCTAUpdate).toHaveBeenCalledWith('cta-1', {
        label: 'Updated CTA Label',
        url: 'https://updated-example.com',
        updatedAt: expect.any(Date)
      });
    });

    it('cancels edit when cancel is clicked', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('highlight-trigger'));
      fireEvent.click(screen.getByText('Edit highlight'));

      await waitFor(() => {
        expect(screen.getByText('Edit Highlight')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Edit Highlight')).not.toBeInTheDocument();
      });

      expect(defaultProps.onHighlightUpdate).not.toHaveBeenCalled();
    });

    it('cancels edit when escape is pressed', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('highlight-trigger'));
      fireEvent.click(screen.getByText('Edit highlight'));

      await waitFor(() => {
        expect(screen.getByText('Edit Highlight')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Edit Highlight')).not.toBeInTheDocument();
      });

      expect(defaultProps.onHighlightUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('handles empty form fields gracefully', async () => {
      const user = userEvent.setup();
      
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('comment-trigger'));
      fireEvent.click(screen.getByText('Edit comment'));

      await waitFor(() => {
        expect(screen.getByText('Edit Comment')).toBeInTheDocument();
      });

      const contentInput = screen.getByDisplayValue('Test comment content');
      await user.clear(contentInput);

      fireEvent.click(screen.getByText('Save Changes'));

      expect(defaultProps.onCommentUpdate).toHaveBeenCalledWith('comment-1', {
        content: '',
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation in context menu', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('highlight-trigger'));

      await waitFor(() => {
        expect(screen.getByText('Edit highlight')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit highlight');
      expect(editButton).toBeInTheDocument();
      
      // Test focus management
      editButton.focus();
      expect(editButton).toHaveFocus();
    });

    it('supports keyboard navigation in edit forms', async () => {
      render(
        <AnnotationInteractionHandler {...defaultProps}>
          <MockChild />
        </AnnotationInteractionHandler>
      );

      fireEvent.click(screen.getByTestId('highlight-trigger'));
      fireEvent.click(screen.getByText('Edit highlight'));

      await waitFor(() => {
        expect(screen.getByText('Edit Highlight')).toBeInTheDocument();
      });

      const colorInput = screen.getByDisplayValue('#ffff00');
      const saveButton = screen.getByText('Save Changes');
      const cancelButton = screen.getByText('Cancel');

      expect(colorInput).toBeInTheDocument();
      expect(saveButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });
  });
});