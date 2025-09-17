import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ZoomControls, ZoomMode } from './ZoomControls';

describe('ZoomControls', () => {
  const defaultProps = {
    scale: 1.0,
    zoomMode: 'custom' as ZoomMode,
    onScaleChange: jest.fn(),
    onZoomModeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all zoom controls', () => {
      render(<ZoomControls {...defaultProps} />);
      
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Reset zoom to 100%')).toBeInTheDocument();
      expect(screen.getByLabelText('Fit to width')).toBeInTheDocument();
      expect(screen.getByLabelText('Fit to page')).toBeInTheDocument();
      expect(screen.getByLabelText('Current zoom level: 100%')).toBeInTheDocument();
    });

    it('displays correct zoom percentage', () => {
      render(<ZoomControls {...defaultProps} scale={1.5} />);
      
      expect(screen.getByText('150%')).toBeInTheDocument();
      expect(screen.getByLabelText('Current zoom level: 150%')).toBeInTheDocument();
    });

    it('displays correct zoom percentage for decimal values', () => {
      render(<ZoomControls {...defaultProps} scale={0.75} />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByLabelText('Current zoom level: 75%')).toBeInTheDocument();
    });

    it('rounds zoom percentage to nearest integer', () => {
      render(<ZoomControls {...defaultProps} scale={1.234} />);
      
      expect(screen.getByText('123%')).toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('disables zoom out button at minimum scale', () => {
      render(<ZoomControls {...defaultProps} scale={0.25} minScale={0.25} />);
      
      const zoomOutButton = screen.getByLabelText('Zoom out');
      expect(zoomOutButton).toBeDisabled();
    });

    it('disables zoom in button at maximum scale', () => {
      render(<ZoomControls {...defaultProps} scale={3.0} maxScale={3.0} />);
      
      const zoomInButton = screen.getByLabelText('Zoom in');
      expect(zoomInButton).toBeDisabled();
    });

    it('enables both zoom buttons at middle scale', () => {
      render(<ZoomControls {...defaultProps} scale={1.0} />);
      
      const zoomOutButton = screen.getByLabelText('Zoom out');
      const zoomInButton = screen.getByLabelText('Zoom in');
      
      expect(zoomOutButton).not.toBeDisabled();
      expect(zoomInButton).not.toBeDisabled();
    });

    it('shows active state for fit-width mode', () => {
      render(<ZoomControls {...defaultProps} zoomMode="fit-width" />);
      
      const fitWidthButton = screen.getByLabelText('Fit to width');
      expect(fitWidthButton).toHaveStyle('background-color: #0056b3');
    });

    it('shows active state for fit-page mode', () => {
      render(<ZoomControls {...defaultProps} zoomMode="fit-page" />);
      
      const fitPageButton = screen.getByLabelText('Fit to page');
      expect(fitPageButton).toHaveStyle('background-color: #0056b3');
    });

    it('shows active state for 100% button when at 100% scale in custom mode', () => {
      render(<ZoomControls {...defaultProps} scale={1.0} zoomMode="custom" />);
      
      const resetButton = screen.getByLabelText('Reset zoom to 100%');
      expect(resetButton).toHaveStyle('background-color: #0056b3');
    });

    it('does not show active state for 100% button when not at 100% scale', () => {
      render(<ZoomControls {...defaultProps} scale={1.5} zoomMode="custom" />);
      
      const resetButton = screen.getByLabelText('Reset zoom to 100%');
      expect(resetButton).not.toHaveStyle('background-color: #0056b3');
    });

    it('disables all controls when disabled prop is true', () => {
      render(<ZoomControls {...defaultProps} disabled={true} />);
      
      const buttons = [
        screen.getByLabelText('Zoom out'),
        screen.getByLabelText('Zoom in'),
        screen.getByLabelText('Reset zoom to 100%'),
        screen.getByLabelText('Fit to width'),
        screen.getByLabelText('Fit to page'),
      ];
      
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Zoom Functionality', () => {
    it('increases scale by 25% when zoom in is clicked', async () => {
      const onScaleChange = jest.fn();
      const onZoomModeChange = jest.fn();
      render(
        <ZoomControls 
          {...defaultProps} 
          scale={1.0}
          onScaleChange={onScaleChange}
          onZoomModeChange={onZoomModeChange}
        />
      );
      
      const zoomInButton = screen.getByLabelText('Zoom in');
      await userEvent.click(zoomInButton);
      
      expect(onScaleChange).toHaveBeenCalledWith(1.25);
      expect(onZoomModeChange).toHaveBeenCalledWith('custom');
    });

    it('decreases scale by 25% when zoom out is clicked', async () => {
      const onScaleChange = jest.fn();
      const onZoomModeChange = jest.fn();
      render(
        <ZoomControls 
          {...defaultProps} 
          scale={1.0}
          onScaleChange={onScaleChange}
          onZoomModeChange={onZoomModeChange}
        />
      );
      
      const zoomOutButton = screen.getByLabelText('Zoom out');
      await userEvent.click(zoomOutButton);
      
      expect(onScaleChange).toHaveBeenCalledWith(0.8);
      expect(onZoomModeChange).toHaveBeenCalledWith('custom');
    });

    it('respects maximum scale limit when zooming in', async () => {
      const onScaleChange = jest.fn();
      render(
        <ZoomControls 
          {...defaultProps} 
          scale={2.5}
          maxScale={3.0}
          onScaleChange={onScaleChange}
        />
      );
      
      const zoomInButton = screen.getByLabelText('Zoom in');
      await userEvent.click(zoomInButton);
      
      expect(onScaleChange).toHaveBeenCalledWith(3.0); // Clamped to max
    });

    it('respects minimum scale limit when zooming out', async () => {
      const onScaleChange = jest.fn();
      render(
        <ZoomControls 
          {...defaultProps} 
          scale={0.3}
          minScale={0.25}
          onScaleChange={onScaleChange}
        />
      );
      
      const zoomOutButton = screen.getByLabelText('Zoom out');
      await userEvent.click(zoomOutButton);
      
      expect(onScaleChange).toHaveBeenCalledWith(0.25); // Clamped to min
    });

    it('resets to 100% scale when reset button is clicked', async () => {
      const onScaleChange = jest.fn();
      const onZoomModeChange = jest.fn();
      render(
        <ZoomControls 
          {...defaultProps} 
          scale={1.5}
          onScaleChange={onScaleChange}
          onZoomModeChange={onZoomModeChange}
        />
      );
      
      const resetButton = screen.getByLabelText('Reset zoom to 100%');
      await userEvent.click(resetButton);
      
      expect(onScaleChange).toHaveBeenCalledWith(1.0);
      expect(onZoomModeChange).toHaveBeenCalledWith('custom');
    });

    it('sets fit-width mode when fit width button is clicked', async () => {
      const onZoomModeChange = jest.fn();
      render(<ZoomControls {...defaultProps} onZoomModeChange={onZoomModeChange} />);
      
      const fitWidthButton = screen.getByLabelText('Fit to width');
      await userEvent.click(fitWidthButton);
      
      expect(onZoomModeChange).toHaveBeenCalledWith('fit-width');
    });

    it('sets fit-page mode when fit page button is clicked', async () => {
      const onZoomModeChange = jest.fn();
      render(<ZoomControls {...defaultProps} onZoomModeChange={onZoomModeChange} />);
      
      const fitPageButton = screen.getByLabelText('Fit to page');
      await userEvent.click(fitPageButton);
      
      expect(onZoomModeChange).toHaveBeenCalledWith('fit-page');
    });

    it('does not call handlers when disabled', async () => {
      const onScaleChange = jest.fn();
      const onZoomModeChange = jest.fn();
      render(
        <ZoomControls 
          {...defaultProps} 
          disabled={true}
          onScaleChange={onScaleChange}
          onZoomModeChange={onZoomModeChange}
        />
      );
      
      const zoomInButton = screen.getByLabelText('Zoom in');
      const fitWidthButton = screen.getByLabelText('Fit to width');
      
      await userEvent.click(zoomInButton);
      await userEvent.click(fitWidthButton);
      
      expect(onScaleChange).not.toHaveBeenCalled();
      expect(onZoomModeChange).not.toHaveBeenCalled();
    });
  });

  describe('Custom Scale Limits', () => {
    it('uses custom minimum scale', () => {
      render(<ZoomControls {...defaultProps} scale={0.1} minScale={0.1} />);
      
      const zoomOutButton = screen.getByLabelText('Zoom out');
      expect(zoomOutButton).toBeDisabled();
    });

    it('uses custom maximum scale', () => {
      render(<ZoomControls {...defaultProps} scale={5.0} maxScale={5.0} />);
      
      const zoomInButton = screen.getByLabelText('Zoom in');
      expect(zoomInButton).toBeDisabled();
    });

    it('uses default scale limits when not provided', () => {
      render(<ZoomControls {...defaultProps} scale={0.25} />);
      
      const zoomOutButton = screen.getByLabelText('Zoom out');
      expect(zoomOutButton).toBeDisabled(); // At default min of 0.25
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all buttons', () => {
      render(<ZoomControls {...defaultProps} />);
      
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Reset zoom to 100%')).toBeInTheDocument();
      expect(screen.getByLabelText('Fit to width')).toBeInTheDocument();
      expect(screen.getByLabelText('Fit to page')).toBeInTheDocument();
      expect(screen.getByLabelText('Current zoom level: 100%')).toBeInTheDocument();
    });

    it('has proper title attributes for tooltips', () => {
      render(<ZoomControls {...defaultProps} />);
      
      expect(screen.getByLabelText('Zoom out')).toHaveAttribute('title', 'Zoom out');
      expect(screen.getByLabelText('Zoom in')).toHaveAttribute('title', 'Zoom in');
      expect(screen.getByLabelText('Reset zoom to 100%')).toHaveAttribute('title', 'Reset zoom to 100%');
      expect(screen.getByLabelText('Fit to width')).toHaveAttribute('title', 'Fit to width');
      expect(screen.getByLabelText('Fit to page')).toHaveAttribute('title', 'Fit to page');
      expect(screen.getByLabelText('Current zoom level: 100%')).toHaveAttribute('title', 'Current zoom level');
    });

    it('supports keyboard navigation', async () => {
      const onScaleChange = jest.fn();
      render(<ZoomControls {...defaultProps} onScaleChange={onScaleChange} />);
      
      // Focus and activate zoom out button
      const zoomOutButton = screen.getByLabelText('Zoom out');
      zoomOutButton.focus();
      await userEvent.keyboard(' ');
      expect(onScaleChange).toHaveBeenCalledWith(0.8);
      
      onScaleChange.mockClear();
      
      // Focus and activate zoom in button
      const zoomInButton = screen.getByLabelText('Zoom in');
      zoomInButton.focus();
      await userEvent.keyboard('{Enter}');
      expect(onScaleChange).toHaveBeenCalledWith(1.25);
    });
  });
});