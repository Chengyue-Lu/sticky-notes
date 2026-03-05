import { useEffect, useState } from 'react';
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
import { isCursorInsideWindow, triggerFocusReminder } from '../lib/desktopApi';
import type { CreateNoteInput } from '../types/note';

function NotesBoard() {
  const [isPointerInsideShell, setIsPointerInsideShell] = useState(true);
  const [openComposer, setOpenComposer] = useState<'note' | 'future' | null>(
    null,
  );
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isVisualShellReady, setIsVisualShellReady] = useState(false);
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
    updateNoteSort,
  } = useAppSettings();
  const {
    futureTasks,
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
    addNote,
    editNote,
    removeNote,
  } = useNotes(settings.noteSort.field, settings.noteSort.direction);

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
    let isDisposed = false;
    let pollTimerId = 0;

    if (!settings.autoFadeWhenInactive) {
      setIsPointerInsideShell(true);
      return () => {};
    }

    const syncPointerState = async () => {
      try {
        const nextIsInside = await isCursorInsideWindow();

        if (!isDisposed) {
          setIsPointerInsideShell(nextIsInside);
        }
      } catch {
        if (!isDisposed) {
          setIsPointerInsideShell(true);
        }
      }
    };

    void syncPointerState();
    pollTimerId = window.setInterval(() => {
      void syncPointerState();
    }, 160);

    return () => {
      isDisposed = true;

      if (pollTimerId) {
        window.clearInterval(pollTimerId);
      }
    };
  }, [settings.autoFadeWhenInactive]);

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

  const isShowingNotesEmptyState = isFiltering
    ? visibleNotes.length === 0
    : notes.length === 0;

  const shellClassName = [
    'app-shell',
    settings.autoFadeWhenInactive ? 'app-shell-auto-fade' : '',
    settings.autoFadeWhenInactive && !isPointerInsideShell
      ? 'app-shell-auto-fade-inactive'
      : '',
    isVisualShellReady ? '' : 'app-shell-booting',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <main className={shellClassName}>
      <div className="app-top-drag-zone" aria-hidden="true" data-tauri-drag-region />
      <WindowOverlayControls
        settings={settings}
        onThemeChange={updateTheme}
        onUiScaleChange={updateUiScale}
        onShellOpacityChange={updateShellOpacity}
        onAlwaysOnTopChange={updateAlwaysOnTop}
        onAutoFadeWhenInactiveChange={updateAutoFadeWhenInactive}
        onNoteSortChange={updateNoteSort}
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
        <section className="workspace">
          <NotesHero
            todayActiveSeconds={todayActiveSeconds}
            totalActiveSeconds={totalActiveSeconds}
            inactiveSeconds={inactiveSeconds}
            isIdle={isIdle}
            isTrackingAvailable={isTrackingAvailable}
            onResetTodayActiveSeconds={resetTodayActiveSeconds}
            onResetTotalActiveSeconds={resetTotalActiveSeconds}
          />
          <NotesToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={visibleNotes.length}
            isFiltering={isFiltering}
          />
          <div className="board-split-layout">
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
                {/* Search mode keeps a titled section; regular mode is a single plain list with pinned notes staying on top. */}
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
                ) : (
                  notes.length > 0 ? (
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
                  )
                )}
              </div>
            </section>
            <FutureTasksPanel
              tasks={futureTasks}
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
          </div>
        </section>
      </div>
      <NotesFloatingStats
        totalItems={notes.length + futureTasks.length}
        completedFocusCount={completedFocusCount}
        focusSession={focusSession}
        onStartFocusTimer={startTimer}
        onDismissFocusTimer={dismissTimer}
      />
    </main>
  );
}

export default NotesBoard;
