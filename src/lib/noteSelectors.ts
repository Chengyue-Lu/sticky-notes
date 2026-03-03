import type { Note } from '../types/note';

export function getPinnedNotes(notes: Note[]): Note[] {
  return notes.filter((note) => note.pinned);
}

export function getRegularNotes(notes: Note[]): Note[] {
  return notes.filter((note) => !note.pinned);
}

export function filterNotes(notes: Note[], searchQuery: string): Note[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return notes;
  }

  return notes.filter((note) => {
    // Search intentionally spans the lightweight fields we still keep in the list view.
    const searchableFields = [
      note.title,
      note.content,
      note.category,
      ...note.tags,
    ];

    return searchableFields.some((field) =>
      field.toLowerCase().includes(normalizedQuery),
    );
  });
}
