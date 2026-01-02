mod commands;
mod core;
mod error;
mod fs;

use commands::conversion::convert_iso;
use commands::drives::{get_drives, initialize_drive, is_drive_initialized};
use commands::games::{delete_game, list_games, rename_game};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_drives,
            initialize_drive,
            is_drive_initialized,
            list_games,
            rename_game,
            delete_game,
            convert_iso,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
