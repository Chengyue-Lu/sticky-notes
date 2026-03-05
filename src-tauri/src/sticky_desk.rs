use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex, MutexGuard,
    },
};

use chrono::{DateTime, Duration, Local, LocalResult, NaiveDateTime, TimeZone, Timelike};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, LogicalSize, Manager, Size, State, Window, WindowEvent};
use uuid::Uuid;
#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    System::SystemInformation::GetTickCount64,
    UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO},
};

const NOTES_FILE_NAME: &str = "notes.json";
const FUTURE_TASKS_FILE_NAME: &str = "future-tasks.json";
const SETTINGS_FILE_NAME: &str = "settings.json";
const TIMESTAMP_FORMAT: &str = "%Y-%m-%dT%H:%M:00";
const TIMESTAMP_INPUT_FORMAT: &str = "%Y-%m-%dT%H:%M:%S";
const TIMESTAMP_INPUT_FORMAT_SHORT: &str = "%Y-%m-%dT%H:%M";
const MAIN_WINDOW_LABEL: &str = "main";
const MIN_WINDOW_WIDTH: u32 = 360;
const MIN_WINDOW_HEIGHT: u32 = 720;
const MAX_WINDOW_WIDTH: u32 = MIN_WINDOW_WIDTH * 3;
const MAX_WINDOW_HEIGHT: u32 = 2160;
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

pub type CommandResult<T> = Result<T, String>;

#[derive(Default)]
pub struct StorageState {
    lock: Mutex<()>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowBounds {
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
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

fn ensure_data_dir(app: &AppHandle) -> CommandResult<PathBuf> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("StickyDesk: failed to resolve app data dir: {error}"))?
        .join("data");

    fs::create_dir_all(&data_dir)
        .map_err(|error| format!("StickyDesk: failed to create data dir: {error}"))?;

    Ok(data_dir)
}

fn data_file_path(app: &AppHandle, file_name: &str) -> CommandResult<PathBuf> {
    Ok(ensure_data_dir(app)?.join(file_name))
}

fn read_text_file_if_exists(app: &AppHandle, file_name: &str) -> CommandResult<Option<String>> {
    let file_path = data_file_path(app, file_name)?;

    if !file_path.exists() {
        return Ok(None);
    }

    fs::read_to_string(&file_path)
        .map(Some)
        .map_err(|error| format!("StickyDesk: failed to read {file_name}: {error}"))
}

fn write_json_file<T: Serialize>(app: &AppHandle, file_name: &str, value: &T) -> CommandResult<()> {
    let file_path = data_file_path(app, file_name)?;
    let serialized = serde_json::to_string_pretty(value)
        .map_err(|error| format!("StickyDesk: failed to serialize {file_name}: {error}"))?;

    fs::write(&file_path, serialized)
        .map_err(|error| format!("StickyDesk: failed to write {file_name}: {error}"))
}

fn format_timestamp(date: DateTime<Local>) -> String {
    date.format(TIMESTAMP_FORMAT).to_string()
}

fn localize_naive_timestamp(value: NaiveDateTime) -> DateTime<Local> {
    match Local.from_local_datetime(&value) {
        LocalResult::Single(date) => date,
        LocalResult::Ambiguous(date, _) => date,
        LocalResult::None => Local.from_utc_datetime(&value),
    }
}

fn parse_timestamp(value: &str) -> Option<DateTime<Local>> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        return None;
    }

    if let Ok(parsed) = NaiveDateTime::parse_from_str(trimmed, TIMESTAMP_INPUT_FORMAT) {
        return Some(localize_naive_timestamp(parsed));
    }

    if let Ok(parsed) = NaiveDateTime::parse_from_str(trimmed, TIMESTAMP_INPUT_FORMAT_SHORT) {
        return Some(localize_naive_timestamp(parsed));
    }

    DateTime::parse_from_rfc3339(trimmed)
        .ok()
        .map(|date| date.with_timezone(&Local))
}

fn create_seed_timestamp(days_ago: i64, hours: u32, minutes: u32) -> String {
    let mut date = Local::now() - Duration::days(days_ago);

    if let Some(next_date) = date.with_hour(hours) {
        date = next_date;
    }

    if let Some(next_date) = date.with_minute(minutes) {
        date = next_date;
    }

    if let Some(next_date) = date.with_second(0) {
        date = next_date;
    }

    if let Some(next_date) = date.with_nanosecond(0) {
        date = next_date;
    }

    format_timestamp(date)
}

fn clamp_rounded(value: f64, minimum: u32, maximum: u32) -> u32 {
    if !value.is_finite() {
        return minimum;
    }

    value.round().clamp(f64::from(minimum), f64::from(maximum)) as u32
}

fn clamp_window_width(value: f64) -> u32 {
    clamp_rounded(value, MIN_WINDOW_WIDTH, MAX_WINDOW_WIDTH)
}

fn clamp_window_height(value: f64) -> u32 {
    clamp_rounded(value, MIN_WINDOW_HEIGHT, MAX_WINDOW_HEIGHT)
}

fn clamp_ui_scale(value: f64) -> f64 {
    if !value.is_finite() {
        return MIN_UI_SCALE;
    }

    (value.clamp(MIN_UI_SCALE, MAX_UI_SCALE) * 10.0).round() / 10.0
}

fn clamp_shell_opacity(value: f64) -> f64 {
    if !value.is_finite() {
        return MAX_SHELL_OPACITY;
    }

    (value.clamp(MIN_SHELL_OPACITY, MAX_SHELL_OPACITY) * 100.0).round() / 100.0
}

fn normalize_theme_id(value: &str) -> String {
    match value {
        "white" | "yellow" | "blue" | "green" | "purple" => value.to_string(),
        _ => DEFAULT_THEME_ID.to_string(),
    }
}

fn normalize_note_sort_field(value: &str) -> String {
    match value {
        "createdAt" | "updatedAt" => value.to_string(),
        _ => DEFAULT_NOTE_SORT_FIELD.to_string(),
    }
}

fn normalize_note_sort_direction(value: &str) -> String {
    match value {
        "desc" | "asc" => value.to_string(),
        _ => DEFAULT_NOTE_SORT_DIRECTION.to_string(),
    }
}

fn normalize_title(value: Option<&str>, fallback: &str) -> String {
    let trimmed = value.unwrap_or_default().trim();

    if trimmed.is_empty() {
        return fallback.to_string();
    }

    trimmed.to_string()
}

fn normalize_plain_string(value: Option<&str>, fallback: &str) -> String {
    value.unwrap_or(fallback).to_string()
}

fn normalize_tags(values: Option<&[String]>) -> Vec<String> {
    values
        .unwrap_or(&[])
        .iter()
        .map(|tag| tag.trim())
        .filter(|tag| !tag.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

fn normalize_tags_from_value(value: Option<&Value>) -> Vec<String> {
    let Some(items) = value.and_then(Value::as_array) else {
        return Vec::new();
    };

    items
        .iter()
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|tag| !tag.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

fn default_settings() -> AppSettings {
    AppSettings {
        theme_id: DEFAULT_THEME_ID.to_string(),
        ui_scale: MIN_UI_SCALE,
        shell_opacity: MAX_SHELL_OPACITY,
        always_on_top: false,
        auto_fade_when_inactive: true,
        window: WindowSettings {
            width: MIN_WINDOW_WIDTH,
            height: MIN_WINDOW_HEIGHT,
        },
        note_sort: NoteSortSettings {
            field: DEFAULT_NOTE_SORT_FIELD.to_string(),
            direction: DEFAULT_NOTE_SORT_DIRECTION.to_string(),
        },
    }
}

fn normalize_settings(settings: AppSettings) -> AppSettings {
    AppSettings {
        theme_id: normalize_theme_id(&settings.theme_id),
        ui_scale: clamp_ui_scale(settings.ui_scale),
        shell_opacity: clamp_shell_opacity(settings.shell_opacity),
        always_on_top: settings.always_on_top,
        auto_fade_when_inactive: settings.auto_fade_when_inactive,
        window: WindowSettings {
            width: clamp_window_width(f64::from(settings.window.width)),
            height: clamp_window_height(f64::from(settings.window.height)),
        },
        note_sort: NoteSortSettings {
            field: normalize_note_sort_field(&settings.note_sort.field),
            direction: normalize_note_sort_direction(&settings.note_sort.direction),
        },
    }
}

fn normalize_settings_from_value(value: &Value) -> AppSettings {
    let mut settings = default_settings();
    let Some(object) = value.as_object() else {
        return settings;
    };

    if let Some(theme_id) = object.get("themeId").and_then(Value::as_str) {
        settings.theme_id = normalize_theme_id(theme_id);
    }

    if let Some(ui_scale) = object.get("uiScale").and_then(Value::as_f64) {
        settings.ui_scale = clamp_ui_scale(ui_scale);
    }

    if let Some(shell_opacity) = object.get("shellOpacity").and_then(Value::as_f64) {
        settings.shell_opacity = clamp_shell_opacity(shell_opacity);
    }

    if let Some(always_on_top) = object.get("alwaysOnTop").and_then(Value::as_bool) {
        settings.always_on_top = always_on_top;
    }

    if let Some(auto_fade) = object.get("autoFadeWhenInactive").and_then(Value::as_bool) {
        settings.auto_fade_when_inactive = auto_fade;
    }

    if let Some(window) = object.get("window").and_then(Value::as_object) {
        if let Some(width) = window.get("width").and_then(Value::as_f64) {
            settings.window.width = clamp_window_width(width);
        }

        if let Some(height) = window.get("height").and_then(Value::as_f64) {
            settings.window.height = clamp_window_height(height);
        }
    }

    if let Some(note_sort) = object.get("noteSort").and_then(Value::as_object) {
        if let Some(field) = note_sort.get("field").and_then(Value::as_str) {
            settings.note_sort.field = normalize_note_sort_field(field);
        }

        if let Some(direction) = note_sort.get("direction").and_then(Value::as_str) {
            settings.note_sort.direction = normalize_note_sort_direction(direction);
        }
    }

    settings
}

fn default_notes() -> Vec<Note> {
    vec![
    Note {
      id: "note-1".to_string(),
      title: "Build the notes MVP first".to_string(),
      content: "Keep the first iteration focused on note CRUD, tags, and a simple search flow. Delay tasks and floating widgets until the base note experience is stable.".to_string(),
      tags: vec!["mvp".to_string(), "notes".to_string(), "setup".to_string()],
      created_at: create_seed_timestamp(2, 8, 15),
      updated_at: create_seed_timestamp(0, 9, 30),
      pinned: true,
    },
    Note {
      id: "note-2".to_string(),
      title: "Daily study checklist".to_string(),
      content: "Review the React shell code, list the next files to create, and verify the app still starts after each small UI change.".to_string(),
      tags: vec!["study".to_string(), "review".to_string()],
      created_at: create_seed_timestamp(1, 20, 45),
      updated_at: create_seed_timestamp(0, 11, 10),
      pinned: false,
    },
    Note {
      id: "note-3".to_string(),
      title: "Storage direction".to_string(),
      content: "Use static demo data now. Move to local JSON or localStorage before introducing SQLite or full-text search.".to_string(),
      tags: vec!["storage".to_string(), "future".to_string()],
      created_at: create_seed_timestamp(5, 10, 5),
      updated_at: create_seed_timestamp(1, 18, 40),
      pinned: false,
    },
  ]
}

fn default_future_tasks() -> Vec<FutureTask> {
    Vec::new()
}

fn normalize_note_value(value: &Value, index: usize) -> Option<Note> {
    let object = value.as_object()?;
    let fallback_created_at = format_timestamp(Local::now());
    let created_at = object
        .get("createdAt")
        .and_then(Value::as_str)
        .and_then(parse_timestamp)
        .map(format_timestamp)
        .unwrap_or_else(|| fallback_created_at.clone());
    let updated_at = object
        .get("updatedAt")
        .and_then(Value::as_str)
        .and_then(parse_timestamp)
        .map(format_timestamp)
        .unwrap_or_else(|| created_at.clone());
    let id = object
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| format!("note-{}-{}", index + 1, Uuid::new_v4()));

    Some(Note {
        id,
        title: normalize_title(
            object.get("title").and_then(Value::as_str),
            UNTITLED_NOTE_TITLE,
        ),
        content: normalize_plain_string(object.get("content").and_then(Value::as_str), ""),
        tags: normalize_tags_from_value(object.get("tags")),
        created_at,
        updated_at,
        pinned: object
            .get("pinned")
            .and_then(Value::as_bool)
            .unwrap_or(false),
    })
}

fn normalize_future_task_value(value: &Value, index: usize) -> Option<FutureTask> {
    let object = value.as_object()?;
    let fallback_due_at = format_timestamp(Local::now() + Duration::hours(1));
    let fallback_created_at = format_timestamp(Local::now());
    let due_at = object
        .get("dueAt")
        .and_then(Value::as_str)
        .and_then(parse_timestamp)
        .map(format_timestamp)
        .unwrap_or(fallback_due_at);
    let created_at = object
        .get("createdAt")
        .and_then(Value::as_str)
        .and_then(parse_timestamp)
        .map(format_timestamp)
        .unwrap_or(fallback_created_at);
    let id = object
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| format!("future-task-{}-{}", index + 1, Uuid::new_v4()));

    Some(FutureTask {
        id,
        title: normalize_title(
            object.get("title").and_then(Value::as_str),
            UNTITLED_TASK_TITLE,
        ),
        due_at,
        created_at,
        completed: object
            .get("completed")
            .and_then(Value::as_bool)
            .unwrap_or(false),
    })
}

fn normalize_notes_collection(values: &[Value]) -> Vec<Note> {
    values
        .iter()
        .enumerate()
        .filter_map(|(index, value)| normalize_note_value(value, index))
        .collect()
}

fn normalize_future_tasks_collection(values: &[Value]) -> Vec<FutureTask> {
    values
        .iter()
        .enumerate()
        .filter_map(|(index, value)| normalize_future_task_value(value, index))
        .collect()
}

fn notes_payload_array(value: &Value) -> Option<&[Value]> {
    value.as_array().map(Vec::as_slice).or_else(|| {
        value
            .get("notes")
            .and_then(Value::as_array)
            .map(Vec::as_slice)
    })
}

fn future_tasks_payload_array(value: &Value) -> Option<&[Value]> {
    value.as_array().map(Vec::as_slice).or_else(|| {
        value
            .get("tasks")
            .and_then(Value::as_array)
            .map(Vec::as_slice)
    })
}

fn write_settings_unlocked(app: &AppHandle, settings: &AppSettings) -> CommandResult<()> {
    write_json_file(app, SETTINGS_FILE_NAME, settings)
}

fn read_settings_unlocked(app: &AppHandle) -> CommandResult<AppSettings> {
    let Some(raw_text) = read_text_file_if_exists(app, SETTINGS_FILE_NAME)? else {
        let settings = default_settings();
        write_settings_unlocked(app, &settings)?;
        return Ok(settings);
    };

    let settings = match serde_json::from_str::<Value>(&raw_text) {
        Ok(value) => normalize_settings_from_value(&value),
        Err(error) => {
            log::warn!("StickyDesk: failed to parse settings JSON: {error}");
            default_settings()
        }
    };

    write_settings_unlocked(app, &settings)?;

    Ok(settings)
}

fn write_notes_unlocked(app: &AppHandle, notes: &[Note]) -> CommandResult<()> {
    write_json_file(
        app,
        NOTES_FILE_NAME,
        &json!({ "version": 1, "notes": notes }),
    )
}

fn read_notes_unlocked(app: &AppHandle) -> CommandResult<Vec<Note>> {
    let Some(raw_text) = read_text_file_if_exists(app, NOTES_FILE_NAME)? else {
        let notes = default_notes();
        write_notes_unlocked(app, &notes)?;
        return Ok(notes);
    };

    let notes = match serde_json::from_str::<Value>(&raw_text) {
        Ok(value) => notes_payload_array(&value)
            .map(normalize_notes_collection)
            .unwrap_or_else(default_notes),
        Err(error) => {
            log::warn!("StickyDesk: failed to parse notes JSON: {error}");
            default_notes()
        }
    };

    write_notes_unlocked(app, &notes)?;

    Ok(notes)
}

fn write_future_tasks_unlocked(app: &AppHandle, tasks: &[FutureTask]) -> CommandResult<()> {
    write_json_file(
        app,
        FUTURE_TASKS_FILE_NAME,
        &json!({ "version": 1, "tasks": tasks }),
    )
}

fn read_future_tasks_unlocked(app: &AppHandle) -> CommandResult<Vec<FutureTask>> {
    let Some(raw_text) = read_text_file_if_exists(app, FUTURE_TASKS_FILE_NAME)? else {
        let tasks = default_future_tasks();
        write_future_tasks_unlocked(app, &tasks)?;
        return Ok(tasks);
    };

    let tasks = match serde_json::from_str::<Value>(&raw_text) {
        Ok(value) => future_tasks_payload_array(&value)
            .map(normalize_future_tasks_collection)
            .unwrap_or_else(default_future_tasks),
        Err(error) => {
            log::warn!("StickyDesk: failed to parse future tasks JSON: {error}");
            default_future_tasks()
        }
    };

    write_future_tasks_unlocked(app, &tasks)?;

    Ok(tasks)
}

fn create_note_record(input: CreateNoteInput) -> Note {
    let timestamp = format_timestamp(Local::now());

    Note {
        id: Uuid::new_v4().to_string(),
        title: normalize_title(Some(input.title.as_str()), UNTITLED_NOTE_TITLE),
        content: normalize_plain_string(Some(input.content.as_str()), ""),
        tags: normalize_tags(input.tags.as_deref()),
        created_at: timestamp.clone(),
        updated_at: timestamp,
        pinned: input.pinned.unwrap_or(false),
    }
}

fn create_future_task_record(input: CreateFutureTaskInput) -> FutureTask {
    let timestamp = format_timestamp(Local::now());
    let due_at = parse_timestamp(input.due_at.as_str())
        .map(format_timestamp)
        .unwrap_or_else(|| format_timestamp(Local::now() + Duration::hours(1)));

    FutureTask {
        id: Uuid::new_v4().to_string(),
        title: normalize_title(Some(input.title.as_str()), UNTITLED_TASK_TITLE),
        due_at,
        created_at: timestamp,
        completed: false,
    }
}

fn update_future_task_record(task: &FutureTask, input: UpdateFutureTaskInput) -> FutureTask {
    let next_title = match input.title.as_deref() {
        Some(title) => normalize_title(Some(title), task.title.as_str()),
        None => task.title.clone(),
    };
    let next_due_at = match input.due_at.as_deref() {
        Some(due_at) => parse_timestamp(due_at)
            .map(format_timestamp)
            .unwrap_or_else(|| task.due_at.clone()),
        None => task.due_at.clone(),
    };

    FutureTask {
        id: task.id.clone(),
        title: next_title,
        due_at: next_due_at,
        created_at: task.created_at.clone(),
        completed: task.completed,
    }
}

fn update_future_task_status_record(
    task: &FutureTask,
    input: UpdateFutureTaskStatusInput,
) -> FutureTask {
    if input.completed {
        return FutureTask {
            id: task.id.clone(),
            title: task.title.clone(),
            due_at: task.due_at.clone(),
            created_at: task.created_at.clone(),
            completed: true,
        };
    }

    let now = Local::now();
    let should_shift_due_at = parse_timestamp(task.due_at.as_str())
        .map(|due_at| due_at <= now)
        .unwrap_or(true);
    let due_at = if task.completed && should_shift_due_at {
        format_timestamp(now + Duration::hours(1))
    } else {
        task.due_at.clone()
    };

    FutureTask {
        id: task.id.clone(),
        title: task.title.clone(),
        due_at,
        created_at: task.created_at.clone(),
        completed: false,
    }
}

fn update_note_record(note: &Note, input: UpdateNoteInput) -> Note {
    let next_title = match input.title.as_deref() {
        Some(title) => normalize_title(Some(title), note.title.as_str()),
        None => note.title.clone(),
    };
    let next_content = match input.content.as_deref() {
        Some(content) => normalize_plain_string(Some(content), ""),
        None => note.content.clone(),
    };
    let next_tags = match input.tags.as_deref() {
        Some(tags) => normalize_tags(Some(tags)),
        None => note.tags.clone(),
    };
    let next_pinned = input.pinned.unwrap_or(note.pinned);
    let did_content_change =
        next_title != note.title || next_content != note.content || next_tags != note.tags;

    Note {
        id: note.id.clone(),
        title: next_title,
        content: next_content,
        tags: next_tags,
        created_at: note.created_at.clone(),
        updated_at: if did_content_change {
            format_timestamp(Local::now())
        } else {
            note.updated_at.clone()
        },
        pinned: next_pinned,
    }
}

fn update_settings<F>(
    app: &AppHandle,
    storage: &StorageState,
    updater: F,
) -> CommandResult<AppSettings>
where
    F: FnOnce(&mut AppSettings),
{
    with_storage_lock(storage, || {
        let mut settings = read_settings_unlocked(app)?;
        updater(&mut settings);
        let normalized = normalize_settings(settings);
        write_settings_unlocked(app, &normalized)?;
        Ok(normalized)
    })
}

fn persist_window_size(
    app: &AppHandle,
    storage: &StorageState,
    width: u32,
    height: u32,
) -> CommandResult<()> {
    with_storage_lock(storage, || {
        let mut settings = read_settings_unlocked(app)?;
        settings.window.width = clamp_window_width(f64::from(width));
        settings.window.height = clamp_window_height(f64::from(height));
        let normalized = normalize_settings(settings);
        write_settings_unlocked(app, &normalized)
    })
}

fn read_window_bounds(window: &Window) -> CommandResult<WindowBounds> {
    let scale_factor = window
        .scale_factor()
        .map_err(|error| format!("StickyDesk: failed to read scale factor: {error}"))?;
    let position = window
        .outer_position()
        .map_err(|error| format!("StickyDesk: failed to read window position: {error}"))?;
    let size = window
        .inner_size()
        .map_err(|error| format!("StickyDesk: failed to read window size: {error}"))?;
    let logical_position = position.to_logical::<f64>(scale_factor);
    let logical_size = size.to_logical::<f64>(scale_factor);

    Ok(WindowBounds {
        x: logical_position.x.round() as i32,
        y: logical_position.y.round() as i32,
        width: clamp_window_width(logical_size.width),
        height: clamp_window_height(logical_size.height),
    })
}

pub fn apply_saved_window_preferences(app: &AppHandle) {
    let storage = app.state::<StorageState>();
    let settings = match with_storage_lock(&storage, || read_settings_unlocked(app)) {
        Ok(settings) => settings,
        Err(error) => {
            log::warn!("{error}");
            return;
        }
    };
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };

    if let Err(error) = window.set_size(Size::Logical(LogicalSize::<f64>::new(
        f64::from(settings.window.width),
        f64::from(settings.window.height),
    ))) {
        log::warn!("StickyDesk: failed to apply saved window size: {error}");
    }

    if let Err(error) = window.set_always_on_top(settings.always_on_top) {
        log::warn!("StickyDesk: failed to apply always-on-top: {error}");
    }
}

pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    if window.label() != MAIN_WINDOW_LABEL {
        return;
    }

    if let WindowEvent::CloseRequested { api, .. } = event {
        if APP_IS_QUITTING.load(Ordering::Relaxed) {
            return;
        }

        api.prevent_close();

        if let Err(error) = window.hide() {
            log::warn!("StickyDesk: failed to hide main window on close request: {error}");
        }

        return;
    }

    let WindowEvent::Resized(size) = event else {
        return;
    };

    let scale_factor = window.scale_factor().unwrap_or(1.0);
    let logical_size = size.to_logical::<f64>(scale_factor);
    let width = clamp_window_width(logical_size.width);
    let height = clamp_window_height(logical_size.height);
    let app = window.app_handle();
    let storage = window.state::<StorageState>();

    if let Err(error) = persist_window_size(&app, &storage, width, height) {
        log::warn!("{error}");
    }
}

#[tauri::command]
pub fn minimize_window(window: Window) -> CommandResult<()> {
    window
        .minimize()
        .map_err(|error| format!("StickyDesk: failed to minimize window: {error}"))
}

#[tauri::command]
pub fn close_window(window: Window) -> CommandResult<()> {
    window
        .hide()
        .map_err(|error| format!("StickyDesk: failed to hide window: {error}"))
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
pub fn set_window_size(
    window: Window,
    state: State<'_, StorageState>,
    width: f64,
    height: f64,
) -> CommandResult<WindowBounds> {
    let safe_width = clamp_window_width(width);
    let safe_height = clamp_window_height(height);

    window
        .set_size(Size::Logical(LogicalSize::<f64>::new(
            f64::from(safe_width),
            f64::from(safe_height),
        )))
        .map_err(|error| format!("StickyDesk: failed to resize window: {error}"))?;

    persist_window_size(&window.app_handle(), &state, safe_width, safe_height)?;

    Ok(read_window_bounds(&window).unwrap_or(WindowBounds {
        x: 0,
        y: 0,
        width: safe_width,
        height: safe_height,
    }))
}

#[tauri::command]
pub fn set_always_on_top(
    window: Window,
    state: State<'_, StorageState>,
    value: bool,
) -> CommandResult<bool> {
    window
        .set_always_on_top(value)
        .map_err(|error| format!("StickyDesk: failed to toggle always-on-top: {error}"))?;

    let applied_value = window.is_always_on_top().unwrap_or(value);

    update_settings(&window.app_handle(), &state, |settings| {
        settings.always_on_top = applied_value;
    })?;

    Ok(applied_value)
}

#[tauri::command]
pub fn is_cursor_inside_window(window: Window) -> CommandResult<bool> {
    let cursor = window
        .cursor_position()
        .map_err(|error| format!("StickyDesk: failed to read cursor position: {error}"))?;
    let position = window
        .outer_position()
        .map_err(|error| format!("StickyDesk: failed to read window position: {error}"))?;
    let size = window
        .outer_size()
        .map_err(|error| format!("StickyDesk: failed to read outer window size: {error}"))?;
    let left = f64::from(position.x);
    let top = f64::from(position.y);
    let right = left + f64::from(size.width);
    let bottom = top + f64::from(size.height);

    Ok(cursor.x >= left && cursor.x < right && cursor.y >= top && cursor.y < bottom)
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
    with_storage_lock(&state, || read_settings_unlocked(&app))
}

#[tauri::command]
pub fn set_theme(
    app: AppHandle,
    state: State<'_, StorageState>,
    theme_id: String,
) -> CommandResult<AppSettings> {
    update_settings(&app, &state, |settings| {
        settings.theme_id = theme_id;
    })
}

#[tauri::command]
pub fn set_ui_scale(
    app: AppHandle,
    state: State<'_, StorageState>,
    value: f64,
) -> CommandResult<AppSettings> {
    update_settings(&app, &state, |settings| {
        settings.ui_scale = value;
    })
}

#[tauri::command]
pub fn set_shell_opacity(
    app: AppHandle,
    state: State<'_, StorageState>,
    value: f64,
) -> CommandResult<AppSettings> {
    update_settings(&app, &state, |settings| {
        settings.shell_opacity = value;
    })
}

#[tauri::command]
pub fn set_note_sort(
    app: AppHandle,
    state: State<'_, StorageState>,
    field: String,
    direction: String,
) -> CommandResult<AppSettings> {
    update_settings(&app, &state, |settings| {
        settings.note_sort.field = field;
        settings.note_sort.direction = direction;
    })
}

#[tauri::command]
pub fn set_auto_fade_when_inactive(
    app: AppHandle,
    state: State<'_, StorageState>,
    value: bool,
) -> CommandResult<AppSettings> {
    update_settings(&app, &state, |settings| {
        settings.auto_fade_when_inactive = value;
    })
}

#[tauri::command]
pub fn list_notes(app: AppHandle, state: State<'_, StorageState>) -> CommandResult<Vec<Note>> {
    with_storage_lock(&state, || read_notes_unlocked(&app))
}

#[tauri::command]
pub fn create_note(
    app: AppHandle,
    state: State<'_, StorageState>,
    input: CreateNoteInput,
) -> CommandResult<Note> {
    with_storage_lock(&state, || {
        let mut notes = read_notes_unlocked(&app)?;
        let note = create_note_record(input);

        notes.insert(0, note.clone());
        write_notes_unlocked(&app, &notes)?;

        Ok(note)
    })
}

#[tauri::command]
pub fn update_note(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
    input: UpdateNoteInput,
) -> CommandResult<Option<Note>> {
    with_storage_lock(&state, || {
        let mut notes = read_notes_unlocked(&app)?;
        let Some(target_index) = notes.iter().position(|note| note.id == id) else {
            return Ok(None);
        };
        let note = update_note_record(&notes[target_index], input);

        notes[target_index] = note.clone();
        write_notes_unlocked(&app, &notes)?;

        Ok(Some(note))
    })
}

#[tauri::command]
pub fn delete_note(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
) -> CommandResult<bool> {
    with_storage_lock(&state, || {
        let mut notes = read_notes_unlocked(&app)?;
        let original_len = notes.len();

        notes.retain(|note| note.id != id);

        if notes.len() == original_len {
            return Ok(false);
        }

        write_notes_unlocked(&app, &notes)?;

        Ok(true)
    })
}

#[tauri::command]
pub fn list_future_tasks(
    app: AppHandle,
    state: State<'_, StorageState>,
) -> CommandResult<Vec<FutureTask>> {
    with_storage_lock(&state, || read_future_tasks_unlocked(&app))
}

#[tauri::command]
pub fn create_future_task(
    app: AppHandle,
    state: State<'_, StorageState>,
    input: CreateFutureTaskInput,
) -> CommandResult<FutureTask> {
    with_storage_lock(&state, || {
        let mut tasks = read_future_tasks_unlocked(&app)?;
        let task = create_future_task_record(input);

        tasks.push(task.clone());
        write_future_tasks_unlocked(&app, &tasks)?;

        Ok(task)
    })
}

#[tauri::command]
pub fn update_future_task(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
    input: UpdateFutureTaskInput,
) -> CommandResult<Option<FutureTask>> {
    with_storage_lock(&state, || {
        let mut tasks = read_future_tasks_unlocked(&app)?;
        let Some(target_index) = tasks.iter().position(|task| task.id == id) else {
            return Ok(None);
        };
        let task = update_future_task_record(&tasks[target_index], input);

        tasks[target_index] = task.clone();
        write_future_tasks_unlocked(&app, &tasks)?;

        Ok(Some(task))
    })
}

#[tauri::command]
pub fn delete_future_task(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
) -> CommandResult<bool> {
    with_storage_lock(&state, || {
        let mut tasks = read_future_tasks_unlocked(&app)?;
        let original_len = tasks.len();

        tasks.retain(|task| task.id != id);

        if tasks.len() == original_len {
            return Ok(false);
        }

        write_future_tasks_unlocked(&app, &tasks)?;

        Ok(true)
    })
}

#[tauri::command]
pub fn set_future_task_completed(
    app: AppHandle,
    state: State<'_, StorageState>,
    id: String,
    input: UpdateFutureTaskStatusInput,
) -> CommandResult<Option<FutureTask>> {
    with_storage_lock(&state, || {
        let mut tasks = read_future_tasks_unlocked(&app)?;
        let Some(target_index) = tasks.iter().position(|task| task.id == id) else {
            return Ok(None);
        };
        let task = update_future_task_status_record(&tasks[target_index], input);

        tasks[target_index] = task.clone();
        write_future_tasks_unlocked(&app, &tasks)?;

        Ok(Some(task))
    })
}
