import {
  QRCodeSettings,
  DEFAULT_QR_SETTINGS,
  validateQRCodeSettings,
  sanitizeQRCodeSettings
} from './qrcode.types';

describe('QR Code Types', () => {
  describe('DEFAULT_QR_SETTINGS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_QR_SETTINGS).toEqual({
        enabled: true,
        scanOnUpload: true,
        baseUrl: 'http://test.com/',
        maxScansPerDocument: 100,
        scanTimeout: 5000,
      });
    });

    it('should pass validation', () => {
      expect(validateQRCodeSettings(DEFAULT_QR_SETTINGS)).toBe(true);
    });
  });

  describe('validateQRCodeSettings', () => {
    it('should validate correct settings object', () => {
      const validSettings: QRCodeSettings = {
        enabled: true,
        scanOnUpload: false,
        baseUrl: 'https://example.com/',
        maxScansPerDocument: 50,
        scanTimeout: 3000,
      };

      expect(validateQRCodeSettings(validSettings)).toBe(true);
    });

    it('should reject null or undefined', () => {
      expect(validateQRCodeSettings(null)).toBe(false);
      expect(validateQRCodeSettings(undefined)).toBe(false);
    });

    it('should reject non-object values', () => {
      expect(validateQRCodeSettings('string')).toBe(false);
      expect(validateQRCodeSettings(123)).toBe(false);
      expect(validateQRCodeSettings([])).toBe(false);
    });

    it('should reject objects missing required fields', () => {
      expect(validateQRCodeSettings({})).toBe(false);
      expect(validateQRCodeSettings({ enabled: true })).toBe(false);
      expect(validateQRCodeSettings({
        enabled: true,
        scanOnUpload: true,
        baseUrl: 'http://test.com/',
        maxScansPerDocument: 100,
        // missing scanTimeout
      })).toBe(false);
    });

    it('should reject objects with wrong field types', () => {
      expect(validateQRCodeSettings({
        enabled: 'true', // should be boolean
        scanOnUpload: true,
        baseUrl: 'http://test.com/',
        maxScansPerDocument: 100,
        scanTimeout: 5000,
      })).toBe(false);

      expect(validateQRCodeSettings({
        enabled: true,
        scanOnUpload: true,
        baseUrl: 123, // should be string
        maxScansPerDocument: 100,
        scanTimeout: 5000,
      })).toBe(false);

      expect(validateQRCodeSettings({
        enabled: true,
        scanOnUpload: true,
        baseUrl: 'http://test.com/',
        maxScansPerDocument: '100', // should be number
        scanTimeout: 5000,
      })).toBe(false);
    });

    it('should reject invalid numeric ranges', () => {
      // maxScansPerDocument out of range
      expect(validateQRCodeSettings({
        enabled: true,
        scanOnUpload: true,
        baseUrl: 'http://test.com/',
        maxScansPerDocument: 0, // too low
        scanTimeout: 5000,
      })).toBe(false);

      expect(validateQRCodeSettings({
        enabled: true,
        scanOnUpload: true,
        baseUrl: 'http://test.com/',
        maxScansPerDocument: 1001, // too high
        scanTimeout: 5000,
      })).toBe(false);

      // scanTimeout out of range
      expect(validateQRCodeSettings({
        enabled: true,
        scanOnUpload: true,
        baseUrl: 'http://test.com/',
        maxScansPerDocument: 100,
        scanTimeout: 500, // too low
      })).toBe(false);

      expect(validateQRCodeSettings({
        enabled: true,
        scanOnUpload: true,
        baseUrl: 'http://test.com/',
        maxScansPerDocument: 100,
        scanTimeout: 31000, // too high
      })).toBe(false);
    });

    it('should reject empty baseUrl', () => {
      expect(validateQRCodeSettings({
        enabled: true,
        scanOnUpload: true,
        baseUrl: '', // empty
        maxScansPerDocument: 100,
        scanTimeout: 5000,
      })).toBe(false);

      expect(validateQRCodeSettings({
        enabled: true,
        scanOnUpload: true,
        baseUrl: '   ', // whitespace only
        maxScansPerDocument: 100,
        scanTimeout: 5000,
      })).toBe(false);
    });
  });

  describe('sanitizeQRCodeSettings', () => {
    it('should return defaults for empty input', () => {
      const result = sanitizeQRCodeSettings({});
      expect(result).toEqual(DEFAULT_QR_SETTINGS);
    });

    it('should preserve valid values', () => {
      const input = {
        enabled: false,
        scanOnUpload: false,
        baseUrl: 'https://custom.com/',
        maxScansPerDocument: 25,
        scanTimeout: 3000,
      };

      const result = sanitizeQRCodeSettings(input);
      expect(result).toEqual(input);
    });

    it('should sanitize boolean values', () => {
      const result = sanitizeQRCodeSettings({
        enabled: 'true' as any,
        scanOnUpload: 0 as any,
      });

      expect(result.enabled).toBe(true);
      expect(result.scanOnUpload).toBe(false);
    });

    it('should normalize baseUrl with trailing slash', () => {
      const testCases = [
        { input: 'http://test.com', expected: 'http://test.com/' },
        { input: 'http://test.com/', expected: 'http://test.com/' },
        { input: 'https://example.com/path', expected: 'https://example.com/path/' },
        { input: '  http://test.com  ', expected: 'http://test.com/' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = sanitizeQRCodeSettings({ baseUrl: input });
        expect(result.baseUrl).toBe(expected);
      });
    });

    it('should clamp numeric values to valid ranges', () => {
      const result = sanitizeQRCodeSettings({
        maxScansPerDocument: -10, // below minimum
        scanTimeout: 50000, // above maximum
      });

      expect(result.maxScansPerDocument).toBe(1); // clamped to minimum
      expect(result.scanTimeout).toBe(30000); // clamped to maximum
    });

    it('should handle edge cases for numeric values', () => {
      const result = sanitizeQRCodeSettings({
        maxScansPerDocument: 1000, // at maximum
        scanTimeout: 1000, // at minimum
      });

      expect(result.maxScansPerDocument).toBe(1000);
      expect(result.scanTimeout).toBe(1000);
    });

    it('should use defaults for invalid values', () => {
      const result = sanitizeQRCodeSettings({
        enabled: null as any,
        scanOnUpload: undefined as any,
        baseUrl: null as any,
        maxScansPerDocument: 'invalid' as any,
        scanTimeout: {} as any,
      });

      expect(result).toEqual(DEFAULT_QR_SETTINGS);
    });

    it('should handle partial updates correctly', () => {
      const result = sanitizeQRCodeSettings({
        enabled: false,
        baseUrl: 'https://custom.com',
        // other fields should use defaults
      });

      expect(result).toEqual({
        enabled: false,
        scanOnUpload: DEFAULT_QR_SETTINGS.scanOnUpload,
        baseUrl: 'https://custom.com/',
        maxScansPerDocument: DEFAULT_QR_SETTINGS.maxScansPerDocument,
        scanTimeout: DEFAULT_QR_SETTINGS.scanTimeout,
      });
    });
  });
});