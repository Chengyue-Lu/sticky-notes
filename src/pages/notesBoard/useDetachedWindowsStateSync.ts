/** 文件说明：主窗口与分离窗口状态同步及回归后数据刷新逻辑。 */
import { useEffect, useRef } from 'react';
import { isDetachedModuleWindowOpen } from '../../lib/desktopApi';

type UseDetachedWindowsStateSyncInput = {
  isMainWindow: boolean;
  isNotesDetached: boolean;
  isTasksDetached: boolean;
  setIsNotesDetached: (value: boolean) => void;
  setIsTasksDetached: (value: boolean) => void;
  reloadNotes: () => Promise<void>;
  reloadFutureTasks: () => Promise<void>;
};

export function useDetachedWindowsStateSync({
  isMainWindow,
  isNotesDetached,
  isTasksDetached,
  setIsNotesDetached,
  setIsTasksDetached,
  reloadNotes,
  reloadFutureTasks,
}: UseDetachedWindowsStateSyncInput) {
  const previousDetachedFlagsRef = useRef<{ notes: boolean; tasks: boolean }>({
    notes: false,
    tasks: false,
  });

  useEffect(() => {
    if (!isMainWindow) {
      return;
    }

    let isDisposed = false;
    let pollTimerId = 0;
    let isSyncing = false;

    const syncDetachedWindows = async () => {
      if (isSyncing) {
        return;
      }

      isSyncing = true;

      try {
        const [notesResult, tasksResult] = await Promise.allSettled([
          isDetachedModuleWindowOpen('notes'),
          isDetachedModuleWindowOpen('tasks'),
        ]);

        if (isDisposed) {
          return;
        }

        if (notesResult.status === 'fulfilled') {
          setIsNotesDetached(notesResult.value);
        }

        if (tasksResult.status === 'fulfilled') {
          setIsTasksDetached(tasksResult.value);
        }
      } finally {
        isSyncing = false;
      }
    };

    void syncDetachedWindows();
    pollTimerId = window.setInterval(() => {
      void syncDetachedWindows();
    }, 900);

    return () => {
      isDisposed = true;

      if (pollTimerId) {
        window.clearInterval(pollTimerId);
      }
    };
  }, [isMainWindow, setIsNotesDetached, setIsTasksDetached]);

  useEffect(() => {
    if (!isMainWindow) {
      return;
    }

    const previousFlags = previousDetachedFlagsRef.current;
    const shouldReloadNotes = previousFlags.notes && !isNotesDetached;
    const shouldReloadTasks = previousFlags.tasks && !isTasksDetached;

    previousDetachedFlagsRef.current = {
      notes: isNotesDetached,
      tasks: isTasksDetached,
    };

    if (shouldReloadNotes) {
      void reloadNotes();
    }

    if (shouldReloadTasks) {
      void reloadFutureTasks();
    }
  }, [
    isMainWindow,
    isNotesDetached,
    isTasksDetached,
    reloadFutureTasks,
    reloadNotes,
  ]);
}

