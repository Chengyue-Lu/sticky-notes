import { useEffect, useRef, useState } from 'react';
import {
  closeWindow,
  minimizeWindow,
  setWindowSize,
} from '../../lib/desktopApi';
import type {
  AppSettings,
  NoteSortDirection,
  NoteSortField,
  ThemeId,
} from '../../types/settings';

const MIN_WINDOW_WIDTH = 360;
const MIN_WINDOW_HEIGHT = 720;
const MAX_WINDOW_WIDTH = MIN_WINDOW_WIDTH * 3;
const MAX_WINDOW_HEIGHT = 2160;
const MIN_UI_SCALE = 1;
const MAX_UI_SCALE = 2;
const UI_SCALE_STEP = 0.1;
const MIN_SHELL_OPACITY = 0.2;
const MAX_SHELL_OPACITY = 1;
const SHELL_OPACITY_STEP = 0.05;

const THEME_OPTIONS: Array<{
  id: ThemeId;
  label: string;
  swatchStart: string;
  swatchEnd: string;
  ringColor: string;
}> = [
  {
    id: 'white',
    label: 'White theme',
    swatchStart: '#ffffff',
    swatchEnd: '#dbe4f1',
    ringColor: '#cbd5e1',
  },
  {
    id: 'yellow',
    label: 'Yellow theme',
    swatchStart: '#fefce8',
    swatchEnd: '#fde68a',
    ringColor: '#facc15',
  },
  {
    id: 'blue',
    label: 'Blue theme',
    swatchStart: '#eff6ff',
    swatchEnd: '#bfdbfe',
    ringColor: '#60a5fa',
  },
  {
    id: 'green',
    label: 'Green theme',
    swatchStart: '#ecfdf5',
    swatchEnd: '#bbf7d0',
    ringColor: '#4ade80',
  },
  {
    id: 'purple',
    label: 'Purple theme',
    swatchStart: '#faf5ff',
    swatchEnd: '#e9d5ff',
    ringColor: '#c084fc',
  },
];

const SORT_FIELD_OPTIONS: Array<{
  value: NoteSortField;
  label: string;
}> = [
  {
    value: 'createdAt',
    label: 'Creation time',
  },
  {
    value: 'updatedAt',
    label: 'Modification time',
  },
];

type WindowOverlayControlsProps = {
  settings: AppSettings;
  onThemeChange: (themeId: ThemeId) => Promise<void>;
  onUiScaleChange: (value: number) => Promise<void>;
  onShellOpacityChange: (value: number) => Promise<void>;
  onAlwaysOnTopChange: (value: boolean) => Promise<boolean>;
  onAutoFadeWhenInactiveChange: (value: boolean) => Promise<void>;
  onNoteSortChange: (
    field: NoteSortField,
    direction: NoteSortDirection,
  ) => Promise<void>;
};

function normalizeDimensionInput(
  value: string,
  minimum: number,
  maximum: number,
): number {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, parsedValue));
}

function normalizeUiScaleInput(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_UI_SCALE;
  }

  const clampedValue = Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, value));

  return Math.round(clampedValue * 10) / 10;
}

function normalizeShellOpacityInput(value: number): number {
  if (!Number.isFinite(value)) {
    return MAX_SHELL_OPACITY;
  }

  const clampedValue = Math.min(
    MAX_SHELL_OPACITY,
    Math.max(MIN_SHELL_OPACITY, value),
  );

  return Math.round(clampedValue * 100) / 100;
}

function WindowOverlayControls({
  settings,
  onThemeChange,
  onUiScaleChange,
  onShellOpacityChange,
  onAlwaysOnTopChange,
  onAutoFadeWhenInactiveChange,
  onNoteSortChange,
}: WindowOverlayControlsProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [windowWidthInput, setWindowWidthInput] = useState(
    String(settings.window.width),
  );
  const [windowHeightInput, setWindowHeightInput] = useState(
    String(settings.window.height),
  );

  useEffect(() => {
    setWindowWidthInput(String(settings.window.width));
    setWindowHeightInput(String(settings.window.height));
  }, [settings.window.height, settings.window.width]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (overlayRef.current?.contains(target)) {
        return;
      }

      setIsSettingsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isSettingsOpen]);

  const handleToggleSettings = () => {
    setIsSettingsOpen((currentValue) => !currentValue);
  };

  const handleApplyWindowSize = async () => {
    const requestedWidth = normalizeDimensionInput(
      windowWidthInput,
      MIN_WINDOW_WIDTH,
      MAX_WINDOW_WIDTH,
    );
    const requestedHeight = normalizeDimensionInput(
      windowHeightInput,
      MIN_WINDOW_HEIGHT,
      MAX_WINDOW_HEIGHT,
    );
    try {
      const appliedBounds = await setWindowSize(requestedWidth, requestedHeight);
      setWindowWidthInput(String(appliedBounds.width));
      setWindowHeightInput(String(appliedBounds.height));
      return;
    } catch {
      // Keep the local input values when the desktop command is unavailable.
    }

    setWindowWidthInput(String(requestedWidth));
    setWindowHeightInput(String(requestedHeight));
  };

  const handleToggleAlwaysOnTop = () => {
    void onAlwaysOnTopChange(!settings.alwaysOnTop);
  };

  const handleToggleAutoFadeWhenInactive = () => {
    void onAutoFadeWhenInactiveChange(!settings.autoFadeWhenInactive);
  };

  const handleToggleSortDirection = () => {
    const nextDirection: NoteSortDirection =
      settings.noteSort.direction === 'desc' ? 'asc' : 'desc';

    void onNoteSortChange(settings.noteSort.field, nextDirection);
  };

  const handleMinimize = () => {
    void minimizeWindow().catch(() => {});
  };

  const handleClose = () => {
    void closeWindow().catch(() => {});
  };

  return (
    <div ref={overlayRef} className="window-overlay">
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
          <p className="settings-group-hint">
            {MIN_WINDOW_WIDTH}-{MAX_WINDOW_WIDTH}px wide /{' '}
            {MIN_WINDOW_HEIGHT}-{MAX_WINDOW_HEIGHT}px high
          </p>
          <form
            className="settings-size-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleApplyWindowSize();
            }}
          >
            <div className="settings-size-inline">
              <input
                type="number"
                inputMode="numeric"
                min={MIN_WINDOW_WIDTH}
                max={MAX_WINDOW_WIDTH}
                step={1}
                value={windowWidthInput}
                className="settings-size-inline-input"
                aria-label="Window width"
                onChange={(event) => {
                  setWindowWidthInput(event.target.value);
                }}
              />
              <span className="settings-size-multiply" aria-hidden="true">
                x
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_WINDOW_HEIGHT}
                max={MAX_WINDOW_HEIGHT}
                step={1}
                value={windowHeightInput}
                className="settings-size-inline-input"
                aria-label="Window height"
                onChange={(event) => {
                  setWindowHeightInput(event.target.value);
                }}
              />
              <button type="submit" className="settings-size-apply">
                Apply
              </button>
            </div>
          </form>
        </div>
        <div className="settings-group">
          <p className="settings-group-label">UI Scale</p>
          <div className="settings-scale-row">
            <input
              type="range"
              min={MIN_UI_SCALE}
              max={MAX_UI_SCALE}
              step={UI_SCALE_STEP}
              value={settings.uiScale}
              className="settings-scale-slider"
              aria-label="Global UI scale"
              onChange={(event) => {
                void onUiScaleChange(
                  normalizeUiScaleInput(Number(event.target.value)),
                );
              }}
            />
            <span className="settings-scale-value">
              {settings.uiScale.toFixed(1)}x
            </span>
          </div>
        </div>
        <div className="settings-group">
          <p className="settings-group-label">Window Layer</p>
          <div className="settings-scale-row">
            <input
              type="range"
              min={MIN_SHELL_OPACITY}
              max={MAX_SHELL_OPACITY}
              step={SHELL_OPACITY_STEP}
              value={settings.shellOpacity}
              className="settings-scale-slider"
              aria-label="Backplate opacity"
              onChange={(event) => {
                void onShellOpacityChange(
                  normalizeShellOpacityInput(Number(event.target.value)),
                );
              }}
            />
            <span className="settings-scale-value">
              {Math.round(settings.shellOpacity * 100)}%
            </span>
          </div>
          <button
            type="button"
            className={
              settings.alwaysOnTop
                ? 'settings-toggle-button settings-toggle-button-active'
                : 'settings-toggle-button'
            }
            onClick={handleToggleAlwaysOnTop}
          >
            <span>Always on Top</span>
            <strong>{settings.alwaysOnTop ? 'On' : 'Off'}</strong>
          </button>
          <button
            type="button"
            className={
              settings.autoFadeWhenInactive
                ? 'settings-toggle-button settings-toggle-button-active'
                : 'settings-toggle-button'
            }
            onClick={handleToggleAutoFadeWhenInactive}
          >
            <span>Auto Fade</span>
            <strong>{settings.autoFadeWhenInactive ? 'On' : 'Off'}</strong>
          </button>
        </div>
        <div className="settings-group">
          <p className="settings-group-label">Color Theme</p>
          <div
            className="settings-theme-options"
            role="radiogroup"
            aria-label="Color theme"
          >
            {THEME_OPTIONS.map((themeOption) => (
              <button
                key={themeOption.id}
                type="button"
                role="radio"
                aria-label={themeOption.label}
                aria-checked={settings.themeId === themeOption.id}
                className={
                  settings.themeId === themeOption.id
                    ? 'settings-theme-button settings-theme-button-active'
                    : 'settings-theme-button'
                }
                style={{
                  background: `linear-gradient(160deg, ${themeOption.swatchStart}, ${themeOption.swatchEnd})`,
                  borderColor: themeOption.ringColor,
                }}
                onClick={() => {
                  void onThemeChange(themeOption.id);
                }}
              />
            ))}
          </div>
        </div>
        <div className="settings-group">
          <p className="settings-group-label">Sort Rule</p>
          <div className="settings-sort-row">
            <label className="settings-sort-select-shell">
              <span className="settings-sort-label">Sort by</span>
              <select
                className="settings-sort-select"
                value={settings.noteSort.field}
                onChange={(event) => {
                  void onNoteSortChange(
                    event.target.value as NoteSortField,
                    settings.noteSort.direction,
                  );
                }}
              >
                {SORT_FIELD_OPTIONS.map((sortOption) => (
                  <option key={sortOption.value} value={sortOption.value}>
                    {sortOption.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="settings-sort-direction"
              aria-label={
                settings.noteSort.direction === 'desc'
                  ? 'Newest to oldest'
                  : 'Oldest to newest'
              }
              title={
                settings.noteSort.direction === 'desc'
                  ? 'Newest to oldest'
                  : 'Oldest to newest'
              }
              onClick={handleToggleSortDirection}
            >
              <span className="settings-sort-direction-glyph" aria-hidden="true">
                {settings.noteSort.direction === 'desc' ? 'v' : '^'}
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default WindowOverlayControls;
