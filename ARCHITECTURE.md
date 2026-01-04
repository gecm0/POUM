# PS2 USB Manager - Architecture Document

## Overview

PS2 USB Manager is a desktop application built with Tauri (Rust) and React that allows users to manage PlayStation 2 games on USB drives, similar to USBUtil and compatible with Open PS2 Loader (OPL).

## Core Features

1. **USB Drive Initialization** - Format and prepare USB drives with OPL folder structure
2. **Game Management** - List, rename, and delete installed games
3. **ISO Conversion** - Convert PS2 ISOs to USBExtreme format (single and batch)
4. **Game Library** - View installed games with metadata and covers

---

## Technical Specifications

### USBExtreme Format (ul.cfg)

Each game entry in `ul.cfg` is exactly **64 bytes**:

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0x00 | 32 | `name` | Game title (UTF-8, null-padded) |
| 0x20 | 3 | `prefix` | Literal "ul." (0x75 0x6c 0x2e) |
| 0x23 | 12 | `serial` | Game ID (e.g., "SLUS_206.56") |
| 0x2F | 1 | `parts` | Number of chunks (u8) |
| 0x30 | 1 | `media` | 0x12 (CD) or 0x14 (DVD) |
| 0x31 | 4 | `pad1` | 0x00 padding |
| 0x35 | 1 | `magic` | 0x08 (USBExtreme compatibility) |
| 0x36 | 10 | `pad2` | 0x00 padding |

### ISO Splitting

- **Chunk size**: 1 GB (1,073,741,824 bytes)
- **Naming**: `ul.{CRC32}.{GAME_ID}.{PART:02d}`
- **CRC32 Polynomial**: 0x04C11DB7
- **Max parts**: ~9 (for 8.5GB DVD9)

### OPL Folder Structure

```
[USB Root]
├── ul.cfg                        # Game database
├── ul.XXXXXXXX.SLUS_XXX.XX.00    # Game chunks
├── CD/                           # CD ISOs (<4GB)
├── DVD/                          # DVD ISOs (<4GB)
├── VMC/                          # Virtual Memory Cards
├── CFG/                          # Per-game configs
├── ART/                          # Cover art
├── CHT/                          # Cheats
└── APPS/                         # Homebrew
```

---

## Backend Architecture (Rust)

### Module Structure

```
src-tauri/src/
├── lib.rs              # Tauri entry point, command handlers
├── main.rs             # Main binary entry
├── commands/           # Tauri command implementations
│   ├── mod.rs
│   ├── drives.rs       # USB drive detection & management
│   ├── games.rs        # Game CRUD operations
│   └── conversion.rs   # ISO conversion commands
├── core/               # Core business logic
│   ├── mod.rs
│   ├── ul_config.rs    # ul.cfg parser/writer
│   ├── crc.rs          # CRC32 implementation
│   ├── iso.rs          # ISO parsing (SYSTEM.CNF extraction)
│   ├── splitter.rs     # ISO splitting logic
│   └── game.rs         # Game entity & operations
├── fs/                 # Filesystem utilities
│   ├── mod.rs
│   ├── drives.rs       # Drive detection (sysinfo)
│   └── opl_structure.rs # OPL folder creation
└── error.rs            # Error types
```

### Key Data Structures

```rust
// Game entry (matches ul.cfg binary format)
#[repr(C, packed)]
pub struct UlConfigEntry {
    pub name: [u8; 32],       // Game title
    pub prefix: [u8; 3],      // "ul."
    pub serial: [u8; 12],     // Game ID
    pub parts: u8,            // Chunk count
    pub media: u8,            // CD=0x12, DVD=0x14
    pub pad1: [u8; 4],        // Zeros
    pub magic: u8,            // 0x08
    pub pad2: [u8; 10],       // Zeros
}

// Game metadata for frontend
#[derive(Serialize, Deserialize)]
pub struct Game {
    pub name: String,         // Display name (max 32 bytes)
    pub serial: String,       // e.g., "SLUS_206.56"
    pub parts: u8,            // Number of chunks
    pub media_type: MediaType,
    pub size_bytes: u64,      // Total size
    pub crc: String,          // CRC32 hex string
}

#[derive(Serialize, Deserialize)]
pub enum MediaType {
    CD,   // 0x12
    DVD,  // 0x14
}

// Drive info for frontend
#[derive(Serialize, Deserialize)]
pub struct DriveInfo {
    pub path: String,         // e.g., "/Volumes/PS2USB"
    pub name: String,         // Volume label
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub filesystem: String,   // "FAT32", "exFAT", etc.
    pub is_opl_ready: bool,   // Has OPL structure
}

// Conversion progress
#[derive(Serialize, Clone)]
pub struct ConversionProgress {
    pub game_name: String,
    pub current_chunk: u32,
    pub total_chunks: u32,
    pub bytes_written: u64,
    pub total_bytes: u64,
    pub status: ConversionStatus,
}

#[derive(Serialize, Clone)]
pub enum ConversionStatus {
    Pending,
    InProgress,
    Completed,
    Failed(String),
}
```

### Tauri Commands

```rust
// Drive Management
#[tauri::command]
async fn list_drives() -> Result<Vec<DriveInfo>, String>;

#[tauri::command]
async fn initialize_drive(path: &str) -> Result<(), String>;

// Game Management
#[tauri::command]
async fn list_games(drive_path: &str) -> Result<Vec<Game>, String>;

#[tauri::command]
async fn rename_game(drive_path: &str, old_name: &str, new_name: &str) -> Result<(), String>;

#[tauri::command]
async fn delete_game(drive_path: &str, game_name: &str) -> Result<(), String>;

// ISO Conversion
#[tauri::command]
async fn convert_iso(
    iso_path: &str,
    drive_path: &str,
    game_name: Option<&str>,
    window: tauri::Window,
) -> Result<(), String>;

#[tauri::command]
async fn convert_batch(
    iso_paths: Vec<String>,
    drive_path: &str,
    window: tauri::Window,
) -> Result<(), String>;

// Utilities
#[tauri::command]
async fn get_iso_info(iso_path: &str) -> Result<IsoInfo, String>;
```

### Dependencies (Cargo.toml)

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
iso9660 = "0.3"           # ISO filesystem parsing
sysinfo = "0.31"          # System/drive info
walkdir = "2"             # Directory traversal
thiserror = "1"           # Error handling
regex = "1"               # SYSTEM.CNF parsing
```

---

## Frontend Architecture (React)

### Component Structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Main app with routing
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx   # Navigation
│   │   └── Header.tsx    # Drive selector, status
│   ├── DriveSelector/
│   │   └── DriveSelector.tsx
│   ├── GameList/
│   │   ├── GameList.tsx
│   │   ├── GameCard.tsx
│   │   └── GameContextMenu.tsx
│   ├── IsoImport/
│   │   ├── IsoDropzone.tsx
│   │   ├── ImportQueue.tsx
│   │   └── ConversionProgress.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── ProgressBar.tsx
├── hooks/
│   ├── useDrives.ts      # Drive list & selection
│   ├── useGames.ts       # Game CRUD operations
│   └── useConversion.ts  # ISO conversion with progress
├── lib/
│   ├── tauri.ts          # Tauri command wrappers
│   └── types.ts          # TypeScript types
└── styles/
    └── globals.css
```

### TypeScript Types

```typescript
// lib/types.ts
export interface DriveInfo {
  path: string;
  name: string;
  totalBytes: number;
  freeBytes: number;
  filesystem: string;
  isOplReady: boolean;
}

export interface Game {
  name: string;
  serial: string;
  parts: number;
  mediaType: 'CD' | 'DVD';
  sizeBytes: number;
  crc: string;
}

export interface IsoInfo {
  path: string;
  name: string;
  serial: string;
  sizeBytes: number;
  mediaType: 'CD' | 'DVD';
}

export interface ConversionProgress {
  gameName: string;
  currentChunk: number;
  totalChunks: number;
  bytesWritten: number;
  totalBytes: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}
```

### State Management

Using React hooks + Tauri events for real-time updates:

```typescript
// hooks/useConversion.ts
export function useConversion() {
  const [queue, setQueue] = useState<ConversionProgress[]>([]);
  
  useEffect(() => {
    const unlisten = listen<ConversionProgress>('conversion-progress', (event) => {
      setQueue(prev => updateProgress(prev, event.payload));
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);
  
  const convertIso = async (isoPath: string, drivePath: string, name?: string) => {
    await invoke('convert_iso', { isoPath, drivePath, gameName: name });
  };
  
  return { queue, convertIso };
}
```

---

## Event System

### Tauri Events (Backend → Frontend)

| Event | Payload | Description |
|-------|---------|-------------|
| `conversion-progress` | `ConversionProgress` | Real-time conversion updates |
| `drive-changed` | `DriveInfo[]` | Drive connected/disconnected |
| `error` | `{ message: string }` | Error notifications |

### Frontend Events

| Event | Action |
|-------|--------|
| ISO dropped | Add to conversion queue |
| Convert clicked | Start conversion |
| Cancel clicked | Abort current conversion |

---

## Error Handling

### Rust Error Types

```rust
// src-tauri/src/error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("ISO parse error: {0}")]
    IsoParse(String),
    
    #[error("Invalid ul.cfg format")]
    InvalidUlConfig,
    
    #[error("Game not found: {0}")]
    GameNotFound(String),
    
    #[error("Drive not found: {0}")]
    DriveNotFound(String),
    
    #[error("Insufficient space: need {needed} bytes, have {available}")]
    InsufficientSpace { needed: u64, available: u64 },
}

impl From<AppError> for String {
    fn from(err: AppError) -> String {
        err.to_string()
    }
}
```

---

## Security Considerations

1. **Path Validation** - All paths validated before filesystem operations
2. **Drive Type Check** - Only operate on removable drives
3. **Confirmation Dialogs** - Destructive operations require user confirmation
4. **Progress Cancellation** - Users can abort long operations

---

## Performance Considerations

1. **Async I/O** - All file operations are async (tokio)
2. **Chunked Reading** - ISOs read in 1MB buffers during conversion
3. **Progress Events** - Throttled to 100ms minimum interval
4. **Lazy Loading** - Game covers loaded on-demand

---

## Future Enhancements

- [ ] Cover art download from online databases
- [ ] ZSO compression support
- [ ] Game compatibility database integration
- [ ] Multi-language support
- [ ] Theme customization
