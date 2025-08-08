import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner, PDFLoadingSpinner, PageLoadingSpinner, AnnotationLoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    const { container } = render(<LoadingSpinner />);
    
    // Check that spinner container is rendered
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    const message = 'Loading custom content...';
    render(<LoadingSpinner message={message} />);
    
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="small" message="Small spinner" />);
    expect(screen.getByText('Small spinner')).toBeInTheDocument();

    rerender(<LoadingSpinner size="large" message="Large spinner" />);
    expect(screen.getByText('Large spinner')).toBeInTheDocument();
  });

  it('renders as overlay when specified', () => {
    const { container } = render(<LoadingSpinner overlay={true} message="Overlay spinner" />);
    
    expect(screen.getByText('Overlay spinner')).toBeInTheDocument();
    // Check that the container has overlay styling (we can't easily test the styled-component styles in jest)
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('PDFLoadingSpinner', () => {
  it('renders with default message', () => {
    render(<PDFLoadingSpinner />);
    
    expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
  });

  it('renders with filename', () => {
    const fileName = 'test-document.pdf';
    render(<PDFLoadingSpinner fileName={fileName} />);
    
    expect(screen.getByText(`Loading ${fileName}...`)).toBeInTheDocument();
  });
});

describe('PageLoadingSpinner', () => {
  it('renders with default message', () => {
    render(<PageLoadingSpinner />);
    
    expect(screen.getByText('Loading page...')).toBeInTheDocument();
  });

  it('renders with page number', () => {
    const pageNumber = 5;
    render(<PageLoadingSpinner pageNumber={pageNumber} />);
    
    expect(screen.getByText(`Loading page ${pageNumber}...`)).toBeInTheDocument();
  });
});

describe('AnnotationLoadingSpinner', () => {
  it('renders with default operation', () => {
    render(<AnnotationLoadingSpinner />);
    
    expect(screen.getByText('Processing annotation...')).toBeInTheDocument();
  });

  it('renders with custom operation', () => {
    const operation = 'highlight';
    render(<AnnotationLoadingSpinner operation={operation} />);
    
    expect(screen.getByText(`Processing ${operation}...`)).toBeInTheDocument();
  });

  it('renders as overlay', () => {
    const { container } = render(<AnnotationLoadingSpinner />);
    
    expect(screen.getByText('Processing annotation...')).toBeInTheDocument();
    // Check that the component renders (overlay styling is handled by styled-components)
    expect(container.firstChild).toBeInTheDocument();
  });
});