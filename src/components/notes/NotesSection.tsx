import NoteList from './NoteList';
import type { Note } from '../../types/note';

type NotesSectionProps = {
  title: string;
  sectionId: string;
  notes: Note[];
  pinned?: boolean;
};

function NotesSection({
  title,
  sectionId,
  notes,
  pinned = false,
}: NotesSectionProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="notes-section" aria-labelledby={sectionId}>
      <div className="section-head">
        <h2 id={sectionId}>{title}</h2>
        <span className="section-count">{notes.length}</span>
      </div>
      <NoteList notes={notes} pinned={pinned} />
    </section>
  );
}

export default NotesSection;
