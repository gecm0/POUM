use crate::error::AppError;
use iso9660::{DirectoryEntry, ISO9660};
use regex::Regex;
use std::fs::File;
use std::io::Read;
use std::path::Path;

const BOOT2_PATTERN: &str = r"BOOT2\s*=\s*cdrom0:\\([A-Z]{4}_\d{3}\.\d{2});";

pub struct IsoParser {
    path: std::path::PathBuf,
    size: u64,
}

impl IsoParser {
    pub fn open(path: &Path) -> Result<Self, AppError> {
        let file = File::open(path)?;
        let size = file.metadata()?.len();
        Ok(Self {
            path: path.to_path_buf(),
            size,
        })
    }

    pub fn size(&self) -> u64 {
        self.size
    }

    pub fn extract_game_id(&self) -> Result<String, AppError> {
        let content = self.read_system_cnf()?;
        self.parse_boot2(&content)
    }

    fn read_system_cnf(&self) -> Result<String, AppError> {
        let file = File::open(&self.path)?;
        let fs = ISO9660::new(file)
            .map_err(|e| AppError::IsoParse(format!("Failed to parse ISO9660: {}", e)))?;

        let possible_names = [
            "SYSTEM.CNF",
            "SYSTEM.CNF;1",
            "system.cnf",
            "system.cnf;1",
        ];

        for name in &possible_names {
            match fs.open(name) {
                Ok(Some(DirectoryEntry::File(entry))) => {
                    let mut contents = Vec::new();
                    entry
                        .read()
                        .read_to_end(&mut contents)
                        .map_err(|e| AppError::IsoParse(format!("Failed to read SYSTEM.CNF: {}", e)))?;
                    return String::from_utf8(contents)
                        .map_err(|e| AppError::IsoParse(format!("SYSTEM.CNF is not valid UTF-8: {}", e)));
                }
                Ok(Some(_)) => continue,
                Ok(None) => continue,
                Err(_) => continue,
            }
        }

        Err(AppError::IsoParse(
            "Could not find SYSTEM.CNF in ISO. This may not be a valid PS2 disc image.".into(),
        ))
    }

    fn parse_boot2(&self, content: &str) -> Result<String, AppError> {
        let re = Regex::new(BOOT2_PATTERN)
            .map_err(|e| AppError::IsoParse(format!("Regex error: {}", e)))?;

        if let Some(caps) = re.captures(content) {
            if let Some(game_id) = caps.get(1) {
                return Ok(game_id.as_str().to_string());
            }
        }

        let simple_re = Regex::new(r"([A-Z]{4}_\d{3}\.\d{2})")
            .map_err(|e| AppError::IsoParse(format!("Regex error: {}", e)))?;

        if let Some(caps) = simple_re.captures(content) {
            if let Some(game_id) = caps.get(1) {
                return Ok(game_id.as_str().to_string());
            }
        }

        Err(AppError::IsoParse(format!(
            "Could not extract game ID from SYSTEM.CNF. Content: {}",
            content.chars().take(200).collect::<String>()
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_boot2_standard() {
        let parser = IsoParser {
            path: std::path::PathBuf::new(),
            size: 0,
        };
        let content = "BOOT2 = cdrom0:\\SLUS_200.62;1";
        let result = parser.parse_boot2(content);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "SLUS_200.62");
    }

    #[test]
    fn test_parse_boot2_with_spaces() {
        let parser = IsoParser {
            path: std::path::PathBuf::new(),
            size: 0,
        };
        let content = "BOOT2  =  cdrom0:\\SCES_505.91;1";
        let result = parser.parse_boot2(content);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "SCES_505.91");
    }

    #[test]
    fn test_parse_boot2_multiline() {
        let parser = IsoParser {
            path: std::path::PathBuf::new(),
            size: 0,
        };
        let content = "BOOT2 = cdrom0:\\SCUS_971.24;1\nVER = 1.00\nVMODE = NTSC";
        let result = parser.parse_boot2(content);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "SCUS_971.24");
    }
}
