import type { Note } from '../../types/note';

type NoteCardProps = {
  note: Note;
  pinned?: boolean;
};

function NoteCard({ note, pinned = false }: NoteCardProps) {
  return (
    <article
      className={pinned ? 'note-card note-card-pinned' : 'note-card'}
      aria-label={`${note.title}, updated ${note.updatedAt}`}
      title={`${note.category} | ${note.updatedAt}`}
    >
      <h3>{note.title}</h3>
      <p className="note-time">{note.updatedAt}</p>
    </article>
  );
}

export default NoteCard;
