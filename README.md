# StickyDesk

[Chinese](./README_CN.md)
[Quick Start (CN)](./使用说明.md)

StickyDesk is a compact desktop side panel for notes, countdown tasks, and quick focus timing.  
It runs as a narrow frameless Electron window and stores runtime data in a local `data/` folder beside the app.

> Status: `v0.3.0`

## Highlights

- Notes:
  - local JSON storage in `data/notes.json`
  - create, search, expand, edit, delete
  - tags, pin toggle, and time-based sorting
- Future tasks:
  - separate JSON storage in `data/future-tasks.json`
  - independent long-range countdown list
  - create and delete with confirmation
- Activity and focus:
  - active time tracking from system idle time
  - `Today` / `Total` counters
  - short focus timer with in-window reminder and completion count
- Window shell:
  - frameless translucent panel
  - settings, minimize, and close controls
  - size, UI scale, theme, sort rule, and shell opacity controls
  - `Always on Top` and optional inactive auto-fade
- Release formats:
  - Windows portable build
  - Windows unpacked directory build

## Storage

StickyDesk creates and maintains these files automatically:

- `data/notes.json`
- `data/future-tasks.json`
- `data/settings.json`

## Structure

- `main.cjs`: Electron main process, storage, window control, IPC
- `preload.cjs`: renderer bridge
- `src/components/notes/`: UI for notes, future tasks, timers, and window controls
- `src/hooks/`: activity, settings, notes, future tasks, and focus state
- `src/pages/NotesBoard.tsx`: main board composition

## Next

### v0.4.0

- Improve startup and cold-launch behavior further
- Expand future tasks into richer scheduling instead of a simple single-list flow
- Add tray / background controls
- Add import / export for local data
- Evaluate `electron-vite` for a cleaner Electron build pipeline

### Later

- Keep reducing Electron overhead where practical
- Revisit richer filtering and task organization
- Consider Tauri only if startup and package size become a hard product constraint

## License

MIT
