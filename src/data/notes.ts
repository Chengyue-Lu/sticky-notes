import type { CreateNoteInput, Note, UpdateNoteInput } from '../types/note';
import {
  createNote as createNoteRecord,
  deleteNote as deleteNoteRecord,
  listNotes,
  updateNote as updateNoteRecord,
} from '../lib/desktopApi';

export async function loadNotes(): Promise<Note[]> {
  return listNotes();
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  return createNoteRecord(input);
}

export async function updateNote(
  id: string,
  input: UpdateNoteInput,
): Promise<Note | null> {
  return updateNoteRecord(id, input);
}

export async function deleteNote(id: string): Promise<boolean> {
  return deleteNoteRecord(id);
}
