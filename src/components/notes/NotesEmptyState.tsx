type NotesEmptyStateProps = {
  title: string;
  description: string;
};

function NotesEmptyState({ title, description }: NotesEmptyStateProps) {
  return (
    <section className="notes-section notes-empty-state" aria-live="polite">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export default NotesEmptyState;
