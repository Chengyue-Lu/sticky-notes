/** 文件说明：窗口内鼠标位置轮询 Hook，用于自动淡出判断。 */
import { useEffect, useState } from 'react';
import { isCursorInsideWindow } from '../../lib/desktopApi';

export function usePointerInsideShell(autoFadeWhenInactive: boolean): boolean {
  const [isPointerInsideShell, setIsPointerInsideShell] = useState(true);

  useEffect(() => {
    let isDisposed = false;
    let pollTimerId = 0;

    if (!autoFadeWhenInactive) {
      setIsPointerInsideShell(true);
      return () => {};
    }

    const syncPointerState = async () => {
      try {
        const nextIsInside = await isCursorInsideWindow();

        if (!isDisposed) {
          setIsPointerInsideShell(nextIsInside);
        }
      } catch {
        if (!isDisposed) {
          setIsPointerInsideShell(true);
        }
      }
    };

    void syncPointerState();
    pollTimerId = window.setInterval(() => {
      void syncPointerState();
    }, 160);

    return () => {
      isDisposed = true;

      if (pollTimerId) {
        window.clearInterval(pollTimerId);
      }
    };
  }, [autoFadeWhenInactive]);

  return isPointerInsideShell;
}

