/** 文件说明：应用设置状态 Hook，封装主题、缩放、透明度等设置读写。 */
import { useEffect, useState } from 'react';
import {
  getSettings as loadPersistedSettings,
  setAlwaysOnTop,
  setAutoFadeWhenInactive,
  setShellOpacity,
  setTheme,
  setUiScale,
} from '../lib/desktopApi';
import type {
  AppSettings,
  ThemeId,
} from '../types/settings';

const DEFAULT_SETTINGS: AppSettings = {
  themeId: 'white',
  uiScale: 1,
  shellOpacity: 1,
  alwaysOnTop: false,
  autoFadeWhenInactive: true,
  window: {
    width: 360,
    height: 720,
  },
  noteSort: {
    field: 'createdAt',
    direction: 'desc',
  },
};

function applyTheme(themeId: ThemeId) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = themeId;
}

function applyUiScale(value: number) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.setProperty('--ui-scale', String(value));
}

function applyShellOpacity(value: number) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.setProperty('--shell-opacity', String(value));
}

function normalizeUiScale(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.uiScale;
  }

  const clampedValue = Math.min(2, Math.max(1, value));

  return Math.round(clampedValue * 10) / 10;
}

function normalizeShellOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.shellOpacity;
  }

  const clampedValue = Math.min(1, Math.max(0.2, value));

  return Math.round(clampedValue * 100) / 100;
}

function normalizeSettings(
  value: Partial<AppSettings> | null | undefined,
): AppSettings {
  return {
    themeId: value?.themeId ?? DEFAULT_SETTINGS.themeId,
    uiScale: normalizeUiScale(value?.uiScale ?? DEFAULT_SETTINGS.uiScale),
    shellOpacity: normalizeShellOpacity(
      value?.shellOpacity ?? DEFAULT_SETTINGS.shellOpacity,
    ),
    alwaysOnTop: Boolean(value?.alwaysOnTop),
    autoFadeWhenInactive:
      typeof value?.autoFadeWhenInactive === 'boolean'
        ? value.autoFadeWhenInactive
        : DEFAULT_SETTINGS.autoFadeWhenInactive,
    window: {
      width:
        typeof value?.window?.width === 'number'
          ? value.window.width
          : DEFAULT_SETTINGS.window.width,
      height:
        typeof value?.window?.height === 'number'
          ? value.window.height
          : DEFAULT_SETTINGS.window.height,
    },
    noteSort: {
      field: value?.noteSort?.field ?? DEFAULT_SETTINGS.noteSort.field,
      direction: value?.noteSort?.direction ?? DEFAULT_SETTINGS.noteSort.direction,
    },
  };
}

type UseAppSettingsResult = {
  settings: AppSettings;
  updateTheme: (themeId: ThemeId) => Promise<void>;
  updateUiScale: (value: number) => Promise<void>;
  updateShellOpacity: (value: number) => Promise<void>;
  updateAlwaysOnTop: (value: boolean) => Promise<boolean>;
  updateAutoFadeWhenInactive: (value: boolean) => Promise<void>;
};

export function useAppSettings(): UseAppSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    applyTheme(DEFAULT_SETTINGS.themeId);
    applyUiScale(DEFAULT_SETTINGS.uiScale);
    applyShellOpacity(DEFAULT_SETTINGS.shellOpacity);

    const loadSettings = async () => {
      try {
        const nextSettings = normalizeSettings(await loadPersistedSettings());

        setSettings(nextSettings);
        applyTheme(nextSettings.themeId);
        applyUiScale(nextSettings.uiScale);
        applyShellOpacity(nextSettings.shellOpacity);
      } catch {
        applyTheme(DEFAULT_SETTINGS.themeId);
        applyUiScale(DEFAULT_SETTINGS.uiScale);
        applyShellOpacity(DEFAULT_SETTINGS.shellOpacity);
      }
    };

    void loadSettings();
  }, []);

  const updateTheme = async (themeId: ThemeId) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      themeId,
    }));
    applyTheme(themeId);

    try {
      const nextSettings = normalizeSettings(await setTheme(themeId));
      setSettings(nextSettings);
      applyTheme(nextSettings.themeId);
      return;
    } catch {
      // Fall back to local-only state so the UI still responds during command failures.
    }
  };

  const updateUiScale = async (value: number) => {
    const nextValue = normalizeUiScale(value);

    setSettings((currentSettings) => ({
      ...currentSettings,
      uiScale: nextValue,
    }));
    applyUiScale(nextValue);

    try {
      const nextSettings = normalizeSettings(await setUiScale(nextValue));
      setSettings(nextSettings);
      applyUiScale(nextSettings.uiScale);
      return;
    } catch {
      // Fall through to local state.
    }
  };

  const updateShellOpacity = async (value: number) => {
    const nextValue = normalizeShellOpacity(value);

    setSettings((currentSettings) => ({
      ...currentSettings,
      shellOpacity: nextValue,
    }));
    applyShellOpacity(nextValue);

    try {
      const nextSettings = normalizeSettings(await setShellOpacity(nextValue));
      setSettings(nextSettings);
      applyShellOpacity(nextSettings.shellOpacity);
      return;
    } catch {
      // Fall through to local state.
    }
  };

  const updateAlwaysOnTop = async (value: boolean): Promise<boolean> => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      alwaysOnTop: value,
    }));

    try {
      const appliedValue = await setAlwaysOnTop(value);

      setSettings((currentSettings) => ({
        ...currentSettings,
        alwaysOnTop: appliedValue,
      }));

      return appliedValue;
    } catch {
      setSettings((currentSettings) => ({
        ...currentSettings,
        alwaysOnTop: value,
      }));
      return value;
    }
  };

  const updateAutoFadeWhenInactive = async (value: boolean) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      autoFadeWhenInactive: value,
    }));

    try {
      const nextSettings = normalizeSettings(await setAutoFadeWhenInactive(value));
      setSettings(nextSettings);
      return;
    } catch {
      // Fall through to local state.
    }
  };

  return {
    settings,
    updateTheme,
    updateUiScale,
    updateShellOpacity,
    updateAlwaysOnTop,
    updateAutoFadeWhenInactive,
  };
}

