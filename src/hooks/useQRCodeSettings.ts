import { useState, useEffect, useCallback } from 'react';
import { QRCodeSettings, QRCodeSettingsUpdate } from '../types/qrcode.types';
import { qrCodeSettingsService, QRSettingsStorageError, QRSettingsValidationError } from '../utils/QRCodeSettingsService';

export interface UseQRCodeSettingsReturn {
  /** Current QR code settings */
  settings: QRCodeSettings;
  /** Whether settings are currently being updated */
  isUpdating: boolean;
  /** Any error that occurred during settings operations */
  error: string | null;
  /** Update QR code settings */
  updateSettings: (updates: QRCodeSettingsUpdate) => Promise<void>;
  /** Reset settings to defaults */
  resetToDefaults: () => Promise<void>;
  /** Clear any current error */
  clearError: () => void;
  /** Check if QR scanning is enabled */
  isEnabled: boolean;
  /** Check if scan on upload is enabled */
  shouldScanOnUpload: boolean;
}

/**
 * Custom hook for managing QR code settings
 * Provides reactive access to QR code settings with error handling
 */
export function useQRCodeSettings(): UseQRCodeSettingsReturn {
  const [settings, setSettings] = useState<QRCodeSettings>(() => 
    qrCodeSettingsService.getSettings()
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to settings changes
  useEffect(() => {
    const unsubscribe = qrCodeSettingsService.subscribe((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, []);

  // Clear error when settings change successfully
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [settings]);

  /**
   * Update QR code settings
   */
  const updateSettings = useCallback(async (updates: QRCodeSettingsUpdate): Promise<void> => {
    if (isUpdating) {
      return; // Prevent concurrent updates
    }

    setIsUpdating(true);
    setError(null);

    try {
      qrCodeSettingsService.updateSettings(updates);
      // Settings will be updated via the subscription
    } catch (err) {
      let errorMessage = 'Failed to update QR code settings';
      
      if (err instanceof QRSettingsValidationError) {
        errorMessage = `Invalid settings: ${err.message}`;
      } else if (err instanceof QRSettingsStorageError) {
        errorMessage = `Storage error: ${err.message}`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw err; // Re-throw for caller handling
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating]);

  /**
   * Reset settings to defaults
   */
  const resetToDefaults = useCallback(async (): Promise<void> => {
    if (isUpdating) {
      return; // Prevent concurrent updates
    }

    setIsUpdating(true);
    setError(null);

    try {
      qrCodeSettingsService.resetToDefaults();
      // Settings will be updated via the subscription
    } catch (err) {
      let errorMessage = 'Failed to reset QR code settings';
      
      if (err instanceof QRSettingsStorageError) {
        errorMessage = `Storage error: ${err.message}`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw err; // Re-throw for caller handling
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating]);

  /**
   * Clear any current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values for convenience
  const isEnabled = settings.enabled;
  const shouldScanOnUpload = settings.enabled && settings.scanOnUpload;

  return {
    settings,
    isUpdating,
    error,
    updateSettings,
    resetToDefaults,
    clearError,
    isEnabled,
    shouldScanOnUpload,
  };
}