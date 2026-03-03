import NotesFloatingStats from '../components/notes/NotesFloatingStats';
import NotesHero from '../components/notes/NotesHero';
import NotesEmptyState from '../components/notes/NotesEmptyState';
import NotesSection from '../components/notes/NotesSection';
import NotesToolbar from '../components/notes/NotesToolbar';
import WindowOverlayControls from '../components/notes/WindowOverlayControls';
import { useActiveTime } from '../hooks/useActiveTime';
import { useNotes } from '../hooks/useNotes';

function NotesBoard() {
  const {
    todayActiveSeconds,
    totalActiveSeconds,
    idleSeconds,
    isTrackingAvailable,
    resetTodayActiveSeconds,
    resetTotalActiveSeconds,
  } = useActiveTime();
  const {
    notes,
    visibleNotes,
    visiblePinnedNotes,
    visibleRegularNotes,
    pinnedCount,
    searchQuery,
    setSearchQuery,
    isFiltering,
  } = useNotes();

  return (
    <main className="app-shell">
      <WindowOverlayControls />
      <section className="workspace">
        <NotesHero
          todayActiveSeconds={todayActiveSeconds}
          totalActiveSeconds={totalActiveSeconds}
          idleSeconds={idleSeconds}
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
        {/* Search mode collapses the board into one result list; otherwise keep pinned and regular notes separate. */}
        {isFiltering ? (
          visibleNotes.length > 0 ? (
            <NotesSection
              title="Search Results"
              sectionId="search-results-title"
              notes={visibleNotes}
            />
          ) : (
            <NotesEmptyState
              title="No matching notes"
              description="Try a different keyword. Search currently checks title, content, category, and tags."
            />
          )
        ) : (
          <>
            <NotesSection
              title="Pinned Notes"
              sectionId="pinned-notes-title"
              notes={visiblePinnedNotes}
              pinned
            />
            <NotesSection
              title="All Notes"
              sectionId="all-notes-title"
              notes={visibleRegularNotes}
            />
          </>
        )}
      </section>
      <NotesFloatingStats totalNotes={notes.length} pinnedNotes={pinnedCount} />
    </main>
  );
}

export default NotesBoard;
