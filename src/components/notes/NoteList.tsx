import NoteCard from './NoteCard';
import type { Note } from '../../types/note';

type NoteListProps = {
  notes: Note[];
  pinned?: boolean;
};

function NoteList({ notes, pinned = false }: NoteListProps) {
  return (
    <div className="notes-grid">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} pinned={pinned} />
      ))}
    </div>
  );
}

export default NoteList;
