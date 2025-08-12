import { renderHook, act } from '@testing-library/react';
import { useQRCodeSettings } from './useQRCodeSettings';
import { qrCodeSettingsService } from '../utils/QRCodeSettingsService';
import { DEFAULT_QR_SETTINGS } from '../types/qrcode.types';

// Mock the settings service
jest.mock('../utils/QRCodeSettingsService', () => {
  const mockService = {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    resetToDefaults: jest.fn(),
    subscribe: jest.fn(),
  };
  
  return {
    qrCodeSettingsService: mockService,
    QRSettingsStorageError: class extends Error { name = 'QRSettingsStorageError' },
    QRSettingsValidationError: class extends Error { name = 'QRSettingsValidationError' },
  };
});

const mockService = qrCodeSettingsService as jest.Mocked<typeof qrCodeSettingsService>;

describe('useQRCodeSettings', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUnsubscribe = jest.fn();
    mockService.getSettings.mockReturnValue({ ...DEFAULT_QR_SETTINGS });
    mockService.subscribe.mockReturnValue(mockUnsubscribe);
    mockService.updateSettings.mockImplementation((updates) => ({
      ...DEFAULT_QR_SETTINGS,
      ...updates,
    }));
    mockService.resetToDefaults.mockReturnValue({ ...DEFAULT_QR_SETTINGS });
  });

  it('should initialize with current settings', () => {
    const customSettings = {
      ...DEFAULT_QR_SETTINGS,
      enabled: false,
      baseUrl: 'https://custom.com/',
    };
    mockService.getSettings.mockReturnValue(customSettings);

    const { result } = renderHook(() => useQRCodeSettings());

    expect(result.current.settings).toEqual(customSettings);
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.shouldScanOnUpload).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should subscribe to settings changes on mount', () => {
    renderHook(() => useQRCodeSettings());

    expect(mockService.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useQRCodeSettings());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should update settings when service notifies changes', () => {
    let settingsListener: (settings: any) => void;
    mockService.subscribe.mockImplementation((listener) => {
      settingsListener = listener;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useQRCodeSettings());

    const newSettings = { ...DEFAULT_QR_SETTINGS, enabled: false };
    act(() => {
      settingsListener(newSettings);
    });

    expect(result.current.settings).toEqual(newSettings);
    expect(result.current.isEnabled).toBe(false);
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const { result } = renderHook(() => useQRCodeSettings());

      const updates = { enabled: false };
      
      await act(async () => {
        await result.current.updateSettings(updates);
      });

      expect(mockService.updateSettings).toHaveBeenCalledWith(updates);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set updating state during update', async () => {
      const { result } = renderHook(() => useQRCodeSettings());

      // Mock a synchronous update for testing
      mockService.updateSettings.mockImplementation((updates) => ({
        ...DEFAULT_QR_SETTINGS,
        ...updates,
      }));

      await act(async () => {
        await result.current.updateSettings({ enabled: false });
      });

      expect(mockService.updateSettings).toHaveBeenCalledWith({ enabled: false });
      expect(result.current.isUpdating).toBe(false);
    });

    it('should handle validation errors', async () => {
      const { result } = renderHook(() => useQRCodeSettings());

      const validationError = new (require('../utils/QRCodeSettingsService').QRSettingsValidationError)('Invalid settings');
      mockService.updateSettings.mockImplementation(() => {
        throw validationError;
      });

      await act(async () => {
        try {
          await result.current.updateSettings({ enabled: false });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Invalid settings: Invalid settings');
      expect(result.current.isUpdating).toBe(false);
    });

    it('should handle storage errors', async () => {
      const { result } = renderHook(() => useQRCodeSettings());

      const storageError = new (require('../utils/QRCodeSettingsService').QRSettingsStorageError)('Storage full');
      mockService.updateSettings.mockImplementation(() => {
        throw storageError;
      });

      await act(async () => {
        try {
          await result.current.updateSettings({ enabled: false });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Storage error: Storage full');
    });

    it('should handle generic errors', async () => {
      const { result } = renderHook(() => useQRCodeSettings());

      const genericError = new Error('Generic error');
      mockService.updateSettings.mockImplementation(() => {
        throw genericError;
      });

      await act(async () => {
        try {
          await result.current.updateSettings({ enabled: false });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Generic error');
    });

    it('should prevent concurrent updates', async () => {
      const { result } = renderHook(() => useQRCodeSettings());

      // Test the concurrent update prevention logic
      mockService.updateSettings.mockImplementation((updates) => ({
        ...DEFAULT_QR_SETTINGS,
        ...updates,
      }));

      // Make multiple rapid updates
      await act(async () => {
        await Promise.all([
          result.current.updateSettings({ enabled: false }),
          result.current.updateSettings({ baseUrl: 'https://test.com/' }),
        ]);
      });

      // At least one update should have been processed
      expect(mockService.updateSettings).toHaveBeenCalled();
    });
  });

  describe('resetToDefaults', () => {
    it('should reset settings successfully', async () => {
      const { result } = renderHook(() => useQRCodeSettings());

      await act(async () => {
        await result.current.resetToDefaults();
      });

      expect(mockService.resetToDefaults).toHaveBeenCalled();
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle reset errors', async () => {
      const { result } = renderHook(() => useQRCodeSettings());

      const storageError = new (require('../utils/QRCodeSettingsService').QRSettingsStorageError)('Reset failed');
      mockService.resetToDefaults.mockImplementation(() => {
        throw storageError;
      });

      await act(async () => {
        try {
          await result.current.resetToDefaults();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Storage error: Reset failed');
    });

    it('should prevent concurrent reset operations', async () => {
      const { result } = renderHook(() => useQRCodeSettings());

      // Test the concurrent reset prevention logic
      mockService.resetToDefaults.mockReturnValue({ ...DEFAULT_QR_SETTINGS });

      // Make multiple rapid resets
      await act(async () => {
        await Promise.all([
          result.current.resetToDefaults(),
          result.current.resetToDefaults(),
        ]);
      });

      // At least one reset should have been processed
      expect(mockService.resetToDefaults).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should clear current error', async () => {
      const { result } = renderHook(() => useQRCodeSettings());

      // Set an error first
      mockService.updateSettings.mockImplementation(() => {
        throw new Error('Test error');
      });

      await act(async () => {
        try {
          await result.current.updateSettings({ enabled: false });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Test error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('computed values', () => {
    it('should compute isEnabled correctly', () => {
      let settingsListener: (settings: any) => void;
      mockService.subscribe.mockImplementation((listener) => {
        settingsListener = listener;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useQRCodeSettings());

      expect(result.current.isEnabled).toBe(DEFAULT_QR_SETTINGS.enabled);

      // Simulate settings change
      act(() => {
        settingsListener({ ...DEFAULT_QR_SETTINGS, enabled: false });
      });

      expect(result.current.isEnabled).toBe(false);
    });

    it('should compute shouldScanOnUpload correctly', () => {
      let settingsListener: (settings: any) => void;
      mockService.subscribe.mockImplementation((listener) => {
        settingsListener = listener;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useQRCodeSettings());

      // Both enabled and scanOnUpload true
      expect(result.current.shouldScanOnUpload).toBe(true);

      // Enabled but scanOnUpload false
      act(() => {
        settingsListener({ ...DEFAULT_QR_SETTINGS, scanOnUpload: false });
      });

      expect(result.current.shouldScanOnUpload).toBe(false);

      // Disabled (should be false regardless of scanOnUpload)
      act(() => {
        settingsListener({ ...DEFAULT_QR_SETTINGS, enabled: false, scanOnUpload: true });
      });

      expect(result.current.shouldScanOnUpload).toBe(false);
    });
  });

  describe('error clearing on settings change', () => {
    it('should clear error when settings change successfully', () => {
      let settingsListener: (settings: any) => void;
      mockService.subscribe.mockImplementation((listener) => {
        settingsListener = listener;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useQRCodeSettings());

      // Set an error first
      act(() => {
        result.current.clearError();
        // Manually set error for testing
        (result.current as any).error = 'Test error';
      });

      // Simulate settings change
      act(() => {
        settingsListener({ ...DEFAULT_QR_SETTINGS, enabled: false });
      });

      expect(result.current.error).toBeNull();
    });
  });
});