# StickyDesk

StickyDesk 是一个基于 Tauri、React 和 TypeScript 构建的桌面便签应用。

StickyDesk is a desktop sticky notes app built with Tauri, React, and TypeScript.

This is the first stable Tauri release line. The current release target is `v1.0.0`.

## Features

- Quick sticky note capture, edit, sort, and delete
- Future task list with lightweight planning
- Focus timer with completion reminders
- Active time tracking with Windows system idle detection
- Always-on-top support
- Auto-fade when the window is inactive
- Theme, opacity, UI scale, and note sort preferences
- Local data persistence through the Tauri application data directory

## Tech Stack

- Tauri 2
- React 19
- TypeScript
- Vite
- Rust

## Data Storage

The Tauri build stores app data in the operating system application data directory.

On Windows, the current app identity remains bound to the existing Tauri identifier so upgrades can keep using the same stored data path.

## Release

- Current target version: `1.0.0`
- Package version, Tauri bundle version, and Rust crate version are aligned to `1.0.0`

## Why Tauri

`v1.0.0` is the first stable release after the migration from Electron to Tauri.

It keeps the original core experience while reducing runtime overhead, moving desktop logic into Rust, and preparing the project for follow-up desktop features such as tray support, auto-start, and click-through mode.

## Roadmap

Planned directions for `v1.0.1`:

- Tray integration: left click to restore, close button hides to tray, right-click menu to quit
- Optional Windows auto-start switch
- Click-through mode is under evaluation because Tauri supports window-level cursor ignoring, but keeping only a few controls clickable is a more complex interaction model

Longer-term idea:

- Online active-time comparison is a future research item and is not planned for the current release line

See the Chinese usage guide file in the project root for user-facing instructions [☞使用说明](./使用说明.md).

See the Chinese roadmap file in the project root for planned features [☞预期规划](./预期规划.md).
