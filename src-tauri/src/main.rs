// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// 文件说明：Tauri 可执行入口，调用后端 run 启动应用。

fn main() {
    app_lib::run();
}
