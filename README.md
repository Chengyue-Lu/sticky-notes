
# StickyDesk

[中文](./README_CN.md)

A lightweight desktop sticky-notes app built with **Electron + React** (Windows-first).  
Features include notes with tags, search, pinning, task planning with importance colors, optional floating widget, and activity tracking (optional).

> Status: early development / MVP in progress.

---

## Features

### Notes

- Create / edit / delete notes
- Pin notes
- Tags (multi-tag) and category (optional)
- Fast search (title/content + tag filter)

### Tasks (Plan)

- Simple task list with due time
- Importance level with color depth (e.g., light red → deep red)

### UI / Interaction

- Always-on-top floating window (optional)
- Hover highlight / slight scale on note cards
- Right-click context menu (planned)
- Drag & drop sorting within a list (planned)

### Optional: Activity Tracking

- Track active time based on system idle time (no global input hook)
- Show active time in floating widget

---

## Tech Stack

- **Electron** (main process)
- **React** (renderer)
- **TypeScript** (recommended)
- **Vite** (recommended) or your chosen bundler
- Storage: SQLite (optional) / JSON-based store (MVP-friendly)

## Roadmap

- [ ] Notes MVP: CRUD + tags + search
- [ ] Tasks: importance colors + due time
- [ ] Floating widget: always-on-top + time + today summary
- [ ] Drag & drop ordering (React DnD)
- [ ] Context menu actions
- [ ] Optional: SQLite / FTS search
- [ ] Auto-start on boot (optional)

---

## License

MIT (recommended for open source)
