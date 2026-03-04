import type { CreateFutureTaskInput, FutureTask } from '../types/futureTask';
import {
  createFutureTask as createFutureTaskRecord,
  deleteFutureTask as deleteFutureTaskRecord,
  listFutureTasks,
} from '../lib/desktopApi';

export async function loadFutureTasks(): Promise<FutureTask[]> {
  return listFutureTasks();
}

export async function createFutureTask(
  input: CreateFutureTaskInput,
): Promise<FutureTask> {
  return createFutureTaskRecord(input);
}

export async function deleteFutureTask(id: string): Promise<boolean> {
  return deleteFutureTaskRecord(id);
}
