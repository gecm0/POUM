use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MediaType {
    CD,
    DVD,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub name: String,
    pub serial: String,
    pub parts: u8,
    pub media_type: MediaType,
    pub size_bytes: u64,
    pub crc: String,
}

impl Game {
    pub fn new(name: String, serial: String, parts: u8, media_type: MediaType) -> Self {
        Self {
            name,
            serial,
            parts,
            media_type,
            size_bytes: 0,
            crc: String::new(),
        }
    }
}
