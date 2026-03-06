/** 文件说明：窗口右上角控制区组件，包含设置面板与窗口操作按钮。 */
import { useEffect, useRef, useState } from 'react';
import {
  closeWindow,
  minimizeWindow,
} from '../../lib/desktopApi';
import type {
  AppSettings,
  ThemeId,
} from '../../types/settings';

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

type WindowOverlayControlsProps = {
  mode?: 'main' | 'module';
  settings: AppSettings;
  showDetachControls?: boolean;
  isNotesDetached?: boolean;
  isTasksDetached?: boolean;
  onToggleNotesDetached?: () => void;
  onToggleTasksDetached?: () => void;
  onToggleBothDetached?: () => void;
  onThemeChange: (themeId: ThemeId) => Promise<void>;
  onUiScaleChange: (value: number) => Promise<void>;
  onShellOpacityChange: (value: number) => Promise<void>;
  onAlwaysOnTopChange: (value: boolean) => Promise<boolean>;
  onAutoFadeWhenInactiveChange: (value: boolean) => Promise<void>;
};

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
  mode = 'main',
  settings,
  showDetachControls = false,
  isNotesDetached = false,
  isTasksDetached = false,
  onToggleNotesDetached,
  onToggleTasksDetached,
  onToggleBothDetached,
  onThemeChange,
  onUiScaleChange,
  onShellOpacityChange,
  onAlwaysOnTopChange,
  onAutoFadeWhenInactiveChange,
}: WindowOverlayControlsProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDetachMenuOpen, setIsDetachMenuOpen] = useState(false);

  useEffect(() => {
    if (!isSettingsOpen && !isDetachMenuOpen) {
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
      setIsDetachMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isDetachMenuOpen, isSettingsOpen]);

  const handleToggleSettings = () => {
    setIsSettingsOpen((currentValue) => !currentValue);
    setIsDetachMenuOpen(false);
  };

  const handleToggleAlwaysOnTop = () => {
    void onAlwaysOnTopChange(!settings.alwaysOnTop);
  };

  const handleToggleAutoFadeWhenInactive = () => {
    void onAutoFadeWhenInactiveChange(!settings.autoFadeWhenInactive);
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
        {showDetachControls ? (
          <div className="window-detach-shell">
            <button
              type="button"
              aria-label={
                isNotesDetached ? 'Attach notes module' : 'Detach notes module'
              }
              className={
                isNotesDetached
                  ? 'window-control-button window-control-button-active'
                  : 'window-control-button'
              }
              onClick={() => {
                setIsSettingsOpen(false);
                setIsDetachMenuOpen(false);
                onToggleNotesDetached?.();
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                setIsSettingsOpen(false);
                setIsDetachMenuOpen((currentValue) => !currentValue);
              }}
            >
              <span className="window-control-glyph" aria-hidden="true">
                T
              </span>
            </button>
            <section
              className={
                isDetachMenuOpen
                  ? 'window-detach-menu window-detach-menu-open'
                  : 'window-detach-menu'
              }
              aria-hidden={!isDetachMenuOpen}
              aria-label="Detach module menu"
            >
              <button
                type="button"
                className="window-detach-menu-item"
                onClick={() => {
                  setIsDetachMenuOpen(false);
                  onToggleNotesDetached?.();
                }}
              >
                {isNotesDetached ? 'Attach notes' : 'Detach notes'}
              </button>
              <button
                type="button"
                className="window-detach-menu-item"
                onClick={() => {
                  setIsDetachMenuOpen(false);
                  onToggleTasksDetached?.();
                }}
              >
                {isTasksDetached ? 'Attach tasks' : 'Detach tasks'}
              </button>
              <button
                type="button"
                className="window-detach-menu-item"
                onClick={() => {
                  setIsDetachMenuOpen(false);
                  onToggleBothDetached?.();
                }}
              >
                {isNotesDetached && isTasksDetached
                  ? 'Attach both'
                  : 'Detach both'}
              </button>
            </section>
          </div>
        ) : null}
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
        {mode === 'main' ? (
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
        ) : null}
        <div className="settings-group">
          <p className="settings-group-label">Window Layer</p>
          {mode === 'main' ? (
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
          ) : null}
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
          {mode === 'main' ? (
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
          ) : null}
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
      </section>
    </div>
  );
}

export default WindowOverlayControls;

