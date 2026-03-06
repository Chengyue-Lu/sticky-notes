/** 文件说明：专注计时器 Hook，管理提醒会话与计时流程。 */
import { useEffect, useMemo, useRef, useState } from 'react';

const TIMER_TICK_MS = 1_000;

export type FocusTimerPhase = 'idle' | 'running' | 'alerting';

export type FocusTimerSession = {
  content: string;
  durationSeconds: number;
  remainingSeconds: number;
  phase: FocusTimerPhase;
};

type RunningTimerSession = {
  content: string;
  durationSeconds: number;
  endsAt: number;
  remainingSeconds: number;
  phase: Exclude<FocusTimerPhase, 'idle'>;
};

type StartFocusTimerInput = {
  content: string;
  durationSeconds: number;
};

type UseFocusTimerResult = {
  session: FocusTimerSession | null;
  completedCount: number;
  startTimer: (input: StartFocusTimerInput) => void;
  dismissTimer: () => void;
};

function buildPublicSession(
  activeSession: RunningTimerSession | null,
): FocusTimerSession | null {
  if (!activeSession) {
    return null;
  }

  return {
    content: activeSession.content,
    durationSeconds: activeSession.durationSeconds,
    remainingSeconds: activeSession.remainingSeconds,
    phase: activeSession.phase,
  };
}

export function useFocusTimer(): UseFocusTimerResult {
  const [activeSession, setActiveSession] = useState<RunningTimerSession | null>(
    null,
  );
  const [completedCount, setCompletedCount] = useState(0);
  const previousPhaseRef = useRef<FocusTimerPhase>('idle');

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'running') {
      return;
    }

    const timerId = window.setInterval(() => {
      setActiveSession((currentSession) => {
        if (!currentSession) {
          return null;
        }

        if (currentSession.phase === 'running') {
          const nextRemainingSeconds = Math.max(
            0,
            Math.ceil((currentSession.endsAt - Date.now()) / 1000),
          );

          if (nextRemainingSeconds > 0) {
            return {
              ...currentSession,
              remainingSeconds: nextRemainingSeconds,
            };
          }

          return {
            ...currentSession,
            remainingSeconds: 0,
            phase: 'alerting',
          };
        }

        return currentSession;
      });
    }, TIMER_TICK_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [activeSession]);

  useEffect(() => {
    const currentPhase = activeSession?.phase ?? 'idle';

    if (previousPhaseRef.current === 'running' && currentPhase === 'alerting') {
      setCompletedCount((currentValue) => currentValue + 1);
    }

    previousPhaseRef.current = currentPhase;
  }, [activeSession]);

  const session = useMemo(() => buildPublicSession(activeSession), [activeSession]);

  const startTimer = (input: StartFocusTimerInput) => {
    const cleanContent = input.content.trim();
    const safeDurationSeconds = Math.max(1, Math.floor(input.durationSeconds));

    if (!cleanContent) {
      return;
    }

    setActiveSession({
      content: cleanContent,
      durationSeconds: safeDurationSeconds,
      endsAt: Date.now() + safeDurationSeconds * 1000,
      remainingSeconds: safeDurationSeconds,
      phase: 'running',
    });
  };

  const dismissTimer = () => {
    setActiveSession(null);
  };

  return {
    session,
    completedCount,
    startTimer,
    dismissTimer,
  };
}

