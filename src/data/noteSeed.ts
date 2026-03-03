import type { Note } from '../types/note';
import { formatNoteTimestampForStorage } from '../lib/noteTime';

function createSeedTimestamp(daysAgo: number, hours: number, minutes: number): string {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setDate(date.getDate() - daysAgo);

  return formatNoteTimestampForStorage(date);
}

export const noteSeed: Note[] = [
  {
    id: 'note-1',
    title: 'Build the notes MVP first',
    content:
      'Keep the first iteration focused on note CRUD, tags, and a simple search flow. Delay tasks and floating widgets until the base note experience is stable.',
    tags: ['mvp', 'notes', 'setup'],
    category: 'Planning',
    updatedAt: createSeedTimestamp(0, 9, 30),
    pinned: true,
  },
  {
    id: 'note-2',
    title: 'Daily study checklist',
    content:
      'Review the React shell code, list the next files to create, and verify the app still starts after each small UI change.',
    tags: ['study', 'review'],
    category: 'Today',
    updatedAt: createSeedTimestamp(0, 11, 10),
  },
  {
    id: 'note-3',
    title: 'Storage direction',
    content:
      'Use static demo data now. Move to local JSON or localStorage before introducing SQLite or full-text search.',
    tags: ['storage', 'future'],
    category: 'Architecture',
    updatedAt: createSeedTimestamp(1, 18, 40),
  },
];
