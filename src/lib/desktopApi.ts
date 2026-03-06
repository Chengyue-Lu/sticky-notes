/** 文件说明：前端到 Tauri 的桌面能力封装层（invoke 与窗口 API 封装）。 */
import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import { currentMonitor, getCurrentWindow, primaryMonitor } from '@tauri-apps/api/window';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type {
  CreateFutureTaskInput,
  FutureTask,
  UpdateFutureTaskInput,
  UpdateFutureTaskStatusInput,
} from '../types/futureTask';
import type { CreateNoteInput, Note, UpdateNoteInput } from '../types/note';
import type {
  AppSettings,
  ThemeId,
} from '../types/settings';

const DETACHED_NOTES_WINDOW_LABEL = 'detached-notes-window';
const DETACHED_TASKS_WINDOW_LABEL = 'detached-tasks-window';
const DETACHED_WINDOW_WIDTH = 360;
const DETACHED_WINDOW_HEIGHT = 360;
const DETACHED_WINDOW_MIN_WIDTH = 340;
const DETACHED_WINDOW_MIN_HEIGHT = 300;
const DETACHED_WINDOW_HORIZONTAL_GAP = 30;
const DETACHED_WINDOW_TOP_OFFSET = 30;
const MAX_DETACHED_WINDOW_COUNT = 10;

export type DetachedModuleKind = 'notes' | 'tasks';

export type OpenDetachedModuleWindowOptions = {
  themeId: ThemeId;
  alwaysOnTop: boolean;
};

function getDetachedWindowLabel(moduleKind: DetachedModuleKind): string {
  return moduleKind === 'notes'
    ? DETACHED_NOTES_WINDOW_LABEL
    : DETACHED_TASKS_WINDOW_LABEL;
}

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

function toPhysicalPixels(value: number, scaleFactor: number): number {
  return Math.round(value * scaleFactor);
}

async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntimeAvailable()) {
    throw new Error(`StickyDesk runtime is unavailable for ${command}.`);
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

export async function openDetachedModuleWindow(
  moduleKind: DetachedModuleKind,
  options: OpenDetachedModuleWindowOptions,
): Promise<void> {
  if (!isTauriRuntimeAvailable()) {
    return;
  }

  const targetLabel = getDetachedWindowLabel(moduleKind);
  const existingTargetWindow = await WebviewWindow.getByLabel(targetLabel);

  if (existingTargetWindow) {
    await existingTargetWindow.show();
    await existingTargetWindow.setFocus();
    return;
  }

  const existingWindows = await WebviewWindow.getAll();
  const detachedWindowCount = existingWindows.filter(
    (windowHandle) =>
      windowHandle.label === DETACHED_NOTES_WINDOW_LABEL ||
      windowHandle.label === DETACHED_TASKS_WINDOW_LABEL,
  ).length;

  if (detachedWindowCount >= MAX_DETACHED_WINDOW_COUNT) {
    throw new Error('You can open up to 10 child windows at the same time.');
  }

  const siblingLabel =
    moduleKind === 'notes'
      ? DETACHED_TASKS_WINDOW_LABEL
      : DETACHED_NOTES_WINDOW_LABEL;
  const siblingWindow = await WebviewWindow.getByLabel(siblingLabel);
  let siblingPosition: { x: number; y: number } | null = null;
  let siblingSize: { width: number; height: number } | null = null;

  if (siblingWindow) {
    try {
      const [position, size] = await Promise.all([
        siblingWindow.outerPosition(),
        siblingWindow.outerSize(),
      ]);
      siblingPosition = position;
      siblingSize = size;
    } catch {
      siblingPosition = null;
      siblingSize = null;
    }
  }

  const currentWindow = getCurrentWindow();
  const [position, size, rawScaleFactor, current, primary] = await Promise.all([
    currentWindow.outerPosition(),
    currentWindow.outerSize(),
    currentWindow.scaleFactor().catch(() => 1),
    currentMonitor(),
    primaryMonitor(),
  ]);
  const monitor = current ?? primary;
  const scaleFactor =
    Number.isFinite(rawScaleFactor) && rawScaleFactor > 0
      ? rawScaleFactor
      : monitor?.scaleFactor && Number.isFinite(monitor.scaleFactor)
        ? monitor.scaleFactor
        : 1;
  const detachedWindowWidthPx = toPhysicalPixels(
    DETACHED_WINDOW_WIDTH,
    scaleFactor,
  );
  const detachedWindowHeightPx = toPhysicalPixels(
    DETACHED_WINDOW_HEIGHT,
    scaleFactor,
  );
  const horizontalGapPx = toPhysicalPixels(
    DETACHED_WINDOW_HORIZONTAL_GAP,
    scaleFactor,
  );
  const topOffsetPx = toPhysicalPixels(DETACHED_WINDOW_TOP_OFFSET, scaleFactor);

  let x = position.x + size.width + horizontalGapPx;
  let y = position.y + topOffsetPx;

  if (monitor) {
    const monitorLeft = monitor.position.x;
    const monitorTop = monitor.position.y;
    const monitorRight = monitor.position.x + monitor.size.width;
    const monitorBottom = monitor.position.y + monitor.size.height;
    const currentLeft = position.x;
    const currentTop = position.y;
    const currentRight = position.x + size.width;
    const leftSpace = currentLeft - monitorLeft;
    const rightSpace = monitorRight - currentRight;
    let placeOnRight = rightSpace >= leftSpace;

    if (siblingPosition && siblingSize) {
      if (siblingPosition.x >= currentRight) {
        placeOnRight = true;
      } else if (siblingPosition.x + siblingSize.width <= currentLeft) {
        placeOnRight = false;
      }
    }

    let suggestedX = placeOnRight
      ? currentRight + horizontalGapPx
      : currentLeft - detachedWindowWidthPx - horizontalGapPx;

    if (siblingPosition && siblingSize) {
      suggestedX = placeOnRight
        ? siblingPosition.x +
          siblingSize.width +
          horizontalGapPx
        : siblingPosition.x -
          detachedWindowWidthPx -
          horizontalGapPx;
    }

    const suggestedY = currentTop + topOffsetPx;
    const maxX = monitorRight - detachedWindowWidthPx;
    const maxY = monitorBottom - detachedWindowHeightPx;
    x = Math.min(maxX, Math.max(monitorLeft, suggestedX));
    y = Math.min(maxY, Math.max(monitorTop, suggestedY));
  }

  const logicalX = x / scaleFactor;
  const logicalY = y / scaleFactor;

  const url = new URL('/', window.location.href);
  url.searchParams.set('windowKind', 'module');
  url.searchParams.set('module', moduleKind);
  url.searchParams.set('theme', options.themeId);
  url.searchParams.set('alwaysOnTop', options.alwaysOnTop ? '1' : '0');
  const childWindow = new WebviewWindow(targetLabel, {
    title: moduleKind === 'notes' ? 'StickyDesk Notes' : 'StickyDesk Tasks',
    url: url.toString(),
    width: DETACHED_WINDOW_WIDTH,
    height: DETACHED_WINDOW_HEIGHT,
    x: logicalX,
    y: logicalY,
    visible: true,
    decorations: false,
    transparent: true,
    shadow: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    minWidth: DETACHED_WINDOW_MIN_WIDTH,
    minHeight: DETACHED_WINDOW_MIN_HEIGHT,
    alwaysOnTop: options.alwaysOnTop,
  });

  await new Promise<void>((resolve, reject) => {
    void childWindow.once('tauri://created', () => {
      resolve();
    });

    void childWindow.once('tauri://error', (event) => {
      reject(new Error(String(event.payload)));
    });
  });

  await childWindow.setPosition(new PhysicalPosition(x, y));
  await childWindow.setFocus();
}

export async function closeDetachedModuleWindow(
  moduleKind: DetachedModuleKind,
): Promise<void> {
  if (!isTauriRuntimeAvailable()) {
    return;
  }

  const label = getDetachedWindowLabel(moduleKind);
  const targetWindow = await WebviewWindow.getByLabel(label);

  if (!targetWindow) {
    return;
  }

  try {
    await targetWindow.close();
  } catch (error) {
    const errorText = String(error).toLowerCase();

    if (
      errorText.includes('not found') ||
      errorText.includes('no window') ||
      errorText.includes('closed')
    ) {
      return;
    }

    throw error;
  }
}

export async function isDetachedModuleWindowOpen(
  moduleKind: DetachedModuleKind,
): Promise<boolean> {
  if (!isTauriRuntimeAvailable()) {
    return false;
  }

  try {
    const label = getDetachedWindowLabel(moduleKind);
    const targetWindow = await WebviewWindow.getByLabel(label);
    return Boolean(targetWindow);
  } catch {
    return false;
  }
}

export async function setAlwaysOnTop(value: boolean): Promise<boolean> {
  return invokeCommand<boolean>('set_always_on_top', {
    value,
  });
}

export async function setWindowAlwaysOnTopLocal(
  value: boolean,
): Promise<boolean> {
  return invokeCommand<boolean>('set_window_always_on_top_local', {
    value,
  });
}

export async function setMainWindowLayoutCompact(compact: boolean): Promise<void> {
  return invokeCommand('set_main_window_layout_compact', {
    compact,
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

export async function updateFutureTask(
  id: string,
  input: UpdateFutureTaskInput,
): Promise<FutureTask | null> {
  return invokeCommand<FutureTask | null>('update_future_task', {
    id,
    input,
  });
}

export async function setFutureTaskCompleted(
  id: string,
  input: UpdateFutureTaskStatusInput,
): Promise<FutureTask | null> {
  return invokeCommand<FutureTask | null>('set_future_task_completed', {
    id,
    input,
  });
}

