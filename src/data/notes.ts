import { noteSeed } from './noteSeed';
import type { Note } from '../types/note';

export async function loadNotes(): Promise<Note[]> {
  return Promise.resolve(noteSeed);
}
