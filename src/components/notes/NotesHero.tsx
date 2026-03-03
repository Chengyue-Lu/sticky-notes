type NotesHeroProps = {
  todayActiveSeconds: number;
  totalActiveSeconds: number;
  idleSeconds: number | null;
  isTrackingAvailable: boolean;
  onResetTodayActiveSeconds: () => void;
  onResetTotalActiveSeconds: () => void;
};

// Status text is compact because it sits in the same action row as the reset buttons.
function formatStatusDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${seconds}s`;
}

// Today keeps second-level precision so short sessions are still visible.
function formatTodayDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

// Total time stays coarse on purpose; a lifetime counter is easier to scan in days + hours.
function formatTotalDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);

  return `${days}d ${hours}h`;
}

function getStatusLabel(
  idleSeconds: number | null,
  isTrackingAvailable: boolean,
): string {
  if (!isTrackingAvailable) {
    return 'Tracking unavailable';
  }

  if (idleSeconds === null) {
    return 'Syncing...';
  }

  if (idleSeconds < 60) {
    return 'Active now';
  }

  return `Idle ${formatStatusDuration(idleSeconds)}`;
}

function NotesHero({
  todayActiveSeconds,
  totalActiveSeconds,
  idleSeconds,
  isTrackingAvailable,
  onResetTodayActiveSeconds,
  onResetTotalActiveSeconds,
}: NotesHeroProps) {
  return (
    <header className="activity-overview" aria-label="Active time summary">
      <div className="activity-meta">
        <div className="window-drag-area">
          <p className="activity-eyebrow">Active Time</p>
          <p className="activity-caption">Based on system idle time</p>
        </div>
      </div>
      {/* Status + resets share one row so the top bar stays dense in the narrow window. */}
      <div className="activity-actions">
        <span
          className={
            isTrackingAvailable
              ? 'activity-status'
              : 'activity-status activity-status-offline'
          }
        >
          {getStatusLabel(idleSeconds, isTrackingAvailable)}
        </span>
        <button
          type="button"
          className="activity-reset-button"
          onClick={onResetTodayActiveSeconds}
        >
          Clear day
        </button>
        <button
          type="button"
          className="activity-reset-button"
          onClick={onResetTotalActiveSeconds}
        >
          Clear all
        </button>
      </div>
      <div className="activity-inline-stats" aria-label="Activity totals">
        <section className="activity-inline-stat" aria-label="Today active time">
          <span className="activity-inline-label">Today</span>
          <strong className="activity-inline-value">
            {formatTodayDuration(todayActiveSeconds)}
          </strong>
        </section>
        <section className="activity-inline-stat" aria-label="Total active time">
          <span className="activity-inline-label">Total</span>
          <strong className="activity-inline-value">
            {formatTotalDuration(totalActiveSeconds)}
          </strong>
        </section>
      </div>
    </header>
  );
}

export default NotesHero;
