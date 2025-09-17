import { QRCodeSettings, QRCodeSettingsUpdate, DEFAULT_QR_SETTINGS, validateQRCodeSettings, sanitizeQRCodeSettings } from '../types/qrcode.types';

// Storage configuration
const STORAGE_PREFIX = 'ebook-utility';
const QR_SETTINGS_KEY = `${STORAGE_PREFIX}-qr-settings`;

// Settings service error types
export class QRSettingsStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QRSettingsStorageError';
  }
}

export class QRSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QRSettingsValidationError';
  }
}

/**
 * QRCodeSettingsService handles persistent storage and management of QR code settings
 * using localStorage with validation and error handling
 */
export class QRCodeSettingsService {
  private static instance: QRCodeSettingsService;
  private currentSettings: QRCodeSettings;
  private listeners: Array<(settings: QRCodeSettings) => void> = [];

  private constructor() {
    this.currentSettings = this.loadSettings();
  }

  /**
   * Get singleton instance of QRCodeSettingsService
   */
  public static getInstance(): QRCodeSettingsService {
    if (!QRCodeSettingsService.instance) {
      QRCodeSettingsService.instance = new QRCodeSettingsService();
    }
    return QRCodeSettingsService.instance;
  }

  /**
   * Load QR code settings from localStorage
   */
  private loadSettings(): QRCodeSettings {
    try {
      const storedSettings = localStorage.getItem(QR_SETTINGS_KEY);
      
      if (!storedSettings) {
        // No stored settings, use defaults
        this.saveSettingsToStorage(DEFAULT_QR_SETTINGS);
        return { ...DEFAULT_QR_SETTINGS };
      }

      const parsed = JSON.parse(storedSettings);
      
      if (!validateQRCodeSettings(parsed)) {
        console.warn('Invalid QR settings found in storage, using defaults');
        this.saveSettingsToStorage(DEFAULT_QR_SETTINGS);
        return { ...DEFAULT_QR_SETTINGS };
      }

      // Sanitize loaded settings to ensure they're within valid ranges
      const sanitized = sanitizeQRCodeSettings(parsed);
      
      // If sanitization changed anything, save the corrected version
      if (JSON.stringify(sanitized) !== JSON.stringify(parsed)) {
        this.saveSettingsToStorage(sanitized);
      }

      return sanitized;
    } catch (error) {
      console.error('Failed to load QR settings from storage:', error);
      // Fall back to defaults on any error
      this.saveSettingsToStorage(DEFAULT_QR_SETTINGS);
      return { ...DEFAULT_QR_SETTINGS };
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettingsToStorage(settings: QRCodeSettings): void {
    try {
      localStorage.setItem(QR_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      throw new QRSettingsStorageError(`Failed to save QR settings: ${error}`);
    }
  }

  /**
   * Notify all listeners of settings changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.currentSettings });
      } catch (error) {
        console.error('Error in QR settings listener:', error);
      }
    });
  }

  /**
   * Get current QR code settings
   */
  public getSettings(): QRCodeSettings {
    return { ...this.currentSettings };
  }

  /**
   * Update QR code settings
   */
  public updateSettings(updates: QRCodeSettingsUpdate): QRCodeSettings {
    if (!updates || typeof updates !== 'object') {
      throw new QRSettingsValidationError('Settings updates must be an object');
    }

    // Merge updates with current settings
    const updatedSettings = {
      ...this.currentSettings,
      ...updates
    };

    // Sanitize the updated settings
    const sanitizedSettings = sanitizeQRCodeSettings(updatedSettings);

    // Validate the final settings
    if (!validateQRCodeSettings(sanitizedSettings)) {
      throw new QRSettingsValidationError('Updated settings failed validation');
    }

    // Save to storage
    this.saveSettingsToStorage(sanitizedSettings);
    
    // Update current settings
    this.currentSettings = sanitizedSettings;
    
    // Notify listeners
    this.notifyListeners();

    return { ...this.currentSettings };
  }

  /**
   * Reset settings to defaults
   */
  public resetToDefaults(): QRCodeSettings {
    const defaultSettings = { ...DEFAULT_QR_SETTINGS };
    
    this.saveSettingsToStorage(defaultSettings);
    this.currentSettings = defaultSettings;
    this.notifyListeners();

    return { ...this.currentSettings };
  }

  /**
   * Subscribe to settings changes
   */
  public subscribe(listener: (settings: QRCodeSettings) => void): () => void {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if QR code scanning is currently enabled
   */
  public isEnabled(): boolean {
    return this.currentSettings.enabled;
  }

  /**
   * Check if scan on upload is enabled
   */
  public shouldScanOnUpload(): boolean {
    return this.currentSettings.enabled && this.currentSettings.scanOnUpload;
  }

  /**
   * Get the base URL for QR code links
   */
  public getBaseUrl(): string {
    return this.currentSettings.baseUrl;
  }

  /**
   * Get maximum scans per document
   */
  public getMaxScansPerDocument(): number {
    return this.currentSettings.maxScansPerDocument;
  }

  /**
   * Get scan timeout in milliseconds
   */
  public getScanTimeout(): number {
    return this.currentSettings.scanTimeout;
  }

  /**
   * Export settings for backup or migration
   */
  public exportSettings(): string {
    return JSON.stringify(this.currentSettings, null, 2);
  }

  /**
   * Import settings from backup or migration
   */
  public importSettings(settingsJson: string): QRCodeSettings {
    try {
      const imported = JSON.parse(settingsJson);
      
      if (!validateQRCodeSettings(imported)) {
        throw new QRSettingsValidationError('Imported settings are invalid');
      }

      const sanitized = sanitizeQRCodeSettings(imported);
      
      this.saveSettingsToStorage(sanitized);
      this.currentSettings = sanitized;
      this.notifyListeners();

      return { ...this.currentSettings };
    } catch (error) {
      if (error instanceof QRSettingsValidationError) {
        throw error;
      }
      throw new QRSettingsStorageError(`Failed to import settings: ${error}`);
    }
  }

  /**
   * Clear all settings data (for testing or reset purposes)
   */
  public clearSettings(): void {
    try {
      localStorage.removeItem(QR_SETTINGS_KEY);
      this.currentSettings = { ...DEFAULT_QR_SETTINGS };
      this.notifyListeners();
    } catch (error) {
      throw new QRSettingsStorageError(`Failed to clear settings: ${error}`);
    }
  }
}

// Export singleton instance
export const qrCodeSettingsService = QRCodeSettingsService.getInstance();