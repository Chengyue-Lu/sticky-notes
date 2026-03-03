# StickyDesk

[Chinese](./README_CN.md)

StickyDesk is a compact desktop notes panel built with Electron, React, and Vite.
It is designed as a narrow side panel for quick capture, quick review, and lightweight focus support on the desktop.

> Status: `v0.1` prototype release. The core shell is usable and local note persistence is in place, but tasks and advanced settings are still planned work.

## Current Features

### Notes

- Narrow sticky-panel layout optimized for desktop side placement
- Local JSON note persistence (`data/notes.json`)
- Create new notes from the inline composer
- Single-note expand / collapse interaction
- Inline editing for title, content, and tags
- Delete notes from the expanded state
- Pin toggle for moving notes between pinned and regular sections
- Fast search across title, content, and tags

### Activity Tracking

- Tracks active time using Electron `powerMonitor.getSystemIdleTime()`
- Shows `Today` and `Total` active time
- Tracks current state (`Active now`, `Idle`, or unavailable)
- Reset actions for daily and total counters
- Activity counters are persisted in `localStorage`

### Window Shell

- Frameless translucent desktop panel
- Floating custom controls for settings, minimize, and close
- Built-in window size presets
- `Always on Top` toggle
- Hidden native scrollbars for a cleaner compact layout
- Windows portable packaging output is supported

## Current Limitations

- The settings popover still contains placeholder options for theme and sort rules
- There is no countdown task system yet
- There is no system tray integration yet
- The portable single-file build can feel slower to launch or close because it extracts and cleans up temporary runtime files

## Tech Stack

- Electron
- React 19
- TypeScript
- Vite
- Storage: local JSON first; SQLite remains an optional future upgrade if the app later needs heavier querying or indexing

## Project Structure

- `main.cjs`: Electron main process, local JSON storage, and IPC handlers
- `preload.cjs`: secure renderer bridge
- `src/pages/NotesBoard.tsx`: main screen composition
- `src/components/notes/`: note board UI, composer, cards, and window controls
- `src/hooks/useActiveTime.ts`: active time tracking logic
- `src/hooks/useNotes.ts`: note loading, filtering, and note mutations
- `src/data/notes.ts`: renderer-side note I/O adapter
- `data/notes.json`: runtime note storage file (created automatically when missing)

## Development

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

### Validate

```bash
npm run typecheck
npm run build
```

### Package (Windows Portable)

```bash
npm run package:win
```

## Roadmap

### Next (`v0.2`)

- [ ] Improve startup and shutdown speed, especially for portable builds
- [ ] Reduce the rendering cost of the translucent shell where possible
- [ ] Add short countdown / focus timers
- [ ] Turn theme and sort placeholders into real settings

### Later

- [ ] Add tray integration and background controls
- [ ] Add import / export for notes and settings
- [ ] Revisit SQLite only if local JSON becomes a limitation

## License

MIT
