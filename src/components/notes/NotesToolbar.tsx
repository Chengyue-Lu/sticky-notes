type NotesToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  isFiltering: boolean;
};

function NotesToolbar({
  searchQuery,
  onSearchChange,
  resultCount,
  isFiltering,
}: NotesToolbarProps) {
  return (
    <section className="toolbar" aria-label="Notes toolbar">
      <label className="search-shell" htmlFor="notes-search-input">
        <input
          id="notes-search-input"
          className="search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title, content, category, or tag"
        />
      </label>
      <div className="toolbar-chip">
        {isFiltering ? `Showing ${resultCount} results` : 'Title + time view'}
      </div>
    </section>
  );
}

export default NotesToolbar;
