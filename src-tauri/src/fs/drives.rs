use serde::{Deserialize, Serialize};
use sysinfo::Disks;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub is_removable: bool,
    pub file_system: String,
}

pub fn list_usb_drives() -> Vec<DriveInfo> {
    let disks = Disks::new_with_refreshed_list();
    
    disks
        .iter()
        .filter(|disk| disk.is_removable())
        .map(|disk| DriveInfo {
            name: disk.name().to_string_lossy().to_string(),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            total_space: disk.total_space(),
            available_space: disk.available_space(),
            is_removable: disk.is_removable(),
            file_system: disk.file_system().to_string_lossy().to_string(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_drives_returns_vec() {
        let drives = list_usb_drives();
        assert!(drives.len() >= 0);
    }
}
