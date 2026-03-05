import { useEffect, useMemo, useState } from 'react';
import type { FutureTask, UpdateFutureTaskInput } from '../../types/futureTask';

const DELETE_CONFIRM_TIMEOUT_MS = 2200;

type FutureTasksPanelProps = {
  tasks: FutureTask[];
  isComposerOpen: boolean;
  onToggleComposer: () => void;
  onDelete: (id: string) => Promise<boolean>;
  onToggleCompleted: (id: string, completed: boolean) => Promise<FutureTask | null>;
  onUpdate: (id: string, input: UpdateFutureTaskInput) => Promise<FutureTask | null>;
};

function formatCountdown(dueAt: string, nowTimestamp: number): string {
  const deltaMs = new Date(dueAt).getTime() - nowTimestamp;

  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return 'Due now';
  }

  const totalSeconds = Math.floor(deltaMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

function padTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateTimeInputValue(value: string): string {
  const parsedTimestamp = new Date(value).getTime();
  const date = Number.isFinite(parsedTimestamp)
    ? new Date(parsedTimestamp)
    : new Date(Date.now() + 60 * 60 * 1000);

  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(
    date.getDate(),
  )}T${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
}

function formatAbsoluteDueAt(value: string): string {
  const parsedTimestamp = new Date(value).getTime();

  if (!Number.isFinite(parsedTimestamp)) {
    return 'Invalid due time';
  }

  return new Date(parsedTimestamp).toLocaleString();
}

function FutureTasksPanel({
  tasks,
  isComposerOpen,
  onToggleComposer,
  onDelete,
  onToggleCompleted,
  onUpdate,
}: FutureTasksPanelProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [removingTaskId, setRemovingTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTitleTaskId, setEditingTitleTaskId] = useState<string | null>(
    null,
  );
  const [editingDueTaskId, setEditingDueTaskId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [dueAtDraft, setDueAtDraft] = useState('');
  const [actionError, setActionError] = useState<{
    taskId: string;
    message: string;
  } | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    if (!confirmingDeleteId) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setConfirmingDeleteId((currentValue) =>
        currentValue === confirmingDeleteId ? null : currentValue,
      );
    }, DELETE_CONFIRM_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [confirmingDeleteId]);

  useEffect(() => {
    if (
      confirmingDeleteId &&
      !tasks.some((task) => task.id === confirmingDeleteId)
    ) {
      setConfirmingDeleteId(null);
    }
  }, [confirmingDeleteId, tasks]);

  useEffect(() => {
    if (!expandedTaskId) {
      return;
    }

    const expandedTask = tasks.find((task) => task.id === expandedTaskId);

    if (!expandedTask) {
      setExpandedTaskId(null);
      setEditingTitleTaskId(null);
      setEditingDueTaskId(null);
      setActionError(null);
      return;
    }

    if (editingTitleTaskId !== expandedTaskId) {
      setTitleDraft(expandedTask.title);
    }

    if (editingDueTaskId !== expandedTaskId) {
      setDueAtDraft(toDateTimeInputValue(expandedTask.dueAt));
    }
  }, [expandedTaskId, editingDueTaskId, editingTitleTaskId, tasks]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  async function handleDeleteTask(id: string) {
    if (removingTaskId === id) {
      return;
    }

    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }

    setRemovingTaskId(id);
    setConfirmingDeleteId(null);

    try {
      await onDelete(id);

      if (expandedTaskId === id) {
        setExpandedTaskId(null);
        setEditingTitleTaskId(null);
        setEditingDueTaskId(null);
        setActionError(null);
      }
    } catch (error) {
      console.error('StickyDesk: failed to delete future task.', error);
    } finally {
      setRemovingTaskId(null);
    }
  }

  const taskRows = useMemo(
    () => {
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
    },
    [nowTimestamp, tasks],
  );

  function handleToggleExpand(task: FutureTask) {
    setConfirmingDeleteId(null);
    setActionError(null);

    if (expandedTaskId === task.id) {
      setEditingTitleTaskId(null);
      setEditingDueTaskId(null);
      setExpandedTaskId(null);
      return;
    }

    setEditingTitleTaskId(null);
    setEditingDueTaskId(null);
    setTitleDraft(task.title);
    setDueAtDraft(toDateTimeInputValue(task.dueAt));
    setExpandedTaskId(task.id);
  }

  function beginTitleEdit(task: FutureTask) {
    setActionError(null);
    setConfirmingDeleteId(null);
    setEditingTitleTaskId(task.id);
    setEditingDueTaskId(null);
    setTitleDraft(task.title);
  }

  function beginDueEdit(task: FutureTask) {
    setActionError(null);
    setConfirmingDeleteId(null);
    setEditingTitleTaskId(null);
    setEditingDueTaskId(task.id);
    setDueAtDraft(toDateTimeInputValue(task.dueAt));
  }

  async function handleToggleTaskCompleted(
    id: string,
    completed: boolean,
  ) {
    if (updatingTaskId === id) {
      return;
    }

    setUpdatingTaskId(id);

    try {
      await onToggleCompleted(id, completed);
    } catch (error) {
      console.error('StickyDesk: failed to update future task status.', error);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleSaveTaskTitle(task: FutureTask) {
    const cleanTitle = titleDraft.trim();

    if (!cleanTitle) {
      setActionError({
        taskId: task.id,
        message: 'Task title cannot be empty.',
      });
      return;
    }

    if (cleanTitle === task.title.trim()) {
      setEditingTitleTaskId(null);
      setTitleDraft(task.title);
      return;
    }

    setActionError(null);
    setSavingTaskId(task.id);

    try {
      const nextTask = await onUpdate(task.id, { title: cleanTitle });

      if (!nextTask) {
        setActionError({
          taskId: task.id,
          message: 'Failed to save task title.',
        });
        return;
      }

      setEditingTitleTaskId(null);
      setTitleDraft(nextTask.title);
    } catch (error) {
      console.error('StickyDesk: failed to update future task title.', error);
      setActionError({
        taskId: task.id,
        message: 'Failed to save task title.',
      });
    } finally {
      setSavingTaskId(null);
    }
  }

  async function handleSaveTaskDueAt(task: FutureTask) {
    const dueTimestamp = new Date(dueAtDraft).getTime();

    if (!Number.isFinite(dueTimestamp)) {
      setActionError({
        taskId: task.id,
        message: 'Choose a valid due time.',
      });
      return;
    }

    setActionError(null);
    setSavingTaskId(task.id);

    try {
      const nextTask = await onUpdate(task.id, { dueAt: dueAtDraft });

      if (!nextTask) {
        setActionError({
          taskId: task.id,
          message: 'Failed to save due time.',
        });
        return;
      }

      setEditingDueTaskId(null);
      setDueAtDraft(toDateTimeInputValue(nextTask.dueAt));
    } catch (error) {
      console.error('StickyDesk: failed to update future task due time.', error);
      setActionError({
        taskId: task.id,
        message: 'Failed to save due time.',
      });
    } finally {
      setSavingTaskId(null);
    }
  }

  return (
    <section className="future-tasks-pane" aria-labelledby="future-tasks-title">
      <div className="future-tasks-head">
        <div className="future-tasks-head-copy">
          <h2 id="future-tasks-title">Future Tasks</h2>
          <p>Independent long-range countdown list</p>
        </div>
        <div className="future-tasks-head-actions">
          <span className="section-count">{tasks.length}</span>
          <button
            type="button"
            className={
              isComposerOpen
                ? 'future-task-create-button future-task-create-button-active'
                : 'future-task-create-button'
            }
            aria-label={
              isComposerOpen ? 'Close future task composer' : 'Create future task'
            }
            onClick={onToggleComposer}
          >
            <span className="future-task-create-glyph" aria-hidden="true">
              {isComposerOpen ? 'x' : '+'}
            </span>
          </button>
        </div>
      </div>
      <div className="future-tasks-scroll" role="list" aria-label="Future task list">
        {taskRows.length > 0 ? (
          <div className="future-tasks-grid">
            {taskRows.map((task) => (
              <article
                key={task.id}
                className={
                  task.completed
                    ? 'future-task-row future-task-row-completed'
                    : task.isOverdue
                      ? 'future-task-row future-task-row-overdue'
                      : 'future-task-row'
                }
                role="listitem"
              >
                <div className="future-task-head">
                  <div className="future-task-copy">
                    <button
                      type="button"
                      className="future-task-title-button"
                      onClick={() => {
                        handleToggleExpand(task);
                      }}
                    >
                      <strong className="future-task-title">{task.title}</strong>
                    </button>
                    <span className="future-task-time">
                      {task.statusLabel ?? task.countdown}
                    </span>
                  </div>
                  <div className="future-task-actions">
                    <button
                      type="button"
                      className={
                        task.completed
                          ? 'future-task-complete-button future-task-complete-button-undo'
                          : 'future-task-complete-button'
                      }
                      aria-label={
                        task.completed
                          ? `Undo completion for ${task.title}`
                          : `Mark ${task.title} as completed`
                      }
                      onClick={() => {
                        void handleToggleTaskCompleted(task.id, !task.completed);
                      }}
                      disabled={
                        updatingTaskId === task.id ||
                        removingTaskId === task.id ||
                        savingTaskId === task.id
                      }
                    >
                      {updatingTaskId === task.id ? (
                        '...'
                      ) : task.completed ? (
                        <span className="future-task-complete-glyph" aria-hidden="true">
                          &#8634;
                        </span>
                      ) : (
                        <span className="future-task-complete-glyph" aria-hidden="true">
                          &#10003;
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={
                        confirmingDeleteId === task.id
                          ? 'future-task-remove future-task-remove-confirm'
                          : 'future-task-remove'
                      }
                      aria-label={
                        confirmingDeleteId === task.id
                          ? `Confirm remove ${task.title}`
                          : `Remove ${task.title}`
                      }
                      onClick={() => {
                        void handleDeleteTask(task.id);
                      }}
                      disabled={
                        removingTaskId === task.id ||
                        updatingTaskId === task.id ||
                        savingTaskId === task.id
                      }
                    >
                      {removingTaskId === task.id ? (
                        '...'
                      ) : confirmingDeleteId === task.id ? (
                        '!'
                      ) : (
                        <span className="future-task-remove-glyph" aria-hidden="true">
                          &#128465;
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                <div
                  className={
                    expandedTaskId === task.id
                      ? 'future-task-expanded-shell future-task-expanded-shell-open'
                      : 'future-task-expanded-shell'
                  }
                  aria-hidden={expandedTaskId !== task.id}
                >
                  <div className="future-task-expanded-clip">
                    <div className="future-task-expanded-body">
                      <section className="future-task-detail-block">
                        <div className="future-task-detail-head">
                          <span className="future-task-detail-label">Title</span>
                          {editingTitleTaskId === task.id ? null : (
                            <button
                              type="button"
                              className="future-task-detail-link"
                              onClick={() => {
                                beginTitleEdit(task);
                              }}
                              disabled={savingTaskId === task.id}
                            >
                              Rename
                            </button>
                          )}
                        </div>
                        {editingTitleTaskId === task.id ? (
                          <div className="future-task-editor-shell">
                            <input
                              className="future-task-editor-input"
                              type="text"
                              value={titleDraft}
                              onChange={(event) => setTitleDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  setTitleDraft(task.title);
                                  setEditingTitleTaskId(null);
                                  return;
                                }

                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void handleSaveTaskTitle(task);
                                }
                              }}
                              disabled={savingTaskId === task.id}
                              autoFocus
                            />
                            <div className="future-task-editor-actions">
                              <button
                                type="button"
                                className="future-task-editor-secondary"
                                onClick={() => {
                                  setTitleDraft(task.title);
                                  setEditingTitleTaskId(null);
                                }}
                                disabled={savingTaskId === task.id}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="future-task-editor-primary"
                                onClick={() => {
                                  void handleSaveTaskTitle(task);
                                }}
                                disabled={savingTaskId === task.id}
                              >
                                {savingTaskId === task.id ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="future-task-detail-surface"
                            onClick={() => {
                              beginTitleEdit(task);
                            }}
                          >
                            {task.title}
                          </button>
                        )}
                      </section>
                      <section className="future-task-detail-block">
                        <div className="future-task-detail-head">
                          <span className="future-task-detail-label">Due</span>
                          {editingDueTaskId === task.id ? null : (
                            <button
                              type="button"
                              className="future-task-detail-link"
                              onClick={() => {
                                beginDueEdit(task);
                              }}
                              disabled={savingTaskId === task.id}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        {editingDueTaskId === task.id ? (
                          <div className="future-task-editor-shell">
                            <input
                              className="future-task-editor-input"
                              type="datetime-local"
                              value={dueAtDraft}
                              onChange={(event) => setDueAtDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  setDueAtDraft(toDateTimeInputValue(task.dueAt));
                                  setEditingDueTaskId(null);
                                  return;
                                }

                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void handleSaveTaskDueAt(task);
                                }
                              }}
                              disabled={savingTaskId === task.id}
                              autoFocus
                            />
                            <div className="future-task-editor-actions">
                              <button
                                type="button"
                                className="future-task-editor-secondary"
                                onClick={() => {
                                  setDueAtDraft(toDateTimeInputValue(task.dueAt));
                                  setEditingDueTaskId(null);
                                }}
                                disabled={savingTaskId === task.id}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="future-task-editor-primary"
                                onClick={() => {
                                  void handleSaveTaskDueAt(task);
                                }}
                                disabled={savingTaskId === task.id}
                              >
                                {savingTaskId === task.id ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="future-task-detail-surface"
                            onClick={() => {
                              beginDueEdit(task);
                            }}
                          >
                            {formatAbsoluteDueAt(task.dueAt)}
                          </button>
                        )}
                      </section>
                      {actionError?.taskId === task.id ? (
                        <p className="future-task-action-error" role="alert">
                          {actionError.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="future-tasks-empty">
            <p>No future tasks yet</p>
            <span>Add one and it will count down here.</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default FutureTasksPanel;
