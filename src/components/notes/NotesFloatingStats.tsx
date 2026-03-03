type NotesFloatingStatsProps = {
  totalNotes: number;
  pinnedNotes: number;
};

function NotesFloatingStats({
  totalNotes,
  pinnedNotes,
}: NotesFloatingStatsProps) {
  return (
    <aside className="floating-stats" aria-label="Notes quick summary">
      <div className="floating-stat">
        <span className="floating-stat-label">Notes</span>
        <strong className="floating-stat-value">{totalNotes}</strong>
      </div>
      <div className="floating-stat">
        <span className="floating-stat-label">Pinned</span>
        <strong className="floating-stat-value">{pinnedNotes}</strong>
      </div>
    </aside>
  );
}

export default NotesFloatingStats;
