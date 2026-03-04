import { invoke } from '@tauri-apps/api/core';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type { CreateFutureTaskInput, FutureTask } from '../types/futureTask';
import type { CreateNoteInput, Note, UpdateNoteInput } from '../types/note';
import type {
  AppSettings,
  NoteSortDirection,
  NoteSortField,
  ThemeId,
} from '../types/settings';

export type WindowBounds = {
  width: number;
  height: number;
  x: number;
  y: number;
};

function isTauriRuntimeAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return '__TAURI_INTERNALS__' in (window as unknown as Record<string, unknown>);
}

function isWindowsPlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return navigator.userAgent.toLowerCase().includes('windows');
}

async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntimeAvailable()) {
    throw new Error(`StickyDesk Tauri runtime is unavailable for ${command}.`);
  }

  return invoke<T>(command, args);
}

export function supportsIdleTracking(): boolean {
  return isTauriRuntimeAvailable() && isWindowsPlatform();
}

export async function getIdleSeconds(): Promise<number> {
  return invokeCommand<number>('get_idle_seconds');
}

export async function minimizeWindow(): Promise<void> {
  return invokeCommand('minimize_window');
}

export async function closeWindow(): Promise<void> {
  return invokeCommand('close_window');
}

export async function setWindowSize(
  width: number,
  height: number,
): Promise<WindowBounds> {
  return invokeCommand<WindowBounds>('set_window_size', {
    width,
    height,
  });
}

export async function setAlwaysOnTop(value: boolean): Promise<boolean> {
  return invokeCommand<boolean>('set_always_on_top', {
    value,
  });
}

export async function isCursorInsideWindow(): Promise<boolean> {
  return invokeCommand<boolean>('is_cursor_inside_window');
}

export async function triggerFocusReminder(title: string): Promise<void> {
  if (!isTauriRuntimeAvailable()) {
    return;
  }

  let permissionGranted = false;

  try {
    permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      permissionGranted = (await requestPermission()) === 'granted';
    }
  } catch {
    return;
  }

  if (!permissionGranted) {
    return;
  }

  const cleanTitle = title.trim() || 'Focus timer finished';

  sendNotification({
    title: 'StickyDesk',
    body: `Time over: ${cleanTitle}`,
  });
}

export async function getSettings(): Promise<AppSettings> {
  return invokeCommand<AppSettings>('get_settings');
}

export async function setTheme(themeId: ThemeId): Promise<AppSettings> {
  return invokeCommand<AppSettings>('set_theme', {
    themeId,
  });
}

export async function setUiScale(value: number): Promise<AppSettings> {
  return invokeCommand<AppSettings>('set_ui_scale', {
    value,
  });
}

export async function setShellOpacity(value: number): Promise<AppSettings> {
  return invokeCommand<AppSettings>('set_shell_opacity', {
    value,
  });
}

export async function setAutoFadeWhenInactive(
  value: boolean,
): Promise<AppSettings> {
  return invokeCommand<AppSettings>('set_auto_fade_when_inactive', {
    value,
  });
}

export async function setNoteSort(
  field: NoteSortField,
  direction: NoteSortDirection,
): Promise<AppSettings> {
  return invokeCommand<AppSettings>('set_note_sort', {
    field,
    direction,
  });
}

export async function listNotes(): Promise<Note[]> {
  return invokeCommand<Note[]>('list_notes');
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  return invokeCommand<Note>('create_note', {
    input,
  });
}

export async function updateNote(
  id: string,
  input: UpdateNoteInput,
): Promise<Note | null> {
  return invokeCommand<Note | null>('update_note', {
    id,
    input,
  });
}

export async function deleteNote(id: string): Promise<boolean> {
  return invokeCommand<boolean>('delete_note', {
    id,
  });
}

export async function listFutureTasks(): Promise<FutureTask[]> {
  return invokeCommand<FutureTask[]>('list_future_tasks');
}

export async function createFutureTask(
  input: CreateFutureTaskInput,
): Promise<FutureTask> {
  return invokeCommand<FutureTask>('create_future_task', {
    input,
  });
}

export async function deleteFutureTask(id: string): Promise<boolean> {
  return invokeCommand<boolean>('delete_future_task', {
    id,
  });
}
