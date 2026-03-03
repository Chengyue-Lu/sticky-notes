import type { Note } from '../../types/note';
import {
  formatNoteTimestampForAbsoluteLabel,
  formatNoteTimestampForDisplay,
} from '../../lib/noteTime';

type NoteCardProps = {
  note: Note;
  pinned?: boolean;
};

function NoteCard({ note, pinned = false }: NoteCardProps) {
  const displayTime = formatNoteTimestampForDisplay(note.updatedAt);
  const absoluteTime = formatNoteTimestampForAbsoluteLabel(note.updatedAt);

  return (
    <article
      className={pinned ? 'note-card note-card-pinned' : 'note-card'}
      aria-label={`${note.title}, updated ${absoluteTime}`}
      title={`${note.category} | ${absoluteTime}`}
    >
      <h3>{note.title}</h3>
      <p className="note-time">{displayTime}</p>
    </article>
  );
}

export default NoteCard;
