// 文件说明：后端设置类命令与设置持久化更新模块。
use tauri::{AppHandle, Manager, State, Window};

use super::normalization::{clamp_window_height, clamp_window_width, normalize_settings};
use super::storage::{read_settings_unlocked, write_settings_unlocked};
use super::{with_storage_lock, AppSettings, CommandResult, StorageState};

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

pub(super) fn persist_window_size(
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

pub(super) fn set_always_on_top(
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

pub(super) fn get_settings(
    app: AppHandle,
    state: State<'_, StorageState>,
) -> CommandResult<AppSettings> {
    with_storage_lock(&state, || read_settings_unlocked(&app))
}

pub(super) fn set_theme(
    app: AppHandle,
    state: State<'_, StorageState>,
    theme_id: String,
) -> CommandResult<AppSettings> {
    update_settings(&app, &state, |settings| {
        settings.theme_id = theme_id;
    })
}

pub(super) fn set_ui_scale(
    app: AppHandle,
    state: State<'_, StorageState>,
    value: f64,
) -> CommandResult<AppSettings> {
    update_settings(&app, &state, |settings| {
        settings.ui_scale = value;
    })
}

pub(super) fn set_shell_opacity(
    app: AppHandle,
    state: State<'_, StorageState>,
    value: f64,
) -> CommandResult<AppSettings> {
    update_settings(&app, &state, |settings| {
        settings.shell_opacity = value;
    })
}

pub(super) fn set_note_sort(
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

pub(super) fn set_auto_fade_when_inactive(
    app: AppHandle,
    state: State<'_, StorageState>,
    value: bool,
) -> CommandResult<AppSettings> {
    update_settings(&app, &state, |settings| {
        settings.auto_fade_when_inactive = value;
    })
}

