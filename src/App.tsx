import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { DriveSelector } from "@/components/DriveSelector";
import { GameList } from "@/components/GameList";
import { IsoImport } from "@/components/IsoImport";
import {
  getDrives,
  initializeDrive,
  isDriveInitialized,
  listGames,
  renameGame,
  deleteGame,
} from "@/lib/commands";
import type { DriveInfo, Game } from "@/types";

function App() {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshDrives = useCallback(async () => {
    try {
      const driveList = await getDrives();
      setDrives(driveList);
      if (selectedDrive && !driveList.find((d) => d.mount_point === selectedDrive)) {
        setSelectedDrive(null);
        setGames([]);
        setIsInitialized(false);
      }
    } catch (e) {
      console.error("Failed to get drives:", e);
    }
  }, [selectedDrive]);

  const refreshGames = useCallback(async () => {
    if (!selectedDrive) return;
    setIsLoading(true);
    try {
      const gameList = await listGames(selectedDrive);
      setGames(gameList);
    } catch (e) {
      console.error("Failed to list games:", e);
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDrive]);

  useEffect(() => {
    refreshDrives();
  }, [refreshDrives]);

  useEffect(() => {
    const checkInitialized = async () => {
      if (!selectedDrive) {
        setIsInitialized(false);
        setGames([]);
        return;
      }
      try {
        const initialized = await isDriveInitialized(selectedDrive);
        setIsInitialized(initialized);
        if (initialized) {
          refreshGames();
        } else {
          setGames([]);
        }
      } catch (e) {
        console.error("Failed to check drive:", e);
        setIsInitialized(false);
      }
    };
    checkInitialized();
  }, [selectedDrive, refreshGames]);

  const handleSelectDrive = (mountPoint: string) => {
    setSelectedDrive(mountPoint);
  };

  const handleInitialize = async () => {
    if (!selectedDrive) return;
    try {
      await initializeDrive(selectedDrive);
      setIsInitialized(true);
      refreshGames();
    } catch (e) {
      console.error("Failed to initialize drive:", e);
    }
  };

  const handleRenameGame = async (oldName: string, newName: string) => {
    if (!selectedDrive) return;
    try {
      await renameGame(selectedDrive, oldName, newName);
      refreshGames();
    } catch (e) {
      console.error("Failed to rename game:", e);
    }
  };

  const handleDeleteGame = async (name: string) => {
    if (!selectedDrive) return;
    try {
      await deleteGame(selectedDrive, name);
      refreshGames();
    } catch (e) {
      console.error("Failed to delete game:", e);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <DriveSelector
            drives={drives}
            selectedDrive={selectedDrive}
            isInitialized={isInitialized}
            onSelect={handleSelectDrive}
            onRefresh={refreshDrives}
            onInitialize={handleInitialize}
          />
          
          {selectedDrive && isInitialized && (
            <IsoImport
              mountPoint={selectedDrive}
              availableSpace={drives.find(d => d.mount_point === selectedDrive)?.available_space ?? 0}
              onComplete={refreshGames}
            />
          )}
        </div>

        {!selectedDrive && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg text-muted-foreground">
              Select a USB drive to manage your PS2 games
            </p>
          </div>
        )}

        {selectedDrive && !isInitialized && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg text-muted-foreground">
              This drive is not set up for Open PS2 Loader
            </p>
            <p className="text-sm text-muted-foreground/75">
              Click "Initialize for OPL" to set up the required folder structure
            </p>
          </div>
        )}

        {selectedDrive && isInitialized && !isLoading && (
          <GameList
            games={games}
            onRename={handleRenameGame}
            onDelete={handleDeleteGame}
          />
        )}

        {selectedDrive && isInitialized && isLoading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">Loading games...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
