/** 文件说明：便签数据 Hook，封装便签加载、筛选、增删改与刷新。 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createNote,
  deleteNote,
  loadNotes,
  updateNote,
} from '../data/notes';
import {
  filterNotes,
  sortNotes,
} from '../lib/noteSelectors';
import type { CreateNoteInput, Note, UpdateNoteInput } from '../types/note';
import type { NoteSortDirection, NoteSortField } from '../types/settings';

type UseNotesResult = {
  notes: Note[];
  visibleNotes: Note[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isFiltering: boolean;
  reloadNotes: () => Promise<void>;
  addNote: (input: CreateNoteInput) => Promise<Note>;
  editNote: (id: string, input: UpdateNoteInput) => Promise<Note | null>;
  removeNote: (id: string) => Promise<boolean>;
};

export function useNotes(
  sortField: NoteSortField,
  sortDirection: NoteSortDirection,
): UseNotesResult {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    // StrictMode replays effects in development; always reset to mounted here.
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reloadNotes = useCallback(async () => {
    try {
      const items = await loadNotes();

      if (isMountedRef.current) {
        setNotes(items);
      }
    } catch (error) {
      console.error('StickyDesk: failed to load notes.', error);
    }
  }, []);

  useEffect(() => {
    void reloadNotes();
  }, [reloadNotes]);

  // Keep the hook return value fully derived so the page component stays focused on layout only.
  const visibleNotes = sortNotes(
    filterNotes(notes, searchQuery),
    sortField,
    sortDirection,
  );
  const isFiltering = searchQuery.trim().length > 0;

  async function addNote(input: CreateNoteInput): Promise<Note> {
    const nextNote = await createNote(input);

    setNotes((currentNotes) => [nextNote, ...currentNotes]);

    return nextNote;
  }

  async function editNote(
    id: string,
    input: UpdateNoteInput,
  ): Promise<Note | null> {
    const nextNote = await updateNote(id, input);

    if (!nextNote) {
      return null;
    }

    setNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === id ? nextNote : note)),
    );

    return nextNote;
  }

  async function removeNote(id: string): Promise<boolean> {
    const wasDeleted = await deleteNote(id);

    if (!wasDeleted) {
      return false;
    }

    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== id));

    return true;
  }

  return {
    notes,
    visibleNotes,
    searchQuery,
    setSearchQuery,
    isFiltering,
    reloadNotes,
    addNote,
    editNote,
    removeNote,
  };
}

