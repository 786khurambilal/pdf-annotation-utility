/**
 * QR Code Settings Types
 * Defines interfaces for QR code auto-detection configuration and settings
 */

export interface QRCodeSettings {
  /** Whether QR code auto-detection is enabled */
  enabled: boolean;
  /** Whether to automatically scan for QR codes when a PDF is uploaded */
  scanOnUpload: boolean;
  /** Base URL to use for QR codes that don't contain full URLs */
  baseUrl: string;
  /** Maximum number of QR codes to scan per document */
  maxScansPerDocument: number;
  /** Timeout in milliseconds for scanning each page */
  scanTimeout: number;
}

export interface QRCodeSettingsUpdate {
  enabled?: boolean;
  scanOnUpload?: boolean;
  baseUrl?: string;
  maxScansPerDocument?: number;
  scanTimeout?: number;
}

/**
 * Default QR code settings configuration
 */
export const DEFAULT_QR_SETTINGS: QRCodeSettings = {
  enabled: true,
  scanOnUpload: true,
  baseUrl: 'http://test.com/',
  maxScansPerDocument: 100,
  scanTimeout: 5000, // 5 seconds per page
};

/**
 * Validates QR code settings object
 */
export function validateQRCodeSettings(settings: any): settings is QRCodeSettings {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  const requiredFields = ['enabled', 'scanOnUpload', 'baseUrl', 'maxScansPerDocument', 'scanTimeout'];
  
  for (const field of requiredFields) {
    if (!(field in settings)) {
      return false;
    }
  }

  // Type validation
  if (typeof settings.enabled !== 'boolean' ||
      typeof settings.scanOnUpload !== 'boolean' ||
      typeof settings.baseUrl !== 'string' ||
      typeof settings.maxScansPerDocument !== 'number' ||
      typeof settings.scanTimeout !== 'number') {
    return false;
  }

  // Value validation
  if (settings.maxScansPerDocument < 1 || settings.maxScansPerDocument > 1000) {
    return false;
  }

  if (settings.scanTimeout < 1000 || settings.scanTimeout > 30000) {
    return false;
  }

  if (!settings.baseUrl.trim()) {
    return false;
  }

  return true;
}

/**
 * Sanitizes and normalizes QR code settings
 */
export function sanitizeQRCodeSettings(settings: Partial<QRCodeSettings>): QRCodeSettings {
  // Helper function to safely convert to number with fallback
  const safeNumber = (value: any, defaultValue: number, min: number, max: number): number => {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, num));
  };

  const sanitized: QRCodeSettings = {
    enabled: Boolean(settings.enabled ?? DEFAULT_QR_SETTINGS.enabled),
    scanOnUpload: Boolean(settings.scanOnUpload ?? DEFAULT_QR_SETTINGS.scanOnUpload),
    baseUrl: (settings.baseUrl?.trim() || DEFAULT_QR_SETTINGS.baseUrl).replace(/\/$/, '') + '/',
    maxScansPerDocument: safeNumber(settings.maxScansPerDocument, DEFAULT_QR_SETTINGS.maxScansPerDocument, 1, 1000),
    scanTimeout: safeNumber(settings.scanTimeout, DEFAULT_QR_SETTINGS.scanTimeout, 1000, 30000),
  };

  return sanitized;
}