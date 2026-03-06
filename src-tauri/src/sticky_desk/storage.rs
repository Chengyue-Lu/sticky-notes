// 文件说明：后端本地文件存储读写模块（settings/notes/tasks）。
use std::{fs, path::PathBuf};

use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

use super::normalization::{
    default_future_tasks, default_notes, default_settings, future_tasks_payload_array,
    normalize_future_tasks_collection, normalize_notes_collection, normalize_settings_from_value,
    notes_payload_array,
};
use super::{AppSettings, CommandResult, FutureTask, Note, FUTURE_TASKS_FILE_NAME, NOTES_FILE_NAME, SETTINGS_FILE_NAME};

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

pub(super) fn write_settings_unlocked(app: &AppHandle, settings: &AppSettings) -> CommandResult<()> {
    write_json_file(app, SETTINGS_FILE_NAME, settings)
}

pub(super) fn read_settings_unlocked(app: &AppHandle) -> CommandResult<AppSettings> {
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

pub(super) fn write_notes_unlocked(app: &AppHandle, notes: &[Note]) -> CommandResult<()> {
    write_json_file(
        app,
        NOTES_FILE_NAME,
        &json!({ "version": 1, "notes": notes }),
    )
}

pub(super) fn read_notes_unlocked(app: &AppHandle) -> CommandResult<Vec<Note>> {
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

pub(super) fn write_future_tasks_unlocked(app: &AppHandle, tasks: &[FutureTask]) -> CommandResult<()> {
    write_json_file(
        app,
        FUTURE_TASKS_FILE_NAME,
        &json!({ "version": 1, "tasks": tasks }),
    )
}

pub(super) fn read_future_tasks_unlocked(app: &AppHandle) -> CommandResult<Vec<FutureTask>> {
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

