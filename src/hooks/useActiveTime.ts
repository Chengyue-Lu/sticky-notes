import { useEffect, useState } from 'react';

type ActivitySnapshot = {
  dayKey: string;
  todayActiveSeconds: number;
  totalActiveSeconds: number;
};

export type UseActiveTimeResult = {
  todayActiveSeconds: number;
  totalActiveSeconds: number;
  idleSeconds: number | null;
  isTrackingAvailable: boolean;
  resetTodayActiveSeconds: () => void;
  resetTotalActiveSeconds: () => void;
};

const STORAGE_KEY = 'stickyDesk.activity.v1';
const POLL_INTERVAL_MS = 1000;
const ACTIVE_IDLE_THRESHOLD_SECONDS = 60;
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
  const [idleSeconds, setIdleSeconds] = useState<number | null>(null);
  const [isTrackingAvailable, setIsTrackingAvailable] = useState(
    () => typeof window !== 'undefined' && typeof window.stickyDesk?.getIdleSeconds === 'function',
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsTrackingAvailable(false);
      return;
    }

    const getIdleSeconds = window.stickyDesk?.getIdleSeconds;

    if (typeof getIdleSeconds !== 'function') {
      setIsTrackingAvailable(false);
      return;
    }

    let isCancelled = false;
    let lastSampleAt = Date.now();

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

        lastSampleAt = now;
        setIdleSeconds(latestIdleSeconds);
        setIsTrackingAvailable(true);

        setSnapshot((currentSnapshot) => {
          const normalizedSnapshot = normalizeSnapshotForToday(
            currentSnapshot,
            new Date(now),
          );
          // Clamp long gaps so a suspended tab or a stalled timer cannot overcount activity.
          const boundedElapsedSeconds = Math.min(
            elapsedSeconds,
            MAX_ELAPSED_SECONDS,
          );

          if (
            boundedElapsedSeconds === 0 ||
            latestIdleSeconds >= ACTIVE_IDLE_THRESHOLD_SECONDS
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
    idleSeconds,
    isTrackingAvailable,
    resetTodayActiveSeconds,
    resetTotalActiveSeconds,
  };
}
