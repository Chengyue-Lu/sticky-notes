/** 文件说明：FutureTasksPanel 的任务行派生与排序逻辑。 */
import type { FutureTask } from '../../../types/futureTask';
import { formatCountdown } from './time';

type FutureTaskRow = FutureTask & {
  isOverdue: boolean;
  countdown: string;
  statusLabel: string | null;
};

export function buildFutureTaskRows(
  tasks: FutureTask[],
  nowTimestamp: number,
): FutureTaskRow[] {
  const rows = tasks.map((task) => {
    const dueTimestamp = new Date(task.dueAt).getTime();
    const isOverdue = !task.completed && dueTimestamp <= nowTimestamp;

    return {
      ...task,
      isOverdue,
      countdown: formatCountdown(task.dueAt, nowTimestamp),
      statusLabel: task.completed || isOverdue ? 'task over!' : null,
    };
  });

  rows.sort((leftTask, rightTask) => {
    if (leftTask.completed !== rightTask.completed) {
      return leftTask.completed ? 1 : -1;
    }

    if (leftTask.isOverdue !== rightTask.isOverdue) {
      return leftTask.isOverdue ? -1 : 1;
    }

    const leftTimestamp = new Date(leftTask.dueAt).getTime();
    const rightTimestamp = new Date(rightTask.dueAt).getTime();

    return leftTimestamp - rightTimestamp;
  });

  return rows;
}

