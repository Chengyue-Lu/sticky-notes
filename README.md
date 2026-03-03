# StickyDesk

[Chinese](./README_CN.md)

StickyDesk is a compact desktop notes panel built with Electron, React, and Vite.
The current version focuses on a narrow frameless window, quick note browsing, desktop-friendly controls, and a lightweight activity tracker.

> Status: active prototype. The UI shell is usable, but note CRUD and long-term data storage are still in progress.

## Current Features

### Notes Board

- Narrow sticky-panel layout optimized for desktop side placement
- Pinned and regular note sections
- Fast search across title, content, category, and tags
- Compact note rows designed for quick scanning
- Empty-state handling when filters return no results

### Activity Tracking

- Tracks active time using Electron `powerMonitor.getSystemIdleTime()`
- Shows current session status (`Active now`, `Idle`, or tracking unavailable)
- Tracks both `Today` and `Total` active time
- Persists activity counters in `localStorage`
- Reset actions for daily and total counters

### Window Controls

- Frameless translucent window with custom in-app controls
- Custom floating controls for settings, minimize, and close
- Built-in window size presets
- `Always on Top` toggle from the settings popover
- Hidden native scrollbars for a cleaner compact layout

## Current Limitations

- Notes are still loaded from local seed data
- Note create / edit / delete is not implemented yet
- Tag management UI is not implemented yet
- Tasks, drag-and-drop sorting, and context menus are not implemented yet
- The settings popover includes placeholders for theme and sort preferences

## Tech Stack

- Electron
- React 19
- TypeScript
- Vite

## Project Structure

- `main.cjs`: Electron main process and window IPC
- `preload.cjs`: secure renderer bridge
- `src/pages/NotesBoard.tsx`: main screen composition
- `src/components/notes/`: note board UI pieces and window controls
- `src/hooks/useActiveTime.ts`: active time tracking logic
- `src/hooks/useNotes.ts`: note loading and filtering
- `src/data/`: seed note data

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

## Near-Term Roadmap

- [ ] Note CRUD and local persistence
- [ ] Real settings for theme and sort behavior
- [ ] Better note detail / expand interactions
- [ ] Optional stronger desktop integration (startup, tray, richer window behaviors)

## License

MIT
