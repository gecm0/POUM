use crate::core::splitter::ConversionProgress;
use crate::core::{IsoSplitter, UlConfig};
use crate::fs::OplStructure;
use std::path::Path;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

#[derive(Clone, serde::Serialize)]
pub struct ConversionEvent {
    pub current_part: u8,
    pub total_parts: u8,
    pub bytes_written: u64,
    pub total_bytes: u64,
    pub percent: f64,
}

#[tauri::command]
pub async fn convert_iso(
    app: AppHandle,
    iso_path: String,
    mount_point: String,
    game_name: String,
) -> Result<(), String> {
    let structure = OplStructure::new(Path::new(&mount_point));
    
    if !structure.is_initialized() {
        structure.initialize().map_err(|e| e.to_string())?;
    }
    
    // USBExtreme chunks go in the ROOT of the drive, not in DVD folder
    let output_dir = Path::new(&mount_point);
    let splitter = IsoSplitter::new(Path::new(&iso_path), output_dir, game_name);
    
    let (tx, mut rx) = mpsc::channel::<ConversionProgress>(100);
    
    let app_clone = app.clone();
    tokio::spawn(async move {
        while let Some(progress) = rx.recv().await {
            let percent = (progress.bytes_written as f64 / progress.total_bytes as f64) * 100.0;
            let event = ConversionEvent {
                current_part: progress.current_part,
                total_parts: progress.total_parts,
                bytes_written: progress.bytes_written,
                total_bytes: progress.total_bytes,
                percent,
            };
            let _ = app_clone.emit("conversion-progress", event);
        }
    });
    
    let game = tokio::task::spawn_blocking(move || {
        splitter.convert(Some(tx))
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;
    
    let ul_cfg_path = structure.ul_cfg_path();
    let mut config = UlConfig::load(&ul_cfg_path).map_err(|e| e.to_string())?;
    config.add_game(game).map_err(|e| e.to_string())?;
    config.save().map_err(|e| e.to_string())?;
    
    Ok(())
}
