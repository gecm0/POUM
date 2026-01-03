import { invoke } from "@tauri-apps/api/core";
import type { DriveInfo, Game } from "@/types";

export async function getDrives(): Promise<DriveInfo[]> {
  return invoke<DriveInfo[]>("get_drives");
}

export async function initializeDrive(mountPoint: string): Promise<void> {
  return invoke("initialize_drive", { mountPoint });
}

export async function isDriveInitialized(mountPoint: string): Promise<boolean> {
  return invoke<boolean>("is_drive_initialized", { mountPoint });
}

export async function listGames(mountPoint: string): Promise<Game[]> {
  return invoke<Game[]>("list_games", { mountPoint });
}

export async function renameGame(
  mountPoint: string,
  oldName: string,
  newName: string
): Promise<void> {
  return invoke("rename_game", { mountPoint, oldName, newName });
}

export async function deleteGame(
  mountPoint: string,
  gameName: string
): Promise<void> {
  return invoke("delete_game", { mountPoint, gameName });
}

export async function convertIso(
  isoPath: string,
  mountPoint: string,
  gameName: string
): Promise<void> {
  return invoke("convert_iso", { isoPath, mountPoint, gameName });
}

export async function getFileSizes(paths: string[]): Promise<number[]> {
  return invoke<number[]>("get_file_sizes", { paths });
}
