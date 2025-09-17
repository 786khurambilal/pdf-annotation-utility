import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockPdfFile, createFileDropEvent } from '../../test-utils';
import { PDFViewerContainer } from '../../components/pdf/PDFViewerContainer';

describe('PDF Upload Workflow Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-pdf-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full PDF upload workflow', async () => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    // Initially should show upload interface
    expect(screen.getByText(/drag and drop a pdf file here/i)).toBeInTheDocument();

    // Create a mock PDF file
    const mockFile = createMockPdfFile('test-document.pdf', 2048);

    // Find file input and upload file
    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    await user.upload(fileInput, mockFile);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    // Should eventually show PDF viewer
    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show navigation controls
    expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
  });

  it('should handle drag and drop PDF upload', async () => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    const mockFile = createMockPdfFile('dropped-document.pdf');
    const dropZone = screen.getByText(/drag and drop/i).closest('div');

    // Simulate drag and drop
    const dropEvent = createFileDropEvent([mockFile]);
    dropZone?.dispatchEvent(dropEvent);

    // Should show loading and then PDF viewer
    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle invalid file upload with error message', async () => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    // Create invalid file (not PDF)
    const invalidFile = new File(['content'], 'document.txt', { type: 'text/plain' });

    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    await user.upload(fileInput, invalidFile);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });

    // Should still show upload interface
    expect(screen.getByText(/drag and drop a pdf file here/i)).toBeInTheDocument();
  });

  it('should handle large file size validation', async () => {
    renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    // Create oversized file (100MB)
    const largeFile = createMockPdfFile('large-document.pdf', 100 * 1024 * 1024);

    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    await user.upload(fileInput, largeFile);

    // Should show size error message
    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it('should maintain upload state across component re-renders', async () => {
    const { rerender } = renderWithProviders(
      <PDFViewerContainer enableVirtualization={false} />,
      { initialUser: { id: 'test-user', name: 'Test User' } }
    );

    const mockFile = createMockPdfFile('persistent-document.pdf');
    const fileInput = document.querySelector('#pdf-upload-input') as HTMLInputElement;
    await user.upload(fileInput, mockFile);

    // Wait for PDF to load
    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });

    // Re-render component
    rerender(<PDFViewerContainer enableVirtualization={false} />);

    // PDF should still be displayed
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
  });
});