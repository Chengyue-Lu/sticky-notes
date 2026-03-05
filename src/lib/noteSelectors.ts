import type { Note } from '../types/note';
import type { NoteSortDirection, NoteSortField } from '../types/settings';

export function filterNotes(notes: Note[], searchQuery: string): Note[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return notes;
  }

  return notes.filter((note) => {
    // Search intentionally stays on the fields the note model keeps today.
    const searchableFields = [
      note.title,
      note.content,
      ...note.tags,
    ];

    return searchableFields.some((field) =>
      field.toLowerCase().includes(normalizedQuery),
    );
  });
}

function getSortableTimestamp(note: Note, field: NoteSortField): number {
  const parsedValue = Date.parse(note[field]);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function sortNotes(
  notes: Note[],
  field: NoteSortField,
  direction: NoteSortDirection,
): Note[] {
  return [...notes].sort((leftNote, rightNote) => {
    if (Boolean(leftNote.pinned) !== Boolean(rightNote.pinned)) {
      return leftNote.pinned ? -1 : 1;
    }

    const leftTimestamp = getSortableTimestamp(leftNote, field);
    const rightTimestamp = getSortableTimestamp(rightNote, field);

    if (leftTimestamp === rightTimestamp) {
      return leftNote.title.localeCompare(rightNote.title);
    }

    if (direction === 'asc') {
      return leftTimestamp - rightTimestamp;
    }

    return rightTimestamp - leftTimestamp;
  });
}
