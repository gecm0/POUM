use crate::core::{get_game_name_crc, Game, UlConfig};
use crate::fs::OplStructure;
use std::path::Path;

#[tauri::command]
pub fn list_games(mount_point: String) -> Result<Vec<Game>, String> {
    let structure = OplStructure::new(Path::new(&mount_point));
    let ul_cfg_path = structure.ul_cfg_path();
    let root = Path::new(&mount_point);
    
    let config = UlConfig::load(&ul_cfg_path).map_err(|e| e.to_string())?;
    
    let games: Vec<Game> = config.games.into_iter().map(|mut game| {
        let crc = get_game_name_crc(&game.name);
        let size = calculate_game_size(root, &crc, &game.serial, game.parts);
        game.crc = crc;
        game.size_bytes = size;
        game
    }).collect();
    
    Ok(games)
}

fn calculate_game_size(root: &Path, crc: &str, serial: &str, parts: u8) -> u64 {
    let mut total: u64 = 0;
    for part in 0..parts {
        let filename = format!("ul.{}.{}.{:02}", crc, serial, part);
        let path = root.join(&filename);
        if let Ok(metadata) = std::fs::metadata(&path) {
            total += metadata.len();
        }
    }
    total
}

#[tauri::command]
pub fn rename_game(mount_point: String, old_name: String, new_name: String) -> Result<(), String> {
    let structure = OplStructure::new(Path::new(&mount_point));
    let ul_cfg_path = structure.ul_cfg_path();
    
    let mut config = UlConfig::load(&ul_cfg_path).map_err(|e| e.to_string())?;
    config.rename_game(&old_name, &new_name).map_err(|e| e.to_string())?;
    config.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_game(mount_point: String, game_name: String) -> Result<(), String> {
    let structure = OplStructure::new(Path::new(&mount_point));
    let ul_cfg_path = structure.ul_cfg_path();
    let root = Path::new(&mount_point);
    
    let mut config = UlConfig::load(&ul_cfg_path).map_err(|e| e.to_string())?;
    let game = config.remove_game(&game_name).map_err(|e| e.to_string())?;
    
    delete_game_chunks(root, &game)?;
    
    config.save().map_err(|e| e.to_string())
}

fn delete_game_chunks(root: &Path, game: &Game) -> Result<(), String> {
    let crc = get_game_name_crc(&game.name);
    let pattern = format!("ul.{}.{}.", crc, game.serial);
    
    for entry in std::fs::read_dir(root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let filename = entry.file_name().to_string_lossy().to_string();
        if filename.starts_with(&pattern) {
            std::fs::remove_file(entry.path()).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}
