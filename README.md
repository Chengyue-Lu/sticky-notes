# StickyDesk

[Chinese](./README_CN.md)

StickyDesk is a compact desktop notes side panel built with Electron, React, and Vite.
It focuses on fast capture, quick scanning, and a lightweight desktop companion workflow inside a narrow frameless window.

> Status: `v0.2.0` prototype release. Core note editing, local JSON persistence, short focus timing, basic personalization, and Windows packaging are in place.

## Current Features

### Notes

- Local JSON note persistence in `data/notes.json`
- Inline note creation
- Single-note expand / collapse behavior
- Inline editing for title, content, and tags
- Delete notes from the expanded state
- Pin toggle for moving notes between pinned and regular sections
- Search across title, content, and tags
- Sort by creation time or modification time
- New-to-old and old-to-new sort directions

### Activity Tracking

- Active time tracking through Electron `powerMonitor.getSystemIdleTime()`
- `Today` and `Total` active counters
- Idle detection threshold set to 20 seconds
- Idle timer resets to `0s` when the app first enters the idle state
- Daily and total reset actions

### Focus Timer

- Short focus timer with task content plus hour / minute input
- Fixed in-window countdown card that stays above the scrolling content
- Cancel flow with a two-step confirmation while a session is running
- Full-window alert flashing when a session finishes
- In-memory focus completion count shown in the bottom stats bar

### Window Shell

- Frameless translucent desktop panel
- Floating controls for settings, minimize, and close
- Manual window width / height input with bounds enforcement
- Window size persistence in `data/settings.json`
- `Always on Top` toggle with persistence
- Startup shell that shows earlier while the renderer finishes loading
- Hidden native scrollbars for a cleaner compact layout
- Expanded top drag region for easier window movement

### Themes

- Five built-in themes:
  - White
  - Soft Yellow
  - Soft Blue
  - Soft Green
  - Soft Purple
- Theme choice persists in `data/settings.json`
- Major panels reuse the same theme variables so the whole shell shifts together

## Current Limitations

- The focus timer is still single-session only and does not persist across restarts
- There is no tray integration yet
- There is no import / export for notes or settings yet
- Portable single-file builds still start slower than unpacked builds because they must extract to a temporary directory before launch
- Electron remains the main source of package size; the runtime is much larger than the app code itself

## Tech Stack

- Electron
- React 19
- TypeScript
- Vite
- Local JSON for notes and settings

## Project Structure

- `main.cjs`: Electron main process, JSON storage, and IPC
- `preload.cjs`: secure renderer bridge
- `src/pages/NotesBoard.tsx`: main board composition
- `src/components/notes/`: note cards, composer, toolbar, hero, floating stats, and window controls
- `src/hooks/useActiveTime.ts`: active / idle tracking
- `src/hooks/useAppSettings.ts`: renderer-side settings state
- `src/hooks/useFocusTimer.ts`: short focus timer state and reminder flow
- `src/hooks/useNotes.ts`: note loading, filtering, sorting, and mutations
- `src/data/notes.ts`: renderer-side note I/O adapter
- `data/notes.json`: runtime notes storage (auto-created)
- `data/settings.json`: runtime settings storage (auto-created)

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

### Package

Windows portable:

```bash
npm run package:win
```

Windows unpacked directory:

```bash
npm run package:win:dir
```

Portable and unpacked builds are the current supported release formats. An NSIS installer is not a near-term priority while the unpacked build already covers the fast-launch use case.

## Roadmap

### v0.3.0

- [ ] Add adjustable global UI scale / font size
- [ ] Add adjustable shell translucency / background opacity
- [ ] Add inactive auto-fade for the shell and floating controls when the pointer leaves the app
- [ ] Expand the current short focus timer into future countdown tasks for longer schedules
- [ ] Support multiple upcoming timers instead of only one active short session
- [ ] Evaluate `electron-vite` to simplify and unify the Electron build pipeline
- [ ] Keep trimming cold-start overhead where it does not compromise the current visual shell

### Later

- [ ] Add tray integration and background controls
- [ ] Optimize the animation for new creation and setting expansion
- [ ] Add import / export for notes and settings
- [ ] Revisit richer note metadata and filtering
- [ ] Consider Tauri as a future migration option if Electron no longer meets startup or package-size goals
- [ ] Re-evaluate SQLite only if local JSON becomes a clear limitation

## License

MIT
