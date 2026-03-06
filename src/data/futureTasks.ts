/** 文件说明：未来任务数据访问层，统一转发到桌面 API。 */
import type {
  CreateFutureTaskInput,
  FutureTask,
  UpdateFutureTaskInput,
  UpdateFutureTaskStatusInput,
} from '../types/futureTask';
import {
  createFutureTask as createFutureTaskRecord,
  deleteFutureTask as deleteFutureTaskRecord,
  listFutureTasks,
  setFutureTaskCompleted as setFutureTaskCompletedRecord,
  updateFutureTask as updateFutureTaskRecord,
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

export async function updateFutureTask(
  id: string,
  input: UpdateFutureTaskInput,
): Promise<FutureTask | null> {
  return updateFutureTaskRecord(id, input);
}

export async function setFutureTaskCompleted(
  id: string,
  input: UpdateFutureTaskStatusInput,
): Promise<FutureTask | null> {
  return setFutureTaskCompletedRecord(id, input);
}

