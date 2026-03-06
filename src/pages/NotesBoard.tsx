/** 文件说明：主看板页面编排层，组合 Notes/Tasks 视图与窗口交互。 */
import { useEffect, useRef, useState } from 'react';
import FutureTasksPanel from '../components/notes/FutureTasksPanel';
import FutureTaskComposer from '../components/notes/FutureTaskComposer';
import NoteComposer from '../components/notes/NoteComposer';
import NotesFloatingStats from '../components/notes/NotesFloatingStats';
import NotesHero from '../components/notes/NotesHero';
import NotesEmptyState from '../components/notes/NotesEmptyState';
import NotesSection from '../components/notes/NotesSection';
import NoteList from '../components/notes/NoteList';
import NotesToolbar from '../components/notes/NotesToolbar';
import WindowOverlayControls from '../components/notes/WindowOverlayControls';
import { useActiveTime } from '../hooks/useActiveTime';
import { useAppSettings } from '../hooks/useAppSettings';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { useFutureTasks } from '../hooks/useFutureTasks';
import { useNotes } from '../hooks/useNotes';
import {
  closeDetachedModuleWindow,
  closeWindow,
  isDetachedModuleWindowOpen,
  openDetachedModuleWindow,
  setMainWindowLayoutCompact,
  setWindowAlwaysOnTopLocal,
  triggerFocusReminder,
} from '../lib/desktopApi';
import {
  DEFAULT_NOTES_SORT_DIRECTION,
  DEFAULT_NOTES_SORT_FIELD,
  readDetachedBootPreferences,
  resolveDetachedWindowPreferencesOnMount,
  resolveDetachedModulePreferences,
  saveDetachedModulePreferences,
  toErrorMessage,
  type DetachedModuleKind,
} from './notesBoard/helpers';
import { useDetachedWindowsStateSync } from './notesBoard/useDetachedWindowsStateSync';
import { usePointerInsideShell } from './notesBoard/usePointerInsideShell';
import type { CreateNoteInput } from '../types/note';
import type { AppSettings, ThemeId } from '../types/settings';

type NotesBoardProps = {
  detachedModule: DetachedModuleKind | null;
};

function NotesBoard({ detachedModule }: NotesBoardProps) {
  const isMainWindow = detachedModule === null;
  const [openComposer, setOpenComposer] = useState<'note' | 'future' | null>(
    null,
  );
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isVisualShellReady, setIsVisualShellReady] = useState(false);
  const [isNotesDetached, setIsNotesDetached] = useState(false);
  const [isTasksDetached, setIsTasksDetached] = useState(false);
  const [detachedThemeId, setDetachedThemeId] = useState<ThemeId>(() => {
    return readDetachedBootPreferences(detachedModule)?.themeId ?? 'white';
  });
  const [detachedAlwaysOnTop, setDetachedAlwaysOnTop] = useState<boolean>(() => {
    return readDetachedBootPreferences(detachedModule)?.alwaysOnTop ?? false;
  });
  const wasCompactLayoutRef = useRef<boolean | null>(null);
  const detachToggleLockRef = useRef<Record<DetachedModuleKind, boolean>>({
    notes: false,
    tasks: false,
  });
  const {
    session: focusSession,
    completedCount: completedFocusCount,
    startTimer,
    dismissTimer,
  } = useFocusTimer();
  const {
    settings,
    updateTheme,
    updateUiScale,
    updateShellOpacity,
    updateAlwaysOnTop,
    updateAutoFadeWhenInactive,
  } = useAppSettings();
  const isPointerInsideShell = usePointerInsideShell(settings.autoFadeWhenInactive);
  const {
    futureTasks,
    reloadFutureTasks,
    addFutureTask,
    removeFutureTask,
    toggleFutureTaskCompleted,
    editFutureTask,
  } = useFutureTasks();
  const {
    todayActiveSeconds,
    totalActiveSeconds,
    inactiveSeconds,
    isIdle,
    isTrackingAvailable,
    resetTodayActiveSeconds,
    resetTotalActiveSeconds,
  } = useActiveTime();
  const {
    notes,
    visibleNotes,
    searchQuery,
    setSearchQuery,
    isFiltering,
    reloadNotes,
    addNote,
    editNote,
    removeNote,
  } = useNotes(DEFAULT_NOTES_SORT_FIELD, DEFAULT_NOTES_SORT_DIRECTION);

  const showNotesPanel =
    detachedModule === 'notes' || (isMainWindow && !isNotesDetached);
  const showTasksPanel =
    detachedModule === 'tasks' || (isMainWindow && !isTasksDetached);
  const shouldShowSearchToolbar = showNotesPanel;
  const isMainCompactLayout =
    isMainWindow && !showNotesPanel && !showTasksPanel;
  const notesPanelIsDetached = detachedModule === 'notes';
  const tasksPanelIsDetached = detachedModule === 'tasks';

  useDetachedWindowsStateSync({
    isMainWindow,
    isNotesDetached,
    isTasksDetached,
    setIsNotesDetached,
    setIsTasksDetached,
    reloadNotes,
    reloadFutureTasks,
  });

  useEffect(() => {
    let isCancelled = false;
    let revealTimerId = 0;

    const frameId = window.requestAnimationFrame(() => {
      revealTimerId = window.setTimeout(() => {
        if (!isCancelled) {
          setIsVisualShellReady(true);
        }
      }, 120);
    });

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(frameId);

      if (revealTimerId) {
        window.clearTimeout(revealTimerId);
      }
    };
  }, []);

  useEffect(() => {
    const reminderTitle =
      focusSession?.phase === 'alerting' ? focusSession.content : null;

    if (!reminderTitle) {
      return;
    }

    let isDisposed = false;

    const runReminderTrigger = async () => {
      try {
        await triggerFocusReminder(reminderTitle);
      } finally {
        if (!isDisposed) {
          dismissTimer();
        }
      }
    };

    void runReminderTrigger();

    return () => {
      isDisposed = true;
    };
  }, [focusSession, dismissTimer]);

  useEffect(() => {
    if (openComposer === 'note' && !showNotesPanel) {
      setOpenComposer(null);
      return;
    }

    if (openComposer === 'future' && !showTasksPanel) {
      setOpenComposer(null);
    }
  }, [openComposer, showNotesPanel, showTasksPanel]);

  useEffect(() => {
    if (isMainWindow || !detachedModule) {
      return;
    }

    const { themeId, alwaysOnTop } = resolveDetachedWindowPreferencesOnMount(
      detachedModule,
      settings,
    );

    setDetachedThemeId(themeId);
    setDetachedAlwaysOnTop(alwaysOnTop);
  }, [detachedModule, isMainWindow, settings.alwaysOnTop, settings.themeId]);

  useEffect(() => {
    if (isMainWindow) {
      return;
    }

    document.documentElement.dataset.theme = detachedThemeId;
  }, [detachedThemeId, isMainWindow]);

  useEffect(() => {
    if (isMainWindow || !detachedModule) {
      return;
    }

    void setWindowAlwaysOnTopLocal(detachedAlwaysOnTop).then((appliedValue) => {
      setDetachedAlwaysOnTop((currentValue) =>
        currentValue === appliedValue ? currentValue : appliedValue,
      );
    }).catch(() => {});
  }, [detachedAlwaysOnTop, detachedModule, isMainWindow]);

  useEffect(() => {
    if (isMainWindow || !detachedModule) {
      return;
    }

    saveDetachedModulePreferences(detachedModule, {
      themeId: detachedThemeId,
      alwaysOnTop: detachedAlwaysOnTop,
    });
  }, [detachedAlwaysOnTop, detachedModule, detachedThemeId, isMainWindow]);

  useEffect(() => {
    if (!isMainWindow) {
      return;
    }

    const shouldUseCompactLayout = !showNotesPanel && !showTasksPanel;

    if (wasCompactLayoutRef.current === shouldUseCompactLayout) {
      return;
    }

    wasCompactLayoutRef.current = shouldUseCompactLayout;

    void setMainWindowLayoutCompact(shouldUseCompactLayout).catch((error) => {
      console.error('StickyDesk: failed to apply main window layout mode.', error);
    });
  }, [isMainWindow, showNotesPanel, showTasksPanel]);

  async function handleCreateNote(input: CreateNoteInput) {
    await addNote(input);
    setSearchQuery('');
    setOpenComposer(null);
  }

  async function handleCreateFutureTask(input: {
    title: string;
    dueAt: string;
  }) {
    await addFutureTask(input);
    setOpenComposer(null);
  }

  async function handleDeleteNote(id: string) {
    const wasDeleted = await removeNote(id);

    if (wasDeleted && expandedNoteId === id) {
      setExpandedNoteId(null);
    }

    return wasDeleted;
  }

  function handleToggleExpand(id: string) {
    setExpandedNoteId((currentValue) => (currentValue === id ? null : id));
  }

  async function attachDetachedModule(moduleKind: DetachedModuleKind) {
    await closeDetachedModuleWindow(moduleKind);

    if (moduleKind === 'notes') {
      setIsNotesDetached(false);
    } else {
      setIsTasksDetached(false);
    }
  }

  async function toggleDetachedModule(moduleKind: DetachedModuleKind) {
    if (detachToggleLockRef.current[moduleKind]) {
      return;
    }

    detachToggleLockRef.current[moduleKind] = true;
    const isDetached = await isDetachedModuleWindowOpen(moduleKind);

    try {
      if (isDetached) {
        await attachDetachedModule(moduleKind);
      } else {
        const detachedPreferences = resolveDetachedModulePreferences(
          moduleKind,
          settings,
        );
        await openDetachedModuleWindow(moduleKind, {
          themeId: detachedPreferences.themeId,
          alwaysOnTop: detachedPreferences.alwaysOnTop,
        });

        if (moduleKind === 'notes') {
          setIsNotesDetached(true);
        } else {
          setIsTasksDetached(true);
        }
      }
    } catch (error) {
      const message = toErrorMessage(
        error,
        `Failed to toggle ${moduleKind} detached window.`,
      );
      window.alert(message);
    } finally {
      const [notesResult, tasksResult] = await Promise.allSettled([
        isDetachedModuleWindowOpen('notes'),
        isDetachedModuleWindowOpen('tasks'),
      ]);

      if (notesResult.status === 'fulfilled') {
        setIsNotesDetached(notesResult.value);
      }

      if (tasksResult.status === 'fulfilled') {
        setIsTasksDetached(tasksResult.value);
      }

      detachToggleLockRef.current[moduleKind] = false;
    }
  }

  async function handleToggleBothDetached() {
    if (detachToggleLockRef.current.notes || detachToggleLockRef.current.tasks) {
      return;
    }

    detachToggleLockRef.current.notes = true;
    detachToggleLockRef.current.tasks = true;

    const [notesResult, tasksResult] = await Promise.allSettled([
      isDetachedModuleWindowOpen('notes'),
      isDetachedModuleWindowOpen('tasks'),
    ]);
    let nextNotesDetached =
      notesResult.status === 'fulfilled' ? notesResult.value : isNotesDetached;
    let nextTasksDetached =
      tasksResult.status === 'fulfilled' ? tasksResult.value : isTasksDetached;
    const shouldAttachBoth = nextNotesDetached && nextTasksDetached;

    try {
      if (shouldAttachBoth) {
        if (nextNotesDetached) {
          await closeDetachedModuleWindow('notes');
          nextNotesDetached = false;
        }

        if (nextTasksDetached) {
          await closeDetachedModuleWindow('tasks');
          nextTasksDetached = false;
        }
      } else {
        if (!nextNotesDetached) {
          const notesPreferences = resolveDetachedModulePreferences('notes', settings);
          await openDetachedModuleWindow('notes', {
            themeId: notesPreferences.themeId,
            alwaysOnTop: notesPreferences.alwaysOnTop,
          });
          nextNotesDetached = true;
        }

        if (!nextTasksDetached) {
          const tasksPreferences = resolveDetachedModulePreferences('tasks', settings);
          await openDetachedModuleWindow('tasks', {
            themeId: tasksPreferences.themeId,
            alwaysOnTop: tasksPreferences.alwaysOnTop,
          });
          nextTasksDetached = true;
        }
      }
    } catch (error) {
      const message = toErrorMessage(error, 'Failed to toggle both modules.');
      window.alert(message);
    } finally {
      const [finalNotesResult, finalTasksResult] = await Promise.allSettled([
        isDetachedModuleWindowOpen('notes'),
        isDetachedModuleWindowOpen('tasks'),
      ]);

      if (finalNotesResult.status === 'fulfilled') {
        setIsNotesDetached(finalNotesResult.value);
      } else {
        setIsNotesDetached(nextNotesDetached);
      }

      if (finalTasksResult.status === 'fulfilled') {
        setIsTasksDetached(finalTasksResult.value);
      } else {
        setIsTasksDetached(nextTasksDetached);
      }

      detachToggleLockRef.current.notes = false;
      detachToggleLockRef.current.tasks = false;
    }
  }

  const isShowingNotesEmptyState = isFiltering
    ? visibleNotes.length === 0
    : notes.length === 0;

  const shellClassName = [
    'app-shell',
    isMainWindow ? '' : 'app-shell-module',
    settings.autoFadeWhenInactive ? 'app-shell-auto-fade' : '',
    settings.autoFadeWhenInactive && !isPointerInsideShell
      ? 'app-shell-auto-fade-inactive'
      : '',
    isVisualShellReady ? '' : 'app-shell-booting',
  ]
    .filter(Boolean)
    .join(' ');

  const workspaceClassName = [
    'workspace',
    isMainWindow
      ? shouldShowSearchToolbar
        ? ''
        : 'workspace-no-toolbar'
      : detachedModule === 'notes'
        ? 'workspace-module-notes'
        : 'workspace-module-tasks',
    isMainCompactLayout ? 'workspace-compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const boardClassName =
    showNotesPanel && showTasksPanel
      ? 'board-split-layout'
      : 'board-split-layout board-split-layout-single';

  const overlaySettings: AppSettings = isMainWindow
    ? settings
    : {
        ...settings,
        themeId: detachedThemeId,
        alwaysOnTop: detachedAlwaysOnTop,
      };

  const handleOverlayThemeChange = async (themeId: ThemeId) => {
    if (isMainWindow) {
      await updateTheme(themeId);
      return;
    }

    if (!detachedModule) {
      return;
    }

    setDetachedThemeId(themeId);
    saveDetachedModulePreferences(detachedModule, {
      themeId,
      alwaysOnTop: detachedAlwaysOnTop,
    });
  };

  const handleOverlayAlwaysOnTopChange = async (value: boolean) => {
    if (isMainWindow) {
      return updateAlwaysOnTop(value);
    }

    if (!detachedModule) {
      return value;
    }

    setDetachedAlwaysOnTop(value);
    saveDetachedModulePreferences(detachedModule, {
      themeId: detachedThemeId,
      alwaysOnTop: value,
    });

    return value;
  };

  const handleOverlayUiScaleChange = async (value: number) => {
    if (!isMainWindow) {
      return;
    }

    await updateUiScale(value);
  };

  const handleOverlayShellOpacityChange = async (value: number) => {
    if (!isMainWindow) {
      return;
    }

    await updateShellOpacity(value);
  };

  const handleOverlayAutoFadeChange = async (value: boolean) => {
    if (!isMainWindow) {
      return;
    }

    await updateAutoFadeWhenInactive(value);
  };

  return (
    <main className={shellClassName}>
      <div className="app-top-drag-zone" aria-hidden="true" data-tauri-drag-region />
      <WindowOverlayControls
        mode={isMainWindow ? 'main' : 'module'}
        settings={overlaySettings}
        showDetachControls={isMainWindow}
        isNotesDetached={isNotesDetached}
        isTasksDetached={isTasksDetached}
        onToggleNotesDetached={() => {
          void toggleDetachedModule('notes');
        }}
        onToggleTasksDetached={() => {
          void toggleDetachedModule('tasks');
        }}
        onToggleBothDetached={() => {
          void handleToggleBothDetached();
        }}
        onThemeChange={handleOverlayThemeChange}
        onUiScaleChange={handleOverlayUiScaleChange}
        onShellOpacityChange={handleOverlayShellOpacityChange}
        onAlwaysOnTopChange={handleOverlayAlwaysOnTopChange}
        onAutoFadeWhenInactiveChange={handleOverlayAutoFadeChange}
      />
      {openComposer ? (
        <div
          className="composer-backdrop"
          onClick={() => {
            setOpenComposer(null);
          }}
        >
          <div
            className="composer-dialog"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {openComposer === 'note' ? (
              <NoteComposer
                onCreate={handleCreateNote}
                onCancel={() => setOpenComposer(null)}
              />
            ) : (
              <FutureTaskComposer
                onCreate={handleCreateFutureTask}
                onCancel={() => setOpenComposer(null)}
              />
            )}
          </div>
        </div>
      ) : null}
      <div className="app-scroll-region">
        <section className={workspaceClassName}>
          {isMainWindow ? (
            <NotesHero
              todayActiveSeconds={todayActiveSeconds}
              totalActiveSeconds={totalActiveSeconds}
              inactiveSeconds={inactiveSeconds}
              isIdle={isIdle}
              isTrackingAvailable={isTrackingAvailable}
              onResetTodayActiveSeconds={resetTodayActiveSeconds}
              onResetTotalActiveSeconds={resetTotalActiveSeconds}
            />
          ) : null}
          {shouldShowSearchToolbar ? (
            <NotesToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              resultCount={visibleNotes.length}
              isFiltering={isFiltering}
            />
          ) : null}
          {showNotesPanel || showTasksPanel ? (
            <div className={boardClassName}>
              {showNotesPanel ? (
                <section className="notes-pane" aria-label="Notes panel">
                  <div className="notes-pane-head">
                    <div className="notes-pane-head-copy">
                      <h2 id="notes-pane-title">Notes</h2>
                      <p>Fast capture and quick editing</p>
                    </div>
                    <div className="notes-pane-head-actions">
                      <span className="section-count">{notes.length}</span>
                      <button
                        type="button"
                        className={
                          notesPanelIsDetached
                            ? 'future-task-create-button future-task-create-button-active future-task-create-button-combine'
                            : 'future-task-create-button'
                        }
                        aria-label={
                          notesPanelIsDetached
                            ? 'Combine notes module'
                            : 'Split notes module'
                        }
                        onClick={() => {
                          if (isMainWindow) {
                            void toggleDetachedModule('notes');
                            return;
                          }

                          void closeWindow().catch((error) => {
                            window.alert(
                              toErrorMessage(
                                error,
                                'Failed to combine notes module.',
                              ),
                            );
                          });
                        }}
                      >
                        <span className="future-task-create-glyph" aria-hidden="true">
                          {notesPanelIsDetached ? 'C' : 'S'}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={
                          openComposer === 'note'
                            ? 'future-task-create-button future-task-create-button-active'
                            : 'future-task-create-button'
                        }
                        aria-label={
                          openComposer === 'note'
                            ? 'Close note composer'
                            : 'Create a new note'
                        }
                        onClick={() => {
                          setOpenComposer((currentValue) =>
                            currentValue === 'note' ? null : 'note',
                          );
                        }}
                      >
                        <span className="future-task-create-glyph" aria-hidden="true">
                          {openComposer === 'note' ? 'x' : '+'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div
                    className={
                      isShowingNotesEmptyState
                        ? 'notes-pane-scroll notes-pane-scroll-empty'
                        : 'notes-pane-scroll'
                    }
                  >
                    {isFiltering ? (
                      visibleNotes.length > 0 ? (
                        <NotesSection
                          title="Search Results"
                          sectionId="search-results-title"
                          notes={visibleNotes}
                          expandedNoteId={expandedNoteId}
                          onToggleExpand={handleToggleExpand}
                          onDelete={handleDeleteNote}
                          onUpdate={editNote}
                        />
                      ) : (
                        <NotesEmptyState
                          title="No matching notes"
                          description="Try a different keyword. Search currently checks title, content, and tags."
                        />
                      )
                    ) : notes.length > 0 ? (
                      <NoteList
                        notes={visibleNotes}
                        expandedNoteId={expandedNoteId}
                        onToggleExpand={handleToggleExpand}
                        onDelete={handleDeleteNote}
                        onUpdate={editNote}
                      />
                    ) : (
                      <NotesEmptyState
                        title="No notes yet"
                        description="Create one and it will appear here."
                      />
                    )}
                  </div>
                </section>
              ) : null}
              {showTasksPanel ? (
                <FutureTasksPanel
                  tasks={futureTasks}
                  isDetached={tasksPanelIsDetached}
                  onToggleDetached={() => {
                    if (isMainWindow) {
                      void toggleDetachedModule('tasks');
                      return;
                    }

                    void closeWindow().catch((error) => {
                      window.alert(
                        toErrorMessage(error, 'Failed to combine tasks module.'),
                      );
                    });
                  }}
                  isComposerOpen={openComposer === 'future'}
                  onToggleComposer={() => {
                    setOpenComposer((currentValue) =>
                      currentValue === 'future' ? null : 'future',
                    );
                  }}
                  onDelete={removeFutureTask}
                  onToggleCompleted={toggleFutureTaskCompleted}
                  onUpdate={editFutureTask}
                />
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
      {isMainWindow ? (
        <NotesFloatingStats
          totalItems={notes.length + futureTasks.length}
          completedFocusCount={completedFocusCount}
          focusSession={focusSession}
          onStartFocusTimer={startTimer}
          onDismissFocusTimer={dismissTimer}
        />
      ) : null}
    </main>
  );
}

export default NotesBoard;

