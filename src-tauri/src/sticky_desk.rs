// 文件说明：StickyDesk 后端主模块，定义数据模型与命令入口编排。
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex, MutexGuard,
};

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent,
};
#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    System::SystemInformation::GetTickCount64,
    UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO},
};

mod normalization;
use normalization::*;
mod storage;
mod windowing;
mod commands_data;
mod commands_settings;

const NOTES_FILE_NAME: &str = "notes.json";
const FUTURE_TASKS_FILE_NAME: &str = "future-tasks.json";
const SETTINGS_FILE_NAME: &str = "settings.json";
const TIMESTAMP_FORMAT: &str = "%Y-%m-%dT%H:%M:00";
const TIMESTAMP_INPUT_FORMAT: &str = "%Y-%m-%dT%H:%M:%S";
const TIMESTAMP_INPUT_FORMAT_SHORT: &str = "%Y-%m-%dT%H:%M";
const MAIN_WINDOW_LABEL: &str = "main";
const TEST_WINDOW_LABEL: &str = "test-window";
const TEST_WINDOW_WIDTH: f64 = 260.0;
const TEST_WINDOW_HEIGHT: f64 = 160.0;
const TEST_WINDOW_GAP: i64 = 12;
const MIN_WINDOW_WIDTH: u32 = 360;
const MIN_WINDOW_HEIGHT: u32 = 220;
const DEFAULT_WINDOW_HEIGHT: u32 = 720;
const MAX_WINDOW_WIDTH: u32 = MIN_WINDOW_WIDTH * 3;
const MAX_WINDOW_HEIGHT: u32 = 2160;
const MAIN_WINDOW_COMPACT_HEIGHT: u32 = 230;
const MIN_UI_SCALE: f64 = 1.0;
const MAX_UI_SCALE: f64 = 2.0;
const MIN_SHELL_OPACITY: f64 = 0.2;
const MAX_SHELL_OPACITY: f64 = 1.0;
const DEFAULT_THEME_ID: &str = "white";
const DEFAULT_NOTE_SORT_FIELD: &str = "createdAt";
const DEFAULT_NOTE_SORT_DIRECTION: &str = "desc";
const UNTITLED_NOTE_TITLE: &str = "Untitled note";
const UNTITLED_TASK_TITLE: &str = "Untitled task";
static APP_IS_QUITTING: AtomicBool = AtomicBool::new(false);
static IGNORE_NEXT_MAIN_RESIZE_PERSIST: AtomicBool = AtomicBool::new(false);
static MAIN_WINDOW_LAYOUT_IS_COMPACT: AtomicBool = AtomicBool::new(false);
static MAIN_WINDOW_HEIGHT_BEFORE_COMPACT: Mutex<Option<u32>> = Mutex::new(None);

pub type CommandResult<T> = Result<T, String>;

#[derive(Default)]
pub struct StorageState {
    lock: Mutex<()>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    pub pinned: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteInput {
    pub title: String,
    pub content: String,
    pub tags: Option<Vec<String>>,
    pub pinned: Option<bool>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNoteInput {
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
    pub pinned: Option<bool>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FutureTask {
    pub id: String,
    pub title: String,
    pub due_at: String,
    pub created_at: String,
    pub completed: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFutureTaskInput {
    pub title: String,
    pub due_at: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFutureTaskInput {
    pub title: Option<String>,
    pub due_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFutureTaskStatusInput {
    pub completed: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowSettings {
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteSortSettings {
    pub field: String,
    pub direction: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme_id: String,
    pub ui_scale: f64,
    pub shell_opacity: f64,
    pub always_on_top: bool,
    pub auto_fade_when_inactive: bool,
    pub window: WindowSettings,
    pub note_sort: NoteSortSettings,
}

fn lock_storage(storage: &StorageState) -> CommandResult<MutexGuard<'_, ()>> {
    storage
        .lock
        .lock()
        .map_err(|_| "StickyDesk: storage lock is poisoned.".to_string())
}

fn with_storage_lock<T>(
    storage: &StorageState,
    action: impl FnOnce() -> CommandResult<T>,
) -> CommandResult<T> {
    let _guard = lock_storage(storage)?;
    action()
}

pub fn apply_saved_window_preferences(app: &AppHandle) {
    windowing::apply_saved_window_preferences(app);
}

pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    windowing::handle_window_event(window, event);
}

#[tauri::command]
pub fn minimize_window(window: Window) -> CommandResult<()> {
    window
        .minimize()
        .map_err(|error| format!("StickyDesk: failed to minimize window: {error}"))
}

#[tauri::command]
pub fn close_window(window: Window) -> CommandResult<()> {
    if window.label() == MAIN_WINDOW_LABEL {
        return window
            .hide()
            .map_err(|error| format!("StickyDesk: failed to hide window: {error}"));
    }

    window
        .close()
        .map_err(|error| format!("StickyDesk: failed to close secondary window: {error}"))
}

pub fn request_app_exit(app: &AppHandle) {
    APP_IS_QUITTING.store(true, Ordering::Relaxed);

    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        if let Err(error) = window.close() {
            log::warn!("StickyDesk: failed to close main window during app exit: {error}");
        }
    }

    app.exit(0);
}

#[tauri::command]
pub fn should_show_window_on_boot() -> bool {
    !std::env::args().any(|argument| argument == "--autostart")
}

#[tauri::command]
pub fn open_test_window(window: Window) -> CommandResult<()> {
    log::info!("StickyDesk: open_test_window invoked by {}.", window.label());
    let app = window.app_handle();

    if let Some(existing_window) = app.get_webview_window(TEST_WINDOW_LABEL) {
        log::info!("StickyDesk: reusing existing test window.");
        existing_window
            .show()
            .map_err(|error| format!("StickyDesk: failed to show test window: {error}"))?;
        existing_window
            .set_focus()
            .map_err(|error| format!("StickyDesk: failed to focus test window: {error}"))?;

        return Ok(());
    }

    let (x, y) = windowing::resolve_test_window_position(&window)?;
    let url = WebviewUrl::App("index.html".into());

    let test_window = WebviewWindowBuilder::new(app, TEST_WINDOW_LABEL, url)
        .title("StickyDesk Test")
        .initialization_script("window.__STICKYDESK_WINDOW_KIND__ = 'test';")
        .inner_size(TEST_WINDOW_WIDTH, TEST_WINDOW_HEIGHT)
        .position(x, y)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .visible(false)
        .build()
        .map_err(|error| format!("StickyDesk: failed to create test window: {error}"))?;
    // New child windows may not run frontend scripts while fully hidden.
    test_window
        .show()
        .map_err(|error| format!("StickyDesk: failed to show new test window: {error}"))?;
    test_window
        .set_focus()
        .map_err(|error| format!("StickyDesk: failed to focus new test window: {error}"))?;
    log::info!("StickyDesk: created test window at ({x}, {y}).");

    Ok(())
}

#[tauri::command]
pub fn set_always_on_top(
    window: Window,
    state: State<'_, StorageState>,
    value: bool,
) -> CommandResult<bool> {
    commands_settings::set_always_on_top(window, state, value)
}

#[tauri::command]
pub fn set_window_always_on_top_local(window: Window, value: bool) -> CommandResult<bool> {
    window
        .set_always_on_top(value)
        .map_err(|error| format!("StickyDesk: failed to toggle always-on-top: {error}"))?;

    Ok(window.is_always_on_top().unwrap_or(value))
}

#[tauri::command]
pub fn set_main_window_layout_compact(
    window: Window,
    state: State<'_, StorageState>,
    compact: bool,
) -> CommandResult<()> {
    windowing::set_main_window_layout_compact(window, state, compact)
}

#[tauri::command]
pub fn is_cursor_inside_window(window: Window) -> CommandResult<bool> {
    windowing::is_cursor_inside_window(window)
}

#[cfg(target_os = "windows")]
fn read_system_idle_seconds_windows() -> CommandResult<u64> {
    let mut input_info = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };

    let did_read = unsafe { GetLastInputInfo(&mut input_info) };

    if did_read == 0 {
        return Err("StickyDesk: failed to read last input info.".to_string());
    }

    let now_tick = unsafe { GetTickCount64() };
    let last_input_tick = u64::from(input_info.dwTime);
    let elapsed_millis = now_tick.saturating_sub(last_input_tick);

    Ok(elapsed_millis / 1000)
}

#[tauri::command]
pub fn get_idle_seconds() -> CommandResult<u64> {
    #[cfg(target_os = "windows")]
    {
        return read_system_idle_seconds_windows();
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("StickyDesk: idle tracking is not implemented on this platform.".to_string())
    }
}

#[tauri::command]
pub fn get_settings(app: AppHandle, state: State<'_, StorageState>) -> CommandResult<AppSettings> {
    commands_settings::get_settings(app, state)
}

#[tauri::command]
pub fn set_theme(
    app: AppHandle,
    state: State<'_, StorageState>,
    theme_id: String,
) -> CommandResult<AppSettings> {
    commands_settings::set_theme(app, state, theme_id)
}

#[tauri::command]
pub fn set_ui_scale(
    app: AppHandle,
    state: State<'_, StorageState>,
    value: f64,
) -> CommandResult<AppSettings> {
    commands_settings::set_ui_scale(app, state, value)
}

#[tauri::command]
pub fn set_shell_opacity(
    app: AppHandle,
    state: State<'_, StorageState>,
    value: f64,
) -> CommandResult<AppSettings> {
    commands_settings::set_shell_opacity(app, state, value)
}

#[tauri::command]
pub fn set_note_sort(
    app: AppHandle,
    state: State<'_, StorageState>,
    field: String,
    direction: String,
) -> CommandResult<AppSettings> {
    commands_settings::set_note_sort(app, state, field, direction)
}

#[tauri::command]
pub fn set_auto_fade_when_inactive(
    app: AppHandle,
    state: State<'_, StorageState>,
    value: bool,
) -> CommandResult<AppSettings> {
    commands_settings::set_auto_fade_when_inactive(app, state, value)
}

#[tauri::command]
pub fn list_notes(app: AppHandle, state: State<'_, StorageState>) -> CommandResult<Vec<Note>> {
    commands_data::list_notes(app, state)
}

#[tauri::command]
pub fn create_note(
    app: AppHandle,
    state: State<'_, StorageState>,
    input: CreateNoteInput,
) -> CommandResult<Note> {
    commands_data::create_note(app, state, input)
}

#[tauri::command]
pub fn update_note(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
    input: UpdateNoteInput,
) -> CommandResult<Option<Note>> {
    commands_data::update_note(app, state, id, input)
}

#[tauri::command]
pub fn delete_note(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
) -> CommandResult<bool> {
    commands_data::delete_note(app, state, id)
}

#[tauri::command]
pub fn list_future_tasks(
    app: AppHandle,
    state: State<'_, StorageState>,
) -> CommandResult<Vec<FutureTask>> {
    commands_data::list_future_tasks(app, state)
}

#[tauri::command]
pub fn create_future_task(
    app: AppHandle,
    state: State<'_, StorageState>,
    input: CreateFutureTaskInput,
) -> CommandResult<FutureTask> {
    commands_data::create_future_task(app, state, input)
}

#[tauri::command]
pub fn update_future_task(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
    input: UpdateFutureTaskInput,
) -> CommandResult<Option<FutureTask>> {
    commands_data::update_future_task(app, state, id, input)
}

#[tauri::command]
pub fn delete_future_task(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
) -> CommandResult<bool> {
    commands_data::delete_future_task(app, state, id)
}

#[tauri::command]
pub fn set_future_task_completed(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
    input: UpdateFutureTaskStatusInput,
) -> CommandResult<Option<FutureTask>> {
    commands_data::set_future_task_completed(app, state, id, input)
}

