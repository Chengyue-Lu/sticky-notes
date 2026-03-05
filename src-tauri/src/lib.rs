mod sticky_desk;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_autostart::ManagerExt;

const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_SHOW_ID: &str = "tray_show";
const TRAY_QUIT_ID: &str = "tray_quit";

fn show_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };

    if let Err(error) = window.show() {
        log::warn!("StickyDesk: failed to show main window from tray: {error}");
        return;
    }

    if let Err(error) = window.set_focus() {
        log::warn!("StickyDesk: failed to focus main window from tray: {error}");
    }
}

fn hide_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };

    if let Err(error) = window.hide() {
        log::warn!("StickyDesk: failed to hide main window: {error}");
    }
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, TRAY_SHOW_ID, "Show StickyDesk", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, TRAY_QUIT_ID, "Quit", true, None::<&str>)?;
    let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let mut tray_builder = TrayIconBuilder::with_id("main-tray")
        .menu(&tray_menu)
        .tooltip("StickyDesk")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            if event.id() == TRAY_SHOW_ID {
                show_main_window(app);
            } else if event.id() == TRAY_QUIT_ID {
                sticky_desk::request_app_exit(app);
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    }

    tray_builder.build(app)?;

    Ok(())
}

fn should_start_hidden_from_autostart() -> bool {
    std::env::args().any(|argument| argument == "--autostart")
}

fn ensure_autostart_enabled(app: &AppHandle) {
    let autostart = app.autolaunch();
    let is_enabled = autostart.is_enabled();

    match is_enabled {
        Ok(true) => {}
        Ok(false) => {
            if let Err(error) = autostart.enable() {
                log::warn!("StickyDesk: failed to enable autostart: {error}");
            }
        }
        Err(error) => {
            log::warn!("StickyDesk: failed to read autostart state: {error}");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .arg("--autostart")
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .manage(sticky_desk::StorageState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            sticky_desk::should_show_window_on_boot,
            sticky_desk::get_idle_seconds,
            sticky_desk::minimize_window,
            sticky_desk::close_window,
            sticky_desk::set_window_size,
            sticky_desk::set_always_on_top,
            sticky_desk::is_cursor_inside_window,
            sticky_desk::get_settings,
            sticky_desk::set_theme,
            sticky_desk::set_ui_scale,
            sticky_desk::set_shell_opacity,
            sticky_desk::set_note_sort,
            sticky_desk::set_auto_fade_when_inactive,
            sticky_desk::list_notes,
            sticky_desk::create_note,
            sticky_desk::update_note,
            sticky_desk::delete_note,
            sticky_desk::list_future_tasks,
            sticky_desk::create_future_task,
            sticky_desk::update_future_task,
            sticky_desk::set_future_task_completed,
            sticky_desk::delete_future_task,
        ])
        .on_window_event(|window, event| {
            sticky_desk::handle_window_event(window, event);
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            sticky_desk::apply_saved_window_preferences(app.handle());
            ensure_autostart_enabled(app.handle());
            setup_tray(app.handle())?;

            if should_start_hidden_from_autostart() {
                hide_main_window(app.handle());
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
