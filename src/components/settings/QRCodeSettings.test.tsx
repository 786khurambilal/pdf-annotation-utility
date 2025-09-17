import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QRCodeSettings } from './QRCodeSettings';
import { useQRCodeSettings } from '../../hooks/useQRCodeSettings';
import { DEFAULT_QR_SETTINGS } from '../../types/qrcode.types';

// Mock the hook
jest.mock('../../hooks/useQRCodeSettings');

const mockUseQRCodeSettings = useQRCodeSettings as jest.MockedFunction<typeof useQRCodeSettings>;

describe('QRCodeSettings', () => {
  const mockUpdateSettings = jest.fn();
  const mockResetToDefaults = jest.fn();
  const mockClearError = jest.fn();

  const defaultHookReturn = {
    settings: { ...DEFAULT_QR_SETTINGS },
    isUpdating: false,
    error: null,
    updateSettings: mockUpdateSettings,
    resetToDefaults: mockResetToDefaults,
    clearError: mockClearError,
    isEnabled: true,
    shouldScanOnUpload: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQRCodeSettings.mockReturnValue(defaultHookReturn);
  });

  it('should render with default settings', () => {
    render(<QRCodeSettings />);

    expect(screen.getByText('QR Code Auto-Detection')).toBeInTheDocument();
    expect(screen.getByText('Automatically scan uploaded PDFs for QR codes and create clickable links.')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable QR code auto-detection')).toBeChecked();
    expect(screen.getByLabelText('Scan automatically when uploading PDFs')).toBeChecked();
    expect(screen.getByDisplayValue('http://test.com/')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<QRCodeSettings className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('qr-settings', 'custom-class');
  });

  it('should show advanced settings when showAdvanced is true', () => {
    render(<QRCodeSettings showAdvanced={true} />);

    expect(screen.getByText('Maximum QR codes per document')).toBeInTheDocument();
    expect(screen.getByText('Scan timeout per page (seconds)')).toBeInTheDocument();
  });

  describe('error handling', () => {
    it('should display error message', () => {
      mockUseQRCodeSettings.mockReturnValue({
        ...defaultHookReturn,
        error: 'Test error message',
      });

      render(<QRCodeSettings />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should clear error when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      mockUseQRCodeSettings.mockReturnValue({
        ...defaultHookReturn,
        error: 'Test error message',
      });

      render(<QRCodeSettings />);

      const dismissButton = screen.getByLabelText('Dismiss error');
      await user.click(dismissButton);

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('main settings controls', () => {
    it('should toggle QR code detection', async () => {
      const user = userEvent.setup();
      render(<QRCodeSettings />);

      const enableCheckbox = screen.getByLabelText('Enable QR code auto-detection');
      await user.click(enableCheckbox);

      expect(mockUpdateSettings).toHaveBeenCalledWith({ enabled: false });
    });

    it('should toggle scan on upload', async () => {
      const user = userEvent.setup();
      render(<QRCodeSettings />);

      const scanOnUploadCheckbox = screen.getByLabelText('Scan automatically when uploading PDFs');
      await user.click(scanOnUploadCheckbox);

      expect(mockUpdateSettings).toHaveBeenCalledWith({ scanOnUpload: false });
    });

    it('should update base URL on blur', async () => {
      const user = userEvent.setup();
      render(<QRCodeSettings />);

      const baseUrlInput = screen.getByLabelText('Base URL for QR codes');
      await user.clear(baseUrlInput);
      await user.type(baseUrlInput, 'https://new.com/');
      await user.tab(); // Trigger blur

      expect(mockUpdateSettings).toHaveBeenCalledWith({ baseUrl: 'https://new.com/' });
    });

    it('should not update base URL if unchanged on blur', async () => {
      const user = userEvent.setup();
      render(<QRCodeSettings />);

      const baseUrlInput = screen.getByLabelText('Base URL for QR codes');
      await user.click(baseUrlInput);
      await user.tab(); // Trigger blur without changing value

      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it('should reset base URL on error', async () => {
      const user = userEvent.setup();
      mockUpdateSettings.mockRejectedValueOnce(new Error('Update failed'));

      render(<QRCodeSettings />);

      const baseUrlInput = screen.getByLabelText('Base URL for QR codes');
      await user.clear(baseUrlInput);
      await user.type(baseUrlInput, 'invalid-url');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(baseUrlInput).toHaveValue('http://test.com/');
      });
    });
  });

  describe('conditional rendering', () => {
    it('should hide dependent settings when QR detection is disabled', () => {
      mockUseQRCodeSettings.mockReturnValue({
        ...defaultHookReturn,
        settings: { ...DEFAULT_QR_SETTINGS, enabled: false },
        isEnabled: false,
        shouldScanOnUpload: false,
      });

      render(<QRCodeSettings />);

      expect(screen.queryByLabelText('Scan automatically when uploading PDFs')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Base URL for QR codes')).not.toBeInTheDocument();
      expect(screen.queryByText('Advanced Settings')).not.toBeInTheDocument();
    });

    it('should show dependent settings when QR detection is enabled', () => {
      render(<QRCodeSettings />);

      expect(screen.getByLabelText('Scan automatically when uploading PDFs')).toBeInTheDocument();
      expect(screen.getByLabelText('Base URL for QR codes')).toBeInTheDocument();
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });
  });

  describe('advanced settings', () => {
    it('should toggle advanced settings visibility', async () => {
      const user = userEvent.setup();
      render(<QRCodeSettings />);

      const advancedToggle = screen.getByText('Advanced Settings');
      
      // Initially hidden
      expect(screen.queryByText('Maximum QR codes per document')).not.toBeInTheDocument();

      // Click to show
      await user.click(advancedToggle);
      expect(screen.getByText('Maximum QR codes per document')).toBeInTheDocument();
      expect(screen.getByText('Scan timeout per page (seconds)')).toBeInTheDocument();

      // Click to hide
      await user.click(advancedToggle);
      expect(screen.queryByText('Maximum QR codes per document')).not.toBeInTheDocument();
    });

    it('should update max scans per document', async () => {
      const user = userEvent.setup();
      render(<QRCodeSettings showAdvanced={true} />);

      const maxScansInput = screen.getByLabelText('Maximum QR codes per document');
      
      // Use fireEvent.change to set the value directly instead of typing
      fireEvent.change(maxScansInput, { target: { value: '50' } });

      expect(mockUpdateSettings).toHaveBeenCalledWith({ maxScansPerDocument: 50 });
    });

    it('should update scan timeout', async () => {
      const user = userEvent.setup();
      render(<QRCodeSettings showAdvanced={true} />);

      const timeoutInput = screen.getByLabelText('Scan timeout per page (seconds)');
      
      // Use fireEvent.change to set the value directly instead of typing
      fireEvent.change(timeoutInput, { target: { value: '10' } });

      expect(mockUpdateSettings).toHaveBeenCalledWith({ scanTimeout: 10000 });
    });

    it('should show correct timeout value in seconds', () => {
      mockUseQRCodeSettings.mockReturnValue({
        ...defaultHookReturn,
        settings: { ...DEFAULT_QR_SETTINGS, scanTimeout: 8000 },
      });

      render(<QRCodeSettings showAdvanced={true} />);

      const timeoutInput = screen.getByLabelText('Scan timeout per page (seconds)');
      expect(timeoutInput).toHaveValue(8); // 8000ms = 8 seconds
    });
  });

  describe('reset functionality', () => {
    it('should show confirmation dialog and reset on confirm', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(<QRCodeSettings />);

      const resetButton = screen.getByText('Reset to Defaults');
      await user.click(resetButton);

      expect(confirmSpy).toHaveBeenCalledWith('Reset all QR code settings to defaults? This cannot be undone.');
      expect(mockResetToDefaults).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should not reset on cancel', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(<QRCodeSettings />);

      const resetButton = screen.getByText('Reset to Defaults');
      await user.click(resetButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockResetToDefaults).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('loading state', () => {
    it('should disable controls when updating', () => {
      mockUseQRCodeSettings.mockReturnValue({
        ...defaultHookReturn,
        isUpdating: true,
      });

      render(<QRCodeSettings />);

      expect(screen.getByLabelText('Enable QR code auto-detection')).toBeDisabled();
      expect(screen.getByLabelText('Scan automatically when uploading PDFs')).toBeDisabled();
      expect(screen.getByLabelText('Base URL for QR codes')).toBeDisabled();
      expect(screen.getByText('Reset to Defaults')).toBeDisabled();
    });

    it('should show loading message when updating', () => {
      mockUseQRCodeSettings.mockReturnValue({
        ...defaultHookReturn,
        isUpdating: true,
      });

      render(<QRCodeSettings />);

      expect(screen.getByText('Updating settings...')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<QRCodeSettings />);

      const advancedToggle = screen.getByText('Advanced Settings');
      expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when advanced settings are shown', async () => {
      const user = userEvent.setup();
      render(<QRCodeSettings />);

      const advancedToggle = screen.getByText('Advanced Settings');
      await user.click(advancedToggle);

      expect(advancedToggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper labels for form controls', () => {
      render(<QRCodeSettings showAdvanced={true} />);

      expect(screen.getByLabelText('Enable QR code auto-detection')).toBeInTheDocument();
      expect(screen.getByLabelText('Scan automatically when uploading PDFs')).toBeInTheDocument();
      expect(screen.getByLabelText('Base URL for QR codes')).toBeInTheDocument();
      expect(screen.getByLabelText('Maximum QR codes per document')).toBeInTheDocument();
      expect(screen.getByLabelText('Scan timeout per page (seconds)')).toBeInTheDocument();
    });
  });

  describe('error handling in event handlers', () => {
    it('should handle errors in toggle handlers gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockUpdateSettings.mockRejectedValueOnce(new Error('Update failed'));

      render(<QRCodeSettings />);

      const enableCheckbox = screen.getByLabelText('Enable QR code auto-detection');
      await user.click(enableCheckbox);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle QR code detection:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle errors in advanced settings gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockUpdateSettings.mockRejectedValueOnce(new Error('Update failed'));

      render(<QRCodeSettings showAdvanced={true} />);

      const maxScansInput = screen.getByLabelText('Maximum QR codes per document');
      await user.clear(maxScansInput);
      await user.type(maxScansInput, '50');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to update advanced settings:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle errors in reset gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockResetToDefaults.mockRejectedValueOnce(new Error('Reset failed'));

      render(<QRCodeSettings />);

      const resetButton = screen.getByText('Reset to Defaults');
      await user.click(resetButton);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to reset settings:', expect.any(Error));
      
      consoleSpy.mockRestore();
      confirmSpy.mockRestore();
    });
  });
});