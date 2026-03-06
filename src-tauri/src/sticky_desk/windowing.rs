// 文件说明：后端窗口几何、布局与窗口事件处理模块。
use std::sync::atomic::Ordering;

use tauri::{AppHandle, LogicalSize, Manager, Size, State, Window, WindowEvent};

use super::{
    clamp_window_height, clamp_window_width,
    with_storage_lock, CommandResult, StorageState, APP_IS_QUITTING, IGNORE_NEXT_MAIN_RESIZE_PERSIST,
    MAIN_WINDOW_COMPACT_HEIGHT, MAIN_WINDOW_HEIGHT_BEFORE_COMPACT, MAIN_WINDOW_LABEL,
    MAIN_WINDOW_LAYOUT_IS_COMPACT, TEST_WINDOW_GAP, TEST_WINDOW_HEIGHT, TEST_WINDOW_WIDTH,
};
use super::commands_settings::persist_window_size;
use super::storage::read_settings_unlocked;

fn clamp_i64(value: i64, minimum: i64, maximum: i64) -> i64 {
    if maximum < minimum {
        return minimum;
    }

    value.clamp(minimum, maximum)
}

fn read_window_width(window: &Window) -> CommandResult<u32> {
    let scale_factor = window
        .scale_factor()
        .map_err(|error| format!("StickyDesk: failed to read scale factor: {error}"))?;
    let size = window
        .inner_size()
        .map_err(|error| format!("StickyDesk: failed to read window size: {error}"))?;
    let logical_size = size.to_logical::<f64>(scale_factor);

    Ok(clamp_window_width(logical_size.width))
}

fn read_window_height(window: &Window) -> CommandResult<u32> {
    let scale_factor = window
        .scale_factor()
        .map_err(|error| format!("StickyDesk: failed to read scale factor: {error}"))?;
    let size = window
        .inner_size()
        .map_err(|error| format!("StickyDesk: failed to read window size: {error}"))?;
    let logical_size = size.to_logical::<f64>(scale_factor);

    Ok(clamp_window_height(logical_size.height))
}

pub(super) fn resolve_test_window_position(window: &Window) -> CommandResult<(f64, f64)> {
    let current_position = window
        .outer_position()
        .map_err(|error| format!("StickyDesk: failed to read current window position: {error}"))?;
    let current_size = window
        .outer_size()
        .map_err(|error| format!("StickyDesk: failed to read current window size: {error}"))?;
    let monitor = window
        .current_monitor()
        .map_err(|error| format!("StickyDesk: failed to read current monitor: {error}"))?
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "StickyDesk: no monitor found for test window.".to_string())?;
    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let monitor_left = i64::from(monitor_position.x);
    let monitor_top = i64::from(monitor_position.y);
    let monitor_right = monitor_left + i64::from(monitor_size.width);
    let monitor_bottom = monitor_top + i64::from(monitor_size.height);
    let current_left = i64::from(current_position.x);
    let current_top = i64::from(current_position.y);
    let current_right = current_left + i64::from(current_size.width);
    let left_space = current_left - monitor_left;
    let right_space = monitor_right - current_right;
    let test_width = TEST_WINDOW_WIDTH.round() as i64;
    let test_height = TEST_WINDOW_HEIGHT.round() as i64;
    // When spaces are equal, place on the right side for deterministic behavior.
    let place_on_right = right_space >= left_space;
    let suggested_x = if place_on_right {
        current_right + TEST_WINDOW_GAP
    } else {
        current_left - test_width - TEST_WINDOW_GAP
    };
    let max_x = monitor_right - test_width;
    let max_y = monitor_bottom - test_height;
    let x = clamp_i64(suggested_x, monitor_left, max_x);
    let y = clamp_i64(current_top, monitor_top, max_y);

    Ok((x as f64, y as f64))
}

pub(super) fn apply_saved_window_preferences(app: &AppHandle) {
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

pub(super) fn handle_window_event(window: &Window, event: &WindowEvent) {
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

    if MAIN_WINDOW_LAYOUT_IS_COMPACT.load(Ordering::Relaxed) {
        return;
    }

    if IGNORE_NEXT_MAIN_RESIZE_PERSIST.swap(false, Ordering::Relaxed) {
        return;
    }

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

pub(super) fn set_main_window_layout_compact(
    window: Window,
    state: State<'_, StorageState>,
    compact: bool,
) -> CommandResult<()> {
    if window.label() != MAIN_WINDOW_LABEL {
        return Ok(());
    }

    let width = read_window_width(&window)?;
    let height = if compact {
        let current_height = read_window_height(&window)?;
        match MAIN_WINDOW_HEIGHT_BEFORE_COMPACT.lock() {
            Ok(mut value) => {
                *value = Some(current_height);
            }
            Err(_) => {
                log::warn!("StickyDesk: failed to cache pre-compact window height.");
            }
        }
        MAIN_WINDOW_LAYOUT_IS_COMPACT.store(true, Ordering::Relaxed);
        MAIN_WINDOW_COMPACT_HEIGHT
    } else {
        let cached_height = match MAIN_WINDOW_HEIGHT_BEFORE_COMPACT.lock() {
            Ok(mut value) => value.take(),
            Err(_) => {
                log::warn!("StickyDesk: failed to read pre-compact window height.");
                None
            }
        };

        cached_height.unwrap_or(
            with_storage_lock(&state, || read_settings_unlocked(&window.app_handle()))
                .map(|settings| settings.window.height)?,
        )
    };

    if !compact {
        MAIN_WINDOW_LAYOUT_IS_COMPACT.store(false, Ordering::Relaxed);
    }

    IGNORE_NEXT_MAIN_RESIZE_PERSIST.store(true, Ordering::Relaxed);
    window
        .set_size(Size::Logical(LogicalSize::<f64>::new(
            f64::from(width),
            f64::from(height),
        )))
        .map_err(|error| format!("StickyDesk: failed to set layout window size: {error}"))?;

    Ok(())
}

pub(super) fn is_cursor_inside_window(window: Window) -> CommandResult<bool> {
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

