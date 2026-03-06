import { useEffect, useState } from 'react';
import type { FocusTimerSession } from '../../hooks/useFocusTimer';

type NotesFloatingStatsProps = {
  totalItems: number;
  completedFocusCount: number;
  focusSession: FocusTimerSession | null;
  onStartFocusTimer: (input: {
    content: string;
    durationSeconds: number;
  }) => void;
  onDismissFocusTimer: () => void;
};

const MAX_FOCUS_HOURS = 23;
const MAX_FOCUS_MINUTES = 59;
const CANCEL_CONFIRM_TIMEOUT_MS = 2200;

function clampWholeNumber(
  value: string,
  minimum: number,
  maximum: number,
): number {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, parsedValue));
}

function formatFocusDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

function NotesFloatingStats({
  totalItems,
  completedFocusCount,
  focusSession,
  onStartFocusTimer,
  onDismissFocusTimer,
}: NotesFloatingStatsProps) {
  const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false);
  const [taskContent, setTaskContent] = useState('');
  const [taskHours, setTaskHours] = useState('0');
  const [taskMinutes, setTaskMinutes] = useState('25');
  const [formError, setFormError] = useState<string | null>(null);
  const [isCancelConfirming, setIsCancelConfirming] = useState(false);

  useEffect(() => {
    if (!isCancelConfirming) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsCancelConfirming(false);
    }, CANCEL_CONFIRM_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isCancelConfirming]);

  function handleToggleTimerPanel() {
    if (focusSession) {
      return;
    }

    setIsTimerPanelOpen((currentValue) => !currentValue);
    setFormError(null);
  }

  function handleStartTimer() {
    const cleanContent = taskContent.trim();
    const safeHours = clampWholeNumber(taskHours, 0, MAX_FOCUS_HOURS);
    const safeMinutes = clampWholeNumber(taskMinutes, 0, MAX_FOCUS_MINUTES);
    const durationSeconds = safeHours * 3600 + safeMinutes * 60;

    setTaskHours(String(safeHours));
    setTaskMinutes(String(safeMinutes));

    if (!cleanContent) {
      setFormError('Add a short task title first.');
      return;
    }

    if (durationSeconds <= 0) {
      setFormError('Set at least 1 minute.');
      return;
    }

    onStartFocusTimer({
      content: cleanContent,
      durationSeconds,
    });
    setIsTimerPanelOpen(false);
    setFormError(null);
    setIsCancelConfirming(false);
  }

  function handleStopTimer() {
    if (!focusSession || focusSession.phase !== 'running') {
      return;
    }

    if (!isCancelConfirming) {
      setIsCancelConfirming(true);
      return;
    }

    onDismissFocusTimer();
    setIsCancelConfirming(false);
  }

  return (
    <>
      {focusSession?.phase === 'running' ? (
        <div className="focus-timer-overlay" aria-live="polite">
          <div className="focus-timer-card">
            <div className="focus-timer-main">
              <strong className="focus-timer-task">{focusSession.content}</strong>
              <span className="focus-timer-countdown">
                {formatFocusDuration(focusSession.remainingSeconds)}
              </span>
            </div>
            <div className="focus-timer-actions">
              <span className="focus-timer-hint">
                {isCancelConfirming ? 'Click again to stop' : 'Focus mode is running'}
              </span>
              <button
                type="button"
                className={
                  isCancelConfirming
                    ? 'focus-timer-stop-button focus-timer-stop-button-confirm'
                    : 'focus-timer-stop-button'
                }
                onClick={handleStopTimer}
              >
                {isCancelConfirming ? 'Confirm' : 'Stop'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="floating-footer-cluster">
        <div className="floating-alarm-dock">
          <button
            type="button"
            aria-label="Open focus timer"
            className={
              isTimerPanelOpen || focusSession
                ? 'floating-alarm-button floating-alarm-button-active'
                : 'floating-alarm-button'
            }
            onClick={handleToggleTimerPanel}
            disabled={Boolean(focusSession)}
          >
            <span className="floating-alarm-glyph" aria-hidden="true">
              &#9200;
            </span>
          </button>
          <section
            className={
              isTimerPanelOpen
                ? 'focus-timer-popover focus-timer-popover-open'
                : 'focus-timer-popover'
            }
            aria-hidden={!isTimerPanelOpen}
            aria-label="Focus timer setup"
          >
            <div className="focus-timer-popover-head">
              <p className="focus-timer-popover-eyebrow">Focus Timer</p>
              <p className="focus-timer-popover-caption">
                Set a short focus task and duration
              </p>
            </div>
            <div className="focus-timer-popover-form">
              <label className="focus-timer-field">
                <span>Task</span>
                <input
                  type="text"
                  value={taskContent}
                  maxLength={80}
                  placeholder="What are you focusing on?"
                  onChange={(event) => {
                    setTaskContent(event.target.value);
                  }}
                />
              </label>
              <div className="focus-timer-duration">
                <label className="focus-timer-field">
                  <span>Hours</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_FOCUS_HOURS}
                    step={1}
                    value={taskHours}
                    onChange={(event) => {
                      setTaskHours(event.target.value);
                    }}
                  />
                </label>
                <label className="focus-timer-field">
                  <span>Minutes</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_FOCUS_MINUTES}
                    step={1}
                    value={taskMinutes}
                    onChange={(event) => {
                      setTaskMinutes(event.target.value);
                    }}
                  />
                </label>
              </div>
              {formError ? <p className="focus-timer-error">{formError}</p> : null}
              <div className="focus-timer-popover-actions">
                <button
                  type="button"
                  className="focus-timer-secondary"
                  onClick={() => {
                    setIsTimerPanelOpen(false);
                    setFormError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="focus-timer-primary"
                  onClick={handleStartTimer}
                >
                  Start
                </button>
              </div>
            </div>
          </section>
        </div>
        <aside className="floating-stats" aria-label="Notes quick summary">
          <div className="floating-stat">
            <span className="floating-stat-label">Total</span>
            <strong className="floating-stat-value">{totalItems}</strong>
          </div>
          <div className="floating-stat">
            <span className="floating-stat-label">Focus</span>
            <strong className="floating-stat-value">{completedFocusCount}</strong>
          </div>
        </aside>
      </div>
    </>
  );
}

export default NotesFloatingStats;
