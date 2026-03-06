/** 文件说明：NotesBoard 的偏好读取、错误格式化与常量工具。 */
import type { NoteSortDirection, NoteSortField, AppSettings, ThemeId } from '../../types/settings';

export type DetachedModuleKind = 'notes' | 'tasks';

export type DetachedModulePreferences = {
  themeId: ThemeId;
  alwaysOnTop: boolean;
};

type DetachedPreferencesStorage = Partial<
  Record<DetachedModuleKind, DetachedModulePreferences>
>;

const DETACHED_PREFERENCES_STORAGE_KEY = 'stickydesk.detached.preferences.v1';

export const DEFAULT_NOTES_SORT_FIELD: NoteSortField = 'createdAt';
export const DEFAULT_NOTES_SORT_DIRECTION: NoteSortDirection = 'desc';

function normalizeThemeId(value: unknown): ThemeId | null {
  if (
    value === 'white' ||
    value === 'yellow' ||
    value === 'blue' ||
    value === 'green' ||
    value === 'purple'
  ) {
    return value;
  }

  return null;
}

function readWindowSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

export function readDetachedBootPreferences(
  moduleKind: DetachedModuleKind | null,
): DetachedModulePreferences | null {
  if (!moduleKind) {
    return null;
  }

  const params = readWindowSearchParams();
  const queryTheme = normalizeThemeId(params.get('theme'));
  const queryAlwaysOnTop = params.get('alwaysOnTop');

  return {
    themeId: queryTheme ?? 'white',
    alwaysOnTop: queryAlwaysOnTop === '1' || queryAlwaysOnTop === 'true',
  };
}

function readDetachedPreferencesStorage(): DetachedPreferencesStorage {
  if (typeof window === 'undefined') {
    return {};
  }

  const rawValue = window.localStorage.getItem(DETACHED_PREFERENCES_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as DetachedPreferencesStorage;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function saveDetachedModulePreferences(
  moduleKind: DetachedModuleKind,
  preferences: DetachedModulePreferences,
) {
  if (typeof window === 'undefined') {
    return;
  }

  const currentStorage = readDetachedPreferencesStorage();
  const nextStorage: DetachedPreferencesStorage = {
    ...currentStorage,
    [moduleKind]: preferences,
  };

  window.localStorage.setItem(
    DETACHED_PREFERENCES_STORAGE_KEY,
    JSON.stringify(nextStorage),
  );
}

export function resolveDetachedModulePreferences(
  moduleKind: DetachedModuleKind,
  appSettings: AppSettings,
): DetachedModulePreferences {
  const storage = readDetachedPreferencesStorage();
  const stored = storage[moduleKind];

  if (stored) {
    return {
      themeId: normalizeThemeId(stored.themeId) ?? appSettings.themeId,
      alwaysOnTop: Boolean(stored.alwaysOnTop),
    };
  }

  return {
    themeId: appSettings.themeId,
    alwaysOnTop: appSettings.alwaysOnTop,
  };
}

export function resolveDetachedWindowPreferencesOnMount(
  moduleKind: DetachedModuleKind,
  appSettings: AppSettings,
): DetachedModulePreferences {
  const bootPreferences = readDetachedBootPreferences(moduleKind);
  const storedPreferences = readDetachedPreferencesStorage()[moduleKind];

  const resolvedThemeId =
    normalizeThemeId(storedPreferences?.themeId) ??
    normalizeThemeId(bootPreferences?.themeId) ??
    appSettings.themeId;
  const resolvedAlwaysOnTop =
    typeof storedPreferences?.alwaysOnTop === 'boolean'
      ? storedPreferences.alwaysOnTop
      : bootPreferences?.alwaysOnTop ?? appSettings.alwaysOnTop;

  return {
    themeId: resolvedThemeId,
    alwaysOnTop: resolvedAlwaysOnTop,
  };
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  const errorText = String(error).trim();

  if (errorText && errorText !== '[object Object]') {
    return errorText;
  }

  return fallback;
}

