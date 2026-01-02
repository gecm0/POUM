//! ul.cfg parser and writer for USBExtreme format.
//!
//! The ul.cfg file is a binary database containing game entries.
//! Each entry is exactly 64 bytes with a fixed structure.

use crate::core::game::{Game, MediaType};
use crate::error::AppError;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

/// Size of each game entry in ul.cfg (64 bytes)
pub const UL_ENTRY_SIZE: usize = 64;

/// Size of the game name field (32 bytes)
pub const UL_NAME_SIZE: usize = 32;

/// Size of the serial/game ID field (12 bytes)
pub const UL_SERIAL_SIZE: usize = 12;

/// Media type constant for CD (0x12)
pub const MEDIA_TYPE_CD: u8 = 0x12;

/// Media type constant for DVD (0x14)
pub const MEDIA_TYPE_DVD: u8 = 0x14;

/// USBExtreme magic byte (0x08)
pub const USBEXTREME_MAGIC: u8 = 0x08;

/// ul.cfg binary entry structure offsets
mod offsets {
    pub const NAME: usize = 0;          // 0x00: Game name (32 bytes)
    pub const PREFIX: usize = 32;       // 0x20: "ul." prefix (3 bytes)
    pub const SERIAL: usize = 35;       // 0x23: Game serial (12 bytes)
    pub const PARTS: usize = 47;        // 0x2F: Number of chunks (1 byte)
    pub const MEDIA: usize = 48;        // 0x30: Media type (1 byte)
    pub const PAD1: usize = 49;         // 0x31: Padding (4 bytes)
    pub const MAGIC: usize = 53;        // 0x35: Magic byte 0x08 (1 byte)
    pub const PAD2: usize = 54;         // 0x36: Padding (10 bytes)
}

/// Represents the ul.cfg file containing all game entries
pub struct UlConfig {
    path: std::path::PathBuf,
    pub games: Vec<Game>,
}

impl UlConfig {
    /// Create a new empty ul.cfg configuration
    pub fn new(path: &Path) -> Self {
        UlConfig {
            path: path.to_path_buf(),
            games: Vec::new(),
        }
    }

    /// Load an existing ul.cfg file from disk
    pub fn load(path: &Path) -> Result<Self, AppError> {
        let mut config = UlConfig::new(path);

        if !path.exists() {
            return Ok(config);
        }

        let data = fs::read(path)?;

        if data.len() % UL_ENTRY_SIZE != 0 {
            return Err(AppError::InvalidUlConfig(
                "File size is not a multiple of 64 bytes".into(),
            ));
        }

        for chunk in data.chunks_exact(UL_ENTRY_SIZE) {
            let game = Self::parse_entry(chunk)?;
            config.games.push(game);
        }

        Ok(config)
    }

    /// Parse a single 64-byte entry into a Game struct
    fn parse_entry(data: &[u8]) -> Result<Game, AppError> {
        if data.len() != UL_ENTRY_SIZE {
            return Err(AppError::InvalidUlConfig("Entry must be 64 bytes".into()));
        }

        // Parse name (strip null bytes)
        let name_bytes = &data[offsets::NAME..offsets::NAME + UL_NAME_SIZE];
        let name = String::from_utf8_lossy(name_bytes)
            .trim_end_matches('\0')
            .to_string();

        // Parse serial (strip null bytes)
        let serial_bytes = &data[offsets::SERIAL..offsets::SERIAL + UL_SERIAL_SIZE];
        let serial = String::from_utf8_lossy(serial_bytes)
            .trim_end_matches('\0')
            .to_string();

        // Parse parts count
        let parts = data[offsets::PARTS];

        // Parse media type
        let media_type = match data[offsets::MEDIA] {
            MEDIA_TYPE_CD => MediaType::CD,
            MEDIA_TYPE_DVD => MediaType::DVD,
            other => {
                return Err(AppError::InvalidUlConfig(format!(
                    "Unknown media type: 0x{:02X}",
                    other
                )))
            }
        };

        Ok(Game {
            name,
            serial,
            parts,
            media_type,
            size_bytes: 0, // Will be calculated from actual chunks
            crc: String::new(), // Will be calculated if needed
        })
    }

    /// Save the ul.cfg file to disk
    pub fn save(&self) -> Result<(), AppError> {
        let mut file = File::create(&self.path)?;
        
        for game in &self.games {
            let entry = Self::compose_entry(game);
            file.write_all(&entry)?;
        }

        Ok(())
    }

    /// Compose a 64-byte entry from a Game struct
    fn compose_entry(game: &Game) -> [u8; UL_ENTRY_SIZE] {
        let mut entry = [0u8; UL_ENTRY_SIZE];

        // Write name (padded to 32 bytes)
        let name_bytes = game.name.as_bytes();
        let name_len = name_bytes.len().min(UL_NAME_SIZE);
        entry[offsets::NAME..offsets::NAME + name_len].copy_from_slice(&name_bytes[..name_len]);

        // Write "ul." prefix
        entry[offsets::PREFIX] = 0x75; // 'u'
        entry[offsets::PREFIX + 1] = 0x6c; // 'l'
        entry[offsets::PREFIX + 2] = 0x2e; // '.'

        // Write serial (padded to 12 bytes)
        let serial_bytes = game.serial.as_bytes();
        let serial_len = serial_bytes.len().min(UL_SERIAL_SIZE);
        entry[offsets::SERIAL..offsets::SERIAL + serial_len]
            .copy_from_slice(&serial_bytes[..serial_len]);

        // Write parts count
        entry[offsets::PARTS] = game.parts;

        // Write media type
        entry[offsets::MEDIA] = match game.media_type {
            MediaType::CD => MEDIA_TYPE_CD,
            MediaType::DVD => MEDIA_TYPE_DVD,
        };

        // Write magic byte
        entry[offsets::MAGIC] = USBEXTREME_MAGIC;

        entry
    }

    /// Add a game to the configuration
    pub fn add_game(&mut self, game: Game) -> Result<(), AppError> {
        // Check for duplicates
        if self.games.iter().any(|g| g.name == game.name) {
            return Err(AppError::GameAlreadyExists(game.name));
        }

        self.games.push(game);
        Ok(())
    }

    /// Remove a game by name
    pub fn remove_game(&mut self, name: &str) -> Result<Game, AppError> {
        let idx = self
            .games
            .iter()
            .position(|g| g.name == name)
            .ok_or_else(|| AppError::GameNotFound(name.to_string()))?;

        Ok(self.games.remove(idx))
    }

    /// Find a game by name
    pub fn find_game(&self, name: &str) -> Option<&Game> {
        self.games.iter().find(|g| g.name == name)
    }

    /// Rename a game
    pub fn rename_game(&mut self, old_name: &str, new_name: &str) -> Result<(), AppError> {
        // Validate new name length
        if new_name.as_bytes().len() > UL_NAME_SIZE {
            return Err(AppError::InvalidGameName(format!(
                "Name exceeds {} bytes",
                UL_NAME_SIZE
            )));
        }

        // Check if new name already exists
        if self.games.iter().any(|g| g.name == new_name) {
            return Err(AppError::GameAlreadyExists(new_name.to_string()));
        }

        // Find and rename
        let game = self
            .games
            .iter_mut()
            .find(|g| g.name == old_name)
            .ok_or_else(|| AppError::GameNotFound(old_name.to_string()))?;

        game.name = new_name.to_string();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compose_and_parse_entry() {
        let game = Game {
            name: "Test Game".to_string(),
            serial: "SLUS_123.45".to_string(),
            parts: 3,
            media_type: MediaType::DVD,
            size_bytes: 0,
            crc: String::new(),
        };

        let entry = UlConfig::compose_entry(&game);
        assert_eq!(entry.len(), UL_ENTRY_SIZE);

        let parsed = UlConfig::parse_entry(&entry).unwrap();
        assert_eq!(parsed.name, game.name);
        assert_eq!(parsed.serial, game.serial);
        assert_eq!(parsed.parts, game.parts);
        assert!(matches!(parsed.media_type, MediaType::DVD));
    }

    #[test]
    fn test_entry_size() {
        assert_eq!(UL_ENTRY_SIZE, 64);
    }
}
