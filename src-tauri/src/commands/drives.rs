use crate::fs::{list_usb_drives, DriveInfo, OplStructure};

#[tauri::command]
pub fn get_drives() -> Vec<DriveInfo> {
    list_usb_drives()
}

#[tauri::command]
pub fn initialize_drive(mount_point: String) -> Result<(), String> {
    let structure = OplStructure::new(std::path::Path::new(&mount_point));
    structure.initialize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_drive_initialized(mount_point: String) -> bool {
    let structure = OplStructure::new(std::path::Path::new(&mount_point));
    structure.is_initialized()
}
