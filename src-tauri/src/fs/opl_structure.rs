use crate::error::AppError;
use std::fs;
use std::path::Path;

const OPL_DIRECTORIES: &[&str] = &[
    "CD",
    "DVD",
    "VMC",
    "CFG",
    "CHT",
    "ART",
    "THM",
];

pub struct OplStructure {
    root: std::path::PathBuf,
}

impl OplStructure {
    pub fn new(root: &Path) -> Self {
        Self {
            root: root.to_path_buf(),
        }
    }

    pub fn initialize(&self) -> Result<(), AppError> {
        for dir in OPL_DIRECTORIES {
            let path = self.root.join(dir);
            if !path.exists() {
                fs::create_dir_all(&path)?;
            }
        }
        Ok(())
    }

    pub fn is_initialized(&self) -> bool {
        OPL_DIRECTORIES.iter().all(|dir| self.root.join(dir).exists())
    }

    pub fn ul_cfg_path(&self) -> std::path::PathBuf {
        self.root.join("ul.cfg")
    }

    pub fn dvd_dir(&self) -> std::path::PathBuf {
        self.root.join("DVD")
    }

    pub fn cd_dir(&self) -> std::path::PathBuf {
        self.root.join("CD")
    }

    pub fn art_dir(&self) -> std::path::PathBuf {
        self.root.join("ART")
    }
}
