import { useEffect, useState } from 'react';
import type { Note, UpdateNoteInput } from '../../types/note';
import {
  formatNoteTimestampForAbsoluteLabel,
  formatNoteTimestampForDisplay,
} from '../../lib/noteTime';

type NoteCardProps = {
  note: Note;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, input: UpdateNoteInput) => Promise<Note | null>;
};

function NoteCard({
  note,
  isExpanded,
  onToggleExpand,
  onDelete,
  onUpdate,
}: NoteCardProps) {
  const [titleDraft, setTitleDraft] = useState(note.title);
  const [contentDraft, setContentDraft] = useState(note.content);
  const [tagsDraft, setTagsDraft] = useState(note.tags.join(', '));
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const displayTime = formatNoteTimestampForDisplay(note.updatedAt);
  const absoluteTime = formatNoteTimestampForAbsoluteLabel(note.updatedAt);

  useEffect(() => {
    setTitleDraft(note.title);
    setContentDraft(note.content);
    setTagsDraft(note.tags.join(', '));
  }, [note.title, note.content, note.tags]);

  useEffect(() => {
    if (!isExpanded) {
      resetTransientState();
    }
  }, [isExpanded, note.title, note.content, note.tags]);

  useEffect(() => {
    if (!isDeleteConfirming) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsDeleteConfirming(false);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isDeleteConfirming]);

  function resetTransientState() {
    setIsEditingTitle(false);
    setIsEditingContent(false);
    setIsEditingTags(false);
    setIsDeleteConfirming(false);
    setTitleDraft(note.title);
    setContentDraft(note.content);
    setTagsDraft(note.tags.join(', '));
    setActionError(null);
  }

  function beginTitleEdit() {
    setActionError(null);
    setIsDeleteConfirming(false);
    setIsEditingTitle(true);
    setIsEditingContent(false);
    setIsEditingTags(false);
  }

  function beginContentEdit() {
    setActionError(null);
    setIsDeleteConfirming(false);
    setIsEditingTitle(false);
    setIsEditingContent(true);
    setIsEditingTags(false);
  }

  function beginTagsEdit() {
    setActionError(null);
    setIsDeleteConfirming(false);
    setIsEditingTitle(false);
    setIsEditingContent(false);
    setIsEditingTags(true);
  }

  async function handleSaveTitle() {
    if (titleDraft.trim() === note.title.trim()) {
      setIsEditingTitle(false);
      setTitleDraft(note.title);
      return;
    }

    setActionError(null);
    setIsSavingTitle(true);

    try {
      const nextNote = await onUpdate(note.id, { title: titleDraft });

      if (!nextNote) {
        setActionError('Failed to save title.');
        return;
      }

      setIsEditingTitle(false);
    } catch (error) {
      console.error('StickyDesk: failed to update note title.', error);
      setActionError('Failed to save title.');
    } finally {
      setIsSavingTitle(false);
    }
  }

  async function handleSaveContent() {
    if (contentDraft === note.content) {
      setIsEditingContent(false);
      return;
    }

    setActionError(null);
    setIsSavingContent(true);

    try {
      const nextNote = await onUpdate(note.id, { content: contentDraft });

      if (!nextNote) {
        setActionError('Failed to save content.');
        return;
      }

      setIsEditingContent(false);
    } catch (error) {
      console.error('StickyDesk: failed to update note content.', error);
      setActionError('Failed to save content.');
    } finally {
      setIsSavingContent(false);
    }
  }

  async function handleSaveTags() {
    const nextTags = tagsDraft
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (nextTags.join('|') === note.tags.join('|')) {
      setIsEditingTags(false);
      return;
    }

    setActionError(null);
    setIsSavingTags(true);

    try {
      const nextNote = await onUpdate(note.id, { tags: nextTags });

      if (!nextNote) {
        setActionError('Failed to save tags.');
        return;
      }

      setIsEditingTags(false);
    } catch (error) {
      console.error('StickyDesk: failed to update note tags.', error);
      setActionError('Failed to save tags.');
    } finally {
      setIsSavingTags(false);
    }
  }

  async function handleConfirmedDelete() {
    setActionError(null);
    setIsDeleting(true);

    try {
      const wasDeleted = await onDelete(note.id);

      if (!wasDeleted) {
        setActionError('Failed to delete note.');
      }
    } catch (error) {
      console.error('StickyDesk: failed to delete note.', error);
      setActionError('Failed to delete note.');
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirming(false);
    }
  }

  function handleDeleteIntent() {
    if (isDeleting) {
      return;
    }

    setActionError(null);

    if (!isDeleteConfirming) {
      setIsDeleteConfirming(true);
      return;
    }

    void handleConfirmedDelete();
  }

  async function handleTogglePinned() {
    setActionError(null);
    setIsDeleteConfirming(false);
    setIsSavingPin(true);

    try {
      const nextNote = await onUpdate(note.id, { pinned: !note.pinned });

      if (!nextNote) {
        setActionError('Failed to update pin state.');
      }
    } catch (error) {
      console.error('StickyDesk: failed to update note pin state.', error);
      setActionError('Failed to update pin state.');
    } finally {
      setIsSavingPin(false);
    }
  }

  async function handleRemoveTag(tagIndex: number) {
    const nextTags = note.tags.filter((_, index) => index !== tagIndex);

    setActionError(null);
    setIsDeleteConfirming(false);

    try {
      const nextNote = await onUpdate(note.id, { tags: nextTags });

      if (!nextNote) {
        setActionError('Failed to remove tag.');
      }
    } catch (error) {
      console.error('StickyDesk: failed to remove note tag.', error);
      setActionError('Failed to remove tag.');
    }
  }

  return (
    <article
      className={
        note.pinned
          ? isExpanded
            ? 'note-card note-card-pinned note-card-expanded'
            : 'note-card note-card-pinned'
          : isExpanded
            ? 'note-card note-card-expanded'
            : 'note-card'
      }
      aria-label={`${note.title}, updated ${absoluteTime}`}
    >
      <div className="note-card-head">
        <div className="note-title-stack">
          {isEditingTitle ? (
            <div className="note-title-editor">
              <input
                className="note-title-input"
                type="text"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setTitleDraft(note.title);
                    setIsEditingTitle(false);
                    return;
                  }

                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSaveTitle();
                  }
                }}
                disabled={isSavingTitle}
                autoFocus
              />
              <div className="note-editor-actions">
                <button
                  type="button"
                  className="note-editor-secondary"
                  onClick={() => {
                    setTitleDraft(note.title);
                    setIsEditingTitle(false);
                  }}
                  disabled={isSavingTitle}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="note-editor-primary"
                  onClick={() => {
                    void handleSaveTitle();
                  }}
                  disabled={isSavingTitle}
                >
                  {isSavingTitle ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="note-title-button"
                onClick={() => onToggleExpand(note.id)}
              >
                <h3>{note.title}</h3>
              </button>
              {isExpanded ? (
                <button
                  type="button"
                  className="note-detail-link note-title-link"
                  onClick={beginTitleEdit}
                >
                  Rename
                </button>
              ) : null}
            </>
          )}
        </div>
        {isExpanded ? (
          <button
            type="button"
            aria-label={
              isDeleteConfirming ? 'Confirm delete note' : 'Delete note'
            }
            className={
              isDeleteConfirming
                ? 'note-delete-button note-delete-button-confirm'
                : 'note-delete-button'
            }
            onClick={handleDeleteIntent}
            disabled={isDeleting}
          >
            <span className="note-delete-glyph" aria-hidden="true">
              {isDeleteConfirming ? '!' : <>&#128465;</>}
            </span>
          </button>
        ) : (
          <div className="note-time-stack">
            <p className="note-time">{displayTime}</p>
            {note.pinned ? (
              <span className="note-pinned-badge" aria-label="Pinned note">
                &#128204;
              </span>
            ) : null}
          </div>
        )}
      </div>
      <div
        className={
          isExpanded
            ? 'note-expanded-shell note-expanded-shell-open'
            : 'note-expanded-shell'
        }
        aria-hidden={!isExpanded}
      >
        <div className="note-expanded-clip">
          <div className="note-expanded-body">
            <div className="note-switch-row">
              <span className="note-detail-label">Pinned</span>
              <button
                type="button"
                className={
                  note.pinned
                    ? 'note-pin-switch note-pin-switch-on'
                    : 'note-pin-switch'
                }
                onClick={() => {
                  void handleTogglePinned();
                }}
                disabled={isSavingPin}
                aria-pressed={Boolean(note.pinned)}
              >
                <span className="note-pin-switch-track" aria-hidden="true">
                  <span className="note-pin-switch-thumb" />
                </span>
                <span className="note-pin-switch-text">
                  {note.pinned ? 'Pinned' : 'Unpinned'}
                </span>
              </button>
            </div>
            <section className="note-detail-block">
              <div className="note-detail-head">
                <span className="note-detail-label">Content</span>
                {!isEditingContent ? (
                  <button
                    type="button"
                    className="note-detail-link"
                    onClick={beginContentEdit}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              {isEditingContent ? (
                <div className="note-editor-shell">
                  <textarea
                    className="note-editor-textarea"
                    value={contentDraft}
                    onChange={(event) => setContentDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setContentDraft(note.content);
                        setIsEditingContent(false);
                        return;
                      }

                      if (
                        event.key === 'Enter' &&
                        (event.ctrlKey || event.metaKey)
                      ) {
                        event.preventDefault();
                        void handleSaveContent();
                      }
                    }}
                    rows={4}
                    disabled={isSavingContent}
                    autoFocus
                  />
                  <div className="note-editor-actions">
                    <button
                      type="button"
                      className="note-editor-secondary"
                      onClick={() => {
                        setContentDraft(note.content);
                        setIsEditingContent(false);
                      }}
                      disabled={isSavingContent}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="note-editor-primary"
                      onClick={() => {
                        void handleSaveContent();
                      }}
                      disabled={isSavingContent}
                    >
                      {isSavingContent ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="note-detail-surface"
                  onClick={beginContentEdit}
                >
                  {note.content || 'Click to add content'}
                </button>
              )}
            </section>
            <section className="note-detail-block">
              <div className="note-detail-head">
                <span className="note-detail-label">Tags</span>
                {!isEditingTags ? (
                  <button
                    type="button"
                    className="note-detail-link"
                    onClick={beginTagsEdit}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              {isEditingTags ? (
                <div className="note-editor-shell">
                  <input
                    className="note-editor-input"
                    type="text"
                    value={tagsDraft}
                    onChange={(event) => setTagsDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setTagsDraft(note.tags.join(', '));
                        setIsEditingTags(false);
                        return;
                      }

                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleSaveTags();
                      }
                    }}
                    placeholder="Comma separated tags"
                    disabled={isSavingTags}
                    autoFocus
                  />
                  <div className="note-editor-actions">
                    <button
                      type="button"
                      className="note-editor-secondary"
                      onClick={() => {
                        setTagsDraft(note.tags.join(', '));
                        setIsEditingTags(false);
                      }}
                      disabled={isSavingTags}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="note-editor-primary"
                      onClick={() => {
                        void handleSaveTags();
                      }}
                      disabled={isSavingTags}
                    >
                      {isSavingTags ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="note-tags-surface"
                  onClick={beginTagsEdit}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      beginTagsEdit();
                    }
                  }}
                >
                  {note.tags.length > 0 ? (
                    <div className="note-tags-list">
                      {note.tags.map((tag, index) => (
                        <span
                          key={`${note.id}-${tag}-${index}`}
                          className="note-tag-chip"
                        >
                          <span className="note-tag-text">{tag}</span>
                          <button
                            type="button"
                            className="note-tag-remove"
                            aria-label={`Remove ${tag}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleRemoveTag(index);
                            }}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="note-tags-empty">Click to add tags</span>
                  )}
                </div>
              )}
            </section>
            <div className="note-meta-row">
              <span className="note-meta-label">Updated</span>
              <span className="note-meta-value">{absoluteTime}</span>
            </div>
            {isDeleteConfirming ? (
              <p className="note-action-hint">Click delete again to confirm.</p>
            ) : null}
            {actionError ? (
              <p className="note-action-error" role="alert">
                {actionError}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default NoteCard;
