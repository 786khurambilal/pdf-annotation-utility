import { QRCodeSettingsService, QRSettingsStorageError, QRSettingsValidationError } from './QRCodeSettingsService';
import { DEFAULT_QR_SETTINGS, QRCodeSettings } from '../types/qrcode.types';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('QRCodeSettingsService', () => {
  let service: QRCodeSettingsService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset singleton instance
    (QRCodeSettingsService as any).instance = undefined;
    
    // Set up default mock behavior
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});
    
    // Create fresh service instance
    service = QRCodeSettingsService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = QRCodeSettingsService.getInstance();
      const instance2 = QRCodeSettingsService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialization', () => {
    it('should load default settings when no stored settings exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const newService = QRCodeSettingsService.getInstance();
      const settings = newService.getSettings();
      
      expect(settings).toEqual(DEFAULT_QR_SETTINGS);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ebook-utility-qr-settings',
        JSON.stringify(DEFAULT_QR_SETTINGS)
      );
    });

    it('should load valid stored settings', () => {
      const storedSettings: QRCodeSettings = {
        enabled: false,
        scanOnUpload: false,
        baseUrl: 'https://custom.com/',
        maxScansPerDocument: 50,
        scanTimeout: 3000,
      };
      
      // Reset singleton and set up mock before creating new instance
      (QRCodeSettingsService as any).instance = undefined;
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedSettings));
      
      const newService = QRCodeSettingsService.getInstance();
      const settings = newService.getSettings();
      
      expect(settings).toEqual(storedSettings);
    });

    it('should use defaults for invalid stored settings', () => {
      const invalidSettings = { enabled: 'invalid' };
      
      // Reset singleton and set up mocks before creating new instance
      (QRCodeSettingsService as any).instance = undefined;
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(invalidSettings));
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const newService = QRCodeSettingsService.getInstance();
      const settings = newService.getSettings();
      
      expect(settings).toEqual(DEFAULT_QR_SETTINGS);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid QR settings found in storage, using defaults');
      
      consoleSpy.mockRestore();
    });

    it('should handle JSON parse errors gracefully', () => {
      // Reset singleton and set up mocks before creating new instance
      (QRCodeSettingsService as any).instance = undefined;
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const newService = QRCodeSettingsService.getInstance();
      const settings = newService.getSettings();
      
      expect(settings).toEqual(DEFAULT_QR_SETTINGS);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should sanitize and save corrected settings', () => {
      const needsSanitization = {
        enabled: true,
        scanOnUpload: true,
        baseUrl: 'http://test.com', // missing trailing slash
        maxScansPerDocument: 100,
        scanTimeout: 5000,
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(needsSanitization));
      
      const newService = QRCodeSettingsService.getInstance();
      const settings = newService.getSettings();
      
      expect(settings.baseUrl).toBe('http://test.com/');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ebook-utility-qr-settings',
        JSON.stringify({ ...needsSanitization, baseUrl: 'http://test.com/' })
      );
    });
  });

  describe('getSettings', () => {
    it('should return copy of current settings', () => {
      const settings1 = service.getSettings();
      const settings2 = service.getSettings();
      
      expect(settings1).toEqual(settings2);
      expect(settings1).not.toBe(settings2); // Different objects
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', () => {
      const updates = { enabled: false, baseUrl: 'https://new.com/' };
      
      const result = service.updateSettings(updates);
      
      expect(result.enabled).toBe(false);
      expect(result.baseUrl).toBe('https://new.com/');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should sanitize updated settings', () => {
      const updates = { 
        baseUrl: 'https://new.com', // missing trailing slash
        maxScansPerDocument: 2000, // above maximum
      };
      
      const result = service.updateSettings(updates);
      
      expect(result.baseUrl).toBe('https://new.com/');
      expect(result.maxScansPerDocument).toBe(1000); // clamped to maximum
    });

    it('should throw error for invalid updates object', () => {
      expect(() => service.updateSettings(null as any)).toThrow(QRSettingsValidationError);
      expect(() => service.updateSettings('invalid' as any)).toThrow(QRSettingsValidationError);
    });

    it('should handle storage errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      expect(() => service.updateSettings({ enabled: false })).toThrow(QRSettingsStorageError);
    });

    it('should notify listeners of changes', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      service.updateSettings({ enabled: false });
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });

  describe('resetToDefaults', () => {
    it('should reset settings to defaults', () => {
      // First change settings
      service.updateSettings({ enabled: false });
      
      // Then reset
      const result = service.resetToDefaults();
      
      expect(result).toEqual(DEFAULT_QR_SETTINGS);
      expect(service.getSettings()).toEqual(DEFAULT_QR_SETTINGS);
    });

    it('should notify listeners of reset', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      service.resetToDefaults();
      
      expect(listener).toHaveBeenCalledWith(DEFAULT_QR_SETTINGS);
    });

    it('should handle storage errors during reset', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => service.resetToDefaults()).toThrow(QRSettingsStorageError);
    });
  });

  describe('subscribe', () => {
    it('should add listener and return unsubscribe function', () => {
      const listener = jest.fn();
      
      const unsubscribe = service.subscribe(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Test that listener is called
      service.updateSettings({ enabled: false });
      expect(listener).toHaveBeenCalled();
      
      // Test unsubscribe
      listener.mockClear();
      unsubscribe();
      service.updateSettings({ enabled: true });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should throw error for non-function listener', () => {
      expect(() => service.subscribe('not a function' as any)).toThrow();
    });

    it('should handle listener errors gracefully', () => {
      const badListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      service.subscribe(badListener);
      service.updateSettings({ enabled: false });
      
      expect(consoleSpy).toHaveBeenCalledWith('Error in QR settings listener:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      service.updateSettings({
        enabled: true,
        scanOnUpload: false,
        baseUrl: 'https://test.com/',
        maxScansPerDocument: 75,
        scanTimeout: 4000,
      });
    });

    it('should return correct isEnabled value', () => {
      expect(service.isEnabled()).toBe(true);
      
      service.updateSettings({ enabled: false });
      expect(service.isEnabled()).toBe(false);
    });

    it('should return correct shouldScanOnUpload value', () => {
      expect(service.shouldScanOnUpload()).toBe(false); // enabled but scanOnUpload is false
      
      service.updateSettings({ scanOnUpload: true });
      expect(service.shouldScanOnUpload()).toBe(true);
      
      service.updateSettings({ enabled: false });
      expect(service.shouldScanOnUpload()).toBe(false); // disabled overrides scanOnUpload
    });

    it('should return correct baseUrl', () => {
      expect(service.getBaseUrl()).toBe('https://test.com/');
    });

    it('should return correct maxScansPerDocument', () => {
      expect(service.getMaxScansPerDocument()).toBe(75);
    });

    it('should return correct scanTimeout', () => {
      expect(service.getScanTimeout()).toBe(4000);
    });
  });

  describe('import/export', () => {
    it('should export settings as JSON string', () => {
      const exported = service.exportSettings();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toEqual(service.getSettings());
    });

    it('should import valid settings', () => {
      const settingsToImport: QRCodeSettings = {
        enabled: false,
        scanOnUpload: false,
        baseUrl: 'https://imported.com/',
        maxScansPerDocument: 25,
        scanTimeout: 2000,
      };
      
      const result = service.importSettings(JSON.stringify(settingsToImport));
      
      expect(result).toEqual(settingsToImport);
      expect(service.getSettings()).toEqual(settingsToImport);
    });

    it('should reject invalid imported settings', () => {
      const invalidSettings = { enabled: 'invalid' };
      
      expect(() => service.importSettings(JSON.stringify(invalidSettings)))
        .toThrow(QRSettingsValidationError);
    });

    it('should handle JSON parse errors in import', () => {
      expect(() => service.importSettings('invalid json'))
        .toThrow(QRSettingsStorageError);
    });

    it('should sanitize imported settings', () => {
      const needsSanitization = {
        enabled: true,
        scanOnUpload: true,
        baseUrl: 'http://imported.com', // missing slash
        maxScansPerDocument: 100,
        scanTimeout: 5000,
      };
      
      const result = service.importSettings(JSON.stringify(needsSanitization));
      
      expect(result.baseUrl).toBe('http://imported.com/');
    });
  });

  describe('clearSettings', () => {
    it('should clear settings and reset to defaults', () => {
      service.updateSettings({ enabled: false });
      
      service.clearSettings();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ebook-utility-qr-settings');
      expect(service.getSettings()).toEqual(DEFAULT_QR_SETTINGS);
    });

    it('should notify listeners of clear', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      service.clearSettings();
      
      expect(listener).toHaveBeenCalledWith(DEFAULT_QR_SETTINGS);
    });

    it('should handle storage errors during clear', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => service.clearSettings()).toThrow(QRSettingsStorageError);
    });
  });
});