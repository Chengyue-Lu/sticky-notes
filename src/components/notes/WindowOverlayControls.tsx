import { useState } from 'react';

const WINDOW_SIZE_PRESETS = [
  {
    id: 'compact',
    label: 'Compact',
    description: '360 x 720',
    width: 360,
    height: 720,
  },
  {
    id: 'default',
    label: 'Default',
    description: '440 x 980',
    width: 440,
    height: 980,
  },
  {
    id: 'wide',
    label: 'Wide',
    description: '520 x 980',
    width: 520,
    height: 980,
  },
] as const;

function WindowOverlayControls() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('default');
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  const handleToggleSettings = () => {
    setIsSettingsOpen((currentValue) => !currentValue);
  };

  const handleSetWindowSize = async (
    preset: (typeof WINDOW_SIZE_PRESETS)[number],
  ) => {
    if (typeof window.stickyDesk?.setWindowSize !== 'function') {
      return;
    }

    await window.stickyDesk.setWindowSize(preset.width, preset.height);
    setSelectedPresetId(preset.id);
  };

  const handleToggleAlwaysOnTop = async () => {
    if (typeof window.stickyDesk?.setAlwaysOnTop !== 'function') {
      return;
    }

    const nextValue = !isAlwaysOnTop;
    const appliedValue = await window.stickyDesk.setAlwaysOnTop(nextValue);

    setIsAlwaysOnTop(appliedValue);
  };

  const handleMinimize = () => {
    window.stickyDesk?.minimizeWindow?.();
  };

  const handleClose = () => {
    window.stickyDesk?.closeWindow?.();
  };

  return (
    <div className="window-overlay">
      <div className="window-control-cluster" aria-label="Window controls">
        <button
          type="button"
          aria-label="Open settings"
          className={
            isSettingsOpen
              ? 'window-control-button window-control-button-active'
              : 'window-control-button'
          }
          onClick={handleToggleSettings}
        >
          <span className="window-control-glyph" aria-hidden="true">
            &#9881;
          </span>
        </button>
        <button
          type="button"
          aria-label="Minimize window"
          className="window-control-button"
          onClick={handleMinimize}
        >
          <span className="window-control-glyph" aria-hidden="true">
            &minus;
          </span>
        </button>
        <button
          type="button"
          aria-label="Close window"
          className="window-control-button window-control-button-danger"
          onClick={handleClose}
        >
          <span className="window-control-glyph" aria-hidden="true">
            &times;
          </span>
        </button>
      </div>
      <section
        className={
          isSettingsOpen
            ? 'settings-popover settings-popover-open'
            : 'settings-popover'
        }
        aria-hidden={!isSettingsOpen}
        aria-label="Window settings"
      >
        <div className="settings-group">
          <p className="settings-group-label">Window Size</p>
          <div className="settings-options">
            {WINDOW_SIZE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={
                  preset.id === selectedPresetId
                    ? 'settings-option settings-option-active'
                    : 'settings-option'
                }
                onClick={() => {
                  void handleSetWindowSize(preset);
                }}
              >
                <span>{preset.label}</span>
                <small>{preset.description}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="settings-group">
          <p className="settings-group-label">Window Layer</p>
          <button
            type="button"
            className={
              isAlwaysOnTop
                ? 'settings-toggle-button settings-toggle-button-active'
                : 'settings-toggle-button'
            }
            onClick={() => {
              void handleToggleAlwaysOnTop();
            }}
          >
            <span>Always on Top</span>
            <strong>{isAlwaysOnTop ? 'On' : 'Off'}</strong>
          </button>
        </div>
        <div className="settings-group settings-group-placeholder">
          <p className="settings-group-label">Color Theme</p>
          <div className="settings-placeholder">Placeholder</div>
        </div>
        <div className="settings-group settings-group-placeholder">
          <p className="settings-group-label">Sort Rule</p>
          <div className="settings-placeholder">Placeholder</div>
        </div>
      </section>
    </div>
  );
}

export default WindowOverlayControls;
