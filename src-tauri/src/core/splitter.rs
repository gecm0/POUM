use crate::core::{get_game_name_crc, Game, IsoParser, MediaType};
use crate::error::AppError;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use tokio::sync::mpsc;

pub const CHUNK_SIZE: u64 = 1_073_741_824; // 1GB

pub const DVD_SIZE_THRESHOLD: u64 = 700 * 1024 * 1024; // 700MB

#[derive(Debug, Clone)]
pub struct ConversionProgress {
    pub current_part: u8,
    pub total_parts: u8,
    pub bytes_written: u64,
    pub total_bytes: u64,
}

pub struct IsoSplitter {
    iso_path: std::path::PathBuf,
    output_dir: std::path::PathBuf,
    game_name: String,
}

impl IsoSplitter {
    pub fn new(iso_path: &Path, output_dir: &Path, game_name: String) -> Self {
        Self {
            iso_path: iso_path.to_path_buf(),
            output_dir: output_dir.to_path_buf(),
            game_name,
        }
    }

    pub fn convert(&self, progress_tx: Option<mpsc::Sender<ConversionProgress>>) -> Result<Game, AppError> {
        let parser = IsoParser::open(&self.iso_path)?;
        let game_id = parser.extract_game_id()?;
        let iso_size = parser.size();

        let media_type = if iso_size > DVD_SIZE_THRESHOLD {
            MediaType::DVD
        } else {
            MediaType::CD
        };

        let total_parts = ((iso_size + CHUNK_SIZE - 1) / CHUNK_SIZE) as u8;
        let crc = get_game_name_crc(&self.game_name);

        self.split_iso(&game_id, &crc, total_parts, iso_size, progress_tx)?;

        Ok(Game {
            name: self.game_name.clone(),
            serial: game_id,
            parts: total_parts,
            media_type,
            size_bytes: iso_size,
            crc,
        })
    }

    fn split_iso(
        &self,
        game_id: &str,
        crc: &str,
        total_parts: u8,
        total_size: u64,
        progress_tx: Option<mpsc::Sender<ConversionProgress>>,
    ) -> Result<(), AppError> {
        let mut source = File::open(&self.iso_path)?;
        let mut bytes_written_total: u64 = 0;
        let mut buffer = vec![0u8; 64 * 1024]; // 64KB buffer

        for part in 0..total_parts {
            let chunk_filename = format!("ul.{}.{}.{:02}", crc, game_id, part);
            let chunk_path = self.output_dir.join(&chunk_filename);
            let mut chunk_file = File::create(&chunk_path)?;

            let chunk_end = ((part as u64 + 1) * CHUNK_SIZE).min(total_size);
            let chunk_start = part as u64 * CHUNK_SIZE;
            let chunk_size = chunk_end - chunk_start;
            let mut bytes_in_chunk: u64 = 0;

            while bytes_in_chunk < chunk_size {
                let to_read = buffer.len().min((chunk_size - bytes_in_chunk) as usize);
                let bytes_read = source.read(&mut buffer[..to_read])?;
                
                if bytes_read == 0 {
                    break;
                }

                chunk_file.write_all(&buffer[..bytes_read])?;
                bytes_in_chunk += bytes_read as u64;
                bytes_written_total += bytes_read as u64;

                if let Some(ref tx) = progress_tx {
                    let progress = ConversionProgress {
                        current_part: part + 1,
                        total_parts,
                        bytes_written: bytes_written_total,
                        total_bytes: total_size,
                    };
                    let _ = tx.try_send(progress);
                }
            }

            chunk_file.sync_all()?;
        }

        Ok(())
    }
}
