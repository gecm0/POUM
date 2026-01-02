//! Error types for the PS2 USB Manager application.

use thiserror::Error;

/// Application-level errors
#[derive(Error, Debug)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("ISO parse error: {0}")]
    IsoParse(String),

    #[error("Invalid ul.cfg format: {0}")]
    InvalidUlConfig(String),

    #[error("Game not found: {0}")]
    GameNotFound(String),

    #[error("Drive not found: {0}")]
    DriveNotFound(String),

    #[error("Insufficient space: need {needed} bytes, have {available} bytes")]
    InsufficientSpace { needed: u64, available: u64 },

    #[error("Invalid game name: {0}")]
    InvalidGameName(String),

    #[error("Game already exists: {0}")]
    GameAlreadyExists(String),

    #[error("Conversion cancelled")]
    ConversionCancelled,
}

impl From<AppError> for String {
    fn from(err: AppError) -> String {
        err.to_string()
    }
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
