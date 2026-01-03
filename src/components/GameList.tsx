import { Disc, Upload } from "lucide-react";
import { GameCard } from "./GameCard";
import type { Game } from "@/types";

interface GameListProps {
  games: Game[];
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
}

export function GameList({ games, onRename, onDelete }: GameListProps) {
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Disc className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No games yet</h2>
        <p className="text-muted-foreground max-w-sm text-center mb-4">
          Your game library is empty. Import ISO files to add games to this drive.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span>Click "Import ISO" above to get started</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {games.map((game) => (
        <GameCard
          key={`${game.serial}-${game.name}`}
          game={game}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
