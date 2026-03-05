import NoteList from './NoteList';
import type { Note, UpdateNoteInput } from '../../types/note';

type NotesSectionProps = {
  title: string;
  sectionId: string;
  notes: Note[];
  expandedNoteId: string | null;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, input: UpdateNoteInput) => Promise<Note | null>;
};

function NotesSection({
  title,
  sectionId,
  notes,
  expandedNoteId,
  onToggleExpand,
  onDelete,
  onUpdate,
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
      <NoteList
        notes={notes}
        expandedNoteId={expandedNoteId}
        onToggleExpand={onToggleExpand}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
    </section>
  );
}

export default NotesSection;
