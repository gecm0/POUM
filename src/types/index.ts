export type MediaType = "CD" | "DVD";

export interface Game {
  name: string;
  serial: string;
  parts: number;
  media_type: MediaType;
  size_bytes: number;
  crc: string;
}

export interface DriveInfo {
  name: string;
  mount_point: string;
  total_space: number;
  available_space: number;
  is_removable: boolean;
  file_system: string;
}

export interface ConversionProgress {
  current_part: number;
  total_parts: number;
  bytes_written: number;
  total_bytes: number;
  percent: number;
}
