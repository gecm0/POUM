//! CRC32 implementation for USBExtreme format.
//!
//! This is a custom CRC32 algorithm used by USBUtil/OPL for generating
//! unique identifiers from game names. It uses the polynomial 0x04C11DB7
//! with a reversed table lookup.

const CRC_TABLE_SIZE: usize = 256;

/// Initialize the CRC32 lookup table with reversed indices
fn initialize_crc_table() -> [i32; CRC_TABLE_SIZE] {
    let mut crc_table = [0i32; CRC_TABLE_SIZE];

    for index in 0..CRC_TABLE_SIZE as i32 {
        let mut crc = index << 24;
        for _ in 0..8 {
            if crc < 0 {
                crc <<= 1;
            } else {
                crc = (crc << 1) ^ 0x04c11db7;
            }
        }
        // Reverse index lookup (255 - index)
        let index_le = (CRC_TABLE_SIZE as i32 - index - 1) as usize;
        crc_table[index_le] = crc;
    }

    crc_table
}

/// Calculate the CRC32 hash of a game name.
///
/// This CRC32 is used to generate the unique identifier in chunk filenames:
/// `ul.{CRC32}.{GAME_ID}.{PART}`
///
/// # Arguments
/// * `name` - The game name (max 32 characters)
///
/// # Returns
/// * An 8-character uppercase hex string representing the CRC32
///
/// # Example
/// ```
/// let crc = get_game_name_crc("My Game Title");
/// assert_eq!(crc.len(), 8);
/// ```
#[allow(overflowing_literals)]
pub fn get_game_name_crc(name: &str) -> String {
    let crc_table = initialize_crc_table();

    // USBExtreme format expects null byte at the end
    let mut name_bytes = name.as_bytes().to_vec();
    name_bytes.push(0x00);

    let mut crc: i32 = 0;

    for byte in name_bytes {
        let index = (byte as i32 ^ ((crc >> 24) & 0xff)) as usize;
        // Overflow on purpose - matches original USBUtil behavior
        crc = crc_table[index] ^ ((crc << 8) & 0xffffff00u32 as i32);
    }

    format!("{:08X}", crc as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shortest_allowed_lowercase() {
        let name = "f";
        let name_crc = get_game_name_crc(name);
        assert_eq!(name_crc, "8433E5CC");
    }

    #[test]
    fn test_shortest_allowed_uppercase() {
        let name = "F";
        let name_crc = get_game_name_crc(name);
        assert_eq!(name_crc, "A490D3EA");
    }

    #[test]
    fn test_longest_allowed_lowercase() {
        let name = "fooooooooooooooooooooooooooooooo";
        let name_crc = get_game_name_crc(name);
        assert_eq!(name_crc, "84BA9D95");
    }

    #[test]
    fn test_longest_allowed_uppercase() {
        let name = "FOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO";
        let name_crc = get_game_name_crc(name);
        assert_eq!(name_crc, "8CAF0142");
    }

    #[test]
    fn test_crc_length() {
        let name = "Test Game";
        let crc = get_game_name_crc(name);
        assert_eq!(crc.len(), 8);
    }
}
