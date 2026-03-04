mod sticky_desk;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(sticky_desk::StorageState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
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

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
