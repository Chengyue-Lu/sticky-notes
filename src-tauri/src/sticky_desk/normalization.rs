// 文件说明：后端数据归一化与默认值工具模块。
use chrono::{DateTime, Duration, Local, LocalResult, NaiveDateTime, TimeZone, Timelike};
use serde_json::Value;
use uuid::Uuid;

use super::{
    AppSettings, FutureTask, Note, NoteSortSettings, WindowSettings, DEFAULT_NOTE_SORT_DIRECTION,
    DEFAULT_NOTE_SORT_FIELD, DEFAULT_THEME_ID, DEFAULT_WINDOW_HEIGHT, MAX_SHELL_OPACITY,
    MAX_UI_SCALE, MAX_WINDOW_HEIGHT, MAX_WINDOW_WIDTH, MIN_SHELL_OPACITY, MIN_UI_SCALE,
    MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, TIMESTAMP_FORMAT, TIMESTAMP_INPUT_FORMAT,
    TIMESTAMP_INPUT_FORMAT_SHORT, UNTITLED_NOTE_TITLE, UNTITLED_TASK_TITLE,
};

pub(super) fn format_timestamp(date: DateTime<Local>) -> String {
    date.format(TIMESTAMP_FORMAT).to_string()
}

fn localize_naive_timestamp(value: NaiveDateTime) -> DateTime<Local> {
    match Local.from_local_datetime(&value) {
        LocalResult::Single(date) => date,
        LocalResult::Ambiguous(date, _) => date,
        LocalResult::None => Local.from_utc_datetime(&value),
    }
}

pub(super) fn parse_timestamp(value: &str) -> Option<DateTime<Local>> {
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

pub(super) fn clamp_window_width(value: f64) -> u32 {
    clamp_rounded(value, MIN_WINDOW_WIDTH, MAX_WINDOW_WIDTH)
}

pub(super) fn clamp_window_height(value: f64) -> u32 {
    clamp_rounded(value, MIN_WINDOW_HEIGHT, MAX_WINDOW_HEIGHT)
}

pub(super) fn clamp_ui_scale(value: f64) -> f64 {
    if !value.is_finite() {
        return MIN_UI_SCALE;
    }

    (value.clamp(MIN_UI_SCALE, MAX_UI_SCALE) * 10.0).round() / 10.0
}

pub(super) fn clamp_shell_opacity(value: f64) -> f64 {
    if !value.is_finite() {
        return MAX_SHELL_OPACITY;
    }

    (value.clamp(MIN_SHELL_OPACITY, MAX_SHELL_OPACITY) * 100.0).round() / 100.0
}

pub(super) fn normalize_theme_id(value: &str) -> String {
    match value {
        "white" | "yellow" | "blue" | "green" | "purple" => value.to_string(),
        _ => DEFAULT_THEME_ID.to_string(),
    }
}

pub(super) fn normalize_note_sort_field(value: &str) -> String {
    match value {
        "createdAt" | "updatedAt" => value.to_string(),
        _ => DEFAULT_NOTE_SORT_FIELD.to_string(),
    }
}

pub(super) fn normalize_note_sort_direction(value: &str) -> String {
    match value {
        "desc" | "asc" => value.to_string(),
        _ => DEFAULT_NOTE_SORT_DIRECTION.to_string(),
    }
}

pub(super) fn normalize_title(value: Option<&str>, fallback: &str) -> String {
    let trimmed = value.unwrap_or_default().trim();

    if trimmed.is_empty() {
        return fallback.to_string();
    }

    trimmed.to_string()
}

pub(super) fn normalize_plain_string(value: Option<&str>, fallback: &str) -> String {
    value.unwrap_or(fallback).to_string()
}

pub(super) fn normalize_tags(values: Option<&[String]>) -> Vec<String> {
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

pub(super) fn default_settings() -> AppSettings {
    AppSettings {
        theme_id: DEFAULT_THEME_ID.to_string(),
        ui_scale: MIN_UI_SCALE,
        shell_opacity: MAX_SHELL_OPACITY,
        always_on_top: false,
        auto_fade_when_inactive: true,
        window: WindowSettings {
            width: MIN_WINDOW_WIDTH,
            height: DEFAULT_WINDOW_HEIGHT,
        },
        note_sort: NoteSortSettings {
            field: DEFAULT_NOTE_SORT_FIELD.to_string(),
            direction: DEFAULT_NOTE_SORT_DIRECTION.to_string(),
        },
    }
}

pub(super) fn normalize_settings(settings: AppSettings) -> AppSettings {
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

pub(super) fn normalize_settings_from_value(value: &Value) -> AppSettings {
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

pub(super) fn default_notes() -> Vec<Note> {
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

pub(super) fn default_future_tasks() -> Vec<FutureTask> {
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

pub(super) fn normalize_notes_collection(values: &[Value]) -> Vec<Note> {
    values
        .iter()
        .enumerate()
        .filter_map(|(index, value)| normalize_note_value(value, index))
        .collect()
}

pub(super) fn normalize_future_tasks_collection(values: &[Value]) -> Vec<FutureTask> {
    values
        .iter()
        .enumerate()
        .filter_map(|(index, value)| normalize_future_task_value(value, index))
        .collect()
}

pub(super) fn notes_payload_array(value: &Value) -> Option<&[Value]> {
    value.as_array().map(Vec::as_slice).or_else(|| {
        value
            .get("notes")
            .and_then(Value::as_array)
            .map(Vec::as_slice)
    })
}

pub(super) fn future_tasks_payload_array(value: &Value) -> Option<&[Value]> {
    value.as_array().map(Vec::as_slice).or_else(|| {
        value
            .get("tasks")
            .and_then(Value::as_array)
            .map(Vec::as_slice)
    })
}

