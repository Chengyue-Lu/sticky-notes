import { useEffect, useState } from 'react';
import { loadNotes } from '../data/notes';
import {
  filterNotes,
  getPinnedNotes,
  getRegularNotes,
} from '../lib/noteSelectors';
import type { Note } from '../types/note';

type UseNotesResult = {
  notes: Note[];
  visibleNotes: Note[];
  visiblePinnedNotes: Note[];
  visibleRegularNotes: Note[];
  pinnedCount: number;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isFiltering: boolean;
};

export function useNotes(): UseNotesResult {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Guard against setting state after unmount while the async seed loader resolves.
    let active = true;

    void loadNotes().then((items) => {
      if (active) {
        setNotes(items);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Keep the hook return value fully derived so the page component stays focused on layout only.
  const visibleNotes = filterNotes(notes, searchQuery);
  const isFiltering = searchQuery.trim().length > 0;

  return {
    notes,
    visibleNotes,
    visiblePinnedNotes: getPinnedNotes(visibleNotes),
    visibleRegularNotes: getRegularNotes(visibleNotes),
    pinnedCount: getPinnedNotes(notes).length,
    searchQuery,
    setSearchQuery,
    isFiltering,
  };
}
