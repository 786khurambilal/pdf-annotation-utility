import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CTACreator } from './CTACreator';
import { RectangleCoordinates } from '../../types/annotation.types';

const mockCoordinates: RectangleCoordinates = {
  x: 100,
  y: 200,
  width: 150,
  height: 50
};

const defaultProps = {
  coordinates: mockCoordinates,
  pageNumber: 1,
  isVisible: true,
  onCreateCTA: jest.fn(),
  onCancel: jest.fn()
};

describe('CTACreator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when visible with coordinates', () => {
    render(<CTACreator {...defaultProps} />);
    
    expect(screen.getByRole('heading', { name: 'Create Call-to-Action' })).toBeInTheDocument();
    expect(screen.getByLabelText('URL *')).toBeInTheDocument();
    expect(screen.getByLabelText('Label *')).toBeInTheDocument();
    expect(screen.getByText(/Page 1 • Area: 150 × 50 px/)).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<CTACreator {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByRole('heading', { name: 'Create Call-to-Action' })).not.toBeInTheDocument();
  });

  it('does not render when coordinates are null', () => {
    render(<CTACreator {...defaultProps} coordinates={null} />);
    
    expect(screen.queryByRole('heading', { name: 'Create Call-to-Action' })).not.toBeInTheDocument();
  });

  it('focuses URL input when modal becomes visible', async () => {
    const { rerender } = render(<CTACreator {...defaultProps} isVisible={false} />);
    
    rerender(<CTACreator {...defaultProps} isVisible={true} />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('URL *')).toHaveFocus();
    });
  });

  it('creates CTA with valid inputs', async () => {
    const user = userEvent.setup();
    render(<CTACreator {...defaultProps} />);
    
    const urlInput = screen.getByLabelText('URL *');
    const labelInput = screen.getByLabelText('Label *');
    const submitButton = screen.getByRole('button', { name: 'Create Call-to-Action' });
    
    // Type label first to avoid auto-generation interference
    await user.type(labelInput, 'Test Label');
    await user.type(urlInput, 'https://example.com');
    await user.click(submitButton);
    
    expect(defaultProps.onCreateCTA).toHaveBeenCalledWith(
      'https://example.com',
      'Test Label',
      mockCoordinates
    );
  });

  it('trims whitespace from inputs', async () => {
    const user = userEvent.setup();
    render(<CTACreator {...defaultProps} />);
    
    const urlInput = screen.getByLabelText('URL *');
    const labelInput = screen.getByLabelText('Label *');
    const submitButton = screen.getByRole('button', { name: 'Create Call-to-Action' });
    
    // Type label first to avoid auto-generation interference
    await user.type(labelInput, '  Test Label  ');
    await user.type(urlInput, '  https://example.com  ');
    await user.click(submitButton);
    
    expect(defaultProps.onCreateCTA).toHaveBeenCalledWith(
      'https://example.com',
      'Test Label',
      mockCoordinates
    );
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CTACreator {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<CTACreator {...defaultProps} />);
    
    const closeButton = screen.getByLabelText('Close CTA creator');
    await user.click(closeButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('closes modal on Escape key press', () => {
    render(<CTACreator {...defaultProps} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('displays coordinate information correctly', () => {
    const coordinates: RectangleCoordinates = {
      x: 123.456,
      y: 789.123,
      width: 200.789,
      height: 100.456
    };
    
    render(<CTACreator {...defaultProps} coordinates={coordinates} pageNumber={5} />);
    
    expect(screen.getByText('Page 5 • Area: 201 × 100 px at (123, 789)')).toBeInTheDocument();
  });

  it('clears form when modal becomes visible', () => {
    const { rerender } = render(<CTACreator {...defaultProps} isVisible={false} />);
    
    rerender(<CTACreator {...defaultProps} isVisible={true} />);
    
    expect(screen.getByLabelText('URL *')).toHaveValue('');
    expect(screen.getByLabelText('Label *')).toHaveValue('');
  });
});