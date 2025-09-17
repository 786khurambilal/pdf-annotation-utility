import React, { useState } from 'react';
import { useQRCodeSettings } from '../../hooks/useQRCodeSettings';
import { QRCodeSettingsUpdate } from '../../types/qrcode.types';

interface QRCodeSettingsProps {
  /** Optional CSS class name */
  className?: string;
  /** Whether to show advanced settings */
  showAdvanced?: boolean;
}

/**
 * QRCodeSettings component provides UI for managing QR code auto-detection preferences
 */
export const QRCodeSettings: React.FC<QRCodeSettingsProps> = ({
  className = '',
  showAdvanced = false
}) => {
  const {
    settings,
    isUpdating,
    error,
    updateSettings,
    resetToDefaults,
    clearError
  } = useQRCodeSettings();

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(showAdvanced);
  const [localBaseUrl, setLocalBaseUrl] = useState(settings.baseUrl);

  // Handle enabling/disabling QR code detection
  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      await updateSettings({ enabled });
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to toggle QR code detection:', err);
    }
  };

  // Handle enabling/disabling scan on upload
  const handleToggleScanOnUpload = async (scanOnUpload: boolean) => {
    try {
      await updateSettings({ scanOnUpload });
    } catch (err) {
      console.error('Failed to toggle scan on upload:', err);
    }
  };

  // Handle base URL changes
  const handleBaseUrlChange = (value: string) => {
    setLocalBaseUrl(value);
  };

  const handleBaseUrlBlur = async () => {
    if (localBaseUrl !== settings.baseUrl) {
      try {
        await updateSettings({ baseUrl: localBaseUrl });
      } catch (err) {
        // Reset to current settings value on error
        setLocalBaseUrl(settings.baseUrl);
        console.error('Failed to update base URL:', err);
      }
    }
  };

  // Handle advanced settings changes
  const handleAdvancedSettingChange = async (updates: QRCodeSettingsUpdate) => {
    try {
      await updateSettings(updates);
    } catch (err) {
      console.error('Failed to update advanced settings:', err);
    }
  };

  // Handle reset to defaults
  const handleReset = async () => {
    if (window.confirm('Reset all QR code settings to defaults? This cannot be undone.')) {
      try {
        await resetToDefaults();
        setLocalBaseUrl(settings.baseUrl); // Update local state
      } catch (err) {
        console.error('Failed to reset settings:', err);
      }
    }
  };

  return (
    <div className={`qr-settings ${className}`}>
      <div className="qr-settings__header">
        <h3>QR Code Auto-Detection</h3>
        <p className="qr-settings__description">
          Automatically scan uploaded PDFs for QR codes and create clickable links.
        </p>
      </div>

      {error && (
        <div className="qr-settings__error" role="alert">
          <span className="qr-settings__error-text">{error}</span>
          <button
            type="button"
            className="qr-settings__error-dismiss"
            onClick={clearError}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="qr-settings__main">
        {/* Primary Settings */}
        <div className="qr-settings__section">
          <label className="qr-settings__toggle">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              disabled={isUpdating}
              className="qr-settings__checkbox"
            />
            <span className="qr-settings__toggle-label">
              Enable QR code auto-detection
            </span>
          </label>
          <p className="qr-settings__help-text">
            When enabled, PDFs will be automatically scanned for QR codes.
          </p>
        </div>

        {settings.enabled && (
          <>
            <div className="qr-settings__section">
              <label className="qr-settings__toggle">
                <input
                  type="checkbox"
                  checked={settings.scanOnUpload}
                  onChange={(e) => handleToggleScanOnUpload(e.target.checked)}
                  disabled={isUpdating}
                  className="qr-settings__checkbox"
                />
                <span className="qr-settings__toggle-label">
                  Scan automatically when uploading PDFs
                </span>
              </label>
              <p className="qr-settings__help-text">
                Start scanning immediately after a PDF is uploaded.
              </p>
            </div>

            <div className="qr-settings__section">
              <label className="qr-settings__field">
                <span className="qr-settings__field-label">Base URL for QR codes</span>
                <input
                  type="url"
                  value={localBaseUrl}
                  onChange={(e) => handleBaseUrlChange(e.target.value)}
                  onBlur={handleBaseUrlBlur}
                  disabled={isUpdating}
                  className="qr-settings__input"
                  placeholder="http://test.com/"
                />
              </label>
              <p className="qr-settings__help-text">
                URL prefix used for QR codes that don't contain complete URLs.
              </p>
            </div>
          </>
        )}

        {/* Advanced Settings */}
        {settings.enabled && (
          <div className="qr-settings__advanced">
            <button
              type="button"
              className="qr-settings__advanced-toggle"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              aria-expanded={showAdvancedSettings}
            >
              Advanced Settings
              <span className={`qr-settings__chevron ${showAdvancedSettings ? 'expanded' : ''}`}>
                ▼
              </span>
            </button>

            {showAdvancedSettings && (
              <div className="qr-settings__advanced-content">
                <div className="qr-settings__section">
                  <label className="qr-settings__field">
                    <span className="qr-settings__field-label">
                      Maximum QR codes per document
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={settings.maxScansPerDocument}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          handleAdvancedSettingChange({
                            maxScansPerDocument: value
                          });
                        }
                      }}
                      disabled={isUpdating}
                      className="qr-settings__input qr-settings__input--number"
                    />
                  </label>
                  <p className="qr-settings__help-text">
                    Limit the number of QR codes to scan per document (1-1000).
                  </p>
                </div>

                <div className="qr-settings__section">
                  <label className="qr-settings__field">
                    <span className="qr-settings__field-label">
                      Scan timeout per page (seconds)
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.scanTimeout / 1000}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          handleAdvancedSettingChange({
                            scanTimeout: value * 1000
                          });
                        }
                      }}
                      disabled={isUpdating}
                      className="qr-settings__input qr-settings__input--number"
                    />
                  </label>
                  <p className="qr-settings__help-text">
                    Maximum time to spend scanning each page (1-30 seconds).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="qr-settings__actions">
        <button
          type="button"
          onClick={handleReset}
          disabled={isUpdating}
          className="qr-settings__button qr-settings__button--secondary"
        >
          Reset to Defaults
        </button>
      </div>

      {isUpdating && (
        <div className="qr-settings__loading" aria-live="polite">
          Updating settings...
        </div>
      )}
    </div>
  );
};