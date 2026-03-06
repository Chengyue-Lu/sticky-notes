/** 文件说明：活跃时长统计 Hook，管理今日/总计活跃时间数据。 */
import { useEffect, useState } from 'react';
import { getIdleSeconds, supportsIdleTracking } from '../lib/desktopApi';

type ActivitySnapshot = {
  dayKey: string;
  todayActiveSeconds: number;
  totalActiveSeconds: number;
};

export type UseActiveTimeResult = {
  todayActiveSeconds: number;
  totalActiveSeconds: number;
  inactiveSeconds: number | null;
  isIdle: boolean;
  isTrackingAvailable: boolean;
  resetTodayActiveSeconds: () => void;
  resetTotalActiveSeconds: () => void;
};

const STORAGE_KEY = 'stickyDesk.activity.v1';
const POLL_INTERVAL_MS = 1000;
const ACTIVE_IDLE_THRESHOLD_SECONDS = 20;
const MAX_ELAPSED_SECONDS = 30;

function getDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getEmptySnapshot(date: Date): ActivitySnapshot {
  return {
    dayKey: getDayKey(date),
    todayActiveSeconds: 0,
    totalActiveSeconds: 0,
  };
}

function normalizeSnapshotForToday(
  snapshot: ActivitySnapshot,
  date: Date,
): ActivitySnapshot {
  const currentDayKey = getDayKey(date);

  if (snapshot.dayKey === currentDayKey) {
    return snapshot;
  }

  // A day rollover keeps the lifetime total, but the per-day counter starts fresh.
  return {
    dayKey: currentDayKey,
    todayActiveSeconds: 0,
    totalActiveSeconds: snapshot.totalActiveSeconds,
  };
}

function readSnapshot(): ActivitySnapshot {
  if (typeof window === 'undefined') {
    return getEmptySnapshot(new Date());
  }

  const fallback = getEmptySnapshot(new Date());
  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return fallback;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<ActivitySnapshot>;

    const snapshot: ActivitySnapshot = {
      dayKey:
        typeof parsedValue.dayKey === 'string'
          ? parsedValue.dayKey
          : fallback.dayKey,
      todayActiveSeconds:
        typeof parsedValue.todayActiveSeconds === 'number'
          ? Math.max(0, Math.floor(parsedValue.todayActiveSeconds))
          : 0,
      totalActiveSeconds:
        typeof parsedValue.totalActiveSeconds === 'number'
          ? Math.max(0, Math.floor(parsedValue.totalActiveSeconds))
          : 0,
    };

    // Old persisted data can survive restarts, so normalize it before using it in the UI.
    return normalizeSnapshotForToday(snapshot, new Date());
  } catch {
    return fallback;
  }
}

function writeSnapshot(snapshot: ActivitySnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function useActiveTime(): UseActiveTimeResult {
  const [snapshot, setSnapshot] = useState<ActivitySnapshot>(() => readSnapshot());
  const [inactiveSeconds, setInactiveSeconds] = useState<number | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [isTrackingAvailable, setIsTrackingAvailable] = useState(() =>
    supportsIdleTracking(),
  );

  useEffect(() => {
    if (!supportsIdleTracking()) {
      setIsTrackingAvailable(false);
      return;
    }

    let isCancelled = false;
    let lastSampleAt = Date.now();
    let lastWasIdle = false;

    const sampleActivity = async () => {
      try {
        const latestIdleSeconds = await getIdleSeconds();

        if (isCancelled) {
          return;
        }

        const now = Date.now();
        const elapsedSeconds = Math.max(
          0,
          Math.round((now - lastSampleAt) / 1000),
        );
        const boundedElapsedSeconds = Math.min(
          elapsedSeconds,
          MAX_ELAPSED_SECONDS,
        );
        const nextIsIdle = latestIdleSeconds >= ACTIVE_IDLE_THRESHOLD_SECONDS;

        lastSampleAt = now;
        setIsTrackingAvailable(true);
        setIsIdle(nextIsIdle);

        if (!nextIsIdle) {
          lastWasIdle = false;
          setInactiveSeconds(0);
        } else if (!lastWasIdle) {
          // When the system first crosses the idle threshold, the visible idle timer starts fresh at 0.
          lastWasIdle = true;
          setInactiveSeconds(0);
        } else {
          setInactiveSeconds((currentValue) =>
            Math.max(0, (currentValue ?? 0) + boundedElapsedSeconds),
          );
        }

        setSnapshot((currentSnapshot) => {
          const normalizedSnapshot = normalizeSnapshotForToday(
            currentSnapshot,
            new Date(now),
          );
          // Clamp long gaps so a suspended tab or a stalled timer cannot overcount activity.

          if (
            boundedElapsedSeconds === 0 ||
            nextIsIdle
          ) {
            if (normalizedSnapshot !== currentSnapshot) {
              writeSnapshot(normalizedSnapshot);
            }

            return normalizedSnapshot;
          }

          // Only time spent below the idle threshold contributes to the active counters.
          const nextSnapshot = {
            ...normalizedSnapshot,
            todayActiveSeconds:
              normalizedSnapshot.todayActiveSeconds + boundedElapsedSeconds,
            totalActiveSeconds:
              normalizedSnapshot.totalActiveSeconds + boundedElapsedSeconds,
          };

          writeSnapshot(nextSnapshot);
          return nextSnapshot;
        });
      } catch {
        if (!isCancelled) {
          setInactiveSeconds(null);
          setIsIdle(false);
          setIsTrackingAvailable(false);
        }
      }
    };

    void sampleActivity();

    const timerId = window.setInterval(() => {
      void sampleActivity();
    }, POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(timerId);
    };
  }, []);

  const resetTodayActiveSeconds = () => {
    setSnapshot((currentSnapshot) => {
      // Reset against a normalized snapshot so a date rollover cannot restore stale daily data.
      const normalizedSnapshot = normalizeSnapshotForToday(
        currentSnapshot,
        new Date(),
      );
      const nextSnapshot = {
        ...normalizedSnapshot,
        todayActiveSeconds: 0,
      };

      writeSnapshot(nextSnapshot);
      return nextSnapshot;
    });
  };

  const resetTotalActiveSeconds = () => {
    setSnapshot((currentSnapshot) => {
      // "Clear all" intentionally resets both counters to keep total >= today invariant.
      const normalizedSnapshot = normalizeSnapshotForToday(
        currentSnapshot,
        new Date(),
      );
      const nextSnapshot = {
        ...normalizedSnapshot,
        todayActiveSeconds: 0,
        totalActiveSeconds: 0,
      };

      writeSnapshot(nextSnapshot);
      return nextSnapshot;
    });
  };

  return {
    todayActiveSeconds: snapshot.todayActiveSeconds,
    totalActiveSeconds: snapshot.totalActiveSeconds,
    inactiveSeconds,
    isIdle,
    isTrackingAvailable,
    resetTodayActiveSeconds,
    resetTotalActiveSeconds,
  };
}

