/** 文件说明：未来任务数据 Hook，封装任务加载、增删改与状态切换。 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createFutureTask,
  deleteFutureTask,
  loadFutureTasks,
  setFutureTaskCompleted,
  updateFutureTask,
} from '../data/futureTasks';
import type {
  CreateFutureTaskInput,
  FutureTask,
  UpdateFutureTaskInput,
} from '../types/futureTask';

type UseFutureTasksResult = {
  futureTasks: FutureTask[];
  reloadFutureTasks: () => Promise<void>;
  addFutureTask: (input: CreateFutureTaskInput) => Promise<FutureTask>;
  removeFutureTask: (id: string) => Promise<boolean>;
  toggleFutureTaskCompleted: (
    id: string,
    completed: boolean,
  ) => Promise<FutureTask | null>;
  editFutureTask: (
    id: string,
    input: UpdateFutureTaskInput,
  ) => Promise<FutureTask | null>;
};

function sortFutureTasks(tasks: FutureTask[]): FutureTask[] {
  return [...tasks].sort((leftTask, rightTask) => {
    if (leftTask.completed !== rightTask.completed) {
      return leftTask.completed ? 1 : -1;
    }

    const leftTimestamp = new Date(leftTask.dueAt).getTime();
    const rightTimestamp = new Date(rightTask.dueAt).getTime();

    return leftTimestamp - rightTimestamp;
  });
}

export function useFutureTasks(): UseFutureTasksResult {
  const [futureTasks, setFutureTasks] = useState<FutureTask[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // StrictMode replays effects in development; always reset to mounted here.
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reloadFutureTasks = useCallback(async () => {
    try {
      const items = await loadFutureTasks();

      if (isMountedRef.current) {
        setFutureTasks(items);
      }
    } catch (error) {
      console.error('StickyDesk: failed to load future tasks.', error);
    }
  }, []);

  useEffect(() => {
    void reloadFutureTasks();
  }, [reloadFutureTasks]);

  const sortedFutureTasks = useMemo(
    () => sortFutureTasks(futureTasks),
    [futureTasks],
  );

  async function addFutureTask(input: CreateFutureTaskInput): Promise<FutureTask> {
    const nextTask = await createFutureTask(input);

    setFutureTasks((currentTasks) => [...currentTasks, nextTask]);

    return nextTask;
  }

  async function removeFutureTask(id: string): Promise<boolean> {
    const wasDeleted = await deleteFutureTask(id);

    if (!wasDeleted) {
      return false;
    }

    setFutureTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id),
    );

    return true;
  }

  async function toggleFutureTaskCompleted(
    id: string,
    completed: boolean,
  ): Promise<FutureTask | null> {
    const nextTask = await setFutureTaskCompleted(id, { completed });

    if (!nextTask) {
      return null;
    }

    setFutureTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === id ? nextTask : task)),
    );

    return nextTask;
  }

  async function editFutureTask(
    id: string,
    input: UpdateFutureTaskInput,
  ): Promise<FutureTask | null> {
    const nextTask = await updateFutureTask(id, input);

    if (!nextTask) {
      return null;
    }

    setFutureTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === id ? nextTask : task)),
    );

    return nextTask;
  }

  return {
    futureTasks: sortedFutureTasks,
    reloadFutureTasks,
    addFutureTask,
    removeFutureTask,
    toggleFutureTaskCompleted,
    editFutureTask,
  };
}

